// Procedural breast anatomy: lobules (TDLUs), the lactiferous duct tree and axillary nodes.
// Coordinates: x lateral (+ = lateral/outer), y superior, z anterior (chest wall at z = 0).

import { mulberry32 } from '../sim/rng.js';
import { N_LOBULES } from '../sim/engine.js';

export const R = 1.0;   // base radius
export const D = 0.78;  // projection
const N_DUCTS = 15;

export const sag = (p) => {
  p[1] -= 0.2 * (p[2] / D) * (p[2] / D);
  return p;
};

function gauss(rnd) {
  let u = 0;
  for (let i = 0; i < 4; i++) u += rnd();
  return (u - 2) / 0.577;
}

export const NIPPLE = sag([0, 0, D + 0.01]);

export function buildAnatomy(seed = 11) {
  const rnd = mulberry32(seed);

  // Lobules, denser in the upper-outer quadrant, plus an axillary tail
  const lob = [];
  const tail = Math.round(N_LOBULES * 0.07);
  while (lob.length < N_LOBULES - tail) {
    const r = 0.2 + 0.68 * Math.pow(rnd(), 0.75);
    const th = rnd() * Math.PI * 2;
    const ph = Math.acos(1 - rnd() * 0.9);
    const p = [r * Math.sin(ph) * Math.cos(th) * R, r * Math.sin(ph) * Math.sin(th) * R, r * Math.cos(ph) * D * 0.98];
    const upperOuter = p[0] > 0 && p[1] > 0 ? 1 : 0;
    if (rnd() > 0.6 + 0.4 * upperOuter) continue;
    if (p[0] * p[0] + p[1] * p[1] < 0.02 && p[2] > D * 0.7) continue;
    // keep lobules out of one another's way
    if (lob.some((q) => (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - sag(p.slice())[2]) ** 2 < 0.0028)) continue;
    lob.push(sag(p));
  }
  for (let i = 0; i < tail; i++) {
    const u = (i + 0.5) / tail;
    lob.push([0.78 + 0.62 * u + gauss(rnd) * 0.03, 0.34 + 0.4 * u + gauss(rnd) * 0.03, 0.13 + gauss(rnd) * 0.02]);
  }

  // Main lactiferous ducts radiate from the nipple toward the base
  const ductFar = [];
  for (let m = 0; m < N_DUCTS; m++) {
    const th = (m / N_DUCTS) * Math.PI * 2 + (rnd() - 0.5) * 0.25;
    const len = 0.76 + rnd() * 0.16;
    ductFar.push(sag([Math.cos(th) * len * R, Math.sin(th) * len * R, 0.1 + rnd() * 0.1]));
  }
  ductFar.push([1.36, 0.74, 0.13]); // axillary-tail duct
  const nd = ductFar.length;

  const distToSeg = (p, a, b) => {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / (ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2])));
    const q = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
    return { d: Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]), t, q };
  };

  const ductOf = new Int16Array(N_LOBULES);
  const proj = new Array(N_LOBULES);
  const downstream = Array.from({ length: nd }, () => []);
  for (let i = 0; i < N_LOBULES; i++) {
    let best = 1e9, bm = 0, bt = 0, bq = null;
    for (let m = 0; m < nd; m++) {
      const r = distToSeg(lob[i], NIPPLE, ductFar[m]);
      if (r.d < best) { best = r.d; bm = m; bt = r.t; bq = r.q; }
    }
    ductOf[i] = bm;
    proj[i] = { t: bt, q: bq };
    downstream[bm].push({ i, t: bt });
  }
  downstream.forEach((arr) => arr.sort((a, b) => a.t - b.t));

  const nodes = [];
  for (let i = 0; i < 6; i++) nodes.push([1.5 + gauss(rnd) * 0.04 + i * 0.02, 0.8 + gauss(rnd) * 0.05 + i * 0.035, 0.17 + gauss(rnd) * 0.03]);

  const jitter = new Float32Array(N_LOBULES);
  for (let i = 0; i < N_LOBULES; i++) jitter[i] = rnd() * 0.16;
  const spin = Array.from({ length: N_LOBULES }, () => [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, 0.8 + rnd() * 0.5]);

  return { lob, ductFar, nd, nodes, proj, ductOf, downstream, jitter, spin, nipple: NIPPLE };
}

// Rank lobules by distance from the lesion focus. Rank 0 = origin of the clone.
export function rankFromFocus(anatomy, focus) {
  const { lob, jitter } = anatomy;
  const f = focus ?? [0.5, 0.5, 0.5];
  const fi = Math.min(N_LOBULES - 1, Math.floor(f[0] * N_LOBULES));
  const o = lob[fi];
  const order = lob.map((p, i) => ({ i, d: Math.hypot(p[0] - o[0], p[1] - o[1], p[2] - o[2]) + jitter[i] }));
  order.sort((a, b) => a.d - b.d);
  const rank = new Float32Array(N_LOBULES);
  order.forEach((e, r) => { rank[e.i] = r; });
  return { rank, focusLobule: fi };
}
