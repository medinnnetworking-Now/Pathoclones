import { DEFAULT_DECISIONS, DEFAULT_CONTEXT } from '../sim/engine.js';

// Each habit has three big choices. `map` translates a choice into engine decisions.
export const HABITS = [
  {
    id: 'drink', name: 'DRINKS', icon: 'wine', lever: ['alcohol'],
    levels: ['NONE', '1 A DAY', '2+ A DAY'],
    map: [{ alcohol: 0 }, { alcohol: 14 }, { alcohol: 28 }],
    why: 'Alcohol raises breast cancer risk in a steady, dose-linked way: about 10% more risk for every 10 g of alcohol a day. One US drink is about 14 g.',
  },
  {
    id: 'move', name: 'MOVE', icon: 'bell', lever: ['activity'],
    levels: ['COUCH', 'WALK', 'ACTIVE'],
    map: [{ activity: 2 }, { activity: 12 }, { activity: 30 }],
    why: 'Regular activity is linked to lower risk: about 3% less per 10 MET-hours a week. 12 MET-hours is roughly 3 hours of brisk walking.',
  },
  {
    id: 'weight', name: 'WEIGHT', icon: 'scale', lever: ['bmi'],
    levels: ['LEAN', 'AVERAGE', 'HEAVY'],
    map: [{ bmi: 22 }, { bmi: 27 }, { bmi: 33 }],
    why: 'After menopause, body fat makes estrogen, which feeds breast tissue. In this game the effect is a teaching assumption, so it is marked as a guess.',
  },
  {
    id: 'plate', name: 'PLATE', icon: 'apple', lever: ['fiber', 'soy'],
    levels: ['JUNK', 'MIXED', 'PLANTS'],
    map: [{ fiber: 10, soy: 0 }, { fiber: 18, soy: 15 }, { fiber: 35, soy: 45 }],
    why: 'In women who already have breast cancer, more fiber and soy foods are linked to better survival. In the game they slow tumors that already exist. They do not stop new clones.',
  },
  {
    id: 'scan', name: 'SCANS', icon: 'ribbon', lever: ['screening'],
    levels: ['NONE', 'EVERY 2Y', 'YEARLY'],
    map: [{ screening: 0 }, { screening: 1 }, { screening: 2 }],
    why: 'Mammograms find tumors earlier, and trials show fewer breast cancer deaths. They also find some tumors that would never have caused harm. In the game: every 2 years from 50 to 74, or yearly from 40.',
  },
];

export const LEVELS = [
  {
    id: 'rookie',
    name: 'ROOKIE',
    tag: 'A small clone appears at 40. Steer it away.',
    ctx: { ...DEFAULT_CONTEXT, startAge: 40, endAge: 85, inherited: 0 },
    options: { startLesion: 1, startSize: 3 },
    habits: { drink: 1, move: 1, weight: 1, plate: 1, scan: 1 },
  },
  {
    id: 'warrior',
    name: 'WARRIOR',
    tag: 'Age 45. An atypical clone and rough habits. Turn it around.',
    ctx: { ...DEFAULT_CONTEXT, startAge: 45, endAge: 85, inherited: 0 },
    options: { startLesion: 2, startSize: 4 },
    habits: { drink: 2, move: 0, weight: 2, plate: 0, scan: 0 },
  },
  {
    id: 'legend',
    name: 'LEGEND',
    tag: 'Inherited high risk. Clones come back. Hold the line.',
    ctx: { ...DEFAULT_CONTEXT, startAge: 35, endAge: 85, inherited: 2 },
    options: { startLesion: 1, startSize: 3 },
    habits: { drink: 1, move: 1, weight: 1, plate: 1, scan: 2 },
  },
];

export function decisionsFor(levels) {
  const d = { ...DEFAULT_DECISIONS };
  for (const h of HABITS) Object.assign(d, h.map[levels[h.id]]);
  return d;
}

export const STAGE_NAMES = ['NORMAL', 'HYPERPLASIA', 'ATYPIA', 'DCIS', 'INVASIVE'];
export const STAGE_BLURB = [
  'Healthy lobules.',
  'Too many cells. Usually harmless.',
  'Odd-looking cells. Higher risk.',
  'Cancer cells, still inside the duct.',
  'Cancer has broken out of the duct.',
];
