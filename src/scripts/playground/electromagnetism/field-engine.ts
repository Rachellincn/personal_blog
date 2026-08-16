import { DEFAULT_SINGULARITY_RADIUS, electricFieldAt, normalize, type PointCharge, type Vec2 } from './electrostatics';

export interface FieldBounds { minX: number; maxX: number; minY: number; maxY: number }
export type VectorField = (point: Vec2) => Vec2 | null;
export type ScalarField = (point: Vec2) => number | null;

export interface VectorSample extends Vec2 {
  vector: Vec2 | null;
  magnitude: number | null;
}

export interface FluxSample extends Vec2 {
  normal: Vec2;
  density: number | null;
}

export interface FluxResult {
  value: number;
  evaluatedSegments: number;
  skippedSegments: number;
  samples: FluxSample[];
}

export function sampleVectorField(field: VectorField, bounds: FieldBounds, columns: number, rows: number) {
  const samples: VectorSample[] = [];
  for (let row = 0; row < rows; row += 1) {
    const y = bounds.minY + (bounds.maxY - bounds.minY) * row / Math.max(1, rows - 1);
    for (let column = 0; column < columns; column += 1) {
      const x = bounds.minX + (bounds.maxX - bounds.minX) * column / Math.max(1, columns - 1);
      const vector = field({ x, y });
      samples.push({ x, y, vector, magnitude: vector ? Math.hypot(vector.x, vector.y) : null });
    }
  }
  return samples;
}

export function robustMagnitudeReference(samples: VectorSample[], percentile = .88) {
  const magnitudes = samples.flatMap((sample) => sample.magnitude && Number.isFinite(sample.magnitude) ? [sample.magnitude] : []).sort((a, b) => a - b);
  if (!magnitudes.length) return 1;
  return magnitudes[Math.min(magnitudes.length - 1, Math.floor((magnitudes.length - 1) * percentile))];
}

export function scaledArrowLength(magnitude: number, reference: number, maxLength: number, logarithmic: boolean) {
  if (!(magnitude > 0) || !(reference > 0)) return 0;
  const ratio = logarithmic ? Math.log1p(9 * magnitude / reference) / Math.log(10) : magnitude / reference;
  return maxLength * Math.max(.12, Math.min(1, ratio));
}

export function traceStreamline(seed: Vec2, field: VectorField, bounds: FieldBounds, options: { step?: number; maxSteps?: number; direction?: 1 | -1; stopRadius?: number; sources?: PointCharge[] } = {}) {
  const step = options.step ?? .045;
  const maxSteps = options.maxSteps ?? 500;
  const direction = options.direction ?? 1;
  const stopRadius = options.stopRadius ?? DEFAULT_SINGULARITY_RADIUS * 1.1;
  const points: Vec2[] = [seed];
  let point = seed;
  for (let index = 0; index < maxSteps; index += 1) {
    const first = field(point);
    if (!first) break;
    const unit = normalize(first);
    if (!unit) break;
    const midpoint = { x: point.x + unit.x * direction * step / 2, y: point.y + unit.y * direction * step / 2 };
    const midpointVector = field(midpoint);
    const midpointUnit = midpointVector && normalize(midpointVector);
    if (!midpointUnit) break;
    const next = { x: point.x + midpointUnit.x * direction * step, y: point.y + midpointUnit.y * direction * step };
    if (!contains(bounds, next)) break;
    points.push(next);
    point = next;
    if (options.sources?.some((source) => Math.hypot(point.x - source.position.x, point.y - source.position.y) <= stopRadius)) break;
    if (points.length > 30 && Math.hypot(point.x - seed.x, point.y - seed.y) < step * .7) break;
  }
  return points;
}

export function fieldLinesForCharges(sources: PointCharge[], bounds: FieldBounds, baseLineCount = 12) {
  const field: VectorField = (point) => electricFieldAt(point, sources).vector;
  const emitting = sources.some((source) => source.charge > 0) ? sources.filter((source) => source.charge > 0) : sources.filter((source) => source.charge < 0);
  const maximumCharge = Math.max(...emitting.map((source) => Math.abs(source.charge)), 1e-12);
  return emitting.flatMap((source) => {
    const count = Math.max(6, Math.min(24, Math.round(baseLineCount * Math.abs(source.charge) / maximumCharge)));
    const direction: 1 | -1 = source.charge > 0 ? 1 : -1;
    return Array.from({ length: count }, (_, index) => {
      const angle = index / count * Math.PI * 2;
      const radius = DEFAULT_SINGULARITY_RADIUS * 1.18;
      const seed = { x: source.position.x + Math.cos(angle) * radius, y: source.position.y + Math.sin(angle) * radius };
      const points = traceStreamline(seed, field, bounds, { direction, sources, step: .038, maxSteps: 620 });
      return direction === 1 ? points : [...points].reverse();
    });
  });
}

