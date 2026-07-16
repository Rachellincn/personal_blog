import { AnimationLoop } from '../core/animation-loop';
import { CanvasSurface } from '../core/canvas';
import { clamp, degrees, radians, safeNumber } from '../core/math';
import { announce, buildActions, buildControls, updateData } from '../core/ui';
import type { Experiment, ExperimentElements, Point } from '../core/types';

type State = [number, number, number, number];

export default class DoublePendulumExperiment implements Experiment {
  readonly id = 'pendulum';
  readonly name = 'Double pendulum chaos';
  readonly number = 'EXPERIMENT 02';
  private elements!: ExperimentElements;
  private surface!: CanvasSurface;
  private loop!: AnimationLoop;
  private l1 = 1.25; private l2 = 1.05; private m1 = 1; private m2 = 1;
  private theta1 = 116; private theta2 = 72; private gravity = 9.81; private trailLength = 360; private speed = 1;
  private state: State = [radians(116), 0, radians(72), 0];
  private neighbor: State | null = null;
  private trail: Point[] = []; private neighborTrail: Point[] = [];
  private time = 0; private paused = false; private invalid = false; private sampleClock = 0;

  mount(elements: ExperimentElements) {
    this.elements = elements; this.restore(); this.state = this.initialState();
    this.surface = new CanvasSurface(elements.canvas, () => this.loop?.renderOnce());
    this.loop = new AnimationLoop({ element: elements.canvas, fixedStep: 1 / 120, maxFrame: .04, update: (dt) => this.update(dt), render: () => this.render() });
    this.buildUI(); document.addEventListener('keydown', this.onKeyDown);
    this.updateReadout(); this.render(); this.loop.start();
  }
  pause() { this.paused = true; this.loop.pause(); announce(this.elements.status, 'Double pendulum paused.'); }
  resume() { if (!this.invalid) { this.paused = false; this.loop.start(); announce(this.elements.status, 'Double pendulum running.'); } }
  reset() { this.state = this.initialState(); this.neighbor = null; this.trail = []; this.neighborTrail = []; this.time = 0; this.invalid = false; this.updateReadout(); this.render(); if (!this.paused) this.loop.start(); announce(this.elements.status, 'Initial state restored.'); }
  destroy() { this.loop.destroy(); this.surface.destroy(); document.removeEventListener('keydown', this.onKeyDown); }

  private buildUI() {
    buildControls(this.elements.controls, [
      { key: 'l1', label: 'Upper length', type: 'range', value: this.l1, min: .5, max: 2, step: .05, unit: 'm' },
      { key: 'l2', label: 'Lower length', type: 'range', value: this.l2, min: .5, max: 2, step: .05, unit: 'm' },
      { key: 'm1', label: 'Upper mass', type: 'range', value: this.m1, min: .25, max: 3, step: .05, unit: 'kg' },
      { key: 'm2', label: 'Lower mass', type: 'range', value: this.m2, min: .25, max: 3, step: .05, unit: 'kg' },
      { key: 'theta1', label: 'Upper initial angle', type: 'range', value: this.theta1, min: -170, max: 170, step: 1, unit: '°' },
      { key: 'theta2', label: 'Lower initial angle', type: 'range', value: this.theta2, min: -170, max: 170, step: 1, unit: '°' },
      { key: 'gravity', label: 'Gravity', type: 'range', value: this.gravity, min: 1.6, max: 15, step: .01, unit: 'm/s²' },
      { key: 'trail', label: 'Trail retention', type: 'range', value: this.trailLength, min: 40, max: 720, step: 20, unit: 'pts' },
      { key: 'speed', label: 'Simulation speed', type: 'range', value: this.speed, min: .25, max: 2, step: .25, unit: '×' },
    ], (key, value) => {
      const numeric = Number(value);
      if (key === 'l1') this.l1 = numeric; if (key === 'l2') this.l2 = numeric; if (key === 'm1') this.m1 = numeric; if (key === 'm2') this.m2 = numeric;
      if (key === 'theta1') this.theta1 = numeric; if (key === 'theta2') this.theta2 = numeric; if (key === 'gravity') this.gravity = numeric; if (key === 'trail') this.trailLength = numeric; if (key === 'speed') this.speed = numeric;
      this.persist(); this.reset();
    });
    buildActions(this.elements.actions, [{ label: 'Pause / Resume', action: 'pause', primary: true }, { label: 'Restart', action: 'reset' }, { label: 'Nearby initial state', action: 'neighbor' }], (action) => {
      if (action === 'pause') this.paused ? this.resume() : this.pause();
      if (action === 'reset') this.reset();
      if (action === 'neighbor') this.createNeighbor();
    });
  }

