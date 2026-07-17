import type { AtlasDefinition, AtlasParameters } from "../core/atlas-types";
import {
  classifyEquilibrium,
  energyStep,
  stableDerivative,
} from "../models/energy";
import { evaluateExpression } from "../models/expression";

function potential(parameters: AtlasParameters) {
  const mode = String(parameters.potential);
  if (mode === "spring")
    return (x: number) => 0.5 * Number(parameters.k) * x ** 2;
  if (mode === "double")
    return (x: number) => Number(parameters.k) * (x ** 2 - 1) ** 2;
  if (mode === "gravity") return (x: number) => Number(parameters.k) * x;
  return (x: number) =>
    evaluateExpression(String(parameters.expression), { x }, 0);
}

export const workEnergy: AtlasDefinition = {
  id: "mechanics-work-energy",
  name: "功—能定理 / Work–energy",
  number: "ATLAS I · 07",
  category: "Classical Mechanics · Atlas I",
  formula: "W = ∫F(x)dx = ΔK;  F(x) = −dU/dx;  E = K + U + Ediss",
  symbols: [
    ["U(x)", "editable potential family"],
    ["K", "kinetic energy"],
    ["W", "signed area below F–x"],
    ["Ediss", "energy dissipated by friction"],
  ],
  explanation:
    "A stable five-point numerical derivative generates force from the potential without amplifying small sampling noise. The potential panel marks equilibria, turning points and classically forbidden regions where U exceeds the current mechanical energy.",
  controls: [
    {
      key: "potential",
      label: "Potential U(x)",
      type: "select",
      value: "spring",
      options: [
        ["spring", "Spring ½kx²"],
        ["gravity", "Linear gravity"],
        ["double", "Double well"],
        ["custom", "Quartic custom family"],
      ],
    },
    {
      key: "mass",
      label: "Mass",
      type: "range",
      value: 1,
      min: 0.2,
      max: 5,
      step: 0.1,
      unit: "kg",
    },
    {
      key: "k",
      label: "Potential scale",
      type: "range",
      value: 2,
      min: 0.1,
      max: 8,
      step: 0.1,
    },
    {
      key: "bias",
      label: "Quadratic bias",
      type: "range",
      value: 2,
      min: -4,
      max: 6,
      step: 0.1,
    },
    {
      key: "expression",
      label: "Editable U(x)",
      type: "text",
      value: "0.5*x^4-1.2*x^2",
    },
    {
      key: "friction",
      label: "Friction dissipation",
      type: "range",
      value: 0,
      min: 0,
      max: 1.5,
      step: 0.05,
      unit: "N",
    },
    {
      key: "x0",
      label: "Initial x",
      type: "range",
      value: 2,
      min: -3,
      max: 3,
      step: 0.1,
      unit: "m",
    },
    {
      key: "v0",
      label: "Initial v",
      type: "range",
      value: 0,
      min: -4,
      max: 4,
      step: 0.1,
      unit: "m/s",
    },
  ],
  presets: [
    {
      id: "spring",
      label: "Frictionless spring",
      parameters: { potential: "spring", friction: 0, x0: 2, v0: 0 },
    },
    {
      id: "damped",
      label: "Frictional track",
      parameters: { potential: "double", friction: 0.35, x0: 1.8 },
    },
    {
      id: "barrier",
      label: "Quartic barrier",
      parameters: {
        potential: "custom",
        expression: "0.5*x^4-1.25*x^2",
        x0: 1.7,
        v0: 1,
      },
    },
  ],
  createState: (parameters) => {
    const fn = potential(parameters);
    return {
      t: 0,
      x: Number(parameters.x0),
      v: Number(parameters.v0),
      dissipated: 0,
      initialEnergy:
        0.5 * Number(parameters.mass) * Number(parameters.v0) ** 2 +
        fn(Number(parameters.x0)),
    };
  },
  step: (state, parameters, dt) => {
    const result = energyStep(
      { x: state.x, v: state.v },
      dt,
      Number(parameters.mass),
      potential(parameters),
      Number(parameters.friction),
    );
    const dissipated =
      state.dissipated + Number(parameters.friction) * Math.abs(result.v * dt);
    return {
      ...state,
      t: state.t + dt,
      x: result.x,
      v: result.v,
      force: result.force,
      kinetic: result.kinetic,
      potential: result.potential,
      dissipated,
    };
  },
  scene: (state, parameters) => {
    const fn = potential(parameters);
    const points = Array.from({ length: 121 }, (_, index) => -3 + index * 0.05);
    const potentialPoints = points.map((x) => ({ x, y: fn(x) }));
    const forcePoints = points.map((x) => ({ x, y: -stableDerivative(fn, x) }));
    const kinetic = 0.5 * Number(parameters.mass) * state.v ** 2;
    const potentialEnergy = fn(state.x);
    const total = kinetic + potentialEnergy;
    const equilibria = points.filter(
      (x) =>
        classifyEquilibrium(fn, x).equilibrium &&
        Math.abs(x * 20 - Math.round(x * 20)) < 1e-6,
    );
    return {
      bounds: { xMin: -3.2, xMax: 3.2, yMin: -1, yMax: 1 },
      bodies: [
        { x: state.x, y: 0, radius: 0.22, label: `x=${state.x.toFixed(2)} m` },
      ],
      vectors: [
        {
          x: state.x,
          y: 0.15,
          dx: -stableDerivative(fn, state.x),
          dy: 0,
          label: "F=−dU/dx",
          value: `${(-stableDerivative(fn, state.x)).toFixed(2)} N`,
          kind: "force",
        },
      ],
      constraints: [
        {
          from: { x: -3.2, y: 0 },
          to: { x: 3.2, y: 0 },
          label: "one-dimensional track",
        },
      ],
      annotations: equilibria
        .slice(0, 6)
        .map((x) => ({
          x,
          y: 0.6,
          text: classifyEquilibrium(fn, x).stable
            ? "stable eq."
            : "unstable eq.",
        })),
      energy: [
        { label: "K", value: kinetic },
        { label: "U", value: Math.max(0, potentialEnergy) },
        { label: "diss.", value: state.dissipated },
      ],
      plots: [
        {
          title: "U(x) · line is current E",
          series: [
            { label: "U", points: potentialPoints },
            {
              label: "E",
              kind: "theory",
              points: [
                { x: -3, y: total },
                { x: 3, y: total },
              ],
            },
          ],
        },
        {
          title: "F(x) · area is work",
          interval: [
            Math.min(Number(parameters.x0), state.x),
            Math.max(Number(parameters.x0), state.x),
          ],
          series: [{ label: "F", points: forcePoints, kind: "area" }],
        },
      ],
    };
  },
  data: (state, parameters) => {
    const fn = potential(parameters);
    const kinetic = 0.5 * Number(parameters.mass) * state.v ** 2;
    const potentialEnergy = fn(state.x);
    return [
      ["Kinetic energy", `${kinetic.toFixed(4)} J`],
      ["Potential energy", `${potentialEnergy.toFixed(4)} J`],
      ["Mechanical energy", `${(kinetic + potentialEnergy).toFixed(4)} J`],
      ["Dissipated energy", `${state.dissipated.toFixed(4)} J`],
      [
        "Energy-accounting error",
        `${Math.abs(state.initialEnergy - kinetic - potentialEnergy - state.dissipated).toExponential(2)} J`,
      ],
    ];
  },
  drag: (point, state, parameters) => ({
    ...state,
    x: point.x * 3,
    v: 0,
    t: 0,
    dissipated: 0,
    initialEnergy: potential(parameters)(point.x * 3),
  }),
};
