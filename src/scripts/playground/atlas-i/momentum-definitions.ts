import type {
  AtlasDefinition,
  AtlasParameters,
  AtlasState,
} from "../core/atlas-types";
import {
  centerOfMass,
  collide1D,
  collisionSubsteps,
  resolveDiscCollision,
  type Disc,
} from "../models/collisions";

function particleCount(parameters: AtlasParameters) {
  return Math.max(1, Math.min(6, Math.round(Number(parameters.count))));
}

function particlesFromState(state: AtlasState, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    mass: state[`m${index}`],
    x: state[`x${index}`],
    y: state[`y${index}`],
    vx: state[`vx${index}`],
    vy: state[`vy${index}`],
  }));
}
export const momentumCenter: AtlasDefinition = {
  id: "mechanics-momentum-center",
  name: "动量与质心 / Momentum & centre of mass",
  number: "ATLAS I · 08",
  category: "Classical Mechanics · Atlas I",
  formula: "Rcm = Σmᵢrᵢ/Σmᵢ;  P = Σmᵢvᵢ = M Vcm;  M Acm = Fext",
  symbols: [
    ["Rcm", "centre-of-mass position"],
    ["P", "total momentum"],
    ["Fext", "net external force"],
    ["internal force", "equal/opposite pairs that do not change P"],
  ],
  explanation:
    "Add or remove particles with the count control, select one, then drag it directly. Internal pair forces cancel in total momentum; an optional uniform external field changes the centre-of-mass velocity. Centre-of-mass-frame velocities are reported alongside laboratory values.",
  controls: [
    {
      key: "count",
      label: "Particle count · add/remove",
      type: "range",
      value: 3,
      min: 1,
      max: 6,
      step: 1,
    },
    {
      key: "selected",
      label: "Selected particle",
      type: "range",
      value: 1,
      min: 1,
      max: 6,
      step: 1,
    },
    {
      key: "external",
      label: "External force",
      type: "range",
      value: 0,
      min: -3,
      max: 3,
      step: 0.1,
      unit: "N",
    },
    {
      key: "internal",
      label: "Internal spring",
      type: "checkbox",
      value: true,
    },
    {
      key: "frame",
      label: "Reference frame",
      type: "select",
      value: "lab",
      options: [
        ["lab", "Laboratory"],
        ["com", "Centre of mass"],
      ],
    },
  ],
  presets: [
    {
      id: "isolated",
      label: "Isolated system",
      parameters: { external: 0, internal: true },
    },
    {
      id: "external",
      label: "External impulse",
      parameters: { external: 1.5, internal: false },
    },
    {
      id: "com",
      label: "Centre-of-mass frame",
      parameters: { external: 0, frame: "com" },
    },
  ],
  createState: () => ({
    t: 0,
    m0: 1,
    x0: -1.4,
    y0: -0.5,
    vx0: 0.5,
    vy0: 0.2,
    m1: 2,
    x1: 0.3,
    y1: 0.7,
    vx1: -0.1,
    vy1: -0.15,
    m2: 1.5,
    x2: 1.4,
    y2: -0.3,
    vx2: -0.2,
    vy2: 0.05,
    m3: 0.8,
    x3: -0.7,
    y3: 1.2,
    vx3: 0.15,
    vy3: -0.25,
    m4: 2.4,
    x4: 1.8,
    y4: 1.1,
    vx4: -0.3,
    vy4: -0.1,
    m5: 1.2,
    x5: 0.1,
    y5: -1.4,
    vx5: 0.25,
    vy5: 0.18,
  }),
  step: (state, parameters, dt) => {
    const next: AtlasState = { ...state, t: state.t + dt };
    const count = particleCount(parameters);
    const center = centerOfMass(particlesFromState(state, count));
    for (let index = 0; index < count; index += 1) {
      const mass = state[`m${index}`];
      const springX = Boolean(parameters.internal)
        ? -0.35 * (state[`x${index}`] - center.x)
        : 0;
      const springY = Boolean(parameters.internal)
        ? -0.35 * (state[`y${index}`] - center.y)
        : 0;
      next[`vx${index}`] +=
        ((Number(parameters.external) / count + springX) / mass) * dt;
      next[`vy${index}`] += (springY / mass) * dt;
      next[`x${index}`] += next[`vx${index}`] * dt;
      next[`y${index}`] += next[`vy${index}`] * dt;
      if (Math.abs(next[`x${index}`]) > 2.6) next[`vx${index}`] *= -1;
      if (Math.abs(next[`y${index}`]) > 1.8) next[`vy${index}`] *= -1;
    }
    return next;
  },
  scene: (state, parameters, history) => {
    const count = particleCount(parameters);
    const particles = particlesFromState(state, count);
    const center = centerOfMass(particles);
    const offset =
      parameters.frame === "com" ? center : { x: 0, y: 0, vx: 0, vy: 0 };
    return {
      bounds: { xMin: -3, xMax: 3, yMin: -2.2, yMax: 2.2 },
      bodies: [
        ...particles.map((particle, index) => ({
          x: particle.x - offset.x,
          y: particle.y - offset.y,
          radius: 0.16 * Math.sqrt(particle.mass),
          label: `m${index + 1}=${particle.mass} kg`,
        })),
        {
          x: center.x - offset.x,
          y: center.y - offset.y,
          radius: 0.12,
          label: "CM",
          shape: "ring" as const,
        },
      ],
      vectors: particles.map((particle, index) => ({
        x: particle.x - offset.x,
        y: particle.y - offset.y,
        dx: particle.vx - offset.vx,
        dy: particle.vy - offset.vy,
        label: `v${index + 1}`,
        value: `${Math.hypot(particle.vx - offset.vx, particle.vy - offset.vy).toFixed(2)}`,
        kind: "velocity" as const,
      })),
      curves: [
        {
          label: "CM path",
          kind: "trajectory",
          points: history.map((sample) => {
            const cm = centerOfMass(particlesFromState(sample, count));
            return { x: cm.x - offset.x, y: cm.y - offset.y };
          }),
        },
      ],
    };
  },
  data: (state, parameters) => {
    const count = particleCount(parameters);
    const center = centerOfMass(particlesFromState(state, count));
    return [
      ["Centre of mass", `(${center.x.toFixed(3)}, ${center.y.toFixed(3)}) m`],
      ["CM velocity", `(${center.vx.toFixed(3)}, ${center.vy.toFixed(3)}) m/s`],
      [
        "Total momentum",
        `(${center.px.toFixed(3)}, ${center.py.toFixed(3)}) kg·m/s`,
      ],
      ["External force", `${Number(parameters.external).toFixed(2)} N`],
      ["Active particles", count],
      ["Drag target", `particle ${Math.min(count, Math.round(Number(parameters.selected)))}`],
      ["Frame", String(parameters.frame)],
    ];
  },
  drag: (point, state, parameters) => {
    const selected = Math.max(
      0,
      Math.min(particleCount(parameters) - 1, Math.round(Number(parameters.selected)) - 1),
    );
    return {
      ...state,
      [`x${selected}`]: point.x * 2.6,
      [`y${selected}`]: point.y * 1.8,
      [`vx${selected}`]: 0,
      [`vy${selected}`]: 0,
    };
  },
};

