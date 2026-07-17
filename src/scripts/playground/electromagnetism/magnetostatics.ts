import type { Vec3 } from './gauss-law';

export const MU_0 = 4e-7 * Math.PI;

export interface StraightWire {
  current: number;
  origin: Vec3;
  direction: Vec3;
}

export interface CurrentSegment {
  id: string;
  current: number;
  from: Vec3;
  to: Vec3;
}

export interface BiotSavartReport {
  field: Vec3 | null;
  contributions: Array<{ id: string; midpoint: Vec3; field: Vec3 | null; distance: number; wireDistance: number }>;
  skipped: number;
}

export interface CircularLoop {
  current: number;
  radius: number;
  turns: number;
}

export interface FiniteSolenoid {
  current: number;
  radius: number;
  length: number;
  turns: number;
}

export interface PlanarWire { id: string; current: number; position: { x: number; y: number } }
export interface AmpereLoop { kind: 'circle' | 'polygon'; points: Vec3[]; center?: { x: number; y: number }; radius?: number }
export type FieldGradient = [[number, number, number], [number, number, number], [number, number, number]];

export function straightWireField(wire: StraightWire, point: Vec3, minimumRadius = 1e-6): Vec3 | null {
  assertFinite(wire.current, 'current');
  assertPositive(minimumRadius, 'minimum radius');
  const direction = normalize(wire.direction, 'wire direction');
  const displacement = subtract(point, wire.origin);
  const perpendicular = subtract(displacement, scale(direction, dot(displacement, direction)));
  const radius = magnitude(perpendicular);
  if (radius < minimumRadius) return null;
  const azimuth = scale(cross(direction, perpendicular), 1 / radius);
  return scale(azimuth, MU_0 * wire.current / (2 * Math.PI * radius));
}

export function biotSavartField(segments: CurrentSegment[], point: Vec3, minimumDistance = 1e-6): BiotSavartReport {
  assertPositive(minimumDistance, 'minimum distance');
  const contributions = segments.map((segment) => {
    assertFinite(segment.current, `${segment.id} current`);
    const lengthElement = subtract(segment.to, segment.from);
    if (!(magnitude(lengthElement) > 0)) throw new Error(`${segment.id} must have nonzero length.`);
    const midpoint = scale(add(segment.from, segment.to), .5);
    const displacement = subtract(point, midpoint);
    const distance = magnitude(displacement);
    const wireDistance = distanceToSegment(point, segment.from, segment.to);
    if (wireDistance < minimumDistance) return { id: segment.id, midpoint, field: null, distance, wireDistance };
    return { id: segment.id, midpoint, field: scale(cross(lengthElement, displacement), MU_0 * segment.current / (4 * Math.PI * distance ** 3)), distance, wireDistance };
  });
  const skipped = contributions.filter((contribution) => contribution.field === null).length;
  return { field: skipped ? null : contributions.reduce((sum, contribution) => add(sum, contribution.field!), zero()), contributions, skipped };
}

export function circularLoopAxisReport(loop: CircularLoop, axialDistance: number) {
  assertFinite(loop.current, 'loop current');
  assertPositive(loop.radius, 'loop radius');
  assertPositive(loop.turns, 'turn count');
  assertFinite(axialDistance, 'axial distance');
  const exactField = MU_0 * loop.turns * loop.current * loop.radius ** 2 /
    (2 * (loop.radius ** 2 + axialDistance ** 2) ** 1.5);
  const magneticMoment = loop.turns * loop.current * Math.PI * loop.radius ** 2;
  const dipoleField = Math.abs(axialDistance) < 1e-12
    ? null
    : MU_0 * magneticMoment / (2 * Math.PI * Math.abs(axialDistance) ** 3);
  const relativeDipoleError = dipoleField === null || exactField === 0
    ? null
    : Math.abs(dipoleField - exactField) / Math.abs(exactField);
  return { exactField, dipoleField, relativeDipoleError, magneticMoment, axialDistance };
}

