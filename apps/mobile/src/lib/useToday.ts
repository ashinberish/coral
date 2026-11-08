import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { dayKey } from './dates';

/** Today's day key; updates when the app returns to the foreground or midnight passes. */
export function useToday(): string {
  const [today, setToday] = useState(dayKey);
  useEffect(() => {
    const refresh = () => setToday(dayKey());
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    const timer = setInterval(refresh, 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);
  return today;
}
