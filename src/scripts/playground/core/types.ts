export type DataValue = string | number;

export interface ExperimentElements {
  canvas: HTMLCanvasElement;
  controls: HTMLElement;
  actions: HTMLElement;
  data: HTMLElement;
  status: HTMLElement;
  stage: HTMLElement;
  details: HTMLElement;
}

export interface Experiment {
  readonly id: string;
  readonly name: string;
  readonly number: string;
  mount(elements: ExperimentElements): void;
  pause(): void;
  resume(): void;
  reset(): void;
  destroy(): void;
}

export interface Point { x: number; y: number }
