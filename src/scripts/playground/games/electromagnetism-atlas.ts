import { AnimationLoop } from '../core/animation-loop';
import { CanvasSurface } from '../core/canvas';
import { clamp, seededRandom } from '../core/math';
import { announce, buildActions, buildControls, updateData, updateDetails } from '../core/ui';
import type { Experiment, ExperimentElements, Point } from '../core/types';
import { formatQuantity, formatScientific } from '../core/units';
import {
  DEFAULT_SINGULARITY_RADIUS,
  electricFieldAt,
  electricPotentialAt,
  forceOnTestCharge,
  negativePotentialGradient,
  potentialEnergy,
  relativeVectorError,
  type PointCharge,
  type TestCharge,
  type Vec2,
} from '../electromagnetism/electrostatics';
import {
  contourSegments,
  ellipsePolyline,
  fieldLinesForCharges,
  fluxThroughClosedPolyline,
  robustMagnitudeReference,
  sampleVectorField,
  scaledArrowLength,
  traceStreamline,
  type FieldBounds,
  type VectorSample,
} from '../electromagnetism/field-engine';

type ViewMode = 'arrows' | 'lines' | 'contours' | 'magnitude' | 'tracers' | 'flux';
type Preset = 'single-positive' | 'single-negative' | 'dipole' | 'like-pair' | 'quadrupole' | 'linear-multipole' | 'random';

const VIEW_LABELS: Record<ViewMode, string> = {
  arrows: 'Vector arrows', lines: 'Field lines', contours: 'Equipotential contours', magnitude: 'Magnitude map', tracers: 'Particle tracers', flux: 'Flux view',
};

const COLORS = { positive: '#e6654f', negative: '#315b73', field: '#263238', contourPositive: '#d75d49', contourNegative: '#315b73', test: '#987ab3', paper: '#fbf8f1' };

export default class ElectromagnetismAtlasExperiment implements Experiment {
  readonly id = 'electromagnetism';
  readonly name = 'Electric field & potential atlas';
  readonly number = 'ATLAS EM 01';
  private elements!: ExperimentElements;
  private surface!: CanvasSurface;
  private loop!: AnimationLoop;
  private preset: Preset = 'dipole';
  private view: ViewMode = 'arrows';
  private logarithmic = true;
  private showContributions = true;
  private sourcesLocked = false;
  private sources: PointCharge[] = [];
  private testCharge: TestCharge = { id: 'test', position: { x: 0, y: 1.25 }, charge: 1e-9, test: true };
  private customSeed: Vec2 | null = null;
  private fluxCenter: Vec2 = { x: 0, y: 0 };
  private dragging: { kind: 'source' | 'test' | 'flux'; id?: string } | null = null;
  private lowResolution = false;
  private paused = false;
  private tracerPhase = 0;
  private samples: VectorSample[] = [];
  private fieldLines: Vec2[][] = [];
  private contours: ReturnType<typeof contourSegments> = [];
  private cacheKey = '';
  private readoutKey = '';
  private readonly random = seededRandom(20260717);
  private readonly buffer = document.createElement('canvas');
  private readonly bufferContext = this.buffer.getContext('2d')!;

  mount(elements: ExperimentElements) {
    this.elements = elements;
    this.restore();
    this.applyPreset(this.preset, false);
    this.surface = new CanvasSurface(elements.canvas, () => { this.invalidate(); this.render(); });
    this.loop = new AnimationLoop({ element: elements.canvas, fixedStep: 1 / 60, update: (dt) => { if (!this.paused) this.tracerPhase = (this.tracerPhase + dt * .22) % 1; }, render: () => this.render() });
    this.buildUI();
    elements.canvas.addEventListener('pointerdown', this.onPointerDown);
    elements.canvas.addEventListener('pointermove', this.onPointerMove);
    elements.canvas.addEventListener('pointerup', this.onPointerUp);
    elements.canvas.addEventListener('pointercancel', this.onPointerUp);
    document.addEventListener('keydown', this.onKeyDown);
    this.updateModelDetails();
    this.updateAnimationState();
    this.render();
    announce(elements.status, 'Drag a source or tap empty space to move the test charge. Singular disks are excluded from evaluation.');
  }

