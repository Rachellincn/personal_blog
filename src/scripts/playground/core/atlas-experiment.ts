import { AnimationLoop } from "./animation-loop";
import { CanvasSurface } from "./canvas";
import { renderAtlas } from "./atlas-renderer";
import type {
  AtlasDefinition,
  AtlasParameters,
  AtlasState,
} from "./atlas-types";
import {
  announce,
  buildActions,
  buildControls,
  updateData,
  updateDetails,
} from "./ui";
import type { Experiment, ExperimentElements, Point } from "./types";

export class AtlasExperiment implements Experiment {
  readonly id: string;
  readonly name: string;
  readonly number: string;
  private readonly definition: AtlasDefinition;
  private elements!: ExperimentElements;
  private surface!: CanvasSurface;
  private loop!: AnimationLoop;
  private parameters: AtlasParameters = {};
  private state: AtlasState = {};
  private history: AtlasState[] = [];
  private paused = true;
  private dragging = false;
  private vectorMode = "auto";
  private vectorLabels = true;
  private showTrails = true;
  private showGuides = true;
  private timeScale = 1;

  constructor(definition: AtlasDefinition) {
    this.definition = definition;
    this.id = definition.id;
    this.name = definition.name;
    this.number = definition.number;
    definition.controls.forEach((control) => {
      this.parameters[control.key] = control.value;
    });
  }
  mount(elements: ExperimentElements) {
    this.elements = elements;
    this.restore();
    this.state = this.definition.createState(this.parameters);
    this.history = [{ ...this.state }];
    this.surface = new CanvasSurface(elements.canvas, () => this.render());
    this.loop = new AnimationLoop({
      element: elements.canvas,
      fixedStep: 1 / 120,
      update: (dt) => this.update(dt * this.timeScale),
      render: () => this.render(),
    });
    this.buildUI();
    updateDetails(
      elements.details,
      this.definition.formula,
      this.definition.symbols,
      this.definition.explanation,
    );
    elements.canvas.addEventListener("pointerdown", this.onPointerDown);
    elements.canvas.addEventListener("pointermove", this.onPointerMove);
    elements.canvas.addEventListener("pointerup", this.onPointerUp);
    elements.canvas.addEventListener("pointercancel", this.onPointerUp);
    document.addEventListener("keydown", this.onKeyDown);
    this.render();
    if (this.loop.reducedMotion)
      announce(
        elements.status,
        "Reduced motion is active. Use Step to advance the model.",
      );
    else this.resume();
  }
  pause() {
    this.paused = true;
    this.loop.pause();
    announce(this.elements.status, `${this.name} paused.`);
  }
  resume() {
    this.paused = false;
    this.loop.start();
    announce(this.elements.status, `${this.name} running.`);
  }
  reset() {
    this.state = this.definition.createState(this.parameters);
    this.history = [{ ...this.state }];
    this.render();
    announce(this.elements.status, `${this.name} reset.`);
  }
  destroy() {
    this.loop.destroy();
    this.surface.destroy();
    this.elements.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.elements.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.elements.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.elements.canvas.removeEventListener("pointercancel", this.onPointerUp);
    document.removeEventListener("keydown", this.onKeyDown);
  }
  private update(dt: number) {
    if (this.paused) return;
    this.state = finiteState(
      this.definition.step(this.state, this.parameters, dt),
      this.definition.createState(this.parameters),
    );
    if (
      Math.floor((this.state.t ?? 0) * 30) >
      Math.floor((this.history.at(-1)?.t ?? 0) * 30)
    ) {
      this.history.push({ ...this.state });
      if (this.history.length > 720) this.history.shift();
    }
  }
  private render() {
    if (!this.surface) return;
    this.surface.clear("#fbf8f1");
    const scene = this.definition.scene(
      this.state,
      this.parameters,
      this.history,
    );
    renderAtlas(
      this.surface.context,
      this.surface.width,
      this.surface.height,
      scene,
      {
        vectors: this.vectorMode,
        labels: this.vectorLabels,
        trails: this.showTrails,
        guides: this.showGuides,
      },
    );
    updateData(this.elements.data, [
      ["Time", `${(this.state.t ?? 0).toFixed(2)} s`],
      ...this.definition.data(this.state, this.parameters),
    ]);
  }
  private buildUI() {
    buildControls(
      this.elements.controls,
      [
        {
          key: "preset",
          label: "Typical preset",
          type: "select",
          value: this.definition.presets[0]?.id ?? "",
          options: this.definition.presets.map((preset) => [
            preset.id,
            preset.label,
          ]),
        },
        ...this.definition.controls.map((control) => ({
          ...control,
          value: this.parameters[control.key],
        })),
        {
          key: "vectorMode",
          label: "Vector scaling",
          type: "select",
          value: this.vectorMode,
          options: [
            ["auto", "Auto scale"],
            ["fixed", "Fixed physical scale"],
            ["hide", "Hide vectors"],
          ],
        },
        {
          key: "vectorLabels",
          label: "Vector values",
          type: "checkbox",
          value: this.vectorLabels,
        },
        {
          key: "trails",
          label: "Trajectories / curves",
          type: "checkbox",
          value: this.showTrails,
        },
        {
          key: "guides",
          label: "Guides / axes",
          type: "checkbox",
          value: this.showGuides,
        },
        {
          key: "timeScale",
          label: "Time scale",
          type: "range",
          value: this.timeScale,
          min: 0.1,
          max: 3,
          step: 0.1,
          unit: "×",
        },
      ],
      (key, value) => {
        if (key === "preset") {
          const preset = this.definition.presets.find(
            (candidate) => candidate.id === value,
          );
          if (preset) {
            Object.assign(this.parameters, preset.parameters);
            this.buildUI();
            this.reset();
          }
          return;
        }
        if (key === "vectorMode") this.vectorMode = String(value);
        else if (key === "vectorLabels") this.vectorLabels = Boolean(value);
        else if (key === "trails") this.showTrails = Boolean(value);
        else if (key === "guides") this.showGuides = Boolean(value);
        else if (key === "timeScale") this.timeScale = Number(value);
        else this.parameters[key] = value;
        this.persist();
        this.reset();
      },
    );
    buildActions(
      this.elements.actions,
      [
        { label: "Pause / Continue", action: "pause", primary: true },
        { label: "Step", action: "step" },
        { label: "Reset", action: "reset" },
      ],
      (action) => {
        if (action === "pause") this.paused ? this.resume() : this.pause();
        if (action === "step") {
          this.pause();
          this.state = this.definition.step(
            this.state,
            this.parameters,
            1 / 60,
          );
          this.history.push({ ...this.state });
          this.render();
          announce(this.elements.status, `Advanced one 1/60 s step.`);
        }
        if (action === "reset") this.reset();
      },
    );
  }
  private readonly onPointerDown = (event: PointerEvent) => {
    this.dragging = true;
    this.elements.canvas.setPointerCapture(event.pointerId);
    this.interact(this.surface.point(event));
  };
  private readonly onPointerMove = (event: PointerEvent) => {
    if (this.dragging) this.interact(this.surface.point(event));
  };
  private readonly onPointerUp = (event: PointerEvent) => {
    this.dragging = false;
    if (this.elements.canvas.hasPointerCapture(event.pointerId))
      this.elements.canvas.releasePointerCapture(event.pointerId);
  };
  private interact(point: Point) {
    if (this.definition.stateAt && point.x > this.surface.width * 0.55) {
      const time = Math.max(
        0,
        Math.min(
          this.definition.duration ?? 10,
          ((point.x - this.surface.width * 0.55) /
            (this.surface.width * 0.45)) *
            (this.definition.duration ?? 10),
        ),
      );
      this.state = this.definition.stateAt(time, this.parameters);
      this.pause();
      announce(
        this.elements.status,
        `Shared graph cursor: t = ${time.toFixed(2)} s.`,
      );
    } else if (this.definition.drag) {
      const normalized = {
        x: (point.x / this.surface.width) * 2 - 1,
        y: 1 - (point.y / this.surface.height) * 2,
      };
      this.state = this.definition.drag(
        normalized,
        this.state,
        this.parameters,
      );
      this.pause();
    }
    this.render();
  }
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (!this.elements.stage.contains(document.activeElement)) return;
    if (event.code === "Space") {
      event.preventDefault();
      this.paused ? this.resume() : this.pause();
    }
    if (event.key === ".") {
      this.pause();
      this.state = this.definition.step(this.state, this.parameters, 1 / 60);
      this.render();
    }
    if (event.key.toLowerCase() === "r") this.reset();
  };
  private persist() {
    localStorage.setItem(
      `physics-playground:${this.id}`,
      JSON.stringify({
        parameters: this.parameters,
        vectorMode: this.vectorMode,
        vectorLabels: this.vectorLabels,
        showTrails: this.showTrails,
        showGuides: this.showGuides,
        timeScale: this.timeScale,
      }),
    );
  }
  private restore() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(`physics-playground:${this.id}`) ?? "{}",
      );
      Object.assign(this.parameters, saved.parameters ?? {});
      this.vectorMode = saved.vectorMode ?? this.vectorMode;
      this.vectorLabels = saved.vectorLabels ?? this.vectorLabels;
      this.showTrails = saved.showTrails ?? this.showTrails;
      this.showGuides = saved.showGuides ?? this.showGuides;
      this.timeScale = saved.timeScale ?? this.timeScale;
    } catch {}
  }
}

function finiteState(state: AtlasState, fallback: AtlasState) {
  return Object.fromEntries(
    Object.entries(state).map(([key, value]) => [
      key,
      Number.isFinite(value) ? value : (fallback[key] ?? 0),
    ]),
  );
}