  private createNeighbor() {
    this.state = this.initialState(); this.neighbor = [...this.state] as State; this.neighbor[0] += .0005;
    this.trail = []; this.neighborTrail = []; this.time = 0; this.invalid = false; this.paused = false; this.loop.start();
    announce(this.elements.status, 'Two systems now differ by 0.0005 radians. Solid and dashed traces show their divergence.');
  }

  private update(dt: number) {
    if (this.paused || this.invalid) return;
    const scaled = clamp(dt * this.speed, 1 / 1000, .02);
    const substeps = Math.max(1, Math.ceil(scaled / .008));
    const step = scaled / substeps;
    for (let i = 0; i < substeps; i += 1) {
      this.state = this.rk4(this.state, step);
      if (this.neighbor) this.neighbor = this.rk4(this.neighbor, step);
      this.time += step;
    }
    if (![...this.state, ...(this.neighbor ?? [])].every((value) => Number.isFinite(value) && Math.abs(value) < 1e5)) {
      this.invalid = true; this.loop.pause(); announce(this.elements.status, 'Numerical guard stopped the simulation. Reset or reduce simulation speed.'); return;
    }
    this.sampleClock += dt;
    if (this.sampleClock >= 1 / 60) {
      this.sampleClock = 0; this.trail.push(this.positions(this.state).p2); if (this.neighbor) this.neighborTrail.push(this.positions(this.neighbor).p2);
      if (this.trail.length > this.trailLength) this.trail.splice(0, this.trail.length - this.trailLength);
      if (this.neighborTrail.length > this.trailLength) this.neighborTrail.splice(0, this.neighborTrail.length - this.trailLength);
    }
    this.updateReadout();
  }

  private derivative(state: State): State {
    const [a, av, b, bv] = state; const delta = a - b;
    const common = 2 * this.m1 + this.m2 - this.m2 * Math.cos(2 * delta);
    const d1 = this.l1 * common; const d2 = this.l2 * common;
    if (Math.abs(d1) < 1e-8 || Math.abs(d2) < 1e-8) return [av, 0, bv, 0];
    const aa = (-this.gravity * (2 * this.m1 + this.m2) * Math.sin(a) - this.m2 * this.gravity * Math.sin(a - 2 * b) - 2 * Math.sin(delta) * this.m2 * (bv * bv * this.l2 + av * av * this.l1 * Math.cos(delta))) / d1;
    const ba = (2 * Math.sin(delta) * (av * av * this.l1 * (this.m1 + this.m2) + this.gravity * (this.m1 + this.m2) * Math.cos(a) + bv * bv * this.l2 * this.m2 * Math.cos(delta))) / d2;
    return [av, safeNumber(aa), bv, safeNumber(ba)];
  }

