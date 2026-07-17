import { COULOMB_CONSTANT } from './electrostatics';
import { EPSILON_0, type Vec3 } from './gauss-law';

export interface UniformRodDistribution {
  kind: 'rod';
  linearDensity: number;
  length: number;
}

export interface UniformRingDistribution {
  kind: 'ring';
  totalCharge: number;
  radius: number;
}

export interface UniformDiskDistribution {
  kind: 'disk';
  surfaceDensity: number;
  radius: number;
}

export interface InfiniteLineDistribution {
  kind: 'infinite-line';
  linearDensity: number;
}

export interface InfinitePlaneDistribution {
  kind: 'infinite-plane';
  surfaceDensity: number;
}

export interface UniformSphericalShellDistribution {
  kind: 'spherical-shell';
  totalCharge: number;
  radius: number;
}

export interface UniformSphereDistribution {
  kind: 'uniform-sphere';
  volumeDensity: number;
  radius: number;
}

export type ContinuousDistribution =
  | UniformRodDistribution
  | UniformRingDistribution
  | UniformDiskDistribution
  | InfiniteLineDistribution
  | InfinitePlaneDistribution
  | UniformSphericalShellDistribution
  | UniformSphereDistribution;
export type ContinuousFieldMethod = 'analytic' | 'numeric';

export interface ContinuousFieldEvaluation {
  field: Vec3 | null;
  magnitude: number | null;
  method: ContinuousFieldMethod;
  integrationSamples: number;
  singular: boolean;
  undefinedReason?: 'singular' | 'analytic-axis-only';
  validity: string;
}

export function evaluateContinuousField(
  distribution: ContinuousDistribution,
  point: Vec3,
  method: ContinuousFieldMethod,
  options: {
    samples?: number;
    singularityRadius?: number;
    integrationExtent?: number;
  } = {},
): ContinuousFieldEvaluation {
  const singularityRadius = options.singularityRadius ?? 1e-5;
  let result: { field: Vec3 | null; samples: number; reason?: ContinuousFieldEvaluation['undefinedReason'] };
  let validity: string;
  if (distribution.kind === 'rod') {
    if (!(distribution.length > 0) || !Number.isFinite(distribution.length)) {
      throw new Error('A finite charged rod requires a finite positive length.');
    }
    result = method === 'analytic'
      ? finiteRodAnalytic(distribution, point, singularityRadius)
      : finiteRodNumeric(distribution, point, options.samples ?? 600, singularityRadius);
    validity = 'Ideal zero-radius rod on the y axis; endpoints are at y = ±L/2.';
  } else if (distribution.kind === 'ring') {
    if (!(distribution.radius > 0) || !Number.isFinite(distribution.radius)) {
      throw new Error('A charged ring requires a finite positive radius.');
    }
    result = method === 'analytic'
      ? chargedRingAnalytic(distribution, point)
      : chargedRingNumeric(distribution, point, options.samples ?? 720, singularityRadius);
    validity = 'Ideal zero-thickness ring in the xy plane; the analytic field is axis-only.';
  } else if (distribution.kind === 'disk') {
    if (!(distribution.radius > 0) || !Number.isFinite(distribution.radius)) {
      throw new Error('A charged disk requires a finite positive radius.');
    }
    result = method === 'analytic'
      ? chargedDiskAnalytic(distribution, point)
      : chargedDiskNumeric(distribution, point, options.samples ?? 4_800, singularityRadius);
    validity = 'Uniform zero-thickness disk in the xy plane; the analytic field is axis-only.';
  } else if (distribution.kind === 'infinite-line') {
    const integrationExtent = options.integrationExtent ?? 20 * Math.max(1, Math.hypot(point.x, point.y));
    result = method === 'analytic'
      ? infiniteLineAnalytic(distribution, point, singularityRadius)
      : infiniteLineNumeric(
        distribution,
        point,
        options.samples ?? 4_000,
        integrationExtent,
        singularityRadius,
      );
    validity = method === 'analytic'
      ? 'Ideal infinite line on the z axis.'
      : `Numeric finite line window z = ±${integrationExtent.toPrecision(3)} m approximates the infinite source.`;
  } else if (distribution.kind === 'infinite-plane') {
    const integrationExtent = options.integrationExtent ?? 20 * Math.max(1, Math.abs(point.z));
    result = method === 'analytic'
      ? infinitePlaneAnalytic(distribution, point, singularityRadius)
      : infinitePlaneNumeric(
        distribution,
        point,
        options.samples ?? 8_000,
        integrationExtent,
        singularityRadius,
      );
    validity = method === 'analytic'
      ? 'Ideal infinite plane at z = 0.'
      : `Numeric finite disk radius ${integrationExtent.toPrecision(3)} m approximates the infinite plane.`;
  } else if (distribution.kind === 'spherical-shell') {
    if (!(distribution.radius > 0) || !Number.isFinite(distribution.radius)) {
      throw new Error('A charged spherical shell requires a finite positive radius.');
    }
    result = method === 'analytic'
      ? sphericalShellAnalytic(distribution, point, singularityRadius)
      : sphericalShellNumeric(
        distribution,
        point,
        options.samples ?? 8_000,
        singularityRadius,
      );
    validity = 'Uniform ideal zero-thickness spherical shell centered at the origin.';
  } else {
    if (!(distribution.radius > 0) || !Number.isFinite(distribution.radius)) {
      throw new Error('A uniformly charged sphere requires a finite positive radius.');
    }
    result = method === 'analytic'
      ? uniformSphereAnalytic(distribution, point)
      : uniformSphereNumeric(
        distribution,
        point,
        options.samples ?? 10_000,
        singularityRadius,
      );
    validity = 'Uniform volume charge inside a solid sphere centered at the origin.';
  }
  return {
    field: result.field,
    magnitude: result.field ? magnitude(result.field) : null,
    method,
    integrationSamples: result.samples,
    singular: result.reason === 'singular',
    undefinedReason: result.reason,
    validity,
  };
}

