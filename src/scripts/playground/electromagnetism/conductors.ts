import { COULOMB_CONSTANT } from './electrostatics';

export interface Vec2 {
  x: number;
  y: number;
}

export interface EllipseBoundary {
  kind: 'ellipse';
  semiMajor: number;
  semiMinor: number;
}

export interface CircularCavity {
  center: Vec2;
  radius: number;
}

export interface ConductorOptions {
  outer: EllipseBoundary;
  cavity?: CircularCavity;
  netCharge: number;
  externalField: Vec2;
  samples?: number;
}

export interface SurfaceChargeSample {
  position: Vec2;
  normal: Vec2;
  segmentLength: number;
  charge: number;
  surfaceChargeDensity: number;
  boundary: 'outer' | 'cavity';
}

export interface ConductorDiagnostics {
  boundaryPotentialMean: number;
  boundaryPotentialSpread: number;
  relativeBoundaryPotentialSpread: number;
  centerFieldResidual: number;
  cavityShieldingRatio: number;
  tipChargeEnhancement: number;
  collocationSamples: number;
  validity: string;
}

export interface ConductorSolution {
  samples: SurfaceChargeSample[];
  conductorPotential: number;
  enclosedSurfaceCharge: number;
  diagnostics: ConductorDiagnostics;
  fieldAt(point: Vec2): Vec2;
  potentialAt(point: Vec2): number;
  isInMetal(point: Vec2): boolean;
  isInCavity(point: Vec2): boolean;
}

interface BoundarySample {
  position: Vec2;
  normal: Vec2;
  segmentLength: number;
  softening: number;
  boundary: 'outer' | 'cavity';
}

const CHARGE_SCALE = 1e-9;
const TWO_DIMENSIONAL_COULOMB_CONSTANT = 2 * COULOMB_CONSTANT;

export function solveConductorEquilibrium(options: ConductorOptions): ConductorSolution {
  validateOptions(options);
  const outerCount = Math.max(24, Math.floor(options.samples ?? 64));
  const boundary = ellipseSamples(options.outer, outerCount);
  if (options.cavity) {
    const circumferenceRatio = options.cavity.radius /
      Math.max(options.outer.semiMajor, options.outer.semiMinor);
    const cavityCount = Math.max(24, Math.round(outerCount * circumferenceRatio));
    boundary.push(...cavitySamples(options.cavity, cavityCount));
  }

  const size = boundary.length;
  const matrix = Array.from({ length: size + 1 }, () => Array(size + 2).fill(0));
  for (let row = 0; row < size; row += 1) {
    const target = boundary[row].position;
    for (let column = 0; column < size; column += 1) {
      matrix[row][column] = potentialKernel(target, boundary[column]) * CHARGE_SCALE;
    }
    matrix[row][size] = -1;
    matrix[row][size + 1] = -externalPotential(target, options.externalField);
  }
  for (let column = 0; column < size; column += 1) matrix[size][column] = 1;
  matrix[size][size + 1] = options.netCharge / CHARGE_SCALE;

  const unknowns = solveLinearSystem(matrix);
  const charges = unknowns.slice(0, size).map((value) => value * CHARGE_SCALE);
  const conductorPotential = unknowns[size];
  const samples: SurfaceChargeSample[] = boundary.map((sample, index) => ({
    position: sample.position,
    normal: sample.normal,
    segmentLength: sample.segmentLength,
    charge: charges[index],
    surfaceChargeDensity: charges[index] / sample.segmentLength,
    boundary: sample.boundary,
  }));

  const potentialAt = (point: Vec2) => {
    let potential = externalPotential(point, options.externalField);
    for (let index = 0; index < size; index += 1) {
      potential += potentialKernel(point, boundary[index]) * charges[index];
    }
    return potential;
  };
  const fieldAt = (point: Vec2) => {
    let x = options.externalField.x;
    let y = options.externalField.y;
    for (let index = 0; index < size; index += 1) {
      const source = boundary[index];
      const dx = point.x - source.position.x;
      const dy = point.y - source.position.y;
      const distanceSquared = dx * dx + dy * dy;
      const denominator = distanceSquared > 0 ? distanceSquared : source.softening ** 2;
      const scale = TWO_DIMENSIONAL_COULOMB_CONSTANT * charges[index] / denominator;
      x += scale * dx;
      y += scale * dy;
    }
    return { x, y };
  };

  const boundaryPotentials = boundary.map((sample) => potentialAt(sample.position));
  const meanPotential = mean(boundaryPotentials);
  const potentialSpread = Math.max(...boundaryPotentials) - Math.min(...boundaryPotentials);
  const externalScale = Math.hypot(options.externalField.x, options.externalField.y) *
    Math.max(options.outer.semiMajor, options.outer.semiMinor);
  const relativePotentialSpread = potentialSpread /
    Math.max(Math.abs(meanPotential), externalScale, 1e-12);
  const externalMagnitude = Math.hypot(options.externalField.x, options.externalField.y);
  const centerField = fieldAt({ x: 0, y: 0 });
  const cavityField = options.cavity ? fieldAt(options.cavity.center) : { x: 0, y: 0 };
  const outerDensities = samples
    .filter((sample) => sample.boundary === 'outer')
    .map((sample) => Math.abs(sample.surfaceChargeDensity));
  const tipDensities = samples
    .filter((sample) => sample.boundary === 'outer' &&
      Math.abs(sample.position.x) >= .86 * options.outer.semiMajor)
    .map((sample) => Math.abs(sample.surfaceChargeDensity));
  const rmsDensity = Math.sqrt(mean(outerDensities.map((value) => value * value)));

  const isInCavity = (point: Vec2) => Boolean(options.cavity &&
    Math.hypot(point.x - options.cavity.center.x, point.y - options.cavity.center.y) < options.cavity.radius);
  const isInsideOuter = (point: Vec2) =>
    (point.x / options.outer.semiMajor) ** 2 + (point.y / options.outer.semiMinor) ** 2 < 1;
  return {
    samples,
    conductorPotential,
    enclosedSurfaceCharge: charges.reduce((sum, charge) => sum + charge, 0),
    diagnostics: {
      boundaryPotentialMean: meanPotential,
      boundaryPotentialSpread: potentialSpread,
      relativeBoundaryPotentialSpread: relativePotentialSpread,
      centerFieldResidual: Math.hypot(centerField.x, centerField.y) /
        Math.max(externalMagnitude, 1e-30),
      cavityShieldingRatio: options.cavity
        ? Math.hypot(cavityField.x, cavityField.y) / Math.max(externalMagnitude, 1e-30)
        : 0,
      tipChargeEnhancement: Math.max(...tipDensities, 0) / Math.max(rmsDensity, 1e-30),
      collocationSamples: size,
      validity: '2-D boundary-collocation model for an infinitely long conductor cross-section using the logarithmic Green function; charge is per unit length and sample refinement estimates error.',
    },
    fieldAt,
    potentialAt,
    isInMetal(point) { return isInsideOuter(point) && !isInCavity(point); },
    isInCavity,
  };
}

