import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, afterEach, before, test } from "node:test";
import { io as connectClient } from "socket.io-client";

import { config as defaultConfig } from "../src/config.js";
import { createApp } from "../src/index.js";

let app, url, dataDir;
const open = [];

before(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "randomchat-fm-test-"));
  app = createApp({ dataDir, config: { relaxMs: 300, tickMs: 50, adultEnabled: false, rematchCooldownMs: 0, fmDjHoldMs: 1500, fmCrossfadeMs: 1000, limits: { ...defaultConfig.limits } } });
  url = `http://127.0.0.1:${await app.listen(0)}`;
});
afterEach(() => { for (const s of open.splice(0)) s.disconnect(); });
after(async () => { await app.close(); rmSync(dataDir, { recursive: true, force: true }); });

const client = () => {
  const socket = connectClient(url, { transports: ["websocket"], forceNew: true });
  open.push(socket);
  return new Promise((resolve, reject) => { socket.on("connect", () => resolve(socket)); socket.on("connect_error", reject); });
};
const next = (socket, event, ms = 3000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`timed out waiting for "${event}"`)), ms);
  socket.once(event, (data) => { clearTimeout(timer); resolve(data); });
});
const ask = (socket, event, payload) => new Promise((resolve) => (payload === undefined ? socket.emit(event, resolve) : socket.emit(event, payload, resolve)));
const track = { id: "fmtest1", title: "After the Last Train", artist: "Night Assembly", duration: 180, genre: "Electronic" };

test("Underground FM gives every listener an anonymous stage name and shows who holds the aux", async () => {
  const a = await client(), b = await client();
  const joinedA = await ask(a, "fm:join");
  assert.match(joinedA.handle, /^[a-z]+\.\d{2}$/);
  assert.ok(Number.isInteger(joinedA.hue) && joinedA.hue >= 0 && joinedA.hue < 360);
  const stateForB = next(b, "fm:state");
  const joinedB = await ask(b, "fm:join");
  const state = await stateForB;
  assert.notEqual(joinedA.handle, joinedB.handle);
  assert.equal(state.listeners, 2);
  assert.equal(state.djHandle, joinedA.handle, "the first listener holds the aux");
});

test("chat, requests and mood bursts carry the sender's stage name", async () => {
  const a = await client(), b = await client();
  await ask(a, "fm:join"); const joinedB = await ask(b, "fm:join");
  const chat = next(a, "fm:chat");
  assert.equal((await ask(b, "fm:chat", "hello from the floor")).ok, true);
  const entry = await chat;
  assert.equal(entry.handle, joinedB.handle);
  assert.equal(entry.from, "GUEST");
  const burst = next(a, "fm:mood:burst");
  assert.equal((await ask(b, "fm:mood", "energy")).ok, true);
  const vote = await burst;
  assert.equal(vote.kind, "energy");
  assert.equal(vote.handle, joinedB.handle);
  assert.ok(vote.heat > 50);
  // a silent room starts the first request at once
  const started = next(a, "fm:state");
  assert.equal((await ask(b, "fm:request", track)).ok, true);
  const playing = await started;
  assert.equal(playing.track.id, track.id);
  assert.equal(playing.queue.length, 0);
  // while a song plays, the next request waits in the queue under the requester's stage name
  const queued = next(a, "fm:state");
  assert.equal((await ask(b, "fm:request", { ...track, id: "fmtest2", title: "Soft Focus" })).ok, true);
  const withQueue = await queued;
  assert.equal(withQueue.queue[0].by, joinedB.handle);
  assert.equal(withQueue.queue[0].track.id, "fmtest2");
  assert.equal(JSON.stringify(withQueue.queue).includes(b.id), false, "queue entries name the requester by stage name, not connection id");
  assert.deepEqual(withQueue.people.map((p) => p.handle).sort(), [joinedB.handle, (await ask(a, "fm:join")).handle].sort());
});

