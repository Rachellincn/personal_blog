export function stableDerivative(
  fn: (x: number) => number,
  x: number,
  scale = 1,
) {
  const h = Math.max(1e-4, Math.abs(scale) * 1e-3);
  return (
    (fn(x - 2 * h) - 8 * fn(x - h) + 8 * fn(x + h) - fn(x + 2 * h)) / (12 * h)
  );
}

export function workFromSamples(samples: Array<{ x: number; force: number }>) {
  let work = 0;
  for (let index = 1; index < samples.length; index += 1)
    work +=
      0.5 *
      (samples[index - 1].force + samples[index].force) *
      (samples[index].x - samples[index - 1].x);
  return work;
}

export function energyStep(
  state: { x: number; v: number },
  dt: number,
  mass: number,
  potential: (x: number) => number,
  friction = 0,
) {
  const force =
    -stableDerivative(potential, state.x, Math.max(1, Math.abs(state.x))) -
    friction * Math.sign(state.v);
  const halfV = state.v + ((0.5 * force) / mass) * dt;
  const x = state.x + halfV * dt;
  const nextForce =
    -stableDerivative(potential, x, Math.max(1, Math.abs(x))) -
    friction * Math.sign(halfV);
  const v = halfV + ((0.5 * nextForce) / mass) * dt;
  return {
    x,
    v,
    force: nextForce,
    kinetic: 0.5 * mass * v ** 2,
    potential: potential(x),
  };
}

export function classifyEquilibrium(
  potential: (x: number) => number,
  x: number,
) {
  const h = 1e-3 * Math.max(1, Math.abs(x));
  const first = stableDerivative(potential, x);
  const second =
    (potential(x + h) - 2 * potential(x) + potential(x - h)) / h ** 2;
  return {
    equilibrium: Math.abs(first) < 1e-3,
    stable: second > 0,
    curvature: second,
  };
}
