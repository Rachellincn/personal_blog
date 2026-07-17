import type { AtlasDefinition, AtlasParameters } from "../core/atlas-types";
import { evaluateExpression } from "../models/expression";
import {
  angularMomentum,
  coupledDiscs,
  momentOfInertia,
  parallelAxis,
  radiusOfGyration,
  rollingAcceleration,
  rollingContactVelocity,
  steadyPrecession,
  torque2D,
  type RigidShape,
} from "../models/rotation";

function selectedAlpha(time: number, parameters: AtlasParameters) {
  const mode = String(parameters.mode);
  if (mode === "uniform") return 0;
  if (mode === "segmented") return time % 6 < 2 ? Number(parameters.alpha) : time % 6 < 4 ? -Number(parameters.alpha) : 0;
  if (mode === "custom")
    return evaluateExpression(String(parameters.alphaFunction), { t: time }, 0);
  return Number(parameters.alpha);
}

function rotationAt(time: number, parameters: AtlasParameters) {
  const dt = 1 / 240;
  let theta = Number(parameters.theta0);
  let omega = Number(parameters.omega0);
  let elapsed = 0;
  while (elapsed + dt < time) {
    const alpha = selectedAlpha(elapsed, parameters);
    theta += omega * dt + 0.5 * alpha * dt ** 2;
    omega += alpha * dt;
    elapsed += dt;
  }
  const remainder = time - elapsed;
  const alpha = selectedAlpha(elapsed, parameters);
  theta += omega * remainder + 0.5 * alpha * remainder ** 2;
  omega += alpha * remainder;
  return { theta, omega, alpha };
}

export const rotationKinematics: AtlasDefinition = {
  id: "mechanics-rotation-kinematics",
  name: "转动运动学 / Rotational kinematics",
  number: "ATLAS II · 01",
  category: "Classical Mechanics · Atlas II",
  duration: 8,
  formula: "ω=dθ/dt,  α=dω/dt;  s=rθ,  vₜ=rω,  aₜ=rα",
  symbols: [["θ", "angular position"], ["ω", "angular velocity"], ["α", "angular acceleration"], ["r", "distance of selected point from axis"]],
  explanation: "Angular and linear quantities share one clock. Segment and sinusoidal custom modes are integrated without smoothing across acceleration changes. Drag the linked plots to scrub the selected point and rotating body together.",
  controls: [
    { key: "mode", label: "Angular motion", type: "select", value: "uniform", options: [["uniform", "匀角速度"], ["accelerated", "匀角加速"], ["segmented", "分段角加速度"], ["custom", "α(t)=α₀sin(Ωt)"]] },
    { key: "theta0", label: "Initial θ", type: "range", value: 0, min: -3.14, max: 3.14, step: 0.05, unit: "rad" },
    { key: "omega0", label: "Initial ω", type: "range", value: 1.2, min: -3, max: 5, step: 0.1, unit: "rad/s" },
    { key: "alpha", label: "Angular α scale", type: "range", value: 0.5, min: -2, max: 2, step: 0.05, unit: "rad/s²" },
    { key: "frequency", label: "Custom Ω", type: "range", value: 1, min: 0.2, max: 3, step: 0.1, unit: "rad/s" },
    { key: "alphaFunction", label: "Custom α(t)", type: "text", value: "0.8*sin(1.2*t)" },
    { key: "radius", label: "Selected radius", type: "range", value: 1.5, min: 0.4, max: 2.5, step: 0.1, unit: "m" },
  ],
  presets: [
    { id: "uniform", label: "匀角速度", parameters: { mode: "uniform", omega0: 1.2 } },
    { id: "accelerated", label: "匀角加速", parameters: { mode: "accelerated", omega0: 0.3, alpha: 0.6 } },
    { id: "segments", label: "分段 α(t)", parameters: { mode: "segmented", alpha: 0.8 } },
    { id: "custom", label: "自定义 α(t)", parameters: { mode: "custom", alphaFunction: "0.8*sin(1.2*t)" } },
  ],
  createState: (parameters) => ({ t: 0, ...rotationAt(0, parameters) }),
  stateAt: (time, parameters) => ({ t: time, ...rotationAt(time, parameters) }),
  step: (state, parameters, dt) => ({ t: (state.t + dt) % 8, ...rotationAt((state.t + dt) % 8, parameters) }),
  scene: (state, parameters) => {
    const radius = Number(parameters.radius);
    const point = { x: radius * Math.cos(state.theta), y: radius * Math.sin(state.theta) };
    const samples = Array.from({ length: 121 }, (_, index) => ({ t: index / 15, ...rotationAt(index / 15, parameters) }));
    return {
      bounds: { xMin: -3, xMax: 3, yMin: -3, yMax: 3 },
      bodies: [{ ...point, radius: 0.18, label: "selected point" }, { x: 0, y: 0, radius: 0.08, label: "axis" }],
      constraints: [{ from: { x: 0, y: 0 }, to: point, label: `r=${radius.toFixed(1)} m` }],
      vectors: [
        { ...point, dx: -radius * state.omega * Math.sin(state.theta), dy: radius * state.omega * Math.cos(state.theta), label: "vₜ", value: `${(radius * Math.abs(state.omega)).toFixed(2)} m/s`, kind: "velocity" },
        { ...point, dx: -radius * state.alpha * Math.sin(state.theta), dy: radius * state.alpha * Math.cos(state.theta), label: "aₜ", value: `${(radius * Math.abs(state.alpha)).toFixed(2)} m/s²`, kind: "acceleration" },
      ],
      curves: [{ label: "rotation path", kind: "constraint", points: Array.from({ length: 80 }, (_, index) => ({ x: radius * Math.cos(index / 79 * Math.PI * 2), y: radius * Math.sin(index / 79 * Math.PI * 2) })) }],
      plots: [
        { title: "θ–t", cursor: state.t, series: [{ label: "θ", points: samples.map((sample) => ({ x: sample.t, y: sample.theta })) }] },
        { title: "ω–t", cursor: state.t, series: [{ label: "ω", points: samples.map((sample) => ({ x: sample.t, y: sample.omega })) }] },
        { title: "α–t", cursor: state.t, series: [{ label: "α", points: samples.map((sample) => ({ x: sample.t, y: sample.alpha })) }] },
      ],
    };
  },
  data: (state, parameters) => [["Angle", `${state.theta.toFixed(3)} rad`], ["Angular velocity", `${state.omega.toFixed(3)} rad/s`], ["Angular acceleration", `${state.alpha.toFixed(3)} rad/s²`], ["Tangential speed", `${(Number(parameters.radius) * Math.abs(state.omega)).toFixed(3)} m/s`]],
};

