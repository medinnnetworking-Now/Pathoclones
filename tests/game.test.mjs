import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeFor, riskMeter, growthMeter, monthPoints, eventFor, windowOpen } from '../src/game/scoring.js';
import { decisionsFor, HABITS, LEVELS } from '../src/game/levels.js';
import { createState, step, DEFAULT_DECISIONS } from '../src/sim/engine.js';

test('grades reward healthy years and cap late finds', () => {
  assert.equal(gradeFor(480, 45, false), 'S');
  assert.equal(gradeFor(480, 45, false, { stage: 'II' }), 'B');
  assert.equal(gradeFor(480, 45, false, { stage: 'IV' }), 'C');
  assert.equal(gradeFor(480, 45, false, { stage: 'DCIS' }), 'S');
  assert.equal(gradeFor(480, 45, true), 'D');
});

test('meters mark baseline and the shrink zone', () => {
  assert.equal(riskMeter(1).tone, 'ok');
  assert.ok(Math.abs(riskMeter(1).pct - riskMeter(1).baselinePct) < 1e-9);
  assert.equal(riskMeter(2.5).tone, 'bad');
  assert.equal(growthMeter(0.9).shrink, true);
  assert.equal(growthMeter(1.2).shrink, false);
});

test('habit choices map to engine decisions', () => {
  const d = decisionsFor({ drink: 2, move: 2, weight: 0, plate: 2, scan: 2 });
  assert.equal(d.alcohol, 28);
  assert.equal(d.activity, 30);
  assert.equal(d.bmi, 22);
  assert.equal(d.fiber, 35);
  assert.equal(d.screening, 2);
  for (const lv of LEVELS) for (const h of HABITS) assert.ok(h.map[lv.habits[h.id]], `${lv.id}/${h.id}`);
});

test('a protective run earns shrink-zone points and a clone-faded event', () => {
  const lv = LEVELS[0];
  const d = decisionsFor({ drink: 0, move: 2, weight: 0, plate: 2, scan: 1 });
  let faded = 0, shrinkMonths = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const ctx = { ...lv.ctx, seed };
    const s = createState(ctx, d, lv.options);
    let seen = 0;
    for (let t = 0; t < 240 && s.status === 'lesion'; t++) {
      step(s, ctx, d);
      if (windowOpen(s)) shrinkMonths++;
      for (; seen < s.log.length; seen++) {
        const ev = eventFor(s.log[seen], s);
        if (ev && ev.pts === 100) faded++;
      }
    }
  }
  assert.ok(faded > 15, `faded ${faded}/40`);
  assert.ok(shrinkMonths > 0);
  assert.ok(monthPoints({ status: 'healthy', x: [0, 0, 0, 0, 0], prolifRel: 1 }) > 0.8);
});

test('bad habits keep the clone growing', () => {
  const lv = LEVELS[1];
  const d = decisionsFor(lv.habits);
  const ctx = { ...lv.ctx, seed: 3 };
  const s = createState(ctx, d, lv.options);
  for (let t = 0; t < 12; t++) step(s, ctx, d);
  assert.ok(s.prolifRel > 1.05, `prolifRel ${s.prolifRel}`);
  assert.ok(!windowOpen(s));
  assert.ok(DEFAULT_DECISIONS.alcohol === 0);
});
