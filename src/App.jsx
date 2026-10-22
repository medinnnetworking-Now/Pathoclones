import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LuminaScene, STAGE_COLORS } from './stage/LuminaScene.js';
import { SimController } from './sim/controller.js';
import { DEFAULT_CONTEXT, DEFAULT_DECISIONS } from './sim/engine.js';
import { STEPS } from './content/journey.js';
import { GENE_STEPS } from './content/genetics.js';
import { SELF_STEPS } from './content/selfcheck.js';
import { Story, MoreSheet } from './ui/Story.jsx';
import { ReversalPanel, EvidenceSheet, HABITS } from './ui/Reversal.jsx';

const BRAND = 'Luminara';
const CREDIT = 'developed by Dr. Sidharth Narayanan';
const LAB_START = { drink: 1, move: 1, weight: 1, plate: 1, scan: 1 };

const SECTIONS = [
  { id: 'journey', hash: 'journey', label: 'Journey', blurb: 'Follow a cancer from healthy tissue to treatment' },
  { id: 'reversal', hash: 'reversal', label: 'Reversal', blurb: 'How risk factors and good choices change the odds' },
  { id: 'genetics', hash: 'genetics', label: 'Genetics', blurb: 'BRCA1, BRCA2 and preventive genomics' },
  { id: 'selfcheck', hash: 'self-check', label: 'Self-check', blurb: 'Know your normal, with official videos' },
];
const STORIES = { journey: STEPS, genetics: GENE_STEPS, selfcheck: SELF_STEPS };

function decisionsFrom(h) {
  const d = { ...DEFAULT_DECISIONS };
  for (const x of HABITS) Object.assign(d, x.map[h[x.id]]);
  return d;
}

function labFx(s, riskMult) {
  const total = s.x[1] + s.x[2] + s.x[3] + s.x[4];
  const top = s.x[4] > 0.05 ? 4 : s.x[3] > 0.05 ? 3 : s.x[2] > 0.05 ? 2 : s.x[1] > 0.05 ? 1 : 0;
  const col = [STAGE_COLORS.mint, STAGE_COLORS.gold, STAGE_COLORS.amber, STAGE_COLORS.magenta, STAGE_COLORS.red][top];
  return {
    lesionAmt: total < 0.05 ? 0 : Math.min(1, 0.16 + total / 16),
    lesionR: 0.012 + 0.0045 * Math.sqrt(total),
    lesionCol: col,
    jit: 0.2 + 0.15 * top,
    core: top >= 3 ? 0.4 : 0.1,
    sparks: total < 0.05 ? 0 : Math.min(0.6, 0.08 + total / 24),
    tend: s.x[4] > 0.05 ? Math.min(1, 0.35 + s.x[4] / 6) : 0,
    spread: s.nodal ? 1 : 0,
    nodeHot: s.nodal ? 1 : 0,
    risk: Math.max(-1, Math.min(1, Math.log2(Math.max(0.05, riskMult)) * 1.4)),
  };
}

function parseHash() {
  const raw = (window.location.hash || '').replace('#', '');
  const [name, idx] = raw.split('/');
  const sec = SECTIONS.find((s) => s.hash === name);
  if (!sec) return { view: 'intro', step: 0 };
  return { view: sec.id, step: Math.max(0, parseInt(idx || '1', 10) - 1) || 0 };
}

