import { render, screen } from '@testing-library/react-native';

import { clampProgress, ProgressBar } from './ProgressBar';

describe('clampProgress', () => {
  it.each([
    [-1, 0],
    [0.5, 0.5],
    [1.4, 1],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
  ])('%p → %p', (input, expected) => expect(clampProgress(input)).toBe(expected));
});

describe('ProgressBar', () => {
  it('reports progress to assistive tech', async () => {
    await render(<ProgressBar progress={0.6} accessibilityLabel="Log 5 drinks" />);
    const bar = screen.getByRole('progressbar', { name: 'Log 5 drinks' });
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 60 });
  });
});
