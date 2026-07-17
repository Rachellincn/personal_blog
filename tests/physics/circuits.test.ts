import { describe, expect, it } from 'vitest';
import {
  currentDensityState,
  ohmicConductorState,
  rcStepResponse,
  rlStepResponse,
  rlcFreeResponse,
  sinusoidalRlcState,
  solveDcCircuit,
} from '../../src/scripts/playground/electromagnetism/circuits';

describe('current density and Ohm law', () => {
  it('keeps electron drift opposite E while conventional current follows E', () => {
    const state = currentDensityState({ carrierDensity: 8.5e28, carrierCharge: -1.602176634e-19, mobility: .0043, electricField: 2, area: 1.2e-6 });
    expect(state.driftVelocity).toBeLessThan(0);
    expect(state.currentDensity).toBeGreaterThan(0);
    expect(state.current).toBeCloseTo(state.currentDensity * 1.2e-6, 12);
  });

  it('links microscopic field, resistance, current density, and Joule power', () => {
    const state = ohmicConductorState({ resistivity: 1.68e-8, length: 2, area: 1e-6, voltage: 3.36 });
    expect(state.resistance).toBeCloseTo(.0336, 12);
    expect(state.current).toBeCloseTo(100, 10);
    expect(state.electricField).toBeCloseTo(1.68, 12);
    expect(state.power).toBeCloseTo(state.voltage * state.current, 12);
  });
});

describe('Kirchhoff DC circuit solver', () => {
  it('solves a grounded voltage divider and exposes KCL residuals', () => {
    const result = solveDcCircuit({
      nodes: ['gnd', 'source', 'mid'],
      ground: 'gnd',
      elements: [
        { id: 'V1', kind: 'voltage-source', positive: 'source', negative: 'gnd', voltage: 12 },
        { id: 'R1', kind: 'resistor', from: 'source', to: 'mid', resistance: 2000 },
        { id: 'R2', kind: 'resistor', from: 'mid', to: 'gnd', resistance: 1000 },
      ],
    });
    expect(result.nodeVoltages.source).toBeCloseTo(12, 12);
    expect(result.nodeVoltages.mid).toBeCloseTo(4, 12);
    expect(result.branchCurrents.R1).toBeCloseTo(0.004, 12);
    expect(result.branchCurrents.R2).toBeCloseTo(0.004, 12);
    expect(result.maxKclResidual).toBeLessThan(1e-12);
    expect(result.kvlLoops[0].residual).toBeLessThan(1e-10);
  });

  it('supports current sources and an open or closed switch', () => {
    const base = {
      nodes: ['gnd', 'n'], ground: 'gnd',
      elements: [
        { id: 'I1', kind: 'current-source' as const, from: 'gnd', to: 'n', current: .002 },
        { id: 'R', kind: 'resistor' as const, from: 'n', to: 'gnd', resistance: 1000 },
      ],
    };
    expect(solveDcCircuit(base).nodeVoltages.n).toBeCloseTo(2, 12);
    const closed = solveDcCircuit({ ...base, elements: [...base.elements, { id: 'S', kind: 'switch' as const, from: 'n', to: 'gnd', closed: true }] });
    expect(Math.abs(closed.nodeVoltages.n)).toBeLessThan(1e-6);
    const open = solveDcCircuit({ ...base, elements: [...base.elements, { id: 'S', kind: 'switch' as const, from: 'n', to: 'gnd', closed: false }] });
    expect(open.nodeVoltages.n).toBeCloseTo(2, 9);
  });

  it('uses the correct DC equivalents for capacitors, inductors, and wires', () => {
    const circuitWith = (element: Parameters<typeof solveDcCircuit>[0]['elements'][number]) => solveDcCircuit({
      nodes: ['gnd', 'source', 'mid'],
      ground: 'gnd',
      elements: [
        { id: 'V1', kind: 'voltage-source', positive: 'source', negative: 'gnd', voltage: 12 },
        { id: 'R1', kind: 'resistor', from: 'source', to: 'mid', resistance: 100 },
        element,
      ],
    });
    const capacitor = circuitWith({ id: 'X1', kind: 'capacitor', from: 'mid', to: 'gnd', capacitance: 20e-6 });
    expect(capacitor.nodeVoltages.mid).toBeCloseTo(12, 12);
    expect(capacitor.branchCurrents.X1).toBe(0);
    for (const short of [
      { id: 'X1', kind: 'inductor' as const, from: 'mid', to: 'gnd', inductance: .04 },
      { id: 'X1', kind: 'wire' as const, from: 'mid', to: 'gnd' },
    ]) {
      const result = circuitWith(short);
      expect(result.nodeVoltages.mid).toBeCloseTo(0, 12);
      expect(result.branchCurrents.R1).toBeCloseTo(.12, 12);
      expect(result.maxKclResidual).toBeLessThan(1e-12);
    }
  });
});

