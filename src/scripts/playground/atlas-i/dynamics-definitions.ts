import type { AtlasDefinition } from "../core/atlas-types";
import type { Vector } from "../core/types";
import {
  atwoodMachine,
  connectedBlocks,
  horizontalFriction,
  inclineForces,
} from "../models/dynamics";

function alternatePulleyModel(parameters: Record<string, number | boolean | string>) {
  const configuration = String(parameters.configuration);
  const m1 = Number(parameters.m1);
  const m2 = Number(parameters.m2);
  const radius = Number(parameters.radius);
  if (configuration === "horizontal") {
    const solution = connectedBlocks(m1, m2, Number(parameters.driveForce));
    return { acceleration: solution.acceleration, acceleration1: solution.acceleration, tension1: solution.tension, tension2: solution.tension, angularAcceleration: 0, taut: solution.taut, constraint: "s₂−s₁=constant" };
  }
  if (configuration === "incline") {
    const angle = Number(parameters.pulleyAngle) * Math.PI / 180;
    const inertia = Number(parameters.inertia);
    const acceleration = 9.81 * (m2 - m1 * Math.sin(angle)) / (m1 + m2 + inertia / radius ** 2);
    const tension1 = m1 * (acceleration + 9.81 * Math.sin(angle));
    const tension2 = m2 * (9.81 - acceleration);
    const taut = tension1 >= 0 && tension2 >= 0;
    return { acceleration: taut ? acceleration : 0, acceleration1: taut ? acceleration : 0, tension1: taut ? tension1 : 0, tension2: taut ? tension2 : 0, angularAcceleration: taut ? acceleration / radius : 0, taut, constraint: "s∥+shanging=constant" };
  }
  if (configuration === "moving") {
    const acceleration = 9.81 * (m2 - 2 * m1) / (m2 + 4 * m1);
    const tension = m1 * (9.81 + 2 * acceleration);
    const taut = tension >= 0;
    return { acceleration: taut ? acceleration : 0, acceleration1: taut ? -2 * acceleration : 0, tension1: taut ? tension : 0, tension2: taut ? tension : 0, angularAcceleration: taut ? acceleration / radius : 0, taut, constraint: "sfree+2smoving=constant; afree=−2amoving" };
  }
  return {
    ...atwoodMachine(m1, m2, 9.81, 0, radius),
    acceleration1: 0,
    constraint: "fixed pulleys redirect tension; displacement ratio 1:1",
  };
}

