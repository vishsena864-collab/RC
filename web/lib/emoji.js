// Neon emoji for Underground FM: a small hand-drawn set (glowing tube + white core) in public/underground/neon,
// drawn to match the light show. CSS gives them a neon flicker-on, a breathing glow and a pop.

// [character, file, short name]; the picker shows these twelve
export const EMOJI = [
  ["❤️", "heart", "heart"], ["🔥", "fire", "fire"], ["🎉", "party", "party"], ["🙌", "hands", "raised hands"],
  ["😂", "joy", "laughing"], ["😎", "cool", "cool"], ["😍", "love", "love"], ["😮", "wow", "wow"],
  ["👍", "thumbs", "thumbs up"], ["✨", "sparkles", "sparkles"], ["🎶", "notes", "music"], ["⚡", "bolt", "lightning"],
];
// close relatives typed from a phone keyboard light up as the nearest neon emoji
const ALIASES = [["🤣", "joy"], ["😆", "joy"], ["🥰", "love"], ["😻", "love"], ["😲", "wow"], ["😱", "wow"], ["🤯", "wow"], ["💜", "heart"], ["💙", "heart"], ["💖", "heart"], ["🥳", "party"], ["👏", "hands"], ["🎵", "notes"], ["💥", "bolt"]];

// room reactions (server kinds) and their emoji; spark and wave are older kinds still accepted by the server
export const REACTION_EMOJI = { heart: "heart", fire: "fire", party: "party", hands: "hands", spark: "sparkles", wave: "bolt" };

export const emojiSrc = (code) => `/underground/neon/${code}.svg`;

const byChar = new Map();
for (const [char, code] of [...EMOJI, ...ALIASES]) { byChar.set(char, code); byChar.set(char.replace(/️/g, ""), code); }
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pattern = new RegExp("(" + [...byChar.keys()].sort((a, b) => b.length - a.length).map(escape).join("|") + ")️?", "gu");

// Split text into plain strings and {code, char} parts for the emoji we have animations for.
export function splitEmoji(text) {
  const parts = []; let last = 0;
  for (const m of String(text).matchAll(pattern)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ code: byChar.get(m[1]), char: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// A message of one to three animated emoji (and nothing else) is shown big, without a bubble.
export function jumboCount(parts) {
  let n = 0;
  for (const p of parts) { if (typeof p === "string") { if (p.trim()) return 0; } else n++; }
  return n <= 3 ? n : 0;
}
