// Shaders. Everything is additive light on black.

const COMMON_VERT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uLesionPos;
  uniform float uLesionR;
  uniform vec3 uLesionCol;
  uniform float uLesionOn;
  uniform float uExcise;
  uniform float uExciseR;
  uniform vec3 uFocusPos;
  uniform float uFocusR;
`;

// Body, hair, gland and helix strands.
export const filamentVertex = /* glsl */ `
  ${COMMON_VERT}
  attribute vec3 color;
  attribute float aT;
  attribute float aSeed;
  attribute float aA;
  attribute float aG;
  uniform float uOpacity;
  uniform float uGene;
  uniform float uHair;
  uniform float uRisk;
  varying vec3 vCol;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    p += vec3(
      sin(uTime * 0.5 + aSeed * 40.0 + p.y * 6.0),
      cos(uTime * 0.43 + aSeed * 31.0 + p.x * 6.0),
      sin(uTime * 0.37 + aSeed * 23.0 + p.z * 6.0)) * 0.0032;
    if (uHair > 0.5 && aG > 0.5 && aG < 1.5) p.x += sin(uTime * 0.7 + aSeed * 10.0 + aT * 3.0) * 0.012 * aT;

    vec3 base = color;
    float d = distance(p, uLesionPos);
    float k = uLesionOn * smoothstep(uLesionR * 2.6, uLesionR * 0.5, d);
    base = mix(base, uLesionCol, k);
    float rk = clamp(uRisk, -1.0, 1.0);
    base = mix(base, vec3(1.0, 0.42, 0.30), max(rk, 0.0) * 0.5);
    base = mix(base, vec3(0.5, 1.0, 0.85), max(-rk, 0.0) * 0.3);
    float alpha = aA * uOpacity * (1.0 + k * 1.8) * (1.0 - 0.25 * max(rk, 0.0) + 0.2 * max(-rk, 0.0));

    if (uFocusR > 0.0) alpha *= smoothstep(uFocusR * 1.6, uFocusR * 0.45, distance(p, uFocusPos));
    if (uExcise > 0.0) alpha *= 1.0 - uExcise * smoothstep(uExciseR * 1.02, uExciseR * 0.92, d);
    if (uGene > -0.5) {
      float on = 1.0 - step(0.5, abs(aG - uGene));
      base = mix(base, vec3(1.0, 0.85, 0.95), on * 0.55);
      alpha *= mix(0.4, 2.6, on);
    }
    vCol = base;
    vAlpha = alpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

export const lineFragment = /* glsl */ `
  varying vec3 vCol;
  varying float vAlpha;
  void main() { gl_FragColor = vec4(vCol, vAlpha); }
`;

// The tumor mass: curls inside a unit sphere scaled by the lesion radius.
export const lesionVertex = /* glsl */ `
  attribute float aT;
  attribute float aSeed;
  uniform float uTime;
  uniform vec3 uCenter;
  uniform float uR;
  uniform float uAmt;
  uniform float uJit;
  uniform float uCore;
  uniform vec3 uCol;
  varying vec3 vCol;
  varying float vAlpha;

  void main() {
    float r = length(position);
    vec3 p = position * uR * (1.0 + 0.10 * sin(uTime * 2.0 + aSeed * 20.0));
    p += vec3(
      sin(uTime * 3.1 + aSeed * 50.0 + aT * 6.0),
      cos(uTime * 2.7 + aSeed * 37.0 + aT * 5.0),
      sin(uTime * 2.3 + aSeed * 29.0 + aT * 7.0)) * uJit * uR * 0.22;
    vCol = mix(uCol, vec3(1.0), smoothstep(0.7, 0.0, r) * uCore);
    float vis = 1.0 - step(uAmt, aSeed);
    vAlpha = vis * 0.24 * (0.55 + 0.9 * (1.0 - r));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(uCenter + p, 1.0);
  }
`;

