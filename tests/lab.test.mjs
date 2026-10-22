import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONTEXT as C, DEFAULT_DECISIONS as D, createState, step } from '../src/sim/engine.js';
import { HABITS, levelEffect } from '../src/content/habits.js';

const decisions = (h) => { const d = { ...D }; for (const x of HABITS) Object.assign(d, x.map[h[x.id]]); return d; };
const MID = { drink: 1, move: 1, weight: 1, plate: 1, scan: 1 };
const GOOD = { drink: 0, move: 2, weight: 0, plate: 2, scan: 1 };
const ROUGH = { drink: 2, move: 0, weight: 2, plate: 0, scan: 1 };

function run(start, change, seed) {
  const ctx = { ...C, startAge: 45, endAge: 85, seed };
  let d = decisions(start);
  const s = createState(ctx, d, { startLesion: 1, startSize: 4 });
  const cleared = () => s.status === 'healthy' && s.x[1] + s.x[2] + s.x[3] + s.x[4] < 0.05;
  for (let t = 0; t < 24; t++) step(s, ctx, d);       // two years at the starting habits
  d = decisions(change);
  for (let t = 0; t < 240 && s.status === 'lesion'; t++) step(s, ctx, d);
  return { cleared: cleared(), progressed: s.x[3] + s.x[4] > 0.05 || s.status !== 'lesion' && !cleared() };
}

test('switching to protective habits fades the early clone far more often than staying rough', () => {
  let good = 0, rough = 0;
  for (let seed = 1; seed <= 60; seed++) {
    if (run(MID, GOOD, seed).cleared) good++;
    if (run(MID, ROUGH, seed).cleared) rough++;
  }
  assert.ok(good >= 30, `good ${good}/60`);
  assert.ok(good > rough + 20, `good ${good} vs rough ${rough}`);
});

test('every choice shows a multiplier that moves the right way', () => {
  const drink = HABITS.find((h) => h.id === 'drink');
  assert.ok(levelEffect(drink, 0).v < levelEffect(drink, 1).v && levelEffect(drink, 1).v < levelEffect(drink, 2).v);
  const move = HABITS.find((h) => h.id === 'move');
  assert.ok(levelEffect(move, 2).v < levelEffect(move, 0).v);
  const plate = HABITS.find((h) => h.id === 'plate');
  assert.ok(levelEffect(plate, 2).v < levelEffect(plate, 0).v);
  assert.equal(levelEffect(HABITS.find((h) => h.id === 'scan'), 0).v, null);
});
