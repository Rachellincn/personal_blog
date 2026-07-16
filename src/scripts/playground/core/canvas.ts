import type { Point } from './types';

export class CanvasSurface {
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  width = 1;
  height = 1;
  dpr = 1;
  private readonly observer: ResizeObserver;
  private readonly onResize?: () => void;

  constructor(canvas: HTMLCanvasElement, onResize?: () => void) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D is unavailable.');
    this.context = context;
    this.onResize = onResize;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas.parentElement ?? canvas);
    this.resize();
  }

  resize() {
    const rect = (this.canvas.parentElement ?? this.canvas).getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(280, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const nextWidth = Math.round(this.width * this.dpr);
    const nextHeight = Math.round(this.height * this.dpr);
    if (this.canvas.width !== nextWidth || this.canvas.height !== nextHeight) {
      this.canvas.width = nextWidth;
      this.canvas.height = nextHeight;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
    }
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.onResize?.();
  }

  point(event: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  clear(color = '#f9f6ef') {
    this.context.save();
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.context.fillStyle = color;
    this.context.fillRect(0, 0, this.width, this.height);
    this.context.restore();
  }

  destroy() { this.observer.disconnect(); }
}