export function finiteSolenoidAxisReport(solenoid: FiniteSolenoid, axialDistance: number) {
  assertFinite(solenoid.current, 'solenoid current');
  assertPositive(solenoid.radius, 'solenoid radius');
  assertPositive(solenoid.length, 'solenoid length');
  assertPositive(solenoid.turns, 'turn count');
  assertFinite(axialDistance, 'axial distance');
  const halfLength = solenoid.length / 2;
  const numberDensity = solenoid.turns / solenoid.length;
  const idealInteriorField = MU_0 * numberDensity * solenoid.current;
  const upper = axialDistance + halfLength;
  const lower = axialDistance - halfLength;
  const field = idealInteriorField / 2 * (
    upper / Math.hypot(solenoid.radius, upper) -
    lower / Math.hypot(solenoid.radius, lower)
  );
  return {
    field,
    idealInteriorField,
    fringeFactor: idealInteriorField === 0 ? 0 : field / idealInteriorField,
    numberDensity,
    region: Math.abs(axialDistance) < halfLength ? 'inside' as const : 'outside' as const,
  };
}

export function magneticDipoleField(moment: Vec3, origin: Vec3, point: Vec3, minimumRadius = 1e-6): Vec3 | null {
  assertPositive(minimumRadius, 'minimum radius');
  assertVectorFinite(moment, 'magnetic moment');
  const displacement = subtract(point, origin);
  const radius = magnitude(displacement);
  if (radius < minimumRadius) return null;
  const radial = scale(displacement, 1 / radius);
  return scale(subtract(scale(radial, 3 * dot(moment, radial)), moment), MU_0 / (4 * Math.PI * radius ** 3));
}

export function magneticFluxThroughSphere(
  fieldAt: (point: Vec3) => Vec3 | null,
  center: Vec3,
  radius: number,
  latitudeBands = 36,
  longitudeBands = 72,
) {
  assertPositive(radius, 'sphere radius');
  if (!Number.isInteger(latitudeBands) || latitudeBands < 4 || !Number.isInteger(longitudeBands) || longitudeBands < 8) throw new Error('Sphere resolution is too small.');
  const dTheta = Math.PI / latitudeBands;
  const dPhi = 2 * Math.PI / longitudeBands;
  let flux = 0; let absoluteFlux = 0; let skipped = 0;
  for (let latitude = 0; latitude < latitudeBands; latitude += 1) {
    const theta = (latitude + .5) * dTheta;
    for (let longitude = 0; longitude < longitudeBands; longitude += 1) {
      const phi = (longitude + .5) * dPhi;
      const normal = { x: Math.sin(theta) * Math.cos(phi), y: Math.sin(theta) * Math.sin(phi), z: Math.cos(theta) };
      const field = fieldAt(add(center, scale(normal, radius)));
      if (field === null) { skipped += 1; continue; }
      const contribution = dot(field, normal) * radius ** 2 * Math.sin(theta) * dTheta * dPhi;
      flux += contribution; absoluteFlux += Math.abs(contribution);
    }
  }
  return { flux, absoluteFlux, skipped, samples: latitudeBands * longitudeBands };
}

export function circularAmpereLoop(center: { x: number; y: number }, radius: number, samples = 180): AmpereLoop {
  assertPositive(radius, 'loop radius');
  if (!Number.isInteger(samples) || samples < 16) throw new Error('Ampere loop needs at least 16 samples.');
  return {
    kind: 'circle', center: { ...center }, radius,
    points: Array.from({ length: samples }, (_, index) => {
      const angle = 2 * Math.PI * index / samples;
      return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle), z: 0 };
    }),
  };
}

export function ampereLoopReport(wires: PlanarWire[], loop: AmpereLoop, minimumRadius = 1e-6) {
  if (loop.points.length < 3) throw new Error('Ampere loop must be closed by at least three points.');
  const enclosedCurrent = wires.reduce((sum, wire) => sum + (pointInPolygon(wire.position, loop.points) ? wire.current : 0), 0);
  const contributions: Array<{ point: Vec3; lengthElement: Vec3; field: Vec3 | null; dotLength: number | null }> = [];
  let integral = 0; let skipped = 0;
  for (let index = 0; index < loop.points.length; index += 1) {
    const from = loop.points[index]; const to = loop.points[(index + 1) % loop.points.length];
    const lengthElement = subtract(to, from); const point = scale(add(from, to), .5);
    let field = zero(); let singular = false;
    for (const wire of wires) {
      const contribution = straightWireField({ current: wire.current, origin: { x: wire.position.x, y: wire.position.y, z: 0 }, direction: { x: 0, y: 0, z: 1 } }, point, minimumRadius);
      if (contribution === null) { singular = true; break; }
      field = add(field, contribution);
    }
    const dotLength = singular ? null : dot(field, lengthElement);
    if (dotLength === null) skipped += 1; else integral += dotLength;
    contributions.push({ point, lengthElement, field: singular ? null : field, dotLength });
  }
  const canExtractFieldBySymmetry = loop.kind === 'circle' && wires.length > 0 && Boolean(loop.center) && wires.every((wire) => Math.hypot(wire.position.x - loop.center!.x, wire.position.y - loop.center!.y) < 1e-10);
  return { integral: skipped ? null : integral, expectedIntegral: MU_0 * enclosedCurrent, enclosedCurrent, contributions, skipped, canExtractFieldBySymmetry };
}

