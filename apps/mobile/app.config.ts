import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic config on top of app.json.
 *
 * Google Sign-In's config plugin needs the iOS OAuth client's *reversed* client ID as a URL
 * scheme. It is derived from EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID; when that is unset (CI,
 * Expo Go) the plugin is skipped and the Google button stays hidden.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const plugins = [...(config.plugins ?? [])];
  if (iosClientId) {
    const iosUrlScheme = `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`;
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme }]);
  }
  return { ...config, name: config.name ?? 'Coral', slug: config.slug ?? 'coral', plugins };
};
