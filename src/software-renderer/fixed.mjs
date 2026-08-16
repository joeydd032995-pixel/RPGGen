export const FP_SHIFT = 16;
export const FP_ONE = 1 << FP_SHIFT;
export const FP_HALF = FP_ONE >> 1;

export function toFixed(value) {
  if (!Number.isFinite(value)) throw new TypeError('Fixed-point input must be finite');
  const result = Math.round(value * FP_ONE);
  if (!Number.isSafeInteger(result) || result < -0x7fffffff || result > 0x7fffffff) {
    throw new RangeError('Fixed-point input exceeds signed 16.16 range');
  }
  return result;
}

export function fromFixed(value) {
  return value / FP_ONE;
}

export function mulFixed(a, b) {
  return Math.trunc((a * b) / FP_ONE);
}

export function divFixed(a, b) {
  if (b === 0) throw new RangeError('Fixed-point division by zero');
  return Math.trunc((a * FP_ONE) / b);
}

export function ceilFixed(value) {
  return Math.ceil(value / FP_ONE);
}

export function clampInt(value, minimum, maximum) {
  return value < minimum ? minimum : value > maximum ? maximum : value;
}
