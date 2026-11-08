import type { DrinkLog } from '@/features/drinks/store';

import { dailyQuests } from './quests';

const at = (h: number): DrinkLog => ({
  id: String(h),
  amountMl: 250,
  drinkType: 'water',
  loggedAt: new Date(2026, 10, 8, h).toISOString(),
  dayKey: '2026-11-08',
  sync: 'synced',
});

describe('dailyQuests', () => {
  it('tracks drink count and an early glass', () => {
    expect(dailyQuests([])).toMatchObject([{ progress: 0 }, { progress: 0 }]);
    expect(dailyQuests([at(9), at(13)])).toMatchObject([{ progress: 2 }, { progress: 1 }]);
    expect(dailyQuests([1, 2, 3, 4, 5, 6].map((i) => at(10 + i)))[0]?.progress).toBe(5);
  });
});