test("typing is shown to the others in the room, throttled per person", async () => {
  const a = await client(), b = await client();
  await ask(a, "fm:join"); const joinedB = await ask(b, "fm:join");
  const typing = next(a, "fm:typing");
  b.emit("fm:typing");
  assert.equal((await typing).handle, joinedB.handle);
  let extra = 0; a.on("fm:typing", () => extra++);
  b.emit("fm:typing"); await new Promise((r) => setTimeout(r, 200));
  assert.equal(extra, 0, "a second ping within 1.5s is dropped");
});

test("a song queued after the music ran out starts straight away", async () => {
  const a = await client();
  await ask(a, "fm:join");
  assert.equal((await ask(a, "fm:play", { ...track, duration: 1 })).ok, true);
  await new Promise((r) => setTimeout(r, 3000));
  const started = next(a, "fm:state");
  assert.equal((await ask(a, "fm:queue:add", { ...track, id: "fmtest3", title: "Night Service" })).ok, true);
  const state = await started;
  assert.equal(state.track.id, "fmtest3");
  assert.equal(state.queue.length, 0);
});

test("only the controller can play a queued track right now", async () => {
  const a = await client(), b = await client();
  await ask(a, "fm:join"); await ask(b, "fm:join");
  assert.equal((await ask(b, "fm:play", track)).error, "dj_only");
  assert.equal((await ask(a, "fm:play", track)).ok, true);
  assert.equal((await ask(b, "fm:request", { ...track, id: "fmtest2", title: "Soft Focus" })).ok, true);
  assert.equal((await ask(a, "fm:play", { ...track, id: "fmtest2", title: "Soft Focus" })).ok, true);
  const state = await new Promise((resolve) => { b.once("fm:state", resolve); ask(a, "fm:queue:add", { ...track, id: "fmtest3", title: "Until Morning" }); });
  assert.equal(state.track.id, "fmtest2");
  assert.equal(state.queue.some((q) => q.track.id === "fmtest2"), false, "playing a queued track removes it from the queue");
});

test("the controller can switch to every light pattern, including the new rigs", async () => {
  const a = await client();
  await ask(a, "fm:join");
  for (const fx of ["sweep", "cone", "matrix", "chase", "follow"]) assert.equal((await ask(a, "fm:lights", { fx })).ok, true, fx);
  assert.equal((await ask(a, "fm:lights", { fx: "lasers-everywhere" })).error, "invalid_fx");
});

test("joining by room code lands in that room, and a lost room is rebuilt from the rejoining listener", async () => {
  const a = await client(), b = await client();
  const joined = await ask(a, "fm:join");
  assert.equal((await ask(a, "fm:play", track)).ok, true);
  const state = await new Promise((resolve) => { b.once("fm:state", resolve); ask(b, "fm:join", { room: joined.room }); });
  assert.equal(state.room, joined.room, "invite link joins the same room");
  assert.equal(state.track.id, track.id);
  // the room disappears (instance restart / everyone dropped) and a listener reconnects with what it was hearing
  a.disconnect(); b.disconnect();
  await new Promise((r) => setTimeout(r, 200));
  const c = await client(), startedAt = Date.now() - 30_000;
  const back = await new Promise((resolve) => { c.once("fm:state", resolve); ask(c, "fm:join", { room: joined.room, seed: { track, startedAt, lights: { theme: "ocean", fx: "cone", intensity: 3 } } }); });
  assert.equal(back.room, joined.room);
  assert.equal(back.track.id, track.id);
  assert.equal(back.startedAt, startedAt, "playback position is kept");
  assert.equal(back.lights.fx, "cone");
  // a seed never overrides a room that still exists, and bogus codes fall back to a random room
  const d = await client();
  const other = await new Promise((resolve) => { d.once("fm:state", resolve); ask(d, "fm:join", { room: joined.room, seed: { track: { ...track, id: "fmtest9", title: "Hijack" }, startedAt: Date.now() } }); });
  assert.equal(other.track.id, track.id);
  const e = await client();
  assert.equal((await ask(e, "fm:join", { room: "NOT-A-ROOM" })).ok, true);
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const stateOf = (socket, pred, ms = 4000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { socket.off("fm:state", on); reject(new Error("state never matched")); }, ms);
  const on = (st) => { if (pred(st)) { clearTimeout(timer); socket.off("fm:state", on); resolve(st); } };
  socket.on("fm:state", on);
});

