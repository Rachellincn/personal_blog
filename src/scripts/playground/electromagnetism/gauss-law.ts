import { COULOMB_CONSTANT } from './electrostatics';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PointCharge3D {
  id: string;
  position: Vec3;
  charge: number;
}

export interface FluxElement {
  point: Vec3;
  normal: Vec3;
  area: number;
}

export interface FluxSample extends FluxElement {
  field: Vec3;
  eDotDA: number;
}

export interface GaussianSurface {
  readonly kind: 'sphere' | 'cylinder' | 'pillbox';
  contains(point: Vec3): boolean;
  isCenteredAt(point: Vec3): boolean;
  isCoaxialWithLine(axis: { x: number; y: number }): boolean;
  straddlesPlane(z: number): boolean;
  lineIntersectionLength(axis: { x: number; y: number }): number;
  planeIntersectionArea(z: number): number;
  sphereIntersectionVolume(center: Vec3, radius: number): number;
  sample(resolution: number): FluxElement[];
}

export interface ChargeScenario {
  fieldAt(point: Vec3): Vec3 | null;
  enclosedCharge(surface: GaussianSurface): number;
  unenclosedCharge(surface: GaussianSurface): number | null;
  absoluteCharge(surface: GaussianSurface): number;
  assessSymmetry(surface: GaussianSurface): {
    canExtractField: boolean;
    note: string;
  };
}

export interface FluxReport {
  flux: number;
  absoluteFlux: number;
  expectedFlux: number;
  enclosedCharge: number;
  unenclosedCharge: number | null;
  canExtractFieldBySymmetry: boolean;
  symmetryNote: string;
  relativeError: number;
  skippedSamples: number;
  samples: FluxSample[];
}

export const EPSILON_0 = 1 / (4 * Math.PI * COULOMB_CONSTANT);

export function createPointChargeScenario(
  sources: PointCharge3D[],
  singularityRadius = 1e-4,
): ChargeScenario {
  return {
    fieldAt(point) {
      let x = 0;
      let y = 0;
      let z = 0;
      for (const source of sources) {
        const dx = point.x - source.position.x;
        const dy = point.y - source.position.y;
        const dz = point.z - source.position.z;
        const distanceSquared = dx * dx + dy * dy + dz * dz;
        if (distanceSquared < singularityRadius * singularityRadius) return null;
        const scale = COULOMB_CONSTANT * source.charge / distanceSquared ** 1.5;
        x += scale * dx;
        y += scale * dy;
        z += scale * dz;
      }
      return { x, y, z };
    },
    enclosedCharge(surface) {
      return sources.reduce(
        (charge, source) => charge + (surface.contains(source.position) ? source.charge : 0),
        0,
      );
    },
    unenclosedCharge(surface) {
      return sources.reduce(
        (charge, source) => charge + (surface.contains(source.position) ? 0 : source.charge),
        0,
      );
    },
    absoluteCharge() {
      return sources.reduce((charge, source) => charge + Math.abs(source.charge), 0);
    },
    assessSymmetry(surface) {
      const activeSources = sources.filter((source) => source.charge !== 0);
      const canExtractField =
        surface.kind === 'sphere' &&
        activeSources.length === 1 &&
        surface.isCenteredAt(activeSources[0].position);
      return {
        canExtractField,
        note: canExtractField
          ? 'Spherical symmetry makes |E| constant on the surface, so E can be extracted from the integral.'
          : 'Gauss law still holds, but insufficient symmetry means E cannot be extracted from the integral.',
      };
    },
  };
}