  private rk4(state: State, dt: number): State {
    const k1 = this.derivative(state); const k2 = this.derivative(this.add(state, k1, dt / 2)); const k3 = this.derivative(this.add(state, k2, dt / 2)); const k4 = this.derivative(this.add(state, k3, dt));
    return state.map((value, i) => safeNumber(value + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]), value)) as State;
  }
  private add(state: State, derivative: State, scale: number) { return state.map((value, i) => value + derivative[i] * scale) as State; }
  private initialState(): State { return [radians(this.theta1), 0, radians(this.theta2), 0]; }
  private positions(state: State) { const [a, , b] = state; const p1 = { x: this.l1 * Math.sin(a), y: this.l1 * Math.cos(a) }; return { p1, p2: { x: p1.x + this.l2 * Math.sin(b), y: p1.y + this.l2 * Math.cos(b) } }; }

  private render() {
    if (!this.surface) return; const { context: ctx, width, height } = this.surface; this.surface.clear('#fbf8f1');
    const origin = { x: width / 2, y: Math.max(54, height * .14) }; const scale = Math.min(width * .2, height * .3) / Math.max(this.l1, this.l2);
    ctx.strokeStyle = 'rgba(49,91,115,.1)'; ctx.lineWidth = 1; for (let y = origin.y; y < height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    this.drawTrail(ctx, this.trail, origin, scale, '#ef8d78', false); if (this.neighbor) this.drawTrail(ctx, this.neighborTrail, origin, scale, '#315b73', true);
    if (this.neighbor) this.drawSystem(ctx, this.neighbor, origin, scale, '#315b73', true); this.drawSystem(ctx, this.state, origin, scale, '#ef8d78', false);
    ctx.fillStyle = '#263238'; ctx.fillRect(origin.x - 34, origin.y - 8, 68, 8); ctx.beginPath(); ctx.arc(origin.x, origin.y, 6, 0, Math.PI * 2); ctx.fill();
  }

  private drawSystem(ctx: CanvasRenderingContext2D, state: State, origin: Point, scale: number, color: string, dashed: boolean) {
    const { p1, p2 } = this.positions(state); const a = { x: origin.x + p1.x * scale, y: origin.y + p1.y * scale }; const b = { x: origin.x + p2.x * scale, y: origin.y + p2.y * scale };
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = dashed ? 2 : 3; ctx.setLineDash(dashed ? [7, 5] : []); ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = dashed ? '#fbf8f1' : color; ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(a.x, a.y, 7 + this.m1 * 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (dashed) { const size = 8 + this.m2 * 2; ctx.beginPath(); ctx.rect(b.x - size, b.y - size, size * 2, size * 2); } else { ctx.beginPath(); ctx.arc(b.x, b.y, 9 + this.m2 * 2, 0, Math.PI * 2); } ctx.fill(); ctx.stroke(); ctx.restore();
  }
  private drawTrail(ctx: CanvasRenderingContext2D, points: Point[], origin: Point, scale: number, color: string, dashed: boolean) {
    if (points.length < 2) return; ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = .72; ctx.lineWidth = dashed ? 1.3 : 1.8; ctx.setLineDash(dashed ? [3, 5] : []); ctx.beginPath(); points.forEach((point, i) => { const x = origin.x + point.x * scale; const y = origin.y + point.y * scale; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke(); ctx.restore();
  }

  private energy(state: State) { const [a, av, b, bv] = state; const kinetic = .5 * (this.m1 + this.m2) * this.l1 ** 2 * av ** 2 + .5 * this.m2 * this.l2 ** 2 * bv ** 2 + this.m2 * this.l1 * this.l2 * av * bv * Math.cos(a - b); const potential = -(this.m1 + this.m2) * this.gravity * this.l1 * Math.cos(a) - this.m2 * this.gravity * this.l2 * Math.cos(b); return kinetic + potential; }
  private updateReadout() { updateData(this.elements.data, [['Simulation time', `${this.time.toFixed(2)} s`], ['Total energy', `${this.energy(this.state).toFixed(3)} J`], ['Upper angle', `${degrees(this.state[0]).toFixed(1)}°`], ['Lower angle', `${degrees(this.state[2]).toFixed(1)}°`], ['Comparison', this.neighbor ? 'Solid + dashed' : 'Single system'], ['Integrator', 'Fixed-step RK4']]); }
  private readonly onKeyDown = (event: KeyboardEvent) => { if (event.code === 'Space' && this.elements.stage.contains(document.activeElement)) { event.preventDefault(); this.paused ? this.resume() : this.pause(); } if (event.key.toLowerCase() === 'r' && this.elements.stage.contains(document.activeElement)) this.reset(); };
  private restore() { try { const saved = JSON.parse(localStorage.getItem('physics-playground:pendulum-settings') ?? '{}'); ['l1','l2','m1','m2','theta1','theta2','gravity','trailLength','speed'].forEach((key) => { if (Number.isFinite(saved[key])) (this as unknown as Record<string, number>)[key] = saved[key]; }); } catch {} }
  private persist() { localStorage.setItem('physics-playground:pendulum-settings', JSON.stringify({ l1: this.l1, l2: this.l2, m1: this.m1, m2: this.m2, theta1: this.theta1, theta2: this.theta2, gravity: this.gravity, trailLength: this.trailLength, speed: this.speed })); }
}
