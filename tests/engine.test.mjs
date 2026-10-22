import test from 'node:test';
import assert from 'node:assert/strict';
import { runCohort } from '../src/sim/cohort.js';
import { DEFAULT_DECISIONS as D, DEFAULT_CONTEXT as C, createState, step, snapshot, riskMultipliers, lateDiseaseMultipliers, runToEnd } from '../src/sim/engine.js';

test('evidence-anchored multipliers match published effect sizes', () => {
  assert.ok(Math.abs(riskMultipliers({ ...D, alcohol: 10 }, false).alcohol - 1.10) < 1e-9);
  assert.ok(Math.abs(riskMultipliers({ ...D, alcohol: 10 }, true).alcohol - 1.11) < 1e-9);
  assert.ok(Math.abs(riskMultipliers({ ...D, activity: 20 }, false).activity - 0.97) < 1e-9);
  assert.ok(Math.abs(lateDiseaseMultipliers({ ...D, soy: 60 }).soy - 0.74) < 1e-9);
  assert.ok(Math.abs(lateDiseaseMultipliers({ ...D, fiber: 30 }).fiber - 0.72) < 1e-9);
});

test('same seed + same decisions is deterministic', () => {
  const a = runToEnd(C, D);
  const b = runToEnd(C, D);
  assert.equal(JSON.stringify(a.log), JSON.stringify(b.log));
});

test('snapshots resume exactly (timeline branching depends on this)', () => {
  const s = createState(C, D);
  for (let i = 0; i < 200; i++) step(s, C, D);
  const snap = snapshot(s);
  const fork = snapshot(snap);
  for (let i = 0; i < 300; i++) { step(s, C, D); step(fork, C, D); }
  assert.equal(JSON.stringify(s), JSON.stringify(fork));
});

test('reference lifestyle gives a plausible invasive-diagnosis rate', () => {
  const r = runCohort(D, C, 2000);
  assert.ok(r.risk > 0.08 && r.risk < 0.17, `invasive risk ${r.risk}`);
  assert.ok(r.mortality < 0.07, `mortality ${r.mortality}`);
});

test('directional checks: risk factors raise, protective factors lower incidence', () => {
  const n = 2000;
  const ref = runCohort(D, C, n).risk;
  assert.ok(runCohort({ ...D, alcohol: 20 }, C, n).risk > ref);
  assert.ok(runCohort({ ...D, hrt: 2 }, C, n).risk > ref);
  assert.ok(runCohort({ ...D, activity: 40 }, C, n).risk < ref);
  assert.ok(runCohort(D, { ...C, inherited: 2 }, n).risk > ref * 1.5);
});

test('screening shifts detection earlier and lowers modeled mortality', () => {
  const n = 2000;
  const none = runCohort({ ...D, screening: 0 }, C, n);
  const scr = runCohort({ ...D, screening: 1 }, C, n);
  assert.ok(scr.mortality < none.mortality);
  assert.ok(scr.byScreen > 0 && none.byScreen === 0);
});

test('soy + fiber (late-disease levers) lower mortality, not initiation', () => {
  const n = 2000;
  const ref = runCohort(D, C, n);
  const diet = runCohort({ ...D, soy: 60, fiber: 30 }, C, n);
  assert.equal(diet.initiated, ref.initiated);
  assert.ok(diet.mortality <= ref.mortality);
});

test('a hyperplastic teaching lesion can regress under a protective lifestyle', () => {
  const protective = { ...D, activity: 45, fiber: 40, bmi: 22, alcohol: 0 };
  let regressed = 0;
  for (let i = 0; i < 60; i++) {
    const ctx = { ...C, startAge: 45, seed: 500 + i };
    const s = createState(ctx, protective, { startLesion: 1, startSize: 4 });
    for (let t = 0; t < 240 && s.status === 'lesion'; t++) step(s, ctx, protective);
    if (s.log.some((l) => l.kind === 'regress')) regressed++;
  }
  assert.ok(regressed > 20, `regressed ${regressed}/60`);
});
