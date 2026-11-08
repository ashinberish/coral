import { render, screen } from '@testing-library/react-native';

import TodayScreen from '@/app/(tabs)/index';

describe('Today screen (M1 demo data)', () => {
  it('shows progress, encouragement, quick adds and quests', async () => {
    await render(<TodayScreen />);

    expect(screen.getByText('1,700')).toBeTruthy();
    expect(screen.getByText('68%')).toBeTruthy();
    expect(screen.getByText("Only 800 ml to go. We've got this!")).toBeTruthy();
    expect(screen.getByLabelText('12 day streak')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add 250 millilitres (Glass)' })).toBeTruthy();
    expect(screen.getByLabelText('A glass before 10 AM: done')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: '1,700 of 2,500 millilitres' })).toBeTruthy();
  });
});