  pause() { this.paused = true; this.loop.pause(); announce(this.elements.status, 'Field tracers paused.'); }
  resume() { this.paused = false; this.updateAnimationState(); announce(this.elements.status, this.view === 'tracers' ? 'Field tracers running.' : 'Static field view ready.'); }
  reset() { this.applyPreset(this.preset); announce(this.elements.status, 'Preset restored.'); }

  destroy() {
    this.loop.destroy();
    this.surface.destroy();
    this.elements.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.elements.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.elements.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.elements.canvas.removeEventListener('pointercancel', this.onPointerUp);
    document.removeEventListener('keydown', this.onKeyDown);
  }

  private buildUI() {
    buildControls(this.elements.controls, [
      { key: 'preset', label: 'Charge preset', type: 'select', value: this.preset, options: [['single-positive', 'Single positive'], ['single-negative', 'Single negative'], ['dipole', 'Equal opposite pair'], ['like-pair', 'Equal like pair'], ['quadrupole', 'Electric quadrupole'], ['linear-multipole', 'Linear multipole'], ['random', 'Random charge group']] },
      { key: 'view', label: 'Rendering mode', type: 'select', value: this.view, options: Object.entries(VIEW_LABELS) },
      { key: 'scale', label: 'Arrow scaling', type: 'select', value: this.logarithmic ? 'log' : 'linear', options: [['log', 'Logarithmic'], ['linear', 'Linear / percentile']] },
      { key: 'test-sign', label: 'Test charge', type: 'select', value: this.testCharge.charge > 0 ? 'positive' : 'negative', options: [['positive', '+1 nC'], ['negative', '−1 nC']] },
      { key: 'mobility', label: 'Source mobility', type: 'select', value: this.sourcesLocked ? 'fixed' : 'movable', options: [['movable', 'Movable sources'], ['fixed', 'Fixed sources']] },
      { key: 'contributions', label: 'Vector sum construction', type: 'checkbox', value: this.showContributions },
    ], (key, value) => {
      if (key === 'preset') { this.preset = value as Preset; this.applyPreset(this.preset); }
      if (key === 'view') { this.view = value as ViewMode; this.updateAnimationState(); }
      if (key === 'scale') this.logarithmic = value === 'log';
      if (key === 'test-sign') this.testCharge.charge = value === 'positive' ? 1e-9 : -1e-9;
      if (key === 'mobility') { this.sourcesLocked = value === 'fixed'; this.sources.forEach((source) => { source.fixed = this.sourcesLocked; }); }
      if (key === 'contributions') this.showContributions = Boolean(value);
      this.persist(); this.updateModelDetails(); this.render();
    });
    buildActions(this.elements.actions, [
      { label: 'Add + charge', action: 'add-positive', primary: true },
      { label: 'Add − charge', action: 'add-negative' },
      { label: 'Seed line at probe', action: 'seed' },
      { label: 'Reset preset', action: 'reset' },
    ], (action) => {
      if (action === 'add-positive') this.addCharge(3e-9);
      if (action === 'add-negative') this.addCharge(-3e-9);
      if (action === 'seed') { this.customSeed = { ...this.testCharge.position }; this.view = 'lines'; this.syncViewControl(); this.invalidate(); announce(this.elements.status, 'A field line now starts at the test-charge probe.'); }
      if (action === 'reset') this.reset();
      this.persist(); this.updateAnimationState(); this.render();
    });
  }

