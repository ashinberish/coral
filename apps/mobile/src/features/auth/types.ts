import type { UserRead } from '@coral/api-client';

export type AppleCredential = {
  idToken: string;
  rawNonce: string;
  givenName: string | null;
  familyName: string | null;
};

/** Provider SDK wrappers. They return null when the user cancels. */
export type IdentityProviders = {
  apple: { isAvailable: () => Promise<boolean>; signIn: () => Promise<AppleCredential | null> };
  google: {
    isConfigured: () => boolean;
    signIn: () => Promise<string | null>;
    signOut: () => Promise<void>;
  };
};

export type TokenStorage = {
  getRefreshToken: () => Promise<string | null>;
  setRefreshToken: (token: string) => Promise<void>;
  getCachedUser: () => Promise<UserRead | null>;
  setCachedUser: (user: UserRead) => Promise<void>;
  clear: () => Promise<void>;
};

export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';
