import { AnimationLoop } from '../core/animation-loop';
import { CanvasSurface } from '../core/canvas';
import { clamp, degrees, radians, seededRandom } from '../core/math';
import { announce, buildActions, buildControls, updateData } from '../core/ui';
import type { Experiment, ExperimentElements, Point } from '../core/types';

type Particle = Point & { vx: number; vy: number; life: number };

export default class ProjectileExperiment implements Experiment {
  readonly id = 'projectile';
  readonly name = 'Projectile target';
  readonly number = 'EXPERIMENT 01';
  private elements!: ExperimentElements;
  private surface!: CanvasSurface;
  private loop!: AnimationLoop;
  private speed = 34;
  private angle = 43;
  private gravity = 9.81;
  private showTheory = true;
  private showVelocity = true;
  private launched = false;
  private paused = false;
  private complete = false;
  private time = 0;
  private position: Point = { x: 0, y: 1.8 };
  private closest = Infinity;
  private currentScore = 0;
  private bestScore = 0;
  private target = { x: 82, y: 1.7, radius: 2.8 };
  private particles: Particle[] = [];
  private readonly random: () => number;
  private dragging = false;

  constructor() {
    const seed = Number(new URLSearchParams(location.search).get('seed')) || 20260716;
    this.random = seededRandom(seed);
  }

  mount(elements: ExperimentElements) {
    this.elements = elements;
    this.restore();
    this.surface = new CanvasSurface(elements.canvas, () => this.loop?.renderOnce());
    this.loop = new AnimationLoop({
      element: elements.canvas,
      fixedStep: 1 / 120,
      update: (dt) => this.update(dt),
      render: () => this.render(),
    });
    this.buildUI();
    elements.canvas.addEventListener('pointerdown', this.onPointerDown);
    elements.canvas.addEventListener('pointermove', this.onPointerMove);
    elements.canvas.addEventListener('pointerup', this.onPointerUp);
    elements.canvas.addEventListener('pointercancel', this.onPointerUp);
    document.addEventListener('keydown', this.onKeyDown);
    this.newTarget(false);
    this.render();
  }

  pause() { this.paused = true; this.loop.pause(); announce(this.elements.status, 'Paused.'); }
  resume() { if (this.launched && !this.complete) { this.paused = false; this.loop.start(); announce(this.elements.status, 'Flight resumed.'); } }
  reset() {
    this.loop.pause(); this.launched = false; this.paused = false; this.complete = false; this.time = 0;
    this.position = { x: 0, y: 1.8 }; this.closest = Infinity; this.currentScore = 0; this.particles = [];
    this.updateReadout(); this.render(); announce(this.elements.status, 'Launcher reset. Ready to fire.');
  }

  destroy() {
    this.loop.destroy(); this.surface.destroy();
    this.elements.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.elements.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.elements.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.elements.canvas.removeEventListener('pointercancel', this.onPointerUp);
    document.removeEventListener('keydown', this.onKeyDown);
  }

  private buildUI() {
    buildControls(this.elements.controls, [
      { key: 'speed', label: 'Initial speed', type: 'range', value: this.speed, min: 10, max: 60, step: 1, unit: 'm/s' },
      { key: 'angle', label: 'Launch angle', type: 'range', value: this.angle, min: 5, max: 85, step: 1, unit: '°' },
      { key: 'gravity', label: 'Gravity', type: 'range', value: this.gravity, min: 1.6, max: 15, step: .01, unit: 'm/s²' },
      { key: 'theory', label: 'Theoretical path', type: 'checkbox', value: this.showTheory },
      { key: 'velocity', label: 'Velocity vector', type: 'checkbox', value: this.showVelocity },
    ], (key, value) => {
      if (key === 'speed') this.speed = Number(value);
      if (key === 'angle') this.angle = Number(value);
      if (key === 'gravity') this.gravity = Number(value);
      if (key === 'theory') this.showTheory = Boolean(value);
      if (key === 'velocity') this.showVelocity = Boolean(value);
      this.persist(); this.updateReadout(); this.render();
    });
    buildActions(this.elements.actions, [
      { label: 'Launch', action: 'launch', primary: true }, { label: 'Pause / Resume', action: 'pause' }, { label: 'Reset', action: 'reset' }, { label: 'New target', action: 'target' },
    ], (action) => {
      if (action === 'launch') this.launch();
      if (action === 'pause') this.paused ? this.resume() : this.pause();
      if (action === 'reset') this.reset();
      if (action === 'target') this.newTarget();
    });
  }

  private launch() {
    this.reset(); this.launched = true; announce(this.elements.status, 'Projectile launched.'); this.loop.start();
  }