  private applyPreset(preset: Preset, announceChange = true) {
    const q = 5e-9;
    const definitions: Record<Exclude<Preset, 'random'>, Array<[number, number, number]>> = {
      'single-positive': [[0, 0, q]],
      'single-negative': [[0, 0, -q]],
      dipole: [[-1, 0, q], [1, 0, -q]],
      'like-pair': [[-1, 0, q], [1, 0, q]],
      quadrupole: [[-.85, -.7, q], [.85, -.7, -q], [.85, .7, q], [-.85, .7, -q]],
      'linear-multipole': [[-1.5, 0, q], [-.5, 0, -2 * q], [.5, 0, 2 * q], [1.5, 0, -q]],
    };
    const items = preset === 'random' ? Array.from({ length: 6 }, (_, index): [number, number, number] => [this.random() * 4.4 - 2.2, this.random() * 2.8 - 1.4, (index % 2 ? -1 : 1) * (2 + Math.round(this.random() * 4)) * 1e-9]) : definitions[preset];
    this.sources = items.map(([x, y, charge], index) => ({ id: `q${index + 1}`, position: { x, y }, charge, fixed: this.sourcesLocked }));
    this.testCharge.position = { x: 0, y: preset === 'single-positive' || preset === 'single-negative' ? 1.2 : 1.45 };
    this.fluxCenter = { x: 0, y: 0 };
    this.customSeed = null;
    this.invalidate();
    if (this.surface) { this.render(); this.updateReadout(); }
    if (announceChange && this.elements) announce(this.elements.status, `${this.sources.length}-source preset loaded. Drag any charge to recompute the field.`);
  }

  private addCharge(charge: number) {
    const index = this.sources.length + 1;
    const offset = (index % 5 - 2) * .32;
    this.sources.push({ id: `q${Date.now()}-${index}`, position: { x: offset, y: -.9 + (index % 3) * .42 }, charge, fixed: this.sourcesLocked });
    this.invalidate();
    announce(this.elements.status, `${charge > 0 ? 'Positive' : 'Negative'} 3 nC source added.`);
  }

  private render() {
    if (!this.surface) return;
    this.ensureCache();
    const ctx = this.surface.context;
    this.surface.clear(COLORS.paper);
    if (this.view === 'magnitude' || this.view === 'contours') this.drawScalarBackground(this.view === 'magnitude' ? 'magnitude' : 'potential');
    this.drawGrid(ctx);
    if (this.view === 'arrows' || this.view === 'flux') this.drawArrows(ctx, this.view === 'flux' ? .72 : 1);
    if (this.view === 'lines' || this.view === 'tracers' || this.view === 'contours') this.drawFieldLines(ctx, this.view === 'contours' ? .42 : 1);
    if (this.view === 'contours') this.drawContours(ctx);
    if (this.view === 'magnitude') this.drawArrows(ctx, .58);
    if (this.view === 'tracers') this.drawTracers(ctx);
    if (this.view === 'flux') this.drawFlux(ctx);
    this.sources.forEach((source) => this.drawCharge(ctx, source));
    this.drawTestCharge(ctx);
    if (this.showContributions) this.drawVectorSum(ctx);
    this.drawLegend(ctx);
    this.updateReadout();
  }

  private ensureCache() {
    const bounds = this.bounds();
    const key = JSON.stringify([this.sources.map((source) => [source.position.x, source.position.y, source.charge]), bounds, this.lowResolution, this.surface.width < 620]);
    if (key === this.cacheKey) return;
    this.cacheKey = key;
    const mobile = this.surface.width < 620;
    const columns = this.lowResolution ? 13 : mobile ? 18 : 25;
    const rows = Math.max(9, Math.round(columns * this.surface.height / this.surface.width));
    const field = (point: Vec2) => electricFieldAt(point, this.sources).vector;
    this.samples = sampleVectorField(field, bounds, columns, rows);
    this.fieldLines = fieldLinesForCharges(this.sources, bounds, this.lowResolution ? 7 : mobile ? 9 : 13);
    if (this.customSeed) this.fieldLines.push(traceStreamline(this.customSeed, field, bounds, { sources: this.sources, maxSteps: 620 }));
    const potentialSamples = this.samples.flatMap((sample) => {
      const value = electricPotentialAt(sample, this.sources).value;
      return value === null ? [] : [Math.abs(value)];
    }).sort((a, b) => a - b);
    const reference = potentialSamples[Math.floor(potentialSamples.length * .76)] || 20;
    const levels = [-.8, -.4, -.2, -.1, .1, .2, .4, .8].map((factor) => factor * reference);
    this.contours = contourSegments((point) => electricPotentialAt(point, this.sources).value, bounds, this.lowResolution ? 34 : mobile ? 55 : 84, this.lowResolution ? 24 : mobile ? 42 : 58, levels);
  }

