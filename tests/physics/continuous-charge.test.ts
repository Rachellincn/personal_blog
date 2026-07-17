import { describe, expect, it } from 'vitest';
import {
  evaluateContinuousField,
  relativeFieldError,
  type ContinuousDistribution,
} from '../../src/scripts/playground/electromagnetism/continuous-charge';

describe('continuous charge distributions', () => {
  it('matches finite-rod analytic and numerical fields on the perpendicular bisector', () => {
    const rod: ContinuousDistribution = {
      kind: 'rod',
      linearDensity: 2e-9,
      length: 1.6,
    };
    const probe = { x: 0.8, y: 0, z: 0 };

    const analytic = evaluateContinuousField(rod, probe, 'analytic');
    const numerical = evaluateContinuousField(rod, probe, 'numeric', {
      samples: 4_000,
    });

    expect(analytic.field).not.toBeNull();
    expect(numerical.field).not.toBeNull();
    expect(relativeFieldError(numerical.field!, analytic.field!)).toBeLessThan(1e-7);
    expect(analytic.field!.y).toBeCloseTo(0, 12);
    expect(analytic.field!.z).toBeCloseTo(0, 12);
  });

  it('matches charged-ring analytic and numerical fields on the symmetry axis', () => {
    const ring: ContinuousDistribution = {
      kind: 'ring',
      totalCharge: 5e-9,
      radius: 0.7,
    };
    const probe = { x: 0, y: 0, z: 0.9 };

    const analytic = evaluateContinuousField(ring, probe, 'analytic');
    const numerical = evaluateContinuousField(ring, probe, 'numeric', {
      samples: 2_000,
    });

    expect(relativeFieldError(numerical.field!, analytic.field!)).toBeLessThan(1e-10);
    expect(analytic.field!.x).toBeCloseTo(0, 12);
    expect(analytic.field!.y).toBeCloseTo(0, 12);
  });

  it('matches charged-disk analytic and area-weighted numerical fields on axis', () => {
    const disk: ContinuousDistribution = {
      kind: 'disk',
      surfaceDensity: 3e-9,
      radius: 0.85,
    };
    const probe = { x: 0, y: 0, z: 0.65 };

    const analytic = evaluateContinuousField(disk, probe, 'analytic');
    const numerical = evaluateContinuousField(disk, probe, 'numeric', {
      samples: 20_000,
    });

    expect(relativeFieldError(numerical.field!, analytic.field!)).toBeLessThan(2e-5);
    expect(numerical.integrationSamples).toBeLessThanOrEqual(20_000);
  });

  it('converges from a finite integration window to the infinite-line field', () => {
    const line: ContinuousDistribution = {
      kind: 'infinite-line',
      linearDensity: -4e-9,
    };
    const probe = { x: 0.55, y: -0.2, z: 0 };

    const analytic = evaluateContinuousField(line, probe, 'analytic');
    const numerical = evaluateContinuousField(line, probe, 'numeric', {
      samples: 20_000,
      integrationExtent: 80,
    });

    expect(relativeFieldError(numerical.field!, analytic.field!)).toBeLessThan(3e-5);
    expect(numerical.validity).toContain('finite');
  });

  it('approaches the infinite-plane field with a finite disk integration window', () => {
    const plane: ContinuousDistribution = {
      kind: 'infinite-plane',
      surfaceDensity: 7e-9,
    };
    const probe = { x: 0, y: 0, z: -0.4 };

    const analytic = evaluateContinuousField(plane, probe, 'analytic');
    const numerical = evaluateContinuousField(plane, probe, 'numeric', {
      samples: 20_000,
      integrationExtent: 20,
    });

    expect(relativeFieldError(numerical.field!, analytic.field!)).toBeLessThan(0.022);
    expect(Math.sign(numerical.field!.z)).toBe(-1);
    expect(numerical.validity).toContain('finite disk');
  });

  it('recovers zero interior field and point-charge exterior field for a shell', () => {
    const shell: ContinuousDistribution = {
      kind: 'spherical-shell',
      totalCharge: 5e-9,
      radius: 0.8,
    };
    const inside = evaluateContinuousField(shell, { x: 0.3, y: 0, z: 0 }, 'numeric', {
      samples: 20_000,
    });
    const outsideProbe = { x: 1.3, y: 0.2, z: -0.1 };
    const outsideAnalytic = evaluateContinuousField(shell, outsideProbe, 'analytic');
    const outsideNumeric = evaluateContinuousField(shell, outsideProbe, 'numeric', {
      samples: 20_000,
    });

    expect(inside.magnitude! / outsideAnalytic.magnitude!).toBeLessThan(5e-5);
    expect(relativeFieldError(outsideNumeric.field!, outsideAnalytic.field!)).toBeLessThan(5e-5);
  });

  it('matches analytic interior and exterior fields for a uniformly charged sphere', () => {
    const sphere: ContinuousDistribution = {
      kind: 'uniform-sphere',
      volumeDensity: 4e-9,
      radius: 0.8,
    };
    const insideProbe = { x: 0.28, y: -0.12, z: 0.08 };
    const outsideProbe = { x: 1.25, y: 0.3, z: -0.2 };

    const insideAnalytic = evaluateContinuousField(sphere, insideProbe, 'analytic');
    const insideNumeric = evaluateContinuousField(sphere, insideProbe, 'numeric', {
      samples: 20_000,
    });
    const outsideAnalytic = evaluateContinuousField(sphere, outsideProbe, 'analytic');
    const outsideNumeric = evaluateContinuousField(sphere, outsideProbe, 'numeric', {
      samples: 20_000,
    });

    expect(relativeFieldError(insideNumeric.field!, insideAnalytic.field!)).toBeLessThan(0.012);
    expect(relativeFieldError(outsideNumeric.field!, outsideAnalytic.field!)).toBeLessThan(4e-4);
  });
});
