import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
const fm=readFileSync(new URL("../components/underground/UndergroundFM.jsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/underground/stage.css",import.meta.url),"utf8");
const fx=readFileSync(new URL("../components/underground/fx.js",import.meta.url),"utf8");
test("Lightshow retains independent CSS backup and local recovery",()=>{
  assert.match(fm,/fx-ambient-rig/);
  assert.match(css,/\.fx-ambient-rig\{position:fixed;inset:0;z-index:2;/);
  assert.match(css,/\.fx-shell\[data-rig=fallback\] \.fx-ambient-rig\{opacity:\.9\}/);
  assert.match(css,/\.fx-shell\[data-lights=off\] \.fx-ambient-rig\{display:none\}/);
  assert.match(fm,/RESTART LIGHTS/);
  assert.match(fm,/setLightsOff\(false\);setMotionPref\(false\);setRigFailed\(false\)/);
});
test("Light beams render above the scrim and behind interactive controls",()=>{
  assert.match(css,/\.fx-stage\{[^}]*z-index:2;/);
  assert.match(css,/\.fx-main\{position:relative;z-index:3;/);
  assert.match(css,/\.fx-side\{position:sticky;[^}]*z-index:3;/);
  assert.match(fm,/lastRigFrame\.current/);
  assert.match(fm,/const watchdog=setInterval\(\(\)=>/);
  assert.match(fx,/onFrame = null/);
  assert.match(fx,/onFrame\?\.\(\)/);
});
