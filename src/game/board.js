// The pixel board: every tile is one lobule. A clone spreads outward from its origin tile,
// the most advanced stage in the core, earlier stages as a halo.

import { mulberry32 } from '../sim/rng.js';
import { N_LOBULES } from '../sim/engine.js';
import { STAGE_HEX, MINT, mixHex, shade } from './palette.js';

export const COLS = 24;
export const ROWS = 18;
const T = 8;
const PAD = 16;
export const W = COLS * T + PAD * 2;
export const H = ROWS * T + PAD * 2;

const BASE = STAGE_HEX.map((h) => ({ base: h, hi: shade(h, 0.35), lo: shade(h, -0.4) }));

function disc(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 1) ctx.fillRect(cx + x, cy + y, 1, 1);
}

export class PixelBoard {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    const rnd = mulberry32(5);
    this.tiles = [];
    const cx = (COLS - 1) / 2, cy = (ROWS - 1) / 2;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const e = ((c - cx) / (COLS / 2)) ** 2 + ((r - cy) / (ROWS / 2)) ** 2;
        if (e <= 1.02) this.tiles.push({ c, r, x: PAD + c * T, y: PAD + r * T, h: Math.floor(rnd() * 8), j: rnd() * 0.6 });
      }
    }
    this.n = this.tiles.length;
    this.scale = this.n / N_LOBULES;
    this.inMask = new Set(this.tiles.map((t) => t.r * COLS + t.c));
    this.target = new Float32Array(this.n);
    this.display = new Float32Array(this.n);
    this.rank = new Float32Array(this.n).fill(1e9);
    this.heal = new Uint8Array(this.n);
    this.focusKey = null;
    this.focusTile = 0;
    this.nodal = 0;
    this.dead = false;
    this.treated = false;
    this.beat = 0;
  }

  update(state) {
    const key = state.focus ? state.focus.join(',') : null;
    if (key && key !== this.focusKey) {
      this.focusKey = key;
      this.focusTile = Math.min(this.n - 1, Math.floor(state.focus[0] * this.n));
      const o = this.tiles[this.focusTile];
      const order = this.tiles.map((t, i) => ({ i, d: Math.hypot(t.c - o.c, (t.r - o.r) * 1.1) + t.j }));
      order.sort((a, b) => a.d - b.d);
      order.forEach((e, rank) => { this.rank[e.i] = rank; });
    }
    const s = this.scale;
    const x = state.x;
    const T4 = x[4] * s, T3 = T4 + x[3] * s, T2 = T3 + x[2] * s, T1 = T2 + x[1] * s;
    for (let i = 0; i < this.n; i++) {
      const r = this.rank[i];
      const c = (v) => Math.min(1, Math.max(0, v - r));
      this.target[i] = c(T1) + c(T2) + c(T3) + c(T4);
    }
    this.nodalTarget = state.nodal || state.distant ? 1 : 0;
    this.dead = state.status === 'dead';
    this.treated = state.status === 'treated';
    this.focus = state.focus;
  }

  draw(beat) {
    const { ctx } = this;
    this.beat = beat;
    ctx.clearRect(0, 0, W, H);

    // skin outline: pink edges wherever a tile borders the outside
    ctx.fillStyle = '#ff8fc4';
    for (const t of this.tiles) {
      const has = (dc, dr) => this.inMask.has((t.r + dr) * COLS + t.c + dc);
      if (!has(0, -1)) ctx.fillRect(t.x, t.y - 2, T, 2);
      if (!has(0, 1)) ctx.fillRect(t.x, t.y + T, T, 2);
      if (!has(-1, 0)) ctx.fillRect(t.x - 2, t.y, 2, T);
      if (!has(1, 0)) ctx.fillRect(t.x + T, t.y, 2, T);
    }

    for (let i = 0; i < this.n; i++) {
      const t = this.tiles[i];
      const prev = this.display[i];
      this.display[i] += (this.target[i] - prev) * 0.3;
      if (this.target[i] < prev - 0.12 && this.display[i] > 0.05) this.heal[i] = 7;
      const s = this.display[i];
      const lo = Math.min(4, Math.floor(s));
      const hi = Math.min(4, lo + 1);
      const f = s - lo;
      const a = BASE[lo];
      let body = a.base, light = a.hi, dark = a.lo;
      if (f > 0.04 && hi !== lo) {
        const b = BASE[hi];
        body = mixHex(a.base, b.base, f); light = mixHex(a.hi, b.hi, f); dark = mixHex(a.lo, b.lo, f);
      }
      if (this.dead) { body = '#5a4f7a'; light = '#7a6f9a'; dark = '#3a3052'; }
      const big = s >= 0.5 && ((beat + t.h) % 4 < 2);
      const o = big ? 0 : 1;
      const sz = big ? 8 : 6;
      ctx.fillStyle = dark; ctx.fillRect(t.x + o, t.y + o, sz, sz);
      ctx.fillStyle = body; ctx.fillRect(t.x + o, t.y + o, sz - 1, sz - 1);
      ctx.fillStyle = light; ctx.fillRect(t.x + o, t.y + o, sz - 2, 1); ctx.fillRect(t.x + o, t.y + o, 1, sz - 2);
      if (s >= 3.5 && (beat + t.h) % 3 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(t.x + 3, t.y + 3, 2, 2); }
      if (s >= 3.6) {
        ctx.fillStyle = body;
        const k = (beat + t.h) % 2;
        ctx.fillRect(t.x - 1 + k, t.y - 1, 1, 1); ctx.fillRect(t.x + T - k, t.y + T, 1, 1);
      }
      if (this.heal[i] > 0) {
        ctx.fillStyle = MINT;
        const h = this.heal[i];
        ctx.fillRect(t.x + 3, t.y + 3 - (7 - h), 2, 2);
        ctx.fillRect(t.x + 1 + (7 - h) % 3, t.y + 5, 1, 1);
        this.heal[i]--;
      }
    }

    // nipple and areola
    const cx = Math.round(W / 2), cy = Math.round(H / 2);
    disc(ctx, cx, cy, 7, '#2a1a4a');
    disc(ctx, cx, cy, 6, '#ff9ec7');
    disc(ctx, cx, cy, 3, '#ff4f93');
    ctx.fillStyle = '#fff'; ctx.fillRect(cx - 1, cy - 2, 1, 1);

    // lymph nodes
    this.nodal += (this.nodalTarget - this.nodal) * 0.2;
    const hot = this.nodal > 0.5;
    const nodes = [[W - 12, 11], [W - 8, 22], [W - 17, 24]];
    ctx.fillStyle = hot ? '#ff3347' : '#7fb6ff';
    ctx.fillRect(W - 26, 17, 1, 1); ctx.fillRect(W - 22, 18, 1, 1); ctx.fillRect(W - 19, 19, 1, 1);
    nodes.forEach(([nx, ny], k) => {
      const blink = hot && (beat + k) % 4 < 2;
      disc(ctx, nx, ny, 3, '#2a1a4a');
      disc(ctx, nx, ny, 2, hot ? (blink ? '#ffd1d6' : '#ff3347') : '#9fd0ff');
    });

    if (this.dead) { ctx.fillStyle = 'rgba(20,12,36,0.55)'; ctx.fillRect(0, 0, W, H); }
  }
}
