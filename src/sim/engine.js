// Breast clonal-evolution engine. One step = one month.
//
// A lesion is a set of nested clones (hyperplasia -> atypia -> DCIS -> invasive), each
// with a size in "lobule units". Lifestyle decisions act in three places:
//   1. Lesion initiation hazard    (evidence-anchored relative risks, see data/evidence.js)
//   2. Tissue environment          (inflammation, estrogenic drive, proliferation: illustrative proxies)
//   3. Established-disease hazards (soy / fiber, anchored to survivor cohorts)
// This is a teaching model, not a diagnostic or personal risk tool.

import { mulberry32 } from './rng.js';

export const N_LOBULES = 400;
export const STAGES = ['Normal', 'Hyperplasia', 'Atypia', 'DCIS', 'Invasive'];

export const DEFAULT_DECISIONS = {
  alcohol: 0,       // g/day of ethanol
  activity: 10,     // recreational MET-h/week
  bmi: 25,
  fiber: 18,        // g/day
  soy: 2,           // mg/day isoflavones
  hrt: 0,           // 0 none, 1 estrogen-only, 2 estrogen + progestin
  screening: 1,     // 0 off, 1 biennial 50-74, 2 annual from 40
};

export const DEFAULT_CONTEXT = {
  startAge: 30,
  endAge: 85,
  menopauseAge: 51,
  inherited: 0,     // 0 average, 1 elevated, 2 high-penetrance variant (illustrative)
  seed: 20261022,
};

const INHERITED_MULT = [1, 2, 6];

// Tunable physiology. Calibrated in tests/engine.test.mjs so the reference lifestyle
// yields an invasive-diagnosis rate near the commonly quoted ~1 in 8 lifetime figure.
export const PHYS = {
  seedBase: 5.5e-4,       // lesion initiations per woman-month at age 50, reference
  seedAgeSlope: 0.052,
  advExp: 0.8,
  earlyExp: 3,            // hyperplasia/atypia respond steeply to the proliferative environment
  reversalThresh: 0.97,   // illustrative: below this relative proliferative drive, early clones are out-competed
  reversalRate: 0.6,
  grow: [0, 0.050, 0.060, 0.042, 0.070],
  clear: [0, 0.030, 0.038, 0.020, 0.016],
  advance: [0, 0.0022, 0.0028, 0.0060],  // per lobule-month, hazard of acquiring next hit
  nodalPerLobule: 0.00045,
  distantPerNodal: 0.0035,
  symptomMm: 18,
  recurrenceYr: [0, 0.04, 0.09, 0.2, 0.4],
  deathDistantMonthly: 0.018,
};

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

export function tumorMm(x4) {
  return x4 <= 0 ? 0 : 6 * Math.cbrt(x4);
}

export function ageAt(ctx, t) {
  return ctx.startAge + t / 12;
}

// ---- Evidence-anchored multipliers ------------------------------------------------

export function riskMultipliers(d, post) {
  const alcohol = Math.pow(post ? 1.11 : 1.10, d.alcohol / 10);        // Sun 2020
  const activity = Math.pow(0.97, (d.activity - DEFAULT_DECISIONS.activity) / 10); // 2018 meta-analysis
  const adiposity = post ? Math.pow(1.10, (d.bmi - 25) / 5) : 1;       // illustrative
  const hrt = post ? [1, 1.0, 1.25][Math.round(d.hrt)] : 1;            // direction: WHI; magnitude illustrative
  return { alcohol, activity, adiposity, hrt, total: alcohol * activity * adiposity * hrt };
}

export function lateDiseaseMultipliers(d) {
  const soy = 1 - 0.26 * clamp(d.soy / 60);               // van Die 2024: HR 0.74 at ~60 mg/day
  const fiber = 1 - 0.28 * clamp((d.fiber - 10) / 20);    // Jayedi 2020: RR 0.72 high vs low (mapping illustrative)
  return { soy, fiber };
}

// ---- Tissue environment (illustrative proxies) ------------------------------------

