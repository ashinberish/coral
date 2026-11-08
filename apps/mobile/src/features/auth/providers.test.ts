/**
 * Regression: Expo Go (and Jest) don't include the RNGoogleSignin native module. Importing the
 * providers must not crash the app; Google sign-in is simply reported as unavailable.
 */
import { nativeProviders } from './providers';

// Jest has no native Apple button; Expo Go does. This test is about Google only.
jest.mock('expo-apple-authentication', () => ({ isAvailableAsync: async () => false }));

describe('nativeProviders without the Google native module', () => {
  it('imports and hides Google sign-in', () => {
    expect(nativeProviders.google.isConfigured()).toBe(false);
  });

  it('rejects a Google sign-in attempt instead of crashing', async () => {
    await expect(nativeProviders.google.signIn()).rejects.toThrow('not available in this build');
  });

  it('signs out of Google as a no-op', async () => {
    await expect(nativeProviders.google.signOut()).resolves.toBeUndefined();
  });
});
