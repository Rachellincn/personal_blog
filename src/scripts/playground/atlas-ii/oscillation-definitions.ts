import type { AtlasDefinition } from "../core/atlas-types";
import {
  chainModes,
  oscillatorStep,
  pendulumEnergy,
  pendulumStep,
  qualityFactor,
  smallAnglePeriod,
  steadyForcedResponse,
} from "../models/oscillations";

export const pendulumPhase: AtlasDefinition = {
  id: "mechanics-pendulum-phase",
  name: "单摆、物理摆与相图 / Pendulum phase portrait",
  number: "ATLAS II · 07",
  category: "Classical Mechanics · Atlas II",
  formula: "θ¨+(g/l)sinθ=0; small angle only: sinθ≈θ, T₀=2π√(l/g)",
  symbols: [["θ", "angular displacement"], ["ω", "angular velocity"], ["Esep", "separatrix energy 2mgl"], ["T₀", "small-angle limiting period"]],
  explanation: "The nonlinear equation is always used for the main motion. The small-angle trace is a comparison only, and its period is not reported as exact at large amplitude. The phase portrait distinguishes oscillation, separatrix and rotation regions.",
  controls: [
    { key: "model", label: "Pendulum model", type: "select", value: "nonlinear", options: [["small", "Small-angle comparison"], ["nonlinear", "Full nonlinear pendulum"], ["physical", "Physical pendulum"], ["inverted", "Simplified inverted pendulum"]] },
    { key: "length", label: "Effective length", type: "range", value: 1.2, min: 0.2, max: 3, step: 0.1, unit: "m" },
    { key: "mass", label: "Mass", type: "range", value: 1, min: 0.2, max: 5, step: 0.1, unit: "kg" },
    { key: "gravity", label: "Gravity", type: "range", value: 9.81, min: 1.62, max: 15, step: 0.01, unit: "m/s²" },
    { key: "theta0", label: "Initial angle", type: "range", value: 45, min: -175, max: 175, step: 1, unit: "°" },
    { key: "omega0", label: "Initial angular speed", type: "range", value: 0, min: -8, max: 8, step: 0.1, unit: "rad/s" },
  ],
  presets: [
    { id: "small", label: "Small amplitude", parameters: { theta0: 8, omega0: 0, model: "small" } },
    { id: "large", label: "Large nonlinear amplitude", parameters: { theta0: 120, omega0: 0, model: "nonlinear" } },
    { id: "separatrix", label: "Near separatrix", parameters: { theta0: 0, omega0: 5.72, model: "nonlinear" } },
  ],
  createState: (parameters) => ({ t: 0, x: Number(parameters.theta0) * Math.PI / 180, v: Number(parameters.omega0) }),
  step: (state, parameters, dt) => {
    const sign = parameters.model === "inverted" ? -1 : 1;
    const next = pendulumStep({ t: state.t, x: state.x, v: state.v }, dt, Number(parameters.length), sign * Number(parameters.gravity));
    return { t: next.t, x: next.x, v: next.v };
  },
  scene: (state, parameters, history) => {
    const length = Number(parameters.length);
    const bob = { x: length * Math.sin(state.x), y: -length * Math.cos(state.x) };
    const omega0 = Math.sqrt(Number(parameters.gravity) / length);
    const comparison = Array.from({ length: 180 }, (_, index) => { const time = index / 30; return { x: time, y: Number(parameters.theta0) * Math.PI / 180 * Math.cos(omega0 * time) }; });
    return {
      bounds: { xMin: -3, xMax: 3, yMin: -3, yMax: 2 },
      bodies: [{ x: 0, y: 0, radius: 0.1, label: "pivot" }, { ...bob, radius: 0.24, label: String(parameters.model) }],
      constraints: [{ from: { x: 0, y: 0 }, to: bob, label: `l=${length.toFixed(1)} m` }],
      vectors: [{ ...bob, dx: length * state.v * Math.cos(state.x), dy: length * state.v * Math.sin(state.x), label: "v", value: `${(length * Math.abs(state.v)).toFixed(2)} m/s`, kind: "velocity" }],
      curves: [{ label: "bob trajectory", kind: "trajectory", points: history.slice(-360).map((sample) => ({ x: length * Math.sin(sample.x), y: -length * Math.cos(sample.x) })) }],
      plots: [
        { title: "θ(t) · nonlinear vs small-angle", cursor: state.t, series: [{ label: "nonlinear", points: history.map((sample) => ({ x: sample.t, y: sample.x })), kind: "numeric" }, { label: "small-angle", points: comparison, kind: "theory" }] },
        { title: "phase space θ–ω", series: [{ label: "phase", points: history.map((sample) => ({ x: sample.x, y: sample.v })) }, { label: "separatrix", kind: "theory", points: Array.from({ length: 120 }, (_, index) => { const theta = -Math.PI + index / 119 * 2 * Math.PI; return { x: theta, y: 2 * omega0 * Math.cos(theta / 2) }; }) }] },
      ],
      energy: [{ label: "K", value: 0.5 * Number(parameters.mass) * length ** 2 * state.v ** 2 }, { label: "U", value: Number(parameters.mass) * Number(parameters.gravity) * length * (1 - Math.cos(state.x)) }],
    };
  },
  data: (state, parameters) => {
    const amplitude = Math.abs(Number(parameters.theta0));
    const exactLabel = amplitude <= 10 ? "valid limiting approximation" : "comparison only at this amplitude";
    return [["Angle", `${state.x.toFixed(4)} rad`], ["Angular speed", `${state.v.toFixed(4)} rad/s`], ["Mechanical energy", `${pendulumEnergy(state.x, state.v, Number(parameters.mass), Number(parameters.length), Number(parameters.gravity)).toFixed(5)} J`], ["Small-angle period", `${smallAnglePeriod(Number(parameters.length), Number(parameters.gravity)).toFixed(4)} s · ${exactLabel}`], ["Motion region", pendulumEnergy(state.x, state.v, 1, Number(parameters.length), Number(parameters.gravity)) < 2 * Number(parameters.gravity) * Number(parameters.length) ? "oscillation" : "rotation / separatrix"]];
  },
};

