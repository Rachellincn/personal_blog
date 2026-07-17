import { describe, expect, it } from 'vitest';
import {
  solveConductorEquilibrium,
} from '../../src/scripts/playground/electromagnetism/conductors';

describe('conducting boundaries at electrostatic equilibrium', () => {
  it('makes an isolated circular conductor equipotential with uniform surface charge', () => {
    const solution = solveConductorEquilibrium({
      outer: { kind: 'ellipse', semiMajor: 1, semiMinor: 1 },
      netCharge: 4e-9,
      externalField: { x: 0, y: 0 },
      samples: 56,
    });

    const densities = solution.samples
      .filter((sample) => sample.boundary === 'outer')
      .map((sample) => sample.surfaceChargeDensity);
    const mean = densities.reduce((sum, value) => sum + value, 0) / densities.length;
    const coefficientOfVariation = Math.sqrt(
      densities.reduce((sum, value) => sum + (value - mean) ** 2, 0) / densities.length,
    ) / Math.abs(mean);

    expect(solution.diagnostics.relativeBoundaryPotentialSpread).toBeLessThan(1e-10);
    expect(coefficientOfVariation).toBeLessThan(2e-3);
    expect(solution.enclosedSurfaceCharge).toBeCloseTo(4e-9, 15);
  });

  it('screens a uniform external field and concentrates charge near ellipse tips', () => {
    const externalMagnitude = 120;
    const solution = solveConductorEquilibrium({
      outer: { kind: 'ellipse', semiMajor: 1.55, semiMinor: 0.62 },
      netCharge: 0,
      externalField: { x: externalMagnitude, y: 0 },
      samples: 72,
    });

    const centerField = solution.fieldAt({ x: 0, y: 0 });
    expect(Math.hypot(centerField.x, centerField.y) / externalMagnitude).toBeLessThan(0.08);
    expect(solution.diagnostics.relativeBoundaryPotentialSpread).toBeLessThan(1e-9);
    expect(solution.diagnostics.tipChargeEnhancement).toBeGreaterThan(1.35);
  });

  it('keeps an empty cavity shielded from an external field', () => {
    const externalMagnitude = 90;
    const cavityCenter = { x: 0.28, y: -0.08 };
    const solution = solveConductorEquilibrium({
      outer: { kind: 'ellipse', semiMajor: 1.5, semiMinor: 1.15 },
      cavity: { center: cavityCenter, radius: 0.38 },
      netCharge: 0,
      externalField: { x: externalMagnitude, y: 0 },
      samples: 76,
    });

    const cavityField = solution.fieldAt(cavityCenter);
    const materialField = solution.fieldAt({ x: -.7, y: .35 });
    expect(Math.hypot(cavityField.x, cavityField.y) / externalMagnitude).toBeLessThan(0.12);
    expect(Math.hypot(materialField.x, materialField.y) / externalMagnitude).toBeLessThan(0.12);
    expect(solution.diagnostics.cavityShieldingRatio).toBeLessThan(0.12);
    expect(solution.samples.some((sample) => sample.boundary === 'cavity')).toBe(true);
  });

  it('returns finite field and potential away from the collocation boundary', () => {
    const solution = solveConductorEquilibrium({
      outer: { kind: 'ellipse', semiMajor: 1.2, semiMinor: .8 },
      netCharge: -2e-9,
      externalField: { x: 40, y: -15 },
      samples: 48,
    });
    for (const point of [{ x: 0, y: 0 }, { x: 2, y: .4 }, { x: -1.8, y: 1.4 }]) {
      const field = solution.fieldAt(point);
      expect([field.x, field.y, solution.potentialAt(point)].every(Number.isFinite)).toBe(true);
    }
  });
});
