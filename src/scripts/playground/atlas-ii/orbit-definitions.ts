import type { AtlasDefinition, AtlasParameters, AtlasState } from "../core/atlas-types";
import { evaluateExpression } from "../models/expression";
import {
  centralAcceleration,
  centralAccelerationFromPotential,
  centralPotential,
  circularOrbitRadius,
  effectivePotential,
  keplerElements,
  orbitalDiagnostics,
  orbitalDiagnosticsWithPotential,
  orbitStep,
  orbitStepWithPotential,
  type CentralForceKind,
  type OrbitState,
} from "../models/orbits";

function orbitFromState(state: AtlasState): OrbitState {
  return { t: state.t, x: state.x, y: state.y, vx: state.vx, vy: state.vy };
}

function initialOrbit(parameters: AtlasParameters): AtlasState {
  const radius = Number(parameters.radius);
  return {
    t: 0,
    x: radius,
    y: 0,
    vx: Number(parameters.radial ?? 0),
    vy: Number(parameters.tangential ?? 1),
    initialEnergy: 0,
    initialAngularMomentum: radius * Number(parameters.tangential ?? 1),
  };
}

function selectedPotential(parameters: AtlasParameters) {
  if (parameters.kind === "custom")
    return (radius: number) =>
      evaluateExpression(String(parameters.expression), { r: radius }, 0);
  return (radius: number) =>
    centralPotential(
      radius,
      Number(parameters.strength),
      String(parameters.kind) as CentralForceKind,
      Number(parameters.power),
    );
}

