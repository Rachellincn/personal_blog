import { CanvasSurface } from '../core/canvas';
import { clamp } from '../core/math';
import { announce, buildActions, buildControls, updateData, updateDetails } from '../core/ui';
import type { Experiment, ExperimentElements, Point } from '../core/types';
import { formatScientific } from '../core/units';
import { electricFieldAt, type PointCharge } from '../electromagnetism/electrostatics';
import { ellipsePolyline, fluxThroughClosedPolyline } from '../electromagnetism/field-engine';
import {
  createGaussianCylinder,
  createGaussianPillbox,
  createGaussianSphere,
  createInfiniteLineChargeScenario,
  createInfinitePlaneChargeScenario,
  createPointChargeScenario,
  createUniformSphereChargeScenario,
  verifyGaussLaw,
  type ChargeScenario,
  type FluxReport,
  type GaussianSurface,
  type PointCharge3D,
} from '../electromagnetism/gauss-law';

type ScenarioKind = 'point' | 'sphere' | 'line' | 'plane' | 'asymmetric';
type SurfaceKind = 'sphere' | 'cylinder' | 'pillbox' | 'curve-2d';

const SCENARIOS: Record<ScenarioKind, string> = {
  point: 'Centered point charge',
  sphere: 'Uniform charged sphere',
  line: 'Infinite line charge',
  plane: 'Infinite charged plane',
  asymmetric: 'Asymmetric multi-charge',
};
const SURFACES: Record<SurfaceKind, string> = {
  sphere: '3-D Gaussian sphere',
  cylinder: '3-D Gaussian cylinder',
  pillbox: '3-D Gaussian pillbox',
  'curve-2d': '2-D closed-curve diagnostic',
};
const PAPER = '#fbf8f1';
const INK = '#263238';
const POSITIVE = '#df725d';
const NEGATIVE = '#315b73';
const SURFACE = '#987ab3';

export default class GaussLawExperiment implements Experiment {
  readonly id = 'electromagnetism-gauss-law';
  readonly name = 'Gauss law & symmetry';
  readonly number = 'ATLAS EM 06';
  private elements!: ExperimentElements;
  private canvas!: CanvasSurface;
  private scenarioKind: ScenarioKind = 'point';
  private surfaceKind: SurfaceKind = 'sphere';
  private surfaceCenter = { x: 0, z: 0 };
  private radius = 1.35;
  private halfLength = .9;
  private resolution = 40;
  private showNormals = true;
  private dragging = false;

  mount(elements: ExperimentElements) {
    this.elements = elements;
    this.canvas = new CanvasSurface(elements.canvas, () => this.render());
    this.buildUI();
    elements.canvas.addEventListener('pointerdown', this.onPointerDown);
    elements.canvas.addEventListener('pointermove', this.onPointerMove);
    elements.canvas.addEventListener('pointerup', this.onPointerUp);
    elements.canvas.addEventListener('pointercancel', this.onPointerUp);
    document.addEventListener('keydown', this.onKeyDown);
    this.updateDetails(); this.render();
    announce(elements.status, 'Drag the Gaussian surface. Local colors show the sign of E·dA; the total is checked against Q enclosed / ε₀.');
  }

  pause() { announce(this.elements.status, 'Static Gaussian-surface integration held.'); }
  resume() { announce(this.elements.status, 'Gaussian-surface integration ready.'); }
  reset() {
    this.scenarioKind = 'point'; this.surfaceKind = 'sphere';
    this.surfaceCenter = { x: 0, z: 0 }; this.radius = 1.35;
    this.halfLength = .9; this.resolution = 40; this.showNormals = true;
    this.buildUI(); this.updateDetails(); this.render();
    announce(this.elements.status, 'Gauss-law defaults restored.');
  }
  destroy() {
    this.canvas.destroy();
    this.elements.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.elements.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.elements.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.elements.canvas.removeEventListener('pointercancel', this.onPointerUp);
    document.removeEventListener('keydown', this.onKeyDown);
  }

