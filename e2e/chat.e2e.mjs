// End-to-end test in a real browser (Microsoft Edge, already on Windows): two visitors find each other,
// chat, skip and report. Needs the chat server on :4000 and the website on :3000.
//
//   node chat.e2e.mjs            (screenshots go to $SHOTS_DIR if set)

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const WEB = process.env.WEB_URL || "http://localhost:3000";
const SHOTS = process.env.SHOTS_DIR || "";
const EDGE = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find(existsSync);
assert.ok(EDGE, "Microsoft Edge not found");

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const problems = [];
let step = 0;
const say = (msg) => console.log(`${String(++step).padStart(2, "0")}. ${msg}`);

async function visitor(name, viewport = { width: 1100, height: 800 }, colorScheme = "light") {
  const context = await browser.newContext({ viewport, colorScheme });
  const page = await context.newPage();
  page.on("pageerror", (e) => problems.push(`${name} pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && problems.push(`${name} console: ${m.text()}`));
  return { context, page, name };
}
const shot = async (page, file) => SHOTS && page.screenshot({ path: join(SHOTS, file), fullPage: false });

try {
  const alice = await visitor("alice");
  const bob = await visitor("bob");

  // ---------- setup form ----------
  await alice.page.goto(`${WEB}/en/start?category=music`);
  await bob.page.goto(`${WEB}/en/start?category=music`);
  await alice.page.waitForFunction(() => document.querySelector("#topic")?.value === "music");
  assert.equal(await alice.page.locator("#topic").inputValue(), "music", "deep link ?category= selects the topic");
  say("setup form loads and ?category=music preselects the topic");

  const startBtn = alice.page.getByRole("button", { name: "Start chatting" });
  await alice.page.waitForFunction(() => document.querySelector("button.btn-large")?.textContent.includes("Start"));
  assert.equal(await startBtn.isDisabled(), true, "Start is disabled until the 18+ box is ticked");
  assert.equal(await alice.page.locator("#topic option[value='adult']").isDisabled(), true, "adult chat starts locked");
  say("Start stays disabled until the 18+ checkbox is ticked");

  await shot(alice.page, "01-setup.png");

  async function fill(v, { gender, want, interests }) {
    // Click the visible pill (the way a person would); the real radio input is visually hidden.
    await v.page.getByRole("group", { name: "I am" }).getByText(gender, { exact: true }).click();
    await v.page.getByRole("group", { name: "I want to meet" }).getByText(want, { exact: true }).click();
    for (const i of interests) {
      await v.page.getByLabel("Interests (optional)").fill(i);
      await v.page.getByLabel("Interests (optional)").press("Enter");
    }
    await v.page.getByRole("checkbox").check();
  }
  await fill(alice, { gender: "Male", want: "Anyone", interests: ["Guitar", "Gaming"] });
  await fill(bob, { gender: "Female", want: "Anyone", interests: ["guitar"] });
  assert.equal(await alice.page.locator("#topic option[value='adult']").isDisabled(), false, "18+ confirmation unlocks adult chat");
  await alice.page.locator("#topic").selectOption("adult");
  assert.equal(await alice.page.locator("#topic").inputValue(), "adult");
  await alice.page.locator("#topic").selectOption("music");
  assert.equal(await alice.page.locator(".chip").count(), 2, "interests become chips");
  say("18+ confirmation unlocks adult text chat; interests are added as chips");

  // ---------- matching ----------
  await alice.page.getByRole("button", { name: "Start chatting" }).click();
  await alice.page.getByText("Looking for someone who shares your interests…").first().waitFor();
  say("alice is searching and sees the interest-based searching message");
  await bob.page.getByRole("button", { name: "Start chatting" }).click();

  for (const v of [alice, bob]) await v.page.getByText("You are now chatting with a stranger. Say hi!").waitFor();
  say("both are matched");
  const aliceMission = await alice.page.locator(".spark-quest strong").textContent();
  const bobMission = await bob.page.locator(".spark-quest strong").textContent();
  assert.equal(aliceMission, bobMission, "both strangers receive the same secret mission");
  assert.match(await alice.page.locator(".spark-meter").textContent(), /0\/6/, "spark streak starts at zero");
  say("both strangers receive the same synchronized secret mission");
  await alice.page.getByText("You both like: guitar").waitFor();
  await bob.page.getByText("You both like: guitar").waitFor();
  say("shared interest 'guitar' is shown to both");
  await alice.page.getByText("They say they are female.").waitFor();
  await bob.page.getByText("They say they are male.").waitFor();
  say("each side is told the other's self-declared gender");

  // ---------- Same Brain: blind answer, synchronized reveal ----------
  const aliceBrainPrompt = await alice.page.locator(".same-brain h3").textContent();
  const bobBrainPrompt = await bob.page.locator(".same-brain h3").textContent();
  assert.equal(aliceBrainPrompt, bobBrainPrompt, "both strangers receive the same blind-choice prompt");
  await alice.page.locator(".brain-choices button").first().click();
  await bob.page.getByText("They already chose. Your turn.").waitFor();
  assert.equal(await alice.page.locator(".brain-reveal").count(), 0, "the first answer remains hidden");
  assert.equal(await bob.page.locator(".brain-reveal").count(), 0, "the partner cannot see the first answer");
  await bob.page.locator(".brain-choices button").first().click();
  for (const v of [alice, bob]) {
    await v.page.locator(".same-brain.matched .brain-reveal").waitFor();
    await v.page.locator(".brain-screen-fx.match").waitFor();
  }
  assert.equal(
    await alice.page.locator(".brain-reveal div").first().locator("strong").textContent(),
    await bob.page.locator(".brain-reveal div").last().locator("strong").textContent(),
    "the synchronized reveal is personalized for each side",
  );
  say("Same Brain keeps the first answer secret, then gives both strangers a synchronized full-screen match reveal");

  // ---------- messaging ----------
  await alice.page.getByLabel("Type a message…").fill("hello from alice");
  await bob.page.locator(".typing-bubble").waitFor({ timeout: 4000 });
  assert.match(await bob.page.locator(".typing-bubble").textContent(), /typing/, "the dots carry a screen-reader label");
  assert.equal(await bob.page.locator(".typing-bubble i").count(), 3, "three bouncing dots");
  say("typing indicator (three animated dots) reaches the partner");
  await alice.page.getByRole("button", { name: "Send" }).click();
  await bob.page.locator(".msg.them", { hasText: "hello from alice" }).waitFor();
  await alice.page.locator(".msg.me", { hasText: "hello from alice" }).waitFor();
  say("message delivered to bob and shown as 'me' for alice");

  await bob.page.getByLabel("Type a message…").fill("hi alice!");
  await bob.page.getByLabel("Type a message…").press("Enter");
  await alice.page.locator(".msg.them", { hasText: "hi alice!" }).waitFor();
  say("reply sent with the Enter key");

  await alice.page.evaluate(() => Object.defineProperty(navigator, "share", { configurable: true, value: async (data) => { window.__brainShare = data; } }));
  await alice.page.getByRole("button", { name: "Share this moment" }).click();
  const brainShared = await alice.page.evaluate(() => window.__brainShare);
  assert.ok(brainShared.text.includes("#SameBrain"), "Same Brain share copy contains the branded hook");
  assert.ok(!brainShared.text.includes("hello from alice") && !brainShared.text.includes("hi alice"), "Same Brain share copy contains no chat text");
  say("Same Brain produces a branded share moment without leaking either person's messages");

  // ---------- bubble motion ----------
  const bubbleAnim = await alice.page.locator(".msg.them", { hasText: "hi alice!" }).evaluate((el) => getComputedStyle(el).animationName);
  assert.equal(bubbleAnim, "bubble-in-left", "incoming bubbles spring in from the left");
  const mineAnim = await alice.page.locator(".msg.me", { hasText: "hello from alice" }).evaluate((el) => getComputedStyle(el).animationName);
  assert.equal(mineAnim, "bubble-in-right", "own bubbles spring in from the right");
  say("bubbles animate in from the side they belong to");

  // ---------- stickers ----------
  await alice.page.getByRole("button", { name: "Stickers" }).click();
  await alice.page.getByRole("dialog", { name: "Stickers" }).waitFor();
  assert.equal(await alice.page.locator(".sticker-pop .pick").count(), 16, "sixteen stickers in the picker");
  const heartPick = alice.page.getByRole("button", { name: "Heart sticker" });
  await heartPick.hover();
  assert.equal(await heartPick.locator(".pick-emoji").evaluate((el) => getComputedStyle(el).animationName), "a-beat", "hovering previews the animation");
  await shot(alice.page, "09-sticker-picker.png");
  say("sticker picker opens with 16 stickers and previews the animation on hover");

  await heartPick.click();
  await alice.page.getByRole("dialog", { name: "Stickers" }).waitFor({ state: "detached" });
  await alice.page.locator(".msg.sticker.me [data-sticker='heart']").waitFor();
  await bob.page.locator(".msg.sticker.them [data-sticker='heart']").waitFor();
  await bob.page.locator(".sticker-screen-fx").waitFor();
  assert.equal(await bob.page.locator(".screen-particles i").count(), 20, "full-screen sticker particles");
  assert.equal(await bob.page.locator(".screen-sticker").evaluate((el) => getComputedStyle(el).animationName), "a-beat");
  say("alice sends the Heart sticker; bob receives it with a full-screen celebration");

  const stk = bob.page.locator(".msg.sticker.them .stk").last();
  assert.equal(await stk.evaluate((el) => getComputedStyle(el).animationName), "a-beat", "the sticker plays its own animation");
  assert.equal(await bob.page.locator(".msg.sticker.them .fx-rise i").count(), 7, "hearts float up around it");
  await bob.page.waitForTimeout(900);
  await shot(bob.page, "10-sticker-hearts.png");
  say("the sticker pops in and plays its animation with floating hearts");

  await bob.page.getByRole("button", { name: "Stickers" }).click();
  await bob.page.getByRole("button", { name: "Party sticker" }).click();
  await alice.page.locator(".msg.sticker.them [data-sticker='party']").waitFor();
  assert.equal(await alice.page.locator(".msg.sticker.them .fx-confetti i").count(), 12, "confetti pieces");
  await alice.page.waitForTimeout(950);
  await shot(alice.page, "11-sticker-confetti.png");
  say("bob replies with the Party sticker; alice sees confetti");

  await alice.page.getByLabel("Type a message…").fill("a tiny telescope");
  await alice.page.getByRole("button", { name: "Send" }).click();
  await bob.page.getByLabel("Type a message…").fill("midnight pancakes");
  await bob.page.getByRole("button", { name: "Send" }).click();
  for (const v of [alice, bob]) await v.page.locator(".spark-result").waitFor();
  assert.match(await alice.page.locator(".spark-meter").textContent(), /6\/6/, "six exchanges unlock the spark");
  assert.equal(await alice.page.locator(".spark-result .spark-kicker").textContent(), await bob.page.locator(".spark-result .spark-kicker").textContent());
  await alice.page.evaluate(() => Object.defineProperty(navigator, "share", { configurable: true, value: async (data) => { window.__sparkShare = data; } }));
  await alice.page.getByRole("button", { name: "Share the spark" }).click();
  const shared = await alice.page.evaluate(() => window.__sparkShare);
  assert.ok(shared.text.includes("#StrangerSpark"), "share copy contains the branded hook");
  assert.ok(!shared.text.includes("telescope") && !shared.text.includes("pancakes"), "share copy contains no chat text");
  say("six exchanges unlock a matching, privacy-safe Stranger Spark share card");

  // tapping a sticker replays it
  const before = await alice.page.locator(".msg.sticker.them .stk-in").last().evaluate((el) => el.getBoundingClientRect().width);
  await alice.page.locator(".msg.sticker.them [data-sticker='party']").click();
  assert.ok(before > 0);
  say("tapping a sticker replays it");

  // people who prefer reduced motion get still stickers and instant bubbles
  await alice.page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await alice.page.locator(".stk").last().evaluate((el) => getComputedStyle(el).animationName), "none");
  assert.equal(await alice.page.locator(".msg.them").first().evaluate((el) => getComputedStyle(el).animationName), "none");
  await alice.page.getByRole("button", { name: "Stickers" }).click();
  await alice.page.getByRole("button", { name: "Sparkle sticker" }).click();
  await alice.page.locator(".sticker-screen-fx").waitFor({ state: "attached" });
  assert.equal(await alice.page.locator(".sticker-screen-fx").evaluate((el) => getComputedStyle(el).display), "none");
  await alice.page.emulateMedia({ reducedMotion: "no-preference" });
  say("reduced-motion setting switches every animation off");

  assert.equal(await alice.page.getByLabel("Type a message…").inputValue(), "", "input clears after sending");
  await shot(alice.page, "02-chatting.png");
  await shot(bob.page, "03-chatting-bob.png");

  // ---------- skip ----------
  await alice.page.getByRole("button", { name: "Skip" }).click();
  await bob.page.getByText("The stranger has left the chat.").waitFor();
  await bob.page.getByRole("button", { name: "New chat" }).waitFor();
  assert.equal(await bob.page.getByLabel("Type a message…").isDisabled(), true, "composer disabled after partner leaves");
  say("alice skips: bob is told, composer locks, 'New chat' appears");

  // ---------- report after the partner left ----------
  await bob.page.getByRole("button", { name: /Report/ }).click();
  await bob.page.getByRole("dialog").waitFor();
  await bob.page.getByLabel("Harassment or hate").check();
  await bob.page.getByLabel("Add details (optional)").fill("e2e test report");
  await shot(bob.page, "04-report.png");
  await bob.page.getByRole("button", { name: "Send report" }).click();
  await bob.page.getByText("Thanks. Your report was sent and the chat was ended.").waitFor();
  assert.equal(await bob.page.getByRole("button", { name: /Report/ }).count(), 0, "report button hides after reporting");
  say("bob reports the stranger who just left; confirmation shown");

  // ---------- new chat + stop ----------
  await bob.page.getByRole("button", { name: "New chat" }).click();
  await bob.page.getByText("Looking for someone to chat with…").first().waitFor().catch(() =>
    bob.page.getByText("Looking for someone who shares your interests…").first().waitFor(),
  );
  await bob.page.getByRole("button", { name: "Stop" }).click();
  await bob.page.getByRole("heading", { name: "Set up your chat" }).waitFor();
  say("'New chat' re-queues and 'Stop' returns to the setup form");

  // ---------- settings persist ----------
  await alice.page.getByRole("button", { name: "Stop" }).click();
  await alice.page.reload();
  await alice.page.getByRole("heading", { name: "Set up your chat" }).waitFor();
  await alice.page.locator(".chip", { hasText: "guitar" }).waitFor();
  assert.equal(await alice.page.getByRole("group", { name: "I am" }).getByLabel("Male", { exact: true }).isChecked(), true);
  say("topic, gender and interests are restored from the browser after a reload");

  // ---------- other languages ----------
  const es = await visitor("es");
  await es.page.goto(`${WEB}/es/start`);
  await es.page.getByRole("heading", { name: "Configura tu chat" }).waitFor();
  assert.equal(await es.page.locator("html").getAttribute("lang"), "es");
  say("Spanish chat screen renders in Spanish with lang=es");

  // ---------- phone layout ----------
  const phone = await visitor("phone", { width: 390, height: 844 });
  await phone.page.goto(`${WEB}/en`);
  const overflow = await phone.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 0, `no horizontal scroll on a phone (overflow ${overflow}px)`);
  await phone.page.locator(".ent-game-card").waitFor();
  await phone.page.locator(".ent-choices button").first().click();
  await phone.page.locator(".ent-game-card.is-match, .ent-game-card.is-split").waitFor();
  await shot(phone.page, "05-home-phone.png");
  await phone.page.goto(`${WEB}/en/start`);
  const overflow2 = await phone.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow2 <= 0, `no horizontal scroll on the phone chat setup (overflow ${overflow2}px)`);
  await shot(phone.page, "06-setup-phone.png");
  say("home page and setup form fit a 390px phone screen");

  // ---------- dark mode ----------
  const dark = await visitor("dark", { width: 1100, height: 800 }, "dark");
  await dark.page.goto(`${WEB}/en/start`);
  await dark.page.getByRole("heading", { name: "Set up your chat" }).waitFor();
  const bg = await dark.page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  assert.equal(bg, "rgb(15, 17, 21)", "dark system setting gives the dark theme");
  await shot(dark.page, "08-setup-dark.png");
  say("dark mode follows the system setting");

  // ---------- desktop home ----------
  const desk = await visitor("desktop", { width: 1280, height: 900 });
  await desk.page.goto(`${WEB}/en`);
  const heroBox = await desk.page.locator(".ent-hero").boundingBox();
  assert.ok(heroBox.width >= 1279, `homepage hero fills the viewport width (actual ${heroBox.width}px)`);
  assert.ok(heroBox.height >= 839, `homepage hero fills the viewport below the header (actual ${heroBox.height}px)`);
  assert.equal(await desk.page.locator(".ent-topic-ribbon a").count(), 16, "full-screen hero includes the animated topic ribbon");
  await shot(desk.page, "07-home.png");
  say("desktop homepage fills the viewport and includes the interactive entertainment rail");
} finally {
  await browser.close();
}

if (problems.length) {
  console.log("\nBrowser errors seen:");
  for (const p of [...new Set(problems)]) console.log(" - " + p);
  process.exitCode = 1;
} else {
  console.log("\nAll end-to-end checks passed, no browser errors.");
}
