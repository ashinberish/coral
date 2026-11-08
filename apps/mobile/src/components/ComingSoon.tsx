import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Logo } from '@/components/brand/Logo';
import { AppText, Bubble, ChunkyButton, Screen } from '@/components/ui';
import { spacing } from '@/theme';

/** Placeholder for tabs that land in later milestones. */
export function ComingSoon({ title, message }: { title: string; message: string }) {
  return (
    <Screen contentStyle={styles.content}>
      <AppText variant="title">{title}</AppText>
      <View style={styles.row}>
        <Logo size={84} />
        <Bubble tail="left" style={styles.bubble}>
          {message}
        </Bubble>
      </View>
      <Link href="/design" asChild>
        <ChunkyButton tone="blue" variant="outline">
          Open design system
        </ChunkyButton>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  bubble: { flex: 1 },
});
