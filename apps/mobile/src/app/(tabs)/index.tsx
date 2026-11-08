import { StyleSheet, View } from 'react-native';

import { FlameIcon, FreezeIcon, PearlIcon } from '@/components/icons';
import { AppText, Bubble, Ring, Screen, StatPill } from '@/components/ui';
import { demoToday } from '@/features/today/demo';
import { encouragement } from '@/features/today/encouragement';
import { QuestList } from '@/features/today/QuestList';
import { QuickAddGrid } from '@/features/today/QuickAddGrid';
import { haptics } from '@/lib/haptics';
import { formatNumber, percentOf } from '@/lib/format';
import { colors, palette, spacing } from '@/theme';

export default function TodayScreen() {
  const { streak, freezes, pearls, totalMl, goalMl, quickAdds, quests } = demoToday;
  const percent = percentOf(totalMl, goalMl);

  return (
    <Screen>
      <View style={styles.topBar}>
        <StatPill
          tone="orange"
          icon={<FlameIcon size={24} />}
          value={streak}
          accessibilityLabel={`${streak} day streak`}
        />
        <StatPill
          tone="blue"
          icon={<FreezeIcon size={22} />}
          value={freezes}
          accessibilityLabel={`${freezes} streak freeze`}
        />
        <StatPill
          tone="purple"
          icon={<PearlIcon size={22} />}
          value={pearls}
          accessibilityLabel={`${pearls} pearls`}
        />
      </View>

      <View style={styles.ringWrap}>
        <Ring
          progress={totalMl / goalMl}
          accessibilityLabel={`${formatNumber(totalMl)} of ${formatNumber(goalMl)} millilitres`}
        >
          <AppText variant="caption" color={palette.coral.base}>
            {`${percent}%`}
          </AppText>
          <AppText variant="display">{formatNumber(totalMl)}</AppText>
          <AppText variant="label" color={colors.inkMuted}>
            {`of ${formatNumber(goalMl)} ml`}
          </AppText>
        </Ring>
      </View>

      <Bubble style={styles.bubble}>{encouragement(totalMl, goalMl)}</Bubble>

      {/* Logging is wired to storage in M2; for now buttons give press + haptic feedback. */}
      <QuickAddGrid sizes={quickAdds} onAdd={() => haptics.success()} onCustom={() => {}} />

      <QuestList quests={quests} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
  },
  ringWrap: { alignItems: 'center' },
  bubble: { marginHorizontal: spacing.lg, marginBottom: spacing.xs },
});
