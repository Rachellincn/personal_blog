import { AnimationLoop } from '../core/animation-loop';
import { CanvasSurface } from '../core/canvas';
import { clamp } from '../core/math';
import { announce, buildActions, buildControls, updateData } from '../core/ui';
import type { Experiment, ExperimentElements, Point } from '../core/types';

export default class WaveLabExperiment implements Experiment {
  readonly id = 'wave';
  readonly name = 'Wave & interference lab';
  readonly number = 'EXPERIMENT 03';
  private elements!: ExperimentElements;
  private surface!: CanvasSurface;
  private loop!: AnimationLoop;
  private sourceMode = 'double'; private phase = 0; private frequency = 1.25; private wavelength = 82; private amplitude = 1; private decay = .0015; private displayMode = 'displacement';
  private sources: Point[] = [{ x: .38, y: .5 }, { x: .62, y: .5 }]; private sourceToMove = 0;
  private time = 0; private paused = false; private lastRender = 0;
  private buffer = document.createElement('canvas'); private bufferContext = this.buffer.getContext('2d')!;

  mount(elements: ExperimentElements) {
    this.elements = elements; this.restore();
    this.surface = new CanvasSurface(elements.canvas, () => { this.lastRender = 0; this.render(true); });
    this.loop = new AnimationLoop({ element: elements.canvas, fixedStep: 1 / 60, update: (dt) => { if (!this.paused) this.time += dt; }, render: () => this.render() });
    this.buildUI(); elements.canvas.addEventListener('pointerdown', this.onPointerDown); document.addEventListener('keydown', this.onKeyDown);
    this.updateReadout(); this.render(true);
    if (this.loop.reducedMotion) { this.paused = true; announce(elements.status, 'Reduced motion is active. Use Step to advance the field.'); } else this.loop.start();
  }
  pause() { this.paused = true; this.loop.pause(); announce(this.elements.status, 'Wave field paused.'); }
  resume() { this.paused = false; this.loop.start(); announce(this.elements.status, 'Wave field running.'); }
  reset() { this.time = 0; this.sources = [{ x: .38, y: .5 }, { x: .62, y: .5 }]; this.sourceToMove = 0; this.lastRender = 0; this.render(true); this.updateReadout(); announce(this.elements.status, 'Wave sources reset.'); }
  destroy() { this.loop.destroy(); this.surface.destroy(); this.elements.canvas.removeEventListener('pointerdown', this.onPointerDown); document.removeEventListener('keydown', this.onKeyDown); }

  private buildUI() {
    buildControls(this.elements.controls, [
      { key: 'sources', label: 'Wave sources', type: 'select', value: this.sourceMode, options: [['single', 'Single source'], ['double', 'Double source']] },
      { key: 'phase', label: 'Phase difference', type: 'range', value: this.phase, min: 0, max: 360, step: 5, unit: '°' },
      { key: 'frequency', label: 'Frequency', type: 'range', value: this.frequency, min: .25, max: 3, step: .05, unit: 'Hz' },
      { key: 'wavelength', label: 'Wavelength', type: 'range', value: this.wavelength, min: 30, max: 160, step: 2, unit: 'px' },
      { key: 'amplitude', label: 'Amplitude', type: 'range', value: this.amplitude, min: .2, max: 2, step: .1 },
      { key: 'decay', label: 'Radial damping', type: 'range', value: this.decay, min: 0, max: .008, step: .0005 },
      { key: 'display', label: 'Display mode', type: 'select', value: this.displayMode, options: [['displacement', 'Displacement field'], ['intensity', 'Intensity field'], ['phase', 'Equal-phase lines']] },
    ], (key, value) => {
      if (key === 'sources') this.sourceMode = String(value); if (key === 'phase') this.phase = Number(value); if (key === 'frequency') this.frequency = Number(value); if (key === 'wavelength') this.wavelength = Number(value); if (key === 'amplitude') this.amplitude = Number(value); if (key === 'decay') this.decay = Number(value); if (key === 'display') this.displayMode = String(value);
      this.persist(); this.lastRender = 0; this.updateReadout(); this.render(true);
    });
    buildActions(this.elements.actions, [{ label: 'Pause / Resume', action: 'pause', primary: true }, { label: 'Step', action: 'step' }, { label: 'Reset sources', action: 'reset' }], (action) => {
      if (action === 'pause') this.paused ? this.resume() : this.pause();
      if (action === 'step') { this.pause(); this.time += 1 / 30; this.lastRender = 0; this.render(true); this.updateReadout(); announce(this.elements.status, `Advanced to ${this.time.toFixed(2)} seconds.`); }
      if (action === 'reset') this.reset();
    });
  }