export const torqueEquilibrium: AtlasDefinition = {
  id: "mechanics-torque-equilibrium",
  name: "力矩与静力平衡 / Torque & equilibrium",
  number: "ATLAS II · 02",
  category: "Classical Mechanics · Atlas II",
  formula: "ΣF=0 and ΣτO=0;  τ=r×F=F d⊥",
  symbols: [["τ", "signed torque about the support"], ["d⊥", "perpendicular moment arm"], ["R", "support reaction"], ["O", "chosen pivot"]],
  explanation: "Static equilibrium requires both zero net force and zero net torque. Force application points are draggable; support reactions are recomputed, and clockwise/counter-clockwise sums remain separately visible.",
  controls: [
    { key: "scene", label: "Statics scene", type: "select", value: "lever", options: [["lever", "Lever"], ["rod", "Multi-force rod"], ["ladder", "Ladder against wall"], ["cantilever", "Simplified cantilever"], ["center", "Movable centre of gravity"]] },
    { key: "force1", label: "Force 1", type: "range", value: -8, min: -20, max: 20, step: 0.5, unit: "N" },
    { key: "force2", label: "Force 2", type: "range", value: 6, min: -20, max: 20, step: 0.5, unit: "N" },
    { key: "arm1", label: "Arm 1", type: "range", value: -1.5, min: -2.5, max: 2.5, step: 0.1, unit: "m" },
    { key: "arm2", label: "Arm 2", type: "range", value: 2, min: -2.5, max: 2.5, step: 0.1, unit: "m" },
    { key: "support", label: "Support position", type: "range", value: 0, min: -1.5, max: 1.5, step: 0.1, unit: "m" },
  ],
  presets: [
    { id: "balanced", label: "Balanced lever", parameters: { force1: -8, arm1: -1.5, force2: -6, arm2: 2 } },
    { id: "unbalanced", label: "Unbalanced torques", parameters: { force1: -12, arm1: -2, force2: -4, arm2: 1 } },
    { id: "ladder", label: "Ladder reactions", parameters: { scene: "ladder", support: -1 } },
  ],
  createState: (parameters) => ({ t: 0, arm1: Number(parameters.arm1), arm2: Number(parameters.arm2) }),
  step: (state, _parameters, dt) => ({ ...state, t: state.t + dt }),
  scene: (state, parameters) => {
    const sceneName = String(parameters.scene);
    const support = sceneName === "cantilever" ? -2.4 : Number(parameters.support);
    const ladderStart = { x: -2.2, y: -1.35 };
    const ladderEnd = { x: 1.75, y: 1.35 };
    const pointOnLadder = (arm: number) => {
      const fraction = Math.max(0, Math.min(1, (arm + 2.5) / 5));
      return {
        x: ladderStart.x + (ladderEnd.x - ladderStart.x) * fraction,
        y: ladderStart.y + (ladderEnd.y - ladderStart.y) * fraction,
      };
    };
    const p1 = sceneName === "ladder" ? pointOnLadder(state.arm1) : { x: state.arm1, y: 0 };
    const p2 = sceneName === "ladder" ? pointOnLadder(state.arm2) : { x: state.arm2, y: 0 };
    const supportPoint = sceneName === "ladder" ? ladderStart : { x: support, y: 0 };
    const r1 = { x: p1.x - supportPoint.x, y: p1.y - supportPoint.y };
    const r2 = { x: p2.x - supportPoint.x, y: p2.y - supportPoint.y };
    const f1 = { x: 0, y: Number(parameters.force1) };
    const f2 = { x: 0, y: Number(parameters.force2) };
    const reaction = -(f1.y + f2.y);
    const tau1 = torque2D(r1, f1);
    const tau2 = torque2D(r2, f2);
    const wallReaction = sceneName === "ladder" ? (tau1 + tau2) / Math.max(0.1, ladderEnd.y - ladderStart.y) : 0;
    const beam = sceneName === "ladder"
      ? { from: ladderStart, to: ladderEnd, label: "ladder · wall and floor contacts" }
      : sceneName === "cantilever"
        ? { from: { x: -2.4, y: 0 }, to: { x: 2.5, y: 0 }, label: "cantilever · fixed end supplies force + moment" }
        : { from: { x: -2.7, y: 0 }, to: { x: 2.7, y: 0 }, label: sceneName === "center" ? "body · movable centre of gravity" : sceneName === "rod" ? "multi-force rod" : "lever" };
    return {
      bounds: { xMin: -3, xMax: 3, yMin: -2, yMax: 2 },
      bodies: [
        { x: supportPoint.x, y: supportPoint.y, radius: 0.18, label: sceneName === "cantilever" ? "fixed O" : "support O" },
        ...(sceneName === "center" ? [{ x: (p1.x + p2.x) / 2, y: 0, radius: 0.13, label: "CG", shape: "ring" as const }] : []),
        ...(sceneName === "ladder" ? [{ x: ladderEnd.x, y: ladderEnd.y, radius: 0.12, label: "wall contact", shape: "ring" as const }] : []),
      ],
      constraints: [beam],
      vectors: [
        { x: p1.x, y: p1.y, dx: 0, dy: f1.y, label: "F₁", value: `${f1.y.toFixed(1)} N`, kind: "force" },
        { x: p2.x, y: p2.y, dx: 0, dy: f2.y, label: "F₂", value: `${f2.y.toFixed(1)} N`, kind: "force" },
        { x: supportPoint.x, y: supportPoint.y, dx: sceneName === "ladder" ? -wallReaction : 0, dy: reaction, label: "R", value: `${reaction.toFixed(1)} N`, kind: "force" },
        ...(sceneName === "ladder" ? [{ x: ladderEnd.x, y: ladderEnd.y, dx: wallReaction, dy: 0, label: "Nwall", value: `${wallReaction.toFixed(1)} N`, kind: "force" as const }] : []),
      ],
      annotations: [
        { x: -1.7, y: 1.3, text: `ΣτCW=${Math.min(0, tau1) + Math.min(0, tau2)}` },
        { x: 1.7, y: 1.3, text: `ΣτCCW=${Math.max(0, tau1) + Math.max(0, tau2)}` },
        ...(sceneName === "cantilever" ? [{ x: -1.7, y: -1.35, text: `fixed-end moment=${(-(tau1 + tau2)).toFixed(2)} N·m` }] : []),
      ],
    };
  },
  data: (state, parameters) => {
    const support = Number(parameters.support);
    const tau1 = (state.arm1 - support) * Number(parameters.force1);
    const tau2 = (state.arm2 - support) * Number(parameters.force2);
    const netForce = Number(parameters.force1) + Number(parameters.force2) - Number(parameters.force1) - Number(parameters.force2);
    return [["Net force", `${netForce.toFixed(3)} N`], ["Net torque", `${(tau1 + tau2).toFixed(3)} N·m`], ["Force balance", Math.abs(netForce) < 1e-9 ? "satisfied" : "not satisfied"], ["Torque balance", Math.abs(tau1 + tau2) < 0.05 ? "satisfied" : "not satisfied"], ["Support reaction", `${(-(Number(parameters.force1) + Number(parameters.force2))).toFixed(2)} N`]];
  },
  drag: (point, state) => ({ ...state, arm1: Math.max(-2.5, Math.min(2.5, point.x * 3)) }),
};