export function relativeFieldError(actual: Vec3, expected: Vec3) {
  return magnitude({
    x: actual.x - expected.x,
    y: actual.y - expected.y,
    z: actual.z - expected.z,
  }) / Math.max(magnitude(expected), 1e-30);
}

function finiteRodAnalytic(
  rod: UniformRodDistribution,
  point: Vec3,
  singularityRadius: number,
) {
  const halfLength = rod.length / 2;
  const radialDistance = Math.hypot(point.x, point.z);
  if (radialDistance < singularityRadius) {
    return { field: null, samples: 0, reason: 'singular' as const };
  }
  const upperOffset = halfLength - point.y;
  const lowerOffset = -halfLength - point.y;
  const upperDistance = Math.hypot(radialDistance, upperOffset);
  const lowerDistance = Math.hypot(radialDistance, lowerOffset);
  const radialMagnitude = COULOMB_CONSTANT * rod.linearDensity / radialDistance * (
    upperOffset / upperDistance - lowerOffset / lowerDistance
  );
  const axialComponent = COULOMB_CONSTANT * rod.linearDensity * (
    1 / upperDistance - 1 / lowerDistance
  );
  return {
    field: {
      x: radialMagnitude * point.x / radialDistance,
      y: axialComponent,
      z: radialMagnitude * point.z / radialDistance,
    },
    samples: 0,
  };
}

function finiteRodNumeric(
  rod: UniformRodDistribution,
  point: Vec3,
  requestedSamples: number,
  singularityRadius: number,
) {
  const samples = Math.min(20_000, Math.max(16, Math.floor(requestedSamples)));
  const halfLength = rod.length / 2;
  const step = rod.length / samples;
  let x = 0;
  let y = 0;
  let z = 0;
  for (let index = 0; index < samples; index += 1) {
    const sourceY = -halfLength + (index + 0.5) * step;
    const dx = point.x;
    const dy = point.y - sourceY;
    const dz = point.z;
    const distanceSquared = dx * dx + dy * dy + dz * dz;
    if (distanceSquared < singularityRadius * singularityRadius) {
      return { field: null, samples, reason: 'singular' as const };
    }
    const scale = COULOMB_CONSTANT * rod.linearDensity * step / distanceSquared ** 1.5;
    x += scale * dx;
    y += scale * dy;
    z += scale * dz;
  }
  return { field: { x, y, z }, samples };
}