  private buildUI() {
    buildControls(this.elements.controls, [
      { key: 'scenario', label: 'Charge scenario', type: 'select', value: this.scenarioKind, options: Object.entries(SCENARIOS) },
      { key: 'surface', label: 'Integration surface', type: 'select', value: this.surfaceKind, options: Object.entries(SURFACES) },
      { key: 'radius', label: this.surfaceKind === 'curve-2d' ? 'Curve semimajor axis' : 'Surface radius', type: 'range', value: this.radius, min: .45, max: 2.25, step: .05, unit: 'm' },
      { key: 'length', label: this.surfaceKind === 'curve-2d' ? 'Curve semiminor axis' : 'Half length', type: 'range', value: this.halfLength, min: .35, max: 1.7, step: .05, unit: 'm' },
      { key: 'resolution', label: 'Surface resolution', type: 'range', value: this.resolution, min: 16, max: 72, step: 8 },
      { key: 'normals', label: 'Local normals & flux', type: 'checkbox', value: this.showNormals },
    ], (key, value) => {
      if (key === 'scenario') { this.scenarioKind = value as ScenarioKind; this.applyRecommendedSurface(false); this.buildUI(); }
      if (key === 'surface') { this.surfaceKind = value as SurfaceKind; this.buildUI(); this.updateDetails(); }
      if (key === 'radius') this.radius = Number(value);
      if (key === 'length') this.halfLength = Number(value);
      if (key === 'resolution') this.resolution = Number(value);
      if (key === 'normals') this.showNormals = Boolean(value);
      this.render();
    });
    buildActions(this.elements.actions, [
      { label: 'Use symmetry surface', action: 'correct', primary: true },
      { label: 'Wrong surface preset', action: 'wrong' },
      { label: 'Center surface', action: 'center' },
      { label: 'Reset', action: 'reset' },
    ], (action) => {
      if (action === 'correct') this.applyRecommendedSurface();
      if (action === 'wrong') this.applyWrongSurface();
      if (action === 'center') { this.surfaceCenter = { x: 0, z: 0 }; this.render(); announce(this.elements.status, 'Integration surface centered on the source reference.'); }
      if (action === 'reset') this.reset();
    });
  }

  private applyRecommendedSurface(announceChange = true) {
    this.surfaceKind = this.scenarioKind === 'line' ? 'cylinder' : this.scenarioKind === 'plane' ? 'pillbox' : 'sphere';
    this.surfaceCenter = { x: 0, z: 0 };
    if (this.elements) { this.buildUI(); this.updateDetails(); this.render(); }
    if (announceChange && this.elements) announce(this.elements.status, 'A surface matching the source symmetry is selected; E may be extracted from the flux integral.');
  }

  private applyWrongSurface() {
    this.surfaceKind = this.scenarioKind === 'line' || this.scenarioKind === 'plane' ? 'sphere' : this.scenarioKind === 'asymmetric' ? 'cylinder' : 'sphere';
    this.surfaceCenter = { x: .62, z: this.scenarioKind === 'plane' ? .9 : .18 };
    this.buildUI(); this.updateDetails(); this.render();
    announce(this.elements.status, 'Wrong-surface preset: Gauss law remains valid, but symmetry no longer lets us take E outside the integral.');
  }

  private scenario(): ChargeScenario {
    switch (this.scenarioKind) {
      case 'point': return createPointChargeScenario([{ id: 'q', position: { x: 0, y: 0, z: 0 }, charge: 5e-9 }]);
      case 'sphere': return createUniformSphereChargeScenario({ center: { x: 0, y: 0, z: 0 }, radius: .9, volumeDensity: 2.4e-9 });
      case 'line': return createInfiniteLineChargeScenario({ axis: { x: 0, y: 0 }, linearDensity: 4e-9 });
      case 'plane': return createInfinitePlaneChargeScenario({ z: 0, surfaceChargeDensity: 3e-9 });
      case 'asymmetric': return createPointChargeScenario(this.asymmetricCharges());
    }
  }

  private asymmetricCharges(): PointCharge3D[] {
    return [
      { id: 'q1', position: { x: -.62, y: 0, z: .32 }, charge: 5e-9 },
      { id: 'q2', position: { x: .48, y: 0, z: -.42 }, charge: -2e-9 },
      { id: 'q3', position: { x: .28, y: 0, z: .62 }, charge: 1e-9 },
    ];
  }

