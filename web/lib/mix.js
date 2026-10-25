// Building a fresh, mixed song list from many Audius feeds. Pure helpers, shared by the API route and its tests.

// genre chips on the page and the Audius genres each one draws from
export const MIX_GENRES = {
  Electronic: ["Electronic", "Electro", "Future Bass", "Glitch Hop"],
  House: ["House", "Deep House", "Tech House", "Future House", "Progressive House"],
  Techno: ["Techno", "Trance", "Hardstyle"],
  "Hip-Hop": ["Hip-Hop/Rap", "Trap", "R&B/Soul"],
  Bass: ["Dubstep", "Drum & Bass", "Jungle", "Moombahton"],
  Chill: ["Lo-Fi", "Ambient", "Downtempo", "Vaporwave"],
  Pop: ["Pop", "Hyperpop", "Dancehall", "Latin"],
  Indie: ["Alternative", "Rock", "Acoustic", "Experimental"],
};
const ALL_GENRES = [...new Set(Object.values(MIX_GENRES).flat())];

// small seeded generator so a seed + page always gives the same list
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (rand, list) => list[Math.floor(rand() * list.length)];
export function shuffled(rand, list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

// The feeds for one page: [label, path, params]. Offsets move with the page and the seed, so "More" keeps finding new songs.
export function mixPlan(seed, page, chip) {
  const rand = rng(seed * 31 + page * 7919 + 1);
  const off = (span) => Math.floor(rand() * span) + page * 12;
  if (chip && MIX_GENRES[chip]) {
    const genres = shuffled(rand, MIX_GENRES[chip]);
    return [
      ["hot", "/tracks/trending", { genre: genres[0], time: "week", offset: off(12) }],
      ["classic", "/tracks/trending", { genre: genres[0], time: "allTime", offset: off(60) }],
      ["hot", "/tracks/trending", { genre: genres[1 % genres.length], time: "month", offset: off(24) }],
      ["gem", "/tracks/trending", { genre: genres[2 % genres.length], time: "allTime", offset: off(90) }],
      ["gem", "/tracks/trending", { genre: genres[(3 % genres.length)], time: "week", offset: off(36) }],
    ];
  }
  return [
    ["hot", "/tracks/trending", { time: "week", offset: off(40) }],
    ["rising", "/tracks/trending/underground", { offset: off(80) }],
    ["classic", "/tracks/trending", { time: "allTime", offset: off(200) }],
    ["hot", "/tracks/trending", { time: "month", offset: off(80) }],
    ["gem", "/tracks/feeling-lucky", {}],
    ["genre", "/tracks/trending", { genre: pick(rand, ALL_GENRES), time: "month", offset: off(20) }],
    ["genre", "/tracks/trending", { genre: pick(rand, ALL_GENRES), time: "allTime", offset: off(40) }],
  ];
}

// Shuffle each feed, drop repeats (same id, or an artist already on the page), then deal the feeds two songs at
// a time in turn, so the list alternates trending, underground, classics and random finds two by two.
export function dealMix(seed, buckets, limit = 24) {
  const rand = rng(seed ^ 0x9e3779b9);
  const ids = new Set(), artists = new Set();
  const lanes = buckets.map((rows) => shuffled(rand, rows).filter((t) => {
    if (ids.has(t.id)) return false;
    ids.add(t.id); return true;
  }));
  const out = [];
  for (let progress = true; out.length < limit && progress;) {
    progress = false;
    for (const lane of lanes) {
      let taken = 0;
      while (lane.length && taken < 2 && out.length < limit) {
        const t = lane.shift(), who = (t.artist || "").toLowerCase();
        if (artists.has(who)) continue;
        artists.add(who); out.push(t); taken++; progress = true;
      }
    }
  }
  return out;
}
