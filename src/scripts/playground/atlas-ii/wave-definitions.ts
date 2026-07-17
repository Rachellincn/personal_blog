import type { AtlasDefinition } from "../core/atlas-types";
import {
  gaussianWavePacket,
  groupVelocity,
  phaseVelocity,
  reflectionCoefficient,
  standingFrequency,
  standingMode,
  transverseWave,
} from "../models/waves";

export const transverseString: AtlasDefinition = {
  id: "mechanics-transverse-wave",
  name: "一维横波 / Transverse wave",
  number: "ATLAS II · 11",
  category: "Classical Mechanics · Atlas II",
  formula: "∂²u/∂t²=c²∂²u/∂x²;  c=√(T/μ);  E=½μu̇²+½T(u′)²",
  symbols: [["u", "transverse displacement"], ["c", "wave speed"], ["T", "string tension"], ["μ", "linear mass density"]],
  explanation: "Pulse, sinusoidal and continuous-drive modes show right/left propagation, reflection and transmission at a medium boundary. Fixed-end reflection reverses displacement phase; free-end reflection does not.",
  controls: [
    { key: "source", label: "Wave source", type: "select", value: "pulse", options: [["pulse", "Initial pulse"], ["sine", "Sinusoidal wave"], ["drive", "Continuous drive"], ["both", "Left + right waves"]] },
    { key: "boundary", label: "End / interface", type: "select", value: "fixed", options: [["fixed", "Fixed reflection"], ["free", "Free reflection"], ["interface", "Different medium interface"], ["open", "No reflection"]] },
    { key: "amplitude", label: "Amplitude", type: "range", value: 0.8, min: 0.1, max: 1.5, step: 0.1 },
    { key: "frequency", label: "Frequency", type: "range", value: 1, min: 0.2, max: 3, step: 0.1, unit: "Hz" },
    { key: "wavelength", label: "Wavelength", type: "range", value: 3, min: 0.6, max: 6, step: 0.1, unit: "m" },
    { key: "speedRatio", label: "Medium 2 speed / c", type: "range", value: 0.6, min: 0.25, max: 2, step: 0.05 },
  ],
  presets: [
    { id: "fixed", label: "Pulse · fixed reflection", parameters: { source: "pulse", boundary: "fixed" } },
    { id: "free", label: "Pulse · free reflection", parameters: { source: "pulse", boundary: "free" } },
    { id: "interface", label: "Reflection + transmission", parameters: { boundary: "interface", speedRatio: 0.55 } },
  ],
  createState: () => ({ t: 0 }),
  step: (state, _parameters, dt) => ({ t: state.t + dt }),
  scene: (state, parameters) => {
    const amplitude = Number(parameters.amplitude);
    const wavelength = Number(parameters.wavelength);
    const frequency = Number(parameters.frequency);
    const speed = wavelength * frequency;
    const reflection = parameters.boundary === "fixed" ? reflectionCoefficient("fixed") : parameters.boundary === "free" ? reflectionCoefficient("free") : parameters.boundary === "interface" ? (1 - Number(parameters.speedRatio)) / (1 + Number(parameters.speedRatio)) : 0;
    const points = Array.from({ length: 161 }, (_, index) => {
      const x = -6 + index / 160 * 12;
      let incident: number;
      if (parameters.source === "pulse") incident = amplitude * Math.exp(-((x - (-4 + speed * state.t)) ** 2) / 0.35);
      else incident = transverseWave(x, state.t, amplitude, wavelength, frequency, 1);
      const reflected = x < 4 && reflection !== 0 ? reflection * (parameters.source === "pulse" ? amplitude * Math.exp(-((x - (12 - speed * state.t)) ** 2) / 0.35) : transverseWave(8 - x, state.t, amplitude, wavelength, frequency, 1)) : 0;
      const left = parameters.source === "both" ? transverseWave(x, state.t, amplitude * 0.6, wavelength * 0.8, frequency, -1) : 0;
      const transmitted = parameters.boundary === "interface" && x >= 0 ? (1 + reflection) * transverseWave(x, state.t, amplitude, wavelength * Number(parameters.speedRatio), frequency, 1) : 0;
      return { x, y: x >= 0 && parameters.boundary === "interface" ? transmitted : incident + reflected + left };
    });
    const localVelocity = (x: number) => {
      const h = 0.002;
      return (transverseWave(x, state.t + h, amplitude, wavelength, frequency) - transverseWave(x, state.t - h, amplitude, wavelength, frequency)) / (2 * h);
    };
    return {
      bounds: { xMin: -6.3, xMax: 6.3, yMin: -2, yMax: 2 },
      bodies: points.filter((_point, index) => index % 8 === 0).map((point, index) => ({ ...point, radius: 0.05, label: index === 0 ? "string elements" : "" })),
      curves: [{ label: "u(x,t)", kind: "numeric", points }],
      constraints: [{ from: { x: -6, y: 0 }, to: { x: 6, y: 0 }, label: "equilibrium string" }, ...(parameters.boundary === "interface" ? [{ from: { x: 0, y: -1.8 }, to: { x: 0, y: 1.8 }, label: "medium boundary" }] : [])],
      plots: [{ title: "local displacement and velocity", cursor: state.t, series: [{ label: "u(0,t)", points: Array.from({ length: 120 }, (_, index) => ({ x: index / 30, y: transverseWave(0, index / 30, amplitude, wavelength, frequency) })) }, { label: "u̇(0,t)", points: Array.from({ length: 120 }, (_, index) => ({ x: index / 30, y: localVelocity(0) * Math.cos(index / 15) })) }] }],
      energy: [{ label: "kinetic", value: 0.5 * localVelocity(0) ** 2 }, { label: "elastic", value: 0.5 * (2 * Math.PI / wavelength * amplitude) ** 2 }],
    };
  },
  data: (state, parameters) => {
    const speed = Number(parameters.wavelength) * Number(parameters.frequency);
    const coefficient = parameters.boundary === "fixed" ? -1 : parameters.boundary === "free" ? 1 : parameters.boundary === "interface" ? (1 - Number(parameters.speedRatio)) / (1 + Number(parameters.speedRatio)) : 0;
    return [["Wave speed", `${speed.toFixed(3)} m/s`], ["Wavelength", `${Number(parameters.wavelength).toFixed(3)} m`], ["Frequency", `${Number(parameters.frequency).toFixed(3)} Hz`], ["Reflection coefficient", coefficient.toFixed(4)], ["Reflection phase", coefficient < 0 ? "π phase reversal" : coefficient > 0 ? "no phase reversal" : "none"], ["Simulation time", `${state.t.toFixed(3)} s`]];
  },
};

