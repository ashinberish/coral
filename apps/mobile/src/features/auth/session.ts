/**
 * Session state (zustand). Holds the access token in memory only; the refresh token and a
 * small cached profile live in secure storage. Dependencies are injected so the store is
 * testable without native modules — see `index.ts` for the app wiring.
 */
import {
  ApiError,
  createCoralClient,
  unwrap,
  type CoralClient,
  type UserRead,
  type UserUpdate,
} from '@coral/api-client';
import { create } from 'zustand';

import type { IdentityProviders, SessionStatus, TokenStorage } from './types';

export type SessionState = {
  status: SessionStatus;
  user: UserRead | null;
  accessToken: string | null;
  /** True while a provider sheet or sign-in request is in flight. */
  busy: boolean;
  error: string | null;
  api: CoralClient;

  bootstrap: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  /** Rotate the refresh token; returns the new access token or null (→ signed out). */
  refreshAccessToken: () => Promise<string | null>;
  updateProfile: (changes: UserUpdate) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
};

export type SessionDeps = {
  apiUrl: string;
  storage: TokenStorage;
  providers: IdentityProviders;
  fetch?: typeof fetch;
};

const isNetworkError = (error: unknown) => !(error instanceof ApiError);

function message(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 503) return 'Sign-in is temporarily unavailable. Please try again.';
    return 'We could not sign you in. Please try again.';
  }
  return 'No connection. Check your internet and try again.';
}

export function createSessionStore({ apiUrl, storage, providers, fetch }: SessionDeps) {
  return create<SessionState>()((set, get) => {
    const api = createCoralClient({
      baseUrl: apiUrl,
      getAccessToken: () => get().accessToken,
      refresh: () => get().refreshAccessToken(),
      fetch,
    });

    const reset = async () => {
      await storage.clear();
      set({ status: 'signedOut', user: null, accessToken: null, busy: false });
    };

    const completeSignIn = async (result: {
      access_token: string;
      refresh_token: string;
      user: UserRead;
    }) => {
      await storage.setRefreshToken(result.refresh_token);
      await storage.setCachedUser(result.user);
      set({ status: 'signedIn', user: result.user, accessToken: result.access_token, error: null });
    };

    const runSignIn = async (exchange: () => Promise<boolean>) => {
      set({ busy: true, error: null });
      try {
        await exchange();
      } catch (error) {
        set({ error: message(error) });
      } finally {
        set({ busy: false });
      }
    };

    return {
      status: 'loading',
      user: null,
      accessToken: null,
      busy: false,
      error: null,
      api,

      async bootstrap() {
        let refreshToken: string | null;
        let cached: UserRead | null;
        try {
          refreshToken = await storage.getRefreshToken();
          cached = refreshToken ? await storage.getCachedUser() : null;
        } catch {
          // Secure storage unavailable (web) or unreadable keychain: start signed out
          // rather than leaving the app stuck on the splash screen.
          set({ status: 'signedOut' });
          return;
        }
        if (!refreshToken) {
          set({ status: 'signedOut' });
          return;
        }
        // Optimistically restore the cached profile so the app opens instantly / offline.
        if (cached) set({ status: 'signedIn', user: cached });
        try {
          const token = await get().refreshAccessToken();
          if (!token) return; // refresh rejected → already signed out
          const user = unwrap(await api.GET('/v1/me'));
          await storage.setCachedUser(user);
          set({ status: 'signedIn', user });
        } catch (error) {
          if (isNetworkError(error) && cached) return; // offline: keep the cached session
          await reset();
        }
      },

      async signInWithApple() {
        await runSignIn(async () => {
          const credential = await providers.apple.signIn();
          if (!credential) return false;
          const result = unwrap(
            await api.POST('/v1/auth/apple', {
              body: {
                id_token: credential.idToken,
                nonce: credential.rawNonce,
                given_name: credential.givenName,
                family_name: credential.familyName,
              },
            }),
          );
          await completeSignIn(result);
          return true;
        });
      },

      async signInWithGoogle() {
        await runSignIn(async () => {
          const idToken = await providers.google.signIn();
          if (!idToken) return false;
          const result = unwrap(await api.POST('/v1/auth/google', { body: { id_token: idToken } }));
          await completeSignIn(result);
          return true;
        });
      },

      async refreshAccessToken() {
        const refreshToken = await storage.getRefreshToken();
        if (!refreshToken) {
          await reset();
          return null;
        }
        const result = await api.POST('/v1/auth/refresh', {
          body: { refresh_token: refreshToken },
        });
        if (result.response.status === 401) {
          await reset(); // revoked, expired or reused → sign in again
          return null;
        }
        const tokens = unwrap(result);
        await storage.setRefreshToken(tokens.refresh_token);
        set({ accessToken: tokens.access_token });
        return tokens.access_token;
      },

      async updateProfile(changes) {
        const user = unwrap(await api.PATCH('/v1/me', { body: changes }));
        await storage.setCachedUser(user);
        set({ user });
      },

      async signOut() {
        const refreshToken = await storage.getRefreshToken();
        if (refreshToken) {
          // Best effort: local sign-out must succeed even when offline.
          await api
            .POST('/v1/auth/logout', { body: { refresh_token: refreshToken } })
            .catch(() => null);
        }
        await providers.google.signOut();
        await reset();
      },

      async deleteAccount() {
        unwrap(await api.DELETE('/v1/me'));
        await providers.google.signOut();
        await reset();
      },

      clearError: () => set({ error: null }),
    };
  });
}

export type SessionStore = ReturnType<typeof createSessionStore>;