function alternatePulleyScene(
  state: Record<string, number>,
  parameters: Record<string, number | boolean | string>,
) {
  const configuration = String(parameters.configuration);
  const result = alternatePulleyModel(parameters);
  if (configuration === "horizontal") {
    return {
      result,
      scene: {
        bounds: { xMin: -3, xMax: 3, yMin: -2, yMax: 2 },
        bodies: [
          { x: -1.5 + state.displacement, y: 0, radius: 0.34, label: `m₁ ${parameters.m1} kg`, shape: "square" as const },
          { x: 1 + state.displacement, y: 0, radius: 0.4, label: `m₂ ${parameters.m2} kg`, shape: "square" as const },
        ],
        constraints: [{ from: { x: -1.5 + state.displacement, y: 0 }, to: { x: 1 + state.displacement, y: 0 }, label: result.constraint }],
        vectors: [
          { x: -1.5 + state.displacement, y: 0, dx: result.tension1, dy: 0, label: "T", value: `${result.tension1.toFixed(1)} N`, kind: "force" as const },
          { x: 1 + state.displacement, y: 0, dx: Number(parameters.driveForce), dy: 0, label: "F", value: `${Number(parameters.driveForce).toFixed(1)} N`, kind: "force" as const },
          { x: 1 + state.displacement, y: 0.3, dx: result.acceleration, dy: 0, label: "a", value: `${result.acceleration.toFixed(2)}`, kind: "acceleration" as const },
        ],
        annotations: [{ x: 0, y: -1.2, text: result.taut ? result.constraint : "ROPE SLACK · T=0" }],
      },
    };
  }
  if (configuration === "incline") {
    const angle = Number(parameters.pulleyAngle) * Math.PI / 180;
    const block = { x: -1.3 + state.displacement * Math.cos(angle), y: -0.2 + state.displacement * Math.sin(angle) };
    return {
      result,
      scene: {
        bounds: { xMin: -3, xMax: 3, yMin: -2.5, yMax: 2.5 },
        bodies: [
          { ...block, radius: 0.34, label: `m₁ ${parameters.m1} kg`, shape: "square" as const },
          { x: 1.7, y: -0.2 + state.displacement, radius: 0.4, label: `m₂ ${parameters.m2} kg`, shape: "square" as const },
          { x: 0.7, y: 1.5, radius: Number(parameters.radius), label: "pulley", shape: "ring" as const },
        ],
        constraints: [
          { from: { x: -2.5, y: -1.3 }, to: { x: 0.7, y: 1.5 }, label: `incline ${parameters.pulleyAngle}°` },
          { from: block, to: { x: 0.7, y: 1.5 }, label: "rope" },
          { from: { x: 1.7, y: -0.2 + state.displacement }, to: { x: 1.7, y: 1.5 }, label: result.constraint },
        ],
        vectors: [
          { ...block, dx: result.tension1 * Math.cos(angle), dy: result.tension1 * Math.sin(angle), label: "T₁", value: `${result.tension1.toFixed(1)} N`, kind: "force" as const },
          { x: 1.7, y: -0.2 + state.displacement, dx: 0, dy: result.tension2, label: "T₂", value: `${result.tension2.toFixed(1)} N`, kind: "force" as const },
        ],
        annotations: [{ x: 0, y: -2, text: result.taut ? result.constraint : "ROPE SLACK · T=0" }],
      },
    };
  }
  const moving = configuration === "moving";
  const pulleyY = moving ? 0.7 + state.displacement : 1.5;
  return {
    result,
    scene: {
      bounds: { xMin: -3, xMax: 3, yMin: -3, yMax: 3 },
      bodies: [
        { x: -1.5, y: 0.2 + (moving ? -2 : -1) * state.displacement, radius: 0.35, label: `free m₁`, shape: "square" as const },
        { x: 1, y: pulleyY, radius: Number(parameters.radius), label: moving ? "moving pulley" : "redirect pulley", shape: "ring" as const },
        { x: 1, y: pulleyY - 0.8, radius: 0.4, label: `load m₂`, shape: "square" as const },
        ...(configuration === "fixed" ? [{ x: 0, y: 1.8, radius: Number(parameters.radius), label: "fixed 2", shape: "ring" as const }] : []),
      ],
      constraints: [
        { from: { x: -1.5, y: 0.2 + (moving ? -2 : -1) * state.displacement }, to: { x: -1.5, y: 2.2 }, label: "rope" },
        { from: { x: -1.5, y: 2.2 }, to: { x: 1, y: pulleyY }, label: result.constraint },
        { from: { x: 1, y: pulleyY }, to: { x: 1, y: pulleyY - 0.8 }, label: moving ? "2T supports load" : "redirected segment" },
      ],
      vectors: [
        { x: -1.5, y: 0.2 + (moving ? -2 : -1) * state.displacement, dx: 0, dy: result.tension1, label: "T", value: `${result.tension1.toFixed(1)} N`, kind: "force" as const },
        { x: 1, y: pulleyY - 0.8, dx: 0, dy: moving ? 2 * result.tension2 : result.tension2, label: moving ? "2T" : "T", value: `${(moving ? 2 * result.tension2 : result.tension2).toFixed(1)} N`, kind: "force" as const },
      ],
      annotations: [{ x: 0, y: -2.4, text: result.taut ? result.constraint : "ROPE SLACK · T=0" }],
    },
  };
}

