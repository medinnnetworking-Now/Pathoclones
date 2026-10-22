import React, { useEffect, useRef } from 'react';
import { SPRITES, SPRITE_PAL, STAGE_HEX } from './palette.js';
import { HABITS, STAGE_NAMES, STAGE_BLURB } from './levels.js';
import { LEVER_EVIDENCE, SOURCES } from '../data/evidence.js';
import { riskMeter, growthMeter } from './scoring.js';

export function Sprite({ name, scale = 4, label }) {
  const ref = useRef(null);
  useEffect(() => {
    const rows = SPRITES[name];
    const c = ref.current;
    c.width = 9; c.height = 9;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 9, 9);
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = SPRITE_PAL[ch] ?? '#fff';
      ctx.fillRect(x, y, 1, 1);
    }));
  }, [name]);
  return <canvas ref={ref} className="sprite" style={{ width: 9 * scale, height: 9 * scale }} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}

export function Bar({ pct, tone, marker, children }) {
  return (
    <div className={`bar ${tone}`}>
      <i style={{ width: `${Math.round(pct * 100)}%` }} />
      {marker != null && <b style={{ left: `${marker * 100}%` }} />}
      {children}
    </div>
  );
}

export function Meters({ view }) {
  const r = riskMeter(view.mult.total);
  const g = growthMeter(view.prolifRel);
  return (
    <section className="panel px meters" aria-label="Risk meters">
      <h2>RISK RADAR</h2>
      <div className="meter">
        <div className="meter-head"><span>NEW CLONES</span><b className={r.tone}>x{view.mult.total.toFixed(2)}</b></div>
        <Bar pct={r.pct} tone={r.tone} marker={r.baselinePct} />
        <p className={r.tone}>{r.label}</p>
      </div>
      <div className="meter">
        <div className="meter-head"><span>GROWTH PRESSURE</span><b className={g.tone}>{Math.round(view.prolifRel * 100)}%</b></div>
        <Bar pct={g.pct} tone={g.tone} marker={g.line} />
        <p className={g.tone}>{g.label}</p>
      </div>
      <p className="hint">Bar line = where clones stop growing and start to fade.</p>
    </section>
  );
}

export function Ladder({ view }) {
  const n = view.tileScale;
  const top = view.x[4] > 0.05 ? 4 : view.x[3] > 0.05 ? 3 : view.x[2] > 0.05 ? 2 : view.x[1] > 0.05 ? 1 : 0;
  return (
    <section className="panel px ladder" aria-label="Tumor growth stages">
      <h2>TUMOR GROWTH</h2>
      <ol>
        {[4, 3, 2, 1].map((k) => {
          const tiles = Math.round(view.x[k] * n);
          return (
            <li key={k} className={top === k ? 'on' : ''} style={{ '--c': STAGE_HEX[k] }}>
              <i />
              <span>{STAGE_NAMES[k]}</span>
              <b>{tiles}</b>
            </li>
          );
        })}
      </ol>
      <p className="hint">{top === 0 ? 'No clone on the board.' : `${STAGE_BLURB[top]}${view.tumorMm > 0 ? ` Tumor: ${Math.round(view.tumorMm)} mm.` : ''}`}</p>
    </section>
  );
}

