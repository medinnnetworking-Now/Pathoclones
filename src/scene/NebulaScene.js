import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { N_LOBULES } from '../sim/engine.js';
import { buildAnatomy, rankFromFocus, sag, R, D } from './anatomy.js';
import {
  tissueVertex, tissueFragment, shellVertex, shellFragment, wallVertex, wallFragment, backdropVertex, backdropFragment,
} from './shaders.js';

const PALETTE = [
  [0.22, 0.62, 1.00],  // normal: Webb blue
  [1.00, 0.78, 0.34],  // hyperplasia: gold
  [1.00, 0.50, 0.30],  // atypia: coral
  [0.93, 0.28, 0.78],  // DCIS: magenta
  [1.00, 0.20, 0.28],  // invasive: crimson
].map((c) => new THREE.Vector3(...c));

// Anatomy callouts for clinical learning.
export const LABELS = [
  { id: 'nipple', title: 'Nipple-areolar complex', body: 'Convergence point of 15-20 lactiferous ducts.' },
  { id: 'duct', title: 'Lactiferous ducts', body: 'Most breast cancers arise in the ductal epithelium; DCIS is confined inside the duct.' },
  { id: 'tdlu', title: 'Terminal duct-lobular unit', body: 'The functional glandular unit and the usual site of origin of ductal and lobular carcinomas.' },
  { id: 'fat', title: 'Adipose envelope', body: 'Fat tissue carries aromatase; after menopause it is the main source of local estrogen.' },
  { id: 'axilla', title: 'Axillary lymph nodes', body: 'First site of lymphatic drainage. Nodal status is a key prognostic factor.' },
  { id: 'wall', title: 'Chest wall', body: 'Pectoralis muscle and ribs lie behind the gland. Deep invasion changes surgical options.' },
  { id: 'lesion', title: 'Lesion focus', body: 'Origin of the abnormal clone. Advanced clones occupy the core; earlier clones form the halo.' },
];

function taperedTube(points, r0, r1, seg, radial, lobuleFor) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curve, seg, 1, radial, false);
  const pos = g.attributes.position;
  const lob = new Float32Array(pos.count);
  for (let i = 0; i <= seg; i++) {
    const c = curve.getPointAt(i / seg);
    const r = r0 + (r1 - r0) * (i / seg);
    for (let j = 0; j <= radial; j++) {
      const v = i * (radial + 1) + j;
      pos.setXYZ(v, c.x + (pos.getX(v) - c.x) * r, c.y + (pos.getY(v) - c.y) * r, c.z + (pos.getZ(v) - c.z) * r);
      lob[v] = lobuleFor(i / seg);
    }
  }
  g.setAttribute('aLobule', new THREE.BufferAttribute(lob, 1));
  g.deleteAttribute('uv');
  return g;
}

export class NebulaScene {
  constructor(container, { onLabels } = {}) {
    this.container = container;
    this.onLabels = onLabels;
    this.clock = new THREE.Clock();
    this.display = new Float32Array(N_LOBULES);
    this.target = new Float32Array(N_LOBULES);
    this.rank = new Float32Array(N_LOBULES).fill(1e9);
    this.focusKey = null;
    this.focusLobule = 0;
    this.tissue = { inflammation: 0.3, estrogen: 0.3, proliferation: 0.4, genomic: 0.85 };
    this.involution = 0;
    this.adipose = 0.4;
    this.maxStage = 0;
    this.total = 0;
    this.healthTarget = 1;
    this.lastLabelT = 0;
    this.labelsOn = false;
    this.sway = true;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x03040a, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.className = 'nebula-canvas';

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
    this.camera.position.set(3.35, 0.2, 3.0);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0.3, -0.5, 0.3);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 1.4;
    this.controls.maxDistance = 7;
    this.controls.enablePan = false;
    this.controls.minAzimuthAngle = -1.4;
    this.controls.maxAzimuthAngle = 1.9;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.35;
    this.controls.addEventListener('start', () => { this.interacting = true; });
    this.controls.addEventListener('end', () => { this.interacting = false; });