export function magneticDipoleInteraction(options: { moment: Vec3; field: Vec3; fieldGradient?: FieldGradient }) {
  assertVectorFinite(options.moment, 'magnetic moment'); assertVectorFinite(options.field, 'magnetic field');
  const gradient = options.fieldGradient ?? [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  gradient.flat().forEach((value, index) => assertFinite(value, `field gradient ${index}`));
  const components = [options.moment.x, options.moment.y, options.moment.z];
  const forceValues = [0, 1, 2].map((coordinate) => components.reduce((sum, moment, fieldComponent) => sum + moment * gradient[fieldComponent][coordinate], 0));
  return {
    torque: cross(options.moment, options.field),
    potentialEnergy: -dot(options.moment, options.field),
    force: { x: forceValues[0], y: forceValues[1], z: forceValues[2] },
  };
}

export function wireForce(current: number, lengthVector: Vec3, field: Vec3) {
  assertFinite(current, 'wire current'); assertVectorFinite(lengthVector, 'length vector'); assertVectorFinite(field, 'magnetic field');
  return scale(cross(lengthVector, field), current);
}

export function parallelWireForcePerLength(firstCurrent: number, secondCurrent: number, separation: number) {
  assertFinite(firstCurrent, 'first current'); assertFinite(secondCurrent, 'second current'); assertPositive(separation, 'wire separation');
  return MU_0 * firstCurrent * secondCurrent / (2 * Math.PI * separation);
}

export function rectangularCoilInteraction(options: { current: number; turns: number; width: number; height: number; normal: Vec3; field: Vec3 }) {
  assertFinite(options.current, 'coil current'); assertPositive(options.turns, 'coil turns'); assertPositive(options.width, 'coil width'); assertPositive(options.height, 'coil height');
  const moment = scale(normalize(options.normal, 'coil normal'), options.turns * options.current * options.width * options.height);
  return { moment, ...magneticDipoleInteraction({ moment, field: options.field }) };
}

function zero(): Vec3 { return { x: 0, y: 0, z: 0 }; }
function add(a: Vec3, b: Vec3): Vec3 { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
function subtract(a: Vec3, b: Vec3): Vec3 { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function scale(value: Vec3, factor: number): Vec3 { return { x: value.x * factor, y: value.y * factor, z: value.z * factor }; }
function dot(a: Vec3, b: Vec3) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function cross(a: Vec3, b: Vec3): Vec3 { return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }; }
function magnitude(value: Vec3) { return Math.hypot(value.x, value.y, value.z); }
function assertVectorFinite(value: Vec3, name: string) { assertFinite(value.x, `${name}.x`); assertFinite(value.y, `${name}.y`); assertFinite(value.z, `${name}.z`); }
function distanceToSegment(point: Vec3, from: Vec3, to: Vec3) { const segment = subtract(to, from); const lengthSquared = dot(segment, segment); const position = Math.max(0, Math.min(1, dot(subtract(point, from), segment) / lengthSquared)); return magnitude(subtract(point, add(from, scale(segment, position)))); }
function pointInPolygon(point: { x: number; y: number }, polygon: Vec3[]) { let inside = false; for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) { const a = polygon[i], b = polygon[j]; if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside; } return inside; }
function normalize(value: Vec3, name: string) { const length = magnitude(value); if (!(length > 0) || !Number.isFinite(length)) throw new Error(`${name} must be finite and nonzero.`); return scale(value, 1 / length); }
function assertPositive(value: number, name: string) { if (!(value > 0) || !Number.isFinite(value)) throw new Error(`${name} must be finite and positive.`); }
function assertFinite(value: number, name: string) { if (!Number.isFinite(value)) throw new Error(`${name} must be finite.`); }
