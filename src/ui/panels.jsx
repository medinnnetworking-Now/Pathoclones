import React, { useMemo, useState } from 'react';
import { CONTROL_GROUPS, INHERITED, STAGE_COLORS, STAGE_NAMES, catalogId, spectral } from './config.js';
import { LEVER_EVIDENCE, SOURCES } from '../data/evidence.js';

const fmt = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '–');

/* ---------- Decisions ---------- */

export function Decisions({ decisions, ctx, onChange, onContext, onEvidence }) {
  return (
    <aside className="panel left" aria-label="Decisions">
      <header className="panel-head">
        <span className="eyebrow">Decisions</span>
        <span className="muted small">Changes take effect as tissue integrates them over months.</span>
      </header>
      {CONTROL_GROUPS.map((g) => (
        <section key={g.title} className="group">
          <h3>{g.title}</h3>
          {g.items.map((c) => (
            <div key={c.key} className="control">
              <div className="control-top">
                <label htmlFor={`c-${c.key}`}>{c.label}</label>
                <LeverBadge lever={c.lever} onClick={() => onEvidence(c.lever)} />
              </div>
              {c.kind === 'select' ? (
                <select id={`c-${c.key}`} value={decisions[c.key]} onChange={(e) => onChange(c.key, Number(e.target.value))}>
                  {c.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ) : (
                <div className="slider-row">
                  <input id={`c-${c.key}`} type="range" min={c.min} max={c.max} step={c.step} value={decisions[c.key]}
                    onChange={(e) => onChange(c.key, Number(e.target.value))} />
                  <output className="mono">{decisions[c.key]}<small> {c.unit}</small></output>
                </div>
              )}
              {c.note && <p className="note">{c.note}</p>}
            </div>
          ))}
        </section>
      ))}
      <section className="group">
        <h3>Patient context</h3>
        <div className="control">
          <div className="control-top">
            <label htmlFor="c-inh">Inherited risk</label>
            <LeverBadge lever="inherited" onClick={() => onEvidence('inherited')} />
          </div>
          <select id="c-inh" value={ctx.inherited} onChange={(e) => onContext({ inherited: Number(e.target.value) })}>
            {INHERITED.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <p className="note">Takes effect on the next reset.</p>
        </div>
      </section>
    </aside>
  );
}

function LeverBadge({ lever, onClick }) {
  const s = LEVER_EVIDENCE[lever]?.status ?? 'pending';
  const label = { anchored: 'Anchored', directional: 'Directional', pending: 'Assumption' }[s];
  return (
    <button className={`badge ${s}`} onClick={onClick} title="Open the evidence for this lever">
      {label}
    </button>
  );
}

/* ---------- Telemetry ---------- */

function Meter({ label, value, hint, color, invert }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="meter" title={hint}>
      <div className="meter-row"><span>{label}</span><span className="mono">{pct}</span></div>
      <div className="bar"><i style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  );
}

export function Telemetry({ view, ctx }) {
  const sp = spectral(view);
  const id = catalogId(ctx.seed);
  const open = view.prolifRel < 0.97 && view.x[1] + view.x[2] > 0.05;
  const t = view.tissue;
  return (
    <aside className="panel right" aria-label="Telemetry">
      <header className="panel-head">
        <span className="eyebrow">Telemetry</span>
        <span className="mono muted small">{id}</span>
      </header>

      <div className="hero-stat">
        <div className="ring" style={{ '--p': view.health / 100 }}>
          <span className="mono big">{fmt(view.health)}</span>
        </div>
        <div>
          <div className="small muted">Organ health index</div>
          <div className="class">{sp.clinical}</div>
          <div className="small muted">Class: {sp.cls}</div>
        </div>
      </div>

      <div className="readouts">
        <div><span>Age</span><b className="mono">{fmt(view.age, 1)}</b></div>
        <div><span>Elapsed</span><b className="mono">T+{view.t} mo</b></div>
        <div><span>Menopause</span><b className="mono">{view.post ? 'post' : 'pre'}</b></div>
        <div><span>Tumor</span><b className="mono">{view.tumorMm > 0 ? `${fmt(view.tumorMm)} mm` : '–'}</b></div>
        <div><span>Nodes</span><b className="mono">{view.distant ? 'distant' : view.nodal ? 'positive' : 'clear'}</b></div>
        <div><span>Initiation</span><b className="mono">{fmt(view.hazard * 12 * 1e4, 1)}<small> /10⁴ yr</small></b></div>
      </div>

      <section className="group">
        <h3>Tissue environment <span className="muted small">illustrative proxies</span></h3>
        <Meter label="Inflammation · dust opacity" value={t.inflammation} color="#c9704f" hint="Chronic low-grade inflammation proxy. Drives dust opacity and turbulence." />
        <Meter label="Estrogenic drive · blue haze" value={t.estrogen} color="#6aa6ff" hint="Local and circulating estrogenic exposure proxy." />
        <Meter label="Proliferation · twinkle rate" value={t.proliferation} color="#ffd36b" hint="Ki-67-like proliferative index proxy." />
        <Meter label="Genomic stability · red specks" value={t.genomic} color="#7be0c3" hint="Inverse of accumulated DNA-damage pressure." />
        <Meter label="Immune surveillance" value={Math.min(1, t.immune / 1.2)} color="#b693ff" hint="Capacity to clear abnormal clones." />
      </section>

      <section className="group">
        <h3>Clone census <span className="muted small">lobule units of 400</span></h3>
        {STAGE_NAMES.slice(1).map((n, i) => (
          <div className="census" key={n}>
            <i style={{ background: STAGE_COLORS[i + 1] }} />
            <span>{n}</span>
            <div className="bar slim"><i style={{ width: `${Math.min(100, (view.x[i + 1] / 40) * 100)}%`, background: STAGE_COLORS[i + 1] }} /></div>
            <b className="mono">{fmt(view.x[i + 1], 1)}</b>
          </div>
        ))}
        <div className={`window ${open ? 'open' : ''}`}>
          <b>Reversal window {open ? 'open' : 'closed'}</b>
          <span>
            {open
              ? `Proliferative drive is ${Math.round((1 - view.prolifRel) * 100)}% below reference; early clones are being out-competed.`
              : view.x[3] + view.x[4] > 0.05
                ? 'In situ and invasive clones do not regress through lifestyle in this model; they need clinical treatment.'
                : 'Early lesions regress only if proliferative drive falls well below the reference level.'}
          </span>
        </div>
      </section>

      <section className="group">
        <h3>Applied multipliers</h3>
        <div className="chips">
          <Chip label="Alcohol" v={view.mult.alcohol} bad />
          <Chip label="Activity" v={view.mult.activity} />
          <Chip label="Adiposity" v={view.mult.adiposity} bad />
          <Chip label="HRT" v={view.mult.hrt} bad />
          <Chip label="Soy · late" v={view.late.soy} />
          <Chip label="Fiber · late" v={view.late.fiber} />
        </div>
        <p className="note">Initiation risk ×{fmt(view.mult.total, 2)} vs reference. Late-disease multipliers apply only once an in situ or invasive clone exists.</p>
      </section>
    </aside>
  );
}

function Chip({ label, v, bad }) {
  const diff = v - 1;
  const cls = Math.abs(diff) < 0.005 ? '' : diff > 0 ? (bad ? 'worse' : 'up') : 'better';
  return <span className={`chip ${cls}`}>{label} <b className="mono">×{v.toFixed(2)}</b></span>;
}

/* ---------- Charts ---------- */

export function Charts({ series, marks, months, t, height = 74 }) {
  const w = 600;
  const max = useMemo(() => Math.max(24, ...series.map((s) => s.x1 + s.x2 + s.x3 + s.x4)), [series]);
  const sx = (m) => (m / months) * w;
  const sy = (v) => height - 4 - (Math.min(v, max) / max) * (height - 10);
  const bands = useMemo(() => {
    const keys = ['x1', 'x2', 'x3', 'x4'];
    return keys.map((_, bi) => {
      const top = (s) => keys.slice(bi).reduce((a, k) => a + s[k], 0);
      const bottom = (s) => keys.slice(bi + 1).reduce((a, k) => a + s[k], 0);
      const up = series.map((s) => `${sx(s.t).toFixed(1)},${sy(top(s)).toFixed(1)}`);
      const down = series.slice().reverse().map((s) => `${sx(s.t).toFixed(1)},${sy(bottom(s)).toFixed(1)}`);
      return `M${up.join('L')}L${down.join('L')}Z`;
    });
  }, [series, max, months, height]);
  const health = series.map((s) => `${sx(s.t).toFixed(1)},${(height - 4 - (s.health / 100) * (height - 10)).toFixed(1)}`).join('L');
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" role="img" aria-label="Clonal spectrum and organ health over time">
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={w} y1={height * f} y2={height * f} className="grid" />)}
      {bands.map((d, i) => <path key={i} d={d} fill={STAGE_COLORS[i + 1]} opacity="0.78" />)}
      <path d={`M${health}`} className="health-line" fill="none" />
      {marks.map((m, i) => (
        <g key={i}><line x1={sx(m.t)} x2={sx(m.t)} y1="0" y2={height} className="mark" /><title>{`${m.key} → ${m.value}`}</title></g>
      ))}
      <line x1={sx(t)} x2={sx(t)} y1="0" y2={height} className="cursor" />
    </svg>
  );
}