export const centralForce: AtlasDefinition = {
  id: "mechanics-central-force",
  name: "中心力运动 / Central-force motion",
  number: "ATLAS II · 14",
  category: "Classical Mechanics · Atlas II",
  formula: "F(r)=−dU/dr r̂;  L=r×v;  dA/dt=L/2m;  E=½v²+U(r)",
  symbols: [["U(r)", "central potential per unit mass"], ["L", "specific angular momentum"], ["vr", "radial velocity"], ["dA/dt", "areal velocity"]],
  explanation: "Gravity, inverse-square repulsion, isotropic harmonic confinement and editable power-law potentials use fixed-step velocity Verlet. Energy, angular momentum, radial energy and area rate expose the numerical behavior directly.",
  controls: [
    { key: "kind", label: "Central potential", type: "select", value: "gravity", options: [["gravity", "Newtonian gravity"], ["repulsive", "Inverse-square repulsion"], ["harmonic", "Isotropic harmonic"], ["power", "Power law U=krⁿ"], ["custom", "Editable U(r)"]] },
    { key: "strength", label: "Potential strength", type: "range", value: 4, min: 0.2, max: 12, step: 0.2 },
    { key: "power", label: "Power n", type: "range", value: -0.5, min: -2, max: 4, step: 0.1 },
    { key: "expression", label: "Editable U(r)", type: "text", value: "-4/r+0.05*r^2" },
    { key: "radius", label: "Initial radius", type: "range", value: 2, min: 0.5, max: 4, step: 0.1, unit: "m" },
    { key: "radial", label: "Initial radial speed", type: "range", value: 0, min: -3, max: 3, step: 0.1, unit: "m/s" },
    { key: "tangential", label: "Initial tangential speed", type: "range", value: 1.5, min: -4, max: 5, step: 0.1, unit: "m/s" },
  ],
  presets: [
    { id: "gravity", label: "Bound gravity orbit", parameters: { kind: "gravity", strength: 4, radius: 2, radial: 0, tangential: 1.5 } },
    { id: "repulsive", label: "Repulsive scattering", parameters: { kind: "repulsive", radius: 3, radial: -2, tangential: 0.6 } },
    { id: "harmonic", label: "Harmonic rosette", parameters: { kind: "harmonic", strength: 1.2, radius: 2.5, tangential: 1 } },
    { id: "power", label: "Power-law potential", parameters: { kind: "power", power: 1.5, strength: 0.7 } },
    { id: "custom", label: "Custom central U(r)", parameters: { kind: "custom", expression: "-4/r+0.05*r^2" } },
  ],
  createState: (parameters) => {
    const state = initialOrbit(parameters);
    const diagnostic = parameters.kind === "custom"
      ? orbitalDiagnosticsWithPotential(orbitFromState(state), selectedPotential(parameters))
      : orbitalDiagnostics(orbitFromState(state), Number(parameters.strength), String(parameters.kind) as CentralForceKind, Number(parameters.power));
    return { ...state, initialEnergy: diagnostic.energy, initialAngularMomentum: diagnostic.angularMomentum };
  },
  step: (state, parameters, dt) => ({
    ...state,
    ...(parameters.kind === "custom"
      ? orbitStepWithPotential(orbitFromState(state), dt, selectedPotential(parameters))
      : orbitStep(orbitFromState(state), dt, Number(parameters.strength), String(parameters.kind) as CentralForceKind, Number(parameters.power))),
  }),
  scene: (state, parameters, history) => {
    const kind = String(parameters.kind);
    const potentialFn = selectedPotential(parameters);
    const acceleration = kind === "custom"
      ? centralAccelerationFromPotential(state.x, state.y, potentialFn)
      : centralAcceleration(state.x, state.y, Number(parameters.strength), kind as CentralForceKind, Number(parameters.power));
    const diagnostics = kind === "custom"
      ? orbitalDiagnosticsWithPotential(orbitFromState(state), potentialFn)
      : orbitalDiagnostics(orbitFromState(state), Number(parameters.strength), kind as CentralForceKind, Number(parameters.power));
    const radii = Array.from({ length: 120 }, (_, index) => 0.25 + index * 0.04);
    return {
      bounds: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
      bodies: [{ x: 0, y: 0, radius: 0.18, label: "force centre" }, { x: state.x, y: state.y, radius: 0.14, label: "particle" }],
      constraints: [{ from: { x: 0, y: 0 }, to: { x: state.x, y: state.y }, label: `r=${diagnostics.radius.toFixed(2)}` }],
      vectors: [
        { x: state.x, y: state.y, dx: state.vx, dy: state.vy, label: "v", value: `${Math.hypot(state.vx, state.vy).toFixed(2)}`, kind: "velocity" },
        { x: state.x, y: state.y, dx: acceleration.x, dy: acceleration.y, label: "a", value: `${Math.hypot(acceleration.x, acceleration.y).toFixed(2)}`, kind: "acceleration" },
        { x: state.x, y: state.y, dx: acceleration.x, dy: acceleration.y, label: "F/m", value: kind, kind: "force" },
      ],
      curves: [{ label: "numeric orbit", kind: "numeric", points: history.slice(-700).map((sample) => ({ x: sample.x, y: sample.y })) }],
      plots: [{ title: "U(r) and effective radial energy", cursor: diagnostics.radius, series: [{ label: "U", points: radii.map((radius) => ({ x: radius, y: potentialFn(radius) })) }, { label: "Ueff", points: radii.map((radius) => ({ x: radius, y: potentialFn(radius) + diagnostics.angularMomentum ** 2 / (2 * radius ** 2) })) }] }],
      energy: [{ label: "radial K", value: diagnostics.radialKinetic }, { label: "angular K", value: Math.max(0, diagnostics.kinetic - diagnostics.radialKinetic) }, { label: "U+offset", value: Math.max(0, diagnostics.potential + Number(parameters.strength) * 2) }],
    };
  },
  data: (state, parameters) => {
    const diagnostics = parameters.kind === "custom"
      ? orbitalDiagnosticsWithPotential(orbitFromState(state), selectedPotential(parameters))
      : orbitalDiagnostics(orbitFromState(state), Number(parameters.strength), String(parameters.kind) as CentralForceKind, Number(parameters.power));
    return [["Radius", `${diagnostics.radius.toFixed(5)} m`], ["Total energy", `${diagnostics.energy.toFixed(6)}`], ["Potential energy", `${diagnostics.potential.toFixed(6)}`], ["Radial kinetic", `${diagnostics.radialKinetic.toFixed(6)}`], ["Angular momentum", `${diagnostics.angularMomentum.toFixed(6)}`], ["Areal velocity", `${diagnostics.arealVelocity.toFixed(6)} m²/s`], ["Relative energy error", `${Math.abs((diagnostics.energy - state.initialEnergy) / (state.initialEnergy || 1)).toExponential(2)}`], ["Angular momentum error", `${Math.abs(diagnostics.angularMomentum - state.initialAngularMomentum).toExponential(2)}`]];
  },
  drag: (point, state) => ({ ...state, x: point.x * 4.5, y: point.y * 4.5, vx: 0, vy: 0, t: 0 }),
};

