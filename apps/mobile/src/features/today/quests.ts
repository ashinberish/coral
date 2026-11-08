import type { DrinkLog } from '@/features/drinks/store';

export type Quest = { id: string; title: string; progress: number; target: number };

/** Daily quests derived from today's logs (rewards arrive with pearls in M4). */
export function dailyQuests(logs: DrinkLog[]): Quest[] {
  const early = logs.some((log) => new Date(log.loggedAt).getHours() < 10);
  return [
    { id: 'log-5', title: 'Log 5 drinks', progress: Math.min(logs.length, 5), target: 5 },
    { id: 'early', title: 'A glass before 10 AM', progress: early ? 1 : 0, target: 1 },
  ];
}