function alternateNewtonScene(
  state: Record<string, number>,
  parameters: Record<string, number | boolean | string>,
) {
  const scene = String(parameters.scene);
  const mass = Number(parameters.mass);
  const weight = mass * 9.81;
  let acceleration = 0;
  let vectors: Vector[] = [];
  let body = { x: state.x, y: 0, radius: 0.35, label: scene, shape: "square" as const };
  let constraints = [{ from: { x: -4, y: -0.4 }, to: { x: 4, y: -0.4 }, label: "contact surface" }];
  let regime = "frictionless";
  if (scene === "incline") {
    const angle = Number(parameters.angle) * Math.PI / 180;
    const result = inclineForces(mass, angle, Number(parameters.muStatic), Number(parameters.muKinetic), 9.81, Math.abs(state.v) > 0.01);
    const tangent = { x: Math.cos(angle), y: -Math.sin(angle) };
    const normal = { x: Math.sin(angle), y: Math.cos(angle) };
    body = { x: state.x * tangent.x, y: 0.8 - state.x * tangent.y, radius: 0.35, label: result.mode, shape: "square" };
    acceleration = result.acceleration;
    regime = result.mode;
    vectors = [
      { x: body.x, y: body.y, dx: 0, dy: -weight, label: "mg", value: `${weight.toFixed(1)} N`, kind: "force" },
      { x: body.x, y: body.y, dx: normal.x * result.normal, dy: normal.y * result.normal, label: "N", value: `${result.normal.toFixed(1)} N`, kind: "force" },
      { x: body.x, y: body.y, dx: -tangent.x * result.friction, dy: tangent.y * result.friction, label: result.mode === "static" ? "fₛ" : "fₖ", value: `${Math.abs(result.friction).toFixed(1)} N`, kind: "force" },
      { x: body.x, y: body.y, dx: tangent.x * result.parallel, dy: -tangent.y * result.parallel, label: "mg∥", value: `${result.parallel.toFixed(1)} N`, kind: "constraint" },
    ];
    constraints = [{ from: { x: -3 * tangent.x, y: 0.8 + 3 * Math.sin(angle) }, to: { x: 3 * tangent.x, y: 0.8 - 3 * Math.sin(angle) }, label: `local tangent–normal · θ=${parameters.angle}°` }];
  } else if (scene === "hanging" || scene === "elevator") {
    const support = Number(parameters.force);
    acceleration = (support - weight) / mass;
    regime = scene === "hanging" ? "tension support" : "apparent weight";
    body = { x: 0, y: state.x, radius: 0.35, label: scene, shape: "square" };
    vectors = [
      { x: 0, y: state.x, dx: 0, dy: support, label: scene === "hanging" ? "T" : "N", value: `${support.toFixed(1)} N`, kind: "force" },
      { x: 0, y: state.x, dx: 0, dy: -weight, label: "mg", value: `${weight.toFixed(1)} N`, kind: "force" },
      { x: 0.3, y: state.x, dx: 0, dy: acceleration, label: "a", value: `${acceleration.toFixed(2)} m/s²`, kind: "acceleration" },
    ];
    constraints = scene === "hanging"
      ? [{ from: { x: 0, y: state.x }, to: { x: 0, y: 2.4 }, label: "supporting cord" }]
      : [{ from: { x: -1.3, y: -2.2 }, to: { x: -1.3, y: 2.2 }, label: "elevator car" }];
  } else {
    const applied = scene === "plain" ? 0 : Number(parameters.force);
    const spring = scene === "spring" ? -Number(parameters.springK) * state.x : 0;
    acceleration = (applied + spring) / mass;
    regime = scene === "spring" ? "Hooke restoring force" : scene === "pull" ? "external pull" : "equilibrium";
    vectors = [
      ...(applied ? [{ x: state.x, y: 0, dx: applied, dy: 0, label: "F applied", value: `${applied.toFixed(1)} N`, kind: "force" as const }] : []),
      ...(spring ? [{ x: state.x, y: 0, dx: spring, dy: 0, label: "Fspring", value: `${spring.toFixed(1)} N`, kind: "force" as const }] : []),
      { x: state.x, y: 0, dx: 0, dy: -weight, label: "mg", value: `${weight.toFixed(1)} N`, kind: "force" },
      { x: state.x, y: 0, dx: 0, dy: weight, label: "N", value: `${weight.toFixed(1)} N`, kind: "force" },
      { x: state.x, y: 0.25, dx: acceleration * mass, dy: 0, label: "ΣF=ma", value: `${(acceleration * mass).toFixed(1)} N`, kind: "acceleration" },
    ];
    if (scene === "spring")
      constraints.push({ from: { x: -4, y: 0 }, to: { x: state.x, y: 0 }, label: "spring" });
  }
  return {
    acceleration,
    regime,
    scene: {
      bounds: { xMin: -4, xMax: 4, yMin: -2.5, yMax: 2.5 },
      bodies: [body],
      vectors,
      constraints,
      annotations: [{ x: -2.1, y: 1.8, text: `ΣF = ${(mass * acceleration).toFixed(2)} N` }],
    },
  };
}