export function createGaussianSphere(options: {
  center: Vec3;
  radius: number;
}): GaussianSurface {
  if (!(options.radius > 0) || !Number.isFinite(options.radius)) {
    throw new Error('A Gaussian sphere requires a finite positive radius.');
  }
  const { center, radius } = options;
  return {
    kind: 'sphere',
    contains(point) {
      return distance(point, center) <= radius;
    },
    isCenteredAt(point) {
      return distance(point, center) < 1e-12;
    },
    isCoaxialWithLine() {
      return false;
    },
    straddlesPlane(z) {
      return Math.abs(z - center.z) < radius;
    },
    lineIntersectionLength(axis) {
      const offset = Math.hypot(axis.x - center.x, axis.y - center.y);
      return offset < radius ? 2 * Math.sqrt(radius * radius - offset * offset) : 0;
    },
    planeIntersectionArea(z) {
      const offset = z - center.z;
      return Math.abs(offset) < radius
        ? Math.PI * (radius * radius - offset * offset)
        : 0;
    },
    sphereIntersectionVolume(otherCenter, otherRadius) {
      return sphereIntersectionVolume(center, radius, otherCenter, otherRadius);
    },
    sample(resolution) {
      const latitudeCount = Math.max(8, Math.floor(resolution));
      const longitudeCount = latitudeCount * 2;
      const dTheta = Math.PI / latitudeCount;
      const dPhi = 2 * Math.PI / longitudeCount;
      const elements: FluxElement[] = [];
      for (let latitude = 0; latitude < latitudeCount; latitude += 1) {
        const theta = (latitude + 0.5) * dTheta;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        const area = radius * radius * sinTheta * dTheta * dPhi;
        for (let longitude = 0; longitude < longitudeCount; longitude += 1) {
          const phi = (longitude + 0.5) * dPhi;
          const normal = {
            x: sinTheta * Math.cos(phi),
            y: sinTheta * Math.sin(phi),
            z: cosTheta,
          };
          elements.push({
            point: {
              x: center.x + radius * normal.x,
              y: center.y + radius * normal.y,
              z: center.z + radius * normal.z,
            },
            normal,
            area,
          });
        }
      }
      return elements;
    },
  };
}

export function createGaussianCylinder(options: {
  center: Vec3;
  radius: number;
  halfLength: number;
  kind?: 'cylinder' | 'pillbox';
}): GaussianSurface {
  if (!(options.radius > 0) || !Number.isFinite(options.radius)) {
    throw new Error('A Gaussian cylinder requires a finite positive radius.');
  }
  if (!(options.halfLength > 0) || !Number.isFinite(options.halfLength)) {
    throw new Error('A Gaussian cylinder requires a finite positive half-length.');
  }
  const { center, radius, halfLength } = options;
  return {
    kind: options.kind ?? 'cylinder',
    contains(point) {
      return (
        Math.hypot(point.x - center.x, point.y - center.y) <= radius &&
        Math.abs(point.z - center.z) <= halfLength
      );
    },
    isCenteredAt(point) {
      return distance(point, center) < 1e-12;
    },
    isCoaxialWithLine(axis) {
      return Math.hypot(axis.x - center.x, axis.y - center.y) < 1e-12;
    },
    straddlesPlane(z) {
      return Math.abs(z - center.z) < halfLength;
    },
    lineIntersectionLength(axis) {
      return Math.hypot(axis.x - center.x, axis.y - center.y) <= radius
        ? 2 * halfLength
        : 0;
    },
    planeIntersectionArea(z) {
      return Math.abs(z - center.z) <= halfLength ? Math.PI * radius * radius : 0;
    },
    sphereIntersectionVolume(sphereCenter, sphereRadius) {
      return cylinderSphereIntersectionVolume(
        center,
        radius,
        halfLength,
        sphereCenter,
        sphereRadius,
      );
    },
    sample(resolution) {
      const axialCount = Math.max(8, Math.floor(resolution));
      const angularCount = axialCount * 2;
      const radialCount = Math.max(4, Math.floor(axialCount / 2));
      const dZ = 2 * halfLength / axialCount;
      const dPhi = 2 * Math.PI / angularCount;
      const dRadius = radius / radialCount;
      const elements: FluxElement[] = [];

      for (let axial = 0; axial < axialCount; axial += 1) {
        const z = center.z - halfLength + (axial + 0.5) * dZ;
        for (let angular = 0; angular < angularCount; angular += 1) {
          const phi = (angular + 0.5) * dPhi;
          const normal = { x: Math.cos(phi), y: Math.sin(phi), z: 0 };
          elements.push({
            point: {
              x: center.x + radius * normal.x,
              y: center.y + radius * normal.y,
              z,
            },
            normal,
            area: radius * dPhi * dZ,
          });
        }
      }

      for (const sign of [-1, 1] as const) {
        for (let radial = 0; radial < radialCount; radial += 1) {
          const sampleRadius = (radial + 0.5) * dRadius;
          for (let angular = 0; angular < angularCount; angular += 1) {
            const phi = (angular + 0.5) * dPhi;
            elements.push({
              point: {
                x: center.x + sampleRadius * Math.cos(phi),
                y: center.y + sampleRadius * Math.sin(phi),
                z: center.z + sign * halfLength,
              },
              normal: { x: 0, y: 0, z: sign },
              area: sampleRadius * dRadius * dPhi,
            });
          }
        }
      }
      return elements;
    },
  };
}

