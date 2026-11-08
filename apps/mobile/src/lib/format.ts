/** Group thousands with a comma, independent of the device's Intl support: 1700 → "1,700". */
export function formatNumber(value: number): string {
  const sign = value < 0 ? '-' : '';
  const digits = String(Math.round(Math.abs(value)));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** "1,700 ml" */
export function formatMl(ml: number): string {
  return `${formatNumber(ml)} ml`;
}

/** Whole percent, floored so we never show 100% before the goal is actually met. */
export function percentOf(value: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.floor((value / goal) * 100);
}
