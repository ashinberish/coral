import { fireEvent, render, screen } from '@testing-library/react-native';

import { ChunkyButton } from './ChunkyButton';

describe('ChunkyButton', () => {
  it('renders its label as an accessible button and fires onPress', async () => {
    const onPress = jest.fn();
    await render(<ChunkyButton onPress={onPress}>Continue</ChunkyButton>);

    const button = screen.getByRole('button');
    expect(screen.getByText('Continue')).toBeTruthy();
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled and exposes the disabled state', async () => {
    const onPress = jest.fn();
    await render(
      <ChunkyButton onPress={onPress} disabled>
        Continue
      </ChunkyButton>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