function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 899px)').matches);
  useEffect(() => {
    const m = window.matchMedia('(max-width: 899px)');
    const f = () => setNarrow(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return narrow;
}

function Ribbon() {
  return (
    <svg className="ribbon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5c-2.6 0-4.5 1.9-4.5 4.4 0 2.2 1.2 3.8 2.6 5.5L6.2 20l2.6.5 3.2-5.3 3.2 5.3 2.6-.5-3.9-7.6c1.4-1.7 2.6-3.3 2.6-5.5 0-2.5-1.9-4.4-4.5-4.4zm0 2c1.5 0 2.5 1 2.5 2.4 0 1.3-.8 2.5-2.5 4.3-1.7-1.8-2.5-3-2.5-4.3 0-1.4 1-2.4 2.5-2.4z" />
    </svg>
  );
}

export default function App() {
  const host = useRef(null);
  const scene = useRef(null);
  const ctrl = useRef(null);
  if (!ctrl.current) ctrl.current = new SimController();
  const narrow = useNarrow();

  const initial = useRef(parseHash());
  const [view, setView] = useState(initial.current.view);
  const [step, setStep] = useState(initial.current.step);
  const [more, setMore] = useState(false);
  const [evidence, setEvidence] = useState(false);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState('');
  const [habits, setHabits] = useState(LAB_START);
  const [lab, setLab] = useState(null);
  const [fail, setFail] = useState(false);

  // scene lifecycle
  useEffect(() => {
    try {
      scene.current = new LuminaScene(host.current);
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
    else if (view === 'genetics') s.setPreset('genetics', { gene: GENE_STEPS[Math.min(step, GENE_STEPS.length - 1)].gene });
    else if (view === 'reversal') s.setPreset('reversal');
    else s.setPreset(STORIES[view][Math.min(step, STORIES[view].length - 1)].id);
  }, [view, step]);

  // keep the address in sync so every view can be shared
  useEffect(() => {
    const sec = SECTIONS.find((x) => x.id === view);
    const h = sec ? `#${sec.hash}${STORIES[view] && step > 0 ? `/${step + 1}` : ''}` : '';
    if (window.location.hash !== h) window.history.replaceState(null, '', h || window.location.pathname + window.location.search);
  }, [view, step]);
  useEffect(() => {
    const onHash = () => { const p = parseHash(); setView(p.view); setStep(p.step); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // reversal lab loop
  useEffect(() => {
    if (view !== 'reversal') return undefined;
    const c = ctrl.current;
    const ctx = { ...DEFAULT_CONTEXT, startAge: 45, endAge: 85, inherited: 0, seed: Math.floor(Math.random() * 1e9) };
    c.speed = 4.5;
    c.reset(ctx, decisionsFrom(LAB_START), { startLesion: 1, startSize: 4 });
    c.playing = true;
    setHabits(LAB_START);
    let last = performance.now(), acc = 0, raf;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      c.advance(dt);
      scene.current?.setFx(labFx(c.state, c.view().mult.total));
      acc += dt;
      if (acc > 0.12) { acc = 0; setLab(c.view()); }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [view]);

  const steps = STORIES[view] ?? [];
  const go = useCallback((i) => {
    setStep((cur) => Math.max(0, Math.min(steps.length - 1, typeof i === 'function' ? i(cur) : i)));
  }, [steps.length]);

  const open = (v) => { setView(v); setStep(0); setMore(false); setMenu(false); setEvidence(false); };
  const next = useCallback(() => {
    if (view === 'intro') open('journey');
    else if (STORIES[view]) go((c) => c + 1);
  }, [view, go]);
  const prev = useCallback(() => { if (STORIES[view]) go((c) => c - 1); }, [view, go]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { if (document.activeElement?.tagName === 'BUTTON') return; e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') { setMore(false); setMenu(false); setEvidence(false); }
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
    c.reset({ ...c.ctx, seed: Math.floor(Math.random() * 1e9) }, decisionsFrom(habits), { startLesion: 1, startSize: 4 });
    c.playing = true;
  };
  const toggleLab = () => { const c = ctrl.current; if (!c.atEnd) c.playing = !c.playing; setLab(c.view()); };

  const flash = (t) => { setToast(t); setTimeout(() => setToast(''), 2200); };
  const share = async () => {
    const url = window.location.href;
    const data = { title: 'Breast Cancer Awareness Month', text: 'Follow the light through breast cancer: the journey, what lowers risk, genetics and how to check yourself.', url };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(url);
      flash('Link copied');
    } catch { flash('Copy the address bar link'); }
  };

  const current = STORIES[view] ? STORIES[view][Math.min(step, STORIES[view].length - 1)] : null;
  const currentSection = SECTIONS.find((x) => x.id === view);

  return (
    <div className="app">
      <div className="art" ref={host} aria-hidden="true" />
      {view !== 'reversal' && <div className="tap" onPointerDown={onDown} onPointerUp={onUp} />}
      {fail && <div className="fail"><h2>WebGL is needed</h2><p>Open this page in a browser with WebGL2 enabled to see the light show.</p></div>}

      <header className="top">
        <button className="brand" onClick={() => open('intro')} aria-label="Home">
          <Ribbon /><span className="mono">{BRAND}</span>
        </button>
        <nav className="nav" aria-label="Sections">
          {narrow ? (
            <>
              {currentSection && <button className="pill on" onClick={() => setMenu(true)}>{currentSection.label}</button>}
              <button className="pill" onClick={() => setMenu(true)} aria-haspopup="dialog">Menu</button>
            </>
          ) : (
            <>
              {SECTIONS.map((s) => <button key={s.id} className={`pill ${view === s.id ? 'on' : ''}`} onClick={() => open(s.id)}>{s.label}</button>)}
              <button className="pill" onClick={share}>Share</button>
            </>
          )}
        </nav>
      </header>

      {view === 'intro' && (
        <section className="intro">
          <div className="intro-copy">
            <span className="mono eyebrow"><Ribbon /> {BRAND} · October</span>
            <h1>Breast Cancer<br /><em>Awareness</em> Month</h1>
            <p className="body">Follow the light through a woman's body, into the breast, and along the path a cancer can take. See how everyday choices change the odds, what her genes say, and how to check yourself.</p>
            <div className="controls">
              <button className="pill solid" style={{ '--tone': '#ff8fd0' }} onClick={() => open('journey')}>Begin the journey</button>
              <button className="pill" onClick={() => open('selfcheck')}>Self-check</button>
              <button className="pill" onClick={() => open('reversal')}>Reversal</button>
            </div>
            <p className="note">Tap or swipe to move through each stage. Education only, not medical advice.</p>
          </div>
        </section>
      )}

      {current && <Story steps={steps} index={Math.min(step, steps.length - 1)} onIndex={go} label={currentSection.hash} onMore={() => setMore(true)} />}
      {view === 'reversal' && <ReversalPanel lab={lab} habits={habits} onHabit={onHabit} onRestart={restartLab} onTogglePlay={toggleLab} onEvidence={() => setEvidence(true)} />}
      {more && current && <MoreSheet step={current} onClose={() => setMore(false)} />}
      {evidence && <EvidenceSheet onClose={() => setEvidence(false)} />}

      {menu && (
        <div className="menu-wrap" role="dialog" aria-label="Sections">
          <button className="pill menu-close" onClick={() => setMenu(false)}>Close</button>
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.id} className={view === s.id ? 'on' : ''}>
                <button onClick={() => open(s.id)}><b>{s.label}</b><span>{s.blurb}</span></button>
              </li>
            ))}
          </ul>
          <div className="menu-foot">
            <button className="pill solid" style={{ '--tone': '#ff8fd0' }} onClick={share}>Share this page</button>
            <button className="pill" onClick={() => open('intro')}>Home</button>
          </div>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}

      <footer className="credit mono">{CREDIT}</footer>
    </div>
  );
}