function keplerInitial(parameters: AtlasParameters) {
  const radius = Number(parameters.radius);
  const mu = Number(parameters.mu);
  const circular = Math.sqrt(mu / radius);
  const speed = parameters.orbit === "circle" ? circular : parameters.orbit === "ellipse" ? circular * 0.78 : parameters.orbit === "parabola" ? Math.sqrt(2) * circular : parameters.orbit === "hyperbola" ? 1.62 * circular : Number(parameters.tangential);
  const state = { t: 0, x: radius, y: 0, vx: Number(parameters.radial), vy: speed };
  const diagnostics = orbitalDiagnostics(state, mu);
  return { ...state, initialEnergy: diagnostics.energy, initialAngularMomentum: diagnostics.angularMomentum };
}

export const keplerOrbits: AtlasDefinition = {
  id: "mechanics-kepler-orbits",
  name: "开普勒轨道与轨道设计 / Kepler orbits",
  number: "ATLAS II · 15",
  category: "Classical Mechanics · Atlas II",
  formula: "r(ν)=a(1−e²)/(1+e cosν);  T²=4π²a³/μ;  vesc=√(2μ/r)",
  symbols: [["a,b", "semi-major and semi-minor axes"], ["e", "eccentricity"], ["ν", "true anomaly"], ["μ", "central gravitational parameter"]],
  explanation: "Circular, elliptic, parabolic and hyperbolic initial conditions use the same symplectic integrator. Equal-time radial spokes demonstrate constant swept area. The design controls expose radial/tangential speed, escape speed and a simplified Hohmann transfer overlay.",
  controls: [
    { key: "orbit", label: "Orbit preset", type: "select", value: "ellipse", options: [["circle", "Circular"], ["ellipse", "Elliptic"], ["parabola", "Parabolic escape"], ["hyperbola", "Hyperbolic"], ["custom", "Satellite custom"]] },
    { key: "mu", label: "Gravity parameter μ", type: "range", value: 4, min: 0.5, max: 12, step: 0.1 },
    { key: "radius", label: "Initial radius", type: "range", value: 2.5, min: 0.6, max: 4, step: 0.1, unit: "m" },
    { key: "radial", label: "Radial velocity", type: "range", value: 0, min: -2, max: 2, step: 0.05, unit: "m/s" },
    { key: "tangential", label: "Custom tangential velocity", type: "range", value: 1.2, min: 0, max: 5, step: 0.05, unit: "m/s" },
    { key: "hohmann", label: "Hohmann transfer overlay", type: "checkbox", value: false },
    { key: "targetRadius", label: "Transfer target radius", type: "range", value: 4, min: 1, max: 5, step: 0.1, unit: "m" },
  ],
  presets: [
    { id: "circle", label: "Circular orbit", parameters: { orbit: "circle", radial: 0 } },
    { id: "ellipse", label: "Elliptic planet", parameters: { orbit: "ellipse", radius: 3 } },
    { id: "parabola", label: "Escape threshold", parameters: { orbit: "parabola" } },
    { id: "hyperbola", label: "Hyperbolic flyby", parameters: { orbit: "hyperbola" } },
  ],
  createState: keplerInitial,
  step: (state, parameters, dt) => ({ ...state, ...orbitStep(orbitFromState(state), dt, Number(parameters.mu), "gravity") }),
  scene: (state, parameters, history) => {
    const diagnostics = orbitalDiagnostics(orbitFromState(state), Number(parameters.mu));
    const elements = keplerElements(orbitFromState(state), Number(parameters.mu));
    const transferA = (Number(parameters.radius) + Number(parameters.targetRadius)) / 2;
    const transferE = Math.abs(Number(parameters.targetRadius) - Number(parameters.radius)) / (Number(parameters.targetRadius) + Number(parameters.radius));
    const transfer = Array.from({ length: 100 }, (_, index) => { const angle = index / 99 * Math.PI * 2; const r = transferA * (1 - transferE ** 2) / (1 + transferE * Math.cos(angle)); return { x: r * Math.cos(angle), y: r * Math.sin(angle) }; });
    const spokes = history.filter((_sample, index) => index % 90 === 0).slice(-6).map((sample, index) => ({ from: { x: 0, y: 0 }, to: { x: sample.x, y: sample.y }, label: index === 0 ? "equal Δt swept sectors" : undefined }));
    return {
      bounds: { xMin: -6, xMax: 6, yMin: -6, yMax: 6 },
      bodies: [{ x: 0, y: 0, radius: 0.22, label: "focus" }, { x: state.x, y: state.y, radius: 0.13, label: String(parameters.orbit) }],
      constraints: [{ from: { x: 0, y: 0 }, to: { x: state.x, y: state.y }, label: `ν=${Math.atan2(state.y, state.x).toFixed(2)} rad` }, ...spokes],
      vectors: [{ x: state.x, y: state.y, dx: state.vx, dy: state.vy, label: "v", value: `${Math.hypot(state.vx, state.vy).toFixed(2)}`, kind: "velocity" }, { x: state.x, y: state.y, dx: -state.x / diagnostics.radius, dy: -state.y / diagnostics.radius, label: "toward focus", value: "gravity", kind: "acceleration" }],
      curves: [{ label: "numeric Kepler orbit", kind: "numeric", points: history.map((sample) => ({ x: sample.x, y: sample.y })) }, ...(parameters.hohmann ? [{ label: "Hohmann transfer", kind: "theory" as const, points: transfer }, { label: "target circular orbit", kind: "constraint" as const, points: Array.from({ length: 100 }, (_, index) => ({ x: Number(parameters.targetRadius) * Math.cos(index / 99 * Math.PI * 2), y: Number(parameters.targetRadius) * Math.sin(index / 99 * Math.PI * 2) })) }] : [])],
      annotations: [{ x: -4.5, y: 5, text: elements.eccentricity < 1e-3 ? "circle" : elements.eccentricity < 1 ? "ellipse" : Math.abs(elements.eccentricity - 1) < 0.02 ? "parabola" : "hyperbola" }],
    };
  },
  data: (state, parameters) => {
    const mu = Number(parameters.mu);
    const diagnostics = orbitalDiagnostics(orbitFromState(state), mu);
    const elements = keplerElements(orbitFromState(state), mu);
    const circular = Math.sqrt(mu / diagnostics.radius);
    return [["Eccentricity", elements.eccentricity.toFixed(6)], ["Semi-major axis", Number.isFinite(elements.semiMajorAxis) ? `${elements.semiMajorAxis.toFixed(5)} m` : "unbounded"], ["Semi-minor axis", Number.isFinite(elements.semiMinorAxis) ? `${elements.semiMinorAxis.toFixed(5)} m` : "not defined"], ["Periapsis / apoapsis", `${elements.periapsis.toFixed(4)} / ${Number.isFinite(elements.apoapsis) ? elements.apoapsis.toFixed(4) : "∞"}`], ["Orbital period", Number.isFinite(elements.period) ? `${elements.period.toFixed(5)} s` : "unbound"], ["Escape speed here", `${(Math.sqrt(2) * circular).toFixed(5)} m/s`], ["Areal velocity", `${diagnostics.arealVelocity.toFixed(6)} m²/s`], ["Energy drift", `${Math.abs(diagnostics.energy - state.initialEnergy).toExponential(2)}`]];
  },
};