/* ---------- Transport ---------- */

const KIND_COLOR = { seed: '#ffc757', advance: '#ff8049', invasion: '#ff3347', nodal: '#ff3347', distant: '#ff3347', dx: '#ffffff', regress: '#7be0c3', death: '#8b97b5' };

export function Transport({ view, ctx, onPlay, onSeek, onSpeed, onStep, log }) {
  const speeds = [[6, '½ yr/s'], [12, '1 yr/s'], [24, '2 yr/s'], [60, '5 yr/s']];
  return (
    <footer className="transport">
      <button className="play" onClick={onPlay} aria-label={view.playing ? 'Pause' : 'Play'}>
        {view.playing ? <svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
          : <svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z" /></svg>}
      </button>
      <button className="ghost" onClick={onStep} title="Advance one month">+1 mo</button>
      <div className="scrub">
        <div className="ticks">
          {log.map((e, i) => (
            <i key={i} title={`${e.age.toFixed(1)} · ${e.text}`} style={{ left: `${(e.t / view.months) * 100}%`, background: KIND_COLOR[e.kind] ?? '#fff' }} />
          ))}
        </div>
        <input type="range" min="0" max={view.latest} value={view.t} onChange={(e) => onSeek(Number(e.target.value))} aria-label="Timeline" />
        <div className="axis mono">
          {[0, 0.25, 0.5, 0.75, 1].map((f) => <span key={f}>{Math.round(ctx.startAge + f * (ctx.endAge - ctx.startAge))}</span>)}
        </div>
      </div>
      <select value={view.speed} onChange={(e) => onSpeed(Number(e.target.value))} aria-label="Speed">
        {speeds.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </footer>
  );
}

/* ---------- Observation log ---------- */

export function EventLog({ log, branchedAt }) {
  const items = log.slice().reverse().slice(0, 40);
  return (
    <section className="log" aria-label="Observation log">
      <header className="panel-head"><span className="eyebrow">Observation log</span>
        {branchedAt != null && <span className="small warn">Timeline branched at age {branchedAt.toFixed(1)}</span>}
      </header>
      {items.length === 0 && <p className="note">No events yet. Press play, or use “Seed lesion” to give the model something to evolve.</p>}
      <ol>
        {items.map((e, i) => (
          <li key={i}>
            <i style={{ background: KIND_COLOR[e.kind] ?? '#fff' }} />
            <span className="mono">{e.age.toFixed(1)}</span>
            <p>{e.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- Evidence drawer ---------- */

export function Evidence({ lever, onClose }) {
  const ev = LEVER_EVIDENCE[lever];
  if (!ev) return null;
  const name = CONTROL_GROUPS.flatMap((g) => g.items).find((c) => c.lever === lever)?.label ?? 'Inherited risk';
  const statusText = {
    anchored: 'The simulation applies the published effect size directly.',
    directional: 'Published evidence supports the direction of effect. The magnitude used here is an illustrative assumption.',
    pending: 'No verified citation yet. This lever is a model assumption included for teaching.',
  }[ev.status];
  return (
    <div className="drawer-wrap" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Evidence for ${name}`}>
        <header>
          <div><span className="eyebrow">Evidence</span><h2>{name}</h2></div>
          <button className="ghost" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <span className={`badge ${ev.status}`}>{ev.status === 'pending' ? 'Assumption' : ev.status}</span>
        <p>{statusText}</p>
        <h3>What the model does</h3>
        <p>{ev.effect}</p>
        <h3>Sources <span className="muted small">via PubMed</span></h3>
        {ev.sources.length === 0 && <p className="note">No source attached yet.</p>}
        {ev.sources.map((id) => {
          const s = SOURCES[id];
          return (
            <article key={id} className="cite">
              <b>{s.title}</b>
              <span className="small muted">{s.cite} · {s.design}</span>
              <p>{s.finding}</p>
              <div className="links small">
                <a href={`https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/`} target="_blank" rel="noreferrer">PubMed {s.pmid}</a>
                <a href={`https://doi.org/${s.doi}`} target="_blank" rel="noreferrer">DOI</a>
              </div>
            </article>
          );
        })}
        <h3>NutritionFacts.org</h3>
        {ev.nutritionFacts.length === 0
          ? <p className="note">No verified video links yet. Add them in <code>src/data/evidence.js</code> once checked against the live page.</p>
          : ev.nutritionFacts.map((n) => <a key={n.url} href={n.url} target="_blank" rel="noreferrer">{n.title}</a>)}
        <p className="note">Observational associations are not proof of cause. Effect sizes come from population studies and do not predict any individual outcome.</p>
      </aside>
    </div>
  );
}

/* ---------- Cohort ---------- */

export function Cohort({ result, running, onRun, onClose }) {
  const row = (label, a, b, fmtFn = (v) => `${(v * 100).toFixed(1)}%`) => (
    <tr><td>{label}</td><td className="mono">{fmtFn(a)}</td><td className="mono">{fmtFn(b)}</td></tr>
  );
  return (
    <div className="drawer-wrap" onClick={onClose}>
      <aside className="drawer wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Cohort view">
        <header>
          <div><span className="eyebrow">Cohort view</span><h2>600 simulated lives</h2></div>
          <button className="ghost" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <p>Runs 600 women from age {result?.ctx.startAge ?? 30} to {result?.ctx.endAge ?? 85} under your current decisions and compares them with the reference lifestyle. Both runs share the same random seeds, so differences come from the decisions.</p>
        <button className="primary" onClick={onRun} disabled={running}>{running ? 'Running…' : result ? 'Run again with current decisions' : 'Run cohort'}</button>
        {result && (
          <>
            <table>
              <thead><tr><th /><th>Reference</th><th>Your decisions</th></tr></thead>
              <tbody>
                {row('Invasive diagnosis', result.ref.risk, result.cur.risk)}
                {row('DCIS diagnosis', result.ref.dcis / result.ref.n, result.cur.dcis / result.cur.n)}
                {row('Detected by screening', result.ref.byScreen / result.ref.n, result.cur.byScreen / result.cur.n)}
                {row('Stage IV at diagnosis', result.ref.stage.IV / result.ref.n, result.cur.stage.IV / result.cur.n)}
                {row('Modeled breast-cancer death', result.ref.mortality, result.cur.mortality)}
                {row('Median age at diagnosis', result.ref.medianAge, result.cur.medianAge, (v) => (v ? v.toFixed(0) : '–'))}
              </tbody>
            </table>
            <div className="rr">
              <div><span className="small muted">Relative diagnosis risk</span><b className="mono big">×{result.relRisk?.toFixed(2) ?? '–'}</b></div>
              <div><span className="small muted">Relative modeled mortality</span><b className="mono big">×{result.relMortality?.toFixed(2) ?? '–'}</b></div>
            </div>
            <p className="note">
              Initiation uses published relative risks where available (see the Anchored badges). Diagnosis and mortality also depend on progression assumptions, so
              relative risks here can exceed the published initiation effects. The absolute reference rate is calibrated to be illustrative, not a prediction for any person.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}

/* ---------- Legend ---------- */

export function Legend({ onClose }) {
  const rows = [
    ['Lobule colour', 'Clone stage: blue normal, gold hyperplasia, coral atypia, magenta DCIS, crimson invasive.'],
    ['Lobule size', 'Lobules swell as their clone advances. Advanced clones also glow.'],
    ['Pulse rate', 'Proliferation index: faster pulsing means a more proliferative environment.'],
    ['Warm flush', 'Inflammation reddens calm tissue and the skin envelope; it also warms the background.'],
    ['Blue rim light', 'Estrogenic drive.'],
    ['Outer shell', 'Skin and adipose envelope. It thickens and turns amber with BMI and age-related involution.'],
    ['Pink node at the nipple', 'Where the lactiferous ducts converge.'],
    ['Axillary nodes', 'Pale blue when clear, crimson once tumor cells reach them.'],
  ];
  return (
    <div className="drawer-wrap" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="How to read the model">
        <header><div><span className="eyebrow">Guide</span><h2>How to read the model</h2></div><button className="ghost" onClick={onClose} aria-label="Close">✕</button></header>
        <dl>{rows.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>
        <p className="note">Drag to orbit, scroll to zoom. Turn on <b>Anatomy</b> for labelled structures.</p>
      </aside>
    </div>
  );
}

/* ---------- Anatomy labels ---------- */

export function AnatomyLabels({ labels }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="labels" aria-hidden={labels.length === 0}>
      {labels.map((l) => (
        <button key={l.id} className={`label ${open === l.id ? 'open' : ''}`} style={{ transform: `translate(${l.x}px, ${l.y}px)` }}
          onClick={() => setOpen(open === l.id ? null : l.id)}>
          <i /><span>{l.title}</span>
          {open === l.id && <em>{l.body}</em>}
        </button>
      ))}
    </div>
  );
}
