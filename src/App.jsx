import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LuminaScene, STAGE_COLORS } from './stage/LuminaScene.js';
import { SimController } from './sim/controller.js';
import { DEFAULT_CONTEXT, DEFAULT_DECISIONS } from './sim/engine.js';
import { STEPS } from './content/journey.js';
import { GENE_STEPS } from './content/genetics.js';
import { Story, MoreSheet } from './ui/Story.jsx';
import { ReversalPanel, HABITS } from './ui/Reversal.jsx';

const NAMES = ['Luminara'];
const LAB_START = { drink: 2, move: 0, weight: 2, plate: 0, scan: 0 };

function decisionsFrom(h) {
  const d = { ...DEFAULT_DECISIONS };
  for (const x of HABITS) Object.assign(d, x.map[h[x.id]]);
  return d;
}

function labFx(s) {
  const total = s.x[1] + s.x[2] + s.x[3] + s.x[4];
  const top = s.x[4] > 0.05 ? 4 : s.x[3] > 0.05 ? 3 : s.x[2] > 0.05 ? 2 : s.x[1] > 0.05 ? 1 : 0;
  const col = [STAGE_COLORS.mint, STAGE_COLORS.gold, STAGE_COLORS.amber, STAGE_COLORS.magenta, STAGE_COLORS.red][top];
  return {
    lesionAmt: total < 0.05 ? 0 : Math.min(1, 0.16 + total / 14),
    lesionR: 0.014 + 0.006 * Math.sqrt(total),
    lesionCol: top === 0 ? STAGE_COLORS.mint : col,
    jit: 0.2 + 0.18 * top,
    core: top >= 3 ? 0.65 : 0.2,
    sparks: total < 0.05 ? 0 : Math.min(0.9, 0.12 + total / 16),
    tend: s.x[4] > 0.05 ? Math.min(1, 0.35 + s.x[4] / 6) : 0,
    spread: s.nodal ? 1 : 0,
    nodeHot: s.nodal ? 1 : 0,
  };
}

function Ribbon() {
  return (
    <svg className="ribbon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5c-2.6 0-4.5 1.9-4.5 4.4 0 2.2 1.2 3.8 2.6 5.5L6.2 20l2.6.5 3.2-5.3 3.2 5.3 2.6-.5-3.9-7.6c1.4-1.7 2.6-3.300 2.6-5.500C16.500 4.400 14.600 2.500 12 2.500zm0 2c1.500 0 2.500 1 2.500 2.400 0 1.300-.8 2.500-2.500 4.300-1.700-1.800-2.500-3-2.500-4.300C9.500 5.500 10.500 4.500 12 4.500z" />
    </svg>
  );
}

