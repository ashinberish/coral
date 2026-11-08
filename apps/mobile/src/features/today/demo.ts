/**
 * Static demo state for M1 (design system). Replaced by the real store in M2.
 */
export type QuickAddSize = { ml: number; label: string; kind: 'cup' | 'glass' | 'bottle' };
export type Quest = { id: string; title: string; progress: number; target: number };

export const demoToday = {
  streak: 12,
  freezes: 1,
  pearls: 240,
  totalMl: 1700,
  goalMl: 2500,
  quickAdds: [
    { ml: 150, label: 'Cup', kind: 'cup' },
    { ml: 250, label: 'Glass', kind: 'glass' },
    { ml: 500, label: 'Bottle', kind: 'bottle' },
  ] satisfies QuickAddSize[],
  quests: [
    { id: 'log-5', title: 'Log 5 drinks', progress: 3, target: 5 },
    { id: 'early', title: 'A glass before 10 AM', progress: 1, target: 1 },
  ] satisfies Quest[],
};
