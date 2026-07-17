import { describe, expect, it } from 'vitest';
import { formatQuantity, fromSI, parseQuantity, toSI } from '../../src/scripts/playground/core/units';

describe('SI unit boundary', () => {
  it('converts teaching-scale inputs to SI and back', () => {
    expect(toSI(5, 'nC', 'charge')).toBe(5e-9);
    expect(toSI(12, 'cm', 'length')).toBe(.12);
    expect(fromSI(2.5e-6, 'µT', 'magneticField')).toBeCloseTo(2.5, 12);
    expect(parseQuantity('3.2 μC', 'charge')).toBe(3.2e-6);
  });

  it('formats a suitable teaching prefix without changing stored values', () => {
    expect(formatQuantity(5e-9, 'charge')).toBe('5 nC');
    expect(formatQuantity(.09, 'length')).toBe('9 cm');
  });

  it('rejects cross-dimension unit mixing', () => {
    expect(() => toSI(1, 'cm', 'charge')).toThrow(/Unsupported charge unit/);
  });
});
