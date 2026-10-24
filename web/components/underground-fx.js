// Underground FM visual engine. Plain Canvas 2D, no dependencies, no network, no media.
//   createStage   full-screen concert rig: moving-head beams, haze, backlit crowd, strobes, lightning, blackout
//   createOverlay full-screen pyro / cryo-smoke / neon-vibe bursts fired when anybody in the room votes
//   createOrb     plasma-ring orbs (fire / vibe / chill core) for the vote buttons and the room reactor ring
// Everything renders at reduced resolution (soft light does not need pixels), pauses with the tab, and
// draws a single still frame when reduced motion is requested.
const TAU = Math.PI * 2;
const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;
const rgb = (h) => { const s = String(h).replace("#", ""); return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; };
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export const qualityFor = () => {
  if (typeof window === "undefined") return 1;
  const small = window.innerWidth < 760, weak = (navigator.hardwareConcurrency || 8) <= 4;
  return small || weak ? 0.55 : 1;
};

const sprites = new Map();
const sprite = (key, stops, size = 128) => {
  let c = sprites.get(key);
  if (c) return c;
  c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d"), r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([p, col]) => r.addColorStop(p, col));
  g.fillStyle = r; g.fillRect(0, 0, size, size);
  sprites.set(key, c); return c;
};
const FIRE = [
  () => sprite("f0", [[0, "rgba(255,252,225,1)"], [.22, "rgba(255,226,130,.85)"], [.6, "rgba(255,150,40,.24)"], [1, "rgba(255,90,0,0)"]]),
  () => sprite("f1", [[0, "rgba(255,214,96,.9)"], [.4, "rgba(255,146,36,.52)"], [1, "rgba(255,74,0,0)"]]),
  () => sprite("f2", [[0, "rgba(255,120,24,.8)"], [.45, "rgba(232,62,12,.42)"], [1, "rgba(150,20,0,0)"]]),
  () => sprite("f3", [[0, "rgba(204,34,12,.5)"], [.5, "rgba(120,16,6,.26)"], [1, "rgba(60,6,0,0)"]])
];
const SOOT = () => sprite("soot", [[0, "rgba(70,48,42,.5)"], [.6, "rgba(40,28,26,.18)"], [1, "rgba(20,14,14,0)"]]);
const MIST = () => sprite("mist", [[0, "rgba(214,240,255,.72)"], [.4, "rgba(150,205,255,.34)"], [1, "rgba(100,160,255,0)"]]);
const COLD = () => sprite("cold", [[0, "rgba(120,220,255,.7)"], [.5, "rgba(60,140,255,.25)"], [1, "rgba(40,90,255,0)"]]);
const BOKEH = (c) => sprite("bk" + c, [[0, `rgba(${c},.0)`], [.7, `rgba(${c},.18)`], [.9, `rgba(${c},.5)`], [1, `rgba(${c},0)`]], 64);

const makeLoop = (step) => {
  let raf = 0, run = false, last = 0;
  const tick = (ts) => {
    if (!run) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
    const keep = step(dt, ts / 1000);
    raf = keep ? requestAnimationFrame(tick) : 0;
    if (!keep) run = false;
  };
  return {
    start() { if (run || (typeof document !== "undefined" && document.hidden)) return; run = true; last = performance.now(); raf = requestAnimationFrame(tick); },
    stop() { run = false; cancelAnimationFrame(raf); raf = 0; },
    get running() { return run; }
  };
};

