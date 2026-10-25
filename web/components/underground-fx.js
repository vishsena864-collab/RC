// Underground FM visual engine. Plain Canvas 2D, no dependencies, no network, no media.
//   createStage   full-screen concert rig: moving-head beams, haze, backlit crowd, strobes, lightning, blackout
//   createOverlay full-screen pyro / cryo-smoke / neon-vibe bursts fired when anybody in the room votes
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

/* ───────────────────────── haze + LED textures ───────────────────────── */
// Tileable smoke: periodic value noise, three octaves. Alpha = density (0.45–1) so beams drawn through it break up.
let hazeTileCache = null;
const hazeTile = () => {
  if (hazeTileCache) return hazeTileCache;
  const size = 256, c = document.createElement("canvas"); c.width = c.height = size;
  const x = c.getContext("2d"), img = x.createImageData(size, size), r = rng(42);
  const octave = (n) => { const lat = Array.from({ length: n * n }, () => r()); return (u, v) => { const fx = u * n, fy = v * n, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), at = (i, j) => lat[((j % n + n) % n) * n + ((i % n + n) % n)]; return lerp(lerp(at(x0, y0), at(x0 + 1, y0), sx), lerp(at(x0, y0 + 1), at(x0 + 1, y0 + 1), sx), sy); }; };
  const o = [[octave(4), .55], [octave(8), .3], [octave(16), .15]];
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    let v = 0; for (const [f, w] of o) v += f(px / size, py / size) * w;
    const i = (py * size + px) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.round(clamp(.45 + Math.pow(v, 1.6) * .9, 0, 1) * 255);
  }
  x.putImageData(img, 0, 0); return (hazeTileCache = c);
};
const ledTile = (p) => { const c = document.createElement("canvas"); c.width = c.height = p; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.beginPath(); x.arc(p / 2, p / 2, p * .36, 0, TAU); x.fill(); return c; };

// Where things are in the venue photo (fractions of the image) and how the CSS places it (cover, x 50%, y 28% / 30% on narrow screens).
// Two venue photos: wide for landscape screens, tall for phones. Each maps its LED screens, white light bars and DJ.
const PHOTOS = {
  wide: { src: "/underground/stage-2400.webp", small: "/underground/stage-1200.webp", ratio: 670 / 1200, zoom: 1.6, screens: [{ u0: .37, v0: .36, u1: .63, v1: .56, main: true }, { u0: .16, v0: .37, u1: .25, v1: .68 }, { u0: .74, v0: .37, u1: .84, v1: .68 }], bars: [[.375, .358], [.63, .358], [.785, .358]], dj: [.5, .55] },
  tall: { src: "/underground/stage-portrait-1300.webp", small: "/underground/stage-portrait-800.webp", ratio: 2752 / 1536, zoom: 1.35, screens: [{ u0: .3, v0: .44, u1: .72, v1: .53, main: true }, { u0: .02, v0: .45, u1: .1, v1: .6 }, { u0: .9, v0: .45, u1: .98, v1: .6 }], bars: [[.27, .413], [.73, .413]], dj: [.5, .575] }
};
// Photo placement shared by the CSS backdrop and the rig: zoomed so the stage, LED screens and DJ sit in the hero
// (about a third of the way down the viewport) while the image still covers the whole screen.
export const photoFit = (w, h) => {
  const P = h > w * 1.15 ? PHOTOS.tall : PHOTOS.wide;
  let dh = Math.max(h * P.zoom, w * P.ratio), dw = dh / P.ratio;
  if (dw < w) { dw = w; dh = dw * P.ratio; }
  return { P, src: w * (window.devicePixelRatio || 1) > 1400 || P === PHOTOS.tall && h * (window.devicePixelRatio || 1) > 1600 ? P.src : P.small, dw, dh, ox: (w - dw) / 2, oy: clamp(h * .33 - P.dj[1] * dh, h - dh, 0) };
};
const REACT_RGB = { heart: [255, 40, 150], fire: [255, 110, 20], spark: [255, 250, 235], wave: [40, 200, 255] };