function chargedRingAnalytic(ring: UniformRingDistribution, point: Vec3) {
  if (Math.hypot(point.x, point.y) > 1e-10) {
    return { field: null, samples: 0, reason: 'analytic-axis-only' as const };
  }
  const denominator = (ring.radius * ring.radius + point.z * point.z) ** 1.5;
  return {
    field: {
      x: 0,
      y: 0,
      z: COULOMB_CONSTANT * ring.totalCharge * point.z / denominator,
    },
    samples: 0,
  };
}

function chargedRingNumeric(
  ring: UniformRingDistribution,
  point: Vec3,
  requestedSamples: number,
  singularityRadius: number,
) {
  const samples = Math.min(20_000, Math.max(24, Math.floor(requestedSamples)));
  const chargeElement = ring.totalCharge / samples;
  let x = 0;
  let y = 0;
  let z = 0;
  for (let index = 0; index < samples; index += 1) {
    const angle = 2 * Math.PI * (index + 0.5) / samples;
    const dx = point.x - ring.radius * Math.cos(angle);
    const dy = point.y - ring.radius * Math.sin(angle);
    const dz = point.z;
    const distanceSquared = dx * dx + dy * dy + dz * dz;
    if (distanceSquared < singularityRadius * singularityRadius) {
      return { field: null, samples, reason: 'singular' as const };
    }
    const scale = COULOMB_CONSTANT * chargeElement / distanceSquared ** 1.5;
    x += scale * dx;
    y += scale * dy;
    z += scale * dz;
  }
  return { field: { x, y, z }, samples };
}

function chargedDiskAnalytic(disk: UniformDiskDistribution, point: Vec3) {
  if (Math.hypot(point.x, point.y) > 1e-10) {
    return { field: null, samples: 0, reason: 'analytic-axis-only' as const };
  }
  if (Math.abs(point.z) < 1e-12) {
    return { field: { x: 0, y: 0, z: 0 }, samples: 0 };
  }
  const axialMagnitude = disk.surfaceDensity / (2 * EPSILON_0) * (
    1 - Math.abs(point.z) / Math.hypot(point.z, disk.radius)
  );
  return {
    field: { x: 0, y: 0, z: Math.sign(point.z) * axialMagnitude },
    samples: 0,
  };
}

function chargedDiskNumeric(
  disk: UniformDiskDistribution,
  point: Vec3,
  requestedSamples: number,
  singularityRadius: number,
) {
  const boundedSamples = Math.min(20_000, Math.max(64, Math.floor(requestedSamples)));
  const radialCount = Math.max(8, Math.floor(Math.sqrt(boundedSamples * 2)));
  const angularCount = Math.max(16, Math.floor(boundedSamples / radialCount));
  const samples = radialCount * angularCount;
  const dRadius = disk.radius / radialCount;
  const dPhi = 2 * Math.PI / angularCount;
  let x = 0;
  let y = 0;
  let z = 0;
  for (let radial = 0; radial < radialCount; radial += 1) {
    const sampleRadius = (radial + 0.5) * dRadius;
    const chargeElement = disk.surfaceDensity * sampleRadius * dRadius * dPhi;
    for (let angular = 0; angular < angularCount; angular += 1) {
      const phi = (angular + 0.5) * dPhi;
      const dx = point.x - sampleRadius * Math.cos(phi);
      const dy = point.y - sampleRadius * Math.sin(phi);
      const dz = point.z;
      const distanceSquared = dx * dx + dy * dy + dz * dz;
      if (distanceSquared < singularityRadius * singularityRadius) {
        return { field: null, samples, reason: 'singular' as const };
      }
      const scale = COULOMB_CONSTANT * chargeElement / distanceSquared ** 1.5;
      x += scale * dx;
      y += scale * dy;
      z += scale * dz;
    }
  }
  return { field: { x, y, z }, samples };
}

