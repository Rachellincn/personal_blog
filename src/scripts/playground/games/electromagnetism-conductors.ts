import { CanvasSurface } from '../core/canvas';
import { clamp } from '../core/math';
import { announce, buildActions, buildControls, updateData, updateDetails } from '../core/ui';
import type { Experiment, ExperimentElements, Point } from '../core/types';
import { formatScientific } from '../core/units';
import { solveConductorEquilibrium, type ConductorSolution } from '../electromagnetism/conductors';

type Preset = 'charged' | 'tip' | 'cavity';
const PAPER = '#fbf8f1'; const INK = '#263238'; const POSITIVE = '#df725d'; const NEGATIVE = '#315b73'; const METAL = '#d8d2c7'; const PROBE = '#987ab3';

export default class ConductorsExperiment implements Experiment {
  readonly id = 'electromagnetism-conductors';
  readonly name = 'Conductors & electrostatic shielding';
  readonly number = 'ATLAS EM 07';
  private elements!: ExperimentElements; private canvas!: CanvasSurface;
  private preset: Preset = 'tip'; private semiMajor = 1.5; private aspect = .45;
  private externalField = 100; private netCharge = 0; private samples = 64;
  private probe = { x: 0, y: 0 }; private cacheKey = ''; private solutionCache!: ConductorSolution;

  mount(elements: ExperimentElements) { this.elements = elements; this.canvas = new CanvasSurface(elements.canvas, () => this.render()); this.buildUI(); elements.canvas.addEventListener('pointerdown', this.onPointer); document.addEventListener('keydown', this.onKey); this.updateDetails(); this.render(); announce(elements.status, 'Move the probe through metal, cavity, and exterior. Boundary charges are solved, not painted.'); }
  pause() { announce(this.elements.status, 'Static boundary solution held.'); }
  resume() { announce(this.elements.status, 'Conductor boundary solution ready.'); }
  reset() { this.preset = 'tip'; this.applyPreset(); this.buildUI(); this.render(); announce(this.elements.status, 'Conductor defaults restored.'); }
  destroy() { this.canvas.destroy(); this.elements.canvas.removeEventListener('pointerdown', this.onPointer); document.removeEventListener('keydown', this.onKey); }

