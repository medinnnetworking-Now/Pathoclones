import {
  DEFAULT_CONTEXT, DEFAULT_DECISIONS, createState, step, snapshot, organHealth, totalLesion,
  tumorMm, ageAt, riskMultipliers, lateDiseaseMultipliers,
} from './engine.js';

// Owns the timeline: a snapshot per simulated month so the user can scrub back,
// change a decision, and branch the future from that point.
export class SimController {
  constructor() {
    this.reset(DEFAULT_CONTEXT, DEFAULT_DECISIONS);
  }

  reset(ctx, decisions, options = null) {
    this.ctx = { ...ctx };
    this.decisions = { ...decisions };
    this.options = options;
    this.history = [snapshot(createState(this.ctx, this.decisions, options))];
    this.index = 0;
    this.marks = [];
    this.branchedAt = null;
    this.acc = 0;
    this.playing = false;
    this.speed = this.speed ?? 12;
    this.version = (this.version ?? 0) + 1;
  }

  get state() {
    return this.history[this.index];
  }

  get months() {
    return (this.ctx.endAge - this.ctx.startAge) * 12;
  }

  get atEnd() {
    const s = this.state;
    return s.t >= this.months || s.status === 'dead';
  }

  setDecision(key, value) {
    if (this.decisions[key] === value) return;
    this.decisions[key] = value;
    const t = this.state.t;
    if (t === 0) return;
    const last = this.marks[this.marks.length - 1];
    if (last && last.key === key && t - last.t < 18) {
      last.t = t;
      last.value = value;
    } else {
      this.marks.push({ t, key, value });
    }
  }

  setContext(patch) {
    this.ctx = { ...this.ctx, ...patch };
  }

  advance(dtSec) {
    if (!this.playing) return false;
    this.acc += dtSec * this.speed;
    let moved = false;
    while (this.acc >= 1) {
      this.acc -= 1;
      if (this.atEnd) {
        this.playing = false;
        break;
      }
      this.stepOnce();
      moved = true;
    }
    return moved;
  }

  stepOnce() {
    if (this.index < this.history.length - 1) {
      this.history.length = this.index + 1;
      this.marks = this.marks.filter((m) => m.t <= this.state.t);
      this.branchedAt = ageAt(this.ctx, this.state.t);
    }
    const s = snapshot(this.state);
    step(s, this.ctx, this.decisions);
    this.history.push(s);
    this.index++;
  }

  seek(t) {
    this.index = Math.max(0, Math.min(this.history.length - 1, Math.round(t)));
    this.playing = false;
  }

  // Introduce an initiating event now (teaching tool: most simulated lives never produce a lesion to watch).
  seedLesion(stage = 1, size = 3) {
    if (this.index < this.history.length - 1) this.history.length = this.index + 1;
    const s = snapshot(this.state);
    if (s.status !== 'healthy' && s.status !== 'lesion') return false;
    s.x[stage] = Math.max(s.x[stage], size);
    s.status = 'lesion';
    s.maxStage = Math.max(s.maxStage, stage);
    s.initiations += 1;
    if (!s.focus) s.focus = [Math.random(), Math.random(), Math.random()];
    s.log.push({ t: s.t, age: ageAt(this.ctx, s.t), kind: 'seed', text: `Manual initiation: ${['', 'hyperplastic', 'atypical', 'in situ', 'invasive'][stage]} clone introduced for observation.` });
    this.history[this.index] = s;
    return true;
  }

  view() {
    const s = this.state;
    const age = ageAt(this.ctx, s.t);
    const post = age >= this.ctx.menopauseAge;
    const mult = riskMultipliers(s.eff, post);
    const late = lateDiseaseMultipliers(s.eff);
    return {
      version: this.version,
      t: s.t,
      months: this.months,
      age,
      post,
      status: s.status,
      health: organHealth(s),
      tissue: s.tissue,
      prolifRel: s.prolifRel,
      x: s.x,
      total: totalLesion(s),
      tumorMm: tumorMm(s.x[4]),
      nodal: s.nodal,
      distant: s.distant,
      dx: s.dx,
      hazard: s.hazard,
      mult,
      late,
      log: s.log,
      eff: s.eff,
      atEnd: this.atEnd,
      playing: this.playing,
      speed: this.speed,
      latest: this.history.length - 1,
      branchedAt: this.branchedAt,
      marks: this.marks,
    };
  }

  series() {
    return this.history.map((s) => ({ t: s.t, x1: s.x[1], x2: s.x[2], x3: s.x[3], x4: s.x[4], health: organHealth(s) }));
  }
}