/* ───────────────────────── particle layers ───────────────────────── */
class Fire {
  constructor(env, { jets = [.12, .25, .38, .5, .62, .75, .88], ember = true } = {}) {
    Object.assign(this, { env, jets, ember, p: [], soot: [], em: [], act: [], level: 0, amb: 0, flash: 0, acc: 0, eacc: 0 });
  }
  burst(power = 1, x) {
    const { W } = this.env, n = x == null ? clamp(Math.round(5 + power * 3), 5, 9) : 2;
    for (let i = 0; i < n; i++) {
      const jx = x == null ? (i + .5) / n * W + rnd(-.03, .03) * W : x + (i ? rnd(-1, 1) * W * .05 : 0);
      this.act.push({ x: jx, delay: rnd(0, x == null ? .5 : .12), dur: rnd(.8, 1.35), pow: power * rnd(.8, 1.1), age: 0 });
    }
    this.level = Math.max(this.level, clamp(.5 + power * .35, 0, 1)); this.flash = Math.max(this.flash, .9 * power);
  }
  spawn(x, pow, amb) {
    const { H, u } = this.env;
    this.p.push({ x: x + rnd(-.5, .5) * u * .5, y: H + u * .15, vx: rnd(-.3, .3) * u, vy: -H * pow * rnd(.9, 1.6) * (amb ? .34 : 1), life: amb ? rnd(.5, .95) : rnd(.55, 1.05), age: 0, s: u * rnd(.8, 1.5) * (.55 + .6 * pow), seed: rnd(0, TAU) });
  }
  update(dt, t) {
    const { env } = this, { H, u, q } = env;
    this.level = Math.max(this.amb, this.level * Math.exp(-dt / 2.6)); this.flash *= Math.exp(-dt / .22);
    const cannons = [];
    for (const a of this.act) { a.age += dt; if (a.age > a.delay && a.age < a.delay + a.dur) cannons.push(a); }
    this.act = this.act.filter(a => a.age < a.delay + a.dur);
    const rate = (n) => { this.acc += n * dt; const k = Math.floor(this.acc); this.acc -= k; return k; };
    for (const c of cannons) { const k = rate(150 * q * c.pow); for (let i = 0; i < k; i++) this.spawn(c.x, c.pow, false); }
    if (this.level > .03) for (const jx of this.jets) { const k = rate(34 * q * this.level); for (let i = 0; i < k; i++) this.spawn(jx * env.W, this.level * .62, true); }
    if (this.ember && (cannons.length || this.level > .35)) {
      this.eacc += dt * (cannons.length ? 70 : 12) * q; const k = Math.floor(this.eacc); this.eacc -= k;
      for (let i = 0; i < k && this.em.length < 160 * q + 30; i++) {
        const c = cannons.length ? cannons[(Math.random() * cannons.length) | 0].x : this.jets[(Math.random() * this.jets.length) | 0] * env.W;
        this.em.push({ x: c + rnd(-1, 1) * u, y: H - rnd(0, .25) * H, vx: rnd(-.8, .8) * u, vy: -H * rnd(.25, .85), age: 0, life: rnd(1.1, 2.6), r: rnd(.05, .12) * u, seed: rnd(0, TAU) });
      }
    }
    for (const p of this.p) {
      p.age += dt;
      p.x += (p.vx + Math.sin(p.seed + p.y / H * 9 + t * 7) * u * .9) * dt; p.y += p.vy * dt; p.vy *= Math.pow(.35, dt);
      if (p.age >= p.life && this.soot.length < 70 * q && Math.random() < .12) this.soot.push({ x: p.x, y: p.y, vx: p.vx * .3, vy: -u * rnd(.6, 1.4), age: 0, life: rnd(1.4, 2.4), s: p.s * 1.1 });
    }
    this.p = this.p.filter(p => p.age < p.life);
    for (const s of this.soot) { s.age += dt; s.x += (s.vx + Math.sin(s.age * 3 + s.y * .02) * u * .3) * dt; s.y += s.vy * dt; }
    this.soot = this.soot.filter(s => s.age < s.life);
    for (const e of this.em) { e.age += dt; e.x += (e.vx + Math.sin(e.seed + e.age * 5) * u * .6) * dt; e.y += e.vy * dt; e.vy *= Math.pow(.62, dt); }
    this.em = this.em.filter(e => e.age < e.life);
  }
  draw(g) {
    const { W, H } = this.env;
    g.globalCompositeOperation = "source-over";
    for (const s of this.soot) { const k = s.age / s.life; g.globalAlpha = Math.sin(k * Math.PI) * .32; const d = s.s * (1 + k * 1.8); g.drawImage(SOOT(), s.x - d / 2, s.y - d / 2, d, d); }
    g.globalCompositeOperation = "lighter";
    if (this.level > .02 || this.flash > .02) {
      const gl = g.createRadialGradient(W / 2, H * 1.02, 0, W / 2, H * 1.02, H * .95);
      gl.addColorStop(0, `rgba(255,120,30,${clamp(this.level * .5 + this.flash * .25, 0, .75)})`); gl.addColorStop(.5, `rgba(255,70,10,${this.level * .16})`); gl.addColorStop(1, "rgba(255,40,0,0)");
      g.globalAlpha = 1; g.fillStyle = gl; g.fillRect(0, 0, W, H);
    }
    for (const p of this.p) {
      const k = p.age / p.life, i = Math.min(3, Math.floor(k * 4)), d = p.s * (1.15 - k * .65);
      g.globalAlpha = clamp(k < .1 ? k / .1 : 1, 0, 1) * Math.pow(1 - k, .8) * .9;
      g.drawImage(FIRE[i](), p.x - d / 2, p.y - d / 2, d, d);
    }
    for (const e of this.em) {
      const k = e.age / e.life; g.globalAlpha = (1 - k) * (.55 + .45 * Math.sin(e.age * 30 + e.seed));
      const d = e.r * (1 - k * .5) * 3.2; g.drawImage(FIRE[0](), e.x - d / 2, e.y - d / 2, d, d);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  }
  get busy() { return this.level > .02 || this.p.length || this.em.length || this.soot.length || this.act.length || this.flash > .02; }
}

class Mist {
  constructor(env, { banks = true } = {}) { Object.assign(this, { env, banks, p: [], gl: [], act: [], level: 0, amb: 0, acc: 0, gacc: 0, wash: 0 }); }
  burst(power = 1, x) {
    const { W } = this.env, n = x == null ? clamp(Math.round(3 + power * 3), 3, 6) : 2;
    for (let i = 0; i < n; i++) this.act.push({ x: x == null ? (i + .5) / n * W + rnd(-.04, .04) * W : x + (i ? rnd(-1, 1) * W * .08 : 0), delay: rnd(0, x == null ? .55 : .15), dur: rnd(.7, 1.2), pow: power * rnd(.8, 1.1), age: 0 });
    this.level = Math.max(this.level, clamp(.55 + power * .3, 0, 1)); this.wash = Math.max(this.wash, .9);
  }
  update(dt) {
    const { W, H, u, q } = this.env;
    this.level = Math.max(this.amb, this.level * Math.exp(-dt / 4.2)); this.wash *= Math.exp(-dt / 1.1);
    const cannons = []; for (const a of this.act) { a.age += dt; if (a.age > a.delay && a.age < a.delay + a.dur) cannons.push(a); }
    this.act = this.act.filter(a => a.age < a.delay + a.dur);
    const rate = (n) => { this.acc += n * dt; const k = Math.floor(this.acc); this.acc -= k; return k; };
    for (const c of cannons) { const k = rate(84 * q * c.pow); for (let i = 0; i < k; i++) this.p.push({ jet: true, x: c.x + rnd(-.3, .3) * u, y: H + u * .2, vx: rnd(-.5, .5) * u, vy: -H * rnd(.75, 1.35) * c.pow, age: 0, life: rnd(2.2, 3.6), s0: u * rnd(1.1, 2.1), a: rnd(.17, .3), seed: rnd(0, TAU) }); }
    if (this.banks && this.level > .03) { const k = rate(this.level * (W / u) * 1.9 * q); for (let i = 0; i < k && this.p.length < 130 * q + 20; i++) this.p.push({ jet: false, x: rnd(-.1, 1.1) * W, y: H * rnd(.6, 1.03), vx: rnd(-1, 1) * u * .3, vy: rnd(-.2, .05) * u, age: 0, life: rnd(5, 9), s0: u * rnd(2.6, 5.2), a: rnd(.06, .12), seed: rnd(0, TAU) }); }
    if (this.level > .25) { this.gacc += dt * 9 * this.level * q; const k = Math.floor(this.gacc); this.gacc -= k; for (let i = 0; i < k && this.gl.length < 40; i++) this.gl.push({ x: rnd(0, W), y: rnd(.3, .98) * H, age: 0, life: rnd(.7, 1.6), s: rnd(.12, .3) * u }); }
    for (const p of this.p) {
      p.age += dt; p.x += (p.vx + Math.sin(p.seed + p.age * (p.jet ? 1.4 : .5)) * u * (p.jet ? .55 : .25)) * dt; p.y += p.vy * dt;
      if (p.jet) { p.vy *= Math.pow(.14, dt); p.vx *= Math.pow(.5, dt); p.vy -= u * .12 * dt; }
    }
    this.p = this.p.filter(p => p.age < p.life);
    for (const s of this.gl) s.age += dt; this.gl = this.gl.filter(s => s.age < s.life);
  }
  draw(g) {
    const { W, H } = this.env;
    g.globalCompositeOperation = "lighter";
    if (this.level > .02 || this.wash > .02) {
      const gl = g.createRadialGradient(W / 2, H * 1.05, 0, W / 2, H * 1.05, H * .9);
      gl.addColorStop(0, `rgba(90,200,255,${clamp(this.level * .36 + this.wash * .24, 0, .6)})`); gl.addColorStop(1, "rgba(40,100,255,0)");
      g.globalAlpha = 1; g.fillStyle = gl; g.fillRect(0, 0, W, H);
    }
    g.globalCompositeOperation = "source-over";
    for (const p of this.p) {
      const k = p.age / p.life, d = p.s0 * (p.jet ? 1 + k * 1.8 : 1 + k * .35);
      const env = (p.jet ? (k < .1 ? k / .1 : Math.pow(1 - k, 1.1)) : Math.sin(k * Math.PI)) * p.a * (p.jet ? 1 : .35 + this.level * .9);
      g.globalAlpha = clamp(env, 0, .5); g.drawImage(MIST(), p.x - d / 2, p.y - d / 2, d, d);
      if (p.jet && k < .7) { g.globalCompositeOperation = "lighter"; g.globalAlpha = clamp(env * .35, 0, .3); g.drawImage(COLD(), p.x - d * .6, p.y - d * .6, d * 1.2, d * 1.2); g.globalCompositeOperation = "source-over"; }
    }
    g.globalCompositeOperation = "lighter"; g.strokeStyle = "#dff6ff";
    for (const s of this.gl) {
      const k = s.age / s.life, a = Math.sin(k * Math.PI), r = s.s * (.5 + a * .5);
      g.globalAlpha = a * .9; g.lineWidth = 1;
      g.beginPath(); g.moveTo(s.x - r, s.y); g.lineTo(s.x + r, s.y); g.moveTo(s.x, s.y - r); g.lineTo(s.x, s.y + r); g.stroke();
      g.globalAlpha = a * .5; g.drawImage(COLD(), s.x - r, s.y - r, r * 2, r * 2);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  }
  get busy() { return this.level > .02 || this.p.length || this.gl.length || this.act.length || this.wash > .02; }
}

const NEON = ["255,64,200", "170,92,255", "70,220,255", "255,255,255"];
class Vibe {
  constructor(env, { origin = [.5, 1] } = {}) { Object.assign(this, { env, origin, rings: [], conf: [], bk: [], act: [], level: 0, amb: 0, acc: 0, bacc: 0, sweep: 0, ph: 0 }); }
  burst(power = 1, x) {
    const { W, H } = this.env, ox = x == null ? this.origin[0] * W : x;
    for (let i = 0; i < 4; i++) this.rings.push({ x: ox, y: this.origin[1] * H, age: -i * .16, life: 1.5 + power * .5, c: NEON[i % 3], max: Math.max(W, H) * (.55 + power * .3) });
    this.act.push({ age: 0, dur: 1.4, pow: power });
    this.level = Math.max(this.level, clamp(.55 + power * .35, 0, 1)); this.sweep = 1;
  }
  update(dt) {
    const { W, H, u, q } = this.env;
    this.ph += dt; this.level = Math.max(this.amb, this.level * Math.exp(-dt / 2.8)); this.sweep *= Math.exp(-dt / 1.3);
    const pour = this.act.reduce((n, a) => n + (a.age < a.dur ? a.pow : 0), 0);
    for (const a of this.act) a.age += dt; this.act = this.act.filter(a => a.age < a.dur + .1);
    this.acc += dt * (pour * 90 + this.level * 8) * q; const k = Math.floor(this.acc); this.acc -= k;
    for (let i = 0; i < k && this.conf.length < 220 * q + 30; i++) this.conf.push({ x: rnd(0, W), y: -u * .2, vx: rnd(-.5, .5) * u, vy: rnd(.5, 1.5) * u * 2, rot: rnd(0, TAU), vr: rnd(-8, 8), age: 0, life: rnd(3, 5), s: rnd(.07, .15) * u, c: NEON[(Math.random() * 4) | 0], seed: rnd(0, TAU) });
    this.bacc += dt * this.level * 2.4 * q; const b = Math.floor(this.bacc); this.bacc -= b;
    for (let i = 0; i < b && this.bk.length < 24; i++) this.bk.push({ x: rnd(0, W), y: H * rnd(.75, 1.05), vy: -rnd(.3, 1) * u * .6, age: 0, life: rnd(3, 6), s: rnd(.6, 1.6) * u, c: NEON[(Math.random() * 3) | 0] });
    for (const r of this.rings) r.age += dt; this.rings = this.rings.filter(r => r.age < r.life);
    for (const c of this.conf) { c.age += dt; c.x += (c.vx + Math.sin(c.age * 2 + c.seed) * u * .6) * dt; c.y += c.vy * dt; c.vy = lerp(c.vy, u * .9, dt * .8); c.rot += c.vr * dt; }
    this.conf = this.conf.filter(c => c.age < c.life && c.y < H + 20);
    for (const o of this.bk) { o.age += dt; o.y += o.vy * dt; } this.bk = this.bk.filter(o => o.age < o.life);
  }
  draw(g, t) {
    const { W, H, u } = this.env, L = this.level;
    g.globalCompositeOperation = "lighter";
    if (L > .02) {
      const ox = this.origin[0] * W, oy = this.origin[1] * H;
      const wash = g.createRadialGradient(ox, oy, 0, ox, oy, Math.max(W, H) * .8);
      wash.addColorStop(0, `rgba(255,50,190,${L * .28 + this.sweep * .18})`); wash.addColorStop(.5, `rgba(130,70,255,${L * .1})`); wash.addColorStop(1, "rgba(40,20,120,0)");
      g.globalAlpha = 1; g.fillStyle = wash; g.fillRect(0, 0, W, H);
      for (let r = 0; r < 3; r++) {
        const grad = g.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, "rgba(255,64,200,0)"); grad.addColorStop(.25, "rgba(255,64,200,1)"); grad.addColorStop(.55, "rgba(150,90,255,1)"); grad.addColorStop(.85, "rgba(70,220,255,1)"); grad.addColorStop(1, "rgba(70,220,255,0)");
        g.strokeStyle = grad;
        for (const [lw, al] of [[u * .5, .09], [u * .18, .26], [Math.max(1.2, u * .04), .85]]) {
          g.globalAlpha = L * al; g.lineWidth = lw; g.beginPath();
          for (let x = 0; x <= W; x += W / 28) { const y = H * (.52 + r * .1) + Math.sin(x / W * 5 + t * (.9 + r * .35) + r * 2) * H * .06 + Math.sin(x / W * 11 - t * 1.6) * H * .02; x ? g.lineTo(x, y) : g.moveTo(x, y); }
          g.stroke();
        }
      }
      g.lineWidth = Math.max(1, u * .03);
      for (let i = 0; i < 9; i++) {
        const ang = -Math.PI / 2 + Math.sin(t * .8 + i * .7) * .95 + (i - 4) * .12;
        g.strokeStyle = `rgba(${NEON[i % 3]},1)`; g.globalAlpha = L * (.18 + this.sweep * .5);
        g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + Math.cos(ang) * H * 1.4, oy + Math.sin(ang) * H * 1.4); g.stroke();
      }
    }
    for (const o of this.bk) { const k = o.age / o.life; g.globalAlpha = Math.sin(k * Math.PI) * .7; g.drawImage(BOKEH(o.c), o.x - o.s / 2, o.y - o.s / 2, o.s, o.s); }
    for (const r of this.rings) {
      if (r.age < 0) continue; const k = r.age / r.life, rad = r.max * (1 - Math.pow(1 - k, 2.4));
      g.strokeStyle = `rgba(${r.c},1)`; g.globalAlpha = (1 - k) * .22; g.lineWidth = u * .35; g.beginPath(); g.arc(r.x, r.y, rad, 0, TAU); g.stroke();
      g.globalAlpha = (1 - k) * .95; g.lineWidth = Math.max(1.4, u * .05); g.beginPath(); g.arc(r.x, r.y, rad, 0, TAU); g.stroke();
    }
    for (const c of this.conf) {
      const k = c.age / c.life, sh = .35 + Math.abs(Math.cos(c.rot * 1.3)) * .65;
      g.save(); g.translate(c.x, c.y); g.rotate(c.rot); g.globalAlpha = clamp((1 - k) * 1.6, 0, 1) * sh; g.fillStyle = `rgb(${c.c})`; g.fillRect(-c.s / 2, -c.s, c.s, c.s * 2); g.restore();
    }
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  }
  get busy() { return this.level > .02 || this.rings.length || this.conf.length || this.bk.length || this.act.length || this.sweep > .02; }
}

