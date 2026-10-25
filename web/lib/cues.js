// Song analysis for the auto light show. Pure and self-contained (no imports, no outer references) so it can run
// inside a Web Worker built from its source text, and in Node tests.
//   x: mono Float32Array, sr: sample rate (any; ~11 kHz is plenty).
// Returns null for silence/very short audio, otherwise a compact cue sheet:
//   { bpm, bar: first downbeat (s, mod bar length), dur, conf, energy: 2 Hz ints 0-100,
//     sections: [{t, k: intro|groove|build|drop|break|outro, e}], drops: [t] }
export function analyzeCues(x, sr) {
  const N = x.length, dur = N / sr;
  if (dur < 20) return null;
  const hopSec = 0.0116, hop = Math.max(1, Math.round(sr * hopSec)), F = Math.floor(N / hop), hs = hop / sr;
  const aL = 1 - Math.exp(-2 * Math.PI * 150 / sr), aH = 1 - Math.exp(-2 * Math.PI * 2500 / sr);
  const low = new Float32Array(F), full = new Float32Array(F);
  let lp = 0, lp2 = 0, peak = 0;
  for (let f = 0, i = 0; f < F; f++) {
    let l = 0, a = 0;
    for (let j = 0; j < hop; j++, i++) { const v = x[i]; lp += aL * (v - lp); lp2 += aH * (v - lp2); l += lp * lp; a += v * v; }
    low[f] = l / hop; full[f] = a / hop; if (full[f] > peak) peak = full[f];
  }
  if (peak < 1e-7) return null;
  // onset strength: rises in bass (kicks) and overall level, minus a local average
  const on = new Float32Array(F), eps = peak * 1e-6;
  for (let f = 1; f < F; f++) on[f] = Math.max(0, Math.log(low[f] + eps) - Math.log(low[f - 1] + eps)) * .7 + Math.max(0, Math.log(full[f] + eps) - Math.log(full[f - 1] + eps)) * .3;
  const W = 16, onN = new Float32Array(F); let run = 0;
  for (let f = 0; f < F; f++) { run += on[f] - (f >= W ? on[f - W] : 0); onN[f] = Math.max(0, on[f] - run / Math.min(f + 1, W)); }
  // tempo: autocorrelation with harmonic support and a prior around club tempos
  const lagOf = (bpm) => 60 / bpm / hs, lo = Math.floor(lagOf(185)), hi = Math.ceil(lagOf(70));
  const sc = new Float32Array(hi + 2);
  for (let L = lo; L <= hi + 1; L++) {
    let s = 0; for (let f = 0; f + 2 * L < F; f++) s += onN[f] * (onN[f + L] + .5 * onN[f + 2 * L]);
    const bpm = 60 / (L * hs), w = Math.exp(-.5 * Math.pow(Math.log2(bpm / 122) / .7, 2));
    sc[L] = s * w;
  }
  let best = lo; for (let L = lo; L <= hi; L++) if (sc[L] > sc[best]) best = L;
  let mean = 0; for (let L = lo; L <= hi; L++) mean += sc[L]; mean /= (hi - lo + 1);
  const a0 = sc[best - 1] || 0, a1 = sc[best], a2 = sc[best + 1] || 0, den = a0 - 2 * a1 + a2;
  const Lf = best + (den ? .5 * (a0 - a2) / den : 0);
  let bpm = 60 / (Lf * hs);
  while (bpm < 85) bpm *= 2; while (bpm > 175) bpm /= 2;
  const conf = mean > 0 ? a1 / mean : 0;
  const P = 60 / bpm / hs;
  // beat phase: the comb of beat positions that lands on the most onset energy
  let phase = 0, ph = -1;
  for (let p = 0; p < P; p += .5) { let s = 0; for (let k = 0; p + k * P < F; k++) s += onN[Math.round(p + k * P)] || 0; if (s > ph) { ph = s; phase = p; } }
  // downbeat: of the 4 beat slots, the one with the most bass becomes beat 1 of the bar
  const slot = [0, 0, 0, 0];
  for (let k = 0; phase + k * P < F; k++) { const f = Math.round(phase + k * P); slot[k % 4] += low[f] || 0; }
  let d = 0; for (let j = 1; j < 4; j++) if (slot[j] > slot[d]) d = j;
  const beatSec = 60 / bpm, barSec = beatSec * 4, bar = ((phase + d * P) * hs) % barSec;
  // energy curve at 2 Hz, normalised to the loud parts of this song
  const perHalf = Math.max(1, Math.round(.5 / hs)), E = [];
  for (let f = 0; f < F; f += perHalf) { let s = 0, n = 0; for (let j = f; j < Math.min(F, f + perHalf); j++) { s += full[j]; n++; } E.push(Math.sqrt(s / n)); }
  const pct = (arr, q) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))] || 1e-9; };
  const e95 = pct(E, .95), energy = E.map(v => Math.round(Math.min(1, v / e95) * 100));
  // bar features: loudness and how much of it is bass (a kick drum)
  const nb = Math.floor((dur - bar) / barSec), eb = [], kb = [];
  for (let b = 0; b < nb; b++) {
    const f0 = Math.floor((bar + b * barSec) / hs), f1 = Math.min(F, Math.floor((bar + (b + 1) * barSec) / hs));
    let s = 0, l = 0; for (let f = f0; f < f1; f++) { s += full[f]; l += low[f]; }
    eb.push(Math.sqrt(s / Math.max(1, f1 - f0))); kb.push(s > 0 ? l / s : 0);
  }
  if (nb < 8) return { bpm: Math.round(bpm * 10) / 10, bar, dur, conf, energy, sections: [], drops: [] };
  const e90 = pct(eb, .9), en = eb.map(v => Math.min(1.2, v / e90)), kMed = pct(kb, .5);
  const kind = new Array(nb).fill("groove"), drops = [];
  let last = -99;
  for (let b = 4; b < nb; b++) {
    const prev = (en[b - 1] + en[b - 2] + en[b - 3] + en[b - 4]) / 4;
    if (en[b] - prev > .2 && en[b] > .72 && kb[b] > kMed * .8 && b - last >= 16) { drops.push(b); last = b; }
  }
  for (let b = 0; b < nb; b++) if (en[b] < .55 && kb[b] < kMed * .6) kind[b] = "break";
  for (const b of drops) {
    for (let j = b; j < Math.min(nb, b + 16) && kind[j] !== "break"; j++) kind[j] = "drop";
    for (let j = Math.max(0, b - 8); j < b; j++) if (kind[j] !== "drop") kind[j] = "build";
  }
  for (let b = 0; b < nb && kind[b] !== "drop" && kind[b] !== "build" && kb[b] < kMed * .6; b++) kind[b] = "intro";
  for (let b = nb - 1; b > nb - 9 && b >= 0 && kind[b] !== "drop" && en[b] < .6; b--) kind[b] = "outro";
  const sections = [];
  for (let b = 0; b < nb; b++) {
    const t = Math.round((bar + b * barSec) * 100) / 100, cur = sections[sections.length - 1];
    if (!cur || cur.k !== kind[b]) sections.push({ t, k: kind[b], e: Math.round(Math.min(1, en[b]) * 100), n: 1 });
    else { cur.e = Math.round((cur.e * cur.n + Math.min(1, en[b]) * 100) / (cur.n + 1)); cur.n++; }
  }
  return {
    bpm: Math.round(bpm * 10) / 10, bar: Math.round(bar * 1000) / 1000, dur: Math.round(dur * 10) / 10, conf: Math.round(conf * 100) / 100, energy,
    sections: sections.map(({ t, k, e }) => ({ t, k, e })), drops: drops.map(b => Math.round((bar + b * barSec) * 100) / 100)
  };
}
