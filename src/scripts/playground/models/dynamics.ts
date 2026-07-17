export interface FrictionResult {
  friction: number;
  normal: number;
  acceleration: number;
  mode: "static" | "kinetic";
}

export function horizontalFriction(
  mass: number,
  appliedForce: number,
  muStatic: number,
  muKinetic: number,
  gravity = 9.81,
  moving = false,
): FrictionResult {
  const normal = mass * gravity;
  const maximumStatic = muStatic * normal;
  if (!moving && Math.abs(appliedForce) <= maximumStatic)
    return { friction: -appliedForce, normal, acceleration: 0, mode: "static" };
  const direction = Math.sign(appliedForce) || 1;
  const friction = -direction * muKinetic * normal;
  return {
    friction,
    normal,
    acceleration: (appliedForce + friction) / mass,
    mode: "kinetic",
  };
}

export function inclineForces(
  mass: number,
  angle: number,
  muStatic: number,
  muKinetic: number,
  gravity = 9.81,
  moving = false,
) {
  const parallel = mass * gravity * Math.sin(angle);
  const normal = mass * gravity * Math.cos(angle);
  const maximumStatic = muStatic * normal;
  if (!moving && parallel <= maximumStatic)
    return {
      parallel,
      normal,
      friction: -parallel,
      acceleration: 0,
      mode: "static" as const,
    };
  const friction = -muKinetic * normal;
  return {
    parallel,
    normal,
    friction,
    acceleration: (parallel + friction) / mass,
    mode: "kinetic" as const,
  };
}

export function atwoodMachine(
  m1: number,
  m2: number,
  gravity = 9.81,
  pulleyInertia = 0,
  radius = 1,
) {
  const denominator = m1 + m2 + pulleyInertia / radius ** 2;
  const acceleration = (gravity * (m2 - m1)) / denominator;
  const tension1 = m1 * (gravity + acceleration);
  const tension2 = m2 * (gravity - acceleration);
  if (tension1 < 0 || tension2 < 0)
    return {
      acceleration: 0,
      tension1: 0,
      tension2: 0,
      angularAcceleration: 0,
      taut: false,
    };
  return {
    acceleration,
    tension1,
    tension2,
    angularAcceleration: acceleration / radius,
    taut: true,
  };
}

export function connectedBlocks(
  m1: number,
  m2: number,
  force: number,
  friction1 = 0,
  friction2 = 0,
) {
  const net = force - friction1 - friction2;
  const acceleration = net / (m1 + m2);
  const tension = m1 * acceleration + friction1;
  return tension < 0
    ? { acceleration: force / m2, tension: 0, taut: false }
    : { acceleration, tension, taut: true };
}

export function ropeConstraintError(
  displacements: number[],
  coefficients: number[],
  referenceLength: number,
) {
  const length = displacements.reduce(
    (sum, displacement, index) =>
      sum + displacement * (coefficients[index] ?? 1),
    0,
  );
  return length - referenceLength;
}