/* ───────────────────────── global mood overlay ───────────────────────── */
export function createOverlay(canvas, { reduced = false, quality = 1 } = {}) {
  const g = canvas.getContext("2d"), env = { W: 1, H: 1, u: 40, q: quality };
  const layers = { energy: new Fire(env), chill: new Mist(env), love: new Vibe(env) };
  const all = Object.values(layers);
  let still = reduced, scale = quality < 1 ? .4 : .5;
  const loop = makeLoop((dt, t) => {
    all.forEach(l => l.update(dt, t));
    g.clearRect(0, 0, env.W, env.H);
    all.forEach(l => l.draw(g, t));
    return all.some(l => l.busy);
  });
  const resize = () => {
    env.W = Math.max(2, Math.round(innerWidth * scale)); env.H = Math.max(2, Math.round(innerHeight * scale)); env.u = Math.min(env.W, env.H) * .13 * (env.W < 300 ? 1.25 : 1);
    canvas.width = env.W; canvas.height = env.H;
  };
  const vis = () => { if (document.hidden) loop.stop(); else if (all.some(l => l.busy)) loop.start(); };
  resize(); addEventListener("resize", resize); document.addEventListener("visibilitychange", vis);
  return {
    burst(kind, power = 1, xFrac) {
      if (still || !layers[kind]) return;
      layers[kind].burst(clamp(power, .4, 1.4), xFrac == null ? undefined : xFrac * env.W); loop.start();
    },
    // ambient: {energy,chill,love} each 0..1 keeps a low continuous effect alive (low flames at peak heat, ground fog when cold)
    ambient(m) { if (still) return; for (const k in layers) layers[k].amb = clamp(m[k] || 0, 0, 1); if (all.some(l => l.amb > .02)) loop.start(); },
    setReduced(v) { still = v; if (v) { loop.stop(); all.forEach(l => { l.amb = l.level = 0; l.p = []; l.rings = []; l.conf = []; l.bk = []; l.em = []; l.soot = []; l.gl = []; l.act = []; }); g.clearRect(0, 0, env.W, env.H); } },
    destroy() { loop.stop(); removeEventListener("resize", resize); document.removeEventListener("visibilitychange", vis); }
  };
}

