import type {
  AtlasDefinition,
  AtlasParameters,
  AtlasState,
} from "../core/atlas-types";
import type { Vector } from "../core/types";
import {
  circularMotion,
  circularMotionState,
  constantAcceleration,
  parseAccelerationProgram,
  piecewiseMotion,
  projectileAnalytic,
  projectileStep,
} from "../models/kinematics";
import { evaluateExpression } from "../models/expression";

function circularSample(time: number, parameters: AtlasParameters) {
  const radius = Number(parameters.radius);
  if (String(parameters.omegaMode) !== "custom") {
    return circularMotion(time, radius, Number(parameters.omega), Number(parameters.alpha));
  }
  const expression = String(parameters.omegaFunction);
  const step = 1 / 180;
  let theta = 0;
  let elapsed = 0;
  let previousOmega = evaluateExpression(expression, { t: 0 }, Number(parameters.omega));
  while (elapsed < time) {
    const width = Math.min(step, time - elapsed);
    const nextOmega = evaluateExpression(expression, { t: elapsed + width }, previousOmega);
    theta += 0.5 * (previousOmega + nextOmega) * width;
    previousOmega = nextOmega;
    elapsed += width;
  }
  const omega = evaluateExpression(expression, { t: time }, previousOmega);
  const epsilon = 1 / 1000;
  const alpha = (evaluateExpression(expression, { t: time + epsilon }, omega) - evaluateExpression(expression, { t: Math.max(0, time - epsilon) }, omega)) / (time < epsilon ? epsilon : 2 * epsilon);
  return circularMotionState(radius, theta, omega, alpha);
}

function motionAt(time: number, parameters: AtlasParameters) {
  const mode = String(parameters.motion);
  const x0 = Number(parameters.x0);
  const v0 = Number(parameters.v0);
  const acceleration = Number(parameters.acceleration);
  if (mode === "rest") return constantAcceleration(time, x0, 0, 0);
  if (mode === "uniform") return constantAcceleration(time, x0, v0, 0);
  if (mode === "accelerate-cruise")
    return piecewiseMotion(time, x0, v0, [
      { until: 3, acceleration },
      { until: 10, acceleration: 0 },
    ]);
  if (mode === "piecewise")
    return piecewiseMotion(
      time,
      x0,
      v0,
      parseAccelerationProgram(String(parameters.program)),
    );
  if (mode === "shm") {
    const omega = Math.max(0.1, Math.abs(acceleration));
    return {
      t: time,
      x: x0 + 4 * Math.cos(omega * time),
      v: -4 * omega * Math.sin(omega * time),
      a: -4 * omega ** 2 * Math.cos(omega * time),
    };
  }
  return constantAcceleration(time, x0, v0, acceleration);
}

