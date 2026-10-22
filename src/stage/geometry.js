// Procedural filament geometry. Everything is built as line segments with per-vertex attributes:
//   position, color, aT (0..1 along the strand), aSeed (per strand), aA (alpha weight), aG (group id)
// Coordinates: x lateral, y up, z toward the viewer. The figure is about 3 units tall.

import * as THREE from 'three';
import { mulberry32 } from '../sim/rng.js';

const tmp = new THREE.Color();

export class Lines {
  constructor() { this.pos = []; this.col = []; this.t = []; this.seed = []; this.a = []; this.g = []; }

  strand(points, rgb, seed, alpha = 1, group = 0) {
    const n = points.length;
    for (let i = 0; i < n - 1; i++) {
      const p = points[i], q = points[i + 1];
      this.pos.push(p[0], p[1], p[2], q[0], q[1], q[2]);
      this.col.push(rgb[0], rgb[1], rgb[2], rgb[0], rgb[1], rgb[2]);
      this.t.push(i / (n - 1), (i + 1) / (n - 1));
      this.seed.push(seed, seed);
      this.a.push(alpha, alpha);
      this.g.push(group, group);
    }
  }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(this.t, 1));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(this.seed, 1));
    g.setAttribute('aA', new THREE.Float32BufferAttribute(this.a, 1));
    g.setAttribute('aG', new THREE.Float32BufferAttribute(this.g, 1));
    return g;
  }
}

