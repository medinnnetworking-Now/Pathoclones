import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SimController } from './sim/controller.js';
import { DEFAULT_CONTEXT, DEFAULT_DECISIONS } from './sim/engine.js';
import { compareToReference } from './sim/cohort.js';
import { NebulaScene } from './scene/NebulaScene.js';
import { SCENARIOS } from './ui/config.js';
import { AnatomyLabels, Charts, Cohort, Decisions, Evidence, EventLog, Legend, Telemetry, Transport } from './ui/panels.jsx';

const safeStore = {
  get(k) { try { return window.localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

export default function App() {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const ctrl = useRef(null);
  if (!ctrl.current) ctrl.current = new SimController();

  const [view, setView] = useState(() => ctrl.current.view());
  const [series, setSeries] = useState(() => ctrl.current.series());
  const [decisions, setDecisions] = useState({ ...DEFAULT_DECISIONS });
  const [ctx, setCtx] = useState({ ...DEFAULT_CONTEXT });
  const [scenario, setScenario] = useState('reference');
  const [labels, setLabels] = useState([]);
  const [anatomy, setAnatomy] = useState(false);
  const [sway, setSway] = useState(true);
  const [evidence, setEvidence] = useState(null);
  const [showLegend, setShowLegend] = useState(false);
  const [showCohort, setShowCohort] = useState(false);
  const [cohort, setCohort] = useState(null);
  const [running, setRunning] = useState(false);
  const [intro, setIntro] = useState(() => safeStore.get('pc-intro') !== '1');
  const [panels, setPanels] = useState(() => { const wide = typeof window === 'undefined' || window.innerWidth >= 900; return { left: wide, right: wide }; });
  const [webglError, setWebglError] = useState(false);

  // Scene + simulation loop
  useEffect(() => {
    let scene;
    try {
      scene = new NebulaScene(hostRef.current, { onLabels: setLabels });
    } catch (e) {
      console.error(e);
      setWebglError(true);
      return undefined;
    }
    sceneRef.current = scene;
    if (new URLSearchParams(window.location.search).has('debug')) window.__pc = { scene, ctrl: ctrl.current };
    const c = ctrl.current;
    let last = performance.now();
    let acc = 0;
    let raf;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      c.advance(dt);
      scene.updateFromSim(c.state, c.ctx);
      acc += dt;
      if (acc > 0.1) {
        acc = 0;
        const v = c.view();
        scene.setHealth(v.health);
        setView(v);
        if (v.playing) setSeries(c.series());
      }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); scene.dispose(); sceneRef.current = null; };
  }, []);

  useEffect(() => { sceneRef.current?.setLabels(anatomy); if (!anatomy) setLabels([]); }, [anatomy]);
  useEffect(() => { sceneRef.current?.setSway(sway); }, [sway]);

  const refresh = useCallback(() => {
    const c = ctrl.current;
    setView(c.view());
    setSeries(c.series());
  }, []);

  const onChange = useCallback((key, value) => {
    ctrl.current.setDecision(key, value);
    setDecisions((d) => ({ ...d, [key]: value }));
    setView(ctrl.current.view());
  }, []);

  const onContext = useCallback((patch) => {
    ctrl.current.setContext(patch);
    setCtx((c) => ({ ...c, ...patch }));
  }, []);

  const loadScenario = useCallback((id) => {
    const sc = SCENARIOS.find((s) => s.id === id);
    if (!sc) return;
    const c = ctrl.current;
    c.speed = sc.speed ?? 12;
    c.reset({ ...sc.ctx }, { ...sc.decisions }, sc.options ?? null);
    setCtx({ ...sc.ctx });
    setDecisions({ ...sc.decisions });
    setScenario(id);
    setCohort(null);
    refresh();
  }, [refresh]);

  const reset = useCallback((reseed) => {
    const c = ctrl.current;
    const next = { ...c.ctx, seed: reseed ? Math.floor(Math.random() * 1e9) : c.ctx.seed };
    const opts = c.options;
    c.reset(next, { ...c.decisions }, opts);
    setCtx(next);
    refresh();
  }, [refresh]);

  const seedLesion = useCallback(() => {
    const c = ctrl.current;
    c.seedLesion(1, 3);
    refresh();
  }, [refresh]);

  const togglePlay = useCallback(() => {
    const c = ctrl.current;
    if (c.atEnd) return;
    c.playing = !c.playing;
    setView(c.view());
  }, []);

  const runCohort = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const c = ctrl.current;
      const res = compareToReference(c.decisions, c.ctx, 600);
      setCohort({ ...res, ctx: c.ctx });
      setRunning(false);
    }, 30);
  }, []);

  const sc = useMemo(() => SCENARIOS.find((s) => s.id === scenario), [scenario]);
  const dismissIntro = () => { setIntro(false); safeStore.set('pc-intro', '1'); };

  return (
    <div className="app">
      <div className="stage" ref={hostRef} />
      {webglError && <div className="fallback"><h2>WebGL is unavailable</h2><p>This visualization needs a browser with WebGL2 enabled.</p></div>}

      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true" />
          <div>
            <h1>Pathoclones</h1>
            <p>Breast Observatory · clonal evolution of disease</p>
          </div>
        </div>
        <div className="ribbon" title="October is Breast Cancer Awareness Month">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-5.2-7-10.4C5 7.6 7 6 9 6c1.4 0 2.4.7 3 1.8C12.600 6.700 13.600 6 15 6c2 0 4 1.600 4 4.600C19 15.800 12 21 12 21z" /></svg>
          Breast Cancer Awareness Month
        </div>
        <nav className="tools">
          <select value={scenario} onChange={(e) => loadScenario(e.target.value)} aria-label="Scenario">
            {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="ghost" onClick={seedLesion} title="Introduce a hyperplastic clone now">Seed lesion</button>
          <button className="ghost" onClick={() => reset(true)} title="Restart with a new random seed">Reroll luck</button>
          <button className="ghost" onClick={() => reset(false)}>Restart</button>
          <button className={`ghost ${anatomy ? 'on' : ''}`} onClick={() => setAnatomy(!anatomy)}>Anatomy</button>
          <button className={`ghost ${sway ? 'on' : ''}`} onClick={() => setSway(!sway)}>Sway</button>
          <button className="ghost" onClick={() => setShowCohort(true)}>Cohort</button>
          <button className="ghost" onClick={() => setShowLegend(true)}>Guide</button>
        </nav>
      </header>

      <div className="scenario-blurb"><b>{sc?.name}</b><span>{sc?.blurb}</span></div>

      <div className="mobile-toggles">
        <button className="ghost" onClick={() => setPanels((p) => ({ ...p, left: !p.left }))}>Decisions</button>
        <button className="ghost" onClick={() => setPanels((p) => ({ ...p, right: !p.right }))}>Telemetry</button>
      </div>

      {panels.left && <Decisions decisions={decisions} ctx={ctx} onChange={onChange} onContext={onContext} onEvidence={setEvidence} />}
      {panels.right && <Telemetry view={view} ctx={ctx} />}

      <AnatomyLabels labels={labels} />

      <section className="dock">
        <div className="dock-charts">
          <div className="chart-head"><span className="eyebrow">Clonal spectrum</span><span className="small muted">clone size by stage · white line = organ health · vertical ticks = your decision changes</span></div>
          <Charts series={series} marks={view.marks} months={view.months} t={view.t} />
        </div>
        <EventLog log={view.log} branchedAt={view.branchedAt} />
      </section>
      <Transport view={view} ctx={ctx} log={view.log}
        onPlay={togglePlay}
        onSeek={(t) => { ctrl.current.seek(t); setView(ctrl.current.view()); }}
        onSpeed={(s) => { ctrl.current.speed = s; setView(ctrl.current.view()); }}
        onStep={() => { const c = ctrl.current; c.playing = false; if (!c.atEnd) { c.stepOnce(); refresh(); } }} />

      <p className="disclaimer">Educational model, not a diagnostic tool or medical advice. Effects marked Anchored use published relative risks; everything else is illustrative. Talk to a clinician about your own screening and risk.</p>

      {evidence && <Evidence lever={evidence} onClose={() => setEvidence(null)} />}
      {showLegend && <Legend onClose={() => setShowLegend(false)} />}
      {showCohort && <Cohort result={cohort} running={running} onRun={runCohort} onClose={() => setShowCohort(false)} />}

      {intro && (
        <div className="intro" role="dialog" aria-label="Welcome">
          <div className="intro-card">
            <span className="eyebrow">October · Breast Cancer Awareness Month</span>
            <h2>Watch a breast evolve, one decision at a time.</h2>
            <p>Every point of light is a cell population. Healthy tissue glows teal. Abnormal clones shift through gold, coral and magenta as they evolve toward invasion. Your choices change the environment they grow in.</p>
            <ol>
              <li>Press <b>Play</b>, or load <b>Reversal window</b> to watch an early lesion get out-competed.</li>
              <li>Move the sliders mid-run. Scrub back, change a lever and the timeline <b>branches</b>.</li>
              <li>Tap any <b>Anchored</b> badge to see the PubMed-verified evidence behind a lever.</li>
            </ol>
            <p className="note">Educational only. Not medical advice, not a risk calculator.</p>
            <button className="primary" onClick={() => { dismissIntro(); loadScenario('window'); }}>Begin with the reversal window</button>
            <button className="ghost" onClick={dismissIntro}>Explore freely</button>
          </div>
        </div>
      )}
    </div>
  );
}
