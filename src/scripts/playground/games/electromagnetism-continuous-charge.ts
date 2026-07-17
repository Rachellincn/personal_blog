import { CanvasSurface } from '../core/canvas';
import { clamp } from '../core/math';
import { announce, buildActions, buildControls, updateData, updateDetails } from '../core/ui';
import type { Experiment, ExperimentElements, Point } from '../core/types';
import { formatScientific } from '../core/units';
import {
  evaluateContinuousField,
  relativeFieldError,
  type ContinuousDistribution,
  type ContinuousFieldEvaluation,
} from '../electromagnetism/continuous-charge';
import type { Vec3 } from '../electromagnetism/gauss-law';

type DistributionKind = ContinuousDistribution['kind'];
type Comparison = 'both' | 'analytic' | 'numeric';

const LABELS: Record<DistributionKind, string> = {
  rod: 'Finite uniform rod',
  ring: 'Uniform ring',
  disk: 'Uniform disk',
  'infinite-line': 'Infinite line approximation',
  'infinite-plane': 'Infinite plane approximation',
  'spherical-shell': 'Uniform spherical shell',
  'uniform-sphere': 'Uniform solid sphere',
};

const PAPER = '#fbf8f1';
const INK = '#263238';
const SOURCE = '#df725d';
const ANALYTIC = '#315b73';
const NUMERIC = '#987ab3';

export default class ContinuousChargeExperiment implements Experiment {
  readonly id = 'electromagnetism-continuous-charge';
  readonly name = 'Continuous charge distributions';
  readonly number = 'ATLAS EM 05';
  private elements!: ExperimentElements;
  private surface!: CanvasSurface;
  private kind: DistributionKind = 'ring';
  private comparison: Comparison = 'both';
  private size = 1.15;
  private density = 4;
  private polarity = 1;
  private samples = 2400;
  private probe = { u: 0, v: 1.75 };
  private dragging = false;

  mount(elements: ExperimentElements) {
    this.elements = elements;
    this.surface = new CanvasSurface(elements.canvas, () => this.render());
    this.buildUI();
    elements.canvas.addEventListener('pointerdown', this.onPointerDown);
    elements.canvas.addEventListener('pointermove', this.onPointerMove);
    elements.canvas.addEventListener('pointerup', this.onPointerUp);
    elements.canvas.addEventListener('pointercancel', this.onPointerUp);
    document.addEventListener('keydown', this.onKeyDown);
    this.updateDetails();
    this.render();
    announce(elements.status, 'Drag the probe to compare the analytic field with direct Coulomb integration.');
  }

  pause() { announce(this.elements.status, 'This experiment is static; the current comparison is held.'); }
  resume() { announce(this.elements.status, 'Continuous-charge comparison ready.'); }
  reset() {
    this.kind = 'ring'; this.comparison = 'both'; this.size = 1.15;
    this.density = 4; this.polarity = 1; this.samples = 2400;
    this.probe = { u: 0, v: 1.75 };
    this.buildUI(); this.updateDetails(); this.render();
    announce(this.elements.status, 'Continuous-charge defaults restored.');
  }

  destroy() {
    this.surface.destroy();
    this.elements.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.elements.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.elements.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.elements.canvas.removeEventListener('pointercancel', this.onPointerUp);
    document.removeEventListener('keydown', this.onKeyDown);
  }

