// Cuts the two source sheets in web/art-src/ into small optimised images in web/public/art/.
//
//   node scripts/build-art.mjs                 build everything
//   PREVIEW_DIR=some\folder node scripts/build-art.mjs    also write contact sheets to eyeball the crops
//
// icons-sheet.jpg    12 glowing icons on a dark background -> transparent WebP (works on any section)
// avatars-sheet.jpg  8 illustrated avatars                  -> square WebP

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = (f) => join(root, "art-src", f);
const out = (...p) => join(root, "public", "art", ...p);
const PREVIEW_DIR = process.env.PREVIEW_DIR;

mkdirSync(out("icons"), { recursive: true });
mkdirSync(out("avatars"), { recursive: true });
if (PREVIEW_DIR) mkdirSync(PREVIEW_DIR, { recursive: true });

// Positions below are measured on a 2000px-wide version of each sheet and scaled to the real size.
const REFERENCE_WIDTH = 2000;

// ---------- icons ----------
const ICON_CENTERS = {
  message: [355, 208],
  chats: [790, 208],
  send: [1226, 208],
  profile: [1661, 208],
  groups: [354, 555],
  "add-friend": [790, 555],
  search: [1226, 555],
  settings: [1661, 555],
  preferences: [354, 893],
  notifications: [790, 893],
  call: [1226, 893],
  video: [1661, 893],
};
const ICON_BOX = { w: 275, h: 245 }; // reference px: wide enough for the widest icon, short enough to skip the captions
const ICON_OUT = 192;

/**
 * The icons are light-emitting strokes on a near-black background. Treat the picture as
 * `pixel = bg + glow` and recover colour + transparency, so the result looks identical on the
 * original background and still reads well on any other dark surface.
 */
function glowToAlpha(rgb, width, height) {
  const channels = 3;
  // background colour = average of the four corners
  const corner = 8;
  const bg = [0, 0, 0];
  let samples = 0;
  for (const [cx, cy] of [[0, 0], [width - corner, 0], [0, height - corner], [width - corner, height - corner]]) {
    for (let y = cy; y < cy + corner; y++) {
      for (let x = cx; x < cx + corner; x++) {
        for (let c = 0; c < channels; c++) bg[c] += rgb[(y * width + x) * channels + c];
        samples++;
      }
    }
  }
  for (let c = 0; c < channels; c++) bg[c] /= samples;

  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const p = [0, 0, 0];
    let alpha = 0;
    for (let c = 0; c < channels; c++) {
      p[c] = Math.max(0, rgb[i * channels + c] - bg[c]);
      alpha = Math.max(alpha, p[c] / (255 - bg[c]));
    }
    alpha = Math.max(0, (alpha - 0.02) / 0.98); // drop JPEG noise in the background
    if (alpha === 0) continue; // stays fully transparent
    for (let c = 0; c < channels; c++) rgba[i * 4 + c] = Math.min(255, Math.round(bg[c] + p[c] / alpha));
    rgba[i * 4 + 3] = Math.round(alpha * 255);
  }
  return rgba;
}

async function buildIcons() {
  const sheet = sharp(src("icons-sheet.jpg"));
  const { width: W, height: H } = await sheet.metadata();
  const k = W / REFERENCE_WIDTH;
  const done = [];

  for (const [name, [cx, cy]] of Object.entries(ICON_CENTERS)) {
    const w = Math.round(ICON_BOX.w * k);
    const h = Math.round(ICON_BOX.h * k);
    const left = Math.max(0, Math.min(W - w, Math.round(cx * k - w / 2)));
    const top = Math.max(0, Math.min(H - h, Math.round(cy * k - h / 2)));

    const { data, info } = await sharp(src("icons-sheet.jpg"))
      .extract({ left, top, width: w, height: h })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const rgba = glowToAlpha(data, info.width, info.height);
    const file = out("icons", `${name}.webp`);
    await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
      .resize(ICON_OUT, ICON_OUT, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90, alphaQuality: 95 })
      .toFile(file);
    done.push(file);
  }
  console.log(`icons: ${done.length} written`);

  if (PREVIEW_DIR) {
    // contact sheet on a dark tile like the one the site uses
    const cell = 220;
    const tiles = await Promise.all(done.map((f) => sharp(f).resize(cell - 20, cell - 20).toBuffer()));
    await sharp({ create: { width: cell * 4, height: cell * 3, channels: 3, background: { r: 18, g: 20, b: 32 } } })
      .composite(tiles.map((input, i) => ({ input, left: (i % 4) * cell + 10, top: Math.floor(i / 4) * cell + 10 })))
      .png()
      .toFile(join(PREVIEW_DIR, "icons-contact.png"));
  }
}

// ---------- avatars ----------
// Reference-px centre of each portrait and the top of its square crop (row 1 / row 2).
const AVATAR_CENTERS_X = [
  [250, 750, 1250, 1750],
  [255, 750, 1250, 1760],
];
const AVATAR_TOPS = [22, 590];
const AVATAR_SIZE = 520;
const AVATAR_OUT = 360;

