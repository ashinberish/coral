import { formatMl, formatNumber, percentOf } from './format';

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1700, '1,700'],
    [2500000, '2,500,000'],
    [-1234, '-1,234'],
    [1699.6, '1,700'],
  ])('%p → %p', (input, expected) => {
    expect(formatNumber(input)).toBe(expected);
  });
});

describe('formatMl', () => {
  it('appends the unit', () => expect(formatMl(2500)).toBe('2,500 ml'));
});

describe('percentOf', () => {
  it('floors so 99.9% never shows as 100%', () => expect(percentOf(2499, 2500)).toBe(99));
  it('can exceed 100', () => expect(percentOf(2550, 2500)).toBe(102));
  it('guards a zero goal', () => expect(percentOf(100, 0)).toBe(0));
});