export const effectivePotentialLab: AtlasDefinition = {
  id: "mechanics-effective-potential",
  name: "有效势与轨道稳定性 / Effective potential",
  number: "ATLAS II · 16",
  category: "Classical Mechanics · Atlas II",
  formula: "Ueff(r)=−μ/r+L²/(2r²);  Er=½ṙ²+Ueff(r);  dUeff/dr=0 at circular orbit",
  symbols: [["Ueff", "central potential plus centrifugal barrier"], ["Er", "radial energy"], ["rturn", "radial turning point"], ["rc", "circular-orbit extremum"]],
  explanation: "The real orbit and effective-potential cursor share the same radius. Energy intersections delimit allowed radial motion; the minimum marks the stable Newtonian circular orbit and the inner centrifugal barrier creates a forbidden region.",
  controls: [
    { key: "mu", label: "Gravity parameter μ", type: "range", value: 4, min: 0.5, max: 12, step: 0.1 },
    { key: "angularMomentum", label: "Angular momentum L", type: "range", value: 3, min: 0.3, max: 7, step: 0.1 },
    { key: "radius", label: "Initial radius", type: "range", value: 2.8, min: 0.5, max: 5, step: 0.1, unit: "m" },
    { key: "radial", label: "Initial radial speed", type: "range", value: 0, min: -2, max: 2, step: 0.05, unit: "m/s" },
  ],
  presets: [
    { id: "circular", label: "Stable circular radius", parameters: { mu: 4, angularMomentum: 3, radius: 2.25, radial: 0 } },
    { id: "bound", label: "Bound radial oscillation", parameters: { radius: 3.4, radial: 0 } },
    { id: "barrier", label: "Near centrifugal barrier", parameters: { radius: 1.2, radial: 0.7 } },
  ],
  createState: (parameters) => {
    const radius = Number(parameters.radius);
    const tangential = Number(parameters.angularMomentum) / radius;
    const state = { t: 0, x: radius, y: 0, vx: Number(parameters.radial), vy: tangential };
    const diagnostics = orbitalDiagnostics(state, Number(parameters.mu));
    return { ...state, initialEnergy: diagnostics.energy, initialAngularMomentum: diagnostics.angularMomentum };
  },
  step: (state, parameters, dt) => ({ ...state, ...orbitStep(orbitFromState(state), dt, Number(parameters.mu), "gravity") }),
  scene: (state, parameters, history) => {
    const diagnostics = orbitalDiagnostics(orbitFromState(state), Number(parameters.mu));
    const radii = Array.from({ length: 180 }, (_, index) => 0.25 + index * 0.035);
    const circular = circularOrbitRadius(Number(parameters.mu), Number(parameters.angularMomentum));
    return {
      bounds: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
      bodies: [{ x: 0, y: 0, radius: 0.2, label: "centre" }, { x: state.x, y: state.y, radius: 0.13, label: "linked orbit" }],
      constraints: [{ from: { x: 0, y: 0 }, to: { x: state.x, y: state.y }, label: `r=${diagnostics.radius.toFixed(3)}` }],
      curves: [{ label: "real orbit", kind: "numeric", points: history.map((sample) => ({ x: sample.x, y: sample.y })) }],
      plots: [{ title: "U, centrifugal barrier, Ueff and total E", cursor: diagnostics.radius, series: [{ label: "U", points: radii.map((radius) => ({ x: radius, y: -Number(parameters.mu) / radius })) }, { label: "centrifugal", points: radii.map((radius) => ({ x: radius, y: Number(parameters.angularMomentum) ** 2 / (2 * radius ** 2) })) }, { label: "Ueff", kind: "numeric", points: radii.map((radius) => ({ x: radius, y: effectivePotential(radius, Number(parameters.mu), Number(parameters.angularMomentum)) })) }, { label: "E", kind: "theory", points: [{ x: radii[0], y: state.initialEnergy }, { x: radii.at(-1)!, y: state.initialEnergy }] }] }],
      annotations: [{ x: circular, y: 2.8, text: `stable rc=${circular.toFixed(2)}` }, { x: 0.7, y: -3.5, text: "inner forbidden barrier" }],
    };
  },
  data: (state, parameters) => {
    const diagnostics = orbitalDiagnostics(orbitFromState(state), Number(parameters.mu));
    const circular = circularOrbitRadius(Number(parameters.mu), Number(parameters.angularMomentum));
    return [["Current radius", `${diagnostics.radius.toFixed(6)} m`], ["Effective potential", effectivePotential(diagnostics.radius, Number(parameters.mu), Number(parameters.angularMomentum)).toFixed(6)], ["Total radial energy", state.initialEnergy.toFixed(6)], ["Circular-orbit radius", `${circular.toFixed(6)} m`], ["Stability", "minimum of Ueff · stable"], ["Allowed region", effectivePotential(diagnostics.radius, Number(parameters.mu), Number(parameters.angularMomentum)) <= state.initialEnergy ? "allowed" : "forbidden"], ["Energy drift", `${Math.abs(diagnostics.energy - state.initialEnergy).toExponential(2)}`]];
  },
};