async function buildAvatars() {
  const { width: W, height: H } = await sharp(src("avatars-sheet.jpg")).metadata();
  const k = W / REFERENCE_WIDTH;
  const size = Math.round(AVATAR_SIZE * k);
  const done = [];

  let n = 1;
  for (let row = 0; row < 2; row++) {
    for (const cx of AVATAR_CENTERS_X[row]) {
      const left = Math.max(0, Math.min(W - size, Math.round(cx * k - size / 2)));
      const top = Math.max(0, Math.min(H - size, Math.round(AVATAR_TOPS[row] * k)));
      const file = out("avatars", `a${n++}.webp`);
      await sharp(src("avatars-sheet.jpg"))
        .extract({ left, top, width: size, height: size })
        .resize(AVATAR_OUT, AVATAR_OUT)
        .webp({ quality: 82 })
        .toFile(file);
      done.push(file);
    }
  }
  console.log(`avatars: ${done.length} written`);

  if (PREVIEW_DIR) {
    const cell = 260;
    const tiles = await Promise.all(done.map((f) => sharp(f).resize(cell - 10, cell - 10).toBuffer()));
    await sharp({ create: { width: cell * 4, height: cell * 2, channels: 3, background: { r: 255, g: 255, b: 255 } } })
      .composite(tiles.map((input, i) => ({ input, left: (i % 4) * cell + 5, top: Math.floor(i / 4) * cell + 5 })))
      .png()
      .toFile(join(PREVIEW_DIR, "avatars-contact.png"));
  }
}

// ---------- tagline banner (waves) ----------
// The supplied banner has its English slogan painted into the picture. The site shows the slogan as real,
// translated text instead, so here the text is painted out: a clean strip of the dark background from just
// above the text is stretched over the text area and blended in with a soft edge. The waves on both sides stay.
const BANNER = {
  topCrop: 22, // reference px of stray screenshot lines along the top edge
  zone: { left: 420, right: 1620, top: 36, bottom: 345 }, // reference px: area covered by the text (plus margin)
  feather: { x: 70, y: 22 }, // reference px: soft edge of the patch; it is fully opaque by the time the text starts
  cleanRows: { from: 14, to: 39 }, // reference px: text-free rows used as the fill
  outWidth: 2400,
};

async function buildBanner() {
  const input = src("tagline-banner.png");
  const { width: W, height: H } = await sharp(input).metadata();
  const k = W / REFERENCE_WIDTH;
  const px = (v) => Math.round(v * k);

  const zone = {
    left: px(BANNER.zone.left),
    top: px(BANNER.zone.top),
    width: px(BANNER.zone.right - BANNER.zone.left),
    height: Math.min(px(BANNER.zone.bottom - BANNER.zone.top), H - px(BANNER.zone.top)),
  };
  const fx = px(BANNER.feather.x);
  const fy = px(BANNER.feather.y);

  // fill = clean rows stretched to the zone size, softened
  const fill = await sharp(input)
    .extract({ left: zone.left, top: px(BANNER.cleanRows.from), width: zone.width, height: px(BANNER.cleanRows.to - BANNER.cleanRows.from) })
    .resize(zone.width, zone.height, { fit: "fill" })
    .blur(10)
    .toBuffer();

  // soft-edged mask so the patch melts into the picture instead of showing a rectangle
  const mask = await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${zone.width}" height="${zone.height}">
         <defs><filter id="b" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${fx * 0.35} ${fy * 0.4}"/></filter></defs>
         <rect x="${fx}" y="${fy}" width="${zone.width - 2 * fx}" height="${zone.height - 2 * fy}" fill="white" filter="url(#b)"/>
       </svg>`,
    ),
  )
    .png()
    .toBuffer();

  const patch = await sharp(fill).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();

  // paint over the text first, at full size (sharp applies composite after resize, so this must be its own step)
  const painted = await sharp(input)
    .composite([{ input: patch, left: zone.left, top: zone.top }])
    .png()
    .toBuffer();

  const file = out("tagline-waves.webp");
  const cleaned = await sharp(painted)
    .extract({ left: 0, top: px(BANNER.topCrop), width: W, height: H - px(BANNER.topCrop) })
    .resize({ width: BANNER.outWidth })
    .webp({ quality: 80 })
    .toFile(file);
  console.log(`banner: ${cleaned.width}x${cleaned.height}, ${Math.round(cleaned.size / 1024)} KB`);

  if (PREVIEW_DIR) await sharp(file).png().toFile(join(PREVIEW_DIR, "banner-clean.png"));
}

// ---------- globe ----------
async function buildGlobe() {
  const file = out("globe.webp");
  const info = await sharp(src("globe.png")).resize({ width: 1400 }).webp({ quality: 76 }).toFile(file);
  console.log(`globe: ${info.width}x${info.height}, ${Math.round(info.size / 1024)} KB`);
}

await buildIcons();
await buildAvatars();
await buildBanner();
await buildGlobe();