describe('RC, RL, and RLC responses', () => {
  it('matches RC charging at one time constant', () => {
    const state = rcStepResponse({ resistance: 1000, capacitance: 2e-6, voltage: 10 }, .002);
    expect(state.timeConstant).toBeCloseTo(.002, 15);
    expect(state.capacitorVoltage).toBeCloseTo(10 * (1 - Math.exp(-1)), 12);
    expect(state.charge).toBeCloseTo(2e-6 * state.capacitorVoltage, 15);
    expect(state.resistorEnergy + state.capacitorEnergy).toBeCloseTo(state.sourceEnergy, 10);
  });

  it('matches RL current growth at one time constant', () => {
    const state = rlStepResponse({ resistance: 20, inductance: .04, voltage: 8 }, .002);
    expect(state.timeConstant).toBeCloseTo(.002, 15);
    expect(state.current).toBeCloseTo(.4 * (1 - Math.exp(-1)), 12);
    expect(state.inductorEnergy).toBeCloseTo(.5 * .04 * state.current ** 2, 15);
  });

  it('classifies underdamped, critical, and overdamped free RLC motion', () => {
    const common = { inductance: .1, capacitance: 100e-6, initialCharge: 2e-3, initialCurrent: 0 };
    expect(rlcFreeResponse({ ...common, resistance: 10 }, .01).regime).toBe('underdamped');
    const criticalResistance = 2 * Math.sqrt(common.inductance / common.capacitance);
    expect(rlcFreeResponse({ ...common, resistance: criticalResistance }, .01).regime).toBe('critical');
    expect(rlcFreeResponse({ ...common, resistance: 100 }, .01).regime).toBe('overdamped');
  });

  it('conserves total energy in the ideal LC limit', () => {
    const options = { resistance: 0, inductance: .08, capacitance: 120e-6, initialCharge: 1.2e-3, initialCurrent: 0 };
    const initial = rlcFreeResponse(options, 0);
    for (const time of [.002, .007, .015, .031]) {
      const state = rlcFreeResponse(options, time);
      expect(state.capacitorEnergy + state.inductorEnergy).toBeCloseTo(initial.capacitorEnergy, 12);
    }
  });

  it('keeps reported RLC current equal to the time derivative of charge', () => {
    const options = { resistance: 18, inductance: .08, capacitance: 120e-6, initialCharge: 1.2e-3, initialCurrent: -.04 };
    const time = .011;
    const h = 1e-7;
    const derivative = (rlcFreeResponse(options, time + h).charge - rlcFreeResponse(options, time - h).charge) / (2 * h);
    expect(rlcFreeResponse(options, time).current).toBeCloseTo(derivative, 7);
  });

  it('shares impedance parameters between phasor and real-time waveform', () => {
    const options = { resistance: 30, inductance: .08, capacitance: 80e-6, sourceAmplitude: 12, frequency: 55, sourcePhase: .2 };
    const time = .013;
    const state = sinusoidalRlcState(options, time);
    expect(state.current).toBeCloseTo(state.currentAmplitude * Math.cos(2 * Math.PI * options.frequency * time + state.currentPhase), 12);
    expect(state.impedanceMagnitude).toBeCloseTo(Math.hypot(options.resistance, state.reactance), 12);
    expect(state.voltagePhasors.resistor.x + state.voltagePhasors.inductor.x + state.voltagePhasors.capacitor.x).toBeCloseTo(state.sourcePhasor.x, 10);
    expect(state.voltagePhasors.resistor.y + state.voltagePhasors.inductor.y + state.voltagePhasors.capacitor.y).toBeCloseTo(state.sourcePhasor.y, 10);
  });

  it('peaks series-RLC current at resonance', () => {
    const base = { resistance: 12, inductance: .05, capacitance: 120e-6, sourceAmplitude: 10, sourcePhase: 0 };
    const resonantFrequency = 1 / (2 * Math.PI * Math.sqrt(base.inductance * base.capacitance));
    const resonant = sinusoidalRlcState({ ...base, frequency: resonantFrequency }, 0);
    const offResonant = sinusoidalRlcState({ ...base, frequency: resonantFrequency * 1.8 }, 0);
    expect(resonant.currentAmplitude).toBeGreaterThan(offResonant.currentAmplitude);
    expect(Math.abs(resonant.reactance)).toBeLessThan(1e-10);
  });
});