const shapes: RigidShape[] = ["point", "ring", "disc", "sphere", "shell", "rod", "plate"];
export const inertiaLab: AtlasDefinition = {
  id: "mechanics-inertia-lab",
  name: "刚体转动惯量 / Moment of inertia lab",
  number: "ATLAS II · 03",
  category: "Classical Mechanics · Atlas II",
  formula: "I=∫r²dm;  I=Icm+Md²;  kz=√(I/M)",
  symbols: [["I", "moment of inertia about selected axis"], ["d", "axis offset"], ["kz", "radius of gyration"], ["dm", "mass element contribution"]],
  explanation: "Mass distribution, not mass alone, determines rotational response. The lab compares standard bodies, discrete mass elements and shifted axes using the parallel-axis theorem; planar shapes also expose the perpendicular-axis relation.",
  controls: [
    { key: "shape", label: "Mass distribution", type: "select", value: "disc", options: shapes.map((shape) => [shape, shape]) },
    { key: "mass", label: "Mass", type: "range", value: 2, min: 0.2, max: 8, step: 0.2, unit: "kg" },
    { key: "size", label: "Radius / length", type: "range", value: 1.2, min: 0.2, max: 2.5, step: 0.1, unit: "m" },
    { key: "axis", label: "Axis offset", type: "range", value: 0, min: 0, max: 2, step: 0.05, unit: "m" },
    { key: "torque", label: "Applied torque", type: "range", value: 4, min: 0.2, max: 12, step: 0.2, unit: "N·m" },
  ],
  presets: [
    { id: "compare", label: "Ring vs disc", parameters: { shape: "ring", mass: 2, size: 1.2 } },
    { id: "parallel", label: "Parallel-axis theorem", parameters: { shape: "rod", axis: 1 } },
    { id: "points", label: "Discrete point masses", parameters: { shape: "point", axis: 0.6 } },
  ],
  createState: () => ({ t: 0, theta: 0, omega: 0 }),
  step: (state, parameters, dt) => {
    const base = momentOfInertia(String(parameters.shape) as RigidShape, Number(parameters.mass), Number(parameters.size));
    const inertia = parallelAxis(base, Number(parameters.mass), Number(parameters.axis));
    const alpha = Number(parameters.torque) / inertia;
    return { t: state.t + dt, theta: state.theta + state.omega * dt + 0.5 * alpha * dt ** 2, omega: state.omega + alpha * dt };
  },
  scene: (state, parameters) => {
    const mass = Number(parameters.mass);
    const size = Number(parameters.size);
    const axis = Number(parameters.axis);
    const shape = String(parameters.shape) as RigidShape;
    const base = momentOfInertia(shape, mass, size);
    const inertia = parallelAxis(base, mass, axis);
    const response = shapes.map((shape, index) => ({ x: index, y: Number(parameters.torque) / momentOfInertia(shape, mass, size) }));
    const rotate = (x: number, y: number) => ({
      x: axis + x * Math.cos(state.theta) - y * Math.sin(state.theta),
      y: x * Math.sin(state.theta) + y * Math.cos(state.theta),
    });
    const rawElements: Array<{ x: number; y: number }> = [];
    if (shape === "rod") {
      for (let index = -8; index <= 8; index += 1) rawElements.push({ x: index * size / 8, y: 0 });
    } else if (shape === "plate") {
      for (let row = -3; row <= 3; row += 1) for (let column = -4; column <= 4; column += 1) rawElements.push({ x: column * size / 5, y: row * size / 5 });
    } else if (shape === "disc" || shape === "sphere") {
      for (let ring = 0; ring <= 4; ring += 1) {
        const radial = size * Math.sqrt(ring / 4);
        const count = ring === 0 ? 1 : ring * 8;
        for (let index = 0; index < count; index += 1) {
          const angle = index / count * Math.PI * 2;
          const projectedY = radial * Math.sin(angle) * (shape === "sphere" ? Math.sqrt(Math.max(0.08, 1 - (radial / size) ** 2 * 0.45)) : 1);
          rawElements.push({ x: radial * Math.cos(angle), y: projectedY });
        }
      }
    } else if (shape === "point") {
      rawElements.push({ x: -size, y: 0 }, { x: size, y: 0 }, { x: 0, y: size * 0.55 }, { x: 0, y: -size * 0.55 });
    } else {
      for (let index = 0; index < 28; index += 1) {
        const angle = index / 28 * Math.PI * 2;
        const flatten = shape === "shell" ? 0.78 : 1;
        rawElements.push({ x: size * Math.cos(angle), y: size * Math.sin(angle) * flatten });
      }
    }
    const elements = rawElements.map((element, index) => ({
      ...rotate(element.x, element.y),
      radius: 0.055,
      label: index === 0 ? `dm · ${shape}` : "",
    }));
    return {
      bounds: { xMin: -3, xMax: 4, yMin: -3, yMax: 3 },
      bodies: [...elements, { x: axis, y: 0, radius: 0.1, label: "axis", shape: "ring" }],
      constraints: [{ from: { x: 0, y: -2.4 }, to: { x: 0, y: 2.4 }, label: "CM axis" }, { from: { x: axis, y: -2.4 }, to: { x: axis, y: 2.4 }, label: `shifted d=${axis}` }],
      annotations: [{ x: -1.8, y: 2.4, text: `I=${inertia.toFixed(3)} kg·m²` }],
      plots: [{ title: "same M,size · angular response τ/I", series: [{ label: "α", points: response }] }],
    };
  },
  data: (_state, parameters) => {
    const mass = Number(parameters.mass);
    const base = momentOfInertia(String(parameters.shape) as RigidShape, mass, Number(parameters.size));
    const inertia = parallelAxis(base, mass, Number(parameters.axis));
    return [["I at centre", `${base.toFixed(4)} kg·m²`], ["Total I", `${inertia.toFixed(4)} kg·m²`], ["Radius of gyration", `${radiusOfGyration(inertia, mass).toFixed(4)} m`], ["Angular acceleration", `${(Number(parameters.torque) / inertia).toFixed(4)} rad/s²`], ["Parallel-axis addition", `${(mass * Number(parameters.axis) ** 2).toFixed(4)} kg·m²`]];
  },
};

