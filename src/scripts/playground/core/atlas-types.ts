import type { ControlDefinition } from "./ui";
import type { Point, Vector } from "./types";

export type AtlasState = Record<string, number>;
export type AtlasParameters = Record<string, number | boolean | string>;

export interface AtlasBody extends Point {
  radius?: number;
  label: string;
  mass?: number;
  shape?: "circle" | "square" | "ring";
}

export interface AtlasCurve {
  points: Point[];
  label: string;
  kind?: "theory" | "numeric" | "trajectory" | "constraint";
}

export interface AtlasPlot {
  title: string;
  xLabel?: string;
  yLabel?: string;
  cursor?: number;
  interval?: [number, number];
  series: Array<{
    label: string;
    points: Point[];
    kind?: "theory" | "numeric" | "area";
  }>;
}

export interface AtlasScene {
  bounds?: { xMin: number; xMax: number; yMin: number; yMax: number };
  bodies: AtlasBody[];
  vectors?: Vector[];
  curves?: AtlasCurve[];
  constraints?: Array<{ from: Point; to: Point; label?: string }>;
  plots?: AtlasPlot[];
  annotations?: Array<{ x: number; y: number; text: string }>;
  energy?: Array<{ label: string; value: number }>;
}

export interface AtlasPreset {
  id: string;
  label: string;
  parameters: Partial<AtlasParameters>;
}

export interface AtlasDefinition {
  id: string;
  name: string;
  number: string;
  category: string;
  formula: string;
  symbols: Array<[string, string]>;
  explanation: string;
  controls: ControlDefinition[];
  presets: AtlasPreset[];
  duration?: number;
  createState: (parameters: AtlasParameters) => AtlasState;
  step: (
    state: AtlasState,
    parameters: AtlasParameters,
    dt: number,
  ) => AtlasState;
  scene: (
    state: AtlasState,
    parameters: AtlasParameters,
    history: AtlasState[],
  ) => AtlasScene;
  data: (
    state: AtlasState,
    parameters: AtlasParameters,
  ) => Array<[string, string | number]>;
  stateAt?: (time: number, parameters: AtlasParameters) => AtlasState;
  drag?: (
    point: Point,
    state: AtlasState,
    parameters: AtlasParameters,
  ) => AtlasState;
}
