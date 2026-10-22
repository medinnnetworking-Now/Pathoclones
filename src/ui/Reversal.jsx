import React, { useState } from 'react';
import { CONTRIBUTORS, STRENGTH } from '../content/reversal.js';
import { SourceList } from './Story.jsx';
import { HABITS, levelEffect } from '../content/habits.js';

export { HABITS, levelEffect };

const tone = (v) => (v == null ? '' : v < 0.97 ? 'good' : v > 1.03 ? 'bad' : '');
const clamp = (v) => Math.min(1, Math.max(0, v));

function biggestLever(habits) {
  const best = { drink: 0, move: 2, weight: 0 };
  let pick = null, gain = 0.03;
  for (const id of Object.keys(best)) {
    const h = HABITS.find((x) => x.id === id);
    const g = 1 - levelEffect(h, best[id]).v / levelEffect(h, habits[id]).v;
    if (g > gain) { gain = g; pick = { h, g, to: best[id] }; }
  }
  return pick;
}

export function takeaway(lab, habits) {
  if (!lab) return '';
  if (lab.total < 0.05) return 'The early clone has faded. Healthy cells won back the space.';
  if (lab.x[3] + lab.x[4] > 0.05) return 'This clone has become cancer. Habits no longer make it fade in this model. It needs treatment. Press Restart to try again.';
  if (lab.prolifRel < 0.97) return 'Growth pressure is below the line, so the early clone is fading.';
  const pick = biggestLever(habits);
  if (pick) return `Growth pressure is above the line. Biggest lever: ${pick.h.name.toLowerCase()}. Choosing "${pick.h.levels[pick.to]}" lowers risk about ${Math.round(pick.g * 100)}%${pick.h.id === 'weight' ? ' (model guess)' : ''}.`;
  return 'Growth pressure is above the line. Try moving the levers toward the first option in each card.';
}

function Meter({ label, value, pct, line, toneName, note }) {
  return (
    <div className="meter">
      <div className="meter-head mono"><span>{label}</span><b className={toneName}>{value}</b></div>
      <div className={`bar ${toneName}`}><i style={{ width: `${Math.round(pct * 100)}%` }} /><u style={{ left: `${line * 100}%` }} /></div>
      <span className={`meter-note mono ${toneName}`}>{note}</span>
    </div>
  );
}

export function EvidenceSheet({ onClose }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <aside className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="What contributes to prevention">
        <header>
          <div><span className="mono eyebrow">Evidence</span><h3>What contributes</h3></div>
          <button className="pill" onClick={onClose} aria-label="Close">Close</button>
        </header>
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
        <p className="note">Early clones can fade when their surroundings change. In this model, in situ and invasive cancers do not regress through lifestyle and need treatment. Associations from population studies describe groups and cannot predict one person's outcome.</p>
      </aside>
    </div>
  );
}

export function ReversalPanel({ lab, habits, onHabit, onRestart, onTogglePlay, onEvidence }) {
  const [collapsed, setCollapsed] = useState(false);
  const risk = lab ? lab.mult.total : 1;
  const rPct = clamp((Math.log2(Math.max(0.01, risk)) + 1) / 3);
  const rTone = risk < 0.95 ? 'good' : risk < 1.05 ? '' : risk < 1.3 ? 'warn' : 'bad';
  const g = lab ? lab.prolifRel : 1;
  const gPct = clamp((g - 0.8) / 0.8);
  const gLine = (0.97 - 0.8) / 0.8;
  const shrink = g < 0.97;
  const faded = lab && lab.total < 0.05;
  const gTone = faded || shrink ? 'good' : g < 1.1 ? '' : g < 1.3 ? 'warn' : 'bad';
  return (
    <div className="reversal">
      <div className="top-copy">
        <span className="count mono">REVERSAL <i>and prevention</i></span>
        <h2 className="caption">what lets the light return</h2>
      </div>

      <section className={`dock ${collapsed ? 'collapsed' : ''}`} aria-label="Risk factors">
        <header className="dock-head">
          <span className="mono age">AGE <b>{lab ? Math.floor(lab.age) : 45}</b></span>
          <button className="pill" onClick={onTogglePlay}>{lab?.playing ? 'Pause' : 'Play'}</button>
          <button className="pill" onClick={onRestart}>Restart</button>
          <button className="pill ghost" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed}>{collapsed ? 'Show controls' : 'Hide'}</button>
        </header>

        <div className="meters">
          <Meter label="NEW CLONES" value={`x${risk.toFixed(2)}`} pct={rPct} line={1 / 3} toneName={rTone}
            note={risk < 0.95 ? 'LOWER THAN BASELINE' : risk < 1.05 ? 'BASELINE' : risk < 1.3 ? 'A BIT HIGHER' : 'HIGH'} />
          <Meter label="EARLY CLONE" value={faded ? 'FADED' : `${Math.round(g * 100)}%`} pct={gPct} line={gLine} toneName={gTone}
            note={faded ? 'HEALTHY CELLS WON' : shrink ? 'SHRINK ZONE' : g < 1.1 ? 'STEADY' : 'GROWING'} />
        </div>

        {!collapsed && (
          <>
            <p className="takeaway" aria-live="polite">{takeaway(lab, habits)}</p>
            <div className="cards">
              {HABITS.map((h) => (
                <div className="hcard" key={h.id}>
                  <div className="hcard-top"><b>{h.name}</b><span>{h.hint}</span></div>
                  <div className="seg" role="radiogroup" aria-label={h.name}>
                    {h.levels.map((l, i) => {
                      const e = levelEffect(h, i);
                      return (
                        <button key={l} role="radio" aria-checked={habits[h.id] === i} className={habits[h.id] === i ? 'on' : ''} onClick={() => onHabit(h, i)}>
                          <span>{l}</span>
                          <small className={tone(e.v)}>{e.v == null ? e.text : `x${e.v.toFixed(2)} ${e.text}`}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="dock-foot">
              <button className="pill" onClick={onEvidence}>Evidence and sources</button>
              <span className="note">Swipe the cards. Multipliers are relative to a baseline of no alcohol, a walk, a steady weight.</span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