export const rollingSliding: AtlasDefinition = {
  id: "mechanics-rolling-sliding",
  name: "滚动与滑动 / Rolling & slipping",
  number: "ATLAS II · 04",
  category: "Classical Mechanics · Atlas II",
  formula: "vcontact=vcm−ωR; pure rolling: vcm=ωR; a=g sinθ/(1+I/MR²)",
  symbols: [["vcontact", "contact-point velocity relative to surface"], ["I/MR²", "shape inertia ratio"], ["fₛ", "static friction direction opposes impending contact slip"], ["ω", "angular speed"]],
  explanation: "Friction direction follows the contact point’s relative-motion tendency, not automatically the centre-of-mass velocity. Sliding friction drives v−ωR toward zero; the state then switches to pure rolling without dissipative contact slip.",
  controls: [
    { key: "shape", label: "Rolling body", type: "select", value: "disc", options: [["ring", "Ring"], ["disc", "Solid cylinder"], ["sphere", "Solid sphere"], ["shell", "Spherical shell"], ["custom", "Custom I/MR²"]] },
    { key: "ratio", label: "Custom I/MR²", type: "range", value: 0.5, min: 0.05, max: 1.5, step: 0.05 },
    { key: "radius", label: "Radius", type: "range", value: 0.5, min: 0.2, max: 1, step: 0.05, unit: "m" },
    { key: "angle", label: "Slope angle", type: "range", value: 12, min: 0, max: 35, step: 1, unit: "°" },
    { key: "friction", label: "Friction coefficient", type: "range", value: 0.35, min: 0, max: 1, step: 0.05 },
    { key: "v0", label: "Initial vcm", type: "range", value: 2, min: -4, max: 5, step: 0.2, unit: "m/s" },
    { key: "omega0", label: "Initial ω", type: "range", value: 0, min: -8, max: 12, step: 0.5, unit: "rad/s" },
  ],
  presets: [
    { id: "pure", label: "Pure rolling", parameters: { v0: 2, omega0: 4, radius: 0.5 } },
    { id: "slide", label: "Sliding to rolling", parameters: { v0: 3, omega0: 0 } },
    { id: "overspin", label: "Overspin · friction forward", parameters: { v0: 1, omega0: 8 } },
  ],
  createState: (parameters) => ({ t: 0, x: -2.5, v: Number(parameters.v0), omega: Number(parameters.omega0), dissipated: 0 }),
  step: (state, parameters, dt) => {
    const radius = Number(parameters.radius);
    const ratios: Record<string, number> = { ring: 1, disc: 0.5, sphere: 0.4, shell: 2 / 3, custom: Number(parameters.ratio) };
    const ratio = ratios[String(parameters.shape)] ?? Number(parameters.ratio);
    const contact = rollingContactVelocity(state.v, state.omega, radius);
    const slope = Number(parameters.angle) * Math.PI / 180;
    let acceleration: number;
    let angularAcceleration: number;
    let dissipated = state.dissipated;
    if (Math.abs(contact) < 0.015) {
      acceleration = rollingAcceleration(9.81, slope, ratio);
      angularAcceleration = acceleration / radius;
    } else {
      const frictionDirection = -Math.sign(contact);
      const frictionAcceleration = frictionDirection * Number(parameters.friction) * 9.81 * Math.cos(slope);
      acceleration = 9.81 * Math.sin(slope) + frictionAcceleration;
      angularAcceleration = -frictionAcceleration / (ratio * radius);
      dissipated += Math.abs(frictionAcceleration * contact * dt);
    }
    const v = state.v + acceleration * dt;
    const omega = state.omega + angularAcceleration * dt;
    return { t: state.t + dt, x: state.x + v * dt * 0.25, v, omega, dissipated };
  },
  scene: (state, parameters, history) => {
    const radius = Number(parameters.radius);
    const contact = rollingContactVelocity(state.v, state.omega, radius);
    const frictionDirection = Math.abs(contact) < 0.015 ? -Math.sign(9.81 * Math.sin(Number(parameters.angle) * Math.PI / 180)) : -Math.sign(contact);
    return {
      bounds: { xMin: -3, xMax: 3, yMin: -1.4, yMax: 2 },
      bodies: [{ x: ((state.x + 3) % 6) - 3, y: 0, radius, label: Math.abs(contact) < 0.015 ? "pure rolling" : "slipping", shape: "ring" }],
      constraints: [{ from: { x: -3, y: -radius }, to: { x: 3, y: -radius }, label: `slope ${parameters.angle}°` }],
      vectors: [
        { x: ((state.x + 3) % 6) - 3, y: 0, dx: state.v, dy: 0, label: "vcm", value: `${state.v.toFixed(2)} m/s`, kind: "velocity" },
        { x: ((state.x + 3) % 6) - 3, y: -radius, dx: frictionDirection, dy: 0, label: "friction", value: frictionDirection > 0 ? "forward" : "backward", kind: "force" },
      ],
      curves: [{ label: "CM path", kind: "trajectory", points: history.slice(-180).map((sample) => ({ x: ((sample.x + 3) % 6) - 3, y: 0 })) }],
      energy: [{ label: "translation", value: 0.5 * state.v ** 2 }, { label: "rotation", value: 0.5 * state.omega ** 2 * radius ** 2 }, { label: "diss.", value: state.dissipated }],
    };
  },
  data: (state, parameters) => {
    const radius = Number(parameters.radius);
    const contact = rollingContactVelocity(state.v, state.omega, radius);
    return [["Centre velocity", `${state.v.toFixed(3)} m/s`], ["Angular velocity", `${state.omega.toFixed(3)} rad/s`], ["Contact velocity", `${contact.toFixed(4)} m/s`], ["Regime", Math.abs(contact) < 0.015 ? "pure rolling" : "rolling with slip"], ["Friction direction", Math.abs(contact) < 0.015 ? "static · constraint determined" : contact > 0 ? "backward" : "forward"], ["Dissipated energy", `${state.dissipated.toFixed(4)} J/kg`]];
  },
};

