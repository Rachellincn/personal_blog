import { describe, expect, it } from 'vitest';
import {
  EPSILON_0,
  capacitanceOf,
  combineCapacitors,
  evaluateCapacitor,
  parallelPlateField,
} from '../../src/scripts/playground/electromagnetism/capacitors';

describe('capacitors and dielectric response', () => {
  it('matches the ideal parallel-plate capacitance', () => {
    const geometry = { kind: 'parallel-plate' as const, area: 0.12, separation: 0.004 };
    expect(capacitanceOf(geometry, { kind: 'vacuum' })).toBeCloseTo(
      EPSILON_0 * geometry.area / geometry.separation,
      15,
    );
  });

  it('matches spherical and coaxial capacitor formulas', () => {
    const spherical = capacitanceOf(
      { kind: 'spherical', innerRadius: 0.02, outerRadius: 0.05 },
      { kind: 'uniform', relativePermittivity: 2.4 },
    );
    expect(spherical).toBeCloseTo(
      4 * Math.PI * EPSILON_0 * 2.4 * 0.02 * 0.05 / (0.05 - 0.02),
      15,
    );

    const coaxial = capacitanceOf(
      { kind: 'coaxial', innerRadius: 0.003, outerRadius: 0.012, length: 0.8 },
      { kind: 'vacuum' },
    );
    expect(coaxial).toBeCloseTo(
      2 * Math.PI * EPSILON_0 * 0.8 / Math.log(0.012 / 0.003),
      15,
    );
  });

  it('combines multiple capacitors in series and parallel', () => {
    const values = [2e-6, 3e-6, 6e-6];
    expect(combineCapacitors(values, 'parallel')).toBeCloseTo(11e-6, 15);
    expect(combineCapacitors(values, 'series')).toBeCloseTo(1e-6, 15);
  });

  it('treats partial insertion as parallel area regions', () => {
    const geometry = { kind: 'parallel-plate' as const, area: 0.08, separation: 0.002 };
    const vacuum = capacitanceOf(geometry, { kind: 'vacuum' });
    const inserted = capacitanceOf(geometry, {
      kind: 'partial',
      relativePermittivity: 5,
      insertedFraction: 0.35,
    });
    expect(inserted / vacuum).toBeCloseTo(0.65 + 0.35 * 5, 12);
  });

  it('treats layers along the field as series dielectric slabs', () => {
    const geometry = { kind: 'parallel-plate' as const, area: 0.08, separation: 0.002 };
    const vacuum = capacitanceOf(geometry, { kind: 'vacuum' });
    const layered = capacitanceOf(geometry, {
      kind: 'layered',
      layers: [
        { relativePermittivity: 2, thicknessFraction: 0.4 },
        { relativePermittivity: 6, thicknessFraction: 0.6 },
      ],
    });
    expect(layered / vacuum).toBeCloseTo(1 / (0.4 / 2 + 0.6 / 6), 12);
  });

  it('distinguishes fixed-voltage and fixed-charge energy changes', () => {
    const geometry = { kind: 'parallel-plate' as const, area: 0.1, separation: 0.003 };
    const vacuumCapacitance = capacitanceOf(geometry, { kind: 'vacuum' });
    const fixedVoltage = evaluateCapacitor(
      geometry,
      { kind: 'uniform', relativePermittivity: 4 },
      { kind: 'fixed-voltage', voltage: 12 },
    );
    expect(fixedVoltage.freeCharge).toBeCloseTo(4 * vacuumCapacitance * 12, 15);
    expect(fixedVoltage.energyChange).toBeGreaterThan(0);

    const initialCharge = vacuumCapacitance * 12;
    const fixedCharge = evaluateCapacitor(
      geometry,
      { kind: 'uniform', relativePermittivity: 4 },
      { kind: 'fixed-charge', freeCharge: initialCharge },
    );
    expect(fixedCharge.voltage).toBeCloseTo(3, 12);
    expect(fixedCharge.energyChange).toBeLessThan(0);
  });

  it('reports E, D, P, free charge, bound charge, and energy density', () => {
    const geometry = { kind: 'parallel-plate' as const, area: 0.06, separation: 0.005 };
    const report = evaluateCapacitor(
      geometry,
      { kind: 'uniform', relativePermittivity: 3.2 },
      { kind: 'fixed-voltage', voltage: 20 },
    );
    const field = parallelPlateField(report);
    expect(field.electricField).toBeCloseTo(4000, 12);
    expect(field.displacementField).toBeCloseTo(EPSILON_0 * 3.2 * 4000, 15);
    expect(field.polarization).toBeCloseTo(EPSILON_0 * 2.2 * 4000, 15);
    expect(field.boundSurfaceChargeDensity).toBeCloseTo(field.polarization, 15);
    expect(field.freeSurfaceChargeDensity).toBeCloseTo(field.displacementField, 15);
    expect(field.energyDensity).toBeCloseTo(
      0.5 * field.electricField * field.displacementField,
      15,
    );
  });

  it('labels the parallel-plate fringe correction as an approximation', () => {
    const geometry = { kind: 'parallel-plate' as const, area: 0.01, separation: 0.01 };
    const ideal = capacitanceOf(geometry, { kind: 'vacuum' });
    const corrected = capacitanceOf(geometry, { kind: 'vacuum' }, { fringe: true });
    expect(corrected).toBeGreaterThan(ideal);
    const report = evaluateCapacitor(
      geometry,
      { kind: 'vacuum' },
      { kind: 'fixed-voltage', voltage: 5 },
      { fringe: true },
    );
    expect(report.validity).toContain('approximation');
  });
});
