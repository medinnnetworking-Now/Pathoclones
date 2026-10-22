// What contributes to reversal and prevention. Strength labels mirror data/evidence.js.
export const REVERSAL_INTRO = {
  caption: 'what lets the light return',
  body: 'Early changes can fade when their surroundings change. Established cancer needs treatment, but habits still shape prevention and recurrence. Try the levers below and watch an early clone respond.',
};

export const CONTRIBUTORS = [
  {
    id: 'move', title: 'Movement', habit: 'move', lever: 'activity',
    effect: 'About 3% lower risk for every 10 MET-hours a week of recreational activity. 10 MET-hours is roughly 2.5 hours of brisk walking.',
    strength: 'anchored', sources: ['activity2018', 'activity2017'],
  },
  {
    id: 'alcohol', title: 'Less alcohol', habit: 'drink', lever: 'alcohol',
    effect: 'About 10% higher risk for every 10 g of alcohol a day. A US standard drink is about 14 g. One review concluded that no level of intake is free of cancer risk.',
    strength: 'anchored', sources: ['sun2020', 'jun2023', 'zhou2022'],
  },
  {
    id: 'plants', title: 'A plant-rich plate', habit: 'plate', lever: 'fiber',
    effect: 'In women who already had breast cancer, the highest fiber intake went with 28% lower breast-cancer-specific mortality, and soy isoflavones with 26% lower recurrence. These studies are observational.',
    strength: 'directional', sources: ['fiber2020', 'vandie2024', 'ho2021', 'mauny2022'],
  },
  {
    id: 'weight', title: 'A steady weight', habit: 'weight', lever: 'bmi',
    effect: 'After menopause, body fat makes estrogen, which feeds breast tissue. The size of this effect in the model is a teaching assumption.',
    strength: 'pending', sources: [],
  },
  {
    id: 'scan', title: 'Screening', habit: 'scan', lever: 'screening',
    effect: 'Screening finds cancers earlier. In trials of women 50 to 69, breast cancer deaths fell by about 23%. The review estimated an overdiagnosis probability of about 17% at those ages.',
    strength: 'directional', sources: ['ecig2021', 'ctfphc2024'],
  },
  {
    id: 'hormones', title: 'Hormone therapy choices', habit: null, lever: 'hrt',
    effect: 'Estrogen plus progestin after menopause increases breast cancer risk. Estrogen alone had little effect on risk. Decisions depend on symptoms and personal risk.',
    strength: 'directional', sources: ['kim2024', 'prentice2021'],
  },
];

export const STRENGTH = {
  anchored: 'STRONG LINK',
  directional: 'LINKED, SIZE GUESSED',
  pending: 'MODEL GUESS',
};
