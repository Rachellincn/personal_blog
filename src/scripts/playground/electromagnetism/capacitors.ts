import { EPSILON_0 } from './gauss-law';

export { EPSILON_0 };

export type CapacitorGeometry =
  | { kind: 'parallel-plate'; area: number; separation: number }
  | { kind: 'spherical'; innerRadius: number; outerRadius: number }
  | { kind: 'coaxial'; innerRadius: number; outerRadius: number; length: number };

export type DielectricConfiguration =
  | { kind: 'vacuum' }
  | { kind: 'uniform'; relativePermittivity: number }
  | { kind: 'partial'; relativePermittivity: number; insertedFraction: number }
  | {
    kind: 'layered';
    layers: Array<{ relativePermittivity: number; thicknessFraction: number }>;
  };

export type CapacitorExcitation =
  | { kind: 'fixed-voltage'; voltage: number }
  | { kind: 'fixed-charge'; freeCharge: number };

export interface CapacitorReport {
  geometry: CapacitorGeometry;
  dielectric: DielectricConfiguration;
  excitation: CapacitorExcitation;
  capacitance: number;
  vacuumCapacitance: number;
  effectiveRelativePermittivity: number;
  voltage: number;
  freeCharge: number;
  energy: number;
  vacuumReferenceEnergy: number;
  energyChange: number;
  validity: string;
}

export interface ParallelPlateFieldReport {
  electricField: number;
  displacementField: number;
  polarization: number;
  freeSurfaceChargeDensity: number;
  boundSurfaceChargeDensity: number;
  energyDensity: number;
}

export function capacitanceOf(
  geometry: CapacitorGeometry,
  dielectric: DielectricConfiguration,
  options: { fringe?: boolean } = {},
) {
  validateGeometry(geometry);
  const relativePermittivity = effectiveRelativePermittivity(geometry, dielectric);
  let vacuumCapacitance: number;
  if (geometry.kind === 'parallel-plate') {
    vacuumCapacitance = EPSILON_0 * geometry.area / geometry.separation;
    if (options.fringe) {
      const side = Math.sqrt(geometry.area);
      const aspect = side / geometry.separation;
      const correction = geometry.separation / (Math.PI * side) *
        (1 + Math.log1p(2 * Math.PI * aspect));
      vacuumCapacitance *= 1 + correction;
    }
  } else if (geometry.kind === 'spherical') {
    vacuumCapacitance = 4 * Math.PI * EPSILON_0 *
      geometry.innerRadius * geometry.outerRadius /
      (geometry.outerRadius - geometry.innerRadius);
  } else {
    vacuumCapacitance = 2 * Math.PI * EPSILON_0 * geometry.length /
      Math.log(geometry.outerRadius / geometry.innerRadius);
  }
  return vacuumCapacitance * relativePermittivity;
}

export function evaluateCapacitor(
  geometry: CapacitorGeometry,
  dielectric: DielectricConfiguration,
  excitation: CapacitorExcitation,
  options: { fringe?: boolean } = {},
): CapacitorReport {
  const capacitance = capacitanceOf(geometry, dielectric, options);
  const vacuumCapacitance = capacitanceOf(geometry, { kind: 'vacuum' }, options);
  let voltage: number;
  let freeCharge: number;
  let energy: number;
  let vacuumReferenceEnergy: number;
  if (excitation.kind === 'fixed-voltage') {
    assertFinite(excitation.voltage, 'voltage');
    voltage = excitation.voltage;
    freeCharge = capacitance * voltage;
    energy = .5 * capacitance * voltage ** 2;
    vacuumReferenceEnergy = .5 * vacuumCapacitance * voltage ** 2;
  } else {
    assertFinite(excitation.freeCharge, 'free charge');
    freeCharge = excitation.freeCharge;
    voltage = freeCharge / capacitance;
    energy = freeCharge ** 2 / (2 * capacitance);
    vacuumReferenceEnergy = freeCharge ** 2 / (2 * vacuumCapacitance);
  }
  const idealization = geometry.kind === 'parallel-plate'
    ? options.fringe
      ? 'Finite square-plate fringe correction is a first-order teaching approximation; the interior field readout remains uniform.'
      : 'Ideal uniform field between wide plates; edge fringing is excluded.'
    : geometry.kind === 'spherical'
      ? 'Concentric spherical conductors; fields exist only between radii a and b.'
      : 'Long coaxial cylinders; end effects are excluded.';
  return {
    geometry,
    dielectric,
    excitation,
    capacitance,
    vacuumCapacitance,
    effectiveRelativePermittivity: capacitance / vacuumCapacitance,
    voltage,
    freeCharge,
    energy,
    vacuumReferenceEnergy,
    energyChange: energy - vacuumReferenceEnergy,
    validity: idealization,
  };
}