  private buildUI() {
    buildControls(this.elements.controls, [
      { key: 'distribution', label: 'Charge distribution', type: 'select', value: this.kind, options: Object.entries(LABELS) },
      { key: 'comparison', label: 'Field evaluation', type: 'select', value: this.comparison, options: [['both', 'Analytic + numerical'], ['analytic', 'Analytic only'], ['numeric', 'Numerical only']] },
      { key: 'size', label: 'Geometry size', type: 'range', value: this.size, min: .45, max: 2, step: .05, unit: 'm' },
      { key: 'density', label: 'Charge scale', type: 'range', value: this.density, min: 1, max: 10, step: .5, unit: 'n-SI' },
      { key: 'polarity', label: 'Source sign', type: 'select', value: String(this.polarity), options: [['1', 'Positive'], ['-1', 'Negative']] },
      { key: 'samples', label: 'Integration samples', type: 'range', value: this.samples, min: 400, max: 6000, step: 400 },
    ], (key, value) => {
      if (key === 'distribution') {
        this.kind = value as DistributionKind;
        this.probe = this.kind === 'rod' ? { u: 1.55, v: .35 } : { u: 0, v: 1.75 };
        this.updateDetails();
      }
      if (key === 'comparison') this.comparison = value as Comparison;
      if (key === 'size') this.size = Number(value);
      if (key === 'density') this.density = Number(value);
      if (key === 'polarity') this.polarity = Number(value);
      if (key === 'samples') this.samples = Number(value);
      this.render();
    });
    buildActions(this.elements.actions, [
      { label: 'Place probe on axis', action: 'axis', primary: true },
      { label: 'Move probe off axis', action: 'off-axis' },
      { label: 'Reset', action: 'reset' },
    ], (action) => {
      if (action === 'axis') this.probe = { u: 0, v: 1.55 };
      if (action === 'off-axis') this.probe = { u: 1.1, v: 1.25 };
      if (action === 'reset') { this.reset(); return; }
      this.render();
      announce(this.elements.status, action === 'axis' ? 'Probe placed on the symmetry axis.' : 'Off-axis probe exposes analytic-domain limits for ring and disk formulas.');
    });
  }

  private distribution(): ContinuousDistribution {
    const amount = this.polarity * this.density * 1e-9;
    switch (this.kind) {
      case 'rod': return { kind: 'rod', linearDensity: amount, length: 2 * this.size };
      case 'ring': return { kind: 'ring', totalCharge: amount, radius: this.size };
      case 'disk': return { kind: 'disk', surfaceDensity: amount, radius: this.size };
      case 'infinite-line': return { kind: 'infinite-line', linearDensity: amount };
      case 'infinite-plane': return { kind: 'infinite-plane', surfaceDensity: amount };
      case 'spherical-shell': return { kind: 'spherical-shell', totalCharge: amount, radius: this.size };
      case 'uniform-sphere': return { kind: 'uniform-sphere', volumeDensity: amount, radius: this.size };
    }
  }

  private modelPoint(): Vec3 {
    return this.kind === 'rod' || this.kind === 'infinite-line'
      ? { x: this.probe.u, y: this.probe.v, z: 0 }
      : { x: this.probe.u, y: 0, z: this.probe.v };
  }

  private evaluate() {
    const distribution = this.distribution();
    const point = this.modelPoint();
    const extent = 18 * Math.max(this.size, 1, Math.hypot(this.probe.u, this.probe.v));
    const analytic = this.comparison === 'numeric' ? null : evaluateContinuousField(distribution, point, 'analytic');
    const numeric = this.comparison === 'analytic' ? null : evaluateContinuousField(distribution, point, 'numeric', {
      samples: this.dragging ? Math.min(800, this.samples) : this.samples,
      integrationExtent: extent,
    });
    return { analytic, numeric };
  }

  private render() {
    if (!this.surface) return;
    const ctx = this.surface.context;
    this.surface.clear(PAPER);
    this.drawGrid(ctx);
    this.drawSource(ctx);
    const evaluations = this.evaluate();
    if (evaluations.analytic?.field) this.drawFieldArrow(ctx, evaluations.analytic, ANALYTIC, -5);
    if (evaluations.numeric?.field) this.drawFieldArrow(ctx, evaluations.numeric, NUMERIC, 5);
    this.drawProbe(ctx);
    this.drawLegend(ctx);
    this.updateReadout(evaluations.analytic, evaluations.numeric);
  }

