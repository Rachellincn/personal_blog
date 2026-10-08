export type UnitDimension = 'charge' | 'length' | 'electricField' | 'potential' | 'energy' | 'time' | 'magneticField';

export interface UnitDefinition {
  symbol: string;
  dimension: UnitDimension;
  scale: number;
}

const UNIT_DEFINITIONS: UnitDefinition[] = [
  { symbol: 'C', dimension: 'charge', scale: 1 },
  { symbol: 'mC', dimension: 'charge', scale: 1e-3 },
  { symbol: 'µC', dimension: 'charge', scale: 1e-6 },
  { symbol: 'uC', dimension: 'charge', scale: 1e-6 },
  { symbol: 'nC', dimension: 'charge', scale: 1e-9 },
  { symbol: 'm', dimension: 'length', scale: 1 },
  { symbol: 'cm', dimension: 'length', scale: 1e-2 },
  { symbol: 'mm', dimension: 'length', scale: 1e-3 },
  { symbol: 'N/C', dimension: 'electricField', scale: 1 },
  { symbol: 'V/m', dimension: 'electricField', scale: 1 },
  { symbol: 'V', dimension: 'potential', scale: 1 },
  { symbol: 'mV', dimension: 'potential', scale: 1e-3 },
  { symbol: 'J', dimension: 'energy', scale: 1 },
  { symbol: 'mJ', dimension: 'energy', scale: 1e-3 },
  { symbol: 'µJ', dimension: 'energy', scale: 1e-6 },
  { symbol: 'uJ', dimension: 'energy', scale: 1e-6 },
  { symbol: 's', dimension: 'time', scale: 1 },
  { symbol: 'ms', dimension: 'time', scale: 1e-3 },
  { symbol: 'µs', dimension: 'time', scale: 1e-6 },
  { symbol: 'us', dimension: 'time', scale: 1e-6 },
  { symbol: 'ns', dimension: 'time', scale: 1e-9 },
  { symbol: 'T', dimension: 'magneticField', scale: 1 },
  { symbol: 'mT', dimension: 'magneticField', scale: 1e-3 },
  { symbol: 'µT', dimension: 'magneticField', scale: 1e-6 },
  { symbol: 'uT', dimension: 'magneticField', scale: 1e-6 },
];

const UNIT_MAP = new Map(UNIT_DEFINITIONS.map((definition) => [definition.symbol, definition]));

export function toSI(value: number, unit: string, expected?: UnitDimension) {
  const definition = UNIT_MAP.get(unit);
  if (!definition || (expected && definition.dimension !== expected)) throw new Error(`Unsupported ${expected ?? ''} unit: ${unit}`.trim());
  if (!Number.isFinite(value)) throw new Error('A finite numeric value is required.');
  return value * definition.scale;
}

export function fromSI(value: number, unit: string, expected?: UnitDimension) {
  const definition = UNIT_MAP.get(unit);
  if (!definition || (expected && definition.dimension !== expected)) throw new Error(`Unsupported ${expected ?? ''} unit: ${unit}`.trim());
  return value / definition.scale;
}

export function parseQuantity(input: string, expected: UnitDimension) {
  const match = input.trim().replace(/μ/g, 'µ').match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*([^\s]+)$/i);
  if (!match) throw new Error('Enter a number followed by a supported unit.');
  const value = Number(match[1]);
  const unit = match[2];
  return toSI(value, unit, expected);
}

export function formatQuantity(valueSI: number, dimension: UnitDimension, significantDigits = 3) {
  if (!Number.isFinite(valueSI)) return '—';
  const choices = UNIT_DEFINITIONS.filter((definition) => definition.dimension === dimension && !definition.symbol.startsWith('u'));
  const nonZero = Math.abs(valueSI);
  const best = [...choices].sort((a, b) => b.scale - a.scale).find((choice) => nonZero >= choice.scale * .1) ?? choices.at(-1)!;
  return `${formatSignificant(valueSI / best.scale, significantDigits)} ${best.symbol}`;
}

export function formatScientific(value: number, significantDigits = 3) {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / 10 ** exponent;
  return `${formatSignificant(mantissa, significantDigits)}×10^${exponent}`;
}

function formatSignificant(value: number, significantDigits: number) {
  if (value === 0) return '0';
  const decimals = Math.max(0, significantDigits - 1 - Math.floor(Math.log10(Math.abs(value))));
  return value.toFixed(Math.min(8, decimals)).replace(/\.?0+$/, '');
}