test("controller refresh keeps the aux, the song and the controller's own queue", async () => {
  const dj = await client(), fan = await client();
  const joined = await ask(dj, "fm:join", { key: "tab-aaaa-1111" });
  await ask(fan, "fm:join", { room: joined.room, key: "tab-bbbb-2222" });
  await ask(dj, "fm:play", track);
  await ask(dj, "fm:queue:add", { ...track, id: "fmq1", title: "Queued by the DJ" });
  const held = stateOf(fan, (st) => st.djHold);
  dj.disconnect();
  const during = await held;
  assert.equal(during.dj, null);
  assert.equal(during.track.id, track.id, "song keeps playing while the controller reloads");
  assert.equal(during.queue[0].track.id, "fmq1", "controller's queue survives the drop");
  const again = await client();
  const back = await new Promise((resolve) => { again.once("fm:state", resolve); ask(again, "fm:join", { room: joined.room, key: "tab-aaaa-1111" }); });
  assert.equal(back.dj, again.id, "same tab gets the aux back");
  assert.equal(back.djHandle, during.queue[0].by, "same stage name after the refresh");
  assert.equal(back.djHold, false);
  assert.equal(back.track.id, track.id);
});

test("controller leaving on purpose hands the aux over without stopping the music", async () => {
  const dj = await client(), fan = await client();
  const joined = await ask(dj, "fm:join", { key: "tab-cccc-3333" });
  await ask(fan, "fm:join", { room: joined.room, key: "tab-dddd-4444" });
  await ask(dj, "fm:play", track);
  const chat = next(fan, "fm:chat");
  const st = stateOf(fan, (s) => s.dj === fan.id);
  await ask(dj, "fm:leave");
  const after = await st;
  assert.equal(after.track.id, track.id);
  assert.match((await chat).text, /has the aux now/);
});

test("a controller who never comes back is replaced after the hold, and a solo controller's room survives a refresh", async () => {
  const dj = await client(), fan = await client();
  const joined = await ask(dj, "fm:join", { key: "tab-eeee-5555" });
  await ask(fan, "fm:join", { room: joined.room, key: "tab-ffff-6666" });
  await ask(dj, "fm:play", track);
  dj.disconnect();
  const after = await stateOf(fan, (s) => s.dj === fan.id && !s.djHold);
  assert.equal(after.track.id, track.id);
  fan.disconnect();
  const solo = await client();
  const j = await ask(solo, "fm:join", { key: "tab-gggg-7777" });
  await ask(solo, "fm:play", { ...track, id: "fmsolo" });
  solo.disconnect();
  await wait(300);
  const again = await client();
  const back = await new Promise((resolve) => { again.once("fm:state", resolve); ask(again, "fm:join", { room: j.room, key: "tab-gggg-7777" }); });
  assert.equal(back.track.id, "fmsolo", "empty room is kept during the hold");
  assert.equal(back.dj, again.id);
});

test("the next queued song starts when a listener's audio ends, without the controller's device", async () => {
  const dj = await client(), fan = await client();
  const joined = await ask(dj, "fm:join");
  await ask(fan, "fm:join", { room: joined.room });
  await ask(dj, "fm:play", { ...track, id: "fmshort", duration: 1 });
  await ask(fan, "fm:request", { ...track, id: "fmnext", title: "Next up" });
  assert.equal((await ask(fan, "fm:ended", { id: "fmnext" })).ok, false, "only the song on air can end");
  await wait(200);
  const res = await ask(fan, "fm:ended", { id: "fmshort" });
  assert.equal(res.advanced, true);
  assert.equal((await ask(dj, "fm:ended", { id: "fmshort" })).ok, false, "a second report does not skip again");
});

