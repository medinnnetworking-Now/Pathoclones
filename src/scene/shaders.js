// Shaders for the organ model and the cosmic backdrop.
//
// The organ is drawn as solid, lit anatomy so structure stays legible. Colour carries meaning:
//   hue            lesion stage per lobule (blue normal -> gold -> coral -> magenta -> crimson)
//   swelling       lobules enlarge as their clone advances
//   pulse rate     proliferation index
//   warm flush     inflammation
//   blue rim       estrogenic drive
//   outer shell    adipose envelope (thickens with BMI and age-related involution)
//   crimson nodes  tumor cells in the axillary lymph nodes

export const tissueVertex = /* glsl */ `
  attribute float aLobule;

  uniform sampler2D uStates;
  uniform float uN;
  uniform float uNodal;
  uniform float uInflam;
  uniform float uEstro;
  uniform vec3 uPal[5];

  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vBase;
  varying float vSt;
  varying float vPh;
  varying float vKind;

  vec3 palette(float s) {
    s = clamp(s, 0.0, 4.0);
    int i = int(floor(s));
    float f = smoothstep(0.0, 1.0, fract(s));
    if (i >= 4) return uPal[4];
    return mix(uPal[i], uPal[i + 1], f);
  }

  void main() {
    float st = 0.0;
    vec3 base;
    vKind = 0.0;
    if (aLobule >= 0.0) {
      st = texture2D(uStates, vec2((aLobule + 0.5) / uN, 0.5)).r;
      base = palette(st);
      float calm = 1.0 - clamp(st, 0.0, 1.0);
      base = mix(base, base * vec3(1.25, 0.72, 0.66), uInflam * 0.55 * calm);
    } else if (aLobule > -1.5) {
      base = mix(vec3(0.66, 0.84, 1.0), vec3(1.0, 0.24, 0.32), uNodal);
      vKind = 1.0;
    } else {
      base = vec3(1.0, 0.58, 0.72);
      vKind = 2.0;
    }

    vec4 lp = vec4(position, 1.0);
    vec3 nrm = normal;
    #ifdef USE_INSTANCING
      lp.xyz *= (1.0 + 0.34 * st);
      vPh = instanceMatrix[3].x * 9.0 + instanceMatrix[3].y * 7.0;
      lp = instanceMatrix * lp;
      nrm = mat3(instanceMatrix) * normal;
    #else
      lp.xyz += normal * 0.0035 * st;
      vPh = position.x * 9.0 + position.y * 7.0;
    #endif

    vec4 mv = modelViewMatrix * lp;
    vN = normalize(normalMatrix * nrm);
    vV = -mv.xyz;
    vBase = base;
    vSt = st;
    gl_Position = projectionMatrix * mv;
  }
`;

export const tissueFragment = /* glsl */ `
  uniform float uTime;
  uniform float uProlif;
  uniform float uEstro;
  uniform float uHealth;
  uniform float uRemission;

  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vBase;
  varying float vSt;
  varying float vPh;
  varying float vKind;

  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(vV);
    float ndl = max(dot(n, normalize(vec3(0.45, 0.65, 0.6))), 0.0);
    float fill = max(dot(n, normalize(vec3(-0.6, -0.2, 0.5))), 0.0);
    float rim = pow(1.0 - max(dot(n, v), 0.0), 2.2);
    float act = clamp(vSt / 4.0, 0.0, 1.0);
    float pulse = 0.88 + 0.12 * sin(uTime * (1.2 + 3.2 * uProlif) + vPh);

    vec3 col = vBase * (0.16 + 0.9 * ndl + 0.14 * fill) * pulse;
    vec3 rimCol = mix(vBase, vec3(0.45, 0.65, 1.0), uEstro * 0.5 * (1.0 - act));
    col += rimCol * rim * (0.22 + 0.35 * act);
    col += vBase * act * 0.32 * pulse;           // emissive core for advanced clones (feeds bloom)
    if (vKind == 1.0) col += vBase * 0.18;

    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, (0.35 + 0.65 * uHealth) * 1.35);
    col = mix(col, vec3(0.62, 1.0, 0.86) * (0.4 + luma), 0.3 * uRemission * (1.0 - act));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const shellVertex = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = -mv.xyz;
    vP = position;
    gl_Position = projectionMatrix * mv;
  }
`;

export const shellFragment = /* glsl */ `
  uniform float uAdipose;
  uniform float uInflam;
  uniform float uEstro;
  uniform float uHealth;
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(vV);
    float f = pow(1.0 - abs(dot(n, v)), 2.6);
    vec3 skin = mix(vec3(1.0, 0.66, 0.78), vec3(1.0, 0.72, 0.42), uAdipose * 0.7);
    skin = mix(skin, vec3(1.0, 0.45, 0.4), uInflam * 0.45);
    skin = mix(skin, vec3(0.55, 0.7, 1.0), uEstro * 0.2);
    float scan = 0.5 + 0.5 * sin(vP.y * 38.0 + uTime * 0.6);
    float a = (0.035 + 0.12 * uAdipose) + f * (0.55 + 0.25 * uAdipose) + scan * 0.012;
    vec3 col = skin * (0.55 + 0.6 * f);
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, 0.4 + 0.6 * uHealth);
    gl_FragColor = vec4(col, a);
  }
`;

export const wallVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

export const wallFragment = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float ribs = smoothstep(0.93, 1.0, abs(sin(p.y * 9.0 + p.x * 1.5)));
    vec3 col = mix(vec3(0.20, 0.07, 0.18), vec3(0.06, 0.04, 0.16), r);
    col += vec3(0.30, 0.12, 0.30) * ribs * 0.35 * (1.0 - r);
    float a = smoothstep(1.0, 0.55, r) * 0.7;
    gl_FragColor = vec4(col, a);
  }
`;

export const backdropVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const backdropFragment = /* glsl */ `
  varying vec3 vDir;
  uniform float uTime;
  uniform float uInflam;
  uniform float uHealth;

  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 6; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

  void main() {
    vec3 d = vDir;
    float t = uTime * 0.008;
    vec3 q = vec3(fbm(d * 1.6 + t), fbm(d * 1.6 + 5.2 - t), fbm(d * 1.6 + 9.1));
    float n1 = fbm(d * 2.4 + 1.8 * q + vec3(t, 0.0, -t));
    float n2 = fbm(d * 5.0 - 1.2 * q + 7.0);
    float ridge = smoothstep(0.45, 0.85, n1) * (0.35 + 0.65 * n2);
    vec3 deep = vec3(0.010, 0.014, 0.040);
    vec3 blue = vec3(0.06, 0.15, 0.40);
    vec3 violet = vec3(0.24, 0.08, 0.36);
    vec3 ember = vec3(0.70, 0.26, 0.12);
    vec3 gold = vec3(0.85, 0.55, 0.22);
    vec3 col = deep + blue * smoothstep(0.28, 0.78, n1);
    col += violet * smoothstep(0.35, 0.85, n2) * 0.7;
    col += ember * ridge * (0.14 + 0.35 * uInflam);
    col += gold * smoothstep(0.7, 0.95, n1 * n2 * 2.0) * 0.18;
    col *= 0.6 + 0.4 * uHealth;
    float vig = smoothstep(1.5, 0.0, length(d.xy));
    gl_FragColor = vec4(col * (0.5 + 0.8 * vig), 1.0);
  }
`;
