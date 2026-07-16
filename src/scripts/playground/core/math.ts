export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const degrees = (radians: number) => radians * 180 / Math.PI;
export const radians = (degreesValue: number) => degreesValue * Math.PI / 180;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function seededRandom(seed = 20260716) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function safeNumber(value: number, fallback = 0, limit = 1e6) {
  return Number.isFinite(value) && Math.abs(value) <= limit ? value : fallback;
}