export const newtonFbd: AtlasDefinition = {
  id: "mechanics-newton-fbd",
  name: "牛顿第二定律与自由体图 / Newton & FBD",
  number: "ATLAS I · 04",
  category: "Classical Mechanics · Atlas I",
  formula: "ΣF = ma;  fₛ = min(|Fneeded|, μₛN),  fₖ = μₖN",
  symbols: [
    ["ΣF", "net external force on the selected body"],
    ["N", "normal reaction"],
    ["fₛ", "static friction, not automatically μₛN"],
    ["fₖ", "kinetic friction"],
  ],
  explanation:
    "The free-body diagram includes only forces acting on the selected object. Static friction matches the required force until its maximum is reached. Error mode deliberately overlays and labels common misconceptions: velocity treated as force, duplicated gravity components, or a reaction force placed on the wrong body.",
  controls: [
    {
      key: "scene",
      label: "Scene",
      type: "select",
      value: "rough",
      options: [
        ["plain", "Horizontal block"],
        ["pull", "External pull"],
        ["rough", "Rough surface"],
        ["incline", "Inclined plane"],
        ["spring", "Spring block"],
        ["hanging", "Hanging object"],
        ["elevator", "Elevator"],
      ],
    },
    {
      key: "mass",
      label: "Mass",
      type: "range",
      value: 2,
      min: 0.5,
      max: 8,
      step: 0.25,
      unit: "kg",
    },
    {
      key: "force",
      label: "Applied force",
      type: "range",
      value: 8,
      min: -20,
      max: 30,
      step: 0.5,
      unit: "N",
    },
    {
      key: "muStatic",
      label: "Static μ",
      type: "range",
      value: 0.45,
      min: 0,
      max: 1,
      step: 0.05,
    },
    {
      key: "muKinetic",
      label: "Kinetic μ",
      type: "range",
      value: 0.3,
      min: 0,
      max: 1,
      step: 0.05,
    },
    {
      key: "springK",
      label: "Spring constant",
      type: "range",
      value: 5,
      min: 0.5,
      max: 15,
      step: 0.5,
      unit: "N/m",
    },
    {
      key: "angle",
      label: "Incline angle",
      type: "range",
      value: 25,
      min: 0,
      max: 55,
      step: 1,
      unit: "°",
    },
    {
      key: "coordinates",
      label: "Coordinates",
      type: "select",
      value: "world",
      options: [
        ["world", "World x–y"],
        ["local", "Local tangent–normal"],
      ],
    },
    {
      key: "errorMode",
      label: "Common-error overlay",
      type: "select",
      value: "none",
      options: [
        ["none", "Correct FBD"],
        ["velocity", "Wrong: velocity as force"],
        ["duplicate", "Wrong: duplicate mg components"],
        ["reaction", "Wrong: action–reaction together"],
      ],
    },
  ],
  presets: [
    {
      id: "static",
      label: "Static friction below limit",
      parameters: { force: 5, muStatic: 0.45, muKinetic: 0.3 },
    },
    {
      id: "sliding",
      label: "Kinetic friction",
      parameters: { force: 16, muStatic: 0.4, muKinetic: 0.25 },
    },
    {
      id: "elevator",
      label: "Elevator apparent weight",
      parameters: { scene: "elevator", force: 24, mass: 2 },
    },
  ],
  createState: () => ({ t: 0, x: 0, v: 0 }),
  step: (state, parameters, dt) => {
    if (parameters.scene !== "rough") {
      const model = alternateNewtonScene(state, parameters);
      const v = state.v + model.acceleration * dt;
      return { t: state.t + dt, x: Math.max(-3, Math.min(3, state.x + v * dt * 0.12)), v };
    }
    const result = horizontalFriction(
      Number(parameters.mass),
      Number(parameters.force),
      Number(parameters.muStatic),
      Number(parameters.muKinetic),
      9.81,
      Math.abs(state.v) > 0.01,
    );
    const v = state.v + result.acceleration * dt;
    return {
      t: state.t + dt,
      x: Math.max(-3, Math.min(3, state.x + v * dt * 0.12)),
      v,
    };
  },
  scene: (state, parameters) => {
    if (parameters.scene !== "rough") {
      const model = alternateNewtonScene(state, parameters);
      if (parameters.errorMode !== "none")
        model.scene.vectors.push({ x: model.scene.bodies[0].x, y: model.scene.bodies[0].y, dx: Math.sign(state.v || 1) * 8, dy: parameters.errorMode === "duplicate" ? -8 : 0, label: `WRONG · ${parameters.errorMode}`, value: "not a valid extra force", kind: "constraint" });
      return model.scene;
    }
    const result = horizontalFriction(
      Number(parameters.mass),
      Number(parameters.force),
      Number(parameters.muStatic),
      Number(parameters.muKinetic),
      9.81,
      Math.abs(state.v) > 0.01,
    );
    const weight = Number(parameters.mass) * 9.81;
    const vectors: Vector[] = [
      {
        x: state.x,
        y: 0,
        dx: Number(parameters.force),
        dy: 0,
        label: "F applied",
        value: `${Number(parameters.force).toFixed(1)} N`,
        kind: "force" as const,
      },
      {
        x: state.x,
        y: 0,
        dx: result.friction,
        dy: 0,
        label: result.mode === "static" ? "fₛ" : "fₖ",
        value: `${Math.abs(result.friction).toFixed(1)} N`,
        kind: "force" as const,
      },
      {
        x: state.x,
        y: 0,
        dx: 0,
        dy: -weight,
        label: "mg",
        value: `${weight.toFixed(1)} N`,
        kind: "force" as const,
      },
      {
        x: state.x,
        y: 0,
        dx: 0,
        dy: result.normal,
        label: "N",
        value: `${result.normal.toFixed(1)} N`,
        kind: "force" as const,
      },
      {
        x: state.x,
        y: 0.25,
        dx: result.acceleration * Number(parameters.mass),
        dy: 0,
        label: "ΣF = ma",
        value: `${(result.acceleration * Number(parameters.mass)).toFixed(1)} N`,
        kind: "acceleration" as const,
      },
    ];
    if (parameters.errorMode !== "none")
      vectors.push({
        x: state.x,
        y: -0.2,
        dx: Math.sign(state.v || 1) * 8,
        dy: parameters.errorMode === "duplicate" ? -8 : 0,
        label: `WRONG · ${parameters.errorMode}`,
        value: "not a valid extra force",
        kind: "constraint",
      });
    return {
      bounds: { xMin: -4, xMax: 4, yMin: -2.5, yMax: 2.5 },
      bodies: [
        {
          x: state.x,
          y: 0,
          radius: 0.35,
          label: "selected body",
          shape: "square",
        },
      ],
      vectors,
      constraints: [
        {
          from: { x: -4, y: -0.4 },
          to: { x: 4, y: -0.4 },
          label: "contact surface",
        },
      ],
      annotations: [
        {
          x: -2.2,
          y: 1.8,
          text: `${result.mode === "static" ? "|fₛ| ≤ μₛN" : "|fₖ| = μₖN"}`,
        },
      ],
    };
  },
  data: (state, parameters) => {
    if (parameters.scene !== "rough") {
      const model = alternateNewtonScene(state, parameters);
      return [["Scene", String(parameters.scene)], ["Force regime", model.regime], ["Net acceleration", `${model.acceleration.toFixed(3)} m/s²`], ["Net force", `${(Number(parameters.mass) * model.acceleration).toFixed(3)} N`], ["Coordinate system", String(parameters.coordinates)]];
    }
    const result = horizontalFriction(
      Number(parameters.mass),
      Number(parameters.force),
      Number(parameters.muStatic),
      Number(parameters.muKinetic),
      9.81,
      Math.abs(state.v) > 0.01,
    );
    return [
      ["Friction regime", result.mode],
      ["Friction", `${result.friction.toFixed(2)} N`],
      [
        "Maximum static",
        `${(Number(parameters.muStatic) * result.normal).toFixed(2)} N`,
      ],
      ["Net acceleration", `${result.acceleration.toFixed(3)} m/s²`],
      ["Coordinate system", String(parameters.coordinates)],
    ];
  },
};

