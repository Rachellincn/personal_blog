export interface OrbitState {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export type CentralForceKind = "gravity" | "repulsive" | "harmonic" | "power";

export function centralAcceleration(
  x: number,
  y: number,
  strength: number,
  kind: CentralForceKind,
  power = -1,
) {
  const radius = Math.max(1e-6, Math.hypot(x, y));
  let radialAcceleration: number;
  if (kind === "gravity") radialAcceleration = -strength / radius ** 2;
  else if (kind === "repulsive") radialAcceleration = strength / radius ** 2;
  else if (kind === "harmonic") radialAcceleration = -strength * radius;
  else radialAcceleration = -strength * power * radius ** (power - 1);
  return {
    x: (radialAcceleration * x) / radius,
    y: (radialAcceleration * y) / radius,
  };
}

export function orbitStep(
  state: OrbitState,
  dt: number,
  strength: number,
  kind: CentralForceKind = "gravity",
  power = -1,
) {
  const first = centralAcceleration(state.x, state.y, strength, kind, power);
  const x = state.x + state.vx * dt + 0.5 * first.x * dt ** 2;
  const y = state.y + state.vy * dt + 0.5 * first.y * dt ** 2;
  const second = centralAcceleration(x, y, strength, kind, power);
  return {
    t: state.t + dt,
    x,
    y,
    vx: state.vx + 0.5 * (first.x + second.x) * dt,
    vy: state.vy + 0.5 * (first.y + second.y) * dt,
  };
}

export function centralPotential(
  radius: number,
  strength: number,
  kind: CentralForceKind,
  power = -1,
) {
  const r = Math.max(1e-6, radius);
  if (kind === "gravity") return -strength / r;
  if (kind === "repulsive") return strength / r;
  if (kind === "harmonic") return 0.5 * strength * r ** 2;
  return strength * r ** power;
}

export function orbitalDiagnostics(
  state: OrbitState,
  strength: number,
  kind: CentralForceKind = "gravity",
  power = -1,
) {
  const radius = Math.hypot(state.x, state.y);
  const speed2 = state.vx ** 2 + state.vy ** 2;
  const angularMomentum = state.x * state.vy - state.y * state.vx;
  const potential = centralPotential(radius, strength, kind, power);
  const radialVelocity = (state.x * state.vx + state.y * state.vy) / radius;
  return {
    radius,
    kinetic: 0.5 * speed2,
    radialKinetic: 0.5 * radialVelocity ** 2,
    potential,
    energy: 0.5 * speed2 + potential,
    angularMomentum,
    arealVelocity: 0.5 * angularMomentum,
  };
}

export function keplerElements(state: OrbitState, mu: number) {
  const diagnostics = orbitalDiagnostics(state, mu, "gravity");
  const semiMajorAxis = -mu / (2 * diagnostics.energy);
  const eccentricity = Math.sqrt(
    Math.max(
      0,
      1 +
        (2 * diagnostics.energy * diagnostics.angularMomentum ** 2) /
          mu ** 2,
    ),
  );
  const semiMinorAxis =
    semiMajorAxis > 0 ? semiMajorAxis * Math.sqrt(Math.max(0, 1 - eccentricity ** 2)) : NaN;
  return {
    semiMajorAxis,
    semiMinorAxis,
    eccentricity,
    periapsis: semiMajorAxis * (1 - eccentricity),
    apoapsis: semiMajorAxis > 0 ? semiMajorAxis * (1 + eccentricity) : Infinity,
    period: semiMajorAxis > 0 ? 2 * Math.PI * Math.sqrt(semiMajorAxis ** 3 / mu) : Infinity,
  };
}

export function effectivePotential(radius: number, strength: number, angularMomentum: number) {
  const r = Math.max(1e-6, radius);
  return -strength / r + angularMomentum ** 2 / (2 * r ** 2);
}

export function circularOrbitRadius(strength: number, angularMomentum: number) {
  return angularMomentum ** 2 / strength;
}

export function centralAccelerationFromPotential(
  x: number,
  y: number,
  potential: (radius: number) => number,
) {
  const radius = Math.max(1e-5, Math.hypot(x, y));
  const h = Math.max(1e-4, radius * 1e-3);
  const derivative =
    (potential(radius - 2 * h) -
      8 * potential(radius - h) +
      8 * potential(radius + h) -
      potential(radius + 2 * h)) /
    (12 * h);
  const radialAcceleration = -derivative;
  return {
    x: (radialAcceleration * x) / radius,
    y: (radialAcceleration * y) / radius,
  };
}

export function orbitStepWithPotential(
  state: OrbitState,
  dt: number,
  potential: (radius: number) => number,
) {
  const first = centralAccelerationFromPotential(state.x, state.y, potential);
  const x = state.x + state.vx * dt + 0.5 * first.x * dt ** 2;
  const y = state.y + state.vy * dt + 0.5 * first.y * dt ** 2;
  const second = centralAccelerationFromPotential(x, y, potential);
  return {
    t: state.t + dt,
    x,
    y,
    vx: state.vx + 0.5 * (first.x + second.x) * dt,
    vy: state.vy + 0.5 * (first.y + second.y) * dt,
  };
}

export function orbitalDiagnosticsWithPotential(
  state: OrbitState,
  potential: (radius: number) => number,
) {
  const radius = Math.max(1e-9, Math.hypot(state.x, state.y));
  const speed2 = state.vx ** 2 + state.vy ** 2;
  const angularMomentumValue = state.x * state.vy - state.y * state.vx;
  const radialVelocity = (state.x * state.vx + state.y * state.vy) / radius;
  const potentialValue = potential(radius);
  return {
    radius,
    kinetic: 0.5 * speed2,
    radialKinetic: 0.5 * radialVelocity ** 2,
    potential: potentialValue,
    energy: 0.5 * speed2 + potentialValue,
    angularMomentum: angularMomentumValue,
    arealVelocity: 0.5 * angularMomentumValue,
  };
}