/* ───────────────────────── plasma orbs (vote buttons + room reactor) ───────────────────────── */
const PAL = {
  energy: { ring: ["255,200,80", "255,120,30", "255,70,40", "255,232,160"], core: "255,110,30" },
  love: { ring: ["255,95,225", "255,50,170", "205,105,255", "255,195,245"], core: "255,60,200" },
  chill: { ring: ["95,228,255", "50,150,255", "175,242,255", "120,180,255"], core: "60,170,255" },
  room: { ring: ["255,205,80", "255,95,40", "255,50,120", "255,70,230", "195,95,255", "255,165,60"], core: "255,70,150" }
};
class Plasma {
  constructor(env, kind, q) {
    const pal = PAL[kind], r = rng(kind.length * 97 + 7), F = Math.round((kind === "room" ? 22 : 15) * (q < 1 ? .6 : 1));
    Object.assign(this, { env, kind, pal, q, level: .8, turb: 0, spk: [], shock: [], sacc: 0, steps: q < 1 ? 38 : 64 });
    this.fil = Array.from({ length: F }, (_, i) => {
      const arc = r() < .4;
      return { k1: 2 + Math.floor(r() * 4), k2: 3 + Math.floor(r() * 5), p1: r() * TAU, p2: r() * TAU, s1: (r() - .5) * 2.4, s2: (r() - .5) * 3.2, a1: .025 + r() * .055, a2: .015 + r() * .035, c: pal.ring[i % pal.ring.length], from: arc ? r() * TAU : 0, span: arc ? 1.3 + r() * 2.8 : TAU, rot: (r() - .5) * .9, sq: .9 + r() * .2 };
    });
    this.orbits = Array.from({ length: kind === "room" ? 3 : 2 }, (_, i) => ({ tilt: r() * Math.PI, sp: (r() - .5) * .8, rx: 1.16 + i * .1 + r() * .06, ry: .22 + r() * .26, c: pal.ring[(i * 2) % pal.ring.length], bead: r() * TAU }));
    this.hot = Array.from({ length: kind === "room" ? 6 : 3 }, () => ({ a: r() * TAU, s: (r() - .5) * 2.6, c: pal.ring[(Math.random() * pal.ring.length) | 0] }));
  }
  get R() { return Math.min(this.env.W, this.env.H) * this.env.ring; }
  pulse(p = 1) {
    this.turb = Math.min(1.8, this.turb + p); this.shock.push({ age: 0 });
    for (let i = 0; i < 26 * this.q; i++) this.spark(2.2);
  }
  spark(boost = 1) {
    const a = rnd(0, TAU), R = this.R;
    this.spk.push({ a, r: R * rnd(.92, 1.08), v: R * rnd(.6, 1.6) * boost, age: 0, life: rnd(.25, .7), c: this.pal.ring[(Math.random() * this.pal.ring.length) | 0] });
  }
  update(dt) {
    this.turb *= Math.exp(-dt / 1.1);
    this.sacc += dt * (10 + this.level * 18 + this.turb * 40) * this.q; while (this.sacc > 1) { this.sacc--; if (this.spk.length < 90) this.spark(); }
    for (const s of this.spk) { s.age += dt; s.r += s.v * dt; } this.spk = this.spk.filter(s => s.age < s.life);
    for (const h of this.hot) h.a += h.s * dt * (1 + this.turb);
    for (const o of this.orbits) o.bead += dt * (1.4 + this.turb);
    for (const k of this.shock) k.age += dt; this.shock = this.shock.filter(k => k.age < .9);
  }
  draw(g, t) {
    const { W, H } = this.env, cx = W / 2, cy = H / 2, R = this.R, L = clamp(this.level, .3, 1.3), turb = 1 + this.turb, core = this.pal.core;
    g.globalCompositeOperation = "lighter";
    const halo = g.createRadialGradient(cx, cy, R * .55, cx, cy, R * 1.6);
    halo.addColorStop(0, `rgba(${core},0)`); halo.addColorStop(.3, `rgba(${core},${.2 * L + this.turb * .1})`); halo.addColorStop(1, `rgba(${core},0)`);
    g.fillStyle = halo; g.fillRect(0, 0, W, H);
    for (const o of this.orbits) {
      g.save(); g.translate(cx, cy); g.rotate(o.tilt + t * o.sp);
      g.strokeStyle = `rgba(${o.c},${.07 * L})`; g.lineWidth = R * .07; g.beginPath(); g.ellipse(0, 0, R * o.rx, R * o.ry, 0, 0, TAU); g.stroke();
      g.strokeStyle = `rgba(${o.c},${.55 * L})`; g.lineWidth = Math.max(1, R * .012); g.beginPath(); g.ellipse(0, 0, R * o.rx, R * o.ry, 0, 0, TAU); g.stroke();
      const bx = Math.cos(o.bead) * R * o.rx, by = Math.sin(o.bead) * R * o.ry;
      g.drawImage(FIRE[0](), bx - R * .09, by - R * .09, R * .18, R * .18);
      g.restore();
    }
    const amp = turb * (.75 + L * .45);
    for (const f of this.fil) {
      const p = new Path2D();
      for (let j = 0; j <= this.steps; j++) {
        const th = f.from + f.span * j / this.steps, rr = R * (1 + (f.a1 * Math.sin(f.k1 * th + f.p1 + t * f.s1) + f.a2 * Math.sin(f.k2 * th - f.p2 + t * f.s2)) * amp), ang = th + t * f.rot;
        const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr * f.sq;
        j ? p.lineTo(x, y) : p.moveTo(x, y);
      }
      if (f.span >= TAU) p.closePath();
      g.strokeStyle = `rgba(${f.c},${.045 * L})`; g.lineWidth = R * .1; g.stroke(p);
      g.strokeStyle = `rgba(${f.c},${.28 * L})`; g.lineWidth = R * .03; g.stroke(p);
      g.strokeStyle = `rgba(${f.c},${Math.min(1, .75 * L)})`; g.lineWidth = Math.max(.8, R * .008); g.stroke(p);
    }
    for (const h of this.hot) {
      const d = R * (.32 + this.turb * .1), x = cx + Math.cos(h.a) * R, y = cy + Math.sin(h.a) * R;
      g.globalAlpha = .55 + .45 * Math.sin(t * 6 + h.a); g.drawImage(FIRE[0](), x - d / 2, y - d / 2, d, d);
    }
    g.globalAlpha = 1; g.lineCap = "round";
    for (const s of this.spk) {
      const k = s.age / s.life, x = cx + Math.cos(s.a) * s.r, y = cy + Math.sin(s.a) * s.r, tl = R * .06;
      g.strokeStyle = `rgba(${s.c},${1 - k})`; g.lineWidth = Math.max(.8, R * .012);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(s.a) * tl, y - Math.sin(s.a) * tl); g.stroke();
    }
    for (const k of this.shock) { const e = k.age / .9; g.strokeStyle = `rgba(255,255,255,${(1 - e) * .8})`; g.lineWidth = R * .03 * (1 - e) + 1; g.beginPath(); g.arc(cx, cy, R * (1 + e * .6), 0, TAU); g.stroke(); }
    g.globalCompositeOperation = "source-over";
  }
}

