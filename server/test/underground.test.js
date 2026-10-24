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
  app = createApp({ dataDir, config: { relaxMs: 300, tickMs: 50, adultEnabled: false, rematchCooldownMs: 0, limits: { ...defaultConfig.limits } } });
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
  const queued = next(a, "fm:state");
  assert.equal((await ask(b, "fm:request", track)).ok, true);
  const withQueue = await queued;
  assert.equal(withQueue.queue[0].by, joinedB.handle);
  assert.equal(withQueue.queue[0].track.id, track.id);
  assert.equal(JSON.stringify(withQueue.queue).includes(b.id), false, "queue entries name the requester by stage name, not connection id");
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
