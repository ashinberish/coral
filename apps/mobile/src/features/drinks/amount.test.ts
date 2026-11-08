import { clampAmount } from './amount';

describe('clampAmount', () => {
  it.each([
    [10, 50],
    [349, 350],
    [5000, 2000],
    [275, 300],
  ])('%p → %p', (input, expected) => expect(clampAmount(input)).toBe(expected));
});
