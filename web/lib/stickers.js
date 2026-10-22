// Animated stickers. Each sticker is a native emoji plus a CSS animation (`a-<anim>` in globals.css) and an
// optional particle effect (`fx`). Nothing here is a third-party asset, so there is nothing to license.
//
// Keep the ids in step with STICKER_IDS in server/src/config.js: the server only relays ids from that list.

export const STICKERS = [
  { id: "wave", emoji: "👋", anim: "wave", fx: null },
  { id: "heart", emoji: "❤️", anim: "beat", fx: "hearts" },
  { id: "laugh", emoji: "😂", anim: "laugh", fx: "tears" },
  { id: "fire", emoji: "🔥", anim: "flicker", fx: "sparks" },
  { id: "clap", emoji: "👏", anim: "clap", fx: "sparks" },
  { id: "party", emoji: "🎉", anim: "pop", fx: "confetti" },
  { id: "thumbs", emoji: "👍", anim: "thumb", fx: null },
  { id: "lovely", emoji: "😍", anim: "beat", fx: "hearts" },
  { id: "cool", emoji: "😎", anim: "cool", fx: "twinkle" },
  { id: "cry", emoji: "😭", anim: "sob", fx: "tears" },
  { id: "mind", emoji: "🤯", anim: "explode", fx: "sparks" },
  { id: "ghost", emoji: "👻", anim: "float", fx: null },
  { id: "music", emoji: "🎧", anim: "groove", fx: "notes" },
  { id: "sleepy", emoji: "😴", anim: "breathe", fx: "zzz" },
  { id: "cheer", emoji: "🙌", anim: "cheer", fx: "confetti" },
  { id: "magic", emoji: "✨", anim: "twinkle", fx: "twinkle" },
];

export const getSticker = (id) => STICKERS.find((s) => s.id === id);

// Repeatable "random": the same sticker always gets the same particle layout (no flicker between renders).
const rnd = (i, salt) => {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const px = (n) => `${Math.round(n)}px`;

const CONFETTI = ["#f472b6", "#38bdf8", "#facc15", "#34d399", "#a78bfa", "#fb923c"];

// Each effect: how particles move (kind -> keyframes `fx-<kind>`), their glyphs and how many there are.
const EFFECTS = {
  hearts: { kind: "rise", glyphs: ["❤️", "💖", "💕"], count: 7 },
  notes: { kind: "rise", glyphs: ["♪", "♫"], count: 5 },
  zzz: { kind: "rise", glyphs: ["z", "Z", "z"], count: 3 },
  sparks: { kind: "burst", glyphs: ["✦", "✧", "•"], count: 8 },
  tears: { kind: "drop", glyphs: ["💧"], count: 6 },
  confetti: { kind: "confetti", glyphs: [""], count: 12 },
  twinkle: { kind: "twinkle", glyphs: ["✦", "✧"], count: 5 },
};

/** Particle layout for an effect name, or null. */
export function fxParticles(name) {
  const fx = EFFECTS[name];
  if (!fx) return null;

  const items = Array.from({ length: fx.count }, (_, i) => {
    const glyph = fx.glyphs[i % fx.glyphs.length];
    const style = { "--d": (i * 0.17).toFixed(2), "--r": `${Math.round((rnd(i, 3) - 0.5) * 60)}deg` };

    if (fx.kind === "rise") {
      style["--x"] = px((rnd(i, 1) - 0.5) * 90);
      style.fontSize = px(14 + rnd(i, 2) * 10);
    } else if (fx.kind === "burst") {
      const angle = (i / fx.count) * Math.PI * 2 + rnd(i, 4) * 0.5;
      const dist = 46 + rnd(i, 5) * 26;
      style["--x"] = px(Math.cos(angle) * dist);
      style["--y"] = px(Math.sin(angle) * dist);
      style.fontSize = px(12 + rnd(i, 6) * 10);
    } else if (fx.kind === "drop") {
      const side = i % 2 === 0 ? 1 : -1;
      style["--x"] = px(side * (28 + rnd(i, 7) * 34));
      style["--y"] = px(16 + rnd(i, 8) * 40);
      style.fontSize = px(13 + rnd(i, 9) * 6);
    } else if (fx.kind === "confetti") {
      style["--x"] = px((rnd(i, 10) - 0.5) * 130);
      style["--y"] = px(-30 - rnd(i, 11) * 40);
      style["--c"] = CONFETTI[i % CONFETTI.length];
    } else {
      // twinkle: fixed spots around the sticker that pulse in turn
      const angle = (i / fx.count) * Math.PI * 2 + 0.4;
      style["--x"] = px(Math.cos(angle) * (48 + rnd(i, 12) * 10));
      style["--y"] = px(Math.sin(angle) * (44 + rnd(i, 13) * 10));
      style.fontSize = px(14 + rnd(i, 14) * 10);
    }
    return { glyph, style };
  });

  return { kind: fx.kind, items };
}
