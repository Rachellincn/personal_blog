export interface CollisionBody1D {
  mass: number;
  velocity: number;
}

export function collide1D(
  first: CollisionBody1D,
  second: CollisionBody1D,
  restitution: number,
) {
  const e = Math.max(0, Math.min(1, restitution));
  const total = first.mass + second.mass;
  const v1 =
    (first.mass * first.velocity +
      second.mass * second.velocity -
      second.mass * e * (first.velocity - second.velocity)) /
    total;
  const v2 =
    (first.mass * first.velocity +
      second.mass * second.velocity +
      first.mass * e * (first.velocity - second.velocity)) /
    total;
  return { v1, v2 };
}

export function centerOfMass(
  particles: Array<{
    mass: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
  }>,
) {
  const mass = particles.reduce((sum, particle) => sum + particle.mass, 0);
  if (mass <= 0) return { mass: 0, x: 0, y: 0, vx: 0, vy: 0, px: 0, py: 0 };
  const weighted = particles.reduce(
    (sum, particle) => ({
      x: sum.x + particle.mass * particle.x,
      y: sum.y + particle.mass * particle.y,
      px: sum.px + particle.mass * particle.vx,
      py: sum.py + particle.mass * particle.vy,
    }),
    { x: 0, y: 0, px: 0, py: 0 },
  );
  return {
    mass,
    x: weighted.x / mass,
    y: weighted.y / mass,
    vx: weighted.px / mass,
    vy: weighted.py / mass,
    px: weighted.px,
    py: weighted.py,
  };
}

export interface Disc {
  mass: number;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function resolveDiscCollision(a: Disc, b: Disc, restitution = 1) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy) || 1e-9;
  const nx = dx / distance;
  const ny = dy / distance;
  const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (relative >= 0 || distance > a.radius + b.radius)
    return { a: { ...a }, b: { ...b }, collided: false };
  const impulse = (-(1 + restitution) * relative) / (1 / a.mass + 1 / b.mass);
  const nextA = {
    ...a,
    vx: a.vx - (impulse * nx) / a.mass,
    vy: a.vy - (impulse * ny) / a.mass,
  };
  const nextB = {
    ...b,
    vx: b.vx + (impulse * nx) / b.mass,
    vy: b.vy + (impulse * ny) / b.mass,
  };
  const overlap = a.radius + b.radius - distance;
  const correction = (Math.max(0, overlap) / (1 / a.mass + 1 / b.mass)) * 0.8;
  nextA.x -= (correction * nx) / a.mass;
  nextA.y -= (correction * ny) / a.mass;
  nextB.x += (correction * nx) / b.mass;
  nextB.y += (correction * ny) / b.mass;
  return { a: nextA, b: nextB, collided: true };
}

export function collisionSubsteps(
  maxSpeed: number,
  minimumRadius: number,
  dt: number,
) {
  return Math.max(
    1,
    Math.ceil((maxSpeed * dt) / Math.max(1e-6, minimumRadius * 0.35)),
  );
}
