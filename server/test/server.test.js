import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, afterEach, before, test } from "node:test";
import { io as connectClient } from "socket.io-client";

import { config as defaultConfig } from "../src/config.js";
import { createApp } from "../src/index.js";

let app;
let url;
let dataDir;
const open = [];

before(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "randomchat-test-"));
  app = createApp({
    dataDir,
    config: {
      relaxMs: 300,
      tickMs: 50,
      adultEnabled: false,
      rematchCooldownMs: 0,
      limits: { ...defaultConfig.limits, joinsPerWindow: 6, messagesPerWindow: 3, messageWindowMs: 60_000 },
    },
  });
  const port = await app.listen(0);
  url = `http://127.0.0.1:${port}`;
});

// Every test starts with an empty queue, so leftovers from one test cannot be matched in the next.
afterEach(async () => {
  for (const s of open.splice(0)) s.disconnect();
  for (let i = 0; i < 40 && (app.matcher.size > 0 || app.rooms.size > 0); i++) {
    await new Promise((r) => setTimeout(r, 25));
  }
});

after(async () => {
  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
});

function client() {
  const socket = connectClient(url, { transports: ["websocket"], forceNew: true });
  open.push(socket);
  return new Promise((resolve, reject) => {
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", reject);
  });
}

function next(socket, event, ms = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for "${event}"`)), ms);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

const ask = (socket, event, payload) =>
  new Promise((resolve) => (payload === undefined ? socket.emit(event, resolve) : socket.emit(event, payload, resolve)));

const joinPayload = (over = {}) => ({
  gender: "male",
  want: "any",
  category: "general",
  mode: "text",
  interests: [],
  ageConfirmed: true,
  ...over,
});

async function pair(payloadA = {}, payloadB = {}) {
  const a = await client();
  const b = await client();
  const matchedA = next(a, "matched");
  const matchedB = next(b, "matched");
  assert.deepEqual(await ask(a, "join", joinPayload(payloadA)), { ok: true });
  assert.deepEqual(await ask(b, "join", joinPayload(payloadB)), { ok: true });
  return { a, b, ma: await matchedA, mb: await matchedB };
}

test("HTTP endpoints respond", async () => {
  const health = await (await fetch(`${url}/healthz`)).json();
  assert.equal(health.ok, true);

  // ICE/STUN must not be exposed on a text-only service.
  assert.equal((await fetch(`${url}/ice`)).status, 404);

  const cfg = await (await fetch(`${url}/config`)).json();
  assert.equal(cfg.adultEnabled, false);
  assert.equal(cfg.videoEnabled, false);
  const adult = cfg.categories.find((c) => c.id === "adult");
  assert.deepEqual({ gated: adult.gated, available: adult.available, textOnly: adult.textOnly }, { gated: true, available: false, textOnly: true });
});

test("two users are matched, exactly one is the initiator", async () => {
  const { ma, mb } = await pair();
  assert.equal(ma.roomId, mb.roomId);
  assert.notEqual(ma.initiator, mb.initiator);
  assert.equal(ma.partner.gender, "male");
});

test("messages and typing are relayed, but signaling is blocked in text-only rooms", async () => {
  const { a, b } = await pair();

  const gotMessage = next(b, "message");
  assert.deepEqual(await ask(a, "message", "  hello   there  "), { ok: true });
  assert.equal((await gotMessage).text, "hello there");

  const gotTyping = next(a, "typing");
  b.emit("typing", true);
  assert.equal(await gotTyping, true);

  let leaked = false;
  b.on("signal", () => (leaked = true));
  a.emit("signal", { type: "offer", sdp: "v=0...", evil: "dropped" });
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(leaked, false, "ICE candidates must not reveal peer IPs through a text chat");
});

test("stickers are relayed by id, only from the allowlist, and count toward the message limit", async () => {
  const { a, b } = await pair();

  const got = next(b, "sticker");
  assert.deepEqual(await ask(a, "sticker", "heart"), { ok: true });
  assert.equal((await got).id, "heart");

  // anything that is not an allowlisted id is refused and never reaches the partner
  let leaked = false;
  b.on("sticker", () => (leaked = true));
  for (const bad of ["<script>", "HEART", "", 7, null, { id: "heart" }, "heart ".repeat(50)]) {
    assert.equal((await ask(a, "sticker", bad)).error, "invalid_sticker", `rejects ${JSON.stringify(bad)}`);
  }
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(leaked, false);

  // the room transcript (used for reports) records stickers as text markers
  const room = [...app.rooms.values()].find((r) => r.members.includes(a.id));
  assert.equal(room.transcript.at(-1).text, "[sticker:heart]");

  // stickers share the message rate limit (3 per window in this test setup: one used above)
  assert.equal((await ask(a, "message", "hi")).ok, true);
  assert.equal((await ask(a, "sticker", "fire")).ok, true);
  assert.equal((await ask(a, "sticker", "fire")).error, "rate_limited");
});

test("stickers need a chat partner", async () => {
  const s = await client();
  assert.equal((await ask(s, "sticker", "heart")).error, "not_connected");
});

test("Same Brain keeps votes secret until both answer, then reveals a match", async () => {
  const { a, b, ma, mb } = await pair();
  assert.equal(ma.sameBrainPrompt, mb.sameBrainPrompt);
  assert.ok(Number.isInteger(ma.sameBrainPrompt) && ma.sameBrainPrompt >= 0 && ma.sameBrainPrompt < 8);

  const partnerLocked = next(b, "same_brain_partner_locked");
  assert.deepEqual(await ask(a, "same_brain_vote", { choice: 1 }), { ok: true, waiting: true });
  await partnerLocked;

  const resultA = next(a, "same_brain_result");
  const resultB = next(b, "same_brain_result");
  assert.deepEqual(await ask(b, "same_brain_vote", { choice: 1 }), { ok: true, waiting: false });
  assert.deepEqual(await resultA, { promptIndex: ma.sameBrainPrompt, yourChoice: 1, partnerChoice: 1, match: true });
  assert.deepEqual(await resultB, { promptIndex: ma.sameBrainPrompt, yourChoice: 1, partnerChoice: 1, match: true });
  assert.equal((await ask(a, "same_brain_vote", { choice: 0 })).error, "round_complete");
});

test("Same Brain reveals different choices and rejects invalid or disconnected votes", async () => {
  const solo = await client();
  assert.equal((await ask(solo, "same_brain_vote", { choice: 0 })).error, "not_connected");

  const { a, b, ma } = await pair();
  assert.equal((await ask(a, "same_brain_vote", { choice: "0" })).error, "invalid_choice");
  assert.equal((await ask(a, "same_brain_vote", { choice: 0 })).ok, true);
  const resultA = next(a, "same_brain_result");
  const resultB = next(b, "same_brain_result");
  assert.equal((await ask(b, "same_brain_vote", { choice: 1 })).ok, true);
  assert.deepEqual(await resultA, { promptIndex: ma.sameBrainPrompt, yourChoice: 0, partnerChoice: 1, match: false });
  assert.deepEqual(await resultB, { promptIndex: ma.sameBrainPrompt, yourChoice: 1, partnerChoice: 0, match: false });
});

test("unknown signal types are ignored", async () => {
  const { a, b } = await pair();
  let leaked = false;
  b.on("signal", () => (leaked = true));
  a.emit("signal", { type: "rm -rf" });
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(leaked, false);
});

test("skipping tells the other side and they can requeue", async () => {
  const { a, b } = await pair();
  const left = next(b, "partner_left");
  await ask(a, "leave");
  await left;
  assert.equal(await ask(b, "message", "anyone?").then((r) => r.error), "not_connected");
});

test("gender filter keeps incompatible people apart", async () => {
  const a = await client();
  const b = await client();
  let matched = false;
  a.on("matched", () => (matched = true));
  b.on("matched", () => (matched = true));
  await ask(a, "join", joinPayload({ gender: "male", want: "female" }));
  await ask(b, "join", joinPayload({ gender: "male", want: "any" }));
  await new Promise((r) => setTimeout(r, 250));
  assert.equal(matched, false);
});

test("interest matching prefers the shared interest", async () => {
  const music = await client();
  const gamer = await client();
  const me = await client();
  const wantMe = next(music, "matched");
  await ask(music, "join", joinPayload({ category: "music", interests: ["Guitar "] }));
  await ask(gamer, "join", joinPayload({ category: "music", interests: ["gaming"] }));
  await ask(me, "join", joinPayload({ category: "music", interests: ["guitar"] }));
  const m = await wantMe;
  assert.deepEqual(m.common, ["guitar"]);
});

test("falls back to anyone after the relax delay", async () => {
  const a = await client();
  const b = await client();
  const ma = next(a, "matched", 3000);
  await ask(a, "join", joinPayload({ category: "tech", interests: ["rust"] }));
  await ask(b, "join", joinPayload({ category: "tech", interests: ["knitting"] }));
  assert.deepEqual((await ma).common, []);
});

test("join validation", async () => {
  const s = await client();
  assert.equal((await ask(s, "join", joinPayload({ ageConfirmed: false }))).error, "age_confirmation_required");
  assert.equal((await ask(s, "join", joinPayload({ gender: "robot" }))).error, "invalid_gender");
  assert.equal((await ask(s, "join", joinPayload({ category: "nope" }))).error, "invalid_category");
  assert.equal((await ask(s, "join", joinPayload({ mode: "hologram" }))).error, "invalid_mode");
  assert.equal((await ask(s, "join", null)).error, "bad_request");
});

test("adult category is disabled by default unless specifically enabled", async () => {
  const s = await client();
  assert.equal((await ask(s, "join", joinPayload({ category: "adult" }))).error, "category_unavailable");
  assert.equal((await ask(s, "join", joinPayload({ category: "adult", mode: "video" }))).error, "category_text_only");

  const disabled = createApp({ dataDir, config: { adultEnabled: false } });
  const port = await disabled.listen(0);
  const t = connectClient(`http://127.0.0.1:${port}`, { transports: ["websocket"], forceNew: true });
  await new Promise((r) => t.on("connect", r));
  assert.equal((await ask(t, "join", joinPayload({ category: "adult" }))).error, "category_unavailable");
  t.disconnect();
  await disabled.close();
});

