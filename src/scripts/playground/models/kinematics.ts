export interface MotionState {
  t: number;
  x: number;
  v: number;
  a: number;
}
export interface ProjectileState {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}
export interface AccelerationSegment {
  until: number;
  acceleration: number;
}

export function constantAcceleration(
  t: number,
  x0: number,
  v0: number,
  acceleration: number,
): MotionState {
  return {
    t,
    x: x0 + v0 * t + 0.5 * acceleration * t * t,
    v: v0 + acceleration * t,
    a: acceleration,
  };
}

export function piecewiseMotion(
  t: number,
  x0: number,
  v0: number,
  segments: AccelerationSegment[],
): MotionState {
  let x = x0;
  let v = v0;
  let elapsed = 0;
  let acceleration = segments.at(-1)?.acceleration ?? 0;
  for (const segment of segments) {
    const duration = Math.max(0, Math.min(t, segment.until) - elapsed);
    if (duration > 0) {
      x += v * duration + 0.5 * segment.acceleration * duration ** 2;
      v += segment.acceleration * duration;
      elapsed += duration;
    }
    acceleration = segment.acceleration;
    if (elapsed >= t) break;
  }
  if (elapsed < t) {
    const duration = t - elapsed;
    x += v * duration + 0.5 * acceleration * duration ** 2;
    v += acceleration * duration;
  }
  return { t, x, v, a: acceleration };
}

export function parseAccelerationProgram(
  source: string,
): AccelerationSegment[] {
  const parsed = source
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [untilText, accelerationText] = part.split(":");
      return {
        until: Number(untilText),
        acceleration: Number(accelerationText),
      };
    })
    .filter(
      (segment) =>
        Number.isFinite(segment.until) &&
        Number.isFinite(segment.acceleration) &&
        segment.until > 0,
    )
    .sort((a, b) => a.until - b.until);
  return parsed.length ? parsed : [{ until: 10, acceleration: 0 }];
}

export function projectileAnalytic(
  t: number,
  speed: number,
  angle: number,
  gravity: number,
  height = 0,
  wind = 0,
): ProjectileState {
  const vx = speed * Math.cos(angle) + wind;
  const vy0 = speed * Math.sin(angle);
  return {
    t,
    x: vx * t,
    y: height + vy0 * t - 0.5 * gravity * t ** 2,
    vx,
    vy: vy0 - gravity * t,
  };
}

export function projectileStep(
  state: ProjectileState,
  dt: number,
  gravity: number,
  drag: number,
  wind = 0,
  quadratic = false,
): ProjectileState {
  const derivative = (sample: ProjectileState) => {
    const relativeX = sample.vx - wind;
    const relativeY = sample.vy;
    const speed = Math.hypot(relativeX, relativeY);
    const factor = quadratic ? drag * speed : drag;
    return {
      dx: sample.vx,
      dy: sample.vy,
      dvx: -factor * relativeX,
      dvy: -gravity - factor * relativeY,
    };
  };
  const k1 = derivative(state);
  const s2 = {
    ...state,
    x: state.x + (k1.dx * dt) / 2,
    y: state.y + (k1.dy * dt) / 2,
    vx: state.vx + (k1.dvx * dt) / 2,
    vy: state.vy + (k1.dvy * dt) / 2,
  };
  const k2 = derivative(s2);
  const s3 = {
    ...state,
    x: state.x + (k2.dx * dt) / 2,
    y: state.y + (k2.dy * dt) / 2,
    vx: state.vx + (k2.dvx * dt) / 2,
    vy: state.vy + (k2.dvy * dt) / 2,
  };
  const k3 = derivative(s3);
  const s4 = {
    ...state,
    x: state.x + k3.dx * dt,
    y: state.y + k3.dy * dt,
    vx: state.vx + k3.dvx * dt,
    vy: state.vy + k3.dvy * dt,
  };
  const k4 = derivative(s4);
  return {
    t: state.t + dt,
    x: state.x + (dt * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx)) / 6,
    y: state.y + (dt * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy)) / 6,
    vx: state.vx + (dt * (k1.dvx + 2 * k2.dvx + 2 * k3.dvx + k4.dvx)) / 6,
    vy: state.vy + (dt * (k1.dvy + 2 * k2.dvy + 2 * k3.dvy + k4.dvy)) / 6,
  };
}

export function circularMotion(
  t: number,
  radius: number,
  omega0: number,
  alpha: number,
) {
  const theta = omega0 * t + 0.5 * alpha * t ** 2;
  const omega = omega0 + alpha * t;
  return circularMotionState(radius, theta, omega, alpha);
}

export function circularMotionState(
  radius: number,
  theta: number,
  omega: number,
  alpha: number,
) {
  const position = { x: radius * Math.cos(theta), y: radius * Math.sin(theta) };
  const velocity = {
    x: -radius * omega * Math.sin(theta),
    y: radius * omega * Math.cos(theta),
  };
  const tangential = {
    x: -radius * alpha * Math.sin(theta),
    y: radius * alpha * Math.cos(theta),
  };
  const normal = {
    x: -radius * omega ** 2 * Math.cos(theta),
    y: -radius * omega ** 2 * Math.sin(theta),
  };
  return {
    theta,
    omega,
    alpha,
    position,
    velocity,
    tangential,
    normal,
    acceleration: { x: tangential.x + normal.x, y: tangential.y + normal.y },
  };
}
