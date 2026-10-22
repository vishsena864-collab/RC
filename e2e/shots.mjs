// Captures screenshots of the main pages so the design can be reviewed.
//   SHOTS_DIR=some\folder node shots.mjs      (website must be running on :3000)

import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const WEB = process.env.WEB_URL || "http://localhost:3000";
const DIR = process.env.SHOTS_DIR;
assert.ok(DIR, "set SHOTS_DIR");
mkdirSync(DIR, { recursive: true });

const EDGE = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find(existsSync);
const browser = await chromium.launch({ executablePath: EDGE, headless: true });

const jobs = [
  { file: "home-desktop.png", path: "/en", w: 1280, h: 900, full: true },
  { file: "home-desktop-top.png", path: "/en", w: 1280, h: 900 },
  { file: "home-dark.png", path: "/en", w: 1280, h: 900, scheme: "dark", full: true },
  { file: "home-phone.png", path: "/en", w: 390, h: 844, full: true },
  { file: "home-phone-top.png", path: "/en", w: 390, h: 1000 },
  { file: "home-phone-de.png", path: "/de", w: 360, h: 1000 },
  { file: "home-tablet.png", path: "/en", w: 820, h: 1100 },
  { file: "home-es.png", path: "/es", w: 1280, h: 900 },
  { file: "band-1280.png", path: "/en", w: 1280, h: 900, selector: ".tagline-band" },
  { file: "band-1920.png", path: "/en", w: 1920, h: 1000, selector: ".tagline-band" },
  { file: "band-820.png", path: "/en", w: 820, h: 1000, selector: ".tagline-band" },
  { file: "band-390-es.png", path: "/es", w: 390, h: 900, selector: ".tagline-band" },
  { file: "globe-390.png", path: "/en", w: 390, h: 900, selector: ".globe-card" },
  { file: "globe-1280-fr.png", path: "/fr", w: 1280, h: 900, selector: ".globe-card" },
  { file: "category.png", path: "/en/chat/music", w: 1280, h: 900, full: true },
  { file: "category-phone.png", path: "/pt/chat/gaming", w: 390, h: 844 },
];

for (const j of jobs) {
  const ctx = await browser.newContext({ viewport: { width: j.w, height: j.h }, colorScheme: j.scheme || "light" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("requestfailed", (r) => errors.push(`request failed: ${r.url()}`));
  await page.goto(WEB + j.path, { waitUntil: "networkidle" });
  // reveal lazy images before a full-page capture
  if (j.full) {
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(300);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const broken = await page.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src));
  if (j.selector) {
    const el = page.locator(j.selector);
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400); // let the lazy image arrive
    await el.screenshot({ path: join(DIR, j.file) });
  } else {
    await page.screenshot({ path: join(DIR, j.file), fullPage: Boolean(j.full) });
  }
  console.log(`${j.file}: overflow=${overflow}px broken-images=${broken.length}${errors.length ? " ERRORS: " + errors.join("; ") : ""}`);
  await ctx.close();
}
await browser.close();
