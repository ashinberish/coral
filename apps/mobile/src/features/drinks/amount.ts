export const AMOUNT_STEP = 50;
export const AMOUNT_MIN = 50;
export const AMOUNT_MAX = 2000;

/** Snap a custom amount to the 50 ml grid within the allowed range. */
export function clampAmount(ml: number): number {
  return Math.min(AMOUNT_MAX, Math.max(AMOUNT_MIN, Math.round(ml / AMOUNT_STEP) * AMOUNT_STEP));
}
