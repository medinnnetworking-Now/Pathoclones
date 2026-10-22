// A pixelated nebula: low-resolution fractal noise quantised to a small palette with ordered dithering.

const PURPLES = ['#0a0516', '#150b2e', '#241247', '#3a1b66', '#5a2a85', '#8a3d9c'];
const BLUES = ['#0a0516', '#0e1233', '#13245c', '#1b3d8c', '#2f66b8', '#5aa0d8'];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) {
  let s = 0, a = 0.5;
  for (let i = 0; i < 5; i++) { s += a * vnoise(x, y); x *= 2.02; y *= 2.02; a *= 0.5; }
  return s;
}

const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

export function paintNebula(canvas, scale = 5) {
  const w = Math.max(64, Math.ceil(window.innerWidth / scale));
  const h = Math.max(64, Math.ceil(window.innerHeight / scale));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  const pp = PURPLES.map(rgb), bb = BLUES.map(rgb);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = x / w * 3.2, ny = y / h * 2.2;
      const q = fbm(nx + 4, ny + 1);
      const v = fbm(nx + 1.7 * q, ny + 1.7 * (1 - q));
      const tone = fbm(nx * 0.6 + 9, ny * 0.6);
      const ramp = tone > 0.5 ? bb : pp;
      const lvl = Math.min(1, Math.max(0, (v - 0.12) * 2.4)) * (ramp.length - 1);
      const base = Math.floor(lvl);
      const frac = lvl - base;
      const th = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      const c = ramp[Math.min(ramp.length - 1, base + (frac > th ? 1 : 0))];
      const i = (y * w + x) * 4;
      img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
      if (hash(x * 7, y * 13) > 0.9965) { img.data[i] = 233; img.data[i + 1] = 228; img.data[i + 2] = 255; }
    }
  }
  ctx.putImageData(img, 0, 0);
}
