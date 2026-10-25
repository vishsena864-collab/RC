import { test } from "node:test";
import assert from "node:assert/strict";
import { dealMix, mixPlan, MIX_GENRES } from "./mix.js";

const lane = (tag, n) => Array.from({ length: n }, (_, i) => ({ id: tag + i, artist: tag + "-artist-" + i }));

test("songs are dealt two at a time from each feed in turn", () => {
  const out = dealMix(7, [lane("a", 6), lane("b", 6), lane("c", 6)], 12);
  assert.equal(out.length, 12);
  assert.deepEqual(out.map((t) => t.id[0]).join(""), "aabbccaabbcc");
});

test("no song or artist repeats on a page", () => {
  const dupes = [{ id: "x", artist: "Same" }, { id: "y", artist: "same" }, { id: "x", artist: "Other" }, { id: "z", artist: "Third" }];
  const out = dealMix(3, [dupes, [{ id: "x", artist: "Again" }]], 24);
  assert.equal(new Set(out.map((t) => t.id)).size, out.length);
  assert.equal(new Set(out.map((t) => t.artist.toLowerCase())).size, out.length);
});

test("different seeds give different lists, the same seed the same list", () => {
  const feeds = [lane("a", 12), lane("b", 12), lane("c", 12)];
  const one = dealMix(1, feeds).map((t) => t.id).join(), two = dealMix(2, feeds).map((t) => t.id).join();
  assert.notEqual(one, two);
  assert.equal(one, dealMix(1, feeds).map((t) => t.id).join());
});

test("the mix draws from trending, underground, classics, random finds and genres; chips stay in their genres", () => {
  const all = mixPlan(5, 0, null).map(([, path, p]) => path + (p.time || "") );
  for (const want of ["/tracks/trendingweek", "/tracks/trending/underground", "/tracks/trendingallTime", "/tracks/feeling-lucky"]) assert.ok(all.includes(want), want);
  for (const [, , p] of mixPlan(5, 2, "House")) assert.ok(MIX_GENRES.House.includes(p.genre));
  assert.ok(mixPlan(5, 3, null)[0][2].offset >= 36, "later pages reach deeper into the charts");
});