test("auto light show: the first valid cue sheet for the song on air is shared with the room and late joiners", async () => {
  const dj = await client(), fan = await client();
  const joined = await ask(dj, "fm:join");
  await ask(fan, "fm:join", { room: joined.room });
  await ask(dj, "fm:play", track);
  const sheet = { id: track.id, bpm: 128, bar: .42, dur: 180, conf: 3.1, energy: [10, 40, 90], sections: [{ t: 0, k: "intro", e: 20 }, { t: 30, k: "groove", e: 60 }, { t: 105, k: "drop", e: 100 }], drops: [105] };
  assert.equal((await ask(fan, "fm:cues", { ...sheet, id: "fmother" })).error, "invalid", "only for the song on air");
  assert.equal((await ask(dj, "fm:cues", { ...sheet, sections: [{ t: 0, k: "<script>", e: 1 }] })).error, "invalid");
  assert.equal((await ask(dj, "fm:cues", { ...sheet, extra: "dropped" })).ok, false, "cooldown after the rejected try");
  await new Promise((r) => setTimeout(r, 5100));
  const got = next(fan, "fm:cues");
  assert.equal((await ask(dj, "fm:cues", { ...sheet, extra: "dropped" })).ok, true);
  const shared = await got;
  assert.equal(shared.bpm, 128);
  assert.equal(shared.extra, undefined, "unknown fields are not relayed");
  assert.equal((await ask(fan, "fm:cues", sheet)).error, "exists", "first sheet wins");
  const late = await client();
  const cues = next(late, "fm:cues");
  await ask(late, "fm:join", { room: joined.room });
  assert.deepEqual((await cues).drops, [105]);
  const st = await new Promise((r) => { late.once("fm:state", r); ask(dj, "fm:play", { ...track, id: "fmnew", title: "New song" }); });
  assert.equal(st.cues, null, "a new song clears the cue sheet");
  assert.equal((await ask(dj, "fm:lights", { auto: false })).ok, true);
  assert.equal((await ask(dj, "fm:lights", { auto: "yes" })).error, "invalid_auto");
});

test("the new party and hands reactions count up and say who sent them", async () => {
  const a = await client(), b = await client();
  await ask(a, "fm:join"); const joinedB = await ask(b, "fm:join");
  const seen = next(a, "fm:reaction");
  assert.equal((await ask(b, "fm:reaction", "party")).ok, true);
  const r = await seen;
  assert.equal(r.kind, "party"); assert.equal(r.count, 1); assert.equal(r.handle, joinedB.handle);
  assert.equal((await ask(b, "fm:reaction", "hands")).error, "cooldown");
  await new Promise((done) => setTimeout(done, 750));
  assert.equal((await ask(b, "fm:reaction", "hands")).ok, true);
  assert.equal((await ask(b, "fm:reaction", "confetti")).error, "invalid");
});

test("a queued song starts a crossfade's length before the current song ends", async () => {
  const dj = await client();
  await ask(dj, "fm:join");
  await ask(dj, "fm:play", { ...track, id: "fmlong", duration: 4 });
  await ask(dj, "fm:queue:add", { ...track, id: "fmmix", title: "Mixed in" });
  const began = Date.now();
  const mixed = await new Promise((resolve) => dj.on("fm:state", (s) => { if (s.track?.id === "fmmix") resolve(s); }));
  const after = Date.now() - began;
  // on air at +1.8s, 4s long, 1s crossfade: the next song is due at about +4.8s, before the first one ends at +5.8s
  assert.ok(after > 3800 && after < 5800, "advanced after " + after + "ms");
  assert.equal(mixed.queue.length, 0);
});

test("someone walking into a silent room starts a song for everyone, but never over a playing one", async () => {
  const a = await client(), b = await client();
  const joined = await ask(a, "fm:join");
  assert.equal(joined.silent, true);
  const started = next(a, "fm:state");
  assert.equal((await ask(a, "fm:autostart", track)).ok, true);
  assert.equal((await started).track.id, track.id);
  const second = await ask(b, "fm:join", { room: joined.room });
  assert.equal(second.silent, false);
  assert.equal((await ask(b, "fm:autostart", { ...track, id: "fmother" })).error, "playing");
  assert.equal((await ask(b, "fm:autostart", { title: "no id" })).ok, false);
});
