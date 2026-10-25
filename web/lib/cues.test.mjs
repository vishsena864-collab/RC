import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeCues } from "./cues.js";

// A synthetic 128 BPM club track with a known shape:
// 0-30 s intro (hats only), 30-75 groove (kick+bass+hats), 75-90 break (pad, no kick),
// 90-105 build (rising snare roll, no kick), 105-150 DROP (loud kick+bass+hats), 150-180 outro (quiet hats).
function track(sr = 11025, bpm = 128, dur = 180) {
  const x = new Float32Array(Math.round(sr * dur)), beat = 60 / bpm;
  let seed = 7; const noise = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * 2 - 1; };
  for (let i = 0; i < x.length; i++) {
    const t = i / sr, bt = t % beat, eighth = t % (beat / 2);
    const kick = (on, g) => on ? g * Math.sin(2 * Math.PI * (50 + 90 * Math.exp(-bt * 30)) * bt) * Math.exp(-bt * 9) : 0;
    const hat = (g) => g * noise() * Math.exp(-eighth * 60);
    const bass = (g) => g * Math.sin(2 * Math.PI * 55 * t) * (bt > beat * .45 ? 1 : .2);
    let v = 0;
    if (t < 30) v = hat(.15);
    else if (t < 75) v = kick(true, .6) + bass(.25) + hat(.15);
    else if (t < 90) v = .12 * Math.sin(2 * Math.PI * 220 * t) + .08 * Math.sin(2 * Math.PI * 330 * t);
    else if (t < 105) { const k = (t - 90) / 15, sn = t % (beat / (k < .5 ? 2 : 4)); v = (.08 + .3 * k) * noise() * Math.exp(-sn * 40) + .1 * Math.sin(2 * Math.PI * 220 * t); }
    else if (t < 150) v = kick(true, .95) + bass(.4) + hat(.2);
    else v = hat(.08);
    x[i] = v;
  }
  return x;
}

test("finds tempo, the drop and the song's sections", () => {
  const cues = analyzeCues(track(), 11025);
  assert.ok(cues, "analysis returned a cue sheet");
  assert.ok(Math.abs(cues.bpm - 128) < 1.5, "bpm " + cues.bpm);
  assert.equal(cues.drops.length, 1, "one drop: " + JSON.stringify(cues.drops));
  assert.ok(Math.abs(cues.drops[0] - 105) < 2.5, "drop lands on 1:45, got " + cues.drops[0]);
  const at = (t) => [...cues.sections].reverse().find((s) => s.t <= t)?.k;
  assert.equal(at(15), "intro");
  assert.equal(at(50), "groove");
  assert.equal(at(82), "break");
  assert.equal(at(100), "build");
  assert.equal(at(120), "drop");
  assert.ok(Math.abs(cues.energy.length - 360) <= 2, "2 Hz energy curve, got " + cues.energy.length);
  assert.ok(JSON.stringify(cues).length < 8000, "cue sheet stays small");
});

test("silence and very short clips give no cue sheet", () => {
  assert.equal(analyzeCues(new Float32Array(11025 * 60), 11025), null);
  assert.equal(analyzeCues(new Float32Array(11025 * 5).fill(.3), 11025), null);
});

test("the analyser is self-contained, so it can run from its source text in a Worker", () => {
  const rebuilt = new Function("return (" + analyzeCues.toString() + ")")();
  const cues = rebuilt(track(11025, 124, 60), 11025);
  assert.ok(Math.abs(cues.bpm - 124) < 1.5, "bpm " + cues.bpm);
});