// kind: energy | love | chill → plasma ring with a live fire / cryo smoke / neon core inside. kind room → the big reactor ring.
// The canvas is drawn larger than the orb itself so the glow can spill past it (CSS sets inset:-25%).
export function createOrb(canvas, kind, { reduced = false, quality = 1 } = {}) {
  const g = canvas.getContext("2d"), env = { W: 1, H: 1, ring: kind === "room" ? .32 : .3 };
  const q = Math.min(1, quality + .1), plasma = new Plasma(env, kind, q);
  const inner = kind === "room" ? null : document.createElement("canvas"), ig = inner?.getContext("2d"), ienv = { W: 1, H: 1, u: 20, q };
  const layer = kind === "energy" ? new Fire(ienv, { jets: [.5], ember: true }) : kind === "chill" ? new Mist(ienv, { banks: true }) : kind === "love" ? new Vibe(ienv, { origin: [.5, .55] }) : null;
  let level = .8, nextPulse = 0, visible = true, still = reduced;
  const paint = (t) => {
    g.clearRect(0, 0, env.W, env.H);
    if (env.W < 12) return;
    if (layer) {
      ig.clearRect(0, 0, ienv.W, ienv.H); layer.draw(ig, t);
      const R = plasma.R, cx = env.W / 2, cy = env.H / 2;
      g.save(); g.beginPath(); g.arc(cx, cy, R * .94, 0, TAU); g.clip();
      const bg = g.createRadialGradient(cx, cy, 0, cx, cy, R); bg.addColorStop(0, "rgba(10,4,14,.55)"); bg.addColorStop(1, `rgba(${PAL[kind].core},.14)`); g.fillStyle = bg; g.fillRect(cx - R, cy - R, R * 2, R * 2);
      g.globalAlpha = .9; g.drawImage(inner, cx - R, cy - R, R * 2, R * 2); g.restore(); g.globalAlpha = 1;
    }
    plasma.draw(g, t);
  };
  const step = (dt, t) => {
    if (layer) { layer.amb = level * .85; if (t > nextPulse) { nextPulse = t + (kind === "energy" ? rnd(1.4, 2.4) : kind === "chill" ? rnd(2.6, 3.8) : rnd(2, 3)); layer.burst(.35, kind === "love" ? undefined : ienv.W / 2); } layer.update(dt, t); }
    plasma.level = level; plasma.update(dt);
  };
  const loop = makeLoop((dt, t) => { step(dt, t); paint(t); return visible; });
  const frame = () => { for (let i = 0; i < 30; i++) step(.04, i * .04); paint(1.2); };
  const resize = () => {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(1.5, window.devicePixelRatio || 1) * (quality < 1 ? .8 : 1);
    env.W = Math.max(2, Math.round(r.width * dpr)); env.H = Math.max(2, Math.round(r.height * dpr)); canvas.width = env.W; canvas.height = env.H;
    if (inner) { const R = Math.round(plasma.R); ienv.W = ienv.H = inner.width = inner.height = Math.max(2, R * 2); ienv.u = R * .42; }
    if (still) frame();
  };
  resize();
  const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !still) loop.start(); else loop.stop(); }) : null;
  io?.observe(canvas);
  const vis = () => { if (document.hidden) loop.stop(); else if (visible && !still) loop.start(); };
  // Panes on phones start hidden (0×0), so size from the element itself rather than the window.
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  ro ? ro.observe(canvas) : addEventListener("resize", resize);
  document.addEventListener("visibilitychange", vis);
  if (still) frame(); else loop.start();
  return {
    level(v) { level = clamp(v, .3, 1.3); if (still) frame(); },
    pulse(p = 1) { if (still) return; plasma.pulse(p); layer?.burst(p, kind === "love" ? undefined : ienv.W / 2); loop.start(); },
    setReduced(v) { still = v; if (v) { loop.stop(); frame(); } else loop.start(); },
    destroy() { loop.stop(); io?.disconnect(); ro?.disconnect(); document.removeEventListener("visibilitychange", vis); removeEventListener("resize", resize); }
  };
}