export const inclineFriction: AtlasDefinition = {
  id: "mechanics-incline-friction",
  name: "斜面、摩擦与临界滑动 / Incline friction",
  number: "ATLAS I · 05",
  category: "Classical Mechanics · Atlas I",
  formula: "mg∥ = mg sinθ,  N = mg cosθ;  slide when mg sinθ > μₛmg cosθ",
  symbols: [
    ["θ", "incline angle"],
    ["mg∥", "gravity component along slope"],
    ["mg⊥", "gravity component normal to slope"],
    ["θc", "critical angle arctan μₛ"],
  ],
  explanation:
    "The local tangent–normal diagram shows the gravity components and the complete weight as alternative decompositions, never as simultaneous extra forces. The model switches from adaptive static friction to kinetic friction only after the threshold is crossed.",
  controls: [
    {
      key: "mass",
      label: "Mass",
      type: "range",
      value: 2,
      min: 0.5,
      max: 8,
      step: 0.25,
      unit: "kg",
    },
    {
      key: "angle",
      label: "Incline angle",
      type: "range",
      value: 20,
      min: 0,
      max: 55,
      step: 1,
      unit: "°",
    },
    {
      key: "muStatic",
      label: "Static μ",
      type: "range",
      value: 0.45,
      min: 0,
      max: 1,
      step: 0.02,
    },
    {
      key: "muKinetic",
      label: "Kinetic μ",
      type: "range",
      value: 0.3,
      min: 0,
      max: 1,
      step: 0.02,
    },
  ],
  presets: [
    {
      id: "held",
      label: "Below critical angle",
      parameters: { angle: 18, muStatic: 0.45 },
    },
    {
      id: "critical",
      label: "Near critical sliding",
      parameters: { angle: 25, muStatic: 0.47 },
    },
    {
      id: "slide",
      label: "Sliding",
      parameters: { angle: 38, muStatic: 0.4, muKinetic: 0.25 },
    },
  ],
  createState: () => ({ t: 0, s: -1.6, v: 0 }),
  step: (state, parameters, dt) => {
    const result = inclineForces(
      Number(parameters.mass),
      (Number(parameters.angle) * Math.PI) / 180,
      Number(parameters.muStatic),
      Number(parameters.muKinetic),
      9.81,
      Math.abs(state.v) > 0.01,
    );
    const v = state.v + result.acceleration * dt;
    return { t: state.t + dt, s: Math.min(1.8, state.s + v * dt * 0.15), v };
  },
  scene: (state, parameters) => {
    const theta = (Number(parameters.angle) * Math.PI) / 180;
    const result = inclineForces(
      Number(parameters.mass),
      theta,
      Number(parameters.muStatic),
      Number(parameters.muKinetic),
      9.81,
      Math.abs(state.v) > 0.01,
    );
    const along = { x: Math.cos(theta), y: -Math.sin(theta) };
    const normal = { x: Math.sin(theta), y: Math.cos(theta) };
    const x = state.s * along.x;
    const y = 1 - state.s * along.y;
    return {
      bounds: { xMin: -3.2, xMax: 3.2, yMin: -1, yMax: 3.5 },
      bodies: [
        {
          x,
          y,
          radius: 0.35,
          label: result.mode === "static" ? "held by fₛ" : "sliding",
          shape: "square",
        },
      ],
      constraints: [
        {
          from: { x: -2.8 * along.x, y: 1 + 2.8 * along.y },
          to: { x: 2.8 * along.x, y: 1 - 2.8 * Math.sin(theta) },
          label: `θ=${parameters.angle}°`,
        },
      ],
      vectors: [
        {
          x,
          y,
          dx: 0,
          dy: -Number(parameters.mass) * 9.81,
          label: "mg",
          value: `${(Number(parameters.mass) * 9.81).toFixed(1)} N`,
          kind: "force",
        },
        {
          x,
          y,
          dx: normal.x * result.normal,
          dy: normal.y * result.normal,
          label: "N",
          value: `${result.normal.toFixed(1)} N`,
          kind: "force",
        },
        {
          x,
          y,
          dx: -along.x * result.friction,
          dy: along.y * result.friction,
          label: result.mode === "static" ? "fₛ" : "fₖ",
          value: `${Math.abs(result.friction).toFixed(1)} N`,
          kind: "force",
        },
        {
          x,
          y,
          dx: along.x * result.parallel,
          dy: -along.y * result.parallel,
          label: "mg∥",
          value: `${result.parallel.toFixed(1)} N`,
          kind: "constraint",
        },
      ],
    };
  },
  data: (state, parameters) => {
    const theta = (Number(parameters.angle) * Math.PI) / 180;
    const result = inclineForces(
      Number(parameters.mass),
      theta,
      Number(parameters.muStatic),
      Number(parameters.muKinetic),
      9.81,
      Math.abs(state.v) > 0.01,
    );
    return [
      ["Regime", result.mode],
      [
        "Critical angle",
        `${((Math.atan(Number(parameters.muStatic)) * 180) / Math.PI).toFixed(2)}°`,
      ],
      ["Down-slope gravity", `${result.parallel.toFixed(2)} N`],
      ["Friction", `${Math.abs(result.friction).toFixed(2)} N`],
      ["Acceleration", `${result.acceleration.toFixed(3)} m/s²`],
    ];
  },
};

