// Game rules layered over the simulation. Pure functions so they can be tested.

export const WINDOW_THRESHOLD = 0.97;

export function lesionSize(s) {
  return s.x[1] + s.x[2] + s.x[3] + s.x[4];
}

export function windowOpen(s) {
  return s.prolifRel < WINDOW_THRESHOLD && s.x[1] + s.x[2] > 0.05 && s.x[3] + s.x[4] <= 0.05;
}

// Points for one simulated month.
export function monthPoints(s) {
  if (s.status === 'dead') return 0;
  if (lesionSize(s) <= 0.05) return 10 / 12;
  if (s.x[4] > 0.05) return -2 / 12;
  return windowOpen(s) ? 7 / 12 : 2 / 12;
}

// Turn a simulation log entry into a game event. `s` is the state after the step.
export function eventFor(entry, s) {
  const t = entry.text;
  switch (entry.kind) {
    case 'seed': return { text: 'A NEW CLONE APPEARS', tone: 'warn', pts: 0, icon: 'star' };
    case 'advance':
      return t.includes('atypical')
        ? { text: 'CLONE EVOLVED: ATYPIA', tone: 'warn', pts: 0 }
        : { text: 'DCIS: STILL INSIDE THE DUCT', tone: 'bad', pts: -10 };
    case 'invasion': return { text: 'BREACH! TUMOR IS INVASIVE', tone: 'bad', pts: -30, icon: 'skull' };
    case 'nodal': return { text: 'SPREAD TO LYMPH NODES', tone: 'bad', pts: -20 };
    case 'distant': return { text: 'METASTASIS', tone: 'bad', pts: -50 };
    case 'regress':
      return t.startsWith('Lesion regression')
        ? { text: 'CLONE FADED! HABITS WORKED', tone: 'good', pts: 100, icon: 'heart' }
        : { text: 'ONE STAGE FADED', tone: 'good', pts: 20 };
    case 'dx': {
      const dx = s.dx;
      if (!dx) return { text: 'DIAGNOSED', tone: 'warn', pts: 0 };
      const early = dx.stage === 'DCIS' || dx.stage === 'I';
      if (dx.via === 'screening') {
        if (early) return { text: `SCAN FOUND IT EARLY (${dx.stage === 'DCIS' ? 'DCIS' : 'STAGE I'})`, tone: 'good', pts: 150, icon: 'ribbon' };
        return { text: `SCAN FOUND STAGE ${dx.stage}`, tone: 'warn', pts: dx.stage === 'II' ? 40 : 0 };
      }
      if (early) return { text: `LUMP FOUND (${dx.stage === 'DCIS' ? 'DCIS' : 'STAGE I'})`, tone: 'warn', pts: 60 };
      return { text: `LUMP FOUND AT STAGE ${dx.stage}`, tone: 'bad', pts: dx.stage === 'II' ? 10 : 0 };
    }
    case 'death': return { text: 'GAME OVER', tone: 'bad', pts: -100, icon: 'skull' };
    default: return null;
  }
}

const ORDER = ['S', 'A', 'B', 'C', 'D'];
const capAt = (g, cap) => (ORDER.indexOf(g) < ORDER.indexOf(cap) ? cap : g);

export function gradeFor(score, years, dead, found = null) {
  const ratio = score / (years * 10);
  let g = ratio >= 0.9 ? 'S' : ratio >= 0.7 ? 'A' : ratio >= 0.45 ? 'B' : ratio >= 0.2 ? 'C' : 'D';
  if (found && found.stage !== 'DCIS' && found.stage !== 'I') g = capAt(g, found.stage === 'II' ? 'B' : 'C');
  if (dead) g = 'D';
  return g;
}

// Risk meters shown in the HUD.
export function riskMeter(mult) {
  const pct = Math.min(1, Math.max(0, (Math.log2(Math.max(0.01, mult)) + 1) / 3));
  const tone = mult < 0.95 ? 'good' : mult < 1.3 ? 'ok' : mult < 2 ? 'warn' : 'bad';
  const label = mult < 0.95 ? 'LOWER THAN BASELINE' : mult < 1.05 ? 'BASELINE' : mult < 1.3 ? 'A BIT HIGHER' : mult < 2 ? 'HIGH' : 'VERY HIGH';
  return { pct, tone, label, baselinePct: 1 / 3 };
}

export function growthMeter(prolifRel) {
  const lo = 0.8, hi = 1.6;
  const pct = Math.min(1, Math.max(0, (prolifRel - lo) / (hi - lo)));
  const line = (WINDOW_THRESHOLD - lo) / (hi - lo);
  const shrink = prolifRel < WINDOW_THRESHOLD;
  const tone = shrink ? 'good' : prolifRel < 1.1 ? 'ok' : prolifRel < 1.3 ? 'warn' : 'bad';
  const label = shrink ? 'SHRINK ZONE' : prolifRel < 1.1 ? 'STEADY' : prolifRel < 1.3 ? 'GROWING FAST' : 'GROWING VERY FAST';
  return { pct, line, tone, label, shrink };
}