  private drawGrid(ctx: CanvasRenderingContext2D) {
    ctx.save(); ctx.strokeStyle = 'rgba(38,50,56,.08)'; ctx.lineWidth = 1;
    for (let value = -3; value <= 3; value += 1) {
      const vertical = this.toScreen({ u: value, v: 0 });
      const horizontal = this.toScreen({ u: 0, v: value });
      line(ctx, vertical.x, 0, vertical.x, this.surface.height);
      line(ctx, 0, horizontal.y, this.surface.width, horizontal.y);
    }
    ctx.strokeStyle = 'rgba(38,50,56,.25)';
    const origin = this.toScreen({ u: 0, v: 0 });
    line(ctx, origin.x, 0, origin.x, this.surface.height); line(ctx, 0, origin.y, this.surface.width, origin.y);
    ctx.restore();
  }

  private drawSource(ctx: CanvasRenderingContext2D) {
    const origin = this.toScreen({ u: 0, v: 0 });
    const radius = this.worldLength(this.size);
    ctx.save(); ctx.strokeStyle = SOURCE; ctx.fillStyle = 'rgba(223,114,93,.13)'; ctx.lineWidth = 3;
    if (this.kind === 'rod' || this.kind === 'infinite-line') {
      const top = this.toScreen({ u: 0, v: this.kind === 'rod' ? this.size : 3.2 });
      const bottom = this.toScreen({ u: 0, v: this.kind === 'rod' ? -this.size : -3.2 });
      if (this.kind === 'infinite-line') ctx.setLineDash([8, 5]);
      line(ctx, top.x, top.y, bottom.x, bottom.y); ctx.setLineDash([]);
    } else if (this.kind === 'infinite-plane') {
      ctx.setLineDash([8, 5]); line(ctx, 0, origin.y, this.surface.width, origin.y); ctx.setLineDash([]);
    } else if (this.kind === 'disk') {
      ctx.beginPath(); ctx.ellipse(origin.x, origin.y, radius, Math.max(7, radius * .16), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (this.kind === 'ring') {
      ctx.beginPath(); ctx.ellipse(origin.x, origin.y, radius, Math.max(9, radius * .25), 0, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(origin.x, origin.y, radius, 0, Math.PI * 2);
      if (this.kind === 'uniform-sphere') ctx.fill();
      ctx.stroke();
      if (this.kind === 'spherical-shell') { ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(origin.x, origin.y, radius, radius * .28, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.fillStyle = INK; ctx.font = '11px DM Mono, monospace'; ctx.fillText(LABELS[this.kind], 16, 24); ctx.restore();
  }

  private drawFieldArrow(ctx: CanvasRenderingContext2D, evaluation: ContinuousFieldEvaluation, color: string, offset: number) {
    if (!evaluation.field || !evaluation.magnitude) return;
    const projected = this.kind === 'rod' || this.kind === 'infinite-line'
      ? { u: evaluation.field.x, v: evaluation.field.y }
      : { u: evaluation.field.x, v: evaluation.field.z };
    const projectedMagnitude = Math.hypot(projected.u, projected.v);
    if (!projectedMagnitude) return;
    const start = this.toScreen(this.probe);
    const dx = projected.u / projectedMagnitude * 58;
    const dy = -projected.v / projectedMagnitude * 58;
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.4;
    drawArrow(ctx, start.x + offset, start.y, start.x + offset + dx, start.y + dy, 6); ctx.restore();
  }

  private drawProbe(ctx: CanvasRenderingContext2D) {
    const point = this.toScreen(this.probe);
    ctx.save(); ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(point.x, point.y, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    line(ctx, point.x - 4, point.y, point.x + 4, point.y); line(ctx, point.x, point.y - 4, point.x, point.y + 4); ctx.restore();
  }

  private drawLegend(ctx: CanvasRenderingContext2D) {
    ctx.save(); ctx.font = '10px DM Mono, monospace';
    ctx.fillStyle = ANALYTIC; ctx.fillRect(16, this.surface.height - 35, 18, 3); ctx.fillText('analytic', 40, this.surface.height - 30);
    ctx.fillStyle = NUMERIC; ctx.fillRect(112, this.surface.height - 35, 18, 3); ctx.fillText('direct Σ dq', 136, this.surface.height - 30); ctx.restore();
  }

  private updateReadout(analytic: ContinuousFieldEvaluation | null, numeric: ContinuousFieldEvaluation | null) {
    const error = analytic?.field && numeric?.field ? relativeFieldError(numeric.field, analytic.field) : null;
    const undefinedText = (evaluation: ContinuousFieldEvaluation | null) => !evaluation ? 'not selected' : evaluation.undefinedReason === 'analytic-axis-only' ? 'axis-only formula (probe is off axis)' : evaluation.singular ? 'undefined at idealized source' : evaluation.magnitude === null ? 'undefined' : `${formatScientific(evaluation.magnitude)} N/C`;
    updateData(this.elements.data, [
      ['Distribution', LABELS[this.kind]],
      ['Probe (cross-section)', `(${this.probe.u.toFixed(2)}, ${this.probe.v.toFixed(2)}) m`],
      ['Analytic |E|', undefinedText(analytic)],
      ['Numerical |E|', undefinedText(numeric)],
      ['Relative error', error === null ? '—' : `${(100 * error).toPrecision(3)}%`],
      ['Quadrature samples', numeric ? numeric.integrationSamples.toLocaleString() : '—'],
      ['Numerical validity', numeric?.validity ?? analytic?.validity ?? '—'],
      ['Singularity policy', 'Ideal source points are explicitly undefined'],
    ]);
  }

  private updateDetails() {
    updateDetails(this.elements.details,
      'E(r) = (1 / 4πε₀) ∫ (r−r′)/|r−r′|³ dq′',
      [['dq′', 'λ dl, σ dA, or ρ dV in SI units'], ['analytic', 'closed-form result on its stated symmetry domain'], ['numerical', 'midpoint or equal-area direct Coulomb integration']],
      'Seven distributions share one comparison surface. Infinite sources are approximated by a finite integration window only in numerical mode; ring and disk analytic formulas are deliberately reported as axis-only instead of extrapolated off axis.');
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    this.dragging = true; this.moveProbe(event); this.elements.canvas.setPointerCapture(event.pointerId);
  };
  private readonly onPointerMove = (event: PointerEvent) => { if (this.dragging) this.moveProbe(event); };
  private readonly onPointerUp = (event: PointerEvent) => {
    if (!this.dragging) return; this.dragging = false; this.moveProbe(event);
    if (this.elements.canvas.hasPointerCapture(event.pointerId)) this.elements.canvas.releasePointerCapture(event.pointerId);
    announce(this.elements.status, 'High-resolution integral recomputed after drag.');
  };
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() === 'r' && this.elements.stage.contains(document.activeElement)) this.reset();
  };
  private moveProbe(event: PointerEvent) {
    const point = this.surface.point(event);
    const world = this.toWorld(point);
    this.probe = { u: clamp(world.u, -2.85, 2.85), v: clamp(world.v, -2.85, 2.85) };
    this.render();
  }
  private toScreen(point: { u: number; v: number }): Point {
    const scale = Math.min(this.surface.width / 6.4, this.surface.height / 6.4);
    return { x: this.surface.width / 2 + point.u * scale, y: this.surface.height / 2 - point.v * scale };
  }
  private toWorld(point: Point) {
    const scale = Math.min(this.surface.width / 6.4, this.surface.height / 6.4);
    return { u: (point.x - this.surface.width / 2) / scale, v: (this.surface.height / 2 - point.y) / scale };
  }
  private worldLength(length: number) { return length * Math.min(this.surface.width / 6.4, this.surface.height / 6.4); }
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, size: number) { line(ctx, x1, y1, x2, y2); const angle = Math.atan2(y2 - y1, x2 - x1); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - Math.cos(angle - .55) * size, y2 - Math.sin(angle - .55) * size); ctx.lineTo(x2 - Math.cos(angle + .55) * size, y2 - Math.sin(angle + .55) * size); ctx.closePath(); ctx.fill(); }