  private newTarget(announceChange = true) {
    this.target.x = 56 + this.random() * 54;
    this.reset();
    if (announceChange) announce(this.elements.status, `New target at ${this.target.x.toFixed(1)} metres.`);
  }

  private update(dt: number) {
    if (!this.launched || this.paused || this.complete) return;
    this.time += dt;
    const angle = radians(this.angle);
    const vx = this.speed * Math.cos(angle);
    const vy = this.speed * Math.sin(angle);
    this.position = { x: vx * this.time, y: 1.8 + vy * this.time - .5 * this.gravity * this.time * this.time };
    const distance = Math.hypot(this.position.x - this.target.x, this.position.y - this.target.y);
    this.closest = Math.min(this.closest, distance);
    if (!this.loop.reducedMotion && this.particles.length < 70 && Math.floor(this.time * 60) % 3 === 0) {
      this.particles.push({ x: this.position.x, y: this.position.y, vx: -.4 + this.random() * .8, vy: -.3 + this.random() * .6, life: 1 });
    }
    this.particles.forEach((particle) => { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.life -= dt * 1.5; });
    this.particles = this.particles.filter((particle) => particle.life > 0);
    if (distance <= this.target.radius) this.finish(true);
    else if (this.position.y <= 0 || this.position.x > Math.max(125, this.target.x + 20)) this.finish(false);
    this.updateReadout();
  }

  private finish(hit: boolean) {
    this.complete = true; this.loop.pause();
    this.currentScore = hit ? Math.max(100, Math.round(1000 - this.closest * 160)) : Math.max(0, Math.round(500 - this.closest * 70));
    if (this.currentScore > this.bestScore) { this.bestScore = this.currentScore; localStorage.setItem('physics-playground:projectile-best', String(this.bestScore)); }
    announce(this.elements.status, hit ? `Target hit. Score ${this.currentScore}.` : `Missed by ${this.closest.toFixed(2)} metres. Score ${this.currentScore}.`);
    this.render(); this.updateReadout();
  }