export function GrowthChart({ series, startAge, endAge, now }) {
  const ref = useRef(null);
  const W = 120, H = 44;
  useEffect(() => {
    const c = ref.current;
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    const years = endAge - startAge;
    const bw = Math.max(1, Math.floor((W - 4) / years));
    const maxSize = Math.max(24, ...series.map((s) => s.x[1] + s.x[2] + s.x[3] + s.x[4]));
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let x = 2; x < W - 2; x += 4) ctx.fillRect(x, H - 2, 2, 1);
    series.forEach((s, i) => {
      const x = 2 + i * bw;
      let y = H - 3;
      for (let k = 1; k <= 4; k++) {
        const h = Math.round((s.x[k] / maxSize) * (H - 8));
        if (h <= 0) continue;
        ctx.fillStyle = STAGE_HEX[k];
        ctx.fillRect(x, y - h, Math.max(1, bw - (bw > 2 ? 1 : 0)), h);
        y -= h;
      }
    });
    series.forEach((s, i) => {
      const x = 2 + i * bw;
      const ry = Math.round((H - 3) - Math.min(1, Math.max(0, (Math.log2(Math.max(0.01, s.risk)) + 1) / 3)) * (H - 8));
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, ry, 1, 1);
    });
    const nx = 2 + Math.min(series.length, years) * bw;
    ctx.fillStyle = '#ff6fb5'; ctx.fillRect(Math.min(W - 2, nx), 0, 1, H);
  }, [series, startAge, endAge, now]);
  return (
    <section className="panel px chart" aria-label="Growth and risk over time">
      <h2>YOUR LIFE SO FAR</h2>
      <canvas ref={ref} className="pix" />
      <div className="axis"><span>{startAge}</span><span>{Math.round((startAge + endAge) / 2)}</span><span>{endAge}</span></div>
      <p className="hint">Bars = clone size. Dots = your risk.</p>
    </section>
  );
}

export function HabitCard({ habit, level, view, onPick, onInfo }) {
  const m = view.mult, late = view.late;
  let chip;
  switch (habit.id) {
    case 'drink': chip = { t: `RISK x${m.alcohol.toFixed(2)}`, v: m.alcohol, bad: true }; break;
    case 'move': chip = { t: `RISK x${m.activity.toFixed(2)}`, v: m.activity, bad: true }; break;
    case 'weight': chip = view.post ? { t: `RISK x${m.adiposity.toFixed(2)}`, v: m.adiposity, bad: true } : { t: 'MATTERS AFTER 51', v: 1 }; break;
    case 'plate': { const v = late.fiber * late.soy; chip = { t: `TUMOR GROWTH x${v.toFixed(2)}`, v, bad: true }; break; }
    default: chip = level === 0 ? { t: 'NO SCANS', v: 1.2 } : { t: level === 1 ? 'AGES 50 TO 74' : 'FROM AGE 40', v: 0.8 };
  }
  const tone = chip.v < 0.97 ? 'good' : chip.v > 1.03 ? 'bad' : 'ok';
  return (
    <div className="card px">
      <div className="card-top">
        <Sprite name={habit.icon} scale={4} />
        <b>{habit.name}</b>
        <button className="q" onClick={onInfo} aria-label={`Why ${habit.name} matters`}>?</button>
      </div>
      <div className="seg" role="radiogroup" aria-label={habit.name}>
        {habit.levels.map((l, i) => (
          <button key={l} role="radio" aria-checked={level === i} className={level === i ? 'on' : ''} onClick={() => onPick(i)}>{l}</button>
        ))}
      </div>
      <span className={`chip ${tone}`}>{chip.t}</span>
    </div>
  );
}

const STATUS_TEXT = { good: 'STRONG LINK', ok: 'LINKED, SIZE GUESSED', warn: 'GAME GUESS' };

export function InfoModal({ habit, onClose }) {
  const ev = habit.lever.map((l) => LEVER_EVIDENCE[l]);
  const sources = [...new Set(ev.flatMap((e) => e.sources))];
  const worst = ev.some((e) => e.status === 'pending') ? 'warn' : ev.every((e) => e.status === 'anchored') ? 'good' : 'ok';
  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal px" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`About ${habit.name}`}>
        <div className="modal-head"><Sprite name={habit.icon} scale={5} /><h2>{habit.name}</h2><button className="q" onClick={onClose} aria-label="Close">X</button></div>
        <p className="big">{habit.why}</p>
        <p><span className={`chip ${worst}`}>{STATUS_TEXT[worst]}</span></p>
        {sources.length === 0 && <p className="hint">No verified source yet for this one.</p>}
        {sources.map((id) => {
          const s = SOURCES[id];
          return (
            <div className="src" key={id}>
              <b>{s.title}</b>
              <span>{s.cite}</span>
              <p>{s.finding}</p>
              <a href={`https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/`} target="_blank" rel="noreferrer">PubMed {s.pmid}</a>
            </div>
          );
        })}
        <p className="hint">Studies show links, not guarantees. This is a game, not medical advice.</p>
      </div>
    </div>
  );
}