function dampingLabel(mass: number, spring: number, damping: number) {
  const critical = 2 * Math.sqrt(mass * spring);
  if (damping === 0) return "undamped";
  if (Math.abs(damping - critical) < 0.03) return "critical";
  return damping < critical ? "underdamped" : "overdamped";
}

export const dampedOscillator: AtlasDefinition = {
  id: "mechanics-damped-oscillator",
  name: "阻尼振动 / Damped oscillator",
  number: "ATLAS II · 08",
  category: "Classical Mechanics · Atlas II",
  formula: "mx¨+cx˙+kx=0;  ccrit=2√(mk)",
  symbols: [["c", "viscous damping coefficient"], ["ccrit", "critical damping"], ["E", "instantaneous mechanical energy"], ["phase", "x–v trajectory"]],
  explanation: "Undamped, underdamped, critical and overdamped responses share the same numerical model. Mechanical energy is constant only at c=0; with positive damping its envelope decreases while x and v may change sign.",
  controls: [
    { key: "mass", label: "Mass", type: "range", value: 1, min: 0.2, max: 4, step: 0.1, unit: "kg" },
    { key: "spring", label: "Spring k", type: "range", value: 4, min: 0.2, max: 12, step: 0.2, unit: "N/m" },
    { key: "damping", label: "Damping c", type: "range", value: 0.7, min: 0, max: 8, step: 0.05, unit: "N·s/m" },
    { key: "x0", label: "Initial displacement", type: "range", value: 2, min: -3, max: 3, step: 0.1, unit: "m" },
    { key: "v0", label: "Initial velocity", type: "range", value: 0, min: -4, max: 4, step: 0.1, unit: "m/s" },
  ],
  presets: [
    { id: "undamped", label: "Undamped", parameters: { damping: 0 } },
    { id: "under", label: "Underdamped", parameters: { damping: 0.7 } },
    { id: "critical", label: "Critical damping", parameters: { mass: 1, spring: 4, damping: 4 } },
    { id: "over", label: "Overdamped", parameters: { damping: 6 } },
  ],
  createState: (parameters) => ({ t: 0, x: Number(parameters.x0), v: Number(parameters.v0), initialEnergy: 0.5 * Number(parameters.mass) * Number(parameters.v0) ** 2 + 0.5 * Number(parameters.spring) * Number(parameters.x0) ** 2 }),
  step: (state, parameters, dt) => ({ ...state, ...oscillatorStep({ t: state.t, x: state.x, v: state.v }, dt, Number(parameters.mass), Number(parameters.spring), Number(parameters.damping)) }),
  scene: (state, parameters, history) => ({
    bounds: { xMin: -3.5, xMax: 3.5, yMin: -1.2, yMax: 1.2 },
    bodies: [{ x: state.x, y: 0, radius: 0.28, label: dampingLabel(Number(parameters.mass), Number(parameters.spring), Number(parameters.damping)), shape: "square" }],
    constraints: [{ from: { x: -3.5, y: 0 }, to: { x: state.x, y: 0 }, label: "spring + dashpot" }],
    vectors: [{ x: state.x, y: 0.2, dx: state.v, dy: 0, label: "v", value: `${state.v.toFixed(2)} m/s`, kind: "velocity" }, { x: state.x, y: -0.2, dx: -Number(parameters.spring) * state.x - Number(parameters.damping) * state.v, dy: 0, label: "ΣF", value: `${(-Number(parameters.spring) * state.x - Number(parameters.damping) * state.v).toFixed(2)} N`, kind: "force" }],
    plots: [{ title: "x(t), v(t)", cursor: state.t, series: [{ label: "x", points: history.map((sample) => ({ x: sample.t, y: sample.x })) }, { label: "v", points: history.map((sample) => ({ x: sample.t, y: sample.v })) }] }, { title: "phase portrait", series: [{ label: "x-v", points: history.map((sample) => ({ x: sample.x, y: sample.v })) }] }, { title: "energy decay", cursor: state.t, series: [{ label: "E", points: history.map((sample) => ({ x: sample.t, y: 0.5 * Number(parameters.mass) * sample.v ** 2 + 0.5 * Number(parameters.spring) * sample.x ** 2 })) }] }],
    energy: [{ label: "K", value: 0.5 * Number(parameters.mass) * state.v ** 2 }, { label: "U", value: 0.5 * Number(parameters.spring) * state.x ** 2 }, { label: "lost", value: Math.max(0, state.initialEnergy - 0.5 * Number(parameters.mass) * state.v ** 2 - 0.5 * Number(parameters.spring) * state.x ** 2) }],
  }),
  data: (state, parameters) => [["Regime", dampingLabel(Number(parameters.mass), Number(parameters.spring), Number(parameters.damping))], ["Displacement", `${state.x.toFixed(4)} m`], ["Velocity", `${state.v.toFixed(4)} m/s`], ["Mechanical energy", `${(0.5 * Number(parameters.mass) * state.v ** 2 + 0.5 * Number(parameters.spring) * state.x ** 2).toFixed(6)} J`], ["Critical damping", `${(2 * Math.sqrt(Number(parameters.mass) * Number(parameters.spring))).toFixed(4)} N·s/m`]],
};

