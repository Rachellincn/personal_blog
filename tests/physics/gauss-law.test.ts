import { describe, expect, it } from 'vitest';
import {
  EPSILON_0,
  createGaussianCylinder,
  createGaussianPillbox,
  createGaussianSphere,
  createInfiniteLineChargeScenario,
  createInfinitePlaneChargeScenario,
  createPointChargeScenario,
  createUniformSphereChargeScenario,
  verifyGaussLaw,
} from '../../src/scripts/playground/electromagnetism/gauss-law';

describe('Gauss-law surface integration', () => {
  it('returns q/epsilon0 for a centered point charge inside a sphere', () => {
    const charge = 2.5e-9;
    const scenario = createPointChargeScenario([
      { id: 'q', position: { x: 0, y: 0, z: 0 }, charge },
    ]);
    const surface = createGaussianSphere({
      center: { x: 0, y: 0, z: 0 },
      radius: 1.2,
    });

    const report = verifyGaussLaw(scenario, surface, { resolution: 64 });

    expect(report.enclosedCharge).toBeCloseTo(charge, 15);
    expect(report.expectedFlux).toBeCloseTo(charge / EPSILON_0, 10);
    expect(report.relativeError).toBeLessThan(2e-4);
    expect(report.samples.every((sample) => Number.isFinite(sample.eDotDA))).toBe(true);
  });

  it('reports an outside charge separately and integrates nearly zero net flux', () => {
    const charge = -3e-9;
    const scenario = createPointChargeScenario([
      { id: 'outside', position: { x: 2.4, y: 0, z: 0 }, charge },
    ]);
    const surface = createGaussianSphere({
      center: { x: 0, y: 0, z: 0 },
      radius: 0.8,
    });

    const report = verifyGaussLaw(scenario, surface, { resolution: 64 });

    expect(report.enclosedCharge).toBe(0);
    expect(report.unenclosedCharge).toBeCloseTo(charge, 15);
    expect(report.relativeError).toBeLessThan(2e-4);
  });

  it('matches lambda times enclosed length over epsilon0 for an infinite line', () => {
    const linearDensity = 4e-9;
    const halfLength = 1.25;
    const scenario = createInfiniteLineChargeScenario({
      axis: { x: 0, y: 0 },
      linearDensity,
    });
    const surface = createGaussianCylinder({
      center: { x: 0, y: 0, z: 0 },
      radius: 0.7,
      halfLength,
    });

    const report = verifyGaussLaw(scenario, surface, { resolution: 48 });

    expect(report.enclosedCharge).toBeCloseTo(linearDensity * 2 * halfLength, 15);
    expect(report.flux).toBeCloseTo(report.expectedFlux, 8);
    expect(report.relativeError).toBeLessThan(1e-10);
  });

  it('matches sigma times pillbox area over epsilon0 for an infinite plane', () => {
    const surfaceChargeDensity = -6e-9;
    const radius = 0.9;
    const scenario = createInfinitePlaneChargeScenario({
      z: 0,
      surfaceChargeDensity,
    });
    const surface = createGaussianPillbox({
      center: { x: 0.3, y: -0.2, z: 0 },
      radius,
      halfLength: 0.4,
    });

    const report = verifyGaussLaw(scenario, surface, { resolution: 40 });

    expect(report.enclosedCharge).toBeCloseTo(
      surfaceChargeDensity * Math.PI * radius * radius,
      15,
    );
    expect(report.flux).toBeCloseTo(report.expectedFlux, 8);
    expect(report.relativeError).toBeLessThan(1e-10);
  });

  it('keeps Gauss law valid while rejecting field extraction for asymmetric charges', () => {
    const scenario = createPointChargeScenario([
      { id: 'q1', position: { x: 0.55, y: 0, z: 0 }, charge: 4e-9 },
      { id: 'q2', position: { x: -0.2, y: 0.35, z: 0.1 }, charge: -1.5e-9 },
    ]);
    const surface = createGaussianSphere({
      center: { x: 0, y: 0, z: 0 },
      radius: 1.3,
    });

    const report = verifyGaussLaw(scenario, surface, { resolution: 72 });

    expect(report.relativeError).toBeLessThan(4e-4);
    expect(report.canExtractFieldBySymmetry).toBe(false);
    expect(report.symmetryNote).toContain('still holds');
  });

  it('uses only the enclosed volume of a uniform charged sphere', () => {
    const volumeDensity = 2.2e-9;
    const gaussianRadius = 0.72;
    const scenario = createUniformSphereChargeScenario({
      center: { x: 0, y: 0, z: 0 },
      radius: 1.4,
      volumeDensity,
    });
    const surface = createGaussianSphere({
      center: { x: 0, y: 0, z: 0 },
      radius: gaussianRadius,
    });

    const report = verifyGaussLaw(scenario, surface, { resolution: 64 });
    const enclosedVolume = 4 * Math.PI * gaussianRadius ** 3 / 3;

    expect(report.enclosedCharge).toBeCloseTo(volumeDensity * enclosedVolume, 15);
    expect(report.relativeError).toBeLessThan(2e-4);
    expect(report.canExtractFieldBySymmetry).toBe(true);
  });

  it('keeps Gauss law valid for an off-center sphere but rejects symmetry extraction', () => {
    const scenario = createUniformSphereChargeScenario({
      center: { x: 0, y: 0, z: 0 },
      radius: 1.1,
      volumeDensity: -1.8e-9,
    });
    const surface = createGaussianSphere({
      center: { x: 0.45, y: 0, z: 0 },
      radius: 0.5,
    });

    const report = verifyGaussLaw(scenario, surface, { resolution: 88 });

    expect(report.relativeError).toBeLessThan(8e-4);
    expect(report.canExtractFieldBySymmetry).toBe(false);
    expect(report.symmetryNote).toContain('still holds');
  });

  it('rejects a displaced cylinder as a symmetry surface for an infinite line', () => {
    const scenario = createInfiniteLineChargeScenario({
      axis: { x: 0, y: 0 },
      linearDensity: 3e-9,
    });
    const surface = createGaussianCylinder({
      center: { x: 0.3, y: 0, z: 0 },
      radius: 0.8,
      halfLength: 0.7,
    });

    const report = verifyGaussLaw(scenario, surface, { resolution: 80 });

    expect(report.relativeError).toBeLessThan(8e-4);
    expect(report.canExtractFieldBySymmetry).toBe(false);
  });

  it('rejects a pillbox whose midplane is displaced from the infinite plane', () => {
    const scenario = createInfinitePlaneChargeScenario({
      z: 0,
      surfaceChargeDensity: 5e-9,
    });
    const surface = createGaussianPillbox({
      center: { x: 0, y: 0, z: 0.8 },
      radius: 0.6,
      halfLength: 0.5,
    });

    const report = verifyGaussLaw(scenario, surface, { resolution: 44 });

    expect(report.relativeError).toBeLessThan(1e-10);
    expect(report.canExtractFieldBySymmetry).toBe(false);
  });
});
