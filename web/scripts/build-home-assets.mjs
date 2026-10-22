import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const [heroSource, iconSource] = process.argv.slice(2);
if (!heroSource || !iconSource) {
  throw new Error("Usage: node scripts/build-home-assets.mjs <hero-image> <icon-sheet>");
}

const output = resolve("public/art/home");
await mkdir(output, { recursive: true });

await sharp(heroSource)
  .resize({ width: 2400, withoutEnlargement: true })
  .webp({ quality: 88, effort: 6 })
  .toFile(resolve(output, "hero-globe.webp"));

const sheet = sharp(iconSource);
const { width, height } = await sheet.metadata();
if (!width || !height) throw new Error("Could not read icon sheet dimensions");

const tileWidth = Math.floor(width / 2);
const tileHeight = Math.floor(height / 2);
const icons = [
  ["people", 0, 0],
  ["chat", tileWidth, 0],
  ["shield", 0, tileHeight],
  ["bolt", tileWidth, tileHeight],
];

for (const [name, left, top] of icons) {
  await sharp(iconSource)
    .extract({ left, top, width: tileWidth, height: tileHeight })
    .resize(360, 360)
    .webp({ quality: 86, effort: 6 })
    .toFile(resolve(output, `${name}.webp`));
}

console.log(`Built homepage assets in ${output}`);
