import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/brand/Logo';
import { GoogleIcon } from '@/components/icons';
import { AppText, Bubble, ChunkyButton } from '@/components/ui';
import { nativeProviders } from '@/features/auth/providers';
import { useSession } from '@/features/auth';
import { colors, palette, radii, spacing } from '@/theme';

export default function SignInScreen() {
  const busy = useSession((s) => s.busy);
  const error = useSession((s) => s.error);
  const signInWithApple = useSession((s) => s.signInWithApple);
  const signInWithGoogle = useSession((s) => s.signInWithGoogle);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const googleAvailable = nativeProviders.google.isConfigured();

  useEffect(() => {
    nativeProviders.apple.isAvailable().then(setAppleAvailable, () => setAppleAvailable(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <Bubble style={styles.bubble}>
          {'Welcome to Coral! Sign in to keep your streak safe on every device.'}
        </Bubble>
        <Logo size={120} />
      </View>

      <View style={styles.actions}>
        {appleAvailable && (
          // Apple requires its own button for Sign in with Apple (HIG).
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radii.lg}
            style={styles.apple}
            onPress={() => {
              if (!busy) void signInWithApple();
            }}
          />
        )}
        {googleAvailable && (
          <ChunkyButton
            variant="outline"
            tone="grey"
            disabled={busy}
            onPress={() => void signInWithGoogle()}
            accessibilityLabel="Continue with Google"
          >
            <View style={styles.googleRow}>
              <GoogleIcon size={20} />
              <AppText variant="bodyStrong">Continue with Google</AppText>
            </View>
          </ChunkyButton>
        )}
        {!appleAvailable && !googleAvailable && (
          <AppText variant="label" align="center" color={colors.inkMuted}>
            Sign-in providers are not configured for this build. See docs/auth.md.
          </AppText>
        )}
        {busy && <ActivityIndicator color={palette.coral.base} />}
        {error && (
          <AppText
            variant="label"
            align="center"
            color={palette.coral.dark}
            accessibilityRole="alert"
          >
            {error}
          </AppText>
        )}
        <AppText variant="caption" align="center" color={colors.inkMuted} style={styles.legal}>
          By continuing you agree to the Terms and Privacy Policy.
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  bubble: { maxWidth: 320 },
  actions: { gap: spacing.md, paddingBottom: spacing.xl },
  apple: { height: 54, width: '100%' },
  googleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legal: { textTransform: 'none', letterSpacing: 0, marginTop: spacing.sm },
});
