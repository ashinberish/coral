import type * as GoogleSignInModule from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform, TurboModuleRegistry } from 'react-native';

import { config } from '@/lib/config';

import type { IdentityProviders } from './types';

function randomNonce(): string {
  return Array.from(Crypto.getRandomBytes(32), (b) => b.toString(16).padStart(2, '0')).join('');
}

type GoogleSdk = typeof GoogleSignInModule;
let googleSdk: GoogleSdk | null | undefined;

/**
 * Google Sign-In ships native code that Expo Go doesn't include. Importing it eagerly crashes
 * the app at launch there, so load it lazily and only when its native module is registered.
 */
function loadGoogleSdk(): GoogleSdk | null {
  if (googleSdk === undefined) {
    googleSdk = TurboModuleRegistry.get('RNGoogleSignin')
      ? // eslint-disable-next-line @typescript-eslint/no-require-imports
        (require('@react-native-google-signin/google-signin') as GoogleSdk)
      : null;
  }
  return googleSdk;
}

let googleConfigured = false;
function ensureGoogleConfigured(): GoogleSdk | null {
  const sdk = loadGoogleSdk();
  if (!sdk || !config.googleWebClientId) return null;
  const { GoogleSignin } = sdk;
  if (!googleConfigured) {
    // The *web* client ID is the ID token's audience, which the API verifies.
    GoogleSignin.configure({
      webClientId: config.googleWebClientId,
      iosClientId: config.googleIosClientId,
    });
    googleConfigured = true;
  }
  return sdk;
}

export const nativeProviders: IdentityProviders = {
  apple: {
    isAvailable: async () => Platform.OS === 'ios' && AppleAuthentication.isAvailableAsync(),
    async signIn() {
      // Apple puts SHA-256(nonce) into the identity token; the API gets the raw value.
      const rawNonce = randomNonce();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );
      try {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
          nonce: hashedNonce,
        });
        if (!credential.identityToken) throw new Error('Apple did not return an identity token');
        return {
          idToken: credential.identityToken,
          rawNonce,
          givenName: credential.fullName?.givenName ?? null,
          familyName: credential.fullName?.familyName ?? null,
        };
      } catch (error) {
        if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
        throw error;
      }
    },
  },
  google: {
    // Hidden unless a web client ID is set AND the native module exists (not in Expo Go).
    isConfigured: () =>
      Boolean(config.googleWebClientId) && Platform.OS !== 'web' && loadGoogleSdk() !== null,
    async signIn() {
      const sdk = ensureGoogleConfigured();
      if (!sdk) throw new Error('Google sign-in is not available in this build');
      const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = sdk;
      try {
        if (Platform.OS === 'android') await GoogleSignin.hasPlayServices();
        const response = await GoogleSignin.signIn();
        if (!isSuccessResponse(response)) return null; // cancelled
        if (!response.data.idToken) throw new Error('Google did not return an ID token');
        return response.data.idToken;
      } catch (error) {
        if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) return null;
        throw error;
      }
    },
    async signOut() {
      const sdk = googleConfigured ? loadGoogleSdk() : null;
      if (sdk) await sdk.GoogleSignin.signOut().catch(() => null);
    },
  },
};
