import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useDrinks } from './index';

/** Push pending changes and refresh today's logs on mount and every foreground. */
export function useDrinkSync(today: string): void {
  useEffect(() => {
    const run = () => {
      const { sync, pullDay } = useDrinks.getState();
      void sync()
        .then(() => pullDay(today))
        .catch(() => {}); // offline: local data stays usable; next foreground retries
    };
    run();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && run());
    return () => sub.remove();
  }, [today]);
}
