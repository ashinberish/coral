export type QuickAddSize = { ml: number; label: string; kind: 'cup' | 'glass' | 'bottle' };

/** Default quick-add sizes (customisable in Settings, M6). */
export const QUICK_ADDS: QuickAddSize[] = [
  { ml: 150, label: 'Cup', kind: 'cup' },
  { ml: 250, label: 'Glass', kind: 'glass' },
  { ml: 500, label: 'Bottle', kind: 'bottle' },
];