test("video cannot be switched on by misconfiguration", async () => {
  const disabled = createApp({ dataDir, config: { videoEnabled: true } });
  const port = await disabled.listen(0);
  const c = connectClient(`http://127.0.0.1:${port}`, { transports: ["websocket"], forceNew: true });
  await new Promise((r) => c.on("connect", r));
  assert.equal((await ask(c, "join", joinPayload({ mode: "video" }))).error, "video_disabled");
  assert.equal((await fetch(`http://127.0.0.1:${port}/ice`)).status, 404);
  c.disconnect();
  await disabled.close();
});

test("user IP is never retained raw; only keyed fingerprints are kept for abuse prevention", async () => {
  const seenIp = async (trustProxy) => {
    const proxied = createApp({ dataDir, config: { trustProxy } });
    const port = await proxied.listen(0);
    const c = connectClient(`http://127.0.0.1:${port}`, {
      transports: ["websocket"],
      forceNew: true,
      extraHeaders: { "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.9" },
    });
    await new Promise((r) => c.on("connect", r));
    const session = [...proxied.io.sockets.sockets.values()][0];
    const ip = session.data.networkKey;
    assert.equal(session.data.ip, undefined);
    c.disconnect();
    await proxied.close();
    return ip;
  };
  const trusted = await seenIp(true);
  const untrusted = await seenIp(false);
  assert.match(trusted, /^[a-f0-9]{64}$/);
  assert.match(untrusted, /^[a-f0-9]{64}$/);
  assert.notEqual(trusted, untrusted, "Different process keys generate un-linkable fingerprints");
});