export const kinematics1D: AtlasDefinition = {
  id: "mechanics-kinematics-1d",
  name: "一维运动学联动图 / Linked kinematics",
  number: "ATLAS I · 01",
  category: "Classical Mechanics · Atlas I",
  duration: 10,
  formula: "v = dx/dt,  a = dv/dt,  Δx = ∫v dt,  Δv = ∫a dt",
  symbols: [
    ["x", "position / 位置"],
    ["v", "velocity, the slope of x(t)"],
    ["a", "acceleration, the slope of v(t)"],
    ["t", "shared time cursor"],
  ],
  explanation:
    "The motion and all three graphs share one clock. Drag within any graph to scrub time. Curves are sampled piecewise: acceleration corners remain corners instead of being visually smoothed across a derivative discontinuity. The shaded interval shows the signed area that gives displacement or velocity change.",
  controls: [
    {
      key: "motion",
      label: "Motion model",
      type: "select",
      value: "constant",
      options: [
        ["rest", "静止"],
        ["uniform", "匀速"],
        ["constant", "匀加速"],
        ["accelerate-cruise", "先加速后匀速"],
        ["piecewise", "分段加速度"],
        ["shm", "简谐运动"],
      ],
    },
    {
      key: "x0",
      label: "Initial position",
      type: "range",
      value: 0,
      min: -5,
      max: 5,
      step: 0.5,
      unit: "m",
    },
    {
      key: "v0",
      label: "Initial velocity",
      type: "range",
      value: 1,
      min: -5,
      max: 8,
      step: 0.25,
      unit: "m/s",
    },
    {
      key: "acceleration",
      label: "Acceleration / ω",
      type: "range",
      value: 1,
      min: -4,
      max: 4,
      step: 0.1,
      unit: "m/s²",
    },
    {
      key: "program",
      label: "until:a segments",
      type: "text",
      value: "2:2, 5:-1, 10:0",
    },
    {
      key: "intervalStart",
      label: "Area interval start",
      type: "range",
      value: 1,
      min: 0,
      max: 10,
      step: 0.1,
      unit: "s",
    },
    {
      key: "intervalEnd",
      label: "Area interval end",
      type: "range",
      value: 4,
      min: 0,
      max: 10,
      step: 0.1,
      unit: "s",
    },
  ],
  presets: [
    {
      id: "accelerated",
      label: "匀加速",
      parameters: { motion: "constant", x0: 0, v0: 1, acceleration: 1 },
    },
    {
      id: "segments",
      label: "分段加速度",
      parameters: { motion: "piecewise", program: "2:2, 5:-1, 10:0" },
    },
    {
      id: "shm",
      label: "简谐运动",
      parameters: { motion: "shm", acceleration: 1.2 },
    },
  ],
  createState: (parameters) => ({ ...motionAt(0, parameters) }),
  stateAt: (time, parameters) => ({ ...motionAt(time, parameters) }),
  step: (state, parameters, dt) => ({
    ...motionAt(((state.t ?? 0) + dt) % 10, parameters),
  }),
  scene: (state, parameters) => {
    const samples = Array.from({ length: 121 }, (_, index) =>
      motionAt(index / 12, parameters),
    );
    const cursor = state.t ?? 0;
    const interval: [number, number] = [
      Math.min(Number(parameters.intervalStart), Number(parameters.intervalEnd)),
      Math.max(Number(parameters.intervalStart), Number(parameters.intervalEnd)),
    ];
    return {
      bounds: { xMin: -6, xMax: 16, yMin: -1, yMax: 1 },
      bodies: [
        { x: state.x, y: 0, radius: 0.28, label: `x=${state.x.toFixed(2)} m` },
      ],
      vectors: [
        {
          x: state.x,
          y: 0.15,
          dx: state.v,
          dy: 0,
          label: "v",
          value: `${state.v.toFixed(2)} m/s`,
          kind: "velocity",
        },
        {
          x: state.x,
          y: -0.15,
          dx: state.a,
          dy: 0,
          label: "a",
          value: `${state.a.toFixed(2)} m/s²`,
          kind: "acceleration",
        },
      ],
      constraints: [
        {
          from: { x: -6, y: 0 },
          to: { x: 16, y: 0 },
          label: "one-dimensional track",
        },
      ],
      plots: [
        {
          title: "x–t · slope = v",
          cursor,
          series: [
            {
              label: "x",
              points: samples.map((sample) => ({ x: sample.t, y: sample.x })),
              kind: "numeric",
            },
          ],
        },
        {
          title: "v–t · shaded area = Δx",
          cursor,
          interval,
          series: [
            {
              label: "v",
              points: samples.map((sample) => ({ x: sample.t, y: sample.v })),
              kind: "area",
            },
          ],
        },
        {
          title: "a–t · shaded area = Δv",
          cursor,
          interval,
          series: [
            {
              label: "a",
              points: samples.map((sample) => ({ x: sample.t, y: sample.a })),
              kind: "area",
            },
          ],
        },
      ],
    };
  },
  data: (state, parameters) => {
    const start = Math.min(Number(parameters.intervalStart), Number(parameters.intervalEnd));
    const end = Math.max(Number(parameters.intervalStart), Number(parameters.intervalEnd));
    const earlier = motionAt(start, parameters);
    const later = motionAt(end, parameters);
    return [
      ["Position", `${state.x.toFixed(3)} m`],
      ["Velocity", `${state.v.toFixed(3)} m/s`],
      ["Acceleration", `${state.a.toFixed(3)} m/s²`],
      ["Selected interval", `${start.toFixed(1)}–${end.toFixed(1)} s`],
      ["Selected Δx", `${(later.x - earlier.x).toFixed(3)} m`],
      ["Selected Δv", `${(later.v - earlier.v).toFixed(3)} m/s`],
    ];
  },
};

