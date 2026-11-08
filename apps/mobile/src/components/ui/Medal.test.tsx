import { render, screen } from '@testing-library/react-native';

import { Medal } from './Medal';

describe('Medal', () => {
  it('announces locked medals', async () => {
    await render(
      <Medal tone="orange" label="30-Day Streak" locked>
        30
      </Medal>,
    );
    expect(screen.getByLabelText('30-Day Streak, locked')).toBeTruthy();
  });
});