test("message rate limit and link spam are enforced", async () => {
  const { a } = await pair();
  assert.equal((await ask(a, "message", "one")).ok, true);
  assert.equal((await ask(a, "message", "two")).ok, true);
  assert.equal((await ask(a, "message", "http://a.io http://b.io http://c.io")).error, "links");
  assert.equal((await ask(a, "message", "four")).error, "rate_limited");
});

test("join rate limit stops skip spamming", async () => {
  const s = await client();
  let limited = false;
  for (let i = 0; i < 10; i++) {
    const res = await ask(s, "join", joinPayload({ category: "art" }));
    if (res.error === "rate_limited") limited = true;
  }
  assert.equal(limited, true);
});

test("reports are stored with the transcript; same-IP reports never ban", async () => {
  const { a, b } = await pair();
  const got = next(b, "message");
  await ask(a, "message", "something rude");
  await got;

  assert.equal((await ask(b, "report", { reason: "nonsense" })).error, "invalid_reason");
  assert.deepEqual(await ask(b, "report", { reason: "harassment", note: "test" }), { ok: true });

  const lines = readFileSync(join(dataDir, "reports.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
  const last = lines.at(-1);
  assert.equal(last.reason, "harassment");
  assert.equal(last.transcript.at(-1).text, "something rude");
  assert.match(last.reportedKey, /^[a-f0-9]{64}$/);
  assert.equal(last.reportedIp, undefined);
  assert.equal(app.moderation.isBanned(last.reportedKey), false);
});

test("a report can still be filed right after the partner leaves", async () => {
  const { a, b } = await pair();
  const left = next(b, "partner_left");
  await ask(a, "leave");
  await left;
  assert.deepEqual(await ask(b, "report", { reason: "spam" }), { ok: true });
});

test("distinct reporters trigger an automatic ban and disconnect", async () => {
  const { a } = await pair();
  const networkKey = [...app.io.sockets.sockets.values()].find((s) => s.id === a.id).data.networkKey;
  const banned = next(a, "banned");
  // Simulate three different reporters (the test clients all share one IP, so go through the module).
  for (const reporterKey of ["user-a", "user-b", "user-c"]) {
    const result = app.moderation.report({ reporterKey, reportedKey: networkKey, reason: "harassment", transcript: [] });
    if (result.banned) {
      for (const s of app.io.sockets.sockets.values()) if (s.data.networkKey === networkKey) (s.emit("banned"), s.disconnect(true));
    }
  }
  await banned;
  await assert.rejects(client(), /banned/);
  app.moderation.bans.clear();
});

test("Movie Rush requires mutual acceptance and shares exactly four clues without revealing answers", async () => {
  const { a, b } = await pair();
  assert.equal((await ask(a, "movie_accept", null)).error, "no_invite");
  const incoming = next(b, "movie_invited");
  assert.deepEqual(await ask(a, "movie_invite", null), { ok: true });
  await incoming;
  assert.equal((await ask(a, "movie_accept", null)).error, "no_invite");
  const s1 = next(a, "movie_started");
  const s2 = next(b, "movie_started");
  assert.deepEqual(await ask(b, "movie_accept", null), { ok: true });
  const [v1, v2] = await Promise.all([s1, s2]);
  assert.deepEqual(v1, v2);
  assert.equal(v1.clues.length, 4);
  assert.equal("answer" in v1, false, "answer never included in client payload");
  assert.equal((await ask(a, "movie_invite", null)).error, "game_busy");
  assert.equal((await ask(a, "movie_guess", { roundId: "wrong", guess: "test" })).error, "invalid_round");
  const wrong = await ask(a, "movie_guess", { roundId: v1.roundId, guess: "unrelated film title" });
  assert.deepEqual(wrong, { ok: true, correct: false, remaining: 11 });
  const round = [...app.rooms.values()].find((r) => r.members.includes(a.id)).movie;
  const ra = next(a, "movie_result");
  const rb = next(b, "movie_result");
  const correct = await ask(b, "movie_guess", { roundId: v1.roundId, guess: round.question.answer });
  assert.deepEqual(correct, { ok: true, correct: true });
  assert.deepEqual(await ra, { roundId: v1.roundId, answer: round.question.answer, winner: "stranger" });
  assert.deepEqual(await rb, { roundId: v1.roundId, answer: round.question.answer, winner: "you" });
  assert.equal((await ask(a, "movie_guess", { roundId: v1.roundId, guess: round.question.answer })).error, "game_not_active");
});

test("Movie Rush declines consent; next games don't repeat question", async () => {
  const { a, b } = await pair();
  const invited1 = next(b, "movie_invited");
  await ask(a, "movie_invite", null); await invited1;
  const declined = next(a, "movie_declined");
  assert.deepEqual(await ask(b, "movie_decline", null), { ok: true });
  await declined;
  const invited2 = next(b, "movie_invited");
  await ask(a, "movie_invite", null); await invited2;
  const started = next(a, "movie_started");
  await ask(b, "movie_accept", null); const one = await started;
  const room = [...app.rooms.values()].find((r) => r.members.includes(a.id));
  const firstId = room.movie.question.id;
  const firstAns = room.movie.question.answer;
  const result = next(a, "movie_result");
  await ask(a, "movie_guess", { roundId: one.roundId, guess: firstAns }); await result;
  const invited3 = next(b, "movie_invited");
  await ask(a, "movie_invite", null); await invited3;
  const started2 = next(a, "movie_started");
  await ask(b, "movie_accept", null); await started2;
  assert.notEqual(room.movie.question.id, firstId, "don't repeat question in the same room");
});

test("WebSocket upgrades reject cross-origin browser headers", async () => {
  const client = connectClient(url, { transports: ["websocket"], forceNew: true, reconnection: false,
    extraHeaders: { Origin: "https://untrusted.example" } });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { client.disconnect(); reject(Error("Socket never rejected")); }, 2000);
    client.on("connect", () => { clearTimeout(timer); client.disconnect(); reject(Error("Cross-origin socket accepted")); });
    client.on("connect_error", () => { clearTimeout(timer); client.disconnect(); resolve(); });
  });
});