function projectileInitial(parameters: AtlasParameters): AtlasState {
  const speed = Number(parameters.speed);
  const angle = (Number(parameters.angle) * Math.PI) / 180;
  return {
    t: 0,
    x: 0,
    y: Number(parameters.height),
    vx: speed * Math.cos(angle),
    vy: speed * Math.sin(angle),
  };
}
export const projectile2D: AtlasDefinition = {
  id: "mechanics-projectile-2d",
  name: "二维抛体运动 / Projectile families",
  number: "ATLAS I · 02",
  category: "Classical Mechanics · Atlas I",
  formula: "m dv/dt = mg − b(v−w)  or  mg − c|v−w|(v−w)",
  symbols: [
    ["v₀", "initial speed"],
    ["w", "wind velocity"],
    ["b, c", "linear and quadratic drag coefficients"],
    ["g", "selected planetary gravity"],
  ],
  explanation:
    "With drag disabled the thin trajectory is the analytic parabola. Drag modes use fixed-step RK4 and draw numerical samples as the heavier curve. Velocity, acceleration, tangent and comparison families remain available without relying on colour alone.",
  controls: [
    {
      key: "speed",
      label: "Initial speed",
      type: "range",
      value: 24,
      min: 5,
      max: 50,
      step: 1,
      unit: "m/s",
    },
    {
      key: "angle",
      label: "Angle",
      type: "range",
      value: 45,
      min: 5,
      max: 85,
      step: 1,
      unit: "°",
    },
    {
      key: "height",
      label: "Initial height",
      type: "range",
      value: 2,
      min: 0,
      max: 20,
      step: 0.5,
      unit: "m",
    },
    {
      key: "gravity",
      label: "Planet gravity",
      type: "select",
      value: "9.81",
      options: [
        ["1.62", "Moon"],
        ["3.71", "Mars"],
        ["9.81", "Earth"],
        ["24.79", "Jupiter"],
      ],
    },
    {
      key: "dragMode",
      label: "Air resistance",
      type: "select",
      value: "none",
      options: [
        ["none", "Off · analytic"],
        ["linear", "Linear drag"],
        ["quadratic", "Quadratic drag"],
      ],
    },
    {
      key: "drag",
      label: "Drag / mass",
      type: "range",
      value: 0.03,
      min: 0,
      max: 0.15,
      step: 0.005,
      unit: "s⁻¹",
    },
    {
      key: "wind",
      label: "Wind speed",
      type: "range",
      value: 0,
      min: -10,
      max: 10,
      step: 0.5,
      unit: "m/s",
    },
    {
      key: "family",
      label: "Trajectory family",
      type: "select",
      value: "angle",
      options: [
        ["none", "Single"],
        ["angle", "Same speed · angles"],
        ["speed", "Same angle · speeds"],
      ],
    },
  ],
  presets: [
    {
      id: "earth",
      label: "Earth · no drag",
      parameters: { gravity: "9.81", dragMode: "none", wind: 0 },
    },
    {
      id: "mars",
      label: "Mars · linear drag",
      parameters: { gravity: "3.71", dragMode: "linear", drag: 0.04 },
    },
    {
      id: "storm",
      label: "Crosswind · quadratic",
      parameters: {
        gravity: "9.81",
        dragMode: "quadratic",
        wind: 6,
        drag: 0.008,
      },
    },
  ],
  createState: projectileInitial,
  step: (state, parameters, dt) => {
    if (state.y < 0 && state.t > 0) return state;
    const next =
      parameters.dragMode === "none"
        ? projectileAnalytic(
        state.t + dt,
        Number(parameters.speed),
        (Number(parameters.angle) * Math.PI) / 180,
        Number(parameters.gravity),
        Number(parameters.height),
        Number(parameters.wind),
      )
        : projectileStep(
            state as unknown as ReturnType<typeof projectileAnalytic>,
            dt,
            Number(parameters.gravity),
            Number(parameters.drag),
            Number(parameters.wind),
            parameters.dragMode === "quadratic",
          );
    return { t: next.t, x: next.x, y: next.y, vx: next.vx, vy: next.vy };
  },
  scene: (state, parameters, history) => {
    const gravity = Number(parameters.gravity);
    const duration = Math.max(2, (2 * Number(parameters.speed)) / gravity + 2);
    const analytic = Array.from({ length: 81 }, (_, index) =>
      projectileAnalytic(
        (index / 80) * duration,
        Number(parameters.speed),
        (Number(parameters.angle) * Math.PI) / 180,
        gravity,
        Number(parameters.height),
        Number(parameters.wind),
      ),
    ).filter((point) => point.y >= 0);
    const maxX = Math.max(20, ...analytic.map((point) => point.x));
    const maxY = Math.max(10, ...analytic.map((point) => point.y));
    const families =
      parameters.family === "none"
        ? []
        : [-2, -1, 1, 2].map((offset) => {
            const speed =
              parameters.family === "speed"
                ? Number(parameters.speed) * (1 + offset * 0.12)
                : Number(parameters.speed);
            const angle =
              parameters.family === "angle"
                ? ((Number(parameters.angle) + offset * 8) * Math.PI) / 180
                : (Number(parameters.angle) * Math.PI) / 180;
            return {
              label: "comparison",
              kind: "theory" as const,
              points: Array.from({ length: 61 }, (_, index) =>
                projectileAnalytic(
                  (index / 60) * duration,
                  speed,
                  angle,
                  gravity,
                  Number(parameters.height),
                  Number(parameters.wind),
                ),
              ).filter((point) => point.y >= 0),
            };
          });
    const speed = Math.hypot(state.vx, state.vy);
    return {
      bounds: { xMin: -2, xMax: maxX * 1.08, yMin: -2, yMax: maxY * 1.15 },
      bodies: [
        {
          x: state.x,
          y: Math.max(0, state.y),
          radius: maxX / 80,
          label: "projectile",
        },
      ],
      vectors: [
        {
          x: state.x,
          y: state.y,
          dx: state.vx,
          dy: state.vy,
          label: "v",
          value: `${speed.toFixed(1)} m/s`,
          kind: "velocity",
        },
        {
          x: state.x,
          y: state.y,
          dx: 0,
          dy: -gravity,
          label: "a",
          value: `${gravity.toFixed(2)} m/s²`,
          kind: "acceleration",
        },
      ],
      curves: [
        { label: "analytic", kind: "theory", points: analytic },
        {
          label: "numeric",
          kind: "numeric",
          points: history
            .map((sample) => ({ x: sample.x, y: sample.y }))
            .filter((point) => point.y >= 0),
        },
        ...families,
      ],
      constraints: [
        {
          from: { x: -2, y: 0 },
          to: { x: maxX * 1.08, y: 0 },
          label: "ground",
        },
      ],
      plots: [
        {
          title: "x(t), y(t)",
          cursor: state.t,
          series: [
            {
              label: "x",
              points: analytic.map((sample) => ({ x: sample.t, y: sample.x })),
            },
            {
              label: "y",
              points: analytic.map((sample) => ({ x: sample.t, y: sample.y })),
            },
          ],
        },
        {
          title: "vₓ(t), vᵧ(t)",
          cursor: state.t,
          series: [
            {
              label: "vx",
              points: history.map((sample) => ({ x: sample.t, y: sample.vx })),
            },
            {
              label: "vy",
              points: history.map((sample) => ({ x: sample.t, y: sample.vy })),
            },
          ],
        },
      ],
    };
  },
  data: (state) => [
    ["Position", `(${state.x.toFixed(2)}, ${state.y.toFixed(2)}) m`],
    ["Velocity", `(${state.vx.toFixed(2)}, ${state.vy.toFixed(2)}) m/s`],
    ["Speed", `${Math.hypot(state.vx, state.vy).toFixed(2)} m/s`],
    ["Integrator", "Analytic / fixed-step RK4"],
  ],
};