// Invasive tendrils reaching outward from the mass.
export const tendrilVertex = /* glsl */ `
  attribute float aT;
  attribute float aSeed;
  uniform float uTime;
  uniform vec3 uCenter;
  uniform float uTend;
  uniform float uScale;
  uniform vec3 uCol;
  varying vec3 vCol;
  varying float vAlpha;

  void main() {
    vec3 p = uCenter + (position - uCenter) * uScale;
    p += vec3(sin(uTime * 1.3 + aSeed * 40.0 + aT * 5.0), cos(uTime * 1.1 + aSeed * 30.0), sin(uTime + aSeed * 20.0)) * 0.004 * aT;
    float vis = 1.0 - step(uTend * (0.55 + 0.45 * aSeed) + 0.0001, aT);
    vCol = mix(uCol, vec3(1.0), 0.25 * (1.0 - aT));
    vAlpha = vis * 0.85 * (1.0 - aT * 0.55);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

// Lymph channels with a travelling pulse.
export const lymphVertex = /* glsl */ `
  attribute float aT;
  attribute float aSeed;
  uniform float uTime;
  uniform float uSpread;
  uniform vec3 uCol;
  varying vec3 vCol;
  varying float vAlpha;

  void main() {
    float vis = 1.0 - step(uSpread + 0.0001, aT);
    float pulse = pow(max(0.0, 1.0 - abs(fract(uTime * 0.3 + aSeed) - aT) * 9.0), 2.0);
    vCol = mix(uCol, vec3(1.0), pulse * 0.7);
    vAlpha = vis * (0.35 + pulse * 1.2);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Glowing points: nodes, sparks, drug particles, dust.
export const pointVertex = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uScale;
  uniform float uMode;      // 0 nodes, 1 sparks, 2 drug, 3 dust
  uniform float uAmt;
  uniform float uSize;
  uniform vec3 uCenter;
  uniform float uR;
  uniform vec3 uCol;
  uniform float uHot;
  varying vec3 vCol;
  varying float vAlpha;

  float hash(float n) { return fract(sin(n) * 43758.5453); }

  void main() {
    vec3 p = position;
    float alpha = 0.0;
    vec3 col = uCol;
    float size = aSize * uSize;
    if (uMode < 0.5) {                               // lymph nodes
      col = mix(vec3(0.62, 0.84, 1.0), vec3(1.0, 0.28, 0.36), uHot);
      float sentinel = step(aSeed, 0.34);
      alpha = (0.55 + 0.5 * uHot) * (1.0 - uAmt * sentinel);
      size *= 1.0 + 1.2 * uHot + 0.2 * sin(uTime * 2.0 + aSeed * 9.0);
    } else if (uMode < 1.5) {                        // sparks around the lesion
      vec3 j = vec3(sin(uTime * 2.1 + aSeed * 60.0), cos(uTime * 1.7 + aSeed * 45.0), sin(uTime * 1.3 + aSeed * 33.0));
      p = uCenter + position * uR * 1.35 + j * uR * 0.18;
      alpha = uAmt * 0.6 * (0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * 4.0 + aSeed * 80.0), 3.0));
    } else if (uMode < 2.5) {                        // drug flowing in from the shoulder
      float t = fract(uTime * 0.22 + aSeed);
      float e = t * t * (3.0 - 2.0 * t);
      vec3 start = uCenter + vec3(-0.28 - aSeed * 0.12, 0.34 + hash(aSeed * 7.0) * 0.12, 0.14);
      vec3 end = uCenter + (vec3(hash(aSeed * 11.0), hash(aSeed * 13.0), hash(aSeed * 17.0)) - 0.5) * uR * 3.0;
      p = mix(start, end, e) + vec3(sin(t * 9.0 + aSeed * 30.0), cos(t * 8.0 + aSeed * 20.0), 0.0) * 0.012 * (1.0 - e);
      col = mix(vec3(0.42, 0.89, 1.0), vec3(1.0), 0.35);
      alpha = uAmt * sin(3.14159 * t);
    } else {                                         // dust
      p.x += sin(uTime * 0.05 + aSeed * 30.0) * 0.1;
      p.y += cos(uTime * 0.04 + aSeed * 20.0) * 0.1;
      col = mix(vec3(0.5, 0.45, 1.0), vec3(1.0, 0.6, 0.9), aSeed);
      alpha = 0.22 + 0.2 * sin(uTime * 0.7 + aSeed * 50.0);
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vCol = col;
    vAlpha = alpha;
    gl_PointSize = max(1.0, size * uScale / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

export const pointFragment = /* glsl */ `
  varying vec3 vCol;
  varying float vAlpha;
  void main() {
    vec2 q = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(q, q);
    if (r2 > 1.0) discard;
    float a = exp(-r2 * 3.4);
    gl_FragColor = vec4(mix(vCol, vec3(1.0), 0.45 * exp(-r2 * 14.0)), a * vAlpha);
  }
`;

// Treatment effects drawn as lines: scanner, needle, margin ring, radiation beams.
export const fxVertex = /* glsl */ `
  attribute float aT;
  attribute float aSeed;
  attribute float aG;
  uniform float uTime;
  uniform float uMode;      // 0 scanner, 1 needle, 2 ring, 3 beams
  uniform float uAmt;
  uniform vec3 uCenter;
  uniform float uR;
  uniform vec3 uCol;
  varying vec3 vCol;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float a = 0.0;
    vec3 col = uCol;
    if (uMode < 0.5) {
      float sweep = sin(uTime * 1.2);
      p.y += sweep * 0.075;
      a = uAmt * (0.35 + 0.65 * (1.0 - abs(sweep) * 0.4));
    } else if (uMode < 1.5) {
      a = uAmt * step(aT, uAmt) * (0.6 + 0.8 * aT);
    } else if (uMode < 2.5) {
      p = uCenter + position * uR;
      a = uAmt * step(0.5, fract(aT * 12.0 + uTime * 0.25)) * 0.9;
    } else if (uMode < 3.5) {
      float run = pow(max(0.0, sin((aT * 2.6 - uTime * 1.6 + aSeed * 6.0) * 3.14159)), 4.0);
      a = uAmt * (0.12 + run * 1.3);
    } else {
      float head = fract(uTime * 0.1) * 1.15;
      float tail = smoothstep(head - 0.3, head, aT) * (1.0 - step(head, aT));
      float tip = pow(max(0.0, 1.0 - abs(aT - head) * 40.0), 2.0);
      a = uAmt * (0.12 * (1.0 - step(head, aT)) + tail * 0.9 + tip * 2.0);
    }
    vCol = col;
    vAlpha = a;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
