import { runToEnd, DEFAULT_CONTEXT, DEFAULT_DECISIONS } from './engine.js';

// Monte Carlo over many simulated women. Seeds are shared between scenarios so the
// comparison against the reference lifestyle is coupled (low variance).
export function runCohort(decisions, ctx = DEFAULT_CONTEXT, n = 600) {
  const out = { n, initiated: 0, invasiveDx: 0, dcis: 0, stage: { I: 0, II: 0, III: 0, IV: 0 }, deaths: 0, byScreen: 0, ages: [] };
  for (let i = 0; i < n; i++) {
    const s = runToEnd({ ...ctx, seed: 1000 + i * 7919 }, decisions);
    if (s.initiations > 0) out.initiated++;
    if (s.dx) {
      if (s.dx.stage === 'DCIS') out.dcis++;
      else {
        out.invasiveDx++;
        out.stage[s.dx.stage]++;
        out.ages.push(s.dx.age);
      }
      if (s.dx.via === 'screening') out.byScreen++;
    }
    if (s.status === 'dead') out.deaths++;
  }
  out.ages.sort((a, b) => a - b);
  out.medianAge = out.ages.length ? out.ages[Math.floor(out.ages.length / 2)] : null;
  out.risk = out.invasiveDx / n;
  out.mortality = out.deaths / n;
  return out;
}

export function compareToReference(decisions, ctx = DEFAULT_CONTEXT, n = 600) {
  const ref = runCohort(DEFAULT_DECISIONS, ctx, n);
  const cur = runCohort(decisions, ctx, n);
  return { ref, cur, relRisk: ref.risk > 0 ? cur.risk / ref.risk : null, relMortality: ref.deaths > 0 ? cur.mortality / ref.mortality : null };
}