export const circular: AtlasDefinition = {
  id: "mechanics-circular-motion",
  name: "圆周运动 / Circular motion",
  number: "ATLAS I · 03",
  category: "Classical Mechanics · Atlas I",
  formula: "v = rω,  aₜ = rα,  aₙ = v²/r = rω²,  Fₙ = mv²/r",
  symbols: [
    ["θ", "angular position"],
    ["ω", "angular velocity"],
    ["α", "angular acceleration"],
    ["aₙ", "normal / centripetal acceleration"],
  ],
  explanation:
    "Velocity is tangent to the path; normal acceleration points inward. In rotating-frame mode the outward centrifugal inertial force is explicitly marked as a non-inertial-frame description, never as an extra interaction in the inertial frame.",
  controls: [
    {
      key: "radius",
      label: "Radius",
      type: "range",
      value: 2,
      min: 0.5,
      max: 5,
      step: 0.1,
      unit: "m",
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
      key: "omega",
      label: "Initial ω",
      type: "range",
      value: 1.5,
      min: -0.5,
      max: 5,
      step: 0.1,
      unit: "rad/s",
    },
    {
      key: "omegaMode",
      label: "Angular velocity model",
      type: "select",
      value: "linear",
      options: [["linear", "ω₀ + αt"], ["custom", "Custom ω(t)"]],
    },
    {
      key: "omegaFunction",
      label: "Custom ω(t)",
      type: "text",
      value: "1.5 + 0.6*sin(t)",
    },
    {
      key: "alpha",
      label: "Angular α",
      type: "range",
      value: 0,
      min: -1,
      max: 1,
      step: 0.05,
      unit: "rad/s²",
    },
    {
      key: "frame",
      label: "Observer",
      type: "select",
      value: "inertial",
      options: [
        ["inertial", "Inertial frame"],
        ["rotating", "Rotating frame"],
      ],
    },
  ],
  presets: [
    { id: "uniform", label: "匀速圆周", parameters: { omega: 1.5, alpha: 0 } },
    {
      id: "accelerated",
      label: "匀角加速",
      parameters: { omega: 0.5, alpha: 0.35 },
    },
    {
      id: "rotating",
      label: "旋转参考系",
      parameters: { frame: "rotating", omega: 2, alpha: 0 },
    },
    {
      id: "custom",
      label: "Custom ω(t)",
      parameters: { omegaMode: "custom", omegaFunction: "1.5 + 0.6*sin(t)" },
    },
  ],
  createState: () => ({ t: 0 }),
  step: (state, _parameters, dt) => ({ t: state.t + dt }),
  scene: (state, parameters) => {
    const sample = circularSample(state.t, parameters);
    const radius = Number(parameters.radius);
    const times = Array.from({ length: 90 }, (_, index) => index / 15);
    const vectors: Vector[] = [
      {
        x: sample.position.x,
        y: sample.position.y,
        dx: sample.velocity.x,
        dy: sample.velocity.y,
        label: "v",
        value: `${Math.hypot(sample.velocity.x, sample.velocity.y).toFixed(2)}`,
        kind: "velocity" as const,
      },
      {
        x: sample.position.x,
        y: sample.position.y,
        dx: sample.tangential.x,
        dy: sample.tangential.y,
        label: "aₜ",
        value: `${Math.hypot(sample.tangential.x, sample.tangential.y).toFixed(2)}`,
        kind: "acceleration" as const,
      },
      {
        x: sample.position.x,
        y: sample.position.y,
        dx: sample.normal.x,
        dy: sample.normal.y,
        label: "aₙ",
        value: `${Math.hypot(sample.normal.x, sample.normal.y).toFixed(2)}`,
        kind: "acceleration" as const,
      },
    ];
    if (parameters.frame === "rotating")
      vectors.push({
        x: sample.position.x,
        y: sample.position.y,
        dx: -sample.normal.x * Number(parameters.mass),
        dy: -sample.normal.y * Number(parameters.mass),
        label: "Fcf · non-inertial only",
        value: `${(Number(parameters.mass) * Math.hypot(sample.normal.x, sample.normal.y)).toFixed(2)} N`,
        kind: "force",
      });
    return {
      bounds: {
        xMin: -radius * 1.5,
        xMax: radius * 1.5,
        yMin: -radius * 1.5,
        yMax: radius * 1.5,
      },
      bodies: [
        {
          x: sample.position.x,
          y: sample.position.y,
          radius: radius * 0.1,
          label: "mass",
        },
        { x: 0, y: 0, radius: radius * 0.05, label: "centre" },
      ],
      vectors,
      curves: [
        {
          label: "path",
          kind: "constraint",
          points: Array.from({ length: 65 }, (_, index) => ({
            x: radius * Math.cos((index / 64) * Math.PI * 2),
            y: radius * Math.sin((index / 64) * Math.PI * 2),
          })),
        },
      ],
      constraints: [
        {
          from: { x: 0, y: 0 },
          to: sample.position,
          label: `r=${radius.toFixed(1)} m`,
        },
      ],
      plots: [
        {
          title: "θ(t)",
          cursor: state.t,
          series: [
            {
              label: "theta",
              points: times.map((time) => ({
                x: time,
                y: circularSample(time, parameters).theta,
              })),
            },
          ],
        },
        {
          title: "ω(t) / aₙ(t)",
          cursor: state.t,
          series: [
            {
              label: "omega",
              points: times.map((time) => ({
                x: time,
                y: circularSample(time, parameters).omega,
              })),
            },
            {
              label: "an",
              points: times.map((time) => ({
                x: time,
                y: Math.hypot(
                  circularSample(time, parameters).normal.x,
                  circularSample(time, parameters).normal.y,
                ),
              })),
            },
          ],
        },
      ],
    };
  },
  data: (state, parameters) => {
    const sample = circularSample(state.t, parameters);
    return [
      ["Angle", `${sample.theta.toFixed(2)} rad`],
      ["Angular velocity", `${sample.omega.toFixed(2)} rad/s`],
      [
        "Tangential speed",
        `${Math.hypot(sample.velocity.x, sample.velocity.y).toFixed(2)} m/s`,
      ],
      [
        "Centripetal force",
        `${(Number(parameters.mass) * Math.hypot(sample.normal.x, sample.normal.y)).toFixed(2)} N`,
      ],
      ["Reference frame", String(parameters.frame)],
    ];
  },
};