export const forcedResonance: AtlasDefinition = {
  id: "mechanics-forced-resonance",
  name: "受迫振动与共振 / Forced resonance",
  number: "ATLAS II · 09",
  category: "Classical Mechanics · Atlas II",
  formula: "mx¨+cx˙+kx=F₀cosΩt;  A=F₀/√[(k−mΩ²)²+(cΩ)²]",
  symbols: [["Ω", "drive frequency"], ["A", "steady-state amplitude"], ["φ", "response phase lag"], ["Q", "quality factor √(mk)/c"]],
  explanation: "The live trace contains transient plus steady response. Scan mode evaluates the analytic steady response across frequency, marking finite damped resonance and explicitly warning that the ideal undamped model diverges at Ω=√(k/m).",
  controls: [
    { key: "mass", label: "Mass", type: "range", value: 1, min: 0.2, max: 4, step: 0.1, unit: "kg" },
    { key: "spring", label: "Spring k", type: "range", value: 4, min: 0.2, max: 12, step: 0.2, unit: "N/m" },
    { key: "damping", label: "Damping c", type: "range", value: 0.4, min: 0, max: 4, step: 0.05, unit: "N·s/m" },
    { key: "force", label: "Drive amplitude", type: "range", value: 1, min: 0.1, max: 5, step: 0.1, unit: "N" },
    { key: "drive", label: "Drive Ω", type: "range", value: 1.8, min: 0.1, max: 6, step: 0.05, unit: "rad/s" },
    { key: "scan", label: "Resonance scan", type: "checkbox", value: true },
  ],
  presets: [
    { id: "below", label: "Below resonance", parameters: { drive: 1, damping: 0.4 } },
    { id: "peak", label: "Near resonance", parameters: { drive: 1.98, damping: 0.25 } },
    { id: "undamped", label: "Undamped divergence", parameters: { drive: 2, damping: 0 } },
  ],
  createState: () => ({ t: 0, x: 0, v: 0 }),
  step: (state, parameters, dt) => oscillatorStep({ t: state.t, x: state.x, v: state.v }, dt, Number(parameters.mass), Number(parameters.spring), Number(parameters.damping), Number(parameters.force), Number(parameters.drive)),
  scene: (state, parameters, history) => {
    const frequencies = Array.from({ length: 120 }, (_, index) => 0.05 + index * 0.05);
    const response = steadyForcedResponse(Number(parameters.mass), Number(parameters.spring), Number(parameters.damping), Number(parameters.force), Number(parameters.drive));
    return {
      bounds: { xMin: -3.5, xMax: 3.5, yMin: -1.2, yMax: 1.2 },
      bodies: [{ x: state.x, y: 0, radius: 0.28, label: "driven mass", shape: "square" }],
      constraints: [{ from: { x: -3.5, y: 0 }, to: { x: state.x, y: 0 }, label: "spring + damper" }],
      vectors: [{ x: state.x, y: 0, dx: Number(parameters.force) * Math.cos(Number(parameters.drive) * state.t), dy: 0, label: "Fdrive", value: `${(Number(parameters.force) * Math.cos(Number(parameters.drive) * state.t)).toFixed(2)} N`, kind: "force" }],
      plots: [{ title: "transient + steady x(t)", cursor: state.t, series: [{ label: "x", points: history.map((sample) => ({ x: sample.t, y: sample.x })) }, { label: "drive", kind: "theory", points: history.map((sample) => ({ x: sample.t, y: Math.cos(Number(parameters.drive) * sample.t) })) }] }, ...(parameters.scan ? [{ title: "amplitude–frequency", cursor: Number(parameters.drive), series: [{ label: "A", points: frequencies.map((omega) => ({ x: omega, y: Math.min(20, steadyForcedResponse(Number(parameters.mass), Number(parameters.spring), Number(parameters.damping), Number(parameters.force), omega).amplitude) })) }] }, { title: "phase lag–frequency", cursor: Number(parameters.drive), series: [{ label: "φ", points: frequencies.map((omega) => ({ x: omega, y: steadyForcedResponse(Number(parameters.mass), Number(parameters.spring), Number(parameters.damping), Number(parameters.force), omega).phase })) }] }] : [])],
      annotations: [{ x: 0, y: 0.8, text: `Asteady=${Number.isFinite(response.amplitude) ? response.amplitude.toFixed(2) : "∞"}` }],
    };
  },
  data: (_state, parameters) => {
    const response = steadyForcedResponse(Number(parameters.mass), Number(parameters.spring), Number(parameters.damping), Number(parameters.force), Number(parameters.drive));
    const natural = Math.sqrt(Number(parameters.spring) / Number(parameters.mass));
    return [["Natural frequency", `${natural.toFixed(4)} rad/s`], ["Steady amplitude", Number.isFinite(response.amplitude) ? `${response.amplitude.toFixed(4)} m` : "diverges in ideal undamped theory"], ["Phase lag", `${(response.phase * 180 / Math.PI).toFixed(2)}°`], ["Quality factor", Number.isFinite(qualityFactor(Number(parameters.mass), Number(parameters.spring), Number(parameters.damping))) ? qualityFactor(Number(parameters.mass), Number(parameters.spring), Number(parameters.damping)).toFixed(3) : "∞"], ["Resonance note", Number(parameters.damping) === 0 ? "ideal theory diverges at Ω=ω₀" : "damping gives a finite peak"]];
  },
};