  private surface(): GaussianSurface {
    const center = { x: this.surfaceCenter.x, y: 0, z: this.surfaceCenter.z };
    if (this.surfaceKind === 'sphere') return createGaussianSphere({ center, radius: this.radius });
    if (this.surfaceKind === 'pillbox') return createGaussianPillbox({ center, radius: this.radius, halfLength: this.halfLength });
    return createGaussianCylinder({ center, radius: this.radius, halfLength: this.halfLength });
  }

  private render() {
    if (!this.canvas) return;
    const ctx = this.canvas.context;
    this.canvas.clear(PAPER); this.drawGrid(ctx); this.drawSources(ctx);
    if (this.surfaceKind === 'curve-2d') this.render2DDiagnostic(ctx);
    else {
      const report = verifyGaussLaw(this.scenario(), this.surface(), { resolution: this.dragging ? Math.min(20, this.resolution) : this.resolution });
      this.drawSurface(ctx, report); this.update3DReadout(report);
    }
    this.drawLegend(ctx);
  }

  private drawGrid(ctx: CanvasRenderingContext2D) {
    ctx.save(); ctx.strokeStyle = 'rgba(38,50,56,.08)';
    for (let n = -3; n <= 3; n += 1) { const x = this.toScreen({ x: n, z: 0 }); const z = this.toScreen({ x: 0, z: n }); line(ctx, x.x, 0, x.x, this.canvas.height); line(ctx, 0, z.y, this.canvas.width, z.y); }
    const origin = this.toScreen({ x: 0, z: 0 }); ctx.strokeStyle = 'rgba(38,50,56,.22)'; line(ctx, origin.x, 0, origin.x, this.canvas.height); line(ctx, 0, origin.y, this.canvas.width, origin.y); ctx.restore();
  }