export const angularMomentumLab: AtlasDefinition = {
  id: "mechanics-angular-momentum",
  name: "角动量守恒 / Angular momentum",
  number: "ATLAS II · 05",
  category: "Classical Mechanics · Atlas II",
  formula: "L=Iω;  dL/dt=τext;  τext=0 ⇒ I₁ω₁=I₂ω₂",
  symbols: [["L", "angular momentum about selected origin"], ["I", "instantaneous moment of inertia"], ["τext", "external torque"], ["Krot", "rotational kinetic energy"]],
  explanation: "The chair, extensible rotor, coupled-disc and origin-dependence presets separate angular momentum conservation from rotational-energy conservation. Internal work can change K even when external torque and ΔL vanish.",
  controls: [
    { key: "scene", label: "Conservation scene", type: "select", value: "chair", options: [["chair", "Rotating chair"], ["extend", "Extensible rotor"], ["discs", "Coupled discs"], ["origin", "Particle about origins"]] },
    { key: "initialI", label: "Initial inertia", type: "range", value: 4, min: 0.5, max: 8, step: 0.2, unit: "kg·m²" },
    { key: "finalI", label: "Final inertia", type: "range", value: 1.5, min: 0.3, max: 8, step: 0.2, unit: "kg·m²" },
    { key: "omega", label: "Initial ω", type: "range", value: 1.5, min: -4, max: 5, step: 0.1, unit: "rad/s" },
    { key: "externalTorque", label: "External torque", type: "range", value: 0, min: -2, max: 2, step: 0.1, unit: "N·m" },
  ],
  presets: [
    { id: "chair", label: "Chair · arms inward", parameters: { scene: "chair", initialI: 4, finalI: 1.4, externalTorque: 0 } },
    { id: "discs", label: "Two discs couple", parameters: { scene: "discs", initialI: 3, finalI: 2 } },
    { id: "torque", label: "External torque", parameters: { externalTorque: 0.8 } },
  ],
  createState: (parameters) => ({ t: 0, angularMomentum: Number(parameters.initialI) * Number(parameters.omega) }),
  step: (state, parameters, dt) => ({ t: state.t + dt, angularMomentum: state.angularMomentum + Number(parameters.externalTorque) * dt }),
  scene: (state, parameters) => {
    const sceneName = String(parameters.scene);
    const blend = (Math.sin(state.t * 0.8) + 1) / 2;
    const inertia = Number(parameters.initialI) * (1 - blend) + Number(parameters.finalI) * blend;
    const omega = state.angularMomentum / inertia;
    const radius = Math.sqrt(inertia / Math.max(0.1, Number(parameters.initialI)));
    const points = [0, Math.PI].map((angle) => ({ x: radius * Math.cos(angle + omega * state.t), y: radius * Math.sin(angle + omega * state.t), radius: 0.16, label: sceneName === "chair" ? "hand mass" : "slider" }));
    const discSolution = coupledDiscs(Number(parameters.initialI), Number(parameters.omega), Number(parameters.finalI), 0);
    const phase = discSolution.omega * state.t;
    const originParticle = { x: -2.2 + (state.t * Number(parameters.omega) * 0.35) % 4.4, y: 1, radius: 0.17, label: "particle" };
    const bodies = sceneName === "discs"
      ? [
          { x: -0.75, y: 0, radius: 0.8, label: `disc 1 · ${Number(parameters.omega).toFixed(1)} rad/s`, shape: "ring" as const },
          { x: 0.75, y: 0, radius: 0.58, label: `disc 2 → ${discSolution.omega.toFixed(2)} rad/s`, shape: "ring" as const },
          { x: -0.75 + 0.7 * Math.cos(phase), y: 0.7 * Math.sin(phase), radius: 0.07, label: "mark" },
          { x: 0.75 + 0.48 * Math.cos(phase), y: 0.48 * Math.sin(phase), radius: 0.07, label: "mark" },
        ]
      : sceneName === "origin"
        ? [originParticle, { x: -1, y: -0.6, radius: 0.12, label: "O₁", shape: "ring" as const }, { x: 1.2, y: -0.6, radius: 0.12, label: "O₂", shape: "ring" as const }]
        : [...points, { x: 0, y: 0, radius: sceneName === "chair" ? 0.34 : 0.16, label: sceneName === "chair" ? "chair + person" : "extensible rotor" }];
    const constraints = sceneName === "discs"
      ? [{ from: { x: -0.75, y: 0 }, to: { x: 0.75, y: 0 }, label: "frictional coupling · common final ω" }]
      : sceneName === "origin"
        ? [{ from: { x: -1, y: -0.6 }, to: originParticle, label: "r₁" }, { from: { x: 1.2, y: -0.6 }, to: originParticle, label: "r₂" }]
        : points.map((point) => ({ from: { x: 0, y: 0 }, to: point, label: sceneName === "chair" ? "arms move inward/outward" : "variable radius" }));
    return {
      bounds: { xMin: -3, xMax: 3, yMin: -3, yMax: 3 },
      bodies,
      constraints,
      vectors: [{ x: 0, y: 0, dx: 0, dy: state.angularMomentum, label: "L", value: `${state.angularMomentum.toFixed(2)}`, kind: "constraint" }],
      annotations: [
        ...(sceneName === "discs" ? [{ x: 0, y: -1.55, text: `K lost to heat = ${(discSolution.kineticBefore - discSolution.kineticAfter).toFixed(3)} J` }] : []),
        ...(sceneName === "origin" ? [{ x: 0, y: -2, text: "L=r×p changes with chosen origin; linear p does not" }] : []),
      ],
      plots: [{ title: "I(t), ω(t), L(t)", cursor: state.t, series: [{ label: "I", points: Array.from({ length: 80 }, (_, index) => { const time = index / 10; const b = (Math.sin(time * 0.8) + 1) / 2; return { x: time, y: Number(parameters.initialI) * (1 - b) + Number(parameters.finalI) * b }; }) }, { label: "ω", points: Array.from({ length: 80 }, (_, index) => { const time = index / 10; const b = (Math.sin(time * 0.8) + 1) / 2; const i = Number(parameters.initialI) * (1 - b) + Number(parameters.finalI) * b; return { x: time, y: state.angularMomentum / i }; }) }] }],
    };
  },
  data: (state, parameters) => {
    const sceneName = String(parameters.scene);
    const blend = (Math.sin(state.t * 0.8) + 1) / 2;
    const inertia = Number(parameters.initialI) * (1 - blend) + Number(parameters.finalI) * blend;
    const omega = state.angularMomentum / inertia;
    const baseRows: Array<[string, string | number]> = [["Moment of inertia", `${inertia.toFixed(3)} kg·m²`], ["Angular velocity", `${omega.toFixed(3)} rad/s`], ["Angular momentum", `${angularMomentum(inertia, omega).toFixed(4)} kg·m²/s`], ["Rotational energy", `${(0.5 * inertia * omega ** 2).toFixed(4)} J`], ["External torque", `${Number(parameters.externalTorque).toFixed(2)} N·m`]];
    if (sceneName === "discs") {
      const solution = coupledDiscs(Number(parameters.initialI), Number(parameters.omega), Number(parameters.finalI), 0);
      baseRows.push(["Common final ω", `${solution.omega.toFixed(4)} rad/s`], ["Energy converted to heat", `${(solution.kineticBefore - solution.kineticAfter).toFixed(4)} J`]);
    }
    if (sceneName === "origin") baseRows.push(["Origin dependence", "L shifts by −a×P when origin moves"]);
    return baseRows;
  },
};