/* ───────────────────────── the concert rig ───────────────────────── */
export function createStage(canvas, { reduced = false, quality = 1 } = {}) {
  const g = canvas.getContext("2d", { alpha: false });
  const S = { a: [221, 255, 115], b: [128, 255, 177], dark: [28, 50, 33], fx: "march", power: 2, bpm: 116, heat: 50, playing: false, still: reduced };
  const cur = { a: [...S.a], b: [...S.b], dark: [...S.dark] };
  let W = 2, H = 2, crowd = [], dust = [], mom = null, bolts = [], boltAt = 0, pulse = 0;
  const scale = quality < 1 ? .38 : .5;
  const mix = (c, k) => c.map(v => Math.round(v * k));
  const col = (c, k = 1) => `${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)}`;
  const buildCrowd = () => {
    const r = rng(7), rows = quality < 1 ? [[.07, 14, .64], [.0, 11, 1]] : [[.09, 26, .55], [.045, 22, .78], [.0, 17, 1]];
    crowd = []; dust = Array.from({ length: Math.round(46 * quality) }, () => ({ x: r() * W, y: r() * H, z: .3 + r() * .7, p: r() * TAU }));
    for (const [lift, step, sc] of rows) for (let x = -step; x < W + step; x += step * (.75 + r() * .5)) crowd.push({ x, lift: lift * H, sc, ph: r() * TAU, arm: r() < .42 ? (r() < .5 ? 1 : 2) : 0, hh: .85 + r() * .3 });
  };
  const resize = () => { W = Math.max(2, Math.round(innerWidth * scale)); H = Math.max(2, Math.round(innerHeight * scale)); canvas.width = W; canvas.height = H; buildCrowd(); if (S.still) paint(2.2, 1 / 60); };
  const beam = (ox, oy, ang, len, spread, c, a) => {
    if (a <= .004) return;
    const ex = ox + Math.sin(ang) * len, ey = oy + Math.cos(ang) * len, nx = Math.cos(ang), ny = -Math.sin(ang), w1 = len * spread;
    const gr = g.createLinearGradient(ox, oy, ex, ey);
    gr.addColorStop(0, `rgba(${col(c)},${a})`); gr.addColorStop(.55, `rgba(${col(c)},${a * .34})`); gr.addColorStop(1, `rgba(${col(c)},0)`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(ox + nx * 1.5, oy + ny * 1.5); g.lineTo(ex + nx * w1, ey + ny * w1); g.lineTo(ex - nx * w1, ey - ny * w1); g.lineTo(ox - nx * 1.5, oy - ny * 1.5); g.closePath(); g.fill();
  };
  const flare = (x, y, c, r, a) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(.25, `rgba(${col(c)},${a * .6})`); gr.addColorStop(1, `rgba(${col(c)},0)`);
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const bolt = () => {
    const x0 = rnd(.15, .85) * W, pts = [[x0, 0]]; let x = x0, y = 0;
    while (y < H * rnd(.55, .9)) { y += rnd(.04, .09) * H; x += rnd(-.07, .07) * W; pts.push([x, y]); }
    return { pts, age: 0, life: rnd(.14, .26) };
  };
  function paint(t, dt) {
    const e = mom ? (performance.now() - mom.at) / 1000 : 99, kind = e < 4.8 ? mom.kind : null;
    const m = [0, .55, .85, 1.15][S.power] * (kind === "drop" && e < 3 ? 1.5 : 1);
    const beat = (t * S.bpm / 60) % 1, kick = Math.pow(1 - beat, 3) * (S.playing ? 1 : .35);
    const heatK = .75 + S.heat / 100 * .6, flip = kind === "flip" && e < 3.2;
    const A = flip ? cur.b : cur.a, B = flip ? cur.a : cur.b;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, `rgb(${col(cur.dark, .16)})`); bg.addColorStop(.6, `rgb(${col(cur.dark, .38)})`); bg.addColorStop(1, `rgb(${col(cur.dark, .62)})`);
    g.globalCompositeOperation = "source-over"; g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) {
      const hx = W * (.15 + i * .24) + Math.sin(t * .13 + i * 2) * W * .06, hy = H * (.42 + Math.cos(t * .17 + i) * .08), hr = W * .34;
      const hz = g.createRadialGradient(hx, hy, 0, hx, hy, hr); hz.addColorStop(0, `rgba(${col(i % 2 ? B : A)},${.17 * m * heatK})`); hz.addColorStop(1, `rgba(${col(A)},0)`);
      g.fillStyle = hz; g.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
    }
    // LED wall
    if (W > 520 && S.power > 0) {
      const sw = W * .17, sh = H * .075, sx = W * .5 - sw / 2, sy = H * .012;
      g.globalAlpha = (.28 + kick * .22) * Math.min(1, m); g.fillStyle = `rgb(${col(A, .35)})`; g.fillRect(sx, sy, sw, sh);
      g.font = `900 ${Math.round(sh * .3)}px Impact,'Arial Narrow',sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = `rgb(${col(B)})`; g.globalAlpha = .8 * Math.min(1, m);
      ["MUSIC BRINGS", "BETTER STRANGERS"].forEach((line, i) => g.fillText(line, sx + sw / 2, sy + sh * (.3 + i * .42), sw * .92)); g.globalAlpha = 1;
    }
    // beams
    if (S.power > 0) {
      const n = [0, 5, 8, 12][S.power], sp = (kind === "drop" ? 1.9 : 1) * heatK, al = (.34 + kick * .42) * m, fx = S.fx, oy = -H * .03;
      for (let i = 0; i < n; i++) {
        const f = n === 1 ? .5 : i / (n - 1), c = i % 2 ? B : A, ox = W * (.08 + f * .84);
        let ang = 0, len = H * 1.45, spr = .07, a = al;
        if (fx === "march") ang = Math.sin(t * 1.2 * sp + i * .55) * .75;
        else if (fx === "pulse") { ang = (f - .5) * (.5 + kick * .5); spr = .07 + kick * .06; a = al * (.6 + kick * 1.1); }
        else if (fx === "sweep") ang = Math.sin(t * 1.5 * sp - f * 4.5) * .95;
        else if (fx === "crossfire") { const left = i % 2 === 0; ang = (left ? .1 : -.1) + (left ? 1 : -1) * Math.sin(t * 1.3 * sp + i * .4) * .6; beam(left ? W * .02 : W * .98, oy, ang * (left ? 1 : 1), len, spr, c, a); continue; }
        else if (fx === "tunnel") { const o = [W * .5, H * .5], an = t * .35 * sp + i / n * TAU; beam(o[0], o[1], an, H * 1.1, .035, c, a * 1.2); continue; }
        else if (fx === "bloom") { spr = .16; a = al * .6; ang = Math.sin(t * .5 + i) * .35; }
        else { ang = Math.sin(t * .35 * sp + i * .9) * .55; spr = .11; a = al * .7; len = H * 1.2; }
        beam(ox, oy, ang, len, spr, c, a); beam(ox, oy, ang, len, spr * .18, [255, 255, 255], a * .75);
        flare(ox, 0, c, H * .1, Math.min(1, .45 + kick * .5) * Math.min(1, m));
      }
      if (fx === "tunnel") for (let r = 0; r < 5; r++) { const k = ((t * .25 * sp + r / 5) % 1); g.strokeStyle = `rgba(${col(r % 2 ? B : A)},${(1 - k) * .3 * m})`; g.lineWidth = 1 + k * 3; g.beginPath(); g.ellipse(W / 2, H * .5, W * .6 * k, H * .45 * k, 0, 0, TAU); g.stroke(); }
    }
    // dust in the light
    g.fillStyle = "#fff";
    for (const d of dust) { d.y -= d.z * 6 * dt; d.x += Math.sin(t * .4 + d.p) * .2; if (d.y < -2) { d.y = H + 2; d.x = Math.random() * W; } g.globalAlpha = (.12 + .2 * Math.sin(t * 1.1 + d.p) ** 2) * d.z * Math.min(1, m + .2); g.fillRect(d.x, d.y, Math.max(1, d.z * 1.4), Math.max(1, d.z * 1.4)); }
    g.globalAlpha = 1;
    // floor wash
    const fl = g.createLinearGradient(0, H * .62, 0, H); fl.addColorStop(0, `rgba(${col(B)},0)`); fl.addColorStop(1, `rgba(${col(A)},${(.26 + kick * .16) * Math.min(1.2, m)})`); g.fillStyle = fl; g.fillRect(0, H * .62, W, H * .38);
    // backlit crowd
    g.globalCompositeOperation = "source-over";
    const bob = S.heat / 100 * 2 + .6, armL = H * .085;
    for (const pass of [0, 1]) {
      for (const p of crowd) {
        const rowSc = p.sc * (H / 440), by = H + p.lift - H * .008 + Math.sin(t * 2.6 * bob + p.ph) * (S.playing ? 1.6 : .6) * rowSc * (.5 + kick * .6) * (1 + S.heat / 120);
        const off = pass === 0 ? -1.6 : 0;
        g.fillStyle = pass === 0 ? `rgba(${col(p.x % 2 > 1 ? B : A)},${.4 * Math.min(1, m + .25)})` : "#030208"; g.strokeStyle = g.fillStyle;
        const hr = 5.4 * rowSc * p.hh, sy = by - 18 * rowSc;
        g.beginPath(); g.ellipse(p.x, by - 8 * rowSc + off, 9 * rowSc, 14 * rowSc, 0, 0, TAU); g.fill();
        g.beginPath(); g.arc(p.x, sy - hr + off, hr, 0, TAU); g.fill();
        if (p.arm) {
          const pump = (Math.sin(t * S.bpm / 60 * Math.PI + p.ph) + 1) / 2, lift = .5 + .5 * pump * (S.heat / 100 + .35);
          g.lineWidth = 2.6 * rowSc; g.lineCap = "round";
          for (const side of p.arm === 1 ? [-1] : [-1, 1]) { g.beginPath(); g.moveTo(p.x + side * 6 * rowSc, sy + 4 * rowSc + off); g.lineTo(p.x + side * (9 + 5 * pump) * rowSc, sy - armL * lift * rowSc + off); g.stroke(); }
        }
      }
    }
    // show moments
    g.globalCompositeOperation = "lighter";
    if (kind === "drop") {
      if (e < .9) { g.fillStyle = `rgba(255,255,255,${(1 - e / .9) * .75})`; g.fillRect(0, 0, W, H); }
      const k = e / 1.6; if (k < 1) { g.strokeStyle = `rgba(255,255,255,${1 - k})`; g.lineWidth = 2 + (1 - k) * 8; g.beginPath(); g.arc(W / 2, H * .9, k * W * .8, 0, TAU); g.stroke(); }
    } else if (kind === "flip" && e < 2) {
      const wx = e / 1.6 * (W * 1.4) - W * .2, wg = g.createLinearGradient(wx - W * .3, 0, wx + W * .3, 0);
      wg.addColorStop(0, `rgba(${col(B)},0)`); wg.addColorStop(.5, `rgba(${col(B)},${(1 - e / 2) * .45})`); wg.addColorStop(1, `rgba(${col(B)},0)`); g.fillStyle = wg; g.fillRect(0, 0, W, H);
    } else if (kind === "storm" && e < 4.2) {
      boltAt -= dt; if (boltAt <= 0 && e < 3.6) { bolts.push(bolt()); boltAt = rnd(.15, .5); pulse = 1; }
      pulse *= Math.exp(-dt / .08); g.fillStyle = `rgba(190,215,255,${pulse * .28})`; g.fillRect(0, 0, W, H);
      for (const b of bolts) {
        b.age += dt; const a = 1 - b.age / b.life; if (a <= 0) continue;
        for (const [lw, al, c] of [[6, .18, "120,170,255"], [2.6, .5, "170,205,255"], [1.1, 1, "255,255,255"]]) { g.strokeStyle = `rgba(${c},${al * a})`; g.lineWidth = lw * (W / 720); g.beginPath(); b.pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }
      }
      bolts = bolts.filter(b => b.age < b.life);
    }
    g.globalCompositeOperation = "source-over";
    if (kind === "fade") {
      const a = e < .5 ? e / .5 : e < 1.6 ? 1 : e < 3 ? 1 - (e - 1.6) / 1.4 : 0;
      g.fillStyle = `rgba(0,0,0,${clamp(a, 0, 1) * .94})`; g.fillRect(0, 0, W, H);
      if (e > 1.6 && e < 3.4) { g.globalCompositeOperation = "lighter"; flare(W / 2, H * .1, A, H * .9 * ((e - 1.6) / 1.8), .35 * (1 - (e - 1.6) / 1.8)); g.globalCompositeOperation = "source-over"; }
    }
  }
  const loop = makeLoop((dt, ts) => {
    for (const k of ["a", "b", "dark"]) for (let i = 0; i < 3; i++) cur[k][i] = lerp(cur[k][i], S[k][i], 1 - Math.exp(-dt * 2.4));
    paint(ts, dt); return true;
  });
  const vis = () => { if (document.hidden) loop.stop(); else if (!S.still) loop.start(); };
  resize(); addEventListener("resize", resize); document.addEventListener("visibilitychange", vis);
  if (S.still) paint(2.2, 1 / 60); else loop.start();
  return {
    set(p) {
      if (p.theme) { S.a = rgb(p.theme.a); S.b = rgb(p.theme.b); S.dark = rgb(p.theme.dark); }
      for (const k of ["fx", "power", "bpm", "heat", "playing"]) if (p[k] !== undefined) S[k] = p[k];
      if (S.still) { for (const k of ["a", "b", "dark"]) cur[k] = [...S[k]]; paint(2.2, 1 / 60); }
    },
    moment(kind, at) { if (S.still || mom?.sat === at) return; mom = { kind, sat: at, at: performance.now() - clamp(Date.now() - at, 0, 4800) }; boltAt = 0; bolts = []; },
    setReduced(v) { S.still = v; if (v) { loop.stop(); cur.a = [...S.a]; cur.b = [...S.b]; cur.dark = [...S.dark]; mom = null; paint(2.2, 1 / 60); } else loop.start(); },
    destroy() { loop.stop(); removeEventListener("resize", resize); document.removeEventListener("visibilitychange", vis); }
  };
}
