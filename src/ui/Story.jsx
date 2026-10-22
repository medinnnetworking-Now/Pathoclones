import React from 'react';
import { SOURCES } from '../data/evidence.js';

export function Stats({ stats }) {
  return (
    <dl className="stats" aria-label="Key facts">
      {stats.map(([k, v], i) => (
        <div key={i}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Progress({ count, index, onPick, tone }) {
  return (
    <div className="progress" role="tablist" aria-label="Stages">
      {Array.from({ length: count }, (_, i) => (
        <button key={i} role="tab" aria-selected={i === index} aria-label={`Stage ${i + 1} of ${count}`}
          className={i < index ? 'done' : i === index ? 'now' : ''} style={i === index ? { '--tone': tone } : undefined}
          onClick={() => onPick(i)} />
      ))}
    </div>
  );
}

export function Story({ steps, index, onIndex, label, onMore }) {
  const s = steps[index];
  const n = steps.length;
  return (
    <div className="story" key={`${label}-${s.id}`}>
      <div className="top-copy">
        <span className="count mono">{String(index + 1).padStart(2, '0')} / {String(n).padStart(2, '0')} <i>{label}</i></span>
        <h2 className="caption">{s.caption}</h2>
      </div>
      <div className="bottom-copy">
        <div className="verb-row">
          <span className="verb" style={{ color: s.tone }}>{s.verb}</span>
          <Stats stats={s.stats} />
        </div>
        <p className="clinical mono">{s.clinical}</p>
        <p className="body">{s.body}</p>
        <div className="controls">
          <button className="pill" onClick={() => onIndex(index - 1)} disabled={index === 0} aria-label="Previous stage">Back</button>
          <button className="pill ghost" onClick={onMore}>Learn more</button>
          <button className="pill solid" onClick={() => onIndex(index + 1)} disabled={index === n - 1} aria-label="Next stage" style={{ '--tone': s.tone }}>
            {index === n - 1 ? 'End' : 'Next'}
          </button>
        </div>
        <Progress count={n} index={index} onPick={onIndex} tone={s.tone} />
      </div>
    </div>
  );
}

export function SourceList({ ids }) {
  if (!ids.length) return <p className="note">No cited study for this stage. It is general clinical education.</p>;
  return ids.map((id) => {
    const s = SOURCES[id];
    return (
      <article className="cite" key={id}>
        <b>{s.title}</b>
        <span className="mono">{s.cite}</span>
        <p>{s.finding}</p>
        <div className="links mono">
          <a href={`https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/`} target="_blank" rel="noreferrer">PubMed {s.pmid}</a>
          <a href={`https://doi.org/${s.doi}`} target="_blank" rel="noreferrer">DOI</a>
        </div>
      </article>
    );
  });
}

export function MoreSheet({ step, onClose }) {
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <aside className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`More about ${step.clinical}`}>
        <header>
          <div><span className="mono eyebrow">Learn more</span><h3>{step.clinical}</h3></div>
          <button className="pill" onClick={onClose} aria-label="Close">Close</button>
        </header>
        <ul className="bullets">{step.more.map((m) => <li key={m}>{m}</li>)}</ul>
        <h4 className="mono">Evidence</h4>
        <SourceList ids={step.sources} />
        <p className="note">Education only, not medical advice. Studies describe groups of people and cannot predict one person's outcome. Talk with a clinician about your own screening and care.</p>
      </aside>
    </div>
  );
}