export const standingWaves: AtlasDefinition = {
  id: "mechanics-standing-waves",
  name: "驻波与边界条件 / Standing waves",
  number: "ATLAS II · 12",
  category: "Classical Mechanics · Atlas II",
  formula: "fixed–fixed/free–free: fn=nc/(2L); fixed–free: fn=(2n−1)c/(4L)",
  symbols: [["node", "zero-displacement point"], ["antinode", "maximum-amplitude point"], ["n", "mode number"], ["L", "string or pipe length"]],
  explanation: "Strings, open pipes and closed pipes share their matching displacement/pressure boundary families. Nodes and antinodes are labeled geometrically, and only the permitted wavelengths and frequencies appear.",
  controls: [
    { key: "system", label: "Standing-wave system", type: "select", value: "string", options: [["string", "String"], ["open", "Open pipe"], ["closed", "Closed pipe"]] },
    { key: "boundary", label: "Boundary condition", type: "select", value: "fixed-fixed", options: [["fixed-fixed", "Both fixed"], ["fixed-free", "Fixed–free"], ["free-free", "Both free"]] },
    { key: "length", label: "Length", type: "range", value: 4, min: 1, max: 8, step: 0.2, unit: "m" },
    { key: "speed", label: "Wave speed", type: "range", value: 12, min: 1, max: 30, step: 0.5, unit: "m/s" },
    { key: "mode", label: "Mode n", type: "range", value: 2, min: 1, max: 8, step: 1 },
  ],
  presets: [
    { id: "fundamental", label: "Fundamental", parameters: { mode: 1, boundary: "fixed-fixed" } },
    { id: "third", label: "Third harmonic", parameters: { mode: 3, boundary: "fixed-fixed" } },
    { id: "closed", label: "Closed pipe odd mode", parameters: { system: "closed", boundary: "fixed-free", mode: 2 } },
  ],
  createState: () => ({ t: 0 }),
  step: (state, _parameters, dt) => ({ t: state.t + dt }),
  scene: (state, parameters) => {
    const length = Number(parameters.length);
    const mode = Number(parameters.mode);
    const boundary = String(parameters.boundary) as "fixed-fixed" | "fixed-free" | "free-free";
    const points = Array.from({ length: 161 }, (_, index) => {
      const x = index / 160 * length;
      return { x, y: standingMode(x, state.t, length, mode, Number(parameters.speed), boundary).displacement };
    });
    const nodeCount = boundary === "fixed-free" ? mode : mode + 1;
    const nodes = Array.from({ length: nodeCount }, (_, index) => ({ x: boundary === "fixed-free" ? index * length / (mode - 0.5) : index * length / mode, y: 0, radius: 0.07, label: index === 0 ? "nodes" : "", shape: "ring" as const })).filter((point) => point.x <= length + 1e-9);
    const frequency = standingFrequency(length, mode, Number(parameters.speed), boundary);
    const wavelength = Number(parameters.speed) / frequency;
    return {
      bounds: { xMin: -0.5, xMax: length + 0.5, yMin: -2, yMax: 2 },
      bodies: nodes,
      curves: [{ label: "standing displacement", kind: "numeric", points }],
      constraints: [{ from: { x: 0, y: 0 }, to: { x: length, y: 0 }, label: `${parameters.system} · ${boundary}` }],
      annotations: Array.from({ length: mode }, (_, index) => ({ x: Math.min(length, (index + 0.5) * wavelength / 2), y: 1.35, text: "antinode" })),
      plots: [{ title: "allowed spectrum", series: [{ label: "fn", points: Array.from({ length: 8 }, (_, index) => ({ x: index + 1, y: standingFrequency(length, index + 1, Number(parameters.speed), boundary) })) }] }],
    };
  },
  data: (_state, parameters) => {
    const boundary = String(parameters.boundary) as "fixed-fixed" | "fixed-free" | "free-free";
    const frequency = standingFrequency(Number(parameters.length), Number(parameters.mode), Number(parameters.speed), boundary);
    return [["Mode number", Number(parameters.mode)], ["Frequency", `${frequency.toFixed(4)} Hz`], ["Allowed wavelength", `${(Number(parameters.speed) / frequency).toFixed(4)} m`], ["Boundary", boundary], ["Nodes / antinodes", boundary === "fixed-free" ? "opposite end types" : "matching end types"]];
  },
};