  private drawSources(ctx: CanvasRenderingContext2D) {
    ctx.save(); ctx.lineWidth = 3;
    if (this.scenarioKind === 'point') this.drawCharge(ctx, { x: 0, z: 0 }, 5e-9);
    if (this.scenarioKind === 'asymmetric') this.asymmetricCharges().forEach((charge) => this.drawCharge(ctx, charge.position, charge.charge));
    if (this.scenarioKind === 'sphere') { const center = this.toScreen({ x: 0, z: 0 }); const radius = this.worldLength(.9); ctx.fillStyle = 'rgba(223,114,93,.15)'; ctx.strokeStyle = POSITIVE; ctx.beginPath(); ctx.arc(center.x, center.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.font = '10px DM Mono, monospace'; ctx.fillStyle = INK; ctx.fillText('uniform ρ', center.x - 27, center.y + 4); }
    if (this.scenarioKind === 'line') { const center = this.toScreen({ x: 0, z: 0 }); ctx.strokeStyle = POSITIVE; ctx.setLineDash([8, 5]); line(ctx, center.x, 0, center.x, this.canvas.height); ctx.setLineDash([]); }
    if (this.scenarioKind === 'plane') { const center = this.toScreen({ x: 0, z: 0 }); ctx.strokeStyle = POSITIVE; ctx.setLineDash([8, 5]); line(ctx, 0, center.y, this.canvas.width, center.y); ctx.setLineDash([]); }
    ctx.fillStyle = INK; ctx.font = '11px DM Mono, monospace'; ctx.fillText(SCENARIOS[this.scenarioKind], 16, 24); ctx.restore();
  }

  private drawCharge(ctx: CanvasRenderingContext2D, position: { x: number; z: number }, charge: number) {
    const point = this.toScreen(position); ctx.save(); ctx.fillStyle = charge >= 0 ? POSITIVE : NEGATIVE; ctx.beginPath(); ctx.arc(point.x, point.y, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 15px DM Sans, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(charge >= 0 ? '+' : '−', point.x, point.y - 1); ctx.restore();
  }

  private drawSurface(ctx: CanvasRenderingContext2D, report: FluxReport) {
    const center = this.toScreen(this.surfaceCenter); const radius = this.worldLength(this.radius); const halfLength = this.worldLength(this.halfLength);
    ctx.save(); ctx.strokeStyle = SURFACE; ctx.lineWidth = 2.2; ctx.setLineDash([7, 5]);
    if (this.surfaceKind === 'sphere') { ctx.beginPath(); ctx.arc(center.x, center.y, radius, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(center.x, center.y, radius, radius * .28, 0, 0, Math.PI * 2); ctx.stroke(); }
    else { ctx.strokeRect(center.x - radius, center.y - halfLength, 2 * radius, 2 * halfLength); ctx.beginPath(); ctx.ellipse(center.x, center.y - halfLength, radius, Math.max(7, radius * .18), 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(center.x, center.y + halfLength, radius, Math.max(7, radius * .18), 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.setLineDash([]);
    if (this.showNormals && report.samples.length) {
      const stride = Math.max(1, Math.floor(report.samples.length / 42));
      const maxFlux = Math.max(...report.samples.map((sample) => Math.abs(sample.eDotDA)), 1e-30);
      report.samples.filter((_, index) => index % stride === 0).forEach((sample) => {
        const point = this.toScreen(sample.point); const strength = clamp(Math.abs(sample.eDotDA) / maxFlux, .15, 1);
        ctx.globalAlpha = .35 + .65 * strength; ctx.strokeStyle = sample.eDotDA >= 0 ? POSITIVE : NEGATIVE; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 1.3;
        drawArrow(ctx, point.x, point.y, point.x + sample.normal.x * 14, point.y - sample.normal.z * 14, 3.3);
      });
    }
    ctx.restore();
  }

  private render2DDiagnostic(ctx: CanvasRenderingContext2D) {
    const center2D = { x: this.surfaceCenter.x, y: this.surfaceCenter.z };
    const curve = ellipsePolyline(center2D, this.radius, this.halfLength, Math.max(48, this.resolution * 3));
    const sources: PointCharge[] = (this.scenarioKind === 'asymmetric' ? this.asymmetricCharges() : [{ id: 'q', position: { x: 0, y: 0, z: 0 }, charge: 5e-9 }]).map((source) => ({ id: source.id, position: { x: source.position.x, y: source.position.z }, charge: source.charge }));
    const result = fluxThroughClosedPolyline(curve, (point) => electricFieldAt(point, sources).vector);
    ctx.save(); ctx.strokeStyle = SURFACE; ctx.lineWidth = 2.2; ctx.setLineDash([7, 5]); ctx.beginPath();
    curve.forEach((point, index) => { const screen = this.toScreen({ x: point.x, z: point.y }); index ? ctx.lineTo(screen.x, screen.y) : ctx.moveTo(screen.x, screen.y); }); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
    if (this.showNormals) result.samples.filter((_, index) => index % Math.max(1, Math.floor(result.samples.length / 28)) === 0).forEach((sample) => { const point = this.toScreen({ x: sample.x, z: sample.y }); ctx.strokeStyle = (sample.density ?? 0) >= 0 ? POSITIVE : NEGATIVE; ctx.fillStyle = ctx.strokeStyle; drawArrow(ctx, point.x, point.y, point.x + sample.normal.x * 15, point.y - sample.normal.y * 15, 3.2); });
    ctx.restore();
    updateData(this.elements.data, [
      ['Diagnostic', '2-D closed-curve line flux — not a Gaussian surface'],
      ['∮ E·n dl', `${formatScientific(result.value)} N·m/C`],
      ['Valid segments', result.evaluatedSegments],
      ['Skipped singular segments', result.skippedSegments],
      ['Enclosed charge', 'not inferred from 2-D line flux'],
      ['Teaching boundary', 'Physical Gauss law requires a closed 3-D surface'],
    ]);
  }

  private update3DReadout(report: FluxReport) {
    updateData(this.elements.data, [
      ['Surface', SURFACES[this.surfaceKind]],
      ['Numerical ∮E·dA', `${formatScientific(report.flux)} N·m²/C`],
      ['Q enclosed / ε₀', `${formatScientific(report.expectedFlux)} N·m²/C`],
      ['Enclosed charge', `${formatScientific(report.enclosedCharge)} C`],
      ['Un-enclosed charge', report.unenclosedCharge === null ? 'infinite source — not finite' : `${formatScientific(report.unenclosedCharge)} C`],
      ['Relative integration error', `${(100 * report.relativeError).toPrecision(3)}%`],
      ['Local surface elements', report.samples.length.toLocaleString()],
      ['Can extract E by symmetry?', report.canExtractFieldBySymmetry ? 'Yes' : 'No'],
      ['Symmetry conclusion', report.symmetryNote],
    ]);
  }

  private drawLegend(ctx: CanvasRenderingContext2D) {
    ctx.save(); ctx.font = '10px DM Mono, monospace'; const y = this.canvas.height - 28;
    ctx.fillStyle = POSITIVE; ctx.fillRect(16, y - 5, 16, 3); ctx.fillText('E·dA > 0', 38, y);
    ctx.fillStyle = NEGATIVE; ctx.fillRect(126, y - 5, 16, 3); ctx.fillText('E·dA < 0', 148, y);
    ctx.fillStyle = SURFACE; ctx.fillRect(238, y - 5, 16, 3); ctx.fillText('outward n', 260, y); ctx.restore();
  }

  private updateDetails() {
    const diagnostic = this.surfaceKind === 'curve-2d';
    updateDetails(this.elements.details,
      diagnostic ? '2-D diagnostic: ∮C E·n dl' : '∯S E·dA = Q enclosed / ε₀',
      diagnostic
        ? [['C', 'closed curve in a plane'], ['dl', 'line element; units differ from 3-D flux'], ['warning', 'this is not a physical Gaussian surface']]
        : [['S', 'closed three-dimensional Gaussian surface'], ['dA', 'outward vector area element'], ['Q enclosed', 'only charge inside S; outside charges contribute zero net flux']],
      diagnostic
        ? 'The curve view is retained as a clearly labeled planar divergence diagnostic. It never claims Q/ε₀, because Gauss law in ordinary three-dimensional electrostatics integrates over a closed surface.'
        : 'Gauss law always holds for every closed surface. A sphere, cylinder, or pillbox becomes algebraically useful only when it shares enough symmetry with the source to make field magnitude constant on the relevant pieces.');
  }

  private readonly onPointerDown = (event: PointerEvent) => { this.dragging = true; this.moveSurface(event); this.elements.canvas.setPointerCapture(event.pointerId); };
  private readonly onPointerMove = (event: PointerEvent) => { if (this.dragging) this.moveSurface(event); };
  private readonly onPointerUp = (event: PointerEvent) => { if (!this.dragging) return; this.dragging = false; this.moveSurface(event); if (this.elements.canvas.hasPointerCapture(event.pointerId)) this.elements.canvas.releasePointerCapture(event.pointerId); announce(this.elements.status, 'High-resolution surface flux recomputed after drag.'); };
  private readonly onKeyDown = (event: KeyboardEvent) => { if (event.key.toLowerCase() === 'r' && this.elements.stage.contains(document.activeElement)) this.reset(); };
  private moveSurface(event: PointerEvent) { const point = this.toWorld(this.canvas.point(event)); this.surfaceCenter = { x: clamp(point.x, -2.2, 2.2), z: clamp(point.z, -2.2, 2.2) }; this.render(); }
  private toScreen(point: { x: number; z: number }): Point { const scale = Math.min(this.canvas.width / 6.4, this.canvas.height / 6.4); return { x: this.canvas.width / 2 + point.x * scale, y: this.canvas.height / 2 - point.z * scale }; }
  private toWorld(point: Point) { const scale = Math.min(this.canvas.width / 6.4, this.canvas.height / 6.4); return { x: (point.x - this.canvas.width / 2) / scale, z: (this.canvas.height / 2 - point.y) / scale }; }
  private worldLength(value: number) { return value * Math.min(this.canvas.width / 6.4, this.canvas.height / 6.4); }
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, size: number) { line(ctx, x1, y1, x2, y2); const angle = Math.atan2(y2 - y1, x2 - x1); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - Math.cos(angle - .55) * size, y2 - Math.sin(angle - .55) * size); ctx.lineTo(x2 - Math.cos(angle + .55) * size, y2 - Math.sin(angle + .55) * size); ctx.closePath(); ctx.fill(); }