export const gyroscope: AtlasDefinition = {
  id: "mechanics-gyroscope",
  name: "陀螺进动 / Gyroscopic precession",
  number: "ATLAS II · 06",
  category: "Classical Mechanics · Atlas II",
  formula: "τ=r×mg;  Ωp≈mgr/(Ispinωspin) for fast, steady precession",
  symbols: [["Ωp", "steady precession angular speed"], ["Lspin", "spin angular momentum"], ["τg", "gravitational torque"], ["β", "tilt angle"]],
  explanation: "This is the fast, steady-precession approximation, visualized with a lightweight projected axis. It is not a full Euler-angle rigid-body solver; the validity indicator warns when spin is too slow compared with precession.",
  controls: [
    { key: "mass", label: "Gyroscope mass", type: "range", value: 1.2, min: 0.2, max: 5, step: 0.1, unit: "kg" },
    { key: "lever", label: "CM lever arm", type: "range", value: 0.7, min: 0.1, max: 1.5, step: 0.05, unit: "m" },
    { key: "inertia", label: "Spin inertia", type: "range", value: 0.12, min: 0.02, max: 0.8, step: 0.02, unit: "kg·m²" },
    { key: "spin", label: "Spin angular speed", type: "range", value: 70, min: 2, max: 160, step: 2, unit: "rad/s" },
    { key: "tilt", label: "Tilt angle", type: "range", value: 35, min: 5, max: 75, step: 1, unit: "°" },
    { key: "gravity", label: "Gravity", type: "range", value: 9.81, min: 1.62, max: 15, step: 0.01, unit: "m/s²" },
  ],
  presets: [
    { id: "fast", label: "Fast stable precession", parameters: { spin: 90, tilt: 35 } },
    { id: "slow", label: "Approximation warning", parameters: { spin: 8, tilt: 50 } },
    { id: "moon", label: "Moon gravity", parameters: { gravity: 1.62, spin: 50 } },
  ],
  createState: () => ({ t: 0 }),
  step: (state, _parameters, dt) => ({ t: state.t + dt }),
  scene: (state, parameters) => {
    const solution = steadyPrecession(Number(parameters.mass), Number(parameters.gravity), Number(parameters.lever), Number(parameters.inertia), Number(parameters.spin));
    const tilt = Number(parameters.tilt) * Math.PI / 180;
    const azimuth = solution.precessionOmega * state.t;
    const tip = { x: 2 * Math.sin(tilt) * Math.cos(azimuth), y: 2 * Math.cos(tilt) + 0.45 * Math.sin(azimuth) };
    return {
      bounds: { xMin: -3, xMax: 3, yMin: -1.5, yMax: 3 },
      bodies: [{ x: 0, y: 0, radius: 0.12, label: "pivot" }, { ...tip, radius: 0.3, label: "spinning rotor", shape: "ring" }],
      constraints: [{ from: { x: 0, y: 0 }, to: tip, label: "spin axis" }],
      vectors: [
        { x: tip.x, y: tip.y, dx: tip.x, dy: tip.y, label: "Lspin", value: `${solution.spinAngularMomentum.toFixed(2)}`, kind: "constraint" },
        { x: tip.x, y: tip.y, dx: 0, dy: -Number(parameters.mass) * Number(parameters.gravity), label: "mg", value: `${(Number(parameters.mass) * Number(parameters.gravity)).toFixed(2)} N`, kind: "force" },
        { x: 0, y: 0, dx: -tip.y, dy: tip.x, label: "Ωp direction", value: `${solution.precessionOmega.toFixed(3)} rad/s`, kind: "velocity" },
      ],
      curves: [{ label: "precession cone", kind: "constraint", points: Array.from({ length: 80 }, (_, index) => ({ x: 2 * Math.sin(tilt) * Math.cos(index / 79 * Math.PI * 2), y: 2 * Math.cos(tilt) + 0.45 * Math.sin(index / 79 * Math.PI * 2) })) }],
    };
  },
  data: (_state, parameters) => {
    const solution = steadyPrecession(Number(parameters.mass), Number(parameters.gravity), Number(parameters.lever), Number(parameters.inertia), Number(parameters.spin));
    const valid = Math.abs(Number(parameters.spin)) > 10 * Math.abs(solution.precessionOmega);
    return [["Spin angular momentum", `${solution.spinAngularMomentum.toFixed(4)} kg·m²/s`], ["Gravity torque", `${solution.torque.toFixed(4)} N·m`], ["Precession speed", `${solution.precessionOmega.toFixed(4)} rad/s`], ["Tilt angle", `${parameters.tilt}°`], ["Approximation", valid ? "fast-spin condition satisfied" : "warning: full rigid-body dynamics needed"]];
  },
};
