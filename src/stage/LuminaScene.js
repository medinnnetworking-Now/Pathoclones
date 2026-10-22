import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  buildBody, buildGland, buildLesion, buildTendrils, buildLymph, buildNodePoints, buildSparks, buildDrug, buildDust,
  buildScanner, buildNeedle, buildRing, buildBeams, buildHelix, LESION_POS, BREAST_C, AFFECTED_SIDE,
} from './geometry.js';
import {
  filamentVertex, lineFragment, lesionVertex, tendrilVertex, lymphVertex, pointVertex, pointFragment, fxVertex,
} from './shaders.js';

const FOV = 38;
const V3 = (a) => new THREE.Vector3(...a);
const BC = BREAST_C(AFFECTED_SIDE);

export const STAGE_COLORS = {
  gold: [1.0, 0.82, 0.29], amber: [1.0, 0.64, 0.29], magenta: [1.0, 0.44, 0.88], red: [1.0, 0.3, 0.37],
  pink: [1.0, 0.56, 0.82], cyan: [0.42, 0.89, 1.0], mint: [0.49, 1.0, 0.83], none: [1, 1, 1],
};

const BASE_FX = {
  lesionAmt: 0, lesionR: 0.02, lesionCol: STAGE_COLORS.gold, jit: 0.3, core: 0.2, sparks: 0, tend: 0, tendScale: 1, spread: 0,
  nodeHot: 0, nodeOut: 0, scan: 0, needle: 0, ring: 0, ringR: 0.05, beams: 0, drug: 0, excise: 0, exciseR: 0.05, tintOn: 1,
  body: 1, gland: 1, helix: 0, focusR: -1, gene: -1,
};

// Camera framing: look at `target`, fit `width` x `height` world units, from direction `dir`.
const CAM = {
  body: { target: [0, 0.0, 0], width: 2.4, height: 5.0, dir: [0, 0.03, 1], shiftY: 0.2 },
  breast: { target: [BC[0] + 0.02, BC[1], BC[2] + 0.06], width: 0.36, height: 0.3, dir: [-0.28, 0.1, 1], shiftY: 0.06 },
  lesion: { target: [LESION_POS[0], LESION_POS[1], LESION_POS[2]], width: 0.24, height: 0.2, dir: [-0.3, 0.12, 1], shiftY: 0.06 },
  nodes: { target: [-0.26, 0.76, 0.07], width: 0.5, height: 0.4, dir: [-0.35, 0.08, 1], shiftY: 0.06 },
  helix: { target: [0, 0, 0], width: 0.9, height: 2.9, dir: [0, 0.02, 1], shiftY: 0.08 },
};

export const PRESETS = {
  intro: { cam: CAM.body, fx: { body: 1, gland: 0.55, focusR: -1 } },
  healthy: { cam: CAM.breast, fx: { body: 0.3, gland: 1, focusR: 0.5 } },
  hyperplasia: { cam: CAM.lesion, fx: { body: 0.3, lesionAmt: 0.22, lesionR: 0.016, lesionCol: STAGE_COLORS.gold, jit: 0.2, sparks: 0.15, focusR: 0.55 } },
  atypia: { cam: CAM.lesion, fx: { body: 0.3, lesionAmt: 0.45, lesionR: 0.022, lesionCol: STAGE_COLORS.amber, jit: 0.4, sparks: 0.3, focusR: 0.55 } },
  dcis: { cam: CAM.lesion, fx: { body: 0.3, lesionAmt: 0.7, lesionR: 0.03, lesionCol: STAGE_COLORS.magenta, jit: 0.5, sparks: 0.45, core: 0.18, focusR: 0.55 } },
  invasive: { cam: CAM.lesion, fx: { body: 0.3, lesionAmt: 1, lesionR: 0.036, lesionCol: STAGE_COLORS.red, jit: 0.9, sparks: 0.8, core: 0.4, tend: 0.8, focusR: 0.6 } },
  nodes: { cam: CAM.nodes, fx: { body: 0.3, lesionAmt: 1, lesionR: 0.04, lesionCol: STAGE_COLORS.red, jit: 0.9, sparks: 0.9, core: 0.4, tend: 1, spread: 1, nodeHot: 1, focusR: 0.8 } },
  detect: { cam: CAM.breast, fx: { body: 0.3, lesionAmt: 0.9, lesionR: 0.03, lesionCol: STAGE_COLORS.red, jit: 0.7, sparks: 0.5, core: 0.35, tend: 0.3, scan: 1, needle: 1, focusR: 0.5 } },
  surgery: { cam: CAM.lesion, fx: { body: 0.3, lesionAmt: 0, lesionR: 0.03, lesionCol: STAGE_COLORS.pink, ring: 1, ringR: 0.05, excise: 1, exciseR: 0.04, nodeOut: 1, lesionOn: 0, focusR: 0.55 } },
  radiation: { cam: CAM.breast, fx: { body: 0.3, lesionAmt: 0, beams: 1, excise: 0.75, exciseR: 0.04, ring: 0.25, ringR: 0.05, nodeOut: 1, focusR: 0.5 } },
  systemic: { cam: CAM.lesion, fx: { body: 0.3, lesionAmt: 0.12, lesionR: 0.012, lesionCol: STAGE_COLORS.red, jit: 0.4, sparks: 0.2, drug: 1, excise: 0.5, exciseR: 0.04, nodeOut: 1, focusR: 0.45 } },
  after: { cam: CAM.breast, fx: { body: 0.3, gland: 1.15, focusR: 0.7, nodeOut: 1 } },
  reversal: { cam: { ...CAM.lesion, shiftY: 0.2 }, fx: { body: 0.1, focusR: 0.42, lesionAmt: 0.3, lesionR: 0.02 } },
  genetics: { cam: CAM.helix, fx: { body: 0, gland: 0, helix: 1, focusR: -1 } },
};