function tissueFor(d, post) {
  const inflammation = clamp(0.30 + 0.010 * (d.bmi - 25) + 0.003 * d.alcohol - 0.0018 * (d.activity - 10) - 0.002 * (d.fiber - 18));
  const hrtDrive = post ? [0, 0.02, 0.12][Math.round(d.hrt)] : 0;
  const estrogen = clamp(0.30 + (post ? 0.012 * (d.bmi - 25) - 0.12 : 0) + 0.0025 * d.alcohol + hrtDrive);
  const proliferation = clamp(0.25 + 0.35 * estrogen + 0.25 * inflammation + (post && d.hrt === 2 ? 0.03 : 0), 0.05, 1);
  const genomic = clamp(1 - (0.4 * inflammation + 0.3 * (d.alcohol / 40) + 0.2 * proliferation));
  const immune = clamp(1 - 0.5 * (inflammation - 0.3) + 0.002 * (d.activity - 10), 0.3, 1.2);
  return { inflammation, estrogen, proliferation, genomic, immune };
}

const REF = DEFAULT_DECISIONS;
const refProlif = {
  pre: tissueFor(REF, false).proliferation,
  post: tissueFor(REF, true).proliferation,
};

// ---- State -----------------------------------------------------------------------

export function createState(ctx, decisions = DEFAULT_DECISIONS, options) {
  options = options || {};
  const post = ctx.startAge >= ctx.menopauseAge;
  const seedRng = mulberry32(ctx.seed);
  const evtRng = mulberry32(ctx.seed ^ 0x9e3779b9);
  const s = {
    t: 0,
    seedRng: seedRng.state(),
    evtRng: evtRng.state(),
    eff: { ...decisions },
    tissue: tissueFor(decisions, post),
    prolifRel: 1,
    x: [0, 0, 0, 0, 0],         // clone sizes by stage (index 0 unused)
    focus: null,                // lesion origin on the duct tree, unit vector-ish [0..1)^3
    nodal: false,
    distant: false,
    status: 'healthy',          // healthy | lesion | treated | recurrent | dead
    dx: null,
    log: [],
    initiations: 0,
    maxStage: 0,
    hazard: 0,
  };
  if (options.startLesion) {
    s.x[options.startLesion] = options.startSize ?? 2;
    s.focus = [evtRng(), evtRng(), evtRng()];
    s.status = 'lesion';
    s.maxStage = options.startLesion;
    s.evtRng = evtRng.state();
    s.initiations = 1;
    pushLog(s, ctx, 'seed', `Teaching scenario: ${STAGES[options.startLesion].toLowerCase()} clone introduced at ${Math.round(s.x[options.startLesion])} lobule-units.`);
  }
  return s;
}

export function pushLog(s, ctx, kind, text) {
  s.log.push({ t: s.t, age: ageAt(ctx, s.t), kind, text });
}

function lag(cur, target, tau) {
  return cur + (target - cur) * (1 - Math.exp(-1 / tau));
}

export function totalLesion(s) {
  return s.x[1] + s.x[2] + s.x[3] + s.x[4];
}

function stageBurden(s) {
  const w = [0, 0.15, 0.4, 0.8, 1.5];
  let b = 0;
  for (let k = 1; k <= 4; k++) b += w[k] * s.x[k];
  return clamp(b / 45);
}

export function organHealth(s) {
  if (s.status === 'dead') return 0;
  const t = s.tissue;
  const burden = stageBurden(s);
  const env = 0.5 * Math.max(0, t.inflammation - 0.25) + 0.3 * Math.max(0, t.proliferation - 0.45) + 0.2 * (1 - t.genomic - 0.3 > 0 ? 1 - t.genomic - 0.3 : 0);
  let h = 100 * (1 - 0.55 * burden - 0.45 * clamp(env * 1.6));
  if (s.status === 'treated') h = Math.min(h, 78);
  if (s.distant) h = Math.min(h, 25);
  return clamp(h, 0, 100);
}

// ---- Step ------------------------------------------------------------------------

function stageOf(s) {
  for (let k = 4; k >= 1; k--) if (s.x[k] > 0.05) return k;
  return 0;
}

function screeningDue(d, age, t) {
  if (d.screening === 1) return age >= 50 && age < 75 && t % 24 === 0;
  if (d.screening === 2) return age >= 40 && t % 12 === 0;
  return false;
}

