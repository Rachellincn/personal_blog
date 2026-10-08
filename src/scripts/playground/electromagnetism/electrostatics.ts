export interface Vec2 { x: number; y: number }

export interface PointCharge {
  id: string;
  position: Vec2;
  charge: number;
  fixed?: boolean;
}

export interface TestCharge extends PointCharge {
  test: true;
}

export interface FieldEvaluation {
  vector: Vec2 | null;
  magnitude: number | null;
  singularSourceId?: string;
  contributions: Array<{ sourceId: string; vector: Vec2; magnitude: number }>;
}

export interface ScalarEvaluation {
  value: number | null;
  singularSourceId?: string;
}

export const COULOMB_CONSTANT = 8.9875517923e9;
export const DEFAULT_SINGULARITY_RADIUS = .09;

export function electricFieldAt(point: Vec2, sources: PointCharge[], singularityRadius = DEFAULT_SINGULARITY_RADIUS): FieldEvaluation {
  const contributions: FieldEvaluation['contributions'] = [];
  let x = 0;
  let y = 0;
  for (const source of sources) {
    const dx = point.x - source.position.x;
    const dy = point.y - source.position.y;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared < singularityRadius * singularityRadius) {
      return { vector: null, magnitude: null, singularSourceId: source.id, contributions: [] };
    }
    const distance = Math.sqrt(distanceSquared);
    const scale = COULOMB_CONSTANT * source.charge / (distanceSquared * distance);
    const vector = { x: scale * dx, y: scale * dy };
    const magnitude = Math.hypot(vector.x, vector.y);
    contributions.push({ sourceId: source.id, vector, magnitude });
    x += vector.x;
    y += vector.y;
  }
  return { vector: { x, y }, magnitude: Math.hypot(x, y), contributions };
}

export function electricPotentialAt(point: Vec2, sources: PointCharge[], singularityRadius = DEFAULT_SINGULARITY_RADIUS): ScalarEvaluation {
  let value = 0;
  for (const source of sources) {
    const distance = Math.hypot(point.x - source.position.x, point.y - source.position.y);
    if (distance < singularityRadius) return { value: null, singularSourceId: source.id };
    value += COULOMB_CONSTANT * source.charge / distance;
  }
  return { value };
}

export function forceOnTestCharge(testCharge: TestCharge, sources: PointCharge[], singularityRadius = DEFAULT_SINGULARITY_RADIUS) {
  const evaluation = electricFieldAt(testCharge.position, sources.filter((source) => source.id !== testCharge.id), singularityRadius);
  if (!evaluation.vector) return null;
  return { x: testCharge.charge * evaluation.vector.x, y: testCharge.charge * evaluation.vector.y };
}

export function potentialEnergy(testCharge: TestCharge, sources: PointCharge[], singularityRadius = DEFAULT_SINGULARITY_RADIUS) {
  const evaluation = electricPotentialAt(testCharge.position, sources.filter((source) => source.id !== testCharge.id), singularityRadius);
  return evaluation.value === null ? null : testCharge.charge * evaluation.value;
}

export function negativePotentialGradient(point: Vec2, sources: PointCharge[], step = 1e-4, singularityRadius = DEFAULT_SINGULARITY_RADIUS): Vec2 | null {
  const xp = electricPotentialAt({ x: point.x + step, y: point.y }, sources, singularityRadius).value;
  const xm = electricPotentialAt({ x: point.x - step, y: point.y }, sources, singularityRadius).value;
  const yp = electricPotentialAt({ x: point.x, y: point.y + step }, sources, singularityRadius).value;
  const ym = electricPotentialAt({ x: point.x, y: point.y - step }, sources, singularityRadius).value;
  if ([xp, xm, yp, ym].some((value) => value === null)) return null;
  return { x: -(xp! - xm!) / (2 * step), y: -(yp! - ym!) / (2 * step) };
}

export function relativeVectorError(actual: Vec2, expected: Vec2) {
  return Math.hypot(actual.x - expected.x, actual.y - expected.y) / Math.max(1e-12, Math.hypot(expected.x, expected.y));
}

export function add(a: Vec2, b: Vec2): Vec2 { return { x: a.x + b.x, y: a.y + b.y }; }
export function subtract(a: Vec2, b: Vec2): Vec2 { return { x: a.x - b.x, y: a.y - b.y }; }
export function scale(vector: Vec2, factor: number): Vec2 { return { x: vector.x * factor, y: vector.y * factor }; }
export function normalize(vector: Vec2): Vec2 | null {
  const magnitude = Math.hypot(vector.x, vector.y);
  return magnitude > 1e-18 ? scale(vector, 1 / magnitude) : null;
}