function infiniteLineAnalytic(
  line: InfiniteLineDistribution,
  point: Vec3,
  singularityRadius: number,
) {
  const radiusSquared = point.x * point.x + point.y * point.y;
  if (radiusSquared < singularityRadius * singularityRadius) {
    return { field: null, samples: 0, reason: 'singular' as const };
  }
  const scale = line.linearDensity / (2 * Math.PI * EPSILON_0 * radiusSquared);
  return {
    field: { x: scale * point.x, y: scale * point.y, z: 0 },
    samples: 0,
  };
}

function infiniteLineNumeric(
  line: InfiniteLineDistribution,
  point: Vec3,
  requestedSamples: number,
  integrationExtent: number,
  singularityRadius: number,
) {
  if (!(integrationExtent > 0) || !Number.isFinite(integrationExtent)) {
    throw new Error('Infinite-line numerical integration requires a finite positive extent.');
  }
  const samples = Math.min(20_000, Math.max(32, Math.floor(requestedSamples)));
  const step = 2 * integrationExtent / samples;
  let x = 0;
  let y = 0;
  let z = 0;
  for (let index = 0; index < samples; index += 1) {
    const sourceZ = -integrationExtent + (index + 0.5) * step;
    const dx = point.x;
    const dy = point.y;
    const dz = point.z - sourceZ;
    const distanceSquared = dx * dx + dy * dy + dz * dz;
    if (distanceSquared < singularityRadius * singularityRadius) {
      return { field: null, samples, reason: 'singular' as const };
    }
    const scale = COULOMB_CONSTANT * line.linearDensity * step / distanceSquared ** 1.5;
    x += scale * dx;
    y += scale * dy;
    z += scale * dz;
  }
  return { field: { x, y, z }, samples };
}

function infinitePlaneAnalytic(
  plane: InfinitePlaneDistribution,
  point: Vec3,
  singularityRadius: number,
) {
  if (Math.abs(point.z) < singularityRadius) {
    return { field: null, samples: 0, reason: 'singular' as const };
  }
  return {
    field: {
      x: 0,
      y: 0,
      z: Math.sign(point.z) * plane.surfaceDensity / (2 * EPSILON_0),
    },
    samples: 0,
  };
}

function infinitePlaneNumeric(
  plane: InfinitePlaneDistribution,
  point: Vec3,
  requestedSamples: number,
  integrationExtent: number,
  singularityRadius: number,
) {
  if (!(integrationExtent > 0) || !Number.isFinite(integrationExtent)) {
    throw new Error('Infinite-plane numerical integration requires a finite disk radius.');
  }
  return chargedDiskNumeric(
    {
      kind: 'disk',
      surfaceDensity: plane.surfaceDensity,
      radius: integrationExtent,
    },
    point,
    requestedSamples,
    singularityRadius,
  );
}

function sphericalShellAnalytic(
  shell: UniformSphericalShellDistribution,
  point: Vec3,
  singularityRadius: number,
) {
  const radius = magnitude(point);
  if (Math.abs(radius - shell.radius) < singularityRadius) {
    return { field: null, samples: 0, reason: 'singular' as const };
  }
  if (radius < shell.radius || radius < 1e-30) {
    return { field: { x: 0, y: 0, z: 0 }, samples: 0 };
  }
  const scale = COULOMB_CONSTANT * shell.totalCharge / radius ** 3;
  return {
    field: { x: scale * point.x, y: scale * point.y, z: scale * point.z },
    samples: 0,
  };
}