/* ───────────────────────── the concert rig ───────────────────────── */
// photo: the venue photograph sits behind the canvas, so draw light only (no backdrop, truss, LED wall or crowd).
// Optional live audio: pass an AnalyserNode to stage.audio(); bass/mid/high, beat onsets and drops then drive the rig.
// Without it (nobody pressed play on this device) the rig follows the room BPM. onLevels reports the drive each frame.
const SPECIAL = new Set(["cone", "matrix", "chase", "follow"]);
const MOOD_RGB = { energy: [255, 96, 24], love: [255, 52, 200], chill: [60, 190, 255] };
export function createStage(canvas, { reduced = false, quality = 1, photo = false, onLevels = null } = {}) {
  const main = canvas.getContext("2d", { alpha: photo });
  let g = main; // beams and lasers are drawn into `bl` first so the haze can break them up, then composited onto `main`
  const bl = document.createElement("canvas"), blg = bl.getContext("2d"), led = document.createElement("canvas"), ledg = led.getContext("2d");
  const rich = quality >= 1; // haze modulation, god rays and LED wall detail on capable devices
  let hazePat = null, hazeMain = null, dotPat = null, beats = 0, reacts = [];
  const S = { a: [221, 255, 115], b: [128, 255, 177], dark: [28, 50, 33], fx: "march", power: 2, bpm: 116, heat: 50, playing: false, still: reduced };
  const cur = { a: [...S.a], b: [...S.b], dark: [...S.dark] };
  let W = 2, H = 2, crowd = [], dust = [], mom = null, bolts = [], boltAt = 0, pulse = 0;
  let an = null, buf = null, avgBass = 0, beatEnv = 0, lastBeat = -9, onset = false, fast = 0, slow = 0, lastDrop = -99, blind = 0, strobe = 0, lastStrobe = -9, moodT = null;
  const L = { bass: 0, mid: 0, high: 0, level: 0, live: false };
  // FFT bands → smoothed levels, kick onsets (bass jumping over its running average) and drops (energy surging over its slow average).
  const listen = (dt, t) => {
    onset = false; beatEnv *= Math.exp(-dt / .18);
    if (!an) { L.live = false; return; }
    an.getByteFrequencyData(buf);
    const hz = an.context.sampleRate / an.fftSize, band = (lo, hi) => { let s = 0, n = 0; for (let i = Math.max(1, Math.round(lo / hz)), e = Math.min(buf.length - 1, Math.round(hi / hz)); i <= e; i++) { s += buf[i]; n++; } return n ? s / n / 255 : 0; };
    const b = band(30, 150), m = band(400, 2000), h = band(5000, 12000), follow = (cur, to, up, down) => lerp(cur, to, 1 - Math.exp(-dt * (to > cur ? up : down)));
    L.bass = follow(L.bass, b, 30, 6); L.mid = follow(L.mid, m, 20, 5); L.high = follow(L.high, h, 25, 6);
    L.level = (L.bass * .5 + L.mid * .35 + L.high * .15); L.live = b + m + h > .03;
    if (!L.live) return;
    if (b > avgBass * 1.28 + .035 && b > .22 && t - lastBeat > .28) { beatEnv = 1; lastBeat = t; onset = true; beats++; }
    avgBass = lerp(avgBass, b, 1 - Math.exp(-dt * 1.6));
    fast = lerp(fast, L.level, 1 - Math.exp(-dt * 6)); slow = lerp(slow, L.level, 1 - Math.exp(-dt * .45));
    if (fast > slow * 1.5 && fast > .42 && t - lastDrop > 8) { blind = 1; lastDrop = t; }
  };
  // Render at screen resolution (thin lasers smear when a small canvas is stretched); cap the pixel count on huge screens.
  let scale = 1;
  const pickScale = () => { const px = innerWidth * innerHeight, cap = quality < 1 && (navigator.hardwareConcurrency || 8) <= 4 ? 7e5 : 1.6e6; scale = Math.min(1, Math.sqrt(cap / px)); };
  const mix = (c, k) => c.map(v => Math.round(v * k));
  const col = (c, k = 1) => `${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)}`;
  const buildCrowd = () => {
    const r = rng(7), rows = quality < 1 ? [[.07, 14, .64], [.0, 11, 1]] : [[.09, 26, .55], [.045, 22, .78], [.0, 17, 1]];
    crowd = []; dust = Array.from({ length: Math.round(46 * quality) }, () => ({ x: r() * W, y: r() * H, z: .3 + r() * .7, p: r() * TAU }));
    for (const [lift, step, sc] of rows) for (let x = -step; x < W + step; x += step * (.75 + r() * .5)) crowd.push({ x, lift: lift * H, sc, ph: r() * TAU, arm: r() < .42 ? (r() < .5 ? 1 : 2) : 0, hh: .85 + r() * .3 });
  };
  const resize = () => {
    pickScale(); W = Math.max(2, Math.round(innerWidth * scale)); H = Math.max(2, Math.round(innerHeight * scale)); canvas.width = W; canvas.height = H; bl.width = W; bl.height = H; buildCrowd();
    hazePat = blg.createPattern(hazeTile(), "repeat"); hazeMain = main.createPattern(hazeTile(), "repeat"); dotPat = ledg.createPattern(ledTile(W > 600 ? 3 : 2), "repeat");
    if (S.still) paint(2.2, 1 / 60);
  };
  // photo fractions → canvas pixels, matching the CSS background placement
  const at = (u, v) => { const f = photoFit(innerWidth, innerHeight), k = W / innerWidth; return [(f.ox + u * f.dw) * k, (f.oy + v * f.dh) * k]; };
  // volumetric beam: stacked cones (soft edge, brighter core) and a hot spot where it lands on the floor
  const beam = (ox, oy, ang, len, spread, c, a) => {
    if (a <= .004) return;
    const ex = ox + Math.sin(ang) * len, ey = oy + Math.cos(ang) * len, nx = Math.cos(ang), ny = -Math.sin(ang), w1 = len * spread;
    const gr = g.createLinearGradient(ox, oy, ex, ey);
    gr.addColorStop(0, `rgba(${col(c)},${a})`); gr.addColorStop(.55, `rgba(${col(c)},${a * .34})`); gr.addColorStop(1, `rgba(${col(c)},0)`);
    g.fillStyle = gr;
    for (const [f, al] of [[1, .4], [.5, .55], [.2, .85]]) { g.globalAlpha = al; g.beginPath(); g.moveTo(ox + nx * 1.5, oy + ny * 1.5); g.lineTo(ex + nx * w1 * f, ey + ny * w1 * f); g.lineTo(ex - nx * w1 * f, ey - ny * w1 * f); g.lineTo(ox - nx * 1.5, oy - ny * 1.5); g.closePath(); g.fill(); }
    g.globalAlpha = 1;
    const fy = H * (photo ? .8 : .92), ca = Math.cos(ang);
    if (ca > .25) {
      const d = (fy - oy) / ca, hw = d * spread * 1.2, hx = ox + Math.sin(ang) * d;
      if (d > 0 && d < len * .9 && hx > -hw && hx < W + hw) {
        g.save(); g.translate(hx, fy); g.scale(1, .26);
        const hg = g.createRadialGradient(0, 0, 0, 0, 0, hw); hg.addColorStop(0, `rgba(${col(c)},${Math.min(1, a * 1.1)})`); hg.addColorStop(1, `rgba(${col(c)},0)`);
        g.fillStyle = hg; g.fillRect(-hw, -hw, hw * 2, hw * 2); g.restore();
      }
    }
  };
  const flare = (x, y, c, r, a) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(.25, `rgba(${col(c)},${a * .6})`); gr.addColorStop(1, `rgba(${col(c)},0)`);
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    // anamorphic streak: how a bright lamp reads on camera
    g.save(); g.translate(x, y); g.scale(1, .05);
    const st = g.createRadialGradient(0, 0, 0, 0, 0, r * 3.5); st.addColorStop(0, `rgba(${col(c)},${a * .45})`); st.addColorStop(1, `rgba(${col(c)},0)`);
    g.fillStyle = st; g.beginPath(); g.arc(0, 0, r * 3.5, 0, TAU); g.fill(); g.restore();
  };
  // neon laser: white-hot core inside layered, fully saturated glow, sparkles where it crosses haze.
  // Drawn straight onto the stage (not through the haze mask) so it stays crisp and bright.
  const SPARKLE = [3, 70, 2, 110, 5, 45];
  const neon = (c) => { const mx = Math.max(c[0], c[1], c[2], 1), mn = Math.min(c[0], c[1], c[2]); return mx - mn < 30 ? c : c.map(v => Math.round(((v - mn) / (mx - mn)) * 255)); };
  const laser = (x, y, a, len, c, k, wid, phase) => {
    if (k <= .01) return;
    const x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len, n = neon(c), rc = col(n), hot = col(n.map(v => Math.round(v * .8 + 50)));
    const ctx = main; ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x1, y1);
    ctx.lineWidth = wid * 18; ctx.strokeStyle = `rgba(${rc},${.05 * k})`; ctx.stroke();
    ctx.lineWidth = wid * 7; ctx.strokeStyle = `rgba(${rc},${.2 * k})`; ctx.stroke();
    ctx.lineWidth = wid * 3; ctx.strokeStyle = `rgba(${rc},${.85 * k})`; ctx.stroke();
    const gr = ctx.createLinearGradient(x, y, x1, y1); gr.addColorStop(0, `rgba(${hot},${k})`); gr.addColorStop(.7, `rgba(${hot},${.85 * k})`); gr.addColorStop(1, `rgba(${hot},${.35 * k})`);
    ctx.lineWidth = wid * 1.4; ctx.strokeStyle = gr; ctx.stroke();
    ctx.lineWidth = Math.max(.6, wid * .45); ctx.strokeStyle = `rgba(255,255,255,${.55 * k})`; ctx.stroke();
    ctx.setLineDash(SPARKLE); ctx.lineDashOffset = -phase; ctx.lineWidth = wid * 2; ctx.strokeStyle = `rgba(${hot},${.8 * k})`; ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  };
  const EMITTERS = [{ x: .14, y: .8, dir: -1 }, { x: .5, y: .8, dir: -1 }, { x: .86, y: .8, dir: -1 }, { x: .32, y: .03, dir: 1 }, { x: .68, y: .03, dir: 1 }];
  const lasers = (t, A, B, m, kick, mode) => {
    const n = W < 500 ? 8 : 13, len = Math.hypot(W, H) * 1.1, open = .75 + kick * .45 + S.heat / 250, wid = Math.max(1, Math.min(W, H) / 650);
    g.lineCap = "round";
    EMITTERS.forEach((e, ei) => {
      const ex = e.x * W, ey = e.y * H, base = e.dir < 0 ? -Math.PI / 2 : Math.PI / 2, c = ei % 2 ? B : A;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1) - .5; let a;
        if (mode === 0) a = base + Math.sin(t * .9 + ei * 1.3) * .55 + u * (.9 + kick * .7);
        else if (mode === 1) a = base + Math.sin(t * 1.7 + i * .42 + ei) * (.55 + kick * .4);
        else if (mode === 2) a = base + Math.sin(t * 2.2 + i / n * TAU + ei) * (.35 + kick * .5);
        else a = base + u * (.12 + kick * 1.5) + Math.sin(t * .6 + ei) * .15;
        laser(ex, ey, a, len, c, Math.min(1, open * (.82 + .18 * Math.sin(t * 6 + i * .9 + ei)) * Math.min(1, m)), wid, t * 130 + i * 53);
      }
      flare(ex, ey, c, H * .05 * (.7 + kick * .6), .9 * Math.min(1, m));
    });
  };
  const truss = (y, xs) => {
    g.globalCompositeOperation = "source-over";
    g.strokeStyle = "rgba(150,160,195,.42)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, y - 7); g.lineTo(W, y - 7); g.moveTo(0, y + 1); g.lineTo(W, y + 1); g.stroke();
    g.strokeStyle = "rgba(120,130,165,.3)"; g.lineWidth = .8; g.beginPath(); for (let x = 0; x < W; x += 17) { g.moveTo(x, y + 1); g.lineTo(x + 8.5, y - 7); g.lineTo(x + 17, y + 1); } g.stroke();
    for (const hx of xs) { g.fillStyle = "#0d0f18"; g.fillRect(hx - 5, y + 1, 10, 12); g.strokeStyle = "rgba(90,98,130,.6)"; g.strokeRect(hx - 5, y + 1, 10, 12); }
    g.globalCompositeOperation = "lighter";
  };
  // LED wall content mapped onto the photo's screens: spectrum, kick rings or a marquee, cycling every 8 beats
  const ledWall = (t, A, B, m, kick, bi) => {
    if (!photo || S.power === 0) return;
    const mode = Math.floor(bi / 8) % 3;
    photoFit(innerWidth, innerHeight).P.screens.forEach((sc, si) => {
      const [x0, y0] = at(sc.u0, sc.v0), [x1, y1] = at(sc.u1, sc.v1), w = Math.round(x1 - x0), h = Math.round(y1 - y0);
      if (w < 8 || h < 8 || x1 < 0 || x0 > W) return;
      if (led.width < w || led.height < h) { led.width = Math.max(led.width, w); led.height = Math.max(led.height, h); dotPat = ledg.createPattern(ledTile(W > 600 ? 3 : 2), "repeat"); }
      ledg.globalCompositeOperation = "source-over"; ledg.clearRect(0, 0, w, h);
      const gr = ledg.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, `rgb(${col(A)})`); gr.addColorStop(1, `rgb(${col(B)})`);
      ledg.fillStyle = gr;
      if (!sc.main) {
        // side screens: VU columns for bass / mid / high + a wash on the kick
        const lv = L.live ? [L.bass, L.mid, L.high * 1.6] : [.35 + kick * .5, .3 + Math.sin(t * 3) * .15, .25 + Math.sin(t * 5.3) * .12];
        lv.forEach((v, k) => { const bh = clamp(v, 0, 1) * h; ledg.fillRect(k * w / 3 + w * .04, h - bh, w / 3 - w * .08, bh); });
        ledg.globalAlpha = kick * .35; ledg.fillRect(0, 0, w, h); ledg.globalAlpha = 1;
      } else if (mode === 0) {
        const n = 24; for (let i = 0; i < n; i++) {
          let v; if (L.live && buf) { const k = Math.floor(Math.pow(i / n, 1.7) * buf.length * .5) + 1; v = Math.pow(buf[k] / 255, .8) * (1 + i / n * 1.5); } else v = .3 + Math.sin(i * .8 + t * 3) * .18 + kick * .35;
          const bh = clamp(v, .05, 1) * h * .92; ledg.fillRect(i * w / n + 1, (h - bh) / 2, w / n - 2, bh);
        }
      } else if (mode === 1) {
        ledg.strokeStyle = gr; ledg.lineWidth = Math.max(2, h * .06);
        for (let r = 0; r < 4; r++) { const k = (t * .9 + r / 4) % 1; ledg.globalAlpha = (1 - k) * (.6 + kick * .4); ledg.beginPath(); ledg.ellipse(w / 2, h / 2, w * .55 * k + 2, h * .55 * k + 2, 0, 0, TAU); ledg.stroke(); }
        ledg.globalAlpha = 1;
      } else {
        const txt = "UNDERGROUND FM  ✦  MUSIC BRINGS BETTER STRANGERS  ✦  ";
        ledg.font = `900 ${Math.round(h * .5)}px Impact,'Arial Narrow',sans-serif`; ledg.textBaseline = "middle";
        const tw = ledg.measureText(txt).width, off = -((t * h * 1.6) % tw);
        for (let x = off; x < w; x += tw) ledg.fillText(txt, x, h / 2);
      }
      ledg.globalCompositeOperation = "destination-in"; ledg.fillStyle = dotPat; ledg.fillRect(0, 0, w, h);
      main.globalCompositeOperation = "lighter"; main.globalAlpha = (.5 + kick * .3) * Math.min(1, m); main.drawImage(led, 0, 0, w, h, x0, y0, w, h); main.globalAlpha = 1;
    });
    // the white LED bars over the screens hit on the kick
    for (const [u, v] of photoFit(innerWidth, innerHeight).P.bars) { const [x, y] = at(u, v); flare(x, y, B, H * .035 * (.6 + kick), .25 + kick * .6); }
  };
  // light shafts radiating from behind the DJ
  const godRays = (t, A, B, m) => {
    const [ox, oy] = photo ? at(...photoFit(innerWidth, innerHeight).P.dj) : [W / 2, H * .45], len = Math.max(W, H) * .9, k = (.5 + (L.live ? L.bass : .3)) * Math.min(1, m);
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * TAU + t * .05 + Math.sin(t * .3 + i) * .08, w = .035 + (i % 3) * .015, c = i % 2 ? A : B;
      const gr = g.createRadialGradient(ox, oy, 0, ox, oy, len); gr.addColorStop(0, `rgba(${col(c)},${.16 * k})`); gr.addColorStop(1, `rgba(${col(c)},0)`);
      g.fillStyle = gr; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + Math.cos(a - w) * len, oy + Math.sin(a - w) * len); g.lineTo(ox + Math.cos(a + w) * len, oy + Math.sin(a + w) * len); g.closePath(); g.fill();
    }
  };
  // the four extra rigs
  const special = (fx, t, A, B, m, kick, bi, sp, ty) => {
    const ctr = photo ? at(.5, .48) : [W / 2, H * .45], wid = Math.max(1, Math.min(W, H) / 650);
    if (fx === "cone") {
      const n = W < 360 ? 14 : 22, len = Math.hypot(W, H);
      for (let i = 0; i < n; i++) laser(ctr[0], ctr[1], t * .6 * sp + i / n * TAU, len, i % 2 ? A : B, Math.min(1, (.55 + kick * .5) * m), wid, t * 160 + i * 41);
      if (S.power > 1) for (let i = 0; i < n; i += 2) laser(ctr[0], ctr[1], -t * .4 * sp + i / n * TAU + .07, len, B, Math.min(1, .35 * m), wid, t * 120 + i * 29);
      g.lineWidth = wid * 1.4;
      for (let r = 0; r < 6; r++) { const k = (t * .35 * sp + r / 6) % 1, c = r % 2 ? A : B; g.strokeStyle = `rgba(${col(c)},${(1 - k) * .55 * Math.min(1, m)})`; g.beginPath(); g.ellipse(ctr[0], ctr[1], W * .75 * k * k + 2, H * .6 * k * k + 2, 0, 0, TAU); g.stroke(); }
      flare(ctr[0], ctr[1], A, H * .08 * (.7 + kick), .8);
    } else if (fx === "matrix") {
      const n = W < 360 ? 7 : 12, len = H * 1.4;
      for (let i = 0; i < n; i++) { if ((i + bi) % 2) continue; const ox = W * (.06 + i / (n - 1) * .88); beam(ox, ty + 12, Math.sin(t * .6 + i) * .04, len, .028, i % 4 < 2 ? A : B, (.45 + kick * .5) * m); beam(ox, ty + 12, 0, len, .006, [255, 255, 255], .5 * m); }
      for (let r = 0; r < 4; r++) { if ((r + bi) % 2 === 0) continue; const y = H * (.22 + r * .14), from = r % 2 ? 0 : W; laser(from, y, r % 2 ? 0 : Math.PI, W, r % 2 ? A : B, Math.min(1, (.6 + kick * .4) * m), wid, t * 200 + r * 77); }
    } else if (fx === "chase") {
      // LED batten chase around the frame; steps on the beat, never a full-screen flash
      const seg = 18, head = (bi * 2 + Math.floor(t * 6)) % (seg * 2), pts = [];
      for (let i = 0; i < seg; i++) pts.push([W * (.04 + i / (seg - 1) * .92), H * .03]);
      for (let i = 0; i < 8; i++) pts.push([W * .015, H * (.1 + i * .1)], [W * .985, H * (.1 + i * .1)]);
      pts.forEach(([x, y], i) => { const d = Math.min(Math.abs(i - head), Math.abs(i + pts.length - head)), k = Math.exp(-d * .7) * (.5 + kick * .5) + .06; flare(x, y, i % 2 ? A : B, H * .05 * (.6 + k), Math.min(1, k * m)); });
    } else if (fx === "follow") {
      main.globalCompositeOperation = "source-over"; main.fillStyle = `rgba(0,0,0,${.32 * Math.min(1, m)})`; main.fillRect(0, 0, W, H); main.globalCompositeOperation = "lighter";
      const fy = H * (photo ? .8 : .9), warm = [255, 240, 220];
      for (let i = 0; i < 3; i++) {
        const sx = W * (.5 + Math.sin(t * (.23 + i * .07) * sp + i * 2.1) * .38), sy = fy + Math.sin(t * .4 + i) * H * .04, ox = W * (.2 + i * .3), oy = ty + 12;
        const ang = Math.atan2(sx - ox, sy - oy), d = Math.hypot(sx - ox, sy - oy), spr = H * .07 / d;
        beam(ox, oy, ang, d * 1.05, spr, warm, (.32 + kick * .18) * m);
        g.save(); g.translate(sx, sy); g.scale(1, .3); const sg = g.createRadialGradient(0, 0, 0, 0, 0, H * .12); sg.addColorStop(0, `rgba(255,248,235,${.8 * Math.min(1, m)})`); sg.addColorStop(.6, `rgba(${col(A)},${.25 * m})`); sg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = sg; g.fillRect(-H * .12, -H * .12, H * .24, H * .24); g.restore();
        flare(ox, oy, warm, H * .05, .9);
      }
    }
  };
  // a reaction from anyone in the room fires a matching light: heart sweep, fire floor flames, sparkle burst, wave of light
  // a reaction from anyone in the room fires a matching light in the visible top of the stage
  const drawReacts = (t) => {
    const now = performance.now(), wid = Math.max(1, Math.min(W, H) / 650);
    reacts = reacts.filter(r => now - r.at < 1800);
    for (const r of reacts) {
      const k = (now - r.at) / 1800, c = REACT_RGB[r.kind], a = Math.pow(1 - k, 1.4);
      if (r.kind === "heart") {
        // two pink beams sweep in from the top corners and cross over the stage
        for (const s of [-1, 1]) { const ang = -s * (1.05 - k * 1.5); for (let j = 0; j < 3; j++) beam(s < 0 ? W * .02 : W * .98, -H * .02, ang - j * .09 * s, H * 1.5, .07, c, a); beam(s < 0 ? W * .02 : W * .98, -H * .02, ang, H * 1.5, .016, [255, 255, 255], .9 * a); }
        g.fillStyle = `rgba(${col(c)},${.22 * a})`; g.fillRect(0, 0, W, H);
      } else if (r.kind === "fire") {
        // flame flares burst along the truss line and a warm wash rolls down
        for (let i = 0; i < 7; i++) { const x = W * (.08 + i * .14), fl = 1 + Math.sin(k * 26 + i * 1.7) * .25; flare(x, H * .05, c, H * .24 * fl, a); flare(x, H * .05, [255, 230, 160], H * .08 * fl, a); beam(x, H * .05, (i - 3) * .06, H * .8 * (1 - k * .5), .11, c, a); }
        const wg = g.createLinearGradient(0, 0, 0, H * .6); wg.addColorStop(0, `rgba(255,140,40,${.5 * a})`); wg.addColorStop(1, "rgba(255,80,0,0)"); g.fillStyle = wg; g.fillRect(0, 0, W, H * .6);
      } else if (r.kind === "spark") {
        for (const p of r.pts) { const tw = Math.max(0, Math.sin((k * 3 + p[2]) * Math.PI)); flare(p[0] * W, p[1] * H, c, H * .07 * (1 + tw), Math.min(1, tw * a * 2)); flare(p[0] * W, p[1] * H, [255, 220, 120], H * .025 * (1 + tw), Math.min(1, tw * a * 2)); }
      } else {
        // a band of cyan light rolls across the room with a laser riding it
        const x = -W * .2 + k * W * 1.4, wg = g.createLinearGradient(x - W * .18, 0, x + W * .18, 0);
        wg.addColorStop(0, `rgba(${col(c)},0)`); wg.addColorStop(.5, `rgba(${col(c)},${.8 * a})`); wg.addColorStop(1, `rgba(${col(c)},0)`); g.fillStyle = wg; g.fillRect(0, 0, W, H);
        g.fillStyle = `rgba(255,255,255,${.06 * a})`; g.fillRect(0, 0, W, H);
        for (let i = 0; i < 3; i++) laser(0, H * (.12 + i * .1) + Math.sin(k * 8 + i) * H * .05, Math.sin(k * 4 + i) * .08, W * 1.1, c, a, wid * 2.6, t * 220 + i * 90);
      }
    }
  };
  const bolt = () => {
    const x0 = rnd(.15, .85) * W, pts = [[x0, 0]]; let x = x0, y = 0;
    while (y < H * rnd(.55, .9)) { y += rnd(.04, .09) * H; x += rnd(-.07, .07) * W; pts.push([x, y]); }
    return { pts, age: 0, life: rnd(.14, .26) };
  };
  function paint(t, dt) {
    const e = mom ? (performance.now() - mom.at) / 1000 : 99, kind = e < 4.8 ? mom.kind : null;
    const m = [0, .55, .85, 1.15][S.power] * (kind === "drop" && e < 3 ? 1.5 : 1);
    const beat = (t * S.bpm / 60) % 1, kick = L.live ? beatEnv : Math.pow(1 - beat, 3) * (S.playing ? 1 : .35);
    const live = L.live ? .75 + L.level * .7 : 1;
    // a vote tints the rig for a few seconds: fire hot and fast, chill blue and slow, vibe magenta
    const mf = moodT ? clamp(1 - (performance.now() - moodT.at) / 3600, 0, 1) : 0, tint = (c) => mf ? c.map((v, i) => lerp(v, MOOD_RGB[moodT.kind][i], mf * .75)) : c;
    const heatK = (.75 + S.heat / 100 * .6) * (mf && moodT.kind === "energy" ? 1 + mf * .8 : mf && moodT.kind === "chill" ? 1 - mf * .5 : 1), flip = kind === "flip" && e < 3.2;
    const A = tint(flip ? cur.b : cur.a), B = tint(flip ? cur.a : cur.b);
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, `rgb(${col(cur.dark, .16)})`); bg.addColorStop(.6, `rgb(${col(cur.dark, .38)})`); bg.addColorStop(1, `rgb(${col(cur.dark, .62)})`);
    g.globalCompositeOperation = "source-over";
    if (photo) g.clearRect(0, 0, W, H); else { g.fillStyle = bg; g.fillRect(0, 0, W, H); }
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) {
      const hx = W * (.15 + i * .24) + Math.sin(t * .13 + i * 2) * W * .06, hy = H * (.42 + Math.cos(t * .17 + i) * .08), hr = W * .34;
      const hz = g.createRadialGradient(hx, hy, 0, hx, hy, hr); hz.addColorStop(0, `rgba(${col(i % 2 ? B : A)},${.17 * m * heatK})`); hz.addColorStop(1, `rgba(${col(A)},0)`);
      g.fillStyle = hz; g.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
    }
    // LED wall
    if (!photo && W > 520 && S.power > 0) {
      const sw = W * .17, sh = H * .062, sx = W * .5 - sw / 2, sy = H * .042;
      g.globalAlpha = (.28 + kick * .22) * Math.min(1, m); g.fillStyle = `rgb(${col(A, .35)})`; g.fillRect(sx, sy, sw, sh);
      g.font = `900 ${Math.round(sh * .3)}px Impact,'Arial Narrow',sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = `rgb(${col(B)})`; g.globalAlpha = .8 * Math.min(1, m);
      ["MUSIC BRINGS", "BETTER STRANGERS"].forEach((line, i) => g.fillText(line, sx + sw / 2, sy + sh * (.3 + i * .42), sw * .92)); g.globalAlpha = 1;
    }
    // beams (into the haze layer on capable devices)
    const bi = L.live ? beats : Math.floor(t * S.bpm / 60);
    ledWall(t, A, B, m, kick, bi);
    if (rich) { blg.globalCompositeOperation = "source-over"; blg.clearRect(0, 0, W, H); g = blg; g.globalCompositeOperation = "lighter"; godRays(t, A, B, m); }
    if (S.power > 0 && SPECIAL.has(S.fx)) special(S.fx, t, A, B, m * live, kick, bi, heatK, H * .022);
    else if (S.power > 0) {
      const n = [0, 5, 8, 12][S.power], sp = (kind === "drop" ? 1.9 : 1) * heatK, al = (.34 + kick * .42) * m * live, fx = S.fx, ty = H * .022, oy = ty + 12;
      if (!photo && fx !== "crossfire" && fx !== "tunnel") truss(ty, Array.from({ length: n }, (_, i) => W * (.08 + (n === 1 ? .5 : i / (n - 1)) * .84)));
      // neon laser fans run in every beam scene; the pattern follows the scene, or rotates every 8 bars
      if (S.power >= 2 && fx !== "bloom") lasers(t, A, B, m, kick, fx === "sweep" ? 0 : fx === "pulse" ? 3 : fx === "crossfire" ? (Math.floor(bi / 8) % 2 ? 2 : 1) : Math.floor(bi / 32) % 4);
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
        flare(ox, oy, c, H * .08, Math.min(1, .45 + kick * .5) * Math.min(1, m));
      }
      if (fx === "tunnel") for (let r = 0; r < 5; r++) { const k = ((t * .25 * sp + r / 5) % 1); g.strokeStyle = `rgba(${col(r % 2 ? B : A)},${(1 - k) * .3 * m})`; g.lineWidth = 1 + k * 3; g.beginPath(); g.ellipse(W / 2, H * .5, W * .6 * k, H * .45 * k, 0, 0, TAU); g.stroke(); }
    }
    if (rich) {
      // smoke: keep the light only where there is haze, drifting at two speeds, then add it to the stage
      const hz = Math.max(1.6, W / 330); hazePat.setTransform?.(new DOMMatrix([hz, 0, 0, hz, -t * 9 * hz / 2.2 % (256 * hz), Math.sin(t * .05) * 30 * hz / 2.2]));
      g.globalCompositeOperation = "destination-in"; g.fillStyle = hazePat; g.fillRect(0, 0, W, H);
      g = main; g.globalCompositeOperation = "lighter"; g.drawImage(bl, 0, 0);
      // and a faint lit haze over everything
      const hm = Math.max(2.2, W / 240); hazeMain.setTransform?.(new DOMMatrix([hm, 0, 0, hm, t * 6 * hm / 3 % (256 * hm), 0]));
      g.globalAlpha = .05 + (L.live ? L.level * .05 : .02); g.fillStyle = hazeMain; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    }
    g = main; g.globalCompositeOperation = "lighter"; drawReacts(t);
    // blinders on a detected drop, and a strobe on hard kicks at peak heat (capped at 3 flashes a second)
    blind *= Math.exp(-dt / .4); strobe *= Math.exp(-dt / .05);
    if (onset && S.power === 3 && S.heat >= 75 && t - lastStrobe > .34) { strobe = 1; lastStrobe = t; }
    if (blind > .02) {
      for (let i = 0; i < 6; i++) flare(W * (.12 + i * .152), H * .05, [255, 214, 160], H * .22 * (.6 + blind * .6), blind);
      g.fillStyle = `rgba(255,220,180,${blind * .22})`; g.fillRect(0, 0, W, H);
    }
    if (strobe > .02) { g.fillStyle = `rgba(255,255,255,${strobe * .2})`; g.fillRect(0, 0, W, H); }
    // dust in the light
    g.fillStyle = "#fff";
    for (const d of dust) { d.y -= d.z * 6 * dt; d.x += Math.sin(t * .4 + d.p) * .2; if (d.y < -2) { d.y = H + 2; d.x = Math.random() * W; } g.globalAlpha = (.12 + .2 * Math.sin(t * 1.1 + d.p) ** 2) * d.z * Math.min(1, m + .2); g.fillRect(d.x, d.y, Math.max(1, d.z * 1.4), Math.max(1, d.z * 1.4)); }
    g.globalAlpha = 1;
    // floor wash
    const fl = g.createLinearGradient(0, H * .62, 0, H); fl.addColorStop(0, `rgba(${col(B)},0)`); fl.addColorStop(1, `rgba(${col(A)},${(.26 + kick * .16) * Math.min(1.2, m)})`); g.fillStyle = fl; g.fillRect(0, H * .62, W, H * .38);
    if (!photo) {
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
    listen(dt, ts); paint(ts, dt);
    onLevels?.(L.live ? { bass: L.bass, level: L.level, kick: beatEnv, live: true } : { bass: Math.pow(1 - (ts * S.bpm / 60) % 1, 3) * (S.playing ? .45 : .15), level: 0, kick: 0, live: false });
    return true;
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
    audio(node) { an = node; buf = node ? new Uint8Array(node.frequencyBinCount) : null; },
    react(kind) { if (S.still || !REACT_RGB[kind]) return; reacts.push({ kind, at: performance.now(), pts: Array.from({ length: 40 }, () => [Math.random(), .02 + Math.random() * .4, Math.random()]) }); if (reacts.length > 8) reacts.shift(); },
    mood(kind) { if (!S.still && MOOD_RGB[kind]) moodT = { kind, at: performance.now() }; },
    moment(kind, at) { if (S.still || mom?.sat === at) return; mom = { kind, sat: at, at: performance.now() - clamp(Date.now() - at, 0, 4800) }; boltAt = 0; bolts = []; },
    setReduced(v) { S.still = v; if (v) { loop.stop(); cur.a = [...S.a]; cur.b = [...S.b]; cur.dark = [...S.dark]; mom = null; paint(2.2, 1 / 60); } else loop.start(); },
    destroy() { loop.stop(); removeEventListener("resize", resize); document.removeEventListener("visibilitychange", vis); }
  };
}

/* ───────────────────────── now-playing spectrum ───────────────────────── */
// Mirrored bars, pink → orange → cyan. Real FFT when an analyser is attached and sounding, a soft synthetic pulse otherwise.
export function createSpectrum(canvas, { reduced = false } = {}) {
  const g = canvas.getContext("2d");
  let an = null, buf = null, playing = false, still = reduced, visible = true, W = 2, H = 2, bars = [];
  const n = () => Math.max(24, Math.min(72, Math.round(W / (window.devicePixelRatio > 1 ? 9 : 6))));
  const draw = (t) => {
    g.clearRect(0, 0, W, H);
    const N = n(); if (bars.length !== N) bars = new Array(N).fill(0);
    let live = false;
    if (an && playing) { an.getByteFrequencyData(buf); live = buf.some(v => v > 4); }
    const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, "#ff3dd0"); gr.addColorStop(.5, "#ffae42"); gr.addColorStop(1, "#4fd9ff");
    const step = W / N, bw = Math.max(1, step * .55), mid = H / 2;
    g.fillStyle = gr; g.shadowColor = "rgba(255,61,208,.6)"; g.shadowBlur = 8;
    for (let i = 0; i < N; i++) {
      let v;
      if (live) { const lo = Math.floor(Math.pow(i / N, 1.7) * buf.length * .55) + 1, hi = Math.max(lo + 1, Math.floor(Math.pow((i + 1) / N, 1.7) * buf.length * .55) + 1); let s = 0; for (let k = lo; k < hi; k++) s += buf[k]; v = Math.pow(s / (hi - lo) / 255, .8) * (1 + i / N * 1.8); } // tilt: lift the quieter highs
      else v = (playing ? .35 : .14) + Math.sin(i * .9 + t * (playing ? 3.2 : 1.1)) * .12 * (playing ? 1 : .5) + Math.sin(i * .37 - t * 2.1) * .08;
      bars[i] = lerp(bars[i], clamp(v, .03, 1), live ? .55 : .2);
      const h = Math.max(2, bars[i] * H * .96);
      g.fillRect(i * step + (step - bw) / 2, mid - h / 2, bw, h);
    }
    g.shadowBlur = 0;
  };
  const loop = makeLoop((dt, t) => { draw(t); return visible && !still; });
  const resize = () => { const r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); W = Math.max(2, Math.round(r.width * dpr)); H = Math.max(2, Math.round(r.height * dpr)); canvas.width = W; canvas.height = H; draw(1); };
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null; ro?.observe(canvas);
  const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !still) loop.start(); }) : null; io?.observe(canvas);
  const vis = () => { if (document.hidden) loop.stop(); else if (visible && !still) loop.start(); };
  document.addEventListener("visibilitychange", vis);
  resize(); if (!still) loop.start();
  return {
    audio(node) { an = node; buf = node ? new Uint8Array(node.frequencyBinCount) : null; },
    playing(v) { playing = v; if (still) draw(1); },
    setReduced(v) { still = v; if (v) { loop.stop(); draw(1); } else loop.start(); },
    destroy() { loop.stop(); ro?.disconnect(); io?.disconnect(); document.removeEventListener("visibilitychange", vis); }
  };
}
