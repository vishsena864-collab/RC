// Privacy-minded anonymous text chat server (games happen inside the chat room).
//
// Client -> server events: join, leave, message, sticker, same_brain_vote, movie_*, typing, report
// Server -> client events: waiting, matched, partner_left, message, sticker,
//                           same_brain_partner_locked, same_brain_result, typing, online, banned
//
// There is deliberately NO peer-to-peer/WebRTC path: strangers never exchange IP information.

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Server } from "socket.io";

import { CATEGORIES, STICKER_IDS, config as defaultConfig } from "./config.js";
import { Matcher } from "./matcher.js";
import { MovieQuestionBank, isCorrectGuess } from "./movie-trivia.js";
import { anonymousNetworkKey, privacyKey } from "./privacy.js";
import { Moderation, cleanMessage } from "./moderation.js";
import { RateLimiter } from "./ratelimit.js";
import { REPORT_REASONS, parseJoin } from "./validate.js";
import { createUnderground } from "./underground.js";

const here = dirname(fileURLToPath(import.meta.url));
const REPORT_LOOKBACK_MS = 5 * 60 * 1000;
const SAME_BRAIN_PROMPTS = 8;
const MOVIE_DURATION_MS = 60_000;
const MAX_MOVIE_GUESSES = 12;

function sameBrainPrompt(roomId) {
  let hash = 0;
  for (const char of roomId) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return hash % SAME_BRAIN_PROMPTS;
}