function sphericalShellNumeric(
  shell: UniformSphericalShellDistribution,
  point: Vec3,
  requestedSamples: number,
  singularityRadius: number,
) {
  const boundedSamples = Math.min(20_000, Math.max(128, Math.floor(requestedSamples)));
  const latitudeCount = Math.max(8, Math.floor(Math.sqrt(boundedSamples / 2)));
  const longitudeCount = Math.max(16, Math.floor(boundedSamples / latitudeCount));
  const samples = latitudeCount * longitudeCount;
  const dTheta = Math.PI / latitudeCount;
  const dPhi = 2 * Math.PI / longitudeCount;
  const surfaceDensity = shell.totalCharge / (4 * Math.PI * shell.radius * shell.radius);
  let x = 0;
  let y = 0;
  let z = 0;
  for (let latitude = 0; latitude < latitudeCount; latitude += 1) {
    const theta = (latitude + 0.5) * dTheta;
    const sinTheta = Math.sin(theta);
    const sourceZ = shell.radius * Math.cos(theta);
    const chargeElement = surfaceDensity * shell.radius * shell.radius * sinTheta * dTheta * dPhi;
    for (let longitude = 0; longitude < longitudeCount; longitude += 1) {
      const phi = (longitude + 0.5) * dPhi;
      const dx = point.x - shell.radius * sinTheta * Math.cos(phi);
      const dy = point.y - shell.radius * sinTheta * Math.sin(phi);
      const dz = point.z - sourceZ;
      const distanceSquared = dx * dx + dy * dy + dz * dz;
      if (distanceSquared < singularityRadius * singularityRadius) {
        return { field: null, samples, reason: 'singular' as const };
      }
      const scale = COULOMB_CONSTANT * chargeElement / distanceSquared ** 1.5;
      x += scale * dx;
      y += scale * dy;
      z += scale * dz;
    }
  }
  return { field: { x, y, z }, samples };
}

function uniformSphereAnalytic(sphere: UniformSphereDistribution, point: Vec3) {
  const radius = magnitude(point);
  if (radius < sphere.radius) {
    const scale = sphere.volumeDensity / (3 * EPSILON_0);
    return {
      field: { x: scale * point.x, y: scale * point.y, z: scale * point.z },
      samples: 0,
    };
  }
  if (radius < 1e-30) return { field: { x: 0, y: 0, z: 0 }, samples: 0 };
  const totalCharge = sphere.volumeDensity * 4 * Math.PI * sphere.radius ** 3 / 3;
  const scale = COULOMB_CONSTANT * totalCharge / radius ** 3;
  return {
    field: { x: scale * point.x, y: scale * point.y, z: scale * point.z },
    samples: 0,
  };
}

function uniformSphereNumeric(
  sphere: UniformSphereDistribution,
  point: Vec3,
  requestedSamples: number,
  singularityRadius: number,
) {
  const boundedSamples = Math.min(20_000, Math.max(512, Math.floor(requestedSamples)));
  const samples = boundedSamples;
  const totalCharge = sphere.volumeDensity * 4 * Math.PI * sphere.radius ** 3 / 3;
  const chargeElement = totalCharge / samples;
  const probeRadius = magnitude(point);
  const cancellationRadius = probeRadius < sphere.radius
    ? Math.min(0.3 * sphere.radius, 0.75 * (sphere.radius - probeRadius))
    : 0;
  const exclusionRadius = Math.max(singularityRadius, cancellationRadius);
  let x = 0;
  let y = 0;
  let z = 0;
  for (let index = 0; index < samples; index += 1) {
    const sampleIndex = index + 1;
    const radialFraction = radicalInverse(sampleIndex, 2);
    const polarFraction = radicalInverse(sampleIndex, 3);
    const azimuthFraction = radicalInverse(sampleIndex, 5);
    const sampleRadius = sphere.radius * Math.cbrt(radialFraction);
    const cosTheta = 1 - 2 * polarFraction;
    const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
    const phi = 2 * Math.PI * azimuthFraction;
    const dx = point.x - sampleRadius * sinTheta * Math.cos(phi);
    const dy = point.y - sampleRadius * sinTheta * Math.sin(phi);
    const dz = point.z - sampleRadius * cosTheta;
    const distanceSquared = dx * dx + dy * dy + dz * dz;
    if (distanceSquared < exclusionRadius * exclusionRadius) continue;
    const scale = COULOMB_CONSTANT * chargeElement / distanceSquared ** 1.5;
    x += scale * dx;
    y += scale * dy;
    z += scale * dz;
  }
  return { field: { x, y, z }, samples };
}

function radicalInverse(index: number, base: number) {
  let value = 0;
  let factor = 1 / base;
  let remaining = index;
  while (remaining > 0) {
    value += factor * (remaining % base);
    remaining = Math.floor(remaining / base);
    factor /= base;
  }
  return value;
}

function magnitude(vector: Vec3) {
  return Math.hypot(vector.x, vector.y, vector.z);
}