export function contourSegments(field: ScalarField, bounds: FieldBounds, columns: number, rows: number, levels: number[]) {
  const values = Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => {
    const point = gridPoint(bounds, column, row, columns, rows);
    return field(point);
  }));
  return levels.map((level) => ({
    level,
    segments: marchLevel(values, bounds, columns, rows, level),
  }));
}

export function fluxThroughClosedPolyline(points: Vec2[], field: VectorField): FluxResult {
  if (points.length < 3) return { value: 0, evaluatedSegments: 0, skippedSegments: 0, samples: [] };
  const oriented = signedArea(points) >= 0 ? points : [...points].reverse();
  let value = 0;
  let evaluatedSegments = 0;
  let skippedSegments = 0;
  const samples: FluxSample[] = [];
  for (let index = 0; index < oriented.length; index += 1) {
    const a = oriented[index];
    const b = oriented[(index + 1) % oriented.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) continue;
    const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const normal = { x: dy / length, y: -dx / length };
    const vector = field(midpoint);
    if (!vector) {
      skippedSegments += 1;
      samples.push({ ...midpoint, normal, density: null });
      continue;
    }
    const density = vector.x * normal.x + vector.y * normal.y;
    value += density * length;
    evaluatedSegments += 1;
    samples.push({ ...midpoint, normal, density });
  }
  return { value, evaluatedSegments, skippedSegments, samples };
}

export function advanceTracer(position: Vec2, field: VectorField, distance: number) {
  const vector = field(position);
  const unit = vector && normalize(vector);
  return unit ? { x: position.x + unit.x * distance, y: position.y + unit.y * distance } : null;
}

export function ellipsePolyline(center: Vec2, radiusX: number, radiusY: number, segments = 96) {
  return Array.from({ length: segments }, (_, index) => {
    const angle = index / segments * Math.PI * 2;
    return { x: center.x + Math.cos(angle) * radiusX, y: center.y + Math.sin(angle) * radiusY };
  });
}

function marchLevel(values: Array<Array<number | null>>, bounds: FieldBounds, columns: number, rows: number, level: number) {
  const segments: Array<[Vec2, Vec2]> = [];
  for (let row = 0; row < rows - 1; row += 1) for (let column = 0; column < columns - 1; column += 1) {
    const corners = [values[row][column], values[row][column + 1], values[row + 1][column + 1], values[row + 1][column]];
    if (corners.some((value) => value === null || !Number.isFinite(value))) continue;
    const points = [
      gridPoint(bounds, column, row, columns, rows),
      gridPoint(bounds, column + 1, row, columns, rows),
      gridPoint(bounds, column + 1, row + 1, columns, rows),
      gridPoint(bounds, column, row + 1, columns, rows),
    ];
    const crossings: Vec2[] = [];
    for (let edge = 0; edge < 4; edge += 1) {
      const next = (edge + 1) % 4;
      const a = corners[edge]!;
      const b = corners[next]!;
      if ((a < level) === (b < level) || a === b) continue;
      const ratio = (level - a) / (b - a);
      crossings.push({ x: points[edge].x + (points[next].x - points[edge].x) * ratio, y: points[edge].y + (points[next].y - points[edge].y) * ratio });
    }
    if (crossings.length === 2) segments.push([crossings[0], crossings[1]]);
    if (crossings.length === 4) {
      const center = corners.reduce<number>((sum, value) => sum + (value ?? 0), 0) / 4;
      const pairs = center >= level ? [[0, 1], [2, 3]] : [[0, 3], [1, 2]];
      pairs.forEach(([a, b]) => segments.push([crossings[a], crossings[b]]));
    }
  }
  return segments;
}

function gridPoint(bounds: FieldBounds, column: number, row: number, columns: number, rows: number): Vec2 {
  return {
    x: bounds.minX + (bounds.maxX - bounds.minX) * column / Math.max(1, columns - 1),
    y: bounds.minY + (bounds.maxY - bounds.minY) * row / Math.max(1, rows - 1),
  };
}

function contains(bounds: FieldBounds, point: Vec2) {
  return point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY;
}

function signedArea(points: Vec2[]) {
  return points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + point.x * next.y - next.x * point.y;
  }, 0) / 2;
}