  private drawScalarBackground(kind: 'magnitude' | 'potential') {
    const mobile = this.surface.width < 620;
    const columns = this.lowResolution ? 52 : mobile ? 90 : 150;
    const rows = Math.max(50, Math.round(columns * this.surface.height / this.surface.width));
    if (this.buffer.width !== columns || this.buffer.height !== rows) { this.buffer.width = columns; this.buffer.height = rows; }
    const image = this.bufferContext.createImageData(columns, rows);
    const values: Array<number | null> = [];
    const bounds = this.bounds();
    for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
      const point = { x: bounds.minX + (bounds.maxX - bounds.minX) * column / (columns - 1), y: bounds.maxY - (bounds.maxY - bounds.minY) * row / (rows - 1) };
      values.push(kind === 'magnitude' ? electricFieldAt(point, this.sources).magnitude : electricPotentialAt(point, this.sources).value);
    }
    const finite = values.flatMap((value) => value === null ? [] : [Math.abs(value)]).sort((a, b) => a - b);
    const reference = finite[Math.floor(finite.length * .9)] || 1;
    values.forEach((value, index) => {
      const color = value === null ? [61, 57, 55] : kind === 'magnitude' ? magnitudeColor(Math.log1p(Math.abs(value) / reference * 9) / Math.log(10)) : potentialColor(clamp(value / reference, -1, 1));
      const offset = index * 4;
      image.data[offset] = color[0]; image.data[offset + 1] = color[1]; image.data[offset + 2] = color[2]; image.data[offset + 3] = 255;
    });
    this.bufferContext.putImageData(image, 0, 0);
    this.surface.context.save(); this.surface.context.globalAlpha = .84; this.surface.context.imageSmoothingEnabled = true; this.surface.context.drawImage(this.buffer, 0, 0, this.surface.width, this.surface.height); this.surface.context.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D) {
    const bounds = this.bounds();
    ctx.save(); ctx.lineWidth = 1;
    for (let x = Math.ceil(bounds.minX); x <= bounds.maxX; x += 1) { const screen = this.toScreen({ x, y: 0 }); ctx.strokeStyle = x === 0 ? 'rgba(38,50,56,.22)' : 'rgba(38,50,56,.07)'; line(ctx, screen.x, 0, screen.x, this.surface.height); }
    for (let y = Math.ceil(bounds.minY); y <= bounds.maxY; y += 1) { const screen = this.toScreen({ x: 0, y }); ctx.strokeStyle = y === 0 ? 'rgba(38,50,56,.22)' : 'rgba(38,50,56,.07)'; line(ctx, 0, screen.y, this.surface.width, screen.y); }
    ctx.restore();
  }

  private drawArrows(ctx: CanvasRenderingContext2D, opacity: number) {
    const reference = robustMagnitudeReference(this.samples);
    const spacing = this.surface.width / Math.max(10, Math.sqrt(this.samples.length));
    ctx.save(); ctx.globalAlpha = opacity; ctx.strokeStyle = COLORS.field; ctx.fillStyle = COLORS.field; ctx.lineWidth = 1.15;
    this.samples.forEach((sample) => {
      if (!sample.vector || !sample.magnitude) return;
      const start = this.toScreen(sample);
      const length = scaledArrowLength(sample.magnitude, reference, Math.min(22, spacing * .5), this.logarithmic);
      const magnitude = sample.magnitude;
      const dx = sample.vector.x / magnitude * length;
      const dy = -sample.vector.y / magnitude * length;
      drawArrow(ctx, start.x - dx / 2, start.y - dy / 2, start.x + dx / 2, start.y + dy / 2, 3.2);
    });
    ctx.restore();
  }

  private drawFieldLines(ctx: CanvasRenderingContext2D, opacity: number) {
    ctx.save(); ctx.globalAlpha = opacity; ctx.strokeStyle = COLORS.field; ctx.fillStyle = COLORS.field; ctx.lineWidth = 1;
    this.fieldLines.forEach((points, lineIndex) => {
      if (points.length < 2) return;
      ctx.beginPath();
      points.forEach((point, index) => { const screen = this.toScreen(point); index ? ctx.lineTo(screen.x, screen.y) : ctx.moveTo(screen.x, screen.y); });
      ctx.stroke();
      const arrowIndex = Math.min(points.length - 2, Math.max(1, Math.floor(points.length * (.43 + (lineIndex % 3) * .06))));
      const a = this.toScreen(points[arrowIndex]); const b = this.toScreen(points[arrowIndex + 1]); drawArrowHead(ctx, a.x, a.y, b.x, b.y, 3.3);
    });
    ctx.restore();
  }

  private drawContours(ctx: CanvasRenderingContext2D) {
    ctx.save(); ctx.lineWidth = 1.35;
    this.contours.forEach(({ level, segments }) => {
      ctx.strokeStyle = level > 0 ? COLORS.contourPositive : COLORS.contourNegative;
      ctx.beginPath();
      segments.forEach(([a, b]) => { const start = this.toScreen(a); const end = this.toScreen(b); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); });
      ctx.stroke();
    });
    ctx.restore();
  }

  private drawTracers(ctx: CanvasRenderingContext2D) {
    ctx.save(); ctx.fillStyle = COLORS.contourPositive; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    this.fieldLines.forEach((points, index) => {
      if (points.length < 4) return;
      const progress = (this.tracerPhase + index * .071) % 1;
      const point = this.toScreen(points[Math.min(points.length - 1, Math.floor(progress * (points.length - 1)))]);
      ctx.beginPath(); ctx.arc(point.x, point.y, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    ctx.restore();
  }

  private drawFlux(ctx: CanvasRenderingContext2D) {
    const curve = ellipsePolyline(this.fluxCenter, 1.45, .9, 72);
    const result = fluxThroughClosedPolyline(curve, (point) => electricFieldAt(point, this.sources).vector);
    ctx.save(); ctx.strokeStyle = COLORS.test; ctx.fillStyle = COLORS.test; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.beginPath();
    curve.forEach((point, index) => { const screen = this.toScreen(point); index ? ctx.lineTo(screen.x, screen.y) : ctx.moveTo(screen.x, screen.y); }); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
    result.samples.filter((_, index) => index % 9 === 0).forEach((sample) => { const start = this.toScreen(sample); drawArrow(ctx, start.x, start.y, start.x + sample.normal.x * 12, start.y - sample.normal.y * 12, 3); });
    const label = this.toScreen({ x: this.fluxCenter.x, y: this.fluxCenter.y - 1.03 }); ctx.font = '10px DM Mono, monospace'; ctx.fillText('∮ E·n dl (2-D)', label.x - 44, label.y);
    ctx.restore();
  }

  private drawCharge(ctx: CanvasRenderingContext2D, source: PointCharge) {
    const screen = this.toScreen(source.position);
    const singularRadius = this.worldLengthToPixels(DEFAULT_SINGULARITY_RADIUS);
    ctx.save();
    ctx.strokeStyle = source.charge > 0 ? COLORS.positive : COLORS.negative; ctx.globalAlpha = .45; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.arc(screen.x, screen.y, Math.max(15, singularRadius), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.fillStyle = source.charge > 0 ? COLORS.positive : COLORS.negative; ctx.beginPath(); ctx.arc(screen.x, screen.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px DM Sans, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(source.charge > 0 ? '+' : '−', screen.x, screen.y - 1);
    ctx.font = '9px DM Mono, monospace'; ctx.fillStyle = COLORS.field; ctx.textBaseline = 'top'; ctx.fillText(`${formatQuantity(source.charge, 'charge', 2)}${source.fixed ? ' · fixed' : ''}`, screen.x, screen.y + 16);
    ctx.restore();
  }

  private drawTestCharge(ctx: CanvasRenderingContext2D) {
    const screen = this.toScreen(this.testCharge.position);
    ctx.save(); ctx.translate(screen.x, screen.y); ctx.strokeStyle = COLORS.test; ctx.fillStyle = 'rgba(255,253,248,.92)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); line(ctx, -5, 0, 5, 0); line(ctx, 0, -5, 0, 5); ctx.restore();
    const evaluation = electricFieldAt(this.testCharge.position, this.sources);
    if (evaluation.vector && evaluation.magnitude) {
      const unitX = evaluation.vector.x / evaluation.magnitude; const unitY = evaluation.vector.y / evaluation.magnitude;
      ctx.save(); ctx.strokeStyle = COLORS.test; ctx.fillStyle = COLORS.test; ctx.lineWidth = 2; drawArrow(ctx, screen.x, screen.y, screen.x + unitX * 35 * Math.sign(this.testCharge.charge), screen.y - unitY * 35 * Math.sign(this.testCharge.charge), 5); ctx.restore();
    }
  }

  private drawVectorSum(ctx: CanvasRenderingContext2D) {
    const evaluation = electricFieldAt(this.testCharge.position, this.sources);
    if (!evaluation.vector || !evaluation.contributions.length) return;
    const width = Math.min(190, this.surface.width * .4); const height = 92; const x = this.surface.width - width - 12; const y = this.surface.height - height - 12;
    const maximum = Math.max(evaluation.magnitude ?? 0, ...evaluation.contributions.map((item) => item.magnitude), 1);
    const scale = Math.min(32 / maximum, width / (evaluation.contributions.length * maximum * 1.1));
    ctx.save(); ctx.fillStyle = 'rgba(255,253,248,.9)'; ctx.strokeStyle = 'rgba(38,50,56,.15)'; roundedRect(ctx, x, y, width, height, 10); ctx.fill(); ctx.stroke(); ctx.font = '9px DM Mono, monospace'; ctx.fillStyle = COLORS.field; ctx.fillText('Σ source vectors → E', x + 9, y + 14);
    let cursor = { x: x + 18, y: y + height * .62 };
    evaluation.contributions.forEach((contribution, index) => {
      const end = { x: cursor.x + contribution.vector.x * scale, y: cursor.y - contribution.vector.y * scale };
      ctx.strokeStyle = index % 2 ? COLORS.negative : COLORS.contourPositive; ctx.fillStyle = ctx.strokeStyle; drawArrow(ctx, cursor.x, cursor.y, end.x, end.y, 4); cursor = end;
    });
    const origin = { x: x + 18, y: y + height * .62 }; ctx.strokeStyle = COLORS.test; ctx.fillStyle = COLORS.test; ctx.lineWidth = 2; drawArrow(ctx, origin.x, origin.y, origin.x + evaluation.vector.x * scale, origin.y - evaluation.vector.y * scale, 5);
    ctx.restore();
  }

  private drawLegend(ctx: CanvasRenderingContext2D) {
    ctx.save(); ctx.font = '9px DM Mono, monospace'; ctx.fillStyle = 'rgba(38,50,56,.7)'; ctx.textAlign = 'left'; ctx.fillText(`${VIEW_LABELS[this.view]} · ${this.logarithmic ? 'log' : 'linear'} arrows`, 12, this.surface.height - 12); ctx.fillText(`Dashed disks: r < ${formatQuantity(DEFAULT_SINGULARITY_RADIUS, 'length')}, undefined`, 12, this.surface.height - 27); ctx.restore();
  }

  private updateReadout() {
    const readoutKey = JSON.stringify([this.view, this.sourcesLocked, this.sources.map((source) => [source.position.x, source.position.y, source.charge]), this.testCharge.position, this.testCharge.charge, this.fluxCenter]);
    if (readoutKey === this.readoutKey) return;
    this.readoutKey = readoutKey;
    const field = electricFieldAt(this.testCharge.position, this.sources);
    const potential = electricPotentialAt(this.testCharge.position, this.sources);
    const force = forceOnTestCharge(this.testCharge, this.sources);
    const energy = potentialEnergy(this.testCharge, this.sources);
    const gradient = negativePotentialGradient(this.testCharge.position, this.sources);
    const gradientError = field.vector && gradient ? relativeVectorError(gradient, field.vector) : null;
    const nearest = Math.min(...this.sources.map((source) => Math.hypot(this.testCharge.position.x - source.position.x, this.testCharge.position.y - source.position.y)));
    const values: Array<[string, string]> = [
      ['Rendering', VIEW_LABELS[this.view]],
      ['Source mobility', this.sourcesLocked ? 'Fixed' : 'Movable'],
      ['Probe position', `(${this.testCharge.position.x.toFixed(2)}, ${this.testCharge.position.y.toFixed(2)}) m`],
      ['E components', field.vector ? `(${field.vector.x.toFixed(2)}, ${field.vector.y.toFixed(2)}) N/C` : 'undefined inside singular disk'],
      ['Field magnitude', field.magnitude === null ? '—' : formatQuantity(field.magnitude, 'electricField')],
      ['Electric potential', potential.value === null ? '—' : formatQuantity(potential.value, 'potential')],
      ['Force on test q', force ? `${formatScientific(Math.hypot(force.x, force.y))} N` : '—'],
      ['Potential energy', energy === null ? '—' : formatQuantity(energy, 'energy')],
      ['E vs. −∇V', gradientError === null ? '—' : `${Math.max(0, 100 * (1 - gradientError)).toFixed(2)}% agreement`],
      ['Nearest source', formatQuantity(nearest, 'length')],
      ['Singularity policy', 'No value inside dashed disks'],
    ];
    if (this.view === 'flux') {
      const flux = fluxThroughClosedPolyline(ellipsePolyline(this.fluxCenter, 1.45, .9, 160), (point) => electricFieldAt(point, this.sources).vector);
      values.splice(2, 0, ['2-D line flux', `${formatScientific(flux.value)} N·m/C`], ['Flux samples', `${flux.evaluatedSegments} valid / ${flux.skippedSegments} skipped`]);
    }
    updateData(this.elements.data, values);
  }

  private updateModelDetails() {
    if (!this.elements?.details) return;
    const explanation = this.view === 'flux'
      ? 'This first PR shows a planar closed-curve diagnostic ∮E·n dl. It is intentionally not labeled as a Gaussian-surface flux; physical 3-D Gaussian surfaces arrive in Atlas PR 2.'
      : 'Every source contribution is evaluated in SI units and added vectorially. The dashed exclusion disk is an undefined singular region, not a capped field value. Contours use marching squares; field lines use normalized midpoint integration.';
    updateDetails(this.elements.details, 'E(r) = (1 / 4πε₀) Σ qᵢ(r−rᵢ)/|r−rᵢ|³    V(r) = (1 / 4πε₀) Σ qᵢ/|r−rᵢ|    E = −∇V', [['qᵢ', 'source charge, stored internally in coulombs'], ['r−rᵢ', 'displacement from source to probe in metres'], ['ε₀', 'vacuum permittivity'], ['r < 0.09 m', 'explicit singular exclusion region']], explanation);
  }

  private updateAnimationState() {
    if (!this.loop) return;
    if (this.view === 'tracers' && !this.paused && !this.loop.reducedMotion) this.loop.start(); else this.loop.pause();
    if (this.view === 'tracers' && this.loop.reducedMotion) announce(this.elements.status, 'Reduced motion is active. The tracer field is shown as a static snapshot.');
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    const screen = this.surface.point(event); const world = this.toWorld(screen);
    const source = this.sources.find((candidate) => distanceScreen(screen, this.toScreen(candidate.position)) < 22);
    if (source?.fixed) { announce(this.elements.status, 'Sources are fixed. Change Source mobility to move them.'); return; }
    if (source) this.dragging = { kind: 'source', id: source.id };
    else if (distanceScreen(screen, this.toScreen(this.testCharge.position)) < 24) this.dragging = { kind: 'test' };
    else if (this.view === 'flux') { this.fluxCenter = world; this.dragging = { kind: 'flux' }; }
    else { this.testCharge.position = this.clampWorld(world); this.dragging = { kind: 'test' }; }
    this.lowResolution = true; this.invalidate(); this.render(); this.elements.canvas.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    if (!this.dragging) return;
    const world = this.clampWorld(this.toWorld(this.surface.point(event)));
    if (this.dragging.kind === 'source') { const source = this.sources.find((candidate) => candidate.id === this.dragging?.id); if (source) source.position = world; }
    if (this.dragging.kind === 'test') this.testCharge.position = world;
    if (this.dragging.kind === 'flux') this.fluxCenter = world;
    this.invalidate(); this.render();
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    if (!this.dragging) return;
    this.dragging = null; this.lowResolution = false; this.invalidate(); this.render();
    if (this.elements.canvas.hasPointerCapture(event.pointerId)) this.elements.canvas.releasePointerCapture(event.pointerId);
    announce(this.elements.status, 'High-precision field recomputed after drag.');
  };

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (!this.elements.stage.contains(document.activeElement)) return;
    if (event.key.toLowerCase() === 'r') this.reset();
    if (event.code === 'Space' && this.view === 'tracers') { event.preventDefault(); this.paused ? this.resume() : this.pause(); }
  };

  private bounds(): FieldBounds {
    const halfWidth = 3.2;
    const halfHeight = halfWidth * this.surface.height / Math.max(1, this.surface.width);
    return { minX: -halfWidth, maxX: halfWidth, minY: -halfHeight, maxY: halfHeight };
  }

  private toScreen(point: Vec2): Point { const bounds = this.bounds(); return { x: (point.x - bounds.minX) / (bounds.maxX - bounds.minX) * this.surface.width, y: (bounds.maxY - point.y) / (bounds.maxY - bounds.minY) * this.surface.height }; }
  private toWorld(point: Point): Vec2 { const bounds = this.bounds(); return { x: bounds.minX + point.x / this.surface.width * (bounds.maxX - bounds.minX), y: bounds.maxY - point.y / this.surface.height * (bounds.maxY - bounds.minY) }; }
  private worldLengthToPixels(length: number) { const bounds = this.bounds(); return length / (bounds.maxX - bounds.minX) * this.surface.width; }
  private clampWorld(point: Vec2) { const bounds = this.bounds(); return { x: clamp(point.x, bounds.minX + .12, bounds.maxX - .12), y: clamp(point.y, bounds.minY + .12, bounds.maxY - .12) }; }
  private invalidate() { this.cacheKey = ''; }
  private syncViewControl() { const input = this.elements.controls.querySelector<HTMLSelectElement>('[data-control="view"]'); if (input) input.value = this.view; this.updateModelDetails(); }
  private persist() { try { localStorage.setItem('physics-playground:electromagnetism-settings', JSON.stringify({ preset: this.preset, view: this.view, logarithmic: this.logarithmic, showContributions: this.showContributions, sourcesLocked: this.sourcesLocked, testPositive: this.testCharge.charge > 0 })); } catch {} }
  private restore() { try { const saved = JSON.parse(localStorage.getItem('physics-playground:electromagnetism-settings') ?? '{}'); this.preset = saved.preset ?? this.preset; this.view = saved.view ?? this.view; this.logarithmic = saved.logarithmic ?? this.logarithmic; this.showContributions = saved.showContributions ?? this.showContributions; this.sourcesLocked = saved.sourcesLocked ?? this.sourcesLocked; this.testCharge.charge = saved.testPositive === false ? -1e-9 : 1e-9; } catch {} }
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, size: number) { line(ctx, x1, y1, x2, y2); drawArrowHead(ctx, x1, y1, x2, y2, size); }
function drawArrowHead(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, size: number) { const angle = Math.atan2(y2 - y1, x2 - x1); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - Math.cos(angle - .55) * size, y2 - Math.sin(angle - .55) * size); ctx.lineTo(x2 - Math.cos(angle + .55) * size, y2 - Math.sin(angle + .55) * size); ctx.closePath(); ctx.fill(); }
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) { ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); }
function distanceScreen(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.y - b.y); }
function magnitudeColor(value: number): [number, number, number] { const t = clamp(value, 0, 1); return mix([245, 241, 232], [239, 141, 120], t); }
function potentialColor(value: number): [number, number, number] { return value >= 0 ? mix([247, 244, 237], [239, 141, 120], value) : mix([247, 244, 237], [88, 132, 161], -value); }
function mix(a: number[], b: number[], t: number): [number, number, number] { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }
