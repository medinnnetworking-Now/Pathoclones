import { riskMultipliers, lateDiseaseMultipliers, DEFAULT_DECISIONS } from '../sim/engine.js';

export const HABITS = [
  {
    id: 'drink', name: 'Drinks', hint: 'More alcohol, more chance a new clone appears.',
    levels: ['none', '1 a day', '2+ a day'], map: [{ alcohol: 0 }, { alcohol: 14 }, { alcohol: 28 }],
  },
  {
    id: 'move', name: 'Movement', hint: 'More movement, less chance a new clone appears.',
    levels: ['couch', 'walk', 'active'], map: [{ activity: 2 }, { activity: 12 }, { activity: 30 }],
  },
  {
    id: 'weight', name: 'Weight', hint: 'After menopause, extra weight raises risk. The size is a model guess.',
    levels: ['lean', 'average', 'heavy'], map: [{ bmi: 22 }, { bmi: 27 }, { bmi: 33 }],
  },
  {
    id: 'plate', name: 'Plate', hint: 'Fiber and soy are linked to slower growth of tumors that already exist.',
    levels: ['junk', 'mixed', 'plants'], map: [{ fiber: 10, soy: 0 }, { fiber: 18, soy: 15 }, { fiber: 35, soy: 45 }],
  },
  {
    id: 'scan', name: 'Scans', hint: 'Scans find tumors earlier, when treatment works best.',
    levels: ['none', 'every 2y', 'yearly'], map: [{ screening: 0 }, { screening: 1 }, { screening: 2 }],
  },
];

// Effect of one choice on the model, for display next to the button.
export function levelEffect(h, i) {
  const d = { ...DEFAULT_DECISIONS, ...h.map[i] };
  if (h.id === 'drink') return { v: riskMultipliers(d, true).alcohol, text: 'risk' };
  if (h.id === 'move') return { v: riskMultipliers(d, true).activity, text: 'risk' };
  if (h.id === 'weight') return { v: riskMultipliers(d, true).adiposity, text: 'risk' };
  if (h.id === 'plate') { const l = lateDiseaseMultipliers(d); return { v: l.soy * l.fiber, text: 'growth' }; }
  return { v: null, text: ['later', 'earlier', 'earliest'][i] };
}