export function hsl(h, s, l) {
  tmp.setHSL(((h % 1) + 1) % 1, s, l);
  return [tmp.r, tmp.g, tmp.b];
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const wander = (k, ph) => Math.sin(k * 0.37 + ph) * 0.6 + Math.sin(k * 0.91 + ph * 1.7) * 0.4;

// ---------------------------------------------------------------- silhouette

const RIGHT = [
  [0.064, 1.40], [0.070, 1.30], [0.078, 1.255],
  [0.16, 1.225], [0.26, 1.195], [0.335, 1.150], [0.375, 1.085],
  [0.395, 0.99], [0.405, 0.86], [0.425, 0.70], [0.455, 0.52], [0.470, 0.34], [0.470, 0.16], [0.462, -0.02], [0.455, -0.14],
  [0.445, -0.20], [0.415, -0.21], [0.395, -0.15],
  [0.385, -0.02], [0.380, 0.16], [0.372, 0.34], [0.350, 0.52], [0.318, 0.69], [0.287, 0.80],
  [0.275, 0.70], [0.255, 0.55], [0.228, 0.40], [0.205, 0.25], [0.215, 0.10], [0.255, -0.05], [0.305, -0.20],
  [0.318, -0.42], [0.300, -0.75], [0.280, -1.05], [0.265, -1.30],
];
const POLY = [...RIGHT, ...RIGHT.slice().reverse().map(([x, y]) => [-x, y])];

function inPoly(x, y) {
  let c = false;
  for (let i = 0, j = POLY.length - 1; i < POLY.length; j = i++) {
    const [xi, yi] = POLY[i], [xj, yj] = POLY[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function bodyColor(x, y, seed) {
  // head violet-blue, chest pink-white core, torso mint, hips violet; small per-strand hue drift
  const j = (seed - 0.5) * 0.10;
  if (y > 1.28) return hsl(0.64 + j, 0.75, 0.62);
  if (y > 0.95) return hsl(0.78 + j, 0.7, 0.66);
  if (y > 0.45) return hsl(0.90 + j * 1.3, 0.72, 0.72);
  if (y > -0.05) return hsl(0.50 + j, 0.62, 0.62);
  return hsl(0.70 + j, 0.7, 0.6);
}

function bodyZ(x, y, k, ph, seed) {
  const chest = smooth(0.42, 0.62, y) * (1 - smooth(0.78, 0.95, y)) * (1 - smooth(0.20, 0.30, Math.abs(x)));
  const th = 0.075 + 0.025 * smooth(0.0, 0.6, y) - 0.03 * smooth(0.95, 1.2, y) - (Math.abs(x) > 0.3 ? 0.035 : 0);
  return th * Math.sin(ph + k * 0.28) * (0.55 + 0.45 * seed) + chest * 0.03;
}

function dirAt(x, y, ph, k) {
  const sh = smooth(0.95, 1.2, y);
  const sx = x >= 0 ? 1 : -1;
  const dx = sx * sh * 0.85 * (Math.abs(x) > 0.05 ? 1 : 0.25) + 0.22 * wander(k, ph);
  const len = Math.hypot(dx, 1);
  return [dx / len, -1 / len];
}

export function buildBody(seed = 3, count = 1050) {
  const rnd = mulberry32(seed);
  const L = new Lines();
  let made = 0;
  while (made < count) {
    const x0 = (rnd() - 0.5) * 0.98, y0 = -1.28 + rnd() * 2.66;
    if (!inPoly(x0, y0)) continue;
    const ph = rnd() * 6.28, sd = rnd();
    const step = 0.034;
    const half = 11 + Math.floor(rnd() * 9);
    const walk = (dirSign) => {
      const out = [];
      let x = x0, y = y0;
      for (let k = 0; k < half; k++) {
        const [dx, dy] = dirAt(x, y, ph, k);
        let nx = x + dirSign * dx * step, ny = y + dirSign * dy * step;
        if (!inPoly(nx, ny)) { nx = x * 0.92; if (!inPoly(nx, ny)) break; }
        x = nx; y = ny;
        out.push([x, y, bodyZ(x, y, out.length * dirSign + half, ph, sd)]);
      }
      return out;
    };
    const back = walk(-1).reverse();
    const fwd = walk(1);
    const pts = [...back, [x0, y0, bodyZ(x0, y0, half, ph, sd)], ...fwd];
    if (pts.length < 6) continue;
    L.strand(pts, bodyColor(x0, y0, sd), sd, 0.55 + rnd() * 0.5, 0);
    made++;
  }

  // contour strands: hug the outline so the silhouette reads clearly
  const dense = [];
  for (let i = 0; i < POLY.length; i++) {
    const a = POLY[i], b = POLY[(i + 1) % POLY.length];
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.012));
    for (let k = 0; k < n; k++) dense.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  const N = dense.length;
  for (let s = 0; s < 340; s++) {
    const i0 = Math.floor(rnd() * N), len = 14 + Math.floor(rnd() * 26), off = 0.004 + rnd() * 0.03, sd = rnd(), ph = rnd() * 6.28;
    const pts = [];
    for (let k = 0; k < len; k++) {
      const p = dense[(i0 + k) % N], q = dense[(i0 + k + 1) % N], r = dense[(i0 + k + N - 1) % N];
      let tx = q[0] - r[0], ty = q[1] - r[1];
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      let nx = -ty, ny = tx;
      if (!inPoly(p[0] + nx * 0.01, p[1] + ny * 0.01)) { nx = -nx; ny = -ny; }
      const w = off + 0.006 * Math.sin(k * 0.5 + ph);
      pts.push([p[0] + nx * w, p[1] + ny * w, 0.04 * Math.sin(ph + k * 0.3)]);
    }
    L.strand(pts, bodyColor(dense[i0][0], dense[i0][1], sd), sd, 0.9 + rnd() * 0.5, 0);
  }

  // head: luminous ellipsoid made of loops
  for (let s = 0; s < 120; s++) {
    const sd = rnd(), ph = rnd() * 6.28, kind = rnd();
    const pts = [];
    const rx = 0.128, ry = 0.172, rz = 0.14;
    for (let k = 0; k <= 36; k++) {
      const u = (k / 36) * Math.PI * 2;
      let x, y, z;
      if (kind < 0.5) { const th = 0.2 + sd * 2.7; x = Math.sin(th) * Math.cos(u) * rx; y = 1.555 + Math.cos(th) * ry; z = Math.sin(th) * Math.sin(u) * rz; }
      else { const lon = sd * Math.PI; x = Math.sin(u) * Math.cos(lon) * rx; y = 1.555 + Math.cos(u) * ry; z = Math.sin(u) * Math.sin(lon) * rz; }
      pts.push([x + 0.002 * Math.sin(k + ph), y, z]);
    }
    L.strand(pts, hsl(0.66 + (sd - 0.5) * 0.12, 0.7, 0.66), sd, 0.4, 0);
  }

  // hair: long strands that fall past the shoulders
  for (let s = 0; s < 300; s++) {
    const sd = rnd(), ph = rnd() * 6.28, side = rnd() < 0.5 ? -1 : 1;
    const ang = (Math.PI * 0.12) + rnd() * Math.PI * 0.78;
    const sx = side * Math.cos(ang) * 0.13, sy = 1.56 + Math.sin(ang) * 0.17, sz = -0.02 - rnd() * 0.1;
    const len = 26 + Math.floor(rnd() * 12);
    const endX = side * (0.17 + rnd() * 0.17), endY = 0.88 + rnd() * 0.25, endZ = -0.06 - rnd() * 0.08;
    const pts = [];
    for (let k = 0; k < len; k++) {
      const t = k / (len - 1);
      const e = t * t * (3 - 2 * t);
      const sway = Math.sin(t * 6 + ph) * 0.015 * t;
      pts.push([sx + (endX - sx) * e + sway, sy + (endY - sy) * t, sz + (endZ - sz) * e + Math.cos(t * 5 + ph) * 0.01]);
    }
    L.strand(pts, hsl(0.93 + (sd - 0.5) * 0.14, 0.62, 0.68), sd, 0.75, 1);
  }
  return L.geometry();
}

// ---------------------------------------------------------------- gland

export const AFFECTED_SIDE = -1;                      // viewer's left breast
export const BREAST_C = (sx) => [sx * 0.14, 0.64, 0.085];
export const LESION_POS = (() => { const c = BREAST_C(AFFECTED_SIDE); return [c[0] - 0.055, c[1] + 0.05, c[2] + 0.04]; })();
export const NODES = [[-0.305, 0.84, 0.03], [-0.335, 0.80, 0.0], [-0.325, 0.885, 0.04], [-0.295, 0.76, 0.02], [-0.345, 0.85, -0.02], [-0.31, 0.915, 0.0]];

export function buildGland(sx, seed = 9) {
  const rnd = mulberry32(seed + (sx > 0 ? 100 : 0));
  const L = new Lines();
  const C = BREAST_C(sx);
  const A = 0.125, D = 0.095;
  const nip = [C[0], C[1] - 0.012, C[2] + D];
  const dome = (r, ph, depth = 1) => {
    const rr = Math.min(1, r);
    return [C[0] + Math.cos(ph) * rr * A, C[1] + Math.sin(ph) * rr * A * 0.97, C[2] + Math.sqrt(Math.max(0, 1 - rr * rr)) * D * depth];
  };
  const ductColor = (sd) => hsl(0.74 + (sd - 0.5) * 0.18, 0.7, 0.7);

  // dome surface: meridians define the breast form
  for (let m = 0; m < 46; m++) {
    const ph = (m / 46) * Math.PI * 2 + rnd() * 0.05, sd = rnd();
    const pts = [];
    for (let k = 0; k <= 22; k++) pts.push(dome(Math.sin((k / 22) * Math.PI * 0.5) * 0.985, ph, 1.0));
    L.strand(pts, hsl(0.92 + (sd - 0.5) * 0.08, 0.6, 0.78), sd, 0.55, 2);
  }
  for (let r = 1; r <= 5; r++) {
    const pts = [];
    for (let k = 0; k <= 48; k++) pts.push(dome((r / 5.5) * 0.99, (k / 48) * Math.PI * 2, 1.0));
    L.strand(pts, hsl(0.9, 0.55, 0.8), rnd(), 0.35, 2);
  }

  // duct tree: nipple to lobules, branching three times
  const branch = (from, to, level, sd, depth) => {
    const pts = [];
    const bow = (rnd() - 0.5) * 0.02 * (1 + level);
    for (let k = 0; k <= 14; k++) {
      const t = k / 14;
      const ease = t;
      pts.push([
        from[0] + (to[0] - from[0]) * ease + Math.sin(t * Math.PI) * bow,
        from[1] + (to[1] - from[1]) * ease + Math.sin(t * Math.PI) * bow * 0.7,
        from[2] + (to[2] - from[2]) * ease + Math.sin(t * Math.PI) * 0.006,
      ]);
    }
    const copies = level === 0 ? 3 : 1;
    for (let c = 0; c < copies; c++) {
      const off = c === 0 ? 0 : (rnd() - 0.5) * 0.004;
      L.strand(pts.map((p) => [p[0] + off, p[1] + off, p[2]]), ductColor(sd), sd, level === 0 ? 1.3 : 1.0 - level * 0.12, 3 + level);
    }
    if (level < 3) {
      const t1 = 0.45 + rnd() * 0.15;
      const p = pts[Math.round(t1 * 14)];
      const dir = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
      for (let b = 0; b < 2; b++) {
        const ang = (b === 0 ? 1 : -1) * (0.45 + rnd() * 0.5);
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const nd = [dir[0] * ca - dir[1] * sa, dir[0] * sa + dir[1] * ca, dir[2] * 0.6];
        const f = 0.55 - level * 0.1;
        branch(p, [p[0] + nd[0] * f, p[1] + nd[1] * f, Math.max(C[2] + 0.004, p[2] + nd[2] * f * 0.5)], level + 1, rnd(), depth);
      }
    }
    if (level >= 2) {
      // lobule tuft: a small curl at the end of the branch
      const tip = pts[14];
      const loop = [];
      const rad = 0.006 + rnd() * 0.005;
      for (let k = 0; k <= 12; k++) { const u = (k / 12) * Math.PI * 3; loop.push([tip[0] + Math.cos(u) * rad * (1 - k / 16), tip[1] + Math.sin(u) * rad * (1 - k / 16), tip[2] + Math.sin(u * 0.5) * rad * 0.6]); }
      L.strand(loop, hsl(0.58 + rnd() * 0.12, 0.7, 0.72), rnd(), 1.1, 7);
    }
  };
  const M = 15;
  for (let m = 0; m < M; m++) {
    const ph = (m / M) * Math.PI * 2 + (rnd() - 0.5) * 0.3;
    const r = 0.72 + rnd() * 0.22;
    const target = dome(r, ph, 0.82);
    branch(nip, target, 0, rnd(), 0);
  }

  // fine capillary filaments
  for (let s = 0; s < 220; s++) {
    const ph = rnd() * 6.28, r = 0.2 + rnd() * 0.75, sd = rnd();
    const a = dome(r, ph, 0.78), pts = [];
    let [x, y, z] = a;
    for (let k = 0; k < 10; k++) {
      x += Math.cos(ph + k * 0.5 + sd * 3) * 0.006; y += Math.sin(ph + k * 0.6 + sd * 5) * 0.006; z += (rnd() - 0.5) * 0.003;
      pts.push([x, y, z]);
    }
    L.strand(pts, hsl(0.55 + sd * 0.35, 0.65, 0.72), sd, 0.7, 7);
  }
  return L.geometry();
}

// ---------------------------------------------------------------- lesion, tendrils, lymph

export function buildLesion(seed = 21, count = 360) {
  const rnd = mulberry32(seed);
  const L = new Lines();
  for (let s = 0; s < count; s++) {
    const sd = rnd();
    // a curl wandering inside the unit sphere, denser near the middle
    let x = (rnd() - 0.5) * 1.2, y = (rnd() - 0.5) * 1.2, z = (rnd() - 0.5) * 1.2;
    const ph = rnd() * 6.28, pts = [];
    for (let k = 0; k < 11; k++) {
      x += Math.sin(ph + k * 1.1) * 0.22; y += Math.cos(ph * 1.3 + k * 0.9) * 0.22; z += Math.sin(ph * 0.7 + k * 1.3) * 0.2;
      const r = Math.hypot(x, y, z);
      if (r > 1) { const f = 1 / r; x *= f; y *= f; z *= f; }
      pts.push([x, y, z]);
    }
    L.strand(pts, [1, 1, 1], sd, 1, 0);
  }
  return L.geometry();
}

export function buildTendrils(seed = 33, count = 46) {
  const rnd = mulberry32(seed);
  const L = new Lines();
  const [cx, cy, cz] = LESION_POS;
  for (let s = 0; s < count; s++) {
    const sd = rnd();
    const az = rnd() * Math.PI * 2, el = (rnd() - 0.4) * 1.4;
    const dx = Math.cos(az) * Math.cos(el), dy = Math.sin(el) * 0.8, dz = Math.sin(az) * Math.cos(el) * 0.6 + 0.2;
    const len = 0.07 + rnd() * 0.09;
    const ph = rnd() * 6.28, pts = [];
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      pts.push([
        cx + dx * len * t + Math.sin(ph + t * 7) * 0.008 * t,
        cy + dy * len * t + Math.cos(ph + t * 6) * 0.008 * t,
        cz + dz * len * t * 0.6,
      ]);
    }
    L.strand(pts, [1, 1, 1], sd, 1, 0);
  }
  return L.geometry();
}

export function buildLymph() {
  const L = new Lines();
  const rnd = mulberry32(55);
  const [cx, cy, cz] = LESION_POS;
  NODES.forEach((n, i) => {
    for (let c = 0; c < 3; c++) {
      const sd = rnd(), pts = [];
      const bow = [(rnd() - 0.5) * 0.03, 0.03 + rnd() * 0.04, (rnd() - 0.5) * 0.02];
      for (let k = 0; k <= 22; k++) {
        const t = k / 22;
        pts.push([
          cx + (n[0] - cx) * t + bow[0] * Math.sin(t * Math.PI),
          cy + (n[1] - cy) * t + bow[1] * Math.sin(t * Math.PI),
          cz + (n[2] - cz) * t + bow[2] * Math.sin(t * Math.PI),
        ]);
      }
      L.strand(pts, [1, 1, 1], sd, 1, i);
    }
  });
  return L.geometry();
}

// ---------------------------------------------------------------- points

export function pointsGeometry(positions, seeds, sizes) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
  g.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
  return g;
}

export function buildNodePoints() {
  const rnd = mulberry32(61);
  const pos = [], seed = [], size = [];
  NODES.forEach((n) => { pos.push(...n); seed.push(rnd()); size.push(0.7 + rnd() * 0.5); });
  return pointsGeometry(pos, seed, size);
}

export function buildSparks(count = 520) {
  const rnd = mulberry32(71);
  const pos = [], seed = [], size = [];
  for (let i = 0; i < count; i++) {
    const u = rnd() * 2 - 1, th = rnd() * 6.28, r = Math.cbrt(rnd());
    const s = Math.sqrt(1 - u * u);
    pos.push(s * Math.cos(th) * r, u * r, s * Math.sin(th) * r);
    seed.push(rnd()); size.push(0.5 + rnd());
  }
  return pointsGeometry(pos, seed, size);
}

export function buildDrug(count = 700) {
  const rnd = mulberry32(81);
  const pos = [], seed = [], size = [];
  for (let i = 0; i < count; i++) { pos.push(0, 0, 0); seed.push(rnd()); size.push(0.4 + rnd() * 0.8); }
  return pointsGeometry(pos, seed, size);
}

export function buildDust(count = 900) {
  const rnd = mulberry32(91);
  const pos = [], seed = [], size = [];
  for (let i = 0; i < count; i++) {
    pos.push((rnd() - 0.5) * 7, (rnd() - 0.5) * 7, -2.5 - rnd() * 5);
    seed.push(rnd()); size.push(0.3 + rnd() * 0.7);
  }
  return pointsGeometry(pos, seed, size);
}

// ---------------------------------------------------------------- fx lines

export function buildScanner() {
  const L = new Lines();
  const [cx, cy, cz] = BREAST_C(AFFECTED_SIDE);
  for (let i = 0; i < 20; i++) {
    const y = (i / 19 - 0.5) * 0.04;
    L.strand([[cx - 0.16, y, cz + 0.13], [cx + 0.16, y, cz + 0.13]], [0.42, 0.89, 1.0], i / 20, 1, 0);
  }
  L.strand([[cx - 0.17, -0.02, cz + 0.13], [cx - 0.17, 0.02, cz + 0.13]], [1, 1, 1], 0.5, 1.5, 0);
  L.strand([[cx + 0.17, -0.02, cz + 0.13], [cx + 0.17, 0.02, cz + 0.13]], [1, 1, 1], 0.5, 1.5, 0);
  return L.geometry();
}

export function buildNeedle() {
  const L = new Lines();
  const p = LESION_POS;
  const pts = [];
  for (let k = 0; k <= 16; k++) { const t = k / 16; pts.push([p[0] - 0.30 * (1 - t), p[1] + 0.12 * (1 - t), p[2] + 0.20 * (1 - t)]); }
  L.strand(pts, [1, 1, 1], 0.2, 1.8, 0);
  return L.geometry();
}

export function buildRing() {
  const L = new Lines();
  const p = LESION_POS;
  for (let ax = 0; ax < 3; ax++) {
    const pts = [];
    for (let k = 0; k <= 64; k++) {
      const u = (k / 64) * Math.PI * 2, c = Math.cos(u), s = Math.sin(u);
      pts.push(ax === 0 ? [c, s, 0] : ax === 1 ? [c, 0, s] : [0, c, s]);
    }
    L.strand(pts, [1, 0.8, 0.9], ax / 3, 1.2, ax);
  }
  return L.geometry();
}

export function buildBeams() {
  const L = new Lines();
  const p = LESION_POS;
  const rnd = mulberry32(95);
  for (let b = 0; b < 9; b++) {
    const ang = (b / 9) * Math.PI * 0.9 - 0.2;
    const from = [p[0] - Math.cos(ang) * 0.5, p[1] + (rnd() - 0.5) * 0.12, p[2] + Math.sin(ang) * 0.5 + 0.12];
    const pts = [];
    for (let k = 0; k <= 20; k++) { const t = k / 20; pts.push([from[0] + (p[0] - from[0]) * t, from[1] + (p[1] - from[1]) * t, from[2] + (p[2] - from[2]) * t]); }
    L.strand(pts, [0.6, 0.92, 1], b / 9, 1.3, 0);
  }
  return L.geometry();
}

// ---------------------------------------------------------------- DNA helix

export function buildHelix() {
  const rnd = mulberry32(111);
  const L = new Lines();
  const H = 2.6, TURNS = 5.2, R = 0.2;
  const at = (t, strand) => {
    const u = t * TURNS * Math.PI * 2 + strand * Math.PI;
    return [Math.cos(u) * R, (t - 0.5) * H, Math.sin(u) * R];
  };
  const geneOf = (t) => (t > 0.62 && t < 0.80 ? 1 : t > 0.22 && t < 0.40 ? 2 : t > 0.84 && t < 0.92 ? 3 : 0);
  for (let s = 0; s < 2; s++) {
    for (let c = 0; c < 5; c++) {
      const off = (rnd() - 0.5) * 0.018, sd = rnd();
      for (let seg = 0; seg < 12; seg++) {
        const pts = [];
        const t0 = seg / 12, t1 = (seg + 1) / 12;
        for (let k = 0; k <= 22; k++) {
          const t = t0 + ((t1 - t0) * k) / 22;
          const p = at(t, s);
          pts.push([p[0] + off, p[1] + off * 0.5, p[2] + off]);
        }
        const g = geneOf((t0 + t1) / 2);
        L.strand(pts, hsl(s === 0 ? 0.74 : 0.52, 0.7, 0.68), sd, 0.9, g);
      }
    }
  }
  for (let i = 0; i < 150; i++) {
    const t = (i + 0.5) / 150;
    const a = at(t, 0), b = at(t, 1);
    const g = geneOf(t);
    const pts = [];
    for (let k = 0; k <= 8; k++) { const f = k / 8; pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]); }
    L.strand(pts, hsl(0.9 + rnd() * 0.15, 0.7, 0.72), rnd(), 0.8, g);
  }
  return L.geometry();
}

export function buildSpiral() {
  const L = new Lines();
  const C = BREAST_C(AFFECTED_SIDE);
  const A = 0.125, D = 0.095;
  const pts = [];
  const N = 220, turns = 3.2;
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const r = 0.04 + t * 0.93;
    const ph = t * turns * Math.PI * 2;
    pts.push([C[0] + Math.cos(ph) * r * A, C[1] + Math.sin(ph) * r * A * 0.97, C[2] + Math.sqrt(Math.max(0, 1 - r * r)) * D * 1.04]);
  }
  L.strand(pts, [1, 0.62, 0.85], 0.3, 1.6, 0);
  return L.geometry();
}
