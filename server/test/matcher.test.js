import assert from "node:assert/strict";
import { test } from "node:test";
import { Matcher } from "../src/matcher.js";

const person = (id, over = {}) => ({
  id,
  gender: "male",
  want: "any",
  category: "general",
  mode: "text",
  interests: [],
  ...over,
});

function clock(start = 1_000_000) {
  let t = start;
  const now = () => t;
  now.advance = (ms) => (t += ms);
  return now;
}

test("pairs two compatible strangers immediately", () => {
  const m = new Matcher();
  assert.equal(m.add(person("a")), null);
  const match = m.add(person("b"));
  assert.ok(match);
  assert.equal(m.size, 0);
});

test("respects gender preferences in both directions", () => {
  const m = new Matcher();
  m.add(person("a", { gender: "male", want: "female" }));
  // b is male: a does not want b, so no match even though b accepts anyone
  assert.equal(m.add(person("b", { gender: "male", want: "any" })), null);
  // c is female but only wants female: c does not want a (male)
  assert.equal(m.add(person("c", { gender: "female", want: "female" })), null);
  // d is female and accepts anyone: matches a
  const match = m.add(person("d", { gender: "female", want: "any" }));
  assert.ok(match);
  assert.deepEqual([match.initiator.id, match.other.id].sort(), ["a", "d"]);
});

test("keeps categories and modes separate", () => {
  const m = new Matcher();
  m.add(person("a", { category: "music" }));
  assert.equal(m.add(person("b", { category: "gaming" })), null);
  assert.equal(m.add(person("c", { category: "music", mode: "video" })), null);
  assert.ok(m.add(person("d", { category: "music" })));
});

test("prefers the partner with the most shared interests", () => {
  const m = new Matcher();
  m.add(person("gamer", { interests: ["gaming"] }));
  m.add(person("fan", { interests: ["music", "guitar"] }));
  const match = m.add(person("me", { interests: ["guitar", "music", "art"] }));
  assert.ok(match);
  assert.deepEqual([match.initiator.id, match.other.id].sort(), ["fan", "me"]);
  assert.deepEqual(match.common.sort(), ["guitar", "music"]);
});

test("waits for a shared interest, then relaxes after relaxMs", () => {
  const now = clock();
  const m = new Matcher({ relaxMs: 5000, now });
  m.add(person("a", { interests: ["music"] }));
  assert.equal(m.add(person("b", { interests: ["gaming"] })), null);
  assert.deepEqual(m.tick(), []);

  now.advance(5001);
  const matches = m.tick();
  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0].common, []);
});

test("someone with no interests matches anyone straight away", () => {
  const m = new Matcher();
  m.add(person("a", { interests: ["music"] }));
  assert.ok(m.add(person("b")));
});

test("does not immediately re-pair two people who just talked", () => {
  const now = clock();
  const m = new Matcher({ cooldownMs: 60_000, now });
  m.add(person("a"));
  assert.ok(m.add(person("b")));
  m.add(person("a"));
  assert.equal(m.add(person("b")), null);

  now.advance(60_001);
  assert.equal(m.tick().length, 1);
});

test("the earlier arrival becomes the WebRTC initiator", () => {
  const now = clock();
  const m = new Matcher({ now });
  m.add(person("early"));
  now.advance(100);
  const match = m.add(person("late"));
  assert.equal(match.initiator.id, "early");
  assert.equal(match.other.id, "late");
});

test("remove takes someone out of the queue", () => {
  const m = new Matcher();
  m.add(person("a"));
  assert.equal(m.remove("a"), true);
  assert.equal(m.remove("a"), false);
  assert.equal(m.add(person("b")), null);
});

test("re-queueing keeps the original wait time", () => {
  const now = clock();
  const m = new Matcher({ now });
  m.add(person("a"));
  const waiting = [...m.byId.values()][0];
  now.advance(4000);
  m.add({ ...waiting });
  assert.equal(m.byId.get("a").joinedAt, waiting.joinedAt);
});