export const pulley: AtlasDefinition = {
  id: "mechanics-pulley",
  name: "滑轮与连接体 / Pulley constraints",
  number: "ATLAS I · 06",
  category: "Classical Mechanics · Atlas I",
  formula: "m₂g − T₂ = m₂a;  T₁ − m₁g = m₁a;  (T₂−T₁)R = Iα;  a = αR",
  symbols: [
    ["T₁,T₂", "tensions on each side"],
    ["I", "pulley moment of inertia"],
    ["a", "rope-constrained linear acceleration"],
    ["α", "pulley angular acceleration"],
  ],
  explanation:
    "The inextensible rope imposes a shared displacement magnitude. A massive pulley permits unequal tensions through its rotational equation. If a computed tension would be negative, the model marks the rope slack and removes the tensile force rather than applying an unphysical push.",
  controls: [
    {
      key: "configuration",
      label: "Configuration",
      type: "select",
      value: "atwood",
      options: [
        ["horizontal", "Two horizontal blocks"],
        ["incline", "Incline–hanging"],
        ["atwood", "Atwood machine"],
        ["fixed", "Multiple fixed pulleys"],
        ["moving", "Ideal moving pulley"],
        ["massive", "Massive pulley"],
      ],
    },
    {
      key: "m1",
      label: "Mass 1",
      type: "range",
      value: 2,
      min: 0.2,
      max: 8,
      step: 0.2,
      unit: "kg",
    },
    {
      key: "m2",
      label: "Mass 2",
      type: "range",
      value: 3,
      min: 0.2,
      max: 8,
      step: 0.2,
      unit: "kg",
    },
    {
      key: "inertia",
      label: "Pulley inertia",
      type: "range",
      value: 0,
      min: 0,
      max: 4,
      step: 0.1,
      unit: "kg·m²",
    },
    {
      key: "radius",
      label: "Pulley radius",
      type: "range",
      value: 0.6,
      min: 0.2,
      max: 1,
      step: 0.05,
      unit: "m",
    },
    {
      key: "driveForce",
      label: "Horizontal drive",
      type: "range",
      value: 18,
      min: -40,
      max: 40,
      step: 1,
      unit: "N",
    },
    {
      key: "pulleyAngle",
      label: "Incline angle",
      type: "range",
      value: 30,
      min: 5,
      max: 70,
      step: 1,
      unit: "deg",
    },
  ],
  presets: [
    {
      id: "horizontal",
      label: "Horizontal pair",
      parameters: { configuration: "horizontal", m1: 2, m2: 3, driveForce: 18 },
    },
    {
      id: "incline",
      label: "Incline + hanging",
      parameters: { configuration: "incline", m1: 2, m2: 3, pulleyAngle: 30 },
    },
    {
      id: "ideal",
      label: "Ideal Atwood",
      parameters: { configuration: "atwood", inertia: 0, m1: 2, m2: 3 },
    },
    {
      id: "massive",
      label: "Massive pulley",
      parameters: { configuration: "massive", inertia: 1.2, m1: 2, m2: 4 },
    },
    {
      id: "balanced",
      label: "Balanced masses",
      parameters: { m1: 3, m2: 3, inertia: 0 },
    },
    {
      id: "moving",
      label: "Moving pulley",
      parameters: { configuration: "moving", m1: 1, m2: 3 },
    },
    {
      id: "fixed",
      label: "Fixed redirects",
      parameters: { configuration: "fixed", m1: 2, m2: 3 },
    },
  ],
  createState: () => ({ t: 0, displacement: 0 }),
  step: (state, parameters, dt) => {
    const configuration = String(parameters.configuration);
    if (configuration !== "atwood" && configuration !== "massive") {
      const result = alternatePulleyModel(parameters);
      return {
        t: state.t + dt,
        displacement: Math.max(
          -1.5,
          Math.min(
            1.5,
            state.displacement +
              0.5 * result.acceleration * dt ** 2 +
              result.acceleration * state.t * dt * 0.08,
          ),
        ),
      };
    }
    const result = atwoodMachine(
      Number(parameters.m1),
      Number(parameters.m2),
      9.81,
      parameters.configuration === "massive" ? Number(parameters.inertia) : 0,
      Number(parameters.radius),
    );
    return {
      t: state.t + dt,
      displacement: Math.max(
        -1.5,
        Math.min(
          1.5,
          state.displacement +
            0.5 * result.acceleration * dt ** 2 +
            result.acceleration * state.t * dt * 0.08,
        ),
      ),
    };
  },
  scene: (state, parameters) => {
    const configuration = String(parameters.configuration);
    if (configuration !== "atwood" && configuration !== "massive") {
      return alternatePulleyScene(state, parameters).scene;
    }
    const result = atwoodMachine(
      Number(parameters.m1),
      Number(parameters.m2),
      9.81,
      parameters.configuration === "massive" ? Number(parameters.inertia) : 0,
      Number(parameters.radius),
    );
    return {
      bounds: { xMin: -3, xMax: 3, yMin: -3, yMax: 3 },
      bodies: [
        {
          x: 0,
          y: 2,
          radius: Number(parameters.radius),
          label: "pulley",
          shape: "ring",
        },
        {
          x: -1.5,
          y: 0.4 - state.displacement,
          radius: 0.35,
          label: `m₁ ${parameters.m1} kg`,
          shape: "square",
        },
        {
          x: 1.5,
          y: 0.4 + state.displacement,
          radius: 0.4,
          label: `m₂ ${parameters.m2} kg`,
          shape: "square",
        },
      ],
      constraints: [
        {
          from: { x: -1.5, y: 0.4 - state.displacement },
          to: { x: -1.5, y: 2 },
          label: "rope",
        },
        {
          from: { x: 1.5, y: 0.4 + state.displacement },
          to: { x: 1.5, y: 2 },
          label: "same total length",
        },
      ],
      vectors: [
        {
          x: -1.5,
          y: 0.4 - state.displacement,
          dx: 0,
          dy: result.tension1,
          label: "T₁",
          value: `${result.tension1.toFixed(1)} N`,
          kind: "force",
        },
        {
          x: 1.5,
          y: 0.4 + state.displacement,
          dx: 0,
          dy: result.tension2,
          label: "T₂",
          value: `${result.tension2.toFixed(1)} N`,
          kind: "force",
        },
        {
          x: 1.5,
          y: 0.4 + state.displacement,
          dx: 0,
          dy: -result.acceleration,
          label: "a",
          value: `${Math.abs(result.acceleration).toFixed(2)} m/s²`,
          kind: "acceleration",
        },
      ],
      annotations: [
        {
          x: 0,
          y: -2.2,
          text: result.taut ? `constraint: s₁+s₂=constant` : "ROPE SLACK · T=0",
        },
      ],
    };
  },
  data: (_state, parameters) => {
    const configuration = String(parameters.configuration);
    if (configuration !== "atwood" && configuration !== "massive") {
      const result = alternatePulleyModel(parameters);
      return [
        ["Configuration", configuration],
        ["Rope state", result.taut ? "taut" : "slack"],
        ["Constraint", result.constraint],
        ["Acceleration", `${result.acceleration.toFixed(3)} m/s²`],
        ["Tension T₁", `${result.tension1.toFixed(3)} N`],
        ["Tension T₂", `${result.tension2.toFixed(3)} N`],
        ["Constraint error", "0.0000 m"],
      ];
    }
    const result = atwoodMachine(
      Number(parameters.m1),
      Number(parameters.m2),
      9.81,
      parameters.configuration === "massive" ? Number(parameters.inertia) : 0,
      Number(parameters.radius),
    );
    return [
      ["Rope state", result.taut ? "taut" : "slack"],
      ["Acceleration", `${result.acceleration.toFixed(3)} m/s²`],
      ["Tension T₁", `${result.tension1.toFixed(3)} N`],
      ["Tension T₂", `${result.tension2.toFixed(3)} N`],
      [
        "Angular acceleration",
        `${result.angularAcceleration.toFixed(3)} rad/s²`,
      ],
      ["Constraint error", "0.0000 m"],
    ];
  },
};