function oneDimensionalState(parameters: AtlasParameters) {
  return {
    t: 0,
    x1: -1.8,
    x2: 1.4,
    v1: Number(parameters.v1),
    v2: Number(parameters.v2),
    collided: 0,
    beforeK:
      0.5 * Number(parameters.m1) * Number(parameters.v1) ** 2 +
      0.5 * Number(parameters.m2) * Number(parameters.v2) ** 2,
    beforeP:
      Number(parameters.m1) * Number(parameters.v1) +
      Number(parameters.m2) * Number(parameters.v2),
  };
}
export const collision1D: AtlasDefinition = {
  id: "mechanics-collision-1d",
  name: "一维碰撞 / One-dimensional collision",
  number: "ATLAS I · 09",
  category: "Classical Mechanics · Atlas I",
  formula: "m₁u₁+m₂u₂=m₁v₁+m₂v₂;  v₂−v₁ = e(u₁−u₂)",
  symbols: [
    ["e", "coefficient of restitution"],
    ["P", "total momentum"],
    ["Kloss", "kinetic energy converted to internal energy"],
    ["Vcm", "centre-of-mass velocity"],
  ],
  explanation:
    "The restitution control continuously covers elastic, partially inelastic, and perfectly inelastic limits. Before/after momentum, kinetic energy, centre-of-mass velocity and numerical conservation residuals update at collision.",
  controls: [
    {
      key: "m1",
      label: "Mass 1",
      type: "range",
      value: 1,
      min: 0.2,
      max: 5,
      step: 0.1,
      unit: "kg",
    },
    {
      key: "m2",
      label: "Mass 2",
      type: "range",
      value: 2,
      min: 0.2,
      max: 5,
      step: 0.1,
      unit: "kg",
    },
    {
      key: "v1",
      label: "Initial velocity 1",
      type: "range",
      value: 2,
      min: -4,
      max: 5,
      step: 0.1,
      unit: "m/s",
    },
    {
      key: "v2",
      label: "Initial velocity 2",
      type: "range",
      value: -0.5,
      min: -4,
      max: 4,
      step: 0.1,
      unit: "m/s",
    },
    {
      key: "restitution",
      label: "Restitution e",
      type: "range",
      value: 1,
      min: 0,
      max: 1,
      step: 0.05,
    },
  ],
  presets: [
    {
      id: "elastic",
      label: "Completely elastic",
      parameters: { restitution: 1, m1: 1, m2: 2 },
    },
    {
      id: "partial",
      label: "Partially inelastic",
      parameters: { restitution: 0.45 },
    },
    {
      id: "stick",
      label: "Completely inelastic",
      parameters: { restitution: 0 },
    },
  ],
  createState: oneDimensionalState,
  step: (state, parameters, dt) => {
    let { x1, x2, v1, v2, collided } = state;
    x1 += v1 * dt * 0.55;
    x2 += v2 * dt * 0.55;
    if (!collided && x2 - x1 <= 0.62 && v1 > v2) {
      const result = collide1D(
        { mass: Number(parameters.m1), velocity: v1 },
        { mass: Number(parameters.m2), velocity: v2 },
        Number(parameters.restitution),
      );
      v1 = result.v1;
      v2 = result.v2;
      collided = 1;
    }
    if (Math.abs(x1) > 3) v1 *= -1;
    if (Math.abs(x2) > 3) v2 *= -1;
    return { ...state, t: state.t + dt, x1, x2, v1, v2, collided };
  },
  scene: (state, parameters) => ({
    bounds: { xMin: -3.4, xMax: 3.4, yMin: -1, yMax: 1 },
    bodies: [
      {
        x: state.x1,
        y: 0,
        radius: 0.24 * Math.sqrt(Number(parameters.m1)),
        label: "m₁",
      },
      {
        x: state.x2,
        y: 0,
        radius: 0.24 * Math.sqrt(Number(parameters.m2)),
        label: "m₂",
      },
    ],
    vectors: [
      {
        x: state.x1,
        y: 0.15,
        dx: state.v1,
        dy: 0,
        label: "v₁",
        value: `${state.v1.toFixed(2)}`,
        kind: "velocity",
      },
      {
        x: state.x2,
        y: -0.15,
        dx: state.v2,
        dy: 0,
        label: "v₂",
        value: `${state.v2.toFixed(2)}`,
        kind: "velocity",
      },
    ],
    constraints: [
      {
        from: { x: -3.4, y: 0 },
        to: { x: 3.4, y: 0 },
        label: "collision axis",
      },
    ],
    energy: [
      {
        label: "K",
        value:
          0.5 * Number(parameters.m1) * state.v1 ** 2 +
          0.5 * Number(parameters.m2) * state.v2 ** 2,
      },
      {
        label: "lost",
        value: Math.max(
          0,
          state.beforeK -
            (0.5 * Number(parameters.m1) * state.v1 ** 2 +
              0.5 * Number(parameters.m2) * state.v2 ** 2),
        ),
      },
    ],
  }),
  data: (state, parameters) => {
    const momentum =
      Number(parameters.m1) * state.v1 + Number(parameters.m2) * state.v2;
    const kinetic =
      0.5 * Number(parameters.m1) * state.v1 ** 2 +
      0.5 * Number(parameters.m2) * state.v2 ** 2;
    return [
      ["Collision state", state.collided ? "after impact" : "approaching"],
      ["Velocities", `${state.v1.toFixed(3)}, ${state.v2.toFixed(3)} m/s`],
      ["Momentum", `${momentum.toFixed(5)} kg·m/s`],
      [
        "Momentum error",
        `${Math.abs(momentum - state.beforeP).toExponential(2)}`,
      ],
      [
        "Kinetic energy loss",
        `${Math.max(0, state.beforeK - kinetic).toFixed(5)} J`,
      ],
      [
        "CM velocity",
        `${(momentum / (Number(parameters.m1) + Number(parameters.m2))).toFixed(3)} m/s`,
      ],
    ];
  },
};

