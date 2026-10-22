import { DEFAULT_DECISIONS, DEFAULT_CONTEXT } from '../sim/engine.js';

export const CONTROL_GROUPS = [
  {
    title: 'Nutrition',
    items: [
      { key: 'fiber', label: 'Dietary fiber', unit: 'g/day', min: 5, max: 50, step: 1, lever: 'fiber', note: 'Acts on established disease in the model.' },
      { key: 'soy', label: 'Soy isoflavones', unit: 'mg/day', min: 0, max: 100, step: 1, lever: 'soy', note: 'Survivor-cohort evidence; acts on established disease.' },
      { key: 'alcohol', label: 'Alcohol', unit: 'g/day', min: 0, max: 40, step: 1, lever: 'alcohol', note: 'About 14 g of ethanol per US standard drink.' },
    ],
  },
  {
    title: 'Body & movement',
    items: [
      { key: 'activity', label: 'Recreational activity', unit: 'MET-h/wk', min: 0, max: 60, step: 1, lever: 'activity', note: '10 MET-h/wk is roughly 2.5 h of brisk walking.' },
      { key: 'bmi', label: 'Body mass index', unit: 'kg/m²', min: 18, max: 40, step: 0.5, lever: 'bmi', note: 'Raises postmenopausal estrogenic drive.' },
    ],
  },
  {
    title: 'Medical',
    items: [
      {
        key: 'hrt', label: 'Menopausal hormone therapy', kind: 'select', lever: 'hrt',
        options: [[0, 'None'], [1, 'Estrogen only'], [2, 'Estrogen + progestin']],
      },
      {
        key: 'screening', label: 'Mammography screening', kind: 'select', lever: 'screening',
        options: [[0, 'None'], [1, 'Every 2 years, 50-74'], [2, 'Annual from 40']],
      },
    ],
  },
];

export const INHERITED = [
  [0, 'Average'],
  [1, 'Family history (≈×2)'],
  [2, 'High-penetrance variant (≈×6)'],
];

const PROTECTIVE = { ...DEFAULT_DECISIONS, activity: 45, fiber: 40, bmi: 22, alcohol: 0, soy: 40 };

export const SCENARIOS = [
  {
    id: 'reference',
    name: 'Reference life',
    blurb: 'Average risk, biennial screening, age 30 to 85. Randomised luck: press Play and watch.',
    ctx: { ...DEFAULT_CONTEXT },
    decisions: { ...DEFAULT_DECISIONS },
    speed: 24,
  },
  {
    id: 'window',
    name: 'Reversal window',
    blurb: 'A hyperplastic clone at 45 under a protective lifestyle. Watch it get out-competed, then relax the levers.',
    ctx: { ...DEFAULT_CONTEXT, startAge: 45, seed: 77 },
    decisions: PROTECTIVE,
    options: { startLesion: 1, startSize: 4 },
    speed: 8,
  },
  {
    id: 'drift',
    name: 'Drift toward breach',
    blurb: 'An atypical clone at 45 with alcohol, weight gain and little movement. See how it climbs to DCIS and invasion.',
    ctx: { ...DEFAULT_CONTEXT, startAge: 45, seed: 5 },
    decisions: { ...DEFAULT_DECISIONS, alcohol: 20, bmi: 31, activity: 2, fiber: 10, soy: 0, hrt: 0 },
    options: { startLesion: 2, startSize: 4 },
    speed: 8,
  },
  {
    id: 'variant',
    name: 'High-risk variant',
    blurb: 'Inherited high-penetrance risk with annual screening from 40. Lifestyle shifts risk, screening shifts stage.',
    ctx: { ...DEFAULT_CONTEXT, inherited: 2, seed: 31 },
    decisions: { ...DEFAULT_DECISIONS, screening: 2 },
    speed: 24,
  },
];

export const STAGE_COLORS = ['#59b8f5', '#ffc757', '#ff8049', '#ee47c7', '#ff3347'];
export const STAGE_NAMES = ['Normal', 'Hyperplasia', 'Atypia', 'DCIS', 'Invasive'];

export function spectral(view) {
  if (view.status === 'dead') return { clinical: 'End of simulation', cls: 'Extinct' };
  if (view.status === 'recurrent' || view.distant) return { clinical: 'Metastatic disease', cls: 'Gamma-ray burst' };
  if (view.status === 'treated') return { clinical: 'Post-treatment surveillance', cls: 'Remnant under watch' };
  if (view.x[4] > 0.05) return { clinical: 'Invasive carcinoma', cls: 'Supernova' };
  if (view.x[3] > 0.05) return { clinical: 'Ductal carcinoma in situ', cls: 'Contained core collapse' };
  if (view.x[2] > 0.05) return { clinical: 'Atypical hyperplasia', cls: 'Red-shifted clone' };
  if (view.x[1] > 0.05) return { clinical: 'Usual-type hyperplasia', cls: 'Brightening protostar' };
  return { clinical: 'Normal tissue', cls: 'Main-sequence' };
}

export function catalogId(seed) {
  const n = Math.abs(seed | 0);
  const ra = String((n % 2400) / 100).padStart(5, '0').replace('.', 'h');
  const dec = ((n >> 5) % 8999 + 1000).toString();
  return `PC-BR ${ra}${n % 2 ? '+' : '-'}${dec.slice(0, 2)}${dec.slice(2, 4)}`;
}
