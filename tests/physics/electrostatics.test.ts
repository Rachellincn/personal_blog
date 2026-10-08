import { describe, expect, it } from 'vitest';
import {
  COULOMB_CONSTANT,
  DEFAULT_SINGULARITY_RADIUS,
  electricFieldAt,
  electricPotentialAt,
  negativePotentialGradient,
  relativeVectorError,
  type PointCharge,
} from '../../src/scripts/playground/electromagnetism/electrostatics';

const positive: PointCharge = { id: 'positive', position: { x: 0, y: 0 }, charge: 2e-9 };

describe('point-charge electrostatics', () => {
  it('obeys the inverse-square law', () => {
    const near = electricFieldAt({ x: 1, y: 0 }, [positive]);
    const far = electricFieldAt({ x: 2, y: 0 }, [positive]);
    expect(near.magnitude! / far.magnitude!).toBeCloseTo(4, 12);
    expect(near.magnitude).toBeCloseTo(COULOMB_CONSTANT * positive.charge, 10);
  });

  it('uses linear vector superposition', () => {
    const sources: PointCharge[] = [positive, { id: 'negative', position: { x: .4, y: -.7 }, charge: -3e-9 }];
    const point = { x: 1.2, y: .8 };
    const total = electricFieldAt(point, sources).vector!;
    const first = electricFieldAt(point, [sources[0]]).vector!;
    const second = electricFieldAt(point, [sources[1]]).vector!;
    expect(total.x).toBeCloseTo(first.x + second.x, 12);
    expect(total.y).toBeCloseTo(first.y + second.y, 12);
  });

  it('matches the negative numerical gradient of potential', () => {
    const sources: PointCharge[] = [positive, { id: 'negative', position: { x: 1, y: .2 }, charge: -1.5e-9 }];
    const point = { x: -.7, y: .9 };
    const field = electricFieldAt(point, sources).vector!;
    const gradient = negativePotentialGradient(point, sources, 1e-5)!;
    expect(relativeVectorError(gradient, field)).toBeLessThan(1e-9);
  });

  it('returns an explicit undefined result inside a singular disk', () => {
    const point = { x: DEFAULT_SINGULARITY_RADIUS * .5, y: 0 };
    expect(electricFieldAt(point, [positive])).toMatchObject({ vector: null, magnitude: null, singularSourceId: 'positive' });
    expect(electricPotentialAt(point, [positive])).toMatchObject({ value: null, singularSourceId: 'positive' });
  });
});
