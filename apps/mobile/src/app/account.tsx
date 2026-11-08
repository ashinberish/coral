import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, ChunkyButton, Screen, Tile } from '@/components/ui';
import { useSession } from '@/features/auth';
import { colors, spacing } from '@/theme';

export default function AccountScreen() {
  const user = useSession((s) => s.user);
  const signOut = useSession((s) => s.signOut);
  const deleteAccount = useSession((s) => s.deleteAccount);

  const confirmDelete = () =>
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account, streak and drink history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            deleteAccount().catch(() =>
              Alert.alert('Could not delete account', 'Check your connection and try again.'),
            ),
        },
      ],
    );

  return (
    <Screen contentStyle={styles.content}>
      <Tile style={styles.card}>
        <AppText variant="heading">{user?.display_name ?? 'Coral member'}</AppText>
        {user?.email ? (
          <AppText variant="label" color={colors.inkMuted}>
            {user.email}
          </AppText>
        ) : null}
      </Tile>
      <View style={styles.actions}>
        <ChunkyButton
          variant="outline"
          tone="blue"
          onPress={async () => {
            await signOut();
            router.dismissAll();
          }}
        >
          Sign out
        </ChunkyButton>
        <ChunkyButton tone="coral" onPress={confirmDelete}>
          Delete account
        </ChunkyButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg },
  card: { padding: spacing.lg, gap: spacing.xs },
  actions: { gap: spacing.md },
});