  private render() {
    if (!this.surface) return;
    const { context: ctx, width, height } = this.surface;
    this.surface.clear('#fbf8f1');
    const ground = height - 48;
    const scale = (width - 68) / Math.max(120, this.target.x + 18);
    const screen = (point: Point) => ({ x: 44 + point.x * scale, y: ground - point.y * scale });
    ctx.strokeStyle = 'rgba(49,91,115,.12)'; ctx.lineWidth = 1;
    for (let x = 0; x < width; x += Math.max(28, 10 * scale)) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ground); ctx.stroke(); }
    for (let y = ground; y > 0; y -= Math.max(28, 10 * scale)) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    ctx.fillStyle = '#dcebf2'; ctx.fillRect(0, ground, width, height - ground);
    ctx.strokeStyle = '#315b73'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, ground); ctx.lineTo(width, ground); ctx.stroke();

    if (this.showTheory) {
      ctx.strokeStyle = 'rgba(167,149,200,.85)'; ctx.setLineDash([5, 7]); ctx.lineWidth = 1.5; ctx.beginPath();
      const theta = radians(this.angle); const vx = this.speed * Math.cos(theta); const vy = this.speed * Math.sin(theta);
      for (let t = 0; t < 15; t += .04) {
        const p = screen({ x: vx * t, y: 1.8 + vy * t - .5 * this.gravity * t * t });
        if (t === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        if (p.y >= ground || p.x > width) break;
      }
      ctx.stroke(); ctx.setLineDash([]);
    }

    const origin = screen({ x: 0, y: 1.8 });
    ctx.save(); ctx.translate(origin.x, origin.y); ctx.rotate(-radians(this.angle));
    ctx.fillStyle = '#263238'; ctx.fillRect(-9, -6, 42, 12); ctx.fillStyle = '#ef8d78'; ctx.beginPath(); ctx.arc(-8, 8, 15, 0, Math.PI * 2); ctx.fill(); ctx.restore();

    const target = screen({ x: this.target.x, y: this.target.y });
    ctx.fillStyle = '#fffdf8'; ctx.strokeStyle = '#315b73'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(target.x, target.y, this.target.radius * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ef8d78'; ctx.beginPath(); ctx.arc(target.x, target.y, Math.max(5, this.target.radius * scale * .34), 0, Math.PI * 2); ctx.fill();

    this.particles.forEach((particle, index) => { const p = screen(particle); ctx.globalAlpha = particle.life; ctx.fillStyle = index % 2 ? '#ef8d78' : '#a795c8'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1;
    const projectile = screen(this.position);
    ctx.fillStyle = this.complete && this.closest <= this.target.radius ? '#52704e' : '#263238'; ctx.beginPath(); ctx.arc(projectile.x, projectile.y, 7, 0, Math.PI * 2); ctx.fill();
    if (this.showVelocity && this.launched && !this.complete) {
      const theta = radians(this.angle); const vx = this.speed * Math.cos(theta); const vy = this.speed * Math.sin(theta) - this.gravity * this.time;
      this.arrow(ctx, projectile.x, projectile.y, projectile.x + vx * .45, projectile.y - vy * .45);
    }
    if (this.complete && this.closest <= this.target.radius && !this.loop.reducedMotion) {
      ctx.strokeStyle = '#ef8d78'; ctx.lineWidth = 3;
      for (let i = 0; i < 12; i += 1) { const a = i / 12 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(target.x + Math.cos(a) * 18, target.y + Math.sin(a) * 18); ctx.lineTo(target.x + Math.cos(a) * 32, target.y + Math.sin(a) * 32); ctx.stroke(); }
    }
  }

  private arrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
    const angle = Math.atan2(y2 - y1, x2 - x1); ctx.strokeStyle = '#ef8d78'; ctx.fillStyle = '#ef8d78'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 9 * Math.cos(angle - .45), y2 - 9 * Math.sin(angle - .45)); ctx.lineTo(x2 - 9 * Math.cos(angle + .45), y2 - 9 * Math.sin(angle + .45)); ctx.closePath(); ctx.fill();
  }

  private updateReadout() {
    const theta = radians(this.angle); const vy = this.speed * Math.sin(theta); const vx = this.speed * Math.cos(theta);
    const flight = (vy + Math.sqrt(vy * vy + 2 * this.gravity * 1.8)) / this.gravity;
    const maximum = 1.8 + vy * vy / (2 * this.gravity);
    updateData(this.elements.data, [['Flight time', `${this.time.toFixed(2)} s`], ['Maximum height', `${maximum.toFixed(1)} m`], ['Theoretical range', `${(vx * flight).toFixed(1)} m`], ['Target range', `${this.target.x.toFixed(1)} m`], ['Current score', this.currentScore], ['Best score', this.bestScore]]);
  }

  private readonly onPointerDown = (event: PointerEvent) => { this.dragging = true; this.elements.canvas.setPointerCapture(event.pointerId); this.aim(this.surface.point(event)); };
  private readonly onPointerMove = (event: PointerEvent) => { if (this.dragging) this.aim(this.surface.point(event)); };
  private readonly onPointerUp = (event: PointerEvent) => { this.dragging = false; if (this.elements.canvas.hasPointerCapture(event.pointerId)) this.elements.canvas.releasePointerCapture(event.pointerId); };
  private aim(point: Point) {
    const origin = { x: 44, y: this.surface.height - 48 - 1.8 * ((this.surface.width - 68) / Math.max(120, this.target.x + 18)) };
    this.angle = clamp(degrees(Math.atan2(origin.y - point.y, point.x - origin.x)), 5, 85);
    const input = this.elements.controls.querySelector<HTMLInputElement>('[data-control="angle"]');
    if (input) { input.value = String(Math.round(this.angle)); input.dispatchEvent(new Event('input', { bubbles: true })); }
  }
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (!this.elements.stage.contains(document.activeElement) && document.activeElement?.tagName === 'INPUT') return;
    if (event.code === 'Space') { event.preventDefault(); this.launched ? (this.paused ? this.resume() : this.pause()) : this.launch(); }
    if (event.key.toLowerCase() === 'r') this.reset();
    if (event.key.toLowerCase() === 'n') this.newTarget();
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') this.setAngle(this.angle + 1);
    if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') this.setAngle(this.angle - 1);
  };
  private setAngle(value: number) { this.angle = clamp(value, 5, 85); const input = this.elements.controls.querySelector<HTMLInputElement>('[data-control="angle"]'); if (input) { input.value = String(this.angle); input.dispatchEvent(new Event('input')); } }
  private restore() {
    this.bestScore = Number(localStorage.getItem('physics-playground:projectile-best')) || 0;
    try { const saved = JSON.parse(localStorage.getItem('physics-playground:projectile-settings') ?? '{}'); Object.assign(this, { speed: saved.speed ?? this.speed, angle: saved.angle ?? this.angle, gravity: saved.gravity ?? this.gravity, showTheory: saved.showTheory ?? this.showTheory, showVelocity: saved.showVelocity ?? this.showVelocity }); } catch {}
  }
  private persist() { localStorage.setItem('physics-playground:projectile-settings', JSON.stringify({ speed: this.speed, angle: this.angle, gravity: this.gravity, showTheory: this.showTheory, showVelocity: this.showVelocity })); }
}
