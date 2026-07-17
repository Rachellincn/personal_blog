import { describe, expect, it } from 'vitest';
import { MU_0, ampereLoopReport, biotSavartField, circularAmpereLoop, circularLoopAxisReport, finiteSolenoidAxisReport, magneticDipoleField, magneticDipoleInteraction, magneticFluxThroughSphere, parallelWireForcePerLength, rectangularCoilInteraction, straightWireField, wireForce } from '../../src/scripts/playground/electromagnetism/magnetostatics';

describe('straight current-carrying wire', () => {
  it('follows the right-hand rule and inverse-radius law', () => {
    const near = straightWireField({ current: 4, origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } }, { x: .2, y: 0, z: .7 });
    const far = straightWireField({ current: 4, origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } }, { x: .4, y: 0, z: -.3 });
    expect(near).not.toBeNull();
    expect(near!.x).toBeCloseTo(0, 14);
    expect(near!.y).toBeCloseTo(MU_0 * 4 / (2 * Math.PI * .2), 14);
    expect(near!.z).toBeCloseTo(0, 14);
    expect(far!.y).toBeCloseTo(near!.y / 2, 14);
    const reversed = straightWireField({ current: -4, origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } }, { x: .2, y: 0, z: 0 });
    expect(reversed!.y).toBeCloseTo(-near!.y, 14);
  });
});

describe('segmented Biot–Savart conductor', () => {
  it('returns every signed current-element contribution and their vector sum', () => {
    const report = biotSavartField([
      { id: 'a', current: 3, from: { x: -.5, y: 0, z: 0 }, to: { x: .5, y: 0, z: 0 } },
      { id: 'b', current: 3, from: { x: .5, y: 0, z: 0 }, to: { x: 1.5, y: 0, z: 0 } },
    ], { x: 0, y: 1, z: 0 });
    expect(report.contributions).toHaveLength(2);
    expect(report.contributions[0].field!.z).toBeCloseTo(MU_0 * 3 / (4 * Math.PI), 14);
    expect(report.contributions[0].field!.x).toBeCloseTo(0, 14);
    expect(report.contributions[1].field!.z).toBeGreaterThan(0);
    expect(report.field!.z).toBeCloseTo(report.contributions[0].field!.z + report.contributions[1].field!.z, 14);
    expect(report.skipped).toBe(0);
  });

  it('marks the whole ideal wire segment as singular instead of clipping it', () => {
    const report = biotSavartField([
      { id: 'wire', current: 2, from: { x: -.5, y: 0, z: 0 }, to: { x: .5, y: 0, z: 0 } },
    ], { x: .25, y: 0, z: 0 }, 1e-4);
    expect(report.field).toBeNull();
    expect(report.contributions[0].field).toBeNull();
    expect(report.skipped).toBe(1);
  });
});

describe('circular current loop', () => {
  it('matches the center field and approaches its dipole far field', () => {
    const center = circularLoopAxisReport({ current: 2.5, radius: .12, turns: 40 }, 0);
    expect(center.exactField).toBeCloseTo(MU_0 * 40 * 2.5 / (2 * .12), 14);
    const far = circularLoopAxisReport({ current: 2.5, radius: .12, turns: 40 }, 3.6);
    expect(far.dipoleField).toBeGreaterThan(0);
    expect(far.relativeDipoleError).toBeLessThan(.002);
    expect(circularLoopAxisReport({ current: -2.5, radius: .12, turns: 40 }, 0).exactField).toBeLessThan(0);
  });
});

describe('finite solenoid', () => {
  it('approaches a uniform interior field and exposes fringe decay', () => {
    const solenoid = { current: 1.8, radius: .02, length: 1, turns: 800 };
    const center = finiteSolenoidAxisReport(solenoid, 0);
    expect(center.idealInteriorField).toBeCloseTo(MU_0 * 800 / 1 * 1.8, 14);
    expect(center.field / center.idealInteriorField).toBeGreaterThan(.999);
    const outside = finiteSolenoidAxisReport(solenoid, .8);
    expect(outside.field / center.field).toBeLessThan(.005);
    expect(outside.region).toBe('outside');
  });
});

describe('magnetic dipole field', () => {
  it('has no magnetic-monopole flux through a closed sphere', () => {
    const moment = { x: 0, y: 0, z: .32 };
    const fieldAt = (point: { x: number; y: number; z: number }) => magneticDipoleField(moment, { x: 0, y: 0, z: 0 }, point);
    const equator = fieldAt({ x: .5, y: 0, z: 0 });
    expect(equator!.z).toBeLessThan(0);
    const report = magneticFluxThroughSphere(fieldAt, { x: 0, y: 0, z: 0 }, .8, 48, 96);
    expect(report.skipped).toBe(0);
    expect(Math.abs(report.flux) / report.absoluteFlux).toBeLessThan(1e-12);
  });
});

describe('Ampère loop integral', () => {
  it('matches μ₀I enclosed while keeping symmetry as a separate condition', () => {
    const wires = [{ id: 'I1', current: 5, position: { x: 0, y: 0 } }];
    const centered = ampereLoopReport(wires, circularAmpereLoop({ x: 0, y: 0 }, .4, 720));
    expect(centered.integral).toBeCloseTo(MU_0 * 5, 9);
    expect(centered.enclosedCurrent).toBe(5);
    expect(centered.canExtractFieldBySymmetry).toBe(true);
    const displaced = ampereLoopReport(wires, circularAmpereLoop({ x: 1, y: 0 }, .25, 360));
    expect(displaced.enclosedCurrent).toBe(0);
    expect(Math.abs(displaced.integral!)).toBeLessThan(1e-11);
    expect(displaced.canExtractFieldBySymmetry).toBe(false);
  });
});

describe('magnetic dipole interaction', () => {
  it('derives torque, potential energy, and gradient force from vectors', () => {
    const state = magneticDipoleInteraction({
      moment: { x: .4, y: 0, z: .2 },
      field: { x: 0, y: 0, z: .3 },
      fieldGradient: [
        [0, 0, 0],
        [0, 0, 0],
        [.8, 0, 0],
      ],
    });
    expect(state.torque).toEqual({ x: 0, y: -.12, z: 0 });
    expect(state.potentialEnergy).toBeCloseTo(-.06, 14);
    expect(state.force.x).toBeCloseTo(.16, 14);
    expect(state.force.y).toBe(0);
  });
});

describe('forces on current-carrying wires and coils', () => {
  it('derives force and motor torque from signed cross products', () => {
    const force = wireForce(3, { x: .4, y: 0, z: 0 }, { x: 0, y: 0, z: .2 });
    expect(force.x).toBe(0); expect(force.y).toBeCloseTo(-.24, 14); expect(force.z).toBe(0);
    expect(parallelWireForcePerLength(4, 7, .03)).toBeGreaterThan(0);
    expect(parallelWireForcePerLength(4, -7, .03)).toBeLessThan(0);
    const coil = rectangularCoilInteraction({ current: 2, turns: 30, width: .1, height: .06, normal: { x: 1, y: 0, z: 0 }, field: { x: 0, y: 0, z: .4 } });
    expect(coil.moment.x).toBeCloseTo(.36, 14);
    expect(coil.torque.y).toBeCloseTo(-.144, 14);
    expect(coil.potentialEnergy).toBeCloseTo(0, 14);
  });
});