  private buildUI() {
    buildControls(this.elements.controls, [
      { key: 'preset', label: 'Teaching preset', type: 'select', value: this.preset, options: [['charged', 'Charged circular conductor'], ['tip', 'Ellipse tip effect'], ['cavity', 'Cavity & shielding']] },
      { key: 'major', label: 'Outer semimajor axis', type: 'range', value: this.semiMajor, min: .8, max: 2, step: .05, unit: 'm' },
      { key: 'aspect', label: 'Minor / major ratio', type: 'range', value: this.aspect, min: .35, max: 1, step: .05 },
      { key: 'field', label: 'External field', type: 'range', value: this.externalField, min: 0, max: 180, step: 10, unit: 'N/C' },
      { key: 'charge', label: 'Net line charge', type: 'range', value: this.netCharge, min: -6, max: 6, step: .5, unit: 'nC/m' },
      { key: 'samples', label: 'Boundary samples', type: 'range', value: this.samples, min: 32, max: 96, step: 8 },
    ], (key, value) => {
      if (key === 'preset') { this.preset = value as Preset; this.applyPreset(); this.buildUI(); }
      if (key === 'major') this.semiMajor = Number(value);
      if (key === 'aspect') this.aspect = Number(value);
      if (key === 'field') this.externalField = Number(value);
      if (key === 'charge') this.netCharge = Number(value);
      if (key === 'samples') this.samples = Number(value);
      this.cacheKey = ''; this.render();
    });
    buildActions(this.elements.actions, [{ label: 'Tip-effect preset', action: 'tip', primary: true }, { label: 'Shielded cavity', action: 'cavity' }, { label: 'Refine boundary', action: 'refine' }, { label: 'Reset', action: 'reset' }], (action) => {
      if (action === 'reset') { this.reset(); return; }
      if (action === 'tip' || action === 'cavity') { this.preset = action; this.applyPreset(); this.buildUI(); }
      if (action === 'refine') { this.samples = Math.min(96, this.samples + 16); this.buildUI(); }
      this.cacheKey = ''; this.render(); announce(this.elements.status, action === 'refine' ? 'Boundary refined; compare the residual diagnostics.' : 'Teaching preset loaded.');
    });
  }
  private applyPreset() { if (this.preset === 'charged') { this.semiMajor = 1.15; this.aspect = 1; this.externalField = 0; this.netCharge = 4; } else if (this.preset === 'tip') { this.semiMajor = 1.55; this.aspect = .4; this.externalField = 110; this.netCharge = 0; } else { this.semiMajor = 1.5; this.aspect = .77; this.externalField = 100; this.netCharge = 0; } this.probe = this.preset === 'cavity' ? { x: .28, y: -.08 } : { x: 0, y: 0 }; }
  private solution() { const key = JSON.stringify([this.preset, this.semiMajor, this.aspect, this.externalField, this.netCharge, this.samples]); if (key !== this.cacheKey) { this.cacheKey = key; this.solutionCache = solveConductorEquilibrium({ outer: { kind: 'ellipse', semiMajor: this.semiMajor, semiMinor: this.semiMajor * this.aspect }, cavity: this.preset === 'cavity' ? { center: { x: .28, y: -.08 }, radius: .36 } : undefined, netCharge: this.netCharge * 1e-9, externalField: { x: this.externalField, y: 0 }, samples: this.samples }); } return this.solutionCache; }
  private render() { if (!this.canvas) return; const solution = this.solution(); const ctx = this.canvas.context; this.canvas.clear(PAPER); this.drawGrid(ctx); this.drawField(ctx, solution); this.drawMetal(ctx); this.drawSurfaceCharge(ctx, solution); this.drawProbe(ctx, solution); this.updateReadout(solution); }
  private drawGrid(ctx: CanvasRenderingContext2D) { ctx.save(); ctx.strokeStyle = 'rgba(38,50,56,.08)'; for (let n = -3; n <= 3; n++) { const a = this.toScreen({ x: n, y: 0 }); const b = this.toScreen({ x: 0, y: n }); line(ctx, a.x, 0, a.x, this.canvas.height); line(ctx, 0, b.y, this.canvas.width, b.y); } ctx.restore(); }
  private drawField(ctx: CanvasRenderingContext2D, solution: ConductorSolution) { ctx.save(); ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.globalAlpha = .62; for (let x = -2.7; x <= 2.7; x += .48) for (let y = -2.1; y <= 2.1; y += .48) { if (solution.isInMetal({ x, y })) continue; const field = solution.fieldAt({ x, y }); const magnitude = Math.hypot(field.x, field.y); if (magnitude < .01) continue; const p = this.toScreen({ x, y }); const length = 13 * Math.tanh(magnitude / Math.max(30, this.externalField)); drawArrow(ctx, p.x, p.y, p.x + field.x / magnitude * length, p.y - field.y / magnitude * length, 3); } ctx.restore(); }
  private drawMetal(ctx: CanvasRenderingContext2D) { const c = this.toScreen({ x: 0, y: 0 }); ctx.save(); ctx.fillStyle = METAL; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(c.x, c.y, this.world(this.semiMajor), this.world(this.semiMajor * this.aspect), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); if (this.preset === 'cavity') { const p = this.toScreen({ x: .28, y: -.08 }); ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(p.x, p.y, this.world(.36), 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } ctx.restore(); }
  private drawSurfaceCharge(ctx: CanvasRenderingContext2D, solution: ConductorSolution) { const max = Math.max(...solution.samples.map((s) => Math.abs(s.surfaceChargeDensity)), 1e-30); ctx.save(); solution.samples.forEach((sample) => { const p = this.toScreen(sample.position); const r = 2 + 5 * Math.sqrt(Math.abs(sample.surfaceChargeDensity) / max); ctx.fillStyle = sample.surfaceChargeDensity >= 0 ? POSITIVE : NEGATIVE; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); }); ctx.restore(); }
  private drawProbe(ctx: CanvasRenderingContext2D, solution: ConductorSolution) { const p = this.toScreen(this.probe); const field = solution.fieldAt(this.probe); const magnitude = Math.hypot(field.x, field.y); ctx.save(); ctx.strokeStyle = PROBE; ctx.fillStyle = PAPER; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); if (magnitude > 1e-6) { ctx.fillStyle = PROBE; drawArrow(ctx, p.x, p.y, p.x + field.x / magnitude * 42, p.y - field.y / magnitude * 42, 5); } ctx.restore(); }
  private updateReadout(solution: ConductorSolution) { const field = solution.fieldAt(this.probe); const d = solution.diagnostics; updateData(this.elements.data, [['Region', solution.isInCavity(this.probe) ? 'empty cavity' : solution.isInMetal(this.probe) ? 'conducting material' : 'exterior'], ['Probe |E|', `${formatScientific(Math.hypot(field.x, field.y))} N/C`], ['Probe potential', `${formatScientific(solution.potentialAt(this.probe))} V`], ['Surface potential spread', `${formatScientific(d.boundaryPotentialSpread)} V`], ['Relative equipotential error', `${(100 * d.relativeBoundaryPotentialSpread).toPrecision(3)}%`], ['Center residual field', `${(100 * d.centerFieldResidual).toPrecision(3)}% of external`], ['Cavity shielding ratio', this.preset === 'cavity' ? `${(100 * d.cavityShieldingRatio).toPrecision(3)}%` : '—'], ['Tip charge enhancement', `${d.tipChargeEnhancement.toFixed(2)}× RMS density`], ['Boundary unknowns', d.collocationSamples], ['Numerical validity', d.validity]]); }
  private updateDetails() { updateDetails(this.elements.details, 'Φ = Φext − (1 / 2πε₀) Σ λⱼ ln|r−rⱼ|    Φ(boundary) = constant', [['λⱼ', 'solved line charge on each boundary panel'], ['2-D', 'infinitely long conductor cross-section'], ['error', 'surface potential spread and residual interior field']], 'Electrostatic equilibrium is enforced by a boundary-collocation solve. Surface colors come from solved charge density. The model demonstrates zero interior field, equipotential metal, tip enhancement, cavities, and shielding while exposing its discretization error.'); }
  private readonly onPointer = (event: PointerEvent) => { this.probe = this.toWorld(this.canvas.point(event)); this.render(); announce(this.elements.status, 'Probe moved; region and field readout updated.'); };
  private readonly onKey = (event: KeyboardEvent) => { if (event.key.toLowerCase() === 'r' && this.elements.stage.contains(document.activeElement)) this.reset(); };
  private toScreen(p: { x: number; y: number }): Point { const s = Math.min(this.canvas.width / 6.4, this.canvas.height / 5); return { x: this.canvas.width / 2 + p.x * s, y: this.canvas.height / 2 - p.y * s }; }
  private toWorld(p: Point) { const s = Math.min(this.canvas.width / 6.4, this.canvas.height / 5); return { x: clamp((p.x - this.canvas.width / 2) / s, -3, 3), y: clamp((this.canvas.height / 2 - p.y) / s, -2.4, 2.4) }; }
  private world(v: number) { return v * Math.min(this.canvas.width / 6.4, this.canvas.height / 5); }
}
function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, size: number) { line(ctx, x1, y1, x2, y2); const a = Math.atan2(y2 - y1, x2 - x1); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - Math.cos(a - .55) * size, y2 - Math.sin(a - .55) * size); ctx.lineTo(x2 - Math.cos(a + .55) * size, y2 - Math.sin(a + .55) * size); ctx.closePath(); ctx.fill(); }