export default function App() {
  const host = useRef(null);
  const scene = useRef(null);
  const ctrl = useRef(null);
  if (!ctrl.current) ctrl.current = new SimController();

  const [view, setView] = useState('intro');
  const [step, setStep] = useState(0);
  const [more, setMore] = useState(false);
  const [habits, setHabits] = useState(LAB_START);
  const [lab, setLab] = useState(null);
  const [fail, setFail] = useState(false);

  // scene lifecycle
  useEffect(() => {
    try {
      scene.current = new LuminaScene(host.current);
      scene.current.setPreset('intro');
      if (new URLSearchParams(window.location.search).has('debug')) window.__lumina = scene.current;
    } catch (e) {
      console.error(e);
      setFail(true);
    }
    return () => { scene.current?.dispose(); scene.current = null; };
  }, []);

  // choreography
  useEffect(() => {
    const s = scene.current;
    if (!s) return;
    if (view === 'intro') s.setPreset('intro');
    else if (view === 'journey') s.setPreset(STEPS[step].id);
    else if (view === 'genetics') { s.setPreset('genetics', { gene: GENE_STEPS[step].gene }); }
    else if (view === 'reversal') s.setPreset('reversal');
  }, [view, step]);

  // reversal lab loop
  useEffect(() => {
    if (view !== 'reversal') return undefined;
    const c = ctrl.current;
    const ctx = { ...DEFAULT_CONTEXT, startAge: 45, endAge: 85, inherited: 0, seed: Math.floor(Math.random() * 1e9) };
    c.speed = 7;
    c.reset(ctx, decisionsFrom(LAB_START), { startLesion: 2, startSize: 4 });
    c.playing = true;
    setHabits(LAB_START);
    let last = performance.now(), acc = 0, raf;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      c.advance(dt);
      scene.current?.setFx(labFx(c.state));
      acc += dt;
      if (acc > 0.12) { acc = 0; setLab(c.view()); }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [view]);

  const steps = view === 'genetics' ? GENE_STEPS : STEPS;
  const go = useCallback((i) => {
    setStep((cur) => {
      const n = Math.max(0, Math.min(steps.length - 1, typeof i === 'function' ? i(cur) : i));
      return n;
    });
  }, [steps.length]);

  const open = (v) => { setView(v); setStep(0); setMore(false); };
  const next = useCallback(() => {
    if (view === 'intro') open('journey');
    else if (view === 'journey' || view === 'genetics') go((c) => c + 1);
  }, [view, go]);
  const prev = useCallback(() => { if (view === 'journey' || view === 'genetics') go((c) => c - 1); }, [view, go]);

  // keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') setMore(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  // tap and swipe on the art
  const down = useRef(null);
  const onDown = (e) => { down.current = { x: e.clientX, y: e.clientY, t: performance.now() }; };
  const onUp = (e) => {
    const d = down.current; down.current = null;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { if (dx < 0) next(); else prev(); }
    else if (Math.hypot(dx, dy) < 12 && performance.now() - d.t < 450) next();
  };

  const onHabit = (h, i) => {
    setHabits((x) => ({ ...x, [h.id]: i }));
    for (const [k, v] of Object.entries(h.map[i])) ctrl.current.setDecision(k, v);
  };
  const restartLab = () => {
    const c = ctrl.current;
    c.reset({ ...c.ctx, seed: Math.floor(Math.random() * 1e9) }, decisionsFrom(habits), { startLesion: 2, startSize: 4 });
    c.playing = true;
  };
  const toggleLab = () => { const c = ctrl.current; if (!c.atEnd) c.playing = !c.playing; setLab(c.view()); };

  const current = view === 'journey' ? STEPS[step] : view === 'genetics' ? GENE_STEPS[step] : null;

  return (
    <div className="app">
      <div className="art" ref={host} aria-hidden="true" />
      {view !== 'reversal' && <div className="tap" onPointerDown={onDown} onPointerUp={onUp} />}
      {fail && <div className="fail"><h2>WebGL is needed</h2><p>Open this page in a browser with WebGL2 enabled to see the light show.</p></div>}

      <header className="top">
        <button className="brand" onClick={() => open('intro')} aria-label="Home">
          <Ribbon /><span className="mono">{NAMES[0]}</span>
        </button>
        <nav className="nav" aria-label="Sections">
          {view !== 'intro' && <button className={`pill ${view === 'journey' ? 'on' : ''}`} onClick={() => open('journey')}>Journey</button>}
          <button className={`pill ${view === 'reversal' ? 'on' : ''}`} onClick={() => open('reversal')}>Reversal</button>
          <button className={`pill ${view === 'genetics' ? 'on' : ''}`} onClick={() => open('genetics')}>Genetics</button>
        </nav>
      </header>

      {view === 'intro' && (
        <section className="intro">
          <div className="intro-copy">
            <span className="mono eyebrow"><Ribbon /> {NAMES[0]} · October</span>
            <h1>Breast Cancer<br /><em>Awareness</em> Month</h1>
            <p className="body">Follow the light through a woman's body, into the breast, and along the path a cancer can take. Then see what can turn it back, and what her genes have to say.</p>
            <div className="controls">
              <button className="pill solid" style={{ '--tone': '#ff8fd0' }} onClick={() => open('journey')}>Begin the journey</button>
              <button className="pill" onClick={() => open('reversal')}>Reversal</button>
              <button className="pill" onClick={() => open('genetics')}>Genetics</button>
            </div>
            <p className="note">Tap or swipe to move through each stage. Education only, not medical advice.</p>
          </div>
        </section>
      )}

      {current && <Story steps={steps} index={step} onIndex={go} label={view === 'genetics' ? 'genetics' : 'journey'} onMore={() => setMore(true)} />}
      {view === 'reversal' && <ReversalPanel lab={lab} habits={habits} onHabit={onHabit} onRestart={restartLab} onTogglePlay={toggleLab} />}
      {more && current && <MoreSheet step={current} onClose={() => setMore(false)} />}

      <footer className="credit mono">made by Medin</footer>
    </div>
  );
}
