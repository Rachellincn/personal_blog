export interface OscillatorState {
  x: number;
  v: number;
  t: number;
}

export function pendulumStep(
  state: OscillatorState,
  dt: number,
  length: number,
  gravity: number,
  damping = 0,
) {
  const acceleration = (theta: number, omega: number) =>
    -(gravity / length) * Math.sin(theta) - damping * omega;
  const halfV = state.v + 0.5 * acceleration(state.x, state.v) * dt;
  const x = state.x + halfV * dt;
  const v = halfV + 0.5 * acceleration(x, halfV) * dt;
  return { x, v, t: state.t + dt };
}

export function pendulumEnergy(
  theta: number,
  omega: number,
  mass: number,
  length: number,
  gravity: number,
) {
  return (
    0.5 * mass * length ** 2 * omega ** 2 +
    mass * gravity * length * (1 - Math.cos(theta))
  );
}

export function smallAnglePeriod(length: number, gravity: number) {
  return 2 * Math.PI * Math.sqrt(length / gravity);
}

export function oscillatorStep(
  state: OscillatorState,
  dt: number,
  mass: number,
  spring: number,
  damping: number,
  driveAmplitude = 0,
  driveOmega = 0,
) {
  const acceleration = (x: number, v: number, time: number) =>
    (driveAmplitude * Math.cos(driveOmega * time) - damping * v - spring * x) /
    mass;
  const a0 = acceleration(state.x, state.v, state.t);
  const vHalf = state.v + 0.5 * a0 * dt;
  const x = state.x + vHalf * dt;
  const t = state.t + dt;
  const v = vHalf + 0.5 * acceleration(x, vHalf, t) * dt;
  return { x, v, t };
}

export function steadyForcedResponse(
  mass: number,
  spring: number,
  damping: number,
  force: number,
  omega: number,
) {
  const real = spring - mass * omega ** 2;
  const imaginary = damping * omega;
  return {
    amplitude: force / Math.hypot(real, imaginary),
    phase: Math.atan2(imaginary, real),
  };
}

export function qualityFactor(mass: number, spring: number, damping: number) {
  return damping === 0 ? Infinity : Math.sqrt(mass * spring) / damping;
}

export function chainModes(
  count: number,
  mass: number,
  spring: number,
  boundary: "fixed" | "free" | "periodic" = "fixed",
) {
  const modes: Array<{ frequency: number; shape: number[] }> = [];
  for (let mode = 0; mode < count; mode += 1) {
    const index = boundary === "fixed" ? mode + 1 : mode;
    const waveNumber =
      boundary === "periodic"
        ? (2 * Math.PI * index) / count
        : boundary === "fixed"
          ? (Math.PI * index) / (count + 1)
          : (Math.PI * index) / count;
    const frequency = 2 * Math.sqrt(spring / mass) * Math.abs(Math.sin(waveNumber / 2));
    const shape = Array.from({ length: count }, (_, particle) =>
      boundary === "periodic"
        ? Math.cos(waveNumber * particle)
        : boundary === "fixed"
          ? Math.sin(waveNumber * (particle + 1))
          : Math.cos(waveNumber * (particle + 0.5)),
    );
    const norm = Math.hypot(...shape) || 1;
    modes.push({ frequency, shape: shape.map((value) => value / norm) });
  }
  return modes;
}

export function modeDot(first: number[], second: number[]) {
  return first.reduce((sum, value, index) => sum + value * (second[index] ?? 0), 0);
}
