// Screenshots of chat states that need two people or a waiting state: the searching radar, and the
// sticker picker on a phone-sized screen.   SHOTS_DIR=... WEB_URL=... node chat-shots.mjs

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
const phone = { width: 390, height: 844 };

async function start(page, category = "tech") {
  await page.goto(`${WEB}/en/start?category=${category}`);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Start chatting" }).last().click();
}

// 1. the searching radar (nobody else is online, so it keeps waiting)
const lonely = await (await browser.newContext({ viewport: phone })).newPage();
await start(lonely, "art");
await lonely.locator(".radar").waitFor();
await lonely.waitForTimeout(700);
await lonely.screenshot({ path: join(DIR, "searching-phone.png") });
console.log("searching-phone.png");

// 2. two phones matched, picker open
const a = await (await browser.newContext({ viewport: phone })).newPage();
const b = await (await browser.newContext({ viewport: phone })).newPage();
await start(a, "sports");
await start(b, "sports");
for (const p of [a, b]) await p.getByText("You are now chatting with a stranger. Say hi!").waitFor();
await a.getByLabel("Type a message…").fill("hello 👋");
await a.getByLabel("Type a message…").press("Enter");
await b.locator(".msg.them", { hasText: "hello" }).waitFor();
await b.getByLabel("Type a message…").fill("typing…");
await a.locator(".typing-bubble").waitFor();
await a.screenshot({ path: join(DIR, "typing-phone.png") });
await a.getByRole("button", { name: "Stickers" }).click();
await a.getByRole("dialog", { name: "Stickers" }).waitFor();
await a.waitForTimeout(300);
await a.screenshot({ path: join(DIR, "picker-phone.png") });
await a.getByRole("button", { name: "Party sticker" }).click();
await b.locator("[data-sticker='party']").waitFor();
await b.waitForTimeout(800);
await b.screenshot({ path: join(DIR, "sticker-phone.png") });
console.log("typing-phone.png, picker-phone.png, sticker-phone.png");

await browser.close();