export const coupledModes: AtlasDefinition = {
  id: "mechanics-coupled-modes",
  name: "耦合振子与简正模式 / Coupled normal modes",
  number: "ATLAS II · 10",
  category: "Classical Mechanics · Atlas II",
  formula: "M q¨+Kq=0;  Kφₙ=ωₙ²Mφₙ;  q(t)=Σaₙφₙcos(ωₙt+δₙ)",
  symbols: [["φₙ", "normal-mode shape"], ["ωₙ", "modal angular frequency"], ["aₙ", "modal coefficient"], ["K", "coupling stiffness matrix"]],
  explanation: "Two-, three- and N-mass chains use analytic eigenmodes for fixed, free and periodic boundaries. Presets excite in-phase, anti-phase, local pulse and mixed states; normalized mode shapes expose their numerical orthogonality.",
  controls: [
    { key: "count", label: "Mass count N", type: "range", value: 5, min: 2, max: 10, step: 1 },
    { key: "mass", label: "Each mass", type: "range", value: 1, min: 0.2, max: 4, step: 0.1, unit: "kg" },
    { key: "spring", label: "Coupling k", type: "range", value: 4, min: 0.2, max: 12, step: 0.2, unit: "N/m" },
    { key: "boundary", label: "Boundary", type: "select", value: "fixed", options: [["fixed", "Fixed"], ["free", "Free"], ["periodic", "Periodic"]] },
    { key: "mode", label: "Excited mode", type: "range", value: 1, min: 1, max: 10, step: 1 },
    { key: "initial", label: "Initial state", type: "select", value: "mode", options: [["mode", "Single normal mode"], ["inphase", "In-phase"], ["antiphase", "Anti-phase"], ["pulse", "Local pulse"], ["random", "Deterministic mixed state"]] },
  ],
  presets: [
    { id: "inphase", label: "In-phase mode", parameters: { initial: "inphase", mode: 1 } },
    { id: "antiphase", label: "Anti-phase mode", parameters: { initial: "antiphase", mode: 5 } },
    { id: "pulse", label: "Localized pulse", parameters: { initial: "pulse" } },
  ],
  createState: () => ({ t: 0 }),
  step: (state, _parameters, dt) => ({ t: state.t + dt }),
  scene: (state, parameters) => {
    const count = Number(parameters.count);
    const modes = chainModes(count, Number(parameters.mass), Number(parameters.spring), String(parameters.boundary) as "fixed" | "free" | "periodic");
    const modeIndex = Math.min(count - 1, Math.max(0, Number(parameters.mode) - 1));
    const selected = modes[modeIndex];
    const displacements = selected.shape.map((_value, index) => {
      if (parameters.initial === "pulse") return modes.reduce((sum, mode) => sum + mode.shape[Math.floor(count / 2)] * mode.shape[index] * Math.cos(mode.frequency * state.t), 0);
      if (parameters.initial === "random") return modes.reduce((sum, mode, modeNumber) => sum + Math.sin((modeNumber + 1) * 1.7) * mode.shape[index] * Math.cos(mode.frequency * state.t), 0) / count;
      const source = parameters.initial === "antiphase" ? modes.at(-1)! : parameters.initial === "inphase" ? modes[parameters.boundary === "fixed" ? 0 : Math.min(1, count - 1)] : selected;
      return source.shape[index] * Math.cos(source.frequency * state.t);
    });
    return {
      bounds: { xMin: -1, xMax: count, yMin: -2, yMax: 2 },
      bodies: displacements.map((displacement, index) => ({ x: index, y: displacement, radius: 0.18, label: `m${index + 1}`, shape: "square" })),
      constraints: displacements.slice(1).map((displacement, index) => ({ from: { x: index, y: displacements[index] }, to: { x: index + 1, y: displacement }, label: index === 0 ? "coupling springs" : undefined })),
      plots: [{ title: "selected mode shape φₙ", series: [{ label: "mode", points: selected.shape.map((value, index) => ({ x: index, y: value })) }] }, { title: "modal frequencies", series: [{ label: "ωn", points: modes.map((mode, index) => ({ x: index + 1, y: mode.frequency })) }] }],
      energy: modes.slice(0, 5).map((mode, index) => ({ label: `E${index + 1}`, value: 0.5 * mode.frequency ** 2 * (index === modeIndex ? 1 : 0.08) })),
    };
  },
  data: (_state, parameters) => {
    const modes = chainModes(Number(parameters.count), Number(parameters.mass), Number(parameters.spring), String(parameters.boundary) as "fixed" | "free" | "periodic");
    const index = Math.min(modes.length - 1, Math.max(0, Number(parameters.mode) - 1));
    const cross = modes.length > 1 ? modes[0].shape.reduce((sum, value, particle) => sum + value * modes[1].shape[particle], 0) : 0;
    return [["Selected mode", index + 1], ["Modal frequency", `${modes[index].frequency.toFixed(5)} rad/s`], ["Mode shape", modes[index].shape.map((value) => value.toFixed(2)).join(", ")], ["φ₁·φ₂ orthogonality", cross.toExponential(2)], ["Boundary", String(parameters.boundary)]];
  },
};
