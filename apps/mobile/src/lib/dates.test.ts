import { dayKey } from './dates';

describe('dayKey', () => {
  it('uses the local calendar date, zero-padded', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 10, 8, 0, 0))).toBe('2026-11-08');
  });
});