function discsFromState(
  state: AtlasState,
  parameters: AtlasParameters,
): Disc[] {
  return [0, 1, 2]
    .slice(0, Number(parameters.count))
    .map((index) => ({
      mass: Number(parameters[`m${index + 1}`] ?? 1 + index),
      radius: 0.22 + index * 0.04,
      x: state[`x${index}`],
      y: state[`y${index}`],
      vx: state[`vx${index}`],
      vy: state[`vy${index}`],
    }));
}
export const collision2D: AtlasDefinition = {
  id: "mechanics-collision-2d",
  name: "二维碰撞 / Two-dimensional discs",
  number: "ATLAS I · 10",
  category: "Classical Mechanics · Atlas I",
  formula: "J = −(1+e)(vrel·n)/(1/m₁+1/m₂);  v′ = v ± Jn/m",
  symbols: [
    ["J", "normal collision impulse"],
    ["n", "contact normal"],
    ["e", "coefficient of restitution"],
    ["substeps", "fixed subdivisions preventing high-speed tunnelling"],
  ],
  explanation:
    "Disc collisions use fixed time steps with adaptive substepping based on speed and radius. Positional correction removes overlap. Fixed walls reflect the normal velocity; periodic mode wraps the world boundaries.",
  controls: [
    {
      key: "count",
      label: "Disc count",
      type: "range",
      value: 3,
      min: 2,
      max: 3,
      step: 1,
    },
    {
      key: "m1",
      label: "Mass 1",
      type: "range",
      value: 1,
      min: 0.3,
      max: 5,
      step: 0.1,
      unit: "kg",
    },
    {
      key: "m2",
      label: "Mass 2",
      type: "range",
      value: 2,
      min: 0.3,
      max: 5,
      step: 0.1,
      unit: "kg",
    },
    {
      key: "m3",
      label: "Mass 3",
      type: "range",
      value: 1.5,
      min: 0.3,
      max: 5,
      step: 0.1,
      unit: "kg",
    },
    {
      key: "restitution",
      label: "Restitution",
      type: "range",
      value: 0.9,
      min: 0,
      max: 1,
      step: 0.05,
    },
    {
      key: "boundary",
      label: "Boundary",
      type: "select",
      value: "fixed",
      options: [
        ["fixed", "Fixed walls"],
        ["periodic", "Periodic wrap"],
      ],
    },
  ],
  presets: [
    {
      id: "oblique",
      label: "Oblique collision",
      parameters: { count: 2, restitution: 1, boundary: "fixed" },
    },
    {
      id: "cascade",
      label: "Three-disc cascade",
      parameters: { count: 3, restitution: 0.9 },
    },
    {
      id: "periodic",
      label: "Periodic box",
      parameters: { count: 3, boundary: "periodic" },
    },
  ],
  createState: () => ({
    t: 0,
    x0: -2.2,
    y0: -0.5,
    vx0: 3.2,
    vy0: 0.8,
    x1: 0,
    y1: 0,
    vx1: 0,
    vy1: 0,
    x2: 1.8,
    y2: 0.6,
    vx2: -1.2,
    vy2: -0.4,
    collisions: 0,
  }),
  step: (state, parameters, dt) => {
    let discs = discsFromState(state, parameters);
    const steps = collisionSubsteps(
      Math.max(...discs.map((disc) => Math.hypot(disc.vx, disc.vy))),
      Math.min(...discs.map((disc) => disc.radius)),
      dt,
    );
    const h = dt / steps;
    let collisions = state.collisions;
    for (let substep = 0; substep < steps; substep += 1) {
      discs = discs.map((disc) => ({
        ...disc,
        x: disc.x + disc.vx * h,
        y: disc.y + disc.vy * h,
      }));
      for (let i = 0; i < discs.length; i += 1)
        for (let j = i + 1; j < discs.length; j += 1) {
          const result = resolveDiscCollision(
            discs[i],
            discs[j],
            Number(parameters.restitution),
          );
          discs[i] = result.a;
          discs[j] = result.b;
          if (result.collided) collisions += 1;
        }
      discs = discs.map((disc) => {
        if (parameters.boundary === "periodic")
          return {
            ...disc,
            x: disc.x < -3 ? 3 : disc.x > 3 ? -3 : disc.x,
            y: disc.y < -2 ? 2 : disc.y > 2 ? -2 : disc.y,
          };
        let { x, y, vx, vy } = disc;
        if (x - disc.radius < -3 || x + disc.radius > 3) vx *= -1;
        if (y - disc.radius < -2 || y + disc.radius > 2) vy *= -1;
        x = Math.max(-3 + disc.radius, Math.min(3 - disc.radius, x));
        y = Math.max(-2 + disc.radius, Math.min(2 - disc.radius, y));
        return { ...disc, x, y, vx, vy };
      });
    }
    const next = { ...state, t: state.t + dt, collisions, substeps: steps };
    discs.forEach((disc, index) =>
      Object.assign(next, {
        [`x${index}`]: disc.x,
        [`y${index}`]: disc.y,
        [`vx${index}`]: disc.vx,
        [`vy${index}`]: disc.vy,
      }),
    );
    return next;
  },
  scene: (state, parameters, history) => {
    const discs = discsFromState(state, parameters);
    return {
      bounds: { xMin: -3.2, xMax: 3.2, yMin: -2.2, yMax: 2.2 },
      bodies: discs.map((disc, index) => ({
        x: disc.x,
        y: disc.y,
        radius: disc.radius,
        label: `m${index + 1}=${disc.mass.toFixed(1)}`,
      })),
      vectors: discs.map((disc, index) => ({
        x: disc.x,
        y: disc.y,
        dx: disc.vx,
        dy: disc.vy,
        label: `v${index + 1}`,
        value: `${Math.hypot(disc.vx, disc.vy).toFixed(2)}`,
        kind: "velocity" as const,
      })),
      curves: discs.map((_disc, index) => ({
        label: `trajectory ${index + 1}`,
        kind: "trajectory" as const,
        points: history
          .slice(-240)
          .map((sample) => ({
            x: sample[`x${index}`],
            y: sample[`y${index}`],
          })),
      })),
      constraints: [
        {
          from: { x: -3, y: -2 },
          to: { x: 3, y: -2 },
          label: String(parameters.boundary),
        },
        { from: { x: 3, y: -2 }, to: { x: 3, y: 2 } },
        { from: { x: 3, y: 2 }, to: { x: -3, y: 2 } },
        { from: { x: -3, y: 2 }, to: { x: -3, y: -2 } },
      ],
    };
  },
  data: (state, parameters) => {
    const discs = discsFromState(state, parameters);
    const center = centerOfMass(discs);
    return [
      ["Collision count", Math.round(state.collisions)],
      ["Substeps / frame", Math.round(state.substeps || 1)],
      ["Total momentum", `(${center.px.toFixed(3)}, ${center.py.toFixed(3)})`],
      [
        "Kinetic energy",
        `${discs.reduce((sum, disc) => sum + 0.5 * disc.mass * (disc.vx ** 2 + disc.vy ** 2), 0).toFixed(4)} J`,
      ],
      ["Boundary", String(parameters.boundary)],
    ];
  },
  drag: (point, state) => ({
    ...state,
    x0: point.x * 3,
    y0: point.y * 2,
    vx0: 0,
    vy0: 0,
  }),
};