export function createGaussianPillbox(options: {
  center: Vec3;
  radius: number;
  halfLength: number;
}): GaussianSurface {
  return createGaussianCylinder({ ...options, kind: 'pillbox' });
}

export function createInfiniteLineChargeScenario(options: {
  axis: { x: number; y: number };
  linearDensity: number;
  singularityRadius?: number;
}): ChargeScenario {
  const singularityRadius = options.singularityRadius ?? 1e-4;
  return {
    fieldAt(point) {
      const dx = point.x - options.axis.x;
      const dy = point.y - options.axis.y;
      const radiusSquared = dx * dx + dy * dy;
      if (radiusSquared < singularityRadius * singularityRadius) return null;
      const scale = options.linearDensity / (2 * Math.PI * EPSILON_0 * radiusSquared);
      return { x: scale * dx, y: scale * dy, z: 0 };
    },
    enclosedCharge(surface) {
      return options.linearDensity * surface.lineIntersectionLength(options.axis);
    },
    unenclosedCharge() {
      return null;
    },
    absoluteCharge(surface) {
      return Math.abs(options.linearDensity * surface.lineIntersectionLength(options.axis));
    },
    assessSymmetry(surface) {
      const canExtractField =
        surface.kind === 'cylinder' && surface.isCoaxialWithLine(options.axis);
      return {
        canExtractField,
        note: canExtractField
          ? 'Cylindrical symmetry makes the radial field constant on the curved side and tangent to the caps.'
          : 'Gauss law still holds, but this surface does not expose the line charge symmetry.',
      };
    },
  };
}

export function createInfinitePlaneChargeScenario(options: {
  z: number;
  surfaceChargeDensity: number;
}): ChargeScenario {
  return {
    fieldAt(point) {
      const offset = point.z - options.z;
      if (Math.abs(offset) < 1e-12) return { x: 0, y: 0, z: 0 };
      return {
        x: 0,
        y: 0,
        z: Math.sign(offset) * options.surfaceChargeDensity / (2 * EPSILON_0),
      };
    },
    enclosedCharge(surface) {
      return options.surfaceChargeDensity * surface.planeIntersectionArea(options.z);
    },
    unenclosedCharge() {
      return null;
    },
    absoluteCharge(surface) {
      return Math.abs(
        options.surfaceChargeDensity * surface.planeIntersectionArea(options.z),
      );
    },
    assessSymmetry(surface) {
      const canExtractField =
        surface.kind === 'pillbox' && surface.straddlesPlane(options.z);
      return {
        canExtractField,
        note: canExtractField
          ? 'Planar symmetry makes the field uniform on both pillbox caps and tangent to the side.'
          : 'Gauss law still holds, but this surface does not expose the plane charge symmetry.',
      };
    },
  };
}

export function createUniformSphereChargeScenario(options: {
  center: Vec3;
  radius: number;
  volumeDensity: number;
}): ChargeScenario {
  if (!(options.radius > 0) || !Number.isFinite(options.radius)) {
    throw new Error('A uniformly charged sphere requires a finite positive radius.');
  }
  const totalVolume = 4 * Math.PI * options.radius ** 3 / 3;
  const totalCharge = options.volumeDensity * totalVolume;
  return {
    fieldAt(point) {
      const dx = point.x - options.center.x;
      const dy = point.y - options.center.y;
      const dz = point.z - options.center.z;
      const radius = Math.hypot(dx, dy, dz);
      if (radius < 1e-14) return { x: 0, y: 0, z: 0 };
      const enclosedCharge =
        radius < options.radius
          ? options.volumeDensity * 4 * Math.PI * radius ** 3 / 3
          : totalCharge;
      const scale = enclosedCharge / (4 * Math.PI * EPSILON_0 * radius ** 3);
      return { x: scale * dx, y: scale * dy, z: scale * dz };
    },
    enclosedCharge(surface) {
      return options.volumeDensity * surface.sphereIntersectionVolume(
        options.center,
        options.radius,
      );
    },
    unenclosedCharge(surface) {
      return totalCharge - this.enclosedCharge(surface);
    },
    absoluteCharge() {
      return Math.abs(totalCharge);
    },
    assessSymmetry(surface) {
      const canExtractField =
        surface.kind === 'sphere' && surface.isCenteredAt(options.center);
      return {
        canExtractField,
        note: canExtractField
          ? 'Spherical symmetry makes |E| constant on the Gaussian sphere, so E can be extracted from the integral.'
          : 'Gauss law still holds, but this surface does not share the charge distribution symmetry, so E cannot be extracted.',
      };
    },
  };
}