function ellipseSamples(ellipse: EllipseBoundary, count: number): BoundarySample[] {
  const positions = Array.from({ length: count }, (_, index) => {
    const angle = 2 * Math.PI * index / count;
    return {
      position: {
        x: ellipse.semiMajor * Math.cos(angle),
        y: ellipse.semiMinor * Math.sin(angle),
      },
      angle,
    };
  });
  return positions.map(({ position, angle }, index) => {
    const previous = positions[(index - 1 + count) % count].position;
    const next = positions[(index + 1) % count].position;
    const segmentLength = .5 * (distance(previous, position) + distance(position, next));
    const rawNormal = {
      x: Math.cos(angle) / ellipse.semiMajor,
      y: Math.sin(angle) / ellipse.semiMinor,
    };
    const normalMagnitude = Math.hypot(rawNormal.x, rawNormal.y);
    return {
      position,
      normal: { x: rawNormal.x / normalMagnitude, y: rawNormal.y / normalMagnitude },
      segmentLength,
      softening: segmentLength / (2 * Math.E),
      boundary: 'outer' as const,
    };
  });
}

function cavitySamples(cavity: CircularCavity, count: number): BoundarySample[] {
  const segmentLength = 2 * Math.PI * cavity.radius / count;
  return Array.from({ length: count }, (_, index) => {
    const angle = 2 * Math.PI * index / count;
    const radial = { x: Math.cos(angle), y: Math.sin(angle) };
    return {
      position: {
        x: cavity.center.x + cavity.radius * radial.x,
        y: cavity.center.y + cavity.radius * radial.y,
      },
      normal: { x: -radial.x, y: -radial.y },
      segmentLength,
      softening: segmentLength / (2 * Math.E),
      boundary: 'cavity' as const,
    };
  });
}

function potentialKernel(target: Vec2, source: BoundarySample) {
  const dx = target.x - source.position.x;
  const dy = target.y - source.position.y;
  const distance = Math.hypot(dx, dy) || source.softening;
  return -TWO_DIMENSIONAL_COULOMB_CONSTANT * Math.log(distance);
}

function externalPotential(point: Vec2, field: Vec2) {
  return -field.x * point.x - field.y * point.y;
}

function solveLinearSystem(augmented: number[][]) {
  const size = augmented.length;
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (Math.abs(augmented[pivot][column]) < 1e-14) {
      throw new Error('Conductor collocation matrix is singular for this geometry.');
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    for (let entry = column; entry <= size; entry += 1) augmented[column][entry] /= divisor;
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      if (Math.abs(factor) < 1e-18) continue;
      for (let entry = column; entry <= size; entry += 1) {
        augmented[row][entry] -= factor * augmented[column][entry];
      }
    }
  }
  return augmented.map((row) => row[size]);
}

function validateOptions(options: ConductorOptions) {
  if (!(options.outer.semiMajor > 0) || !(options.outer.semiMinor > 0) ||
    !Number.isFinite(options.outer.semiMajor) || !Number.isFinite(options.outer.semiMinor)) {
    throw new Error('Conductor semiaxes must be finite and positive.');
  }
  if (!Number.isFinite(options.netCharge) || !Number.isFinite(options.externalField.x) ||
    !Number.isFinite(options.externalField.y)) {
    throw new Error('Conductor charge and external field must be finite.');
  }
  if (options.cavity) {
    if (!(options.cavity.radius > 0) || !Number.isFinite(options.cavity.radius)) {
      throw new Error('Cavity radius must be finite and positive.');
    }
    const normalizedReach = Math.hypot(
      options.cavity.center.x / options.outer.semiMajor,
      options.cavity.center.y / options.outer.semiMinor,
    ) + options.cavity.radius / Math.min(options.outer.semiMajor, options.outer.semiMinor);
    if (normalizedReach >= .92) throw new Error('Cavity must remain separated from the outer conductor boundary.');
  }
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function distance(a: Vec2, b: Vec2) { return Math.hypot(a.x - b.x, a.y - b.y); }