export function createApp(overrides = {}) {
  const cfg = { ...defaultConfig, ...overrides.config, videoEnabled: false }; // Cannot be enabled through deployment env
  const dataDir = overrides.dataDir || join(here, "..", "data");

  const matcher = new Matcher({ relaxMs: cfg.relaxMs, cooldownMs: cfg.rematchCooldownMs });
  const addressKey = privacyKey(cfg.privacyHmacSecret);
  const movieBank = new MovieQuestionBank();
  const moderation = new Moderation({ dataDir, settings: cfg.moderation });
  const rooms = new Map(); // roomId -> room

  const httpServer = createServer(handleHttp);
  const io = new Server(httpServer, {
    path: process.env.SOCKET_IO_PATH || "/socket.io",
    cors: { origin: cfg.corsOrigins },
    // Socket.IO CORS alone does not reject WebSocket cross-site upgrades.
    allowRequest: (req, done) => done(null, !req.headers.origin || cfg.corsOrigins.includes(req.headers.origin)),
    maxHttpBufferSize: 64 * 1024,
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  // ---------- HTTP (health, config for the web app, ICE servers) ----------

  function handleHttp(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const origin = req.headers.origin;
    if (origin && cfg.corsOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    const { pathname } = new URL(req.url, "http://localhost");
    if (pathname === "/healthz") {
      return sendJson(res, 200, { ok: true, online: io.engine.clientsCount, waiting: matcher.size, rooms: rooms.size });
    }
    if (pathname === "/config") {
      return sendJson(res, 200, {
        adultEnabled: cfg.adultEnabled,
        videoEnabled: cfg.videoEnabled,
        online: io.engine.clientsCount,
        categories: CATEGORIES.map((c) => ({
          id: c.id,
          textOnly: Boolean(c.textOnly),
          gated: Boolean(c.gated),
          available: !c.gated || cfg.adultEnabled,
        })),
      });
    }
    return sendJson(res, 404, { error: "not_found" });
  }

  const underground = createUnderground(io, { djHoldMs: cfg.fmDjHoldMs, crossfadeMs: cfg.fmCrossfadeMs });

  // ---------- Connection guard ----------

  io.use((socket, next) => {
    // Do not keep, log, send or write raw visitor IP addresses.
    socket.data.networkKey = anonymousNetworkKey(clientIp(socket, cfg.trustProxy), addressKey);
    if (moderation.isBanned(socket.data.networkKey)) return next(new Error("banned"));
    next();
  });

  io.on("connection", (socket) => {
    underground.attach(socket);
    socket.data.roomId = null;
    socket.data.lastPartner = null;
    const joinLimiter = new RateLimiter(cfg.limits.joinsPerWindow, cfg.limits.joinWindowMs);
    const messageLimiter = new RateLimiter(cfg.limits.messagesPerWindow, cfg.limits.messageWindowMs);
    const reportLimiter = new RateLimiter(5, 60_000);
    const movieGuessLimiter = new RateLimiter(3, 1_000);
    const movieInviteLimiter = new RateLimiter(5, 60_000);

    socket.emit("online", io.engine.clientsCount);

    socket.on("join", async (payload, ack) => {
      const reply = replier(ack);
      const parsed = parseJoin(payload, cfg.limits, { videoEnabled: cfg.videoEnabled });
      if (!parsed.ok) return reply({ ok: false, error: parsed.error });
      if (!joinLimiter.take()) return reply({ ok: false, error: "rate_limited" });

      const v = parsed.value;
      if (v.gated) {
        if (!cfg.adultEnabled) return reply({ ok: false, error: "category_unavailable" });
      }
      if (socket.disconnected) return;

      endChat(socket);
      const match = matcher.add({
        id: socket.id,
        gender: v.gender,
        want: v.want,
        category: v.category,
        mode: v.mode,
        interests: v.interests,
      });
      reply({ ok: true });
      if (match) dispatch(match);
      else socket.emit("waiting");
    });

    // Clients may call this as emit("leave"), emit("leave", cb) or emit("leave", undefined, cb).
    socket.on("leave", (...args) => {
      endChat(socket);
      replier(args.at(-1))({ ok: true });
    });

    socket.on("message", (text, ack) => {
      const reply = replier(ack);
      const room = roomOf(socket);
      if (!room) return reply({ ok: false, error: "not_connected" });
      if (!messageLimiter.take()) return reply({ ok: false, error: "rate_limited" });
      const clean = cleanMessage(text, cfg.limits.maxMessageLength);
      if (!clean.ok) return reply({ ok: false, error: clean.reason });

      const ts = Date.now();
      partnerSocket(socket, room)?.emit("message", { text: clean.text, ts });
      room.transcript.push({ from: room.members[0] === socket.id ? "A" : "B", text: clean.text, ts });
      if (room.transcript.length > cfg.moderation.transcriptLines) room.transcript.shift();
      reply({ ok: true });
    });

    socket.on("sticker", (id, ack) => {
      const reply = replier(ack);
      const room = roomOf(socket);
      if (!room) return reply({ ok: false, error: "not_connected" });
      if (typeof id !== "string" || !STICKER_IDS.includes(id)) return reply({ ok: false, error: "invalid_sticker" });
      if (!messageLimiter.take()) return reply({ ok: false, error: "rate_limited" });

      const ts = Date.now();
      partnerSocket(socket, room)?.emit("sticker", { id, ts });
      room.transcript.push({ from: room.members[0] === socket.id ? "A" : "B", text: `[sticker:${id}]`, ts });
      if (room.transcript.length > cfg.moderation.transcriptLines) room.transcript.shift();
      reply({ ok: true });
    });

    socket.on("same_brain_vote", (payload, ack) => {
      const reply = replier(ack);
      const room = roomOf(socket);
      if (!room) return reply({ ok: false, error: "not_connected" });
      const choice = payload?.choice;
      if (choice !== 0 && choice !== 1) return reply({ ok: false, error: "invalid_choice" });
      if (room.sameBrain.resolved) return reply({ ok: false, error: "round_complete" });

      const existing = room.sameBrain.votes.get(socket.id);
      if (existing !== undefined) {
        if (existing !== choice) return reply({ ok: false, error: "vote_locked" });
        return reply({ ok: true, waiting: room.sameBrain.votes.size < 2 });
      }

      room.sameBrain.votes.set(socket.id, choice);
      reply({ ok: true, waiting: room.sameBrain.votes.size < 2 });

      const partner = partnerSocket(socket, room);
      if (room.sameBrain.votes.size < 2) return partner?.emit("same_brain_partner_locked");

      room.sameBrain.resolved = true;
      for (const memberId of room.members) {
        const otherId = room.members.find((id) => id !== memberId);
        const yours = room.sameBrain.votes.get(memberId);
        const theirs = room.sameBrain.votes.get(otherId);
        io.sockets.sockets.get(memberId)?.emit("same_brain_result", {
          promptIndex: room.sameBrain.promptIndex,
          yourChoice: yours,
          partnerChoice: theirs,
          match: yours === theirs,
        });
      }
    });

    // Movie Rush — both visitors receive the same four clues. The answer is never sent until
    // the round ends. The first valid answer received by the server wins; clients cannot score.
    socket.on("movie_invite", (_unused, ack) => {
      const reply = replier(ack);
      const room = roomOf(socket);
      if (!room) return reply({ ok: false, error: "not_connected" });
      if (!movieInviteLimiter.take()) return reply({ ok: false, error: "rate_limited" });
      if (room.movie.state === "playing" || room.movie.state === "invited") return reply({ ok: false, error: "game_busy" });
      room.movie = { state: "invited", invitedBy: socket.id, played: room.movie.played, timer: null };
      partnerSocket(socket, room)?.emit("movie_invited");
      reply({ ok: true });
    });

    socket.on("movie_accept", (_unused, ack) => {
      const reply = replier(ack);
      const room = roomOf(socket);
      if (!room) return reply({ ok: false, error: "not_connected" });
      if (room.movie.state !== "invited" || room.movie.invitedBy === socket.id) return reply({ ok: false, error: "no_invite" });
      const question = movieBank.draw(room.movie.played);
      const played = [...room.movie.played.slice(-24), question.id];
      const roundId = randomUUID();
      room.movie = { state: "playing", question, roundId, played, guesses: new Map(), timer: null, started: Date.now() };
      for (const memberId of room.members) io.sockets.sockets.get(memberId)?.emit("movie_started", {
        roundId, clues: question.clues, durationMs: MOVIE_DURATION_MS,
      });
      room.movie.timer = setTimeout(() => finishMovie(room, null), MOVIE_DURATION_MS);
      room.movie.timer.unref?.();
      reply({ ok: true });
    });

    socket.on("movie_decline", (_unused, ack) => {
      const reply = replier(ack);
      const room = roomOf(socket);
      if (!room || room.movie.state !== "invited" || room.movie.invitedBy === socket.id) return reply({ ok: false, error: "no_invite" });
      room.movie = { state: "idle", played: room.movie.played };
      partnerSocket(socket, room)?.emit("movie_declined");
      reply({ ok: true });
    });

    socket.on("movie_guess", (payload, ack) => {
      const reply = replier(ack);
      const room = roomOf(socket);
      if (!room || room.movie.state !== "playing") return reply({ ok: false, error: "game_not_active" });
      if (payload?.roundId !== room.movie.roundId) return reply({ ok: false, error: "invalid_round" });
      if (typeof payload?.guess !== "string" || payload.guess.length > 100 || payload.guess.trim().length < 2)
        return reply({ ok: false, error: "invalid_guess" });
      if (!movieGuessLimiter.take()) return reply({ ok: false, error: "rate_limited" });
      const tries = room.movie.guesses.get(socket.id) || 0;
      if (tries >= MAX_MOVIE_GUESSES) return reply({ ok: false, error: "guess_limit" });
      room.movie.guesses.set(socket.id, tries + 1);
      if (isCorrectGuess(room.movie.question, payload.guess)) {
        finishMovie(room, socket.id);
        return reply({ ok: true, correct: true });
      }
      reply({ ok: true, correct: false, remaining: MAX_MOVIE_GUESSES - tries - 1 });
    });

    socket.on("typing", (on) => {
      const room = roomOf(socket);
      if (room) partnerSocket(socket, room)?.emit("typing", Boolean(on));
    });

    socket.on("report", (payload, ack) => {
      const reply = replier(ack);
      const reason = payload?.reason;
      if (!REPORT_REASONS.includes(reason)) return reply({ ok: false, error: "invalid_reason" });
      if (!reportLimiter.take()) return reply({ ok: false, error: "rate_limited" });

      const room = roomOf(socket);
      let target = null;
      if (room) {
        const otherId = room.members.find((id) => id !== socket.id);
        target = { networkKey: room.networkKeys[otherId], transcript: room.transcript, category: room.category, mode: room.mode };
      } else if (socket.data.lastPartner && Date.now() - socket.data.lastPartner.at < REPORT_LOOKBACK_MS) {
        target = socket.data.lastPartner;
      }
      if (!target) return reply({ ok: false, error: "nobody_to_report" });

      const result = moderation.report({
        reporterKey: socket.data.networkKey,
        reportedKey: target.networkKey,
        reason,
        note: payload?.note,
        category: target.category,
        mode: target.mode,
        transcript: target.transcript,
      });
      if (result.banned) kickNetworkKey(target.networkKey);
      reply({ ok: true });
    });

    socket.on("disconnect", () => endChat(socket));
  });

  // ---------- Rooms ----------

  function dispatch(match) {
    // A socket can vanish between being queued and being paired. Put the survivor back in line.
    while (match) {
      const a = io.sockets.sockets.get(match.initiator.id);
      const b = io.sockets.sockets.get(match.other.id);
      if (a && b) return createRoom(a, b, match);
      const lostMatch = match;
      match = null;
      if (a) match = matcher.add(lostMatch.initiator);
      else if (b) match = matcher.add(lostMatch.other);
    }
  }

  function finishMovie(room, winnerId) {
    if (room.movie.state !== "playing") return;
    clearTimeout(room.movie.timer);
    const game = room.movie;
    room.movie = { state: "finished", played: game.played };
    for (const memberId of room.members) io.sockets.sockets.get(memberId)?.emit("movie_result", {
      answer: game.question.answer,
      roundId: game.roundId,
      winner: winnerId === null ? "timeout" : memberId === winnerId ? "you" : "stranger",
    });
  }

  function createRoom(initiatorSocket, otherSocket, match) {
    const id = randomUUID();
    const room = {
      id,
      members: [initiatorSocket.id, otherSocket.id],
      networkKeys: { [initiatorSocket.id]: initiatorSocket.data.networkKey, [otherSocket.id]: otherSocket.data.networkKey },
      category: match.initiator.category,
      mode: match.initiator.mode,
      transcript: [],
      sameBrain: { promptIndex: sameBrainPrompt(id), votes: new Map(), resolved: false },
      movie: { state: "idle", played: [] },
    };
    rooms.set(id, room);
    initiatorSocket.data.roomId = id;
    otherSocket.data.roomId = id;

    const base = { roomId: id, mode: room.mode, category: room.category, common: match.common, sameBrainPrompt: room.sameBrain.promptIndex };
    initiatorSocket.emit("matched", { ...base, initiator: true, partner: { gender: match.other.gender } });
    otherSocket.emit("matched", { ...base, initiator: false, partner: { gender: match.initiator.gender } });
  }

  /** Remove someone from the queue and/or their current room, telling their partner. */
  function endChat(socket) {
    matcher.remove(socket.id);
    const room = rooms.get(socket.data.roomId);
    socket.data.roomId = null;
    if (!room) return;
    rooms.delete(room.id);
    clearTimeout(room.movie.timer);

    const otherId = room.members.find((id) => id !== socket.id);
    const other = io.sockets.sockets.get(otherId);
    const at = Date.now();
    const snapshot = (networkKey) => ({ networkKey, transcript: room.transcript, category: room.category, mode: room.mode, at });

    // Remember the partner briefly so a report can still be filed right after the chat ends.
    socket.data.lastPartner = snapshot(room.networkKeys[otherId]);
    if (other) {
      other.data.roomId = null;
      other.data.lastPartner = snapshot(socket.data.networkKey);
      other.emit("partner_left");
    }
  }

  function roomOf(socket) {
    return rooms.get(socket.data.roomId) || null;
  }

  function partnerSocket(socket, room) {
    const otherId = room.members.find((id) => id !== socket.id);
    return io.sockets.sockets.get(otherId);
  }

  function kickNetworkKey(networkKey) {
    for (const s of io.sockets.sockets.values()) {
      if (s.data.networkKey === networkKey) {
        s.emit("banned");
        s.disconnect(true);
      }
    }
  }

  // ---------- Timers ----------

  const tickTimer = setInterval(() => {
    for (const match of matcher.tick()) dispatch(match);
  }, cfg.tickMs);
  const onlineTimer = setInterval(() => io.emit("online", io.engine.clientsCount), 5_000);
  const reportCleanupTimer = setInterval(() => moderation.pruneReports(), 12 * 60 * 60 * 1000);
  tickTimer.unref();
  onlineTimer.unref();
  reportCleanupTimer.unref();

  return {
    httpServer,
    io,
    matcher,
    moderation,
    rooms,
    listen(port = cfg.port) {
      return new Promise((resolve) => httpServer.listen(port, () => resolve(httpServer.address().port)));
    },
    close() {
      clearInterval(tickTimer);
      clearInterval(onlineTimer);
      clearInterval(reportCleanupTimer);
      for (const room of rooms.values()) clearTimeout(room.movie.timer);
      underground.close();
      movieBank.close();
      return new Promise((resolve) => {
        io.close(() => resolve());
      });
    },
  };
}

// ---------- helpers ----------

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function replier(ack) {
  return typeof ack === "function" ? ack : () => {};
}

export function clientIp(socket, trustProxy) {
  if (trustProxy) {
    const headers = socket.handshake.headers;
    // Cloudflare sets this header itself and a visitor cannot forge it, so prefer it over X-Forwarded-For.
    const cloudflare = headers["cf-connecting-ip"];
    if (typeof cloudflare === "string" && cloudflare) return cloudflare.trim();
    const forwarded = headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  }
  return socket.handshake.address;
}

// ---------- start when run directly ----------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = createApp();
  const port = await app.listen();
  console.log(`[server] listening on :${port}  cors=${defaultConfig.corsOrigins.join(",")}  adult=${defaultConfig.adultEnabled ? "on" : "off"}`);
  const shutdown = async () => {
    console.log("[server] shutting down");
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