export const wavePacket: AtlasDefinition = {
  id: "mechanics-wave-packet",
  name: "波包、相速度与群速度 / Wave packet",
  number: "ATLAS II · 13",
  category: "Classical Mechanics · Atlas II",
  formula: "ω(k)=ck+βk³;  vp=ω/k;  vg=dω/dk=c+3βk²",
  symbols: [["vp", "carrier phase velocity"], ["vg", "envelope group velocity"], ["β", "dispersion strength"], ["Δk", "finite spectral bandwidth"]],
  explanation: "A monochromatic carrier and finite-bandwidth Gaussian packet expose distinct phase and group velocities. With β=0 the packet translates without dispersive speed separation; nonzero β separates carrier crests from the envelope and broadens the approximation qualitatively.",
  controls: [
    { key: "display", label: "Wave state", type: "select", value: "packet", options: [["mono", "Monochromatic"], ["packet", "Finite-bandwidth packet"]] },
    { key: "k", label: "Central wave number", type: "range", value: 2, min: 0.3, max: 5, step: 0.1, unit: "rad/m" },
    { key: "width", label: "Envelope width", type: "range", value: 2.2, min: 0.5, max: 5, step: 0.1, unit: "m" },
    { key: "speed", label: "Base wave speed c", type: "range", value: 1.5, min: 0.2, max: 4, step: 0.1, unit: "m/s" },
    { key: "dispersion", label: "Dispersion β", type: "range", value: 0.08, min: -0.15, max: 0.2, step: 0.01, unit: "m³/s" },
  ],
  presets: [
    { id: "mono", label: "Monochromatic", parameters: { display: "mono", dispersion: 0 } },
    { id: "nondispersive", label: "Nondispersive packet", parameters: { display: "packet", dispersion: 0 } },
    { id: "dispersive", label: "vp ≠ vg", parameters: { display: "packet", dispersion: 0.08 } },
  ],
  createState: () => ({ t: 0 }),
  step: (state, _parameters, dt) => ({ t: state.t + dt }),
  scene: (state, parameters) => {
    const k = Number(parameters.k);
    const width = Number(parameters.width);
    const speed = Number(parameters.speed);
    const dispersion = Number(parameters.dispersion);
    const points = Array.from({ length: 240 }, (_, index) => {
      const x = -10 + index / 239 * 20;
      const y = parameters.display === "mono" ? Math.cos(k * (x - phaseVelocity(k, speed, dispersion) * state.t)) : gaussianWavePacket(x, state.t, k, width, speed, dispersion);
      return { x, y };
    });
    const groupCenter = groupVelocity(k, speed, dispersion) * state.t;
    const phaseCenter = phaseVelocity(k, speed, dispersion) * state.t;
    return {
      bounds: { xMin: -10, xMax: 10, yMin: -2, yMax: 2 },
      bodies: [{ x: ((groupCenter + 10) % 20) - 10, y: 1.3, radius: 0.08, label: "envelope vg", shape: "ring" }, { x: ((phaseCenter + 10) % 20) - 10, y: -1.3, radius: 0.08, label: "crest vp" }],
      curves: [{ label: "packet", kind: "numeric", points }],
      vectors: [{ x: -8, y: 1.3, dx: groupVelocity(k, speed, dispersion), dy: 0, label: "vg", value: `${groupVelocity(k, speed, dispersion).toFixed(2)}`, kind: "velocity" }, { x: -8, y: -1.3, dx: phaseVelocity(k, speed, dispersion), dy: 0, label: "vp", value: `${phaseVelocity(k, speed, dispersion).toFixed(2)}`, kind: "velocity" }],
      plots: [{ title: "dispersion relation ω(k)", cursor: k, series: [{ label: "ω", points: Array.from({ length: 120 }, (_, index) => { const waveNumber = index / 24; return { x: waveNumber, y: speed * waveNumber + dispersion * waveNumber ** 3 }; }) }] }],
    };
  },
  data: (_state, parameters) => {
    const k = Number(parameters.k);
    const phase = phaseVelocity(k, Number(parameters.speed), Number(parameters.dispersion));
    const group = groupVelocity(k, Number(parameters.speed), Number(parameters.dispersion));
    return [["Phase velocity", `${phase.toFixed(5)} m/s`], ["Group velocity", `${group.toFixed(5)} m/s`], ["Velocity difference", `${(group - phase).toFixed(5)} m/s`], ["Dispersion", Number(parameters.dispersion) === 0 ? "nondispersive · vp=vg" : "dispersive · vp≠vg"], ["Bandwidth scale", `${(1 / Number(parameters.width)).toFixed(4)} rad/m`]];
  },
};
