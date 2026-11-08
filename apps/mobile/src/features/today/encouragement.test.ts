import { encouragement } from './encouragement';

describe('encouragement', () => {
  const goal = 2500;
  it.each([
    [0, "Let's start the day with a glass!"],
    [500, 'Nice start! 2,000 ml to go.'],
    [1700, "Only 800 ml to go. We've got this!"],
    [2200, 'Almost there: just 300 ml left!'],
    [2500, 'Ring closed! Amazing work today.'],
    [3000, 'Ring closed! Amazing work today.'],
  ])('%p ml → %p', (total, expected) => {
    expect(encouragement(total, goal)).toBe(expected);
  });
});
