import { TONES } from './journey.js';

// Set this to an official video's embed URL (for example an NHS or Komen YouTube embed) once it has been
// checked on the live page. While null, the page links out to the official video pages instead.
export const VIDEO_EMBED = null;

// Official pages that carry a self-exam or self-awareness video. Guidance on this page is summarized from them.
export const OFFICIAL_VIDEOS = [
  { org: 'NHS', title: 'How to check your breasts or chest', url: 'https://www.nhs.uk/tests-and-treatments/how-to-check-your-breasts-or-chest/' },
  { org: 'National Breast Cancer Foundation', title: 'Breast self-exam, step by step', url: 'https://www.nationalbreastcancer.org/breast-self-exam/' },
  { org: 'Susan G. Komen', title: 'Your guide to breast self-awareness', url: 'https://www.komen.org/breast-cancer/screening/self-awareness/' },
];

export const SELF_STEPS = [
  {
    id: 'know',
    caption: 'know your normal',
    verb: 'notice',
    tone: TONES.mint,
    stats: [['GOAL', 'KNOW YOUR NORMAL'], ['HOW OFTEN', 'REGULARLY']],
    clinical: 'Breast self-awareness',
    body: 'Every breast is different. Get to know how yours usually looks and feels, so that a change stands out. Breasts also change with the menstrual cycle, pregnancy, breastfeeding and menopause.',
    more: [
      'Self-checks do not replace screening mammograms or visits to a clinician.',
      'Susan G. Komen notes that self-exam is not recommended as a screening tool on its own. Mammograms and clinical exams are.',
      'Guidance on these pages is summarized from the NHS, the National Breast Cancer Foundation and Susan G. Komen.',
    ],
    sources: [],
  },
  {
    id: 'look',
    caption: 'look, then compare',
    verb: 'compare',
    tone: TONES.violet,
    stats: [['LOOK FOR', 'SIZE · SHAPE · SKIN'], ['COMPARE', 'LEFT TO RIGHT']],
    clinical: 'Look in a mirror',
    body: 'Stand in front of a mirror with your arms at your sides, then raise them overhead. Look at both breasts for changes in size, shape, skin or nipples. Turn from side to side.',
    more: [
      'Some difference between the two breasts is normal.',
      'You are looking for something new, not something perfect.',
    ],
    sources: [],
  },
  {
    id: 'feel',
    caption: 'feel, in small circles',
    verb: 'map',
    tone: TONES.pink,
    stats: [['PRESSURE', 'LIGHT · MEDIUM · FIRM'], ['AREA', 'COLLARBONE TO ARMPIT']],
    clinical: 'Feel each breast',
    body: 'Use the pads of your middle fingers. Feel in small circles, covering the whole breast from the collarbone down and out to the armpit, and around the nipple. Use light, then medium, then firm pressure. Many people do this lying down or in the shower.',
    more: [
      'Check both breasts and both armpits the same way.',
      'Lumps can be normal tissue, cysts or something else. A clinician can tell.',
    ],
    sources: [],
  },
  {
    id: 'act',
    caption: 'when something changes',
    verb: 'report',
    tone: TONES.amber,
    stats: [['MOST CHANGES', 'NOT CANCER'], ['SEE A CLINICIAN', 'SOON']],
    clinical: 'What to report',
    body: 'See a clinician about a new lump or thickening, a change in size or shape, dimpling or redness of the skin, a nipple that turns inward or leaks, pain that does not go away, or swelling in the armpit. Most changes are not cancer, but they are worth checking promptly.',
    more: [
      'Do not wait for your next scheduled mammogram.',
      'Bring notes on when you first noticed the change.',
    ],
    sources: [],
  },
  {
    id: 'watch',
    caption: 'watch it done',
    verb: 'learn',
    tone: TONES.lime,
    stats: [['OFFICIAL', 'NHS · NBCF · KOMEN'], ['THEN', 'TRY IT']],
    clinical: 'Official videos',
    body: 'Trusted health organizations publish short videos that show each step. Watch one, then try it yourself.',
    videos: OFFICIAL_VIDEOS,
    embed: VIDEO_EMBED,
    more: [
      'These links open the official pages, where each organization hosts its own video.',
      'This site does not host or edit those videos.',
    ],
    sources: [],
  },
];
