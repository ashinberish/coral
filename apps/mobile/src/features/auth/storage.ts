import type { UserRead } from '@coral/api-client';
import * as SecureStore from 'expo-secure-store';

import type { TokenStorage } from './types';

const REFRESH_KEY = 'coral.refresh_token';
const USER_KEY = 'coral.user';
// Available after the first unlock so background refreshes (e.g. notification actions) work.
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

/** Refresh token + a small cached profile in the OS keychain/keystore. */
export const secureTokenStorage: TokenStorage = {
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_KEY, OPTIONS),
  setRefreshToken: (token) => SecureStore.setItemAsync(REFRESH_KEY, token, OPTIONS),
  async getCachedUser() {
    const raw = await SecureStore.getItemAsync(USER_KEY, OPTIONS);
    try {
      return raw ? (JSON.parse(raw) as UserRead) : null;
    } catch {
      return null;
    }
  },
  setCachedUser: (user) => SecureStore.setItemAsync(USER_KEY, JSON.stringify(user), OPTIONS),
  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(REFRESH_KEY, OPTIONS),
      SecureStore.deleteItemAsync(USER_KEY, OPTIONS),
    ]);
  },
};
