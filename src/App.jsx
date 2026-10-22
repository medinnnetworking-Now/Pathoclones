import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SimController } from './sim/controller.js';
import { riskMultipliers } from './sim/engine.js';
import { PixelBoard } from './game/board.js';
import { paintNebula } from './game/background.js';
import { HABITS, LEVELS, decisionsFor } from './game/levels.js';
import { monthPoints, eventFor, gradeFor, windowOpen, lesionSize } from './game/scoring.js';
import { Sprite, Meters, Ladder, GrowthChart, HabitCard, InfoModal } from './game/ui.jsx';

const SPEEDS = [[10, '1X'], [20, '2X'], [40, '4X']];

function freshRun() {
  return { score: 0, procIdx: 0, logLen: 0, series: [], maxMm: 0, cloneMonths: 0, shrinkMonths: 0, found: null, faded: false, peak: 0, died: false };
}

export default function App() {
  const bgRef = useRef(null);
  const boardCanvas = useRef(null);
  const ctrl = useRef(null);
  if (!ctrl.current) ctrl.current = new SimController();
  const run = useRef(freshRun());
  const boardRef = useRef(null);

  const [screen, setScreen] = useState('title');
  const [level, setLevel] = useState(LEVELS[0]);
  const [habits, setHabits] = useState(LEVELS[0].habits);
  const [view, setView] = useState(null);
  const [score, setScore] = useState(0);
  const [series, setSeries] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [info, setInfo] = useState(null);
  const [ended, setEnded] = useState(null);
  const [speed, setSpeed] = useState(10);

  // pixel nebula backdrop
  useEffect(() => {
    const paint = () => bgRef.current && paintNebula(bgRef.current);
    paint();
    window.addEventListener('resize', paint);
    return () => window.removeEventListener('resize', paint);
  }, []);

  const pushToast = useCallback((ev) => {
    const id = Math.random();
    setToasts((t) => [...t.slice(-2), { id, ...ev }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const start = useCallback((lv) => {
    const c = ctrl.current;
    const ctx = { ...lv.ctx, seed: Math.floor(Math.random() * 1e9) };
    c.speed = 10;
    c.reset(ctx, decisionsFor(lv.habits), lv.options);
    c.playing = true;
    run.current = freshRun();
    setLevel(lv);
    setHabits(lv.habits);
    setScore(0);
    setSeries([]);
    setToasts([]);
    setEnded(null);
    setSpeed(10);
    setView(null);
    setScreen('play');
  }, []);

  const finish = useCallback(() => {
    const c = ctrl.current;
    const r = run.current;
    const s = c.state;
    const years = c.ctx.endAge - c.ctx.startAge;
    const dead = s.status === 'dead';
    c.playing = false;
    setEnded({
      grade: gradeFor(r.score, years, dead, r.found),
      score: Math.round(r.score),
      dead,
      found: r.found,
      maxMm: r.maxMm,
      cloneYears: r.cloneMonths / 12,
      shrinkYears: r.shrinkMonths / 12,
      faded: r.faded,
      age: c.ctx.startAge + s.t / 12,
    });
  }, []);

  // game loop
  useEffect(() => {
    if (screen !== 'play') return undefined;
    const c = ctrl.current;
    const board = new PixelBoard(boardCanvas.current);
    boardRef.current = board;
    let last = performance.now(), beatAcc = 0, viewAcc = 0, beat = 0, raf;

    const processNew = () => {
      const r = run.current;
      let changed = false;
      while (r.procIdx < c.index) {
        r.procIdx++;
        const s = c.history[r.procIdx];
        r.score += monthPoints(s);
        const size = lesionSize(s);
        if (size > 0.05) r.cloneMonths++;
        if (windowOpen(s)) r.shrinkMonths++;
        if (s.x[4] > 0.05) r.maxMm = Math.max(r.maxMm, 6 * Math.cbrt(s.x[4]));
        for (; r.logLen < s.log.length; r.logLen++) {
          const entry = s.log[r.logLen];
          const ev = eventFor(entry, s);
          if (!ev) continue;
          r.score += ev.pts;
          if (entry.kind === 'regress' && entry.text.startsWith('Lesion regression')) r.faded = true;
          if (entry.kind === 'dx' && s.dx) r.found = { via: s.dx.via, stage: s.dx.stage, age: s.dx.age };
          pushToast({ ...ev, age: entry.age });
        }
        if (r.procIdx % 12 === 0) {
          const age = c.ctx.startAge + s.t / 12;
          r.series.push({ x: s.x.slice(), risk: riskMultipliers(s.eff, age >= c.ctx.menopauseAge).total });
          changed = true;
        }
      }
      if (changed) setSeries(r.series.slice());
    };

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      c.advance(dt);
      processNew();
      beatAcc += dt;
      if (beatAcc > 0.1) {
        beatAcc = 0; beat++;
        board.update(c.state);
        board.draw(beat);
      }
      viewAcc += dt;
      if (viewAcc > 0.12) {
        viewAcc = 0;
        setView({ ...c.view(), tileScale: board.scale });
        setScore(Math.round(run.current.score));
      }
      if (c.atEnd && c.playing === false && !run.current.done && c.state.t > 0) {
        // reached the end (advance() clears playing); wait for the last events to be processed
        processNew();
        run.current.done = true;
        finish();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [screen, pushToast, finish]);

  const pick = (habit, i) => {
    setHabits((h) => ({ ...h, [habit.id]: i }));
    const map = habit.map[i];
    for (const [k, v] of Object.entries(map)) ctrl.current.setDecision(k, v);
  };

  const togglePlay = () => {
    const c = ctrl.current;
    if (c.atEnd) return;
    c.playing = !c.playing;
    setView({ ...c.view(), tileScale: boardRef.current?.scale ?? 1 });
  };
  const nextYear = () => {
    const c = ctrl.current;
    c.playing = false;
    for (let i = 0; i < 12 && !c.atEnd; i++) c.stepOnce();
    setView({ ...c.view(), tileScale: boardRef.current?.scale ?? 1 });
  };
  const setSpd = (v) => { ctrl.current.speed = v; setSpeed(v); };

  const lvIndex = LEVELS.findIndex((l) => l.id === level.id);
  const open = view && windowOpen(ctrl.current.state);
  const hasClone = view && view.total > 0.05;

  return (
    <div className="app">
      <canvas ref={bgRef} className="bg pix" aria-hidden="true" />

      {screen === 'title' && (
        <main className="title">
          <div className="title-card px">
            <div className="logo-row"><Sprite name="ribbon" scale={6} /><span className="eyebrow">BREAST CANCER AWARENESS MONTH</span></div>
            <h1>PATHO<br />CLONES</h1>
            <p className="big">Each tile is a piece of breast tissue. A clone of odd cells is growing. Your habits decide if it fades or spreads.</p>
            <p className="big">Keep the board blue.</p>
            <div className="levels">
              {LEVELS.map((lv) => (
                <button key={lv.id} className="lvl px-btn" onClick={() => start(lv)}>
                  <b>{lv.name}</b><span>{lv.tag}</span>
                </button>
              ))}
            </div>
            <p className="hint">Educational game. Not medical advice. Effects come from published studies where marked.</p>
          </div>
        </main>
      )}

      {screen === 'play' && (
        <div className="game">
          <header className="hud px">
            <div className="hud-l"><span className="tag">{level.name}</span><span className="age">AGE <b>{view ? Math.floor(view.age) : level.ctx.startAge}</b></span></div>
            <div className="hud-c"><Sprite name="star" scale={3} /><span className="score"><b>{score}</b> PTS</span></div>
            <div className="hud-r">
              <button className="px-btn sm" onClick={togglePlay}>{view?.playing ? 'PAUSE' : 'PLAY'}</button>
              <button className="px-btn sm" onClick={nextYear}>+1 YEAR</button>
              {SPEEDS.map(([v, l]) => <button key={l} className={`px-btn sm ${speed === v ? 'on' : ''}`} onClick={() => setSpd(v)}>{l}</button>)}
            </div>
          </header>

          <main className="stage">
            <div className="left">
            <section className="board-wrap px" aria-label="Breast tissue board">
              <canvas ref={boardCanvas} className="pix board" />
              <div className="status">
                {!hasClone && view && <span className="pill good">ALL CLEAR</span>}
                {hasClone && <span className={`pill ${open ? 'good' : view.x[4] > 0.05 || view.x[3] > 0.05 ? 'bad' : 'warn'}`}>
                  {open ? 'SHRINK ZONE: CLONE IS FADING' : view.x[4] > 0.05 ? 'INVASIVE TUMOR' : view.x[3] > 0.05 ? 'DCIS' : view.x[2] > 0.05 ? 'ATYPIA CLONE' : 'HYPERPLASIA CLONE'}
                </span>}
                {view?.status === 'treated' && <span className="pill good">TREATED. KEEP WATCHING</span>}
              </div>
              <div className="toasts" aria-live="polite">
                {toasts.map((t) => (
                  <div key={t.id} className={`toast px ${t.tone}`}>
                    {t.icon && <Sprite name={t.icon} scale={3} />}
                    <span>{t.text}</span>
                    {t.pts !== 0 && <b>{t.pts > 0 ? '+' : ''}{t.pts}</b>}
                  </div>
                ))}
              </div>
              {ended && (
                <div className="end px">
                  <span className="eyebrow">{ended.dead ? 'GAME OVER' : `AGE ${Math.round(ended.age)} REACHED`}</span>
                  <div className={`grade g${ended.grade}`}>{ended.grade}</div>
                  <p className="big">{ended.score} POINTS</p>
                  <ul>
                    <li>{ended.found ? `Found by ${ended.found.via === 'screening' ? 'a scan' : 'a lump'} at ${Math.round(ended.found.age)}, stage ${ended.found.stage}.` : ended.faded ? 'The clone faded on its own.' : 'No tumor was ever found.'}</li>
                    <li>{Math.round(ended.cloneYears)} years with a clone. {Math.round(ended.shrinkYears)} of them in the shrink zone.</li>
                    {ended.maxMm > 0 && <li>Biggest tumor: {Math.round(ended.maxMm)} mm.</li>}
                  </ul>
                  <div className="end-btns">
                    <button className="px-btn" onClick={() => start(level)}>TRY AGAIN</button>
                    {lvIndex < LEVELS.length - 1 && <button className="px-btn go" onClick={() => start(LEVELS[lvIndex + 1])}>NEXT: {LEVELS[lvIndex + 1].name}</button>}
                    <button className="px-btn" onClick={() => setScreen('title')}>MENU</button>
                  </div>
                </div>
              )}
            </section>
            <section className="habits" aria-label="Your habits">
            {view && HABITS.map((h) => (
              <HabitCard key={h.id} habit={h} level={habits[h.id]} view={view} onPick={(i) => pick(h, i)} onInfo={() => setInfo(h)} />
            ))}
          </section>
            </div>

            <aside className="side">
              {view && <Meters view={view} />}
              {view && <Ladder view={view} />}
              <GrowthChart series={series} startAge={level.ctx.startAge} endAge={level.ctx.endAge} now={view?.t ?? 0} />
            </aside>
          </main>

          <p className="foot">Educational game. Not medical advice.</p>
        </div>
      )}

      {info && <InfoModal habit={info} onClose={() => setInfo(null)} />}
    </div>
  );
}