  private render(force = false) {
    if (!this.surface) return;
    const now = performance.now(); const mobile = this.surface.width < 620 || (navigator.hardwareConcurrency ?? 8) <= 4;
    const interval = mobile ? 50 : 32;
    if (!force && now - this.lastRender < interval) return;
    this.lastRender = now;
    const columns = mobile ? 112 : 210; const rows = Math.max(64, Math.round(columns * this.surface.height / this.surface.width));
    if (this.buffer.width !== columns || this.buffer.height !== rows) { this.buffer.width = columns; this.buffer.height = rows; }
    const image = this.bufferContext.createImageData(columns, rows); const phaseOffset = this.phase * Math.PI / 180; const omega = 2 * Math.PI * this.frequency; const k = 2 * Math.PI / this.wavelength;
    const active = this.sourceMode === 'single' ? [this.sources[0]] : this.sources;
    for (let y = 0; y < rows; y += 1) for (let x = 0; x < columns; x += 1) {
      const px = x / (columns - 1) * this.surface.width; const py = y / (rows - 1) * this.surface.height;
      let displacement = 0; let real = 0; let imaginary = 0;
      active.forEach((source, index) => {
        const distance = Math.hypot(px - source.x * this.surface.width, py - source.y * this.surface.height);
        const damping = this.amplitude * Math.exp(-this.decay * distance); const sourcePhase = index === 1 ? phaseOffset : 0; const spatial = k * distance + sourcePhase;
        displacement += damping * Math.sin(spatial - omega * this.time); real += damping * Math.cos(spatial); imaginary += damping * Math.sin(spatial);
      });
      const intensity = real * real + imaginary * imaginary; const phaseValue = Math.atan2(imaginary, real);
      const color = this.displayMode === 'intensity' ? intensityColor(intensity / Math.max(.01, active.length ** 2 * this.amplitude ** 2)) : this.displayMode === 'phase' ? phaseColor(phaseValue) : displacementColor(displacement / Math.max(.01, active.length * this.amplitude));
      const offset = (y * columns + x) * 4; image.data[offset] = color[0]; image.data[offset + 1] = color[1]; image.data[offset + 2] = color[2]; image.data[offset + 3] = 255;
    }
    this.bufferContext.putImageData(image, 0, 0);
    const ctx = this.surface.context; this.surface.clear('#fbf8f1'); ctx.imageSmoothingEnabled = true; ctx.drawImage(this.buffer, 0, 0, this.surface.width, this.surface.height);
    active.forEach((source, index) => this.drawSource(ctx, source, index));
    this.updateReadout();
  }

  private drawSource(ctx: CanvasRenderingContext2D, source: Point, index: number) {
    const x = source.x * this.surface.width; const y = source.y * this.surface.height; ctx.save(); ctx.translate(x, y); ctx.fillStyle = index ? '#a795c8' : '#ef8d78'; ctx.strokeStyle = '#fffdf8'; ctx.lineWidth = 3;
    if (index) { ctx.rotate(Math.PI / 4); ctx.fillRect(-8, -8, 16, 16); ctx.strokeRect(-8, -8, 16, 16); } else { ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }

  private updateReadout() { updateData(this.elements.data, [['Simulation time', `${this.time.toFixed(2)} s`], ['Source mode', this.sourceMode === 'double' ? 'Double source' : 'Single source'], ['Phase difference', `${this.phase}°`], ['Frequency', `${this.frequency.toFixed(2)} Hz`], ['Wavelength', `${this.wavelength} px`], ['Display', this.displayMode], ['Formula', 'u = ΣA sin(kr − ωt + φ)e⁻ᵅʳ']]); }
  private readonly onPointerDown = (event: PointerEvent) => { const point = this.surface.point(event); const count = this.sourceMode === 'single' ? 1 : 2; const index = this.sourceToMove % count; this.sources[index] = { x: clamp(point.x / this.surface.width, .04, .96), y: clamp(point.y / this.surface.height, .06, .94) }; this.sourceToMove = (index + 1) % count; this.lastRender = 0; this.render(true); announce(this.elements.status, `Moved source ${index + 1}. Tap again to move the ${count > 1 ? 'other source' : 'source'}.`); };
  private readonly onKeyDown = (event: KeyboardEvent) => { if (!this.elements.stage.contains(document.activeElement)) return; if (event.code === 'Space') { event.preventDefault(); this.paused ? this.resume() : this.pause(); } if (event.key === '.') { this.pause(); this.time += 1 / 30; this.render(true); } if (event.key.toLowerCase() === 'r') this.reset(); };
  private restore() { try { const saved = JSON.parse(localStorage.getItem('physics-playground:wave-settings') ?? '{}'); Object.assign(this, { sourceMode: saved.sourceMode ?? this.sourceMode, phase: saved.phase ?? this.phase, frequency: saved.frequency ?? this.frequency, wavelength: saved.wavelength ?? this.wavelength, amplitude: saved.amplitude ?? this.amplitude, decay: saved.decay ?? this.decay, displayMode: saved.displayMode ?? this.displayMode }); } catch {} }
  private persist() { localStorage.setItem('physics-playground:wave-settings', JSON.stringify({ sourceMode: this.sourceMode, phase: this.phase, frequency: this.frequency, wavelength: this.wavelength, amplitude: this.amplitude, decay: this.decay, displayMode: this.displayMode })); }
}

function displacementColor(value: number): [number, number, number] { const v = clamp(value, -1, 1); return v >= 0 ? mix([247,244,237], [239,141,120], v) : mix([247,244,237], [49,91,115], -v); }
function intensityColor(value: number): [number, number, number] { const v = clamp(Math.sqrt(value), 0, 1); return v < .5 ? mix([38,50,56], [123,167,199], v * 2) : mix([123,167,199], [248,216,206], (v - .5) * 2); }
function phaseColor(value: number): [number, number, number] { const band = Math.abs(Math.sin(value * 4)); return band > .82 ? [38,50,56] : mix([232,224,242], [220,235,242], (value + Math.PI) / (2 * Math.PI)); }
function mix(a: number[], b: number[], t: number): [number, number, number] { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }
