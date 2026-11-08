import { config } from '@/lib/config';

import { nativeProviders } from './providers';
import { createSessionStore } from './session';
import { secureTokenStorage } from './storage';

/** The app's session store. Use `useSession(selector)` in components. */
export const useSession = createSessionStore({
  apiUrl: config.apiUrl,
  storage: secureTokenStorage,
  providers: nativeProviders,
});

/** Typed API client that carries the session's tokens. */
export const api = () => useSession.getState().api;