    this.anatomy = buildAnatomy(11);
    this.buildStatesTexture();
    this.buildUniforms();
    this.buildBackdrop();
    this.buildOrgan();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.34, 0.6, 0.7);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.resize = this.resize.bind(this);
    this.ro = new ResizeObserver(this.resize);
    this.ro.observe(container);
    this.resize();

    this.animate = this.animate.bind(this);
    this.raf = requestAnimationFrame(this.animate);
  }

  buildStatesTexture() {
    this.statesData = new Float32Array(N_LOBULES * 4);
    this.statesTex = new THREE.DataTexture(this.statesData, N_LOBULES, 1, THREE.RGBAFormat, THREE.FloatType);
    this.statesTex.minFilter = THREE.NearestFilter;
    this.statesTex.magFilter = THREE.NearestFilter;
    this.statesTex.needsUpdate = true;
  }

  buildUniforms() {
    this.u = {
      uStates: { value: this.statesTex },
      uN: { value: N_LOBULES },
      uTime: { value: 0 },
      uInflam: { value: 0.3 },
      uProlif: { value: 0.4 },
      uEstro: { value: 0.3 },
      uGenomic: { value: 0.85 },
      uAdipose: { value: 0.4 },
      uHealth: { value: 1 },
      uRemission: { value: 0 },
      uNodal: { value: 0 },
      uPal: { value: PALETTE },
    };
  }

  buildBackdrop() {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: this.u.uTime, uInflam: this.u.uInflam, uHealth: this.u.uHealth },
      vertexShader: backdropVertex,
      fragmentShader: backdropFragment,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(40, 64, 40), mat);
    mesh.renderOrder = -10;
    mesh.frustumCulled = false;
    this.scene.add(mesh);

    // distant field stars
    const n = 2600;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(20 + Math.random() * 10);
      pos.set([v.x, v.y, v.z], i * 3);
      const b = 0.3 + Math.random() * 0.7;
      const warm = Math.random();
      col.set([b, b * (0.82 + 0.15 * warm), b * (0.9 + 0.1 * (1 - warm))], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    stars.renderOrder = -9;
    stars.frustumCulled = false;
    this.scene.add(stars);
  }

  tissueMaterial() {
    return new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: tissueVertex, fragmentShader: tissueFragment });
  }

  buildOrgan() {
    const a = this.anatomy;
    this.organ = new THREE.Group();
    this.scene.add(this.organ);
    const mat = this.tissueMaterial();

    // Chest wall disc behind the gland
    const wall = new THREE.Mesh(
      new THREE.CircleGeometry(1.45, 64),
      new THREE.ShaderMaterial({ vertexShader: wallVertex, fragmentShader: wallFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    );
    wall.position.set(0.3, 0.05, -0.02);
    wall.renderOrder = 0;
    this.organ.add(wall);

    // Duct tree (merged into one draw call)
    const parts = [];
    for (let m = 0; m < a.nd; m++) {
      const far = a.ductFar[m];
      const pts = [a.nipple, [
        a.nipple[0] + (far[0] - a.nipple[0]) * 0.33,
        a.nipple[1] + (far[1] - a.nipple[1]) * 0.33,
        a.nipple[2] + (far[2] - a.nipple[2]) * 0.33,
      ], [
        a.nipple[0] + (far[0] - a.nipple[0]) * 0.66,
        a.nipple[1] + (far[1] - a.nipple[1]) * 0.66,
        a.nipple[2] + (far[2] - a.nipple[2]) * 0.66,
      ], far];
      const ds = a.downstream[m];
      const lobuleFor = (t) => {
        if (!ds.length) return 0;
        const e = ds.find((x) => x.t >= t) ?? ds[ds.length - 1];
        return e.i;
      };
      parts.push(taperedTube(pts, 0.015, 0.0055, 26, 6, lobuleFor));
    }
    for (let i = 0; i < N_LOBULES; i++) {
      const s = a.proj[i].q;
      const l = a.lob[i];
      const mid = [(s[0] + l[0]) / 2 + (a.jitter[i] - 0.08) * 0.5, (s[1] + l[1]) / 2 + (a.jitter[(i * 7) % N_LOBULES] - 0.08) * 0.5, (s[2] + l[2]) / 2];
      if (Math.hypot(l[0] - s[0], l[1] - s[1], l[2] - s[2]) < 0.02) continue;
      parts.push(taperedTube([s, mid, l], 0.0042, 0.0022, 8, 4, () => i));
    }
    const ducts = new THREE.Mesh(mergeGeometries(parts), mat);
    ducts.renderOrder = 2;
    ducts.frustumCulled = false;
    this.organ.add(ducts);

    // Lobule clusters: acini grouped like a bunch of grapes, instanced per TDLU
    const acini = [];
    const offs = [[0, 0, 0, 1], [0.7, 0.2, 0.1, 0.8], [-0.6, 0.4, -0.2, 0.75], [0.1, -0.7, 0.3, 0.8], [-0.2, 0.1, 0.8, 0.7], [0.4, 0.6, -0.5, 0.65], [-0.7, -0.4, 0.2, 0.7]];
    for (const [x, y, z, r] of offs) {
      const g = new THREE.IcosahedronGeometry(0.019 * r, 1);
      g.translate(x * 0.024, y * 0.024, z * 0.024);
      g.deleteAttribute('uv');
      acini.push(g);
    }
    const lobGeo = mergeGeometries(acini);
    this.lobules = new THREE.InstancedMesh(lobGeo, mat, N_LOBULES);
    const idx = new Float32Array(N_LOBULES);
    const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const e = new THREE.Euler(); const sc = new THREE.Vector3();
    for (let i = 0; i < N_LOBULES; i++) {
      const sp = a.spin[i];
      e.set(sp[0], sp[1], sp[2]); q.setFromEuler(e); sc.setScalar(sp[3]);
      m4.compose(new THREE.Vector3(...a.lob[i]), q, sc);
      this.lobules.setMatrixAt(i, m4);
      idx[i] = i;
    }
    lobGeo.setAttribute('aLobule', new THREE.InstancedBufferAttribute(idx, 1));
    this.lobules.frustumCulled = false;
    this.lobules.renderOrder = 3;
    this.organ.add(this.lobules);

    // Nipple and lymph nodes reuse the tissue shader with special lobule ids
    const nipGeo = new THREE.SphereGeometry(0.045, 20, 14);
    nipGeo.scale(1, 1, 0.8);
    nipGeo.deleteAttribute('uv');
    this.nipple = new THREE.InstancedMesh(nipGeo, mat, 1);
    nipGeo.setAttribute('aLobule', new THREE.InstancedBufferAttribute(new Float32Array([-2]), 1));
    m4.compose(new THREE.Vector3(...a.nipple).add(new THREE.Vector3(0, 0, 0.02)), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    this.nipple.setMatrixAt(0, m4);
    this.nipple.frustumCulled = false;
    this.nipple.renderOrder = 3;
    this.organ.add(this.nipple);

    const nodeGeo = new THREE.SphereGeometry(0.05, 20, 14);
    nodeGeo.scale(1.3, 0.85, 0.85);
    nodeGeo.deleteAttribute('uv');
    this.nodes = new THREE.InstancedMesh(nodeGeo, mat, a.nodes.length);
    nodeGeo.setAttribute('aLobule', new THREE.InstancedBufferAttribute(new Float32Array(a.nodes.length).fill(-1), 1));
    a.nodes.forEach((p, i) => {
      q.setFromEuler(e.set(0, 0, 0.4 * i));
      m4.compose(new THREE.Vector3(...p), q, new THREE.Vector3().setScalar(0.8 + (i % 3) * 0.18));
      this.nodes.setMatrixAt(i, m4);
    });
    this.nodes.frustumCulled = false;
    this.nodes.renderOrder = 3;
    this.organ.add(this.nodes);

    // Translucent skin / adipose envelope with a fresnel rim
    const shellGeo = new THREE.SphereGeometry(1, 120, 80, 0, Math.PI * 2, 0, Math.PI / 2);
    shellGeo.rotateX(Math.PI / 2);
    const sp = shellGeo.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      const p = [sp.getX(i) * R * 1.02, sp.getY(i) * R * 1.02, sp.getZ(i) * D * 1.03];
      const bump = 0.035 * Math.exp(-(p[0] * p[0] + p[1] * p[1]) / 0.012);
      p[2] += bump;
      sag(p);
      sp.setXYZ(i, p[0], p[1], p[2]);
    }
    shellGeo.computeVertexNormals();
    this.shell = new THREE.Mesh(shellGeo, new THREE.ShaderMaterial({
      uniforms: this.u, vertexShader: shellVertex, fragmentShader: shellFragment, transparent: true, depthWrite: false, side: THREE.FrontSide,
    }));
    this.shell.renderOrder = 6;
    this.organ.add(this.shell);

    // Glow at the lesion focus (feeds bloom)
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const cx = c.getContext('2d');
    const grd = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = grd; cx.fillRect(0, 0, 128, 128);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true }));
    this.halo.renderOrder = 7;
    this.halo.visible = false;
    this.organ.add(this.halo);
  }

  setLabels(on) { this.labelsOn = on; }

  setSway(on) {
    this.sway = on;
    this.controls.autoRotate = on;
  }

  resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.bloom.resolution.set(w, h);
  }

  // Map simulation state onto per-lobule stage values.
  updateFromSim(state, ctx) {
    const key = state.focus ? state.focus.join(',') : null;
    if (key && key !== this.focusKey) {
      const r = rankFromFocus(this.anatomy, state.focus);
      this.rank = r.rank;
      this.focusLobule = r.focusLobule;
      this.focusKey = key;
    }
    const x = state.x;
    const T4 = x[4], T3 = T4 + x[3], T2 = T3 + x[2], T1 = T2 + x[1];
    for (let i = 0; i < N_LOBULES; i++) {
      const r = this.rank[i];
      const c = (T) => Math.min(1, Math.max(0, T - r));
      this.target[i] = c(T1) + c(T2) + c(T3) + c(T4);
    }
    this.total = T1;
    this.maxStage = x[4] > 0.05 ? 4 : x[3] > 0.05 ? 3 : x[2] > 0.05 ? 2 : x[1] > 0.05 ? 1 : 0;
    const age = ctx.startAge + state.t / 12;
    this.involution = Math.min(1, Math.max(0, (age - 42) / 20));
    this.adipose = Math.min(1, Math.max(0.1, 0.38 + (state.eff.bmi - 25) * 0.055 + this.involution * 0.2));
    this.tissue = state.tissue;
    this.nodalTarget = state.nodal || state.distant ? 1 : 0;
    this.remissionTarget = state.status === 'treated' ? 1 : 0;
    this.dead = state.status === 'dead';
  }

  setHealth(h) {
    this.healthTarget = this.dead ? 0.08 : 0.4 + 0.6 * Math.min(1, Math.max(0, h / 100));
  }

  animate() {
    this.raf = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const u = this.u;
    u.uTime.value += dt;

    const k = 1 - Math.exp(-dt * 3.2);
    for (let i = 0; i < N_LOBULES; i++) {
      this.display[i] += (this.target[i] - this.display[i]) * k;
      this.statesData[i * 4] = this.display[i];
    }
    this.statesTex.needsUpdate = true;

    const s = (cur, tgt) => cur + (tgt - cur) * k;
    u.uInflam.value = s(u.uInflam.value, this.tissue.inflammation);
    u.uProlif.value = s(u.uProlif.value, this.tissue.proliferation);
    u.uEstro.value = s(u.uEstro.value, this.tissue.estrogen);
    u.uGenomic.value = s(u.uGenomic.value, this.tissue.genomic);
    u.uAdipose.value = s(u.uAdipose.value, this.adipose);
    u.uHealth.value = s(u.uHealth.value, this.healthTarget ?? 1);
    u.uRemission.value = s(u.uRemission.value, this.remissionTarget ?? 0);
    u.uNodal.value = s(u.uNodal.value, this.nodalTarget ?? 0);

    // lesion halo
    if (this.maxStage > 0) {
      const lp = this.anatomy.lob[this.focusLobule];
      const col = PALETTE[this.maxStage];
      this.halo.visible = true;
      this.halo.position.set(lp[0], lp[1], lp[2]);
      this.halo.material.color.setRGB(col.x, col.y, col.z);
      const pulse = 0.85 + 0.15 * Math.sin(u.uTime.value * (1.4 + 3 * u.uProlif.value));
      const size = (0.16 + 0.055 * Math.sqrt(this.total)) * pulse;
      this.halo.scale.set(size, size, 1);
      this.halo.material.opacity = Math.min(0.85, 0.28 + this.maxStage * 0.14);
    } else {
      this.halo.visible = false;
    }

    if (this.sway && !this.interacting) {
      const az = this.controls.getAzimuthalAngle();
      if (az > 1.1) this.controls.autoRotateSpeed = -Math.abs(this.controls.autoRotateSpeed);
      else if (az < -0.5) this.controls.autoRotateSpeed = Math.abs(this.controls.autoRotateSpeed);
    }
    this.controls.update();
    this.composer.render();

    if (this.labelsOn && this.onLabels && u.uTime.value - this.lastLabelT > 0.05) {
      this.lastLabelT = u.uTime.value;
      this.emitLabels();
    }
  }

  anchors() {
    const a = this.anatomy;
    const duct = a.ductFar[3];
    return {
      nipple: a.nipple,
      duct: [duct[0] * 0.5, duct[1] * 0.5 + a.nipple[1] * 0.5, a.nipple[2] * 0.5 + duct[2] * 0.5],
      tdlu: a.lob[40],
      fat: [0.74, -0.58, 0.22],
      axilla: a.nodes[2],
      wall: [-0.7, 0.9, 0],
      lesion: a.lob[this.focusLobule],
    };
  }

  emitLabels() {
    const out = [];
    const v = new THREE.Vector3();
    const w = this.container.clientWidth, h = this.container.clientHeight;
    const anchors = this.anchors();
    for (const L of LABELS) {
      if (L.id === 'lesion' && this.maxStage === 0) continue;
      const p = anchors[L.id];
      v.set(p[0], p[1], p[2]).project(this.camera);
      if (v.z > 1) continue;
      out.push({ ...L, x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h });
    }
    this.onLabels(out);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.controls.dispose();
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    this.composer.dispose?.();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
