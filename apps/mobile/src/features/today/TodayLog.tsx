import { Pressable, StyleSheet, View } from 'react-native';

import { CloseIcon, CupIcon, GlassIcon } from '@/components/icons';
import { AppText, Tile } from '@/components/ui';
import type { DrinkLog } from '@/features/drinks/store';
import { formatTime } from '@/lib/dates';
import { formatMl } from '@/lib/format';
import { colors, palette, spacing } from '@/theme';

const LABEL = { water: 'Water', tea: 'Tea', coffee: 'Coffee', other: 'Other' } as const;
const TONE = { water: 'blue', tea: 'green', coffee: 'orange', other: 'purple' } as const;

export function TodayLog({ logs, onDelete }: { logs: DrinkLog[]; onDelete: (id: string) => void }) {
  if (logs.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <AppText variant="heading">Today&apos;s drinks</AppText>
      <Tile>
        {[...logs].reverse().map((log, index) => {
          const tone = palette[TONE[log.drinkType]];
          const Icon = log.drinkType === 'water' ? GlassIcon : CupIcon;
          return (
            <View key={log.id} style={[styles.row, index > 0 && styles.divider]}>
              <View style={[styles.icon, { backgroundColor: tone.base }]}>
                <Icon size={18} />
              </View>
              <View style={styles.grow}>
                <AppText variant="bodyStrong">{LABEL[log.drinkType]}</AppText>
                <AppText variant="label" color={colors.inkMuted}>
                  {formatTime(log.loggedAt)}
                  {log.sync === 'pending' ? ' · not synced yet' : ''}
                </AppText>
              </View>
              <AppText variant="bodyStrong">{formatMl(log.amountMl)}</AppText>
              <Pressable
                onPress={() => onDelete(log.id)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${formatMl(log.amountMl)} ${LABEL[log.drinkType]}`}
              >
                <CloseIcon size={18} />
              </Pressable>
            </View>
          );
        })}
      </Tile>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  divider: { borderTopWidth: 2, borderTopColor: colors.line },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
});
