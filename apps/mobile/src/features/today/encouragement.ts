import { formatMl } from '@/lib/format';

/** Friendly status line shown in the speech bubble under the ring. */
export function encouragement(totalMl: number, goalMl: number): string {
  const remaining = goalMl - totalMl;
  if (totalMl <= 0) return "Let's start the day with a glass!";
  if (remaining <= 0) return 'Ring closed! Amazing work today.';
  if (remaining <= goalMl * 0.15) return `Almost there: just ${formatMl(remaining)} left!`;
  if (totalMl >= goalMl / 2) return `Only ${formatMl(remaining)} to go. We've got this!`;
  return `Nice start! ${formatMl(remaining)} to go.`;
}