function stageLabel(s) {
  const mm = tumorMm(s.x[4]);
  if (s.distant) return 'IV';
  if (s.nodal) return mm > 30 ? 'III' : 'II';
  if (mm <= 20) return 'I';
  return 'II';
}

export function step(s, ctx, decisions) {
  if (s.status === 'dead' || s.t >= (ctx.endAge - ctx.startAge) * 12) return s;
  const seedRng = mulberry32.restore(s.seedRng);
  const evtRng = mulberry32.restore(s.evtRng);

  const age = ageAt(ctx, s.t);
  const post = age >= ctx.menopauseAge;

  // 1. exposure memory: tissue integrates habits over months, BMI over a year
  const e = s.eff;
  e.alcohol = lag(e.alcohol, decisions.alcohol, 5);
  e.activity = lag(e.activity, decisions.activity, 5);
  e.bmi = lag(e.bmi, decisions.bmi, 14);
  e.fiber = lag(e.fiber, decisions.fiber, 5);
  e.soy = lag(e.soy, decisions.soy, 4);
  e.hrt = decisions.hrt;
  e.screening = decisions.screening;

  s.tissue = tissueFor(e, post);
  s.prolifRel = s.tissue.proliferation / (post ? refProlif.post : refProlif.pre);
  const pr = s.prolifRel;
  const late = lateDiseaseMultipliers(e);

  // 2. initiation: seed stream consumed every month so scenarios are coupled
  const uSeed = seedRng();
  const mult = riskMultipliers(e, post);
  const ageShape = Math.exp(PHYS.seedAgeSlope * (Math.min(age, 70) - 50)) * (age > 70 ? 0.96 ** ((age - 70) * 1) : 1);
  const lambda = PHYS.seedBase * ageShape * INHERITED_MULT[ctx.inherited] * mult.total;
  s.hazard = lambda;
  if ((s.status === 'healthy') && uSeed < lambda) {
    s.x[1] = 1;
    s.focus = [evtRng(), evtRng(), evtRng()];
    s.status = 'lesion';
    s.initiations++;
    s.maxStage = Math.max(s.maxStage, 1);
    pushLog(s, ctx, 'seed', 'Initiating event: a hyperplastic clone appears in a terminal duct-lobular unit.');
  }

  // 3. clonal dynamics
  if (s.status === 'lesion' || s.status === 'recurrent') {
    const before = stageOf(s);
    const total = totalLesion(s);
    const room = Math.max(0, 1 - total / N_LOBULES);
    for (let k = 1; k <= 4; k++) {
      if (s.x[k] <= 0) continue;
      const immuneFactor = k === 4 ? s.tissue.immune : (0.5 + 0.5 * s.tissue.immune);
      const drive = k <= 2 ? Math.pow(pr, PHYS.earlyExp) : pr;
      const reversal = k <= 2 ? PHYS.reversalRate * Math.max(0, (PHYS.reversalThresh - pr) / PHYS.reversalThresh) : 0;
      const net = PHYS.grow[k] * drive * (k >= 3 ? lerp(1, late.soy, 0.4) : 1) - PHYS.clear[k] * immuneFactor - reversal;
      s.x[k] = Math.max(0, s.x[k] * (1 + net * (net > 0 ? room : 1)));
      if (s.x[k] < 0.25) s.x[k] = 0;
    }
    // clonal advance (next hit), hazard ~ cells at risk x proliferation
    for (let k = 1; k <= 3; k++) {
      if (s.x[k] <= 0) continue;
      let h = PHYS.advance[k] * Math.min(s.x[k], 40) * Math.pow(pr, PHYS.advExp);
      if (k === 3) h *= late.soy;
      if (evtRng() < h) {
        if (s.x[k + 1] <= 0) {
          s.x[k + 1] = 1;
          s.maxStage = Math.max(s.maxStage, k + 1);
          const msg = [
            '',
            '',
            'Clonal advance: atypical cells outcompete the hyperplastic population.',
            'Clonal advance: a DCIS clone is confined to the ducts.',
            'Basement membrane breached: invasive clone established.',
          ][k + 1];
          pushLog(s, ctx, k + 1 === 4 ? 'invasion' : 'advance', msg);
        } else {
          s.x[k + 1] += 0.5;
        }
      }
    }
    // metastatic spread
    if (s.x[4] > 0) {
      if (!s.nodal && evtRng() < PHYS.nodalPerLobule * s.x[4] * late.fiber * late.soy) {
        s.nodal = true;
        pushLog(s, ctx, 'nodal', 'Tumor cells reach the axillary lymph nodes.');
      }
      if (s.nodal && !s.distant && evtRng() < PHYS.distantPerNodal * late.fiber * late.soy) {
        s.distant = true;
        pushLog(s, ctx, 'distant', 'Distant metastatic seeding.');
      }
    }
    const after = stageOf(s);
    if (before > 0 && after === 0) {
      s.status = 'healthy';
      s.focus = null;
      pushLog(s, ctx, 'regress', 'Lesion regression: normal tissue has outcompeted the abnormal clone.');
    } else if (after < before) {
      pushLog(s, ctx, 'regress', `${STAGES[before]} clone extinguished; ${STAGES[after].toLowerCase()} remains.`);
    }

    // 4. detection
    if (s.status === 'lesion' && after > 0) {
      let found = false;
      let via = 'symptom';
      if (screeningDue(e, age, s.t)) {
        const small = s.x[4] > 0 ? tumorMm(s.x[4]) >= 5 : s.x[3] >= 3;
        if (small && evtRng() < (s.x[4] > 0 ? 0.85 : 0.65)) { found = true; via = 'screening'; }
      }
      if (!found && s.x[4] > 0 && tumorMm(s.x[4]) >= PHYS.symptomMm && evtRng() < 0.12) found = true;
      if (!found && s.distant && evtRng() < 0.08) found = true;
      if (found) diagnose(s, ctx, via, age);
    }
  }

  // 5. survivorship, recurrence, death
  if (s.status === 'treated' && s.dx && s.dx.stage !== 'DCIS') {
    const stageIdx = { I: 2, II: 3, III: 3.6, IV: 4 }[s.dx.stage] ?? 2;
    const annual = lerp(PHYS.recurrenceYr[Math.floor(stageIdx)], PHYS.recurrenceYr[Math.min(4, Math.ceil(stageIdx))], stageIdx % 1);
    const h = (annual / 12) * late.soy * late.fiber * Math.exp(-(s.t - s.dx.t) / 90);
    if (evtRng() < h) {
      s.status = 'recurrent';
      s.distant = true;
      s.x[4] = Math.max(s.x[4], 6);
      pushLog(s, ctx, 'distant', 'Recurrence: distant metastatic disease detected.');
    }
  }
  if (s.distant && s.status !== 'dead' && evtRng() < PHYS.deathDistantMonthly * late.fiber) {
    s.status = 'dead';
    pushLog(s, ctx, 'death', 'Simulation endpoint: death from metastatic breast cancer.');
  }

  s.seedRng = seedRng.state();
  s.evtRng = evtRng.state();
  s.t += 1;
  return s;
}

function diagnose(s, ctx, via, age) {
  const invasive = s.x[4] > 0;
  const stage = invasive ? stageLabel(s) : 'DCIS';
  s.dx = { t: s.t, age, via, stage, mm: invasive ? tumorMm(s.x[4]) : 0 };
  pushLog(s, ctx, 'dx', invasive
    ? `Diagnosis by ${via}: stage ${stage}, ${tumorMm(s.x[4]).toFixed(0)} mm primary${s.nodal ? ', node-positive' : ''}.`
    : `Diagnosis by ${via}: ductal carcinoma in situ (stage 0).`);
  if (!s.distant) {
    s.status = 'treated';
    s.x = [0, 0, 0, 0, 0];
    s.nodal = false;
    s.focus = null;
  } else {
    s.status = 'recurrent';
  }
}

export function snapshot(s) {
  return structuredClone(s);
}

export function runToEnd(ctx, decisions, options) {
  const s = createState(ctx, decisions, options);
  const months = (ctx.endAge - ctx.startAge) * 12;
  while (s.t < months && s.status !== 'dead') step(s, ctx, decisions);
  return s;
}
