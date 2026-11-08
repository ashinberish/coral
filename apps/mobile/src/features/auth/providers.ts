import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { config } from '@/lib/config';

import type { IdentityProviders } from './types';

function randomNonce(): string {
  return Array.from(Crypto.getRandomBytes(32), (b) => b.toString(16).padStart(2, '0')).join('');
}

let googleConfigured = false;
function ensureGoogleConfigured(): boolean {
  if (!config.googleWebClientId) return false;
  if (!googleConfigured) {
    // The *web* client ID is the ID token's audience, which the API verifies.
    GoogleSignin.configure({
      webClientId: config.googleWebClientId,
      iosClientId: config.googleIosClientId,
    });
    googleConfigured = true;
  }
  return true;
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
    isConfigured: () => Boolean(config.googleWebClientId) && Platform.OS !== 'web',
    async signIn() {
      if (!ensureGoogleConfigured()) throw new Error('Google sign-in is not configured');
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
      if (googleConfigured) await GoogleSignin.signOut().catch(() => null);
    },
  },
};
