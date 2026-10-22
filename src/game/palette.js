// Colors and 9x9 pixel sprites shared by the board and the UI.

export const STAGE_HEX = ['#3fa7ff', '#ffd13b', '#ff8a3d', '#e83fc4', '#ff3347'];
export const MINT = '#5cf2b0';
export const PINK = '#ff6fb5';

export const SPRITE_PAL = {
  w: '#e9e4ff', g: '#8f7fc7', r: '#ff3347', p: '#ff6fb5', k: '#5cf2b0', y: '#ffd13b', b: '#3fa7ff', n: '#6b4a2b', d: '#2a1a4a',
};

export const SPRITES = {
  wine: [
    '.wwwwwww.',
    '.wrrrrrw.',
    '.wrrrrrw.',
    '..wrrrw..',
    '...www...',
    '....w....',
    '....w....',
    '....w....',
    '..wwwww..',
  ],
  bell: [
    '.........',
    'ww.....ww',
    'wwwwwwwww',
    'wwwwwwwww',
    'wwwwwwwww',
    'ww.....ww',
    '.........',
    '.........',
    '.........',
  ],
  scale: [
    '..wwwww..',
    '.w.....w.',
    'w..rrr..w',
    'w..r.r..w',
    'wwwwwwwww',
    'wggggggw.',
    'wggggggw.',
    'wwwwwwwww',
    '.........',
  ],
  apple: [
    '....n....',
    '...nk....',
    '.rr.rr...',
    'rrrrrrrr.',
    'rrrrrrrr.',
    'rrrrrrrr.',
    '.rrrrrr..',
    '..rr.rr..',
    '.........',
  ],
  ribbon: [
    '...ppp...',
    '..pp.pp..',
    '..pp.pp..',
    '...ppp...',
    '...ppp...',
    '..pp.pp..',
    '.pp...pp.',
    'pp.....pp',
    '.........',
  ],
  heart: [
    '.pp...pp.',
    'pppp.pppp',
    'ppppppppp',
    'ppppppppp',
    '.ppppppp.',
    '..ppppp..',
    '...ppp...',
    '....p....',
    '.........',
  ],
  skull: [
    '..wwwww..',
    '.wwwwwww.',
    'wwdwwwdww',
    'wwdwwwdww',
    'wwwwdwwww',
    '.wwwwwww.',
    '..wdwdw..',
    '..wwwww..',
    '.........',
  ],
  star: [
    '....y....',
    '....y....',
    '...yyy...',
    'yyyyyyyyy',
    '.yyyyyyy.',
    '..yyyyy..',
    '..yy.yy..',
    '.yy...yy.',
    '.........',
  ],
};

export function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

export function shade(hex, amt) {
  const p = parseInt(hex.slice(1), 16);
  const c = (s) => Math.max(0, Math.min(255, Math.round(((p >> s) & 255) * (1 + amt))));
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}
