import React, { useState } from 'react';
import { CONTRIBUTORS, REVERSAL_INTRO, STRENGTH } from '../content/reversal.js';
import { SourceList } from './Story.jsx';

export const HABITS = [
  { id: 'drink', name: 'Drinks', levels: ['none', '1 a day', '2+ a day'], map: [{ alcohol: 0 }, { alcohol: 14 }, { alcohol: 28 }] },
  { id: 'move', name: 'Movement', levels: ['couch', 'walk', 'active'], map: [{ activity: 2 }, { activity: 12 }, { activity: 30 }] },
  { id: 'weight', name: 'Weight', levels: ['lean', 'average', 'heavy'], map: [{ bmi: 22 }, { bmi: 27 }, { bmi: 33 }] },
  { id: 'plate', name: 'Plate', levels: ['junk', 'mixed', 'plants'], map: [{ fiber: 10, soy: 0 }, { fiber: 18, soy: 15 }, { fiber: 35, soy: 45 }] },
  { id: 'scan', name: 'Scans', levels: ['none', 'every 2y', 'yearly'], map: [{ screening: 0 }, { screening: 1 }, { screening: 2 }] },
];

export function ReversalPanel({ lab, habits, onHabit, onRestart, onTogglePlay }) {
  const [open, setOpen] = useState(null);
  const shrink = lab && lab.prolifRel < 0.97;
  return (
    <div className="reversal">
      <div className="top-copy">
        <span className="count mono">REVERSAL <i>and prevention</i></span>
        <h2 className="caption">{REVERSAL_INTRO.caption}</h2>
      </div>

      <section className="drawer" aria-label="Reversal lab">
        <p className="body">{REVERSAL_INTRO.body}</p>

        <div className="readout mono" aria-live="polite">
          <span>AGE <b>{lab ? Math.floor(lab.age) : 45}</b></span>
          <span>GROWTH <b className={shrink ? 'ok' : 'bad'}>{lab ? Math.round(lab.prolifRel * 100) : 100}%</b></span>
          <span>RISK <b>x{lab ? lab.mult.total.toFixed(2) : '1.00'}</b></span>
          <span className={`state ${shrink ? 'ok' : 'bad'}`}>{!lab ? '' : lab.total < 0.05 ? 'CLONE FADED' : shrink ? 'SHRINK ZONE' : lab.x[4] > 0.05 ? 'INVASIVE' : 'GROWING'}</span>
        </div>

        <div className="lab-controls">
          <button className="pill" onClick={onTogglePlay}>{lab?.playing ? 'Pause' : 'Play'}</button>
          <button className="pill" onClick={onRestart}>Restart</button>
        </div>

        <div className="habit-rows">
          {HABITS.map((h) => (
            <div className="habit" key={h.id}>
              <span className="mono">{h.name}</span>
              <div className="seg" role="radiogroup" aria-label={h.name}>
                {h.levels.map((l, i) => (
                  <button key={l} role="radio" aria-checked={habits[h.id] === i} className={habits[h.id] === i ? 'on' : ''} onClick={() => onHabit(h, i)}>{l}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <h3 className="mono eyebrow">What contributes</h3>
        <ul className="contrib">
          {CONTRIBUTORS.map((c) => (
            <li key={c.id} className={open === c.id ? 'open' : ''}>
              <button onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id}>
                <span>{c.title}</span>
                <em className={`tag ${c.strength}`}>{STRENGTH[c.strength]}</em>
              </button>
              {open === c.id && (
                <div className="contrib-body">
                  <p>{c.effect}</p>
                  <SourceList ids={c.sources} />
                </div>
              )}
            </li>
          ))}
        </ul>
        <p className="note">Early clones can fade when their surroundings change. In this model, in situ and invasive cancers do not regress through lifestyle and need treatment. Associations from population studies cannot predict one person's outcome.</p>
      </section>
    </div>
  );
}
