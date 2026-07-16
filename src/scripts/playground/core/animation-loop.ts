interface AnimationLoopOptions {
  update: (dt: number) => void;
  render: (alpha: number) => void;
  fixedStep?: number;
  maxFrame?: number;
  element: Element;
}

export class AnimationLoop {
  private readonly updateFn: (dt: number) => void;
  private readonly renderFn: (alpha: number) => void;
  private readonly fixedStep: number;
  private readonly maxFrame: number;
  private frame = 0;
  private last = 0;
  private accumulator = 0;
  private requested = false;
  private visible = true;
  private destroyed = false;
  private readonly observer: IntersectionObserver;
  readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(options: AnimationLoopOptions) {
    this.updateFn = options.update;
    this.renderFn = options.render;
    this.fixedStep = options.fixedStep ?? 1 / 120;
    this.maxFrame = options.maxFrame ?? .05;
    this.observer = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.shouldRun()) this.schedule(); else this.cancel();
    }, { threshold: 0.01 });
    this.observer.observe(options.element);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  start() {
    if (this.destroyed) return;
    this.requested = true;
    this.last = performance.now();
    this.schedule();
  }

  pause() {
    this.requested = false;
    this.cancel();
  }

  renderOnce() { if (!this.destroyed) this.renderFn(0); }

  destroy() {
    this.destroyed = true;
    this.pause();
    this.observer.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  private readonly onVisibility = () => {
    this.last = performance.now();
    if (this.shouldRun()) this.schedule(); else this.cancel();
  };

  private shouldRun() { return this.requested && this.visible && !document.hidden && !this.destroyed; }
  private schedule() { if (!this.frame && this.shouldRun()) this.frame = requestAnimationFrame(this.tick); }
  private cancel() { if (this.frame) cancelAnimationFrame(this.frame); this.frame = 0; }

  private readonly tick = (now: number) => {
    this.frame = 0;
    if (!this.shouldRun()) return;
    const elapsed = Math.min(this.maxFrame, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.accumulator += elapsed;
    let steps = 0;
    while (this.accumulator >= this.fixedStep && steps < 12) {
      this.updateFn(this.fixedStep);
      this.accumulator -= this.fixedStep;
      steps += 1;
    }
    if (steps === 12) this.accumulator = 0;
    this.renderFn(this.accumulator / this.fixedStep);
    this.schedule();
  };
}