export class LuminaScene {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.pointer = new THREE.Vector2();
    this.pointerS = new THREE.Vector2();
    this.stepTime = 0;
    this.gain = 0.1;
    this.fx = { ...BASE_FX };
    this.tgt = { ...BASE_FX };
    this.fx.lesionCol = [...BASE_FX.lesionCol];
    this.tgt.lesionCol = [...BASE_FX.lesionCol];
    this.cam = { target: V3(CAM.body.target), dist: 5, dir: V3(CAM.body.dir).normalize(), shiftX: 0, shiftY: 0 };
    this.camT = { target: V3(CAM.body.target), width: 1.9, height: 3.3, dir: V3(CAM.body.dir).normalize(), shiftX: 0, shiftY: 0 };
    this.preset = null;

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 1);
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.className = 'stage-canvas';

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.02, 60);
    this.u = this.makeUniforms();
    this.build();

    const target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.6, 0.05);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.onMove = (e) => {
      const r = container.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    };
    window.addEventListener('pointermove', this.onMove);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    this.snapCamera();
    this.animate = this.animate.bind(this);
    this.raf = requestAnimationFrame(this.animate);
  }

  makeUniforms() {
    return {
      uTime: { value: 0 },
      uScale: { value: 800 },
      uLesionPos: { value: V3(LESION_POS) },
      uLesionR: { value: 0.02 },
      uLesionCol: { value: new THREE.Vector3(1, 0.8, 0.3) },
      uLesionOn: { value: 0 },
      uExcise: { value: 0 },
      uExciseR: { value: 0.04 },
      uFocusPos: { value: V3(CAM.body.target) },
      uFocusR: { value: -1 },
      uGene: { value: -1 },
    };
  }

  mat(vs, fs, extra = {}, blending = THREE.AdditiveBlending) {
    return new THREE.ShaderMaterial({
      uniforms: { ...this.u, ...extra }, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, depthTest: false, blending,
    });
  }

  build() {
    const lines = (geo, mat) => { const o = new THREE.LineSegments(geo, mat); o.frustumCulled = false; this.scene.add(o); return o; };
    const points = (geo, mat) => { const o = new THREE.Points(geo, mat); o.frustumCulled = false; this.scene.add(o); return o; };
    const center = { uCenter: { value: V3(LESION_POS) } };
    const col = () => ({ uCol: { value: new THREE.Vector3(1, 0.5, 0.5) } });

    this.uBody = { uOpacity: { value: 1 }, uHair: { value: 1 } };
    this.uGland = { uOpacity: { value: 1 }, uHair: { value: 0 } };
    this.uHelix = { uOpacity: { value: 0 }, uHair: { value: 0 } };
    this.body = lines(buildBody(), this.mat(filamentVertex, lineFragment, this.uBody));
    this.glandL = lines(buildGland(-1), this.mat(filamentVertex, lineFragment, this.uGland));
    this.glandR = lines(buildGland(1), this.mat(filamentVertex, lineFragment, this.uGland));
    this.helix = lines(buildHelix(), this.mat(filamentVertex, lineFragment, this.uHelix));

    this.uLesion = { ...center, uR: { value: 0.02 }, uAmt: { value: 0 }, uJit: { value: 0.3 }, uCore: { value: 0.2 }, uCol: { value: new THREE.Vector3(1, 0.8, 0.3) } };
    this.lesion = lines(buildLesion(), this.mat(lesionVertex, lineFragment, this.uLesion));

    this.uTend = { ...center, uTend: { value: 0 }, uScale: { value: 1 }, uCol: { value: new THREE.Vector3(1, 0.3, 0.37) } };
    this.tendrils = lines(buildTendrils(), this.mat(tendrilVertex, lineFragment, this.uTend));

    this.uLymph = { uSpread: { value: 0 }, uCol: { value: new THREE.Vector3(1, 0.3, 0.4) } };
    this.lymph = lines(buildLymph(), this.mat(lymphVertex, lineFragment, this.uLymph));

    const pt = (mode, size) => ({ uMode: { value: mode }, uAmt: { value: 0 }, uSize: { value: size }, ...center, uR: { value: 0.02 }, uCol: { value: new THREE.Vector3(1, 0.5, 0.5) }, uHot: { value: 0 } });
    this.uNodes = pt(0, 0.03);
    this.uSparks = pt(1, 0.0022);
    this.uDrug = pt(2, 0.006);
    this.uDust = pt(3, 0.05);
    this.nodes = points(buildNodePoints(), this.mat(pointVertex, pointFragment, this.uNodes));
    this.sparks = points(buildSparks(), this.mat(pointVertex, pointFragment, this.uSparks));
    this.drug = points(buildDrug(), this.mat(pointVertex, pointFragment, this.uDrug));
    this.dust = points(buildDust(), this.mat(pointVertex, pointFragment, this.uDust));

    const fx = (mode) => ({ uMode: { value: mode }, uAmt: { value: 0 }, ...center, uR: { value: 0.05 }, uCol: { value: new THREE.Vector3(...[[0.42, 0.89, 1], [1, 1, 1], [1, 0.62, 0.82], [0.6, 0.92, 1]][mode]) } });
    this.uScan = fx(0); this.uNeedle = fx(1); this.uRing = fx(2); this.uBeams = fx(3);
    this.scan = lines(buildScanner(), this.mat(fxVertex, lineFragment, this.uScan));
    this.needle = lines(buildNeedle(), this.mat(fxVertex, lineFragment, this.uNeedle));
    this.ring = lines(buildRing(), this.mat(fxVertex, lineFragment, this.uRing));
    this.beams = lines(buildBeams(), this.mat(fxVertex, lineFragment, this.uBeams));
  }

  // ---- control ---------------------------------------------------------------

  setPreset(name, overrides = {}) {
    const p = PRESETS[name];
    if (!p) return;
    this.preset = name;
    this.stepTime = 0;
    this.tgt = { ...BASE_FX, lesionOn: 1, ...p.fx, ...overrides };
    this.tgt.lesionCol = [...(this.tgt.lesionCol ?? BASE_FX.lesionCol)];
    this.applyCam(p.cam);
  }

  // Update only some fx targets (used by the reversal lab each frame).
  setFx(partial) {
    Object.assign(this.tgt, partial);
    if (partial.lesionCol) this.tgt.lesionCol = [...partial.lesionCol];
  }

  applyCam(c) {
    this.camT = { target: V3(c.target), width: c.width, height: c.height, dir: V3(c.dir).normalize(), shiftX: 0, shiftY: c.shiftY ?? 0 };
    this.tgt.focusPos = c.target;
  }

  distanceFor(c) {
    const t = Math.tan((FOV * Math.PI) / 360);
    const d = Math.max(c.width / 2 / (t * this.camera.aspect), c.height / 2 / t);
    return this.wide && c.height < 1 ? d * 1.4 : d;
  }

  snapCamera() {
    this.cam.target.copy(this.camT.target);
    this.cam.dir.copy(this.camT.dir);
    this.cam.dist = this.distanceFor(this.camT);
    this.cam.shiftY = this.camT.shiftY;
  }

  resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.bloom.resolution.set(w, h);
    const buf = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.u.uScale.value = buf.y / (2 * Math.tan((FOV * Math.PI) / 360));
    this.wide = w / h > 1.15;
  }

  // ---- frame -----------------------------------------------------------------

  animate() {
    this.raf = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.stepTime += dt;
    this.u.uTime.value += dt;
    const k = (rate) => 1 - Math.exp(-dt * rate);

    // sequenced effects
    const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const t = { ...this.tgt };
    if (this.tgt.needle > 0) t.needle = smooth(0.9, 2.6, this.stepTime);
    if (this.tgt.beams > 0) t.beams = smooth(0.5, 1.6, this.stepTime);

    const f = this.fx, r = k(2.6);
    for (const key of Object.keys(BASE_FX)) {
      if (key === 'lesionCol') continue;
      const tv = t[key] ?? BASE_FX[key];
      const rate = key === 'tend' || key === 'spread' ? 1.4 : 2.6;
      f[key] += (tv - f[key]) * k(rate);
    }
    const lc = t.lesionCol ?? BASE_FX.lesionCol;
    for (let i = 0; i < 3; i++) f.lesionCol[i] += (lc[i] - f.lesionCol[i]) * r;

    // push to uniforms
    this.uBody.uOpacity.value = f.body * this.gain;
    this.uGland.uOpacity.value = f.gland * this.gain;
    this.uHelix.uOpacity.value = f.helix * this.gain;
    this.glandL.visible = this.glandR.visible = f.gland > 0.01;
    this.body.visible = f.body > 0.01;
    this.helix.visible = f.helix > 0.01;
    this.u.uLesionOn.value = (t.lesionOn ?? 1) * Math.min(1, f.lesionAmt * 2.2);
    this.u.uLesionR.value = Math.max(f.lesionR, 0.012);
    this.u.uLesionCol.value.set(...f.lesionCol);
    this.u.uExcise.value = f.excise;
    this.u.uExciseR.value = f.exciseR;
    this.u.uFocusR.value = f.focusR;
    this.u.uFocusPos.value.lerp(this.tgt.focusPos ? V3(this.tgt.focusPos) : this.u.uFocusPos.value, k(3));
    this.u.uGene.value = f.gene;

    const col = new THREE.Vector3(...f.lesionCol);
    this.uLesion.uR.value = Math.max(f.lesionR, 0.001);
    this.uLesion.uAmt.value = f.lesionAmt;
    this.uLesion.uJit.value = f.jit;
    this.uLesion.uCore.value = f.core;
    this.uLesion.uCol.value.copy(col);
    this.lesion.visible = f.lesionAmt > 0.01;
    this.uTend.uTend.value = f.tend;
    this.uTend.uScale.value = f.tendScale;
    this.uTend.uCol.value.copy(col);
    this.tendrils.visible = f.tend > 0.01;
    this.uLymph.uSpread.value = f.spread;
    this.lymph.visible = f.spread > 0.01;
    this.uNodes.uHot.value = f.nodeHot;
    this.uNodes.uAmt.value = f.nodeOut;
    this.nodes.visible = f.body > 0.05 || f.gland > 0.05;
    this.uSparks.uAmt.value = f.sparks;
    this.uSparks.uR.value = Math.max(f.lesionR, 0.012);
    this.uSparks.uCol.value.copy(col);
    this.sparks.visible = f.sparks > 0.01;
    this.uDrug.uAmt.value = f.drug;
    this.uDrug.uR.value = 0.03;
    this.drug.visible = f.drug > 0.01;
    this.uScan.uAmt.value = f.scan;
    this.scan.visible = f.scan > 0.01;
    this.uNeedle.uAmt.value = f.needle;
    this.needle.visible = f.needle > 0.01;
    this.uRing.uAmt.value = f.ring;
    this.uRing.uR.value = f.ringR;
    this.ring.visible = f.ring > 0.01;
    this.uBeams.uAmt.value = f.beams;
    this.beams.visible = f.beams > 0.01;

    // camera: critically damped approach, gentle sway and pointer parallax
    this.pointerS.lerp(this.pointer, k(2));
    const c = this.cam, ct = this.camT;
    const kc = k(2.0);
    c.target.lerp(ct.target, kc);
    c.dir.lerp(ct.dir, kc).normalize();
    c.dist += (this.distanceFor(ct) - c.dist) * kc;
    c.shiftY += ((this.wide ? 0.02 : ct.shiftY) - c.shiftY) * kc;
    c.shiftX += ((this.wide ? 0.16 : 0) - c.shiftX) * kc;
    const tm = this.u.uTime.value;
    const close = Math.min(1, 0.6 / Math.max(0.15, ct.width));
    const yaw = Math.sin(tm * 0.17) * (0.1 + 0.05 * close) + this.pointerS.x * 0.2;
    const pitch = Math.sin(tm * 0.13 + 1.3) * 0.04 - this.pointerS.y * 0.1;
    const dir = c.dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    dir.applyAxisAngle(right, pitch);
    this.camera.position.copy(c.target).addScaledVector(dir, c.dist);
    this.camera.lookAt(c.target);
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.camera.setViewOffset(w, h, -c.shiftX * w, c.shiftY * h, w, h);
    this.camera.updateProjectionMatrix();

    this.composer.render();

    this.frameAcc = (this.frameAcc ?? 0) + dt;
    this.frameN = (this.frameN ?? 0) + 1;
    if (this.frameN >= 90) {
      const avg = this.frameAcc / this.frameN;
      this.frameAcc = 0; this.frameN = 0;
      const pr = this.renderer.getPixelRatio();
      if (avg > 0.034 && pr > 1) { this.renderer.setPixelRatio(Math.max(1, pr - 0.5)); this.resize(); }
    }
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('pointermove', this.onMove);
    this.ro.disconnect();
    this.scene.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    this.composer.dispose?.();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
