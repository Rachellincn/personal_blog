export type RigidShape =
  | "point"
  | "ring"
  | "disc"
  | "sphere"
  | "shell"
  | "rod"
  | "plate";

export function rotationalKinematics(
  time: number,
  theta0: number,
  omega0: number,
  alpha: number,
) {
  return {
    theta: theta0 + omega0 * time + 0.5 * alpha * time ** 2,
    omega: omega0 + alpha * time,
    alpha,
  };
}

export function torque2D(
  position: { x: number; y: number },
  force: { x: number; y: number },
) {
  return position.x * force.y - position.y * force.x;
}

export function momentOfInertia(
  shape: RigidShape,
  mass: number,
  size: number,
  secondSize = size,
) {
  if (shape === "point" || shape === "ring") return mass * size ** 2;
  if (shape === "disc") return 0.5 * mass * size ** 2;
  if (shape === "sphere") return (2 / 5) * mass * size ** 2;
  if (shape === "shell") return (2 / 3) * mass * size ** 2;
  if (shape === "rod") return (1 / 12) * mass * size ** 2;
  return (1 / 12) * mass * (size ** 2 + secondSize ** 2);
}

export function parallelAxis(inertiaAtCenter: number, mass: number, offset: number) {
  return inertiaAtCenter + mass * offset ** 2;
}

export function radiusOfGyration(inertia: number, mass: number) {
  return Math.sqrt(Math.max(0, inertia / mass));
}

export function rollingAcceleration(
  gravity: number,
  angle: number,
  inertiaRatio: number,
) {
  return (gravity * Math.sin(angle)) / (1 + inertiaRatio);
}

export function rollingContactVelocity(
  centerVelocity: number,
  omega: number,
  radius: number,
) {
  return centerVelocity - omega * radius;
}

export function angularMomentum(inertia: number, omega: number) {
  return inertia * omega;
}

export function coupledDiscs(
  inertia1: number,
  omega1: number,
  inertia2: number,
  omega2: number,
) {
  const omega =
    (inertia1 * omega1 + inertia2 * omega2) / (inertia1 + inertia2);
  return {
    omega,
    angularMomentum: (inertia1 + inertia2) * omega,
    kineticBefore:
      0.5 * inertia1 * omega1 ** 2 + 0.5 * inertia2 * omega2 ** 2,
    kineticAfter: 0.5 * (inertia1 + inertia2) * omega ** 2,
  };
}

export function steadyPrecession(
  mass: number,
  gravity: number,
  leverArm: number,
  spinInertia: number,
  spinOmega: number,
) {
  const spinAngularMomentum = spinInertia * spinOmega;
  return {
    torque: mass * gravity * leverArm,
    spinAngularMomentum,
    precessionOmega:
      spinAngularMomentum === 0
        ? 0
        : (mass * gravity * leverArm) / spinAngularMomentum,
  };
}
