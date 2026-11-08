import { randomUUID } from 'expo-crypto';

import { useSession } from '@/features/auth';

import { persistStorage } from './persistStorage';
import { createDrinkStore } from './store';

export * from './store';

export const useDrinks = createDrinkStore({
  api: () => useSession.getState().api,
  storage: persistStorage,
  newId: randomUUID,
});

// A different person may sign in next: never keep the previous user's drinks.
useSession.subscribe((state, previous) => {
  if (previous.status === 'signedIn' && state.status === 'signedOut') {
    useDrinks.getState().reset();
  }
});