export function parallelPlateField(report: CapacitorReport): ParallelPlateFieldReport {
  if (report.geometry.kind !== 'parallel-plate') {
    throw new Error('Parallel-plate field data requires parallel-plate geometry.');
  }
  const electricField = report.voltage / report.geometry.separation;
  const freeSurfaceChargeDensity = report.freeCharge / report.geometry.area;
  const displacementField = freeSurfaceChargeDensity;
  const polarization = displacementField - EPSILON_0 * electricField;
  return {
    electricField,
    displacementField,
    polarization,
    freeSurfaceChargeDensity,
    boundSurfaceChargeDensity: polarization,
    energyDensity: .5 * electricField * displacementField,
  };
}

export function combineCapacitors(values: number[], connection: 'series' | 'parallel') {
  if (!values.length || values.some((value) => !(value > 0) || !Number.isFinite(value))) {
    throw new Error('Capacitor networks require finite positive capacitances.');
  }
  return connection === 'parallel'
    ? values.reduce((sum, value) => sum + value, 0)
    : 1 / values.reduce((sum, value) => sum + 1 / value, 0);
}

function effectiveRelativePermittivity(
  geometry: CapacitorGeometry,
  dielectric: DielectricConfiguration,
) {
  if (dielectric.kind === 'vacuum') return 1;
  if (dielectric.kind === 'uniform') {
    validateRelativePermittivity(dielectric.relativePermittivity);
    return dielectric.relativePermittivity;
  }
  if (geometry.kind !== 'parallel-plate') {
    throw new Error('Partial and layered dielectric presets currently require parallel plates.');
  }
  if (dielectric.kind === 'partial') {
    validateRelativePermittivity(dielectric.relativePermittivity);
    if (dielectric.insertedFraction < 0 || dielectric.insertedFraction > 1 ||
      !Number.isFinite(dielectric.insertedFraction)) {
      throw new Error('Inserted dielectric fraction must lie between zero and one.');
    }
    return 1 + dielectric.insertedFraction * (dielectric.relativePermittivity - 1);
  }
  if (!dielectric.layers.length) throw new Error('Layered dielectrics require at least one layer.');
  let totalFraction = 0;
  let inversePermittivity = 0;
  for (const layer of dielectric.layers) {
    validateRelativePermittivity(layer.relativePermittivity);
    if (!(layer.thicknessFraction > 0) || !Number.isFinite(layer.thicknessFraction)) {
      throw new Error('Every dielectric layer requires a finite positive thickness fraction.');
    }
    totalFraction += layer.thicknessFraction;
    inversePermittivity += layer.thicknessFraction / layer.relativePermittivity;
  }
  return totalFraction / inversePermittivity;
}

function validateGeometry(geometry: CapacitorGeometry) {
  if (geometry.kind === 'parallel-plate') {
    assertPositive(geometry.area, 'plate area');
    assertPositive(geometry.separation, 'plate separation');
    return;
  }
  assertPositive(geometry.innerRadius, 'inner radius');
  assertPositive(geometry.outerRadius, 'outer radius');
  if (geometry.outerRadius <= geometry.innerRadius) {
    throw new Error('Outer radius must exceed inner radius.');
  }
  if (geometry.kind === 'coaxial') assertPositive(geometry.length, 'coaxial length');
}

function validateRelativePermittivity(value: number) {
  if (value < 1 || !Number.isFinite(value)) {
    throw new Error('Relative permittivity must be finite and at least one.');
  }
}

function assertPositive(value: number, name: string) {
  if (!(value > 0) || !Number.isFinite(value)) throw new Error(`${name} must be finite and positive.`);
}

function assertFinite(value: number, name: string) {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite.`);
}
