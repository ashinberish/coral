import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { palette, spacing, type Tone } from '@/theme';

import { AppText } from './AppText';

export type StatPillProps = {
  icon: ReactNode;
  value: number | string;
  tone: Tone;
  accessibilityLabel: string;
};

/** Icon + bold number, used in the top bar (streak, freezes, pearls). */
export function StatPill({ icon, value, tone, accessibilityLabel }: StatPillProps) {
  return (
    <View style={styles.pill} accessible accessibilityLabel={accessibilityLabel}>
      {icon}
      <AppText variant="heading" color={palette[tone].base}>
        {String(value)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 1 },
});
