import assert from "node:assert/strict";
import test from "node:test";
import {
  circularMotion,
  constantAcceleration,
  projectileAnalytic,
  projectileStep,
} from "../src/scripts/playground/models/kinematics.ts";
import {
  atwoodMachine,
  horizontalFriction,
  ropeConstraintError,
} from "../src/scripts/playground/models/dynamics.ts";
import {
  centerOfMass,
  collide1D,
  resolveDiscCollision,
} from "../src/scripts/playground/models/collisions.ts";
import { energyStep } from "../src/scripts/playground/models/energy.ts";
import { evaluateExpression } from "../src/scripts/playground/models/expression.ts";
import {
  angularMomentum,
  rollingContactVelocity,
} from "../src/scripts/playground/models/rotation.ts";
import {
  chainModes,
  modeDot,
  oscillatorStep,
  pendulumStep,
  smallAnglePeriod,
} from "../src/scripts/playground/models/oscillations.ts";
import { reflectionCoefficient } from "../src/scripts/playground/models/waves.ts";
import {
  circularOrbitRadius,
  effectivePotential,
  orbitalDiagnostics,
  orbitStep,
} from "../src/scripts/playground/models/orbits.ts";

const near = (actual: number, expected: number, tolerance: number, label: string) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`,
  );

test("uniform acceleration matches the analytic state", () => {
  const state = constantAcceleration(3.2, -1, 2.5, -0.7);
  near(state.x, -1 + 2.5 * 3.2 - 0.5 * 0.7 * 3.2 ** 2, 1e-12, "x(t)");
  near(state.v, 2.5 - 0.7 * 3.2, 1e-12, "v(t)");
  near(state.a, -0.7, 1e-12, "a(t)");
});

test("safe editable expressions support variables, powers, and functions", () => {
  near(
    evaluateExpression("0.5*x^4-1.25*x^2+sin(pi/2)", { x: 2 }),
    4,
    1e-12,
    "editable expression",
  );
  assert.equal(evaluateExpression("window.alert(1)", { x: 1 }, 7), 7);
});

test("zero-drag RK4 projectile agrees with the analytic trajectory", () => {
  const speed = 27;
  const angle = 0.71;
  const gravity = 9.81;
  const height = 3;
  let numeric = {
    t: 0,
    x: 0,
    y: height,
    vx: speed * Math.cos(angle),
    vy: speed * Math.sin(angle),
  };
  for (let index = 0; index < 400; index += 1)
    numeric = projectileStep(numeric, 0.005, gravity, 0);
  const analytic = projectileAnalytic(2, speed, angle, gravity, height);
  near(numeric.x, analytic.x, 1e-9, "projectile x");
  near(numeric.y, analytic.y, 1e-9, "projectile y");
  near(numeric.vy, analytic.vy, 1e-9, "projectile vy");
});

test("circular velocity remains perpendicular to the radius", () => {
  for (const time of [0, 0.2, 1.1, 4.7]) {
    const sample = circularMotion(time, 2.4, 1.7, 0.13);
    const dot =
      sample.position.x * sample.velocity.x +
      sample.position.y * sample.velocity.y;
    near(dot, 0, 1e-12, "r·v");
  }
});

test("an isolated multi-particle system preserves total momentum", () => {
  const particles = [
    { mass: 1, x: -1, y: 0, vx: 2, vy: 0.5 },
    { mass: 3, x: 0, y: 1, vx: -0.4, vy: -0.2 },
    { mass: 2, x: 1, y: -1, vx: 0.1, vy: 0.05 },
  ];
  const before = centerOfMass(particles);
  const advanced = particles.map((particle) => ({
    ...particle,
    x: particle.x + particle.vx * 12,
    y: particle.y + particle.vy * 12,
  }));
  const after = centerOfMass(advanced);
  near(after.px, before.px, 1e-12, "Px");
  near(after.py, before.py, 1e-12, "Py");
});

test("a completely elastic 1D collision conserves momentum and kinetic energy", () => {
  const first = { mass: 1.7, velocity: 3.2 };
  const second = { mass: 2.4, velocity: -0.6 };
  const result = collide1D(first, second, 1);
  const momentumBefore = first.mass * first.velocity + second.mass * second.velocity;
  const momentumAfter = first.mass * result.v1 + second.mass * result.v2;
  const energyBefore =
    0.5 * first.mass * first.velocity ** 2 +
    0.5 * second.mass * second.velocity ** 2;
  const energyAfter =
    0.5 * first.mass * result.v1 ** 2 +
    0.5 * second.mass * result.v2 ** 2;
  near(momentumAfter, momentumBefore, 1e-12, "elastic momentum");
  near(energyAfter, energyBefore, 1e-12, "elastic energy");
});

test("a completely inelastic 1D collision conserves momentum", () => {
  const result = collide1D(
    { mass: 1, velocity: 4 },
    { mass: 3, velocity: -1 },
    0,
  );
  near(result.v1, result.v2, 1e-12, "common final velocity");
  near(result.v1 + 3 * result.v2, 1, 1e-12, "inelastic momentum");
});

test("a frictionless spring integrated with velocity Verlet conserves energy", () => {
  const potential = (x: number) => 0.5 * 2.5 * x ** 2;
  let state = { x: 1.8, v: -0.2 };
  const initial = 0.5 * state.v ** 2 + potential(state.x);
  let largestRelativeDrift = 0;
  for (let index = 0; index < 20_000; index += 1) {
    const next = energyStep(state, 0.001, 1, potential, 0);
    state = { x: next.x, v: next.v };
    const energy = 0.5 * state.v ** 2 + potential(state.x);
    largestRelativeDrift = Math.max(
      largestRelativeDrift,
      Math.abs(energy - initial) / initial,
    );
  }
  assert.ok(largestRelativeDrift < 2e-5, `relative drift ${largestRelativeDrift}`);
});

test("static friction matches demand and never exceeds μsN", () => {
  const held = horizontalFriction(2, 4, 0.5, 0.3);
  assert.equal(held.mode, "static");
  near(held.friction, -4, 1e-12, "adaptive static friction");
  assert.ok(Math.abs(held.friction) <= 0.5 * held.normal);
});

test("Atwood motion satisfies the rope-length constraint", () => {
  const solution = atwoodMachine(2, 4, 9.81, 0.6, 0.4);
  assert.equal(solution.taut, true);
  const initial = 3.4;
  for (const displacement of [-0.8, -0.1, 0, 0.6]) {
    const side1 = 1.7 + displacement;
    const side2 = 1.7 - displacement;
    near(ropeConstraintError([side1, side2], [1, 1], initial), 0, 1e-12, "rope length");
  }
});

test("representative models never emit NaN or Infinity", () => {
  const atwood = atwoodMachine(0.2, 8, 24.79, 4, 0.2);
  const collision = resolveDiscCollision(
    { mass: 0.3, radius: 0.2, x: 0, y: 0, vx: 40, vy: 2 },
    { mass: 5, radius: 0.5, x: 0.6, y: 0, vx: -20, vy: 0 },
    0.85,
  );
  const values = [
    ...Object.values(atwood),
    ...Object.values(collision.a),
    ...Object.values(collision.b),
  ].filter((value): value is number => typeof value === "number");
  assert.ok(values.every(Number.isFinite));
});

test("angular momentum is constant when external torque is zero", () => {
  const conserved = angularMomentum(4.2, 1.7);
  for (const inertia of [0.8, 1.5, 3.1, 7.4])
    near(angularMomentum(inertia, conserved / inertia), conserved, 1e-12, "Iω");
});

test("pure rolling satisfies v = ωR at the contact point", () => {
  for (const sample of [
    { v: 2, omega: 4, radius: 0.5 },
    { v: -1.8, omega: -3, radius: 0.6 },
    { v: 0, omega: 0, radius: 2 },
  ]) near(rollingContactVelocity(sample.v, sample.omega, sample.radius), 0, 1e-12, "contact velocity");
});

test("small-amplitude pendulum period approaches 2π√(l/g)", () => {
  const length = 1.3;
  const gravity = 9.81;
  const dt = 0.0005;
  let state = { t: 0, x: 0.02, v: 0 };
  let previous = state.x;
  const downwardCrossings: number[] = [];
  for (let index = 0; index < 30_000 && downwardCrossings.length < 2; index += 1) {
    state = pendulumStep(state, dt, length, gravity);
    if (previous > 0 && state.x <= 0 && state.v < 0) downwardCrossings.push(state.t);
    previous = state.x;
  }
  assert.equal(downwardCrossings.length, 2);
  near(downwardCrossings[1] - downwardCrossings[0], smallAnglePeriod(length, gravity), 8e-4, "pendulum period");
});

test("undamped harmonic oscillator conserves mechanical energy", () => {
  const mass = 1.7;
  const spring = 5.2;
  let state = { t: 0, x: 1.4, v: -0.3 };
  const initial = 0.5 * mass * state.v ** 2 + 0.5 * spring * state.x ** 2;
  let largestDrift = 0;
  for (let index = 0; index < 20_000; index += 1) {
    state = oscillatorStep(state, 0.001, mass, spring, 0);
    const energy = 0.5 * mass * state.v ** 2 + 0.5 * spring * state.x ** 2;
    largestDrift = Math.max(largestDrift, Math.abs(energy - initial) / initial);
  }
  assert.ok(largestDrift < 2e-5, `oscillator energy drift ${largestDrift}`);
});

test("damped oscillator energy decreases overall", () => {
  const mass = 1;
  const spring = 4;
  let state = { t: 0, x: 2, v: 0 };
  const initial = 0.5 * spring * state.x ** 2;
  let previousEnergy = initial;
  let numericalIncrease = 0;
  for (let index = 0; index < 20_000; index += 1) {
    state = oscillatorStep(state, 0.001, mass, spring, 0.7);
    const energy = 0.5 * mass * state.v ** 2 + 0.5 * spring * state.x ** 2;
    numericalIncrease = Math.max(numericalIncrease, energy - previousEnergy);
    previousEnergy = energy;
  }
  assert.ok(previousEnergy < initial * 1e-5);
  assert.ok(numericalIncrease < 1e-8, `largest energy increase ${numericalIncrease}`);
});

test("coupled-chain normal modes are orthogonal", () => {
  const modes = chainModes(7, 1.2, 3.4, "fixed");
  modes.forEach((mode, index) => {
    near(modeDot(mode.shape, mode.shape), 1, 1e-12, `mode ${index} norm`);
    modes.slice(index + 1).forEach((other, otherIndex) =>
      near(modeDot(mode.shape, other.shape), 0, 2e-12, `mode ${index}·${index + otherIndex + 1}`),
    );
  });
});

test("fixed-end reflection reverses phase", () => {
  assert.equal(reflectionCoefficient("fixed"), -1);
});

test("free-end reflection preserves phase", () => {
  assert.equal(reflectionCoefficient("free"), 1);
});

test("Kepler integration approximately conserves angular momentum", () => {
  const mu = 4;
  let state = { t: 0, x: 3, y: 0, vx: 0, vy: 0.95 };
  const initial = orbitalDiagnostics(state, mu).angularMomentum;
  let largestError = 0;
  for (let index = 0; index < 40_000; index += 1) {
    state = orbitStep(state, 0.001, mu);
    largestError = Math.max(largestError, Math.abs(orbitalDiagnostics(state, mu).angularMomentum - initial));
  }
  assert.ok(largestError < 2e-10, `angular momentum error ${largestError}`);
});

test("Kepler ellipse has approximately constant areal velocity", () => {
  const mu = 4;
  let state = { t: 0, x: 3, y: 0, vx: 0, vy: 0.95 };
  const expected = orbitalDiagnostics(state, mu).arealVelocity;
  let largestError = 0;
  for (let index = 0; index < 25_000; index += 1) {
    state = orbitStep(state, 0.0015, mu);
    largestError = Math.max(largestError, Math.abs(orbitalDiagnostics(state, mu).arealVelocity - expected));
  }
  assert.ok(largestError < 2e-10, `areal-velocity error ${largestError}`);
});

test("Newtonian circular orbit is an extremum of effective potential", () => {
  const mu = 4.3;
  const angularMomentumValue = 2.7;
  const radius = circularOrbitRadius(mu, angularMomentumValue);
  const h = 1e-5;
  const derivative =
    (effectivePotential(radius + h, mu, angularMomentumValue) -
      effectivePotential(radius - h, mu, angularMomentumValue)) /
    (2 * h);
  const curvature =
    (effectivePotential(radius + h, mu, angularMomentumValue) -
      2 * effectivePotential(radius, mu, angularMomentumValue) +
      effectivePotential(radius - h, mu, angularMomentumValue)) /
    h ** 2;
  near(derivative, 0, 2e-9, "dUeff/dr");
  assert.ok(curvature > 0, "circular orbit should be a stable minimum");
});

test("long symplectic orbit keeps energy drift within tolerance", () => {
  const mu = 4;
  let state = { t: 0, x: 3, y: 0, vx: 0, vy: 0.95 };
  const initial = orbitalDiagnostics(state, mu).energy;
  let largestRelativeDrift = 0;
  for (let index = 0; index < 100_000; index += 1) {
    state = orbitStep(state, 0.001, mu);
    largestRelativeDrift = Math.max(
      largestRelativeDrift,
      Math.abs((orbitalDiagnostics(state, mu).energy - initial) / initial),
    );
  }
  assert.ok(largestRelativeDrift < 2e-5, `long-term relative drift ${largestRelativeDrift}`);
});
