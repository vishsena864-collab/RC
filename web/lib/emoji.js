// Animated emoji for Underground FM: Google's Noto Animated Emoji (CC BY 4.0,
// https://googlefonts.github.io/noto-emoji-animation/), self-hosted at 96px in public/underground/emoji.
// Each code has an animated <code>.webp and a single-frame <code>-still.webp for reduced motion.

// [character, file code, short name]
export const EMOJI = [
  ["🔥", "1f525", "fire"], ["❤️", "2764_fe0f", "heart"], ["✨", "2728", "sparkles"], ["🌊", "1f30a", "wave"],
  ["🎉", "1f389", "party"], ["🙌", "1f64c", "raised hands"], ["😂", "1f602", "joy"], ["🤣", "1f923", "rolling"],
  ["😍", "1f60d", "heart eyes"], ["🥰", "1f970", "in love"], ["😎", "1f60e", "cool"], ["🤩", "1f929", "star struck"],
  ["🥳", "1f973", "partying"], ["🤯", "1f92f", "mind blown"], ["😭", "1f62d", "crying"], ["🥹", "1f979", "holding tears"],
  ["😏", "1f60f", "smirk"], ["😱", "1f631", "scream"], ["🤔", "1f914", "thinking"], ["🤪", "1f92a", "zany"],
  ["👀", "1f440", "eyes"], ["👏", "1f44f", "clap"], ["👍", "1f44d", "thumbs up"], ["🤘", "1f918", "rock on"],
  ["👋", "1f44b", "hello"], ["💃", "1f483", "dancing"], ["💯", "1f4af", "hundred"], ["💙", "1f499", "blue heart"],
  ["💜", "1f49c", "purple heart"], ["⚡", "26a1", "lightning"], ["🎶", "1f3b6", "notes"], ["🍻", "1f37b", "cheers"],
  ["🚀", "1f680", "rocket"], ["🌈", "1f308", "rainbow"], ["⭐", "2b50", "star"], ["💀", "1f480", "skull"],
];

// room reactions (server kinds) and the emoji that shows them
export const REACTION_EMOJI = { heart: "2764_fe0f", fire: "1f525", spark: "2728", wave: "1f30a", party: "1f389", hands: "1f64c" };

export const emojiSrc = (code, still = false) => `/underground/emoji/${code}${still ? "-still" : ""}.webp`;

const byChar = new Map();
for (const [char, code] of EMOJI) { byChar.set(char, code); byChar.set(char.replace(/️/g, ""), code); }
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