export function verifyGaussLaw(
  scenario: ChargeScenario,
  surface: GaussianSurface,
  options: { resolution?: number } = {},
): FluxReport {
  const samples: FluxSample[] = [];
  let flux = 0;
  let absoluteFlux = 0;
  let skippedSamples = 0;
  for (const element of surface.sample(options.resolution ?? 36)) {
    const field = scenario.fieldAt(element.point);
    if (!field) {
      skippedSamples += 1;
      continue;
    }
    const eDotDA = dot(field, element.normal) * element.area;
    flux += eDotDA;
    absoluteFlux += Math.abs(eDotDA);
    samples.push({ ...element, field, eDotDA });
  }
  const enclosedCharge = scenario.enclosedCharge(surface);
  const unenclosedCharge = scenario.unenclosedCharge(surface);
  const expectedFlux = enclosedCharge / EPSILON_0;
  const symmetry = scenario.assessSymmetry(surface);
  const referenceFlux = Math.max(
    Math.abs(expectedFlux),
    absoluteFlux,
    scenario.absoluteCharge(surface) / EPSILON_0,
    1e-30,
  );
  const relativeError = Math.abs(flux - expectedFlux) / referenceFlux;
  return {
    flux,
    absoluteFlux,
    expectedFlux,
    enclosedCharge,
    unenclosedCharge,
    canExtractFieldBySymmetry: symmetry.canExtractField,
    symmetryNote: symmetry.note,
    relativeError,
    skippedSamples,
    samples,
  };
}

function dot(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function distance(a: Vec3, b: Vec3) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function sphereIntersectionVolume(
  firstCenter: Vec3,
  firstRadius: number,
  secondCenter: Vec3,
  secondRadius: number,
) {
  const separation = distance(firstCenter, secondCenter);
  if (separation >= firstRadius + secondRadius) return 0;
  if (separation <= Math.abs(firstRadius - secondRadius)) {
    const containedRadius = Math.min(firstRadius, secondRadius);
    return 4 * Math.PI * containedRadius ** 3 / 3;
  }
  const sum = firstRadius + secondRadius;
  const difference = firstRadius - secondRadius;
  return Math.PI * (sum - separation) ** 2 *
    (separation ** 2 + 2 * separation * sum - 3 * difference ** 2) /
    (12 * separation);
}

function cylinderSphereIntersectionVolume(
  cylinderCenter: Vec3,
  cylinderRadius: number,
  cylinderHalfLength: number,
  sphereCenter: Vec3,
  sphereRadius: number,
) {
  const radialCount = 72;
  const angularCount = 144;
  const dRadius = cylinderRadius / radialCount;
  const dPhi = 2 * Math.PI / angularCount;
  const cylinderBottom = cylinderCenter.z - cylinderHalfLength;
  const cylinderTop = cylinderCenter.z + cylinderHalfLength;
  let volume = 0;
  for (let radial = 0; radial < radialCount; radial += 1) {
    const sampleRadius = (radial + 0.5) * dRadius;
    for (let angular = 0; angular < angularCount; angular += 1) {
      const phi = (angular + 0.5) * dPhi;
      const x = cylinderCenter.x + sampleRadius * Math.cos(phi);
      const y = cylinderCenter.y + sampleRadius * Math.sin(phi);
      const sphereRadialSquared =
        (x - sphereCenter.x) ** 2 + (y - sphereCenter.y) ** 2;
      if (sphereRadialSquared >= sphereRadius ** 2) continue;
      const sphereHalfHeight = Math.sqrt(sphereRadius ** 2 - sphereRadialSquared);
      const overlapBottom = Math.max(cylinderBottom, sphereCenter.z - sphereHalfHeight);
      const overlapTop = Math.min(cylinderTop, sphereCenter.z + sphereHalfHeight);
      volume += Math.max(0, overlapTop - overlapBottom) * sampleRadius * dRadius * dPhi;
    }
  }
  return volume;
}
