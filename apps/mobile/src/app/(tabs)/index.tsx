import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { FlameIcon, FreezeIcon, PearlIcon } from '@/components/icons';
import { AppText, Bubble, Ring, Screen, StatPill } from '@/components/ui';
import { useSession } from '@/features/auth';
import { selectDay, totalMl, useDrinks } from '@/features/drinks';
import { encouragement } from '@/features/today/encouragement';
import { QuestList } from '@/features/today/QuestList';
import { dailyQuests } from '@/features/today/quests';
import { QUICK_ADDS } from '@/features/today/quickAdds';
import { QuickAddGrid } from '@/features/today/QuickAddGrid';
import { TodayLog } from '@/features/today/TodayLog';
import { formatNumber, percentOf } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useToday } from '@/lib/useToday';
import { colors, palette, spacing } from '@/theme';

// Streak, freezes and pearls are wired in M3/M4.
const PLACEHOLDER_STATS = { streak: 0, freezes: 0, pearls: 0 };

export default function TodayScreen() {
  const today = useToday();
  const goalMl = useSession((s) => s.user?.daily_goal_ml ?? 2500);
  const allLogs = useDrinks((s) => s.logs);
  const addDrink = useDrinks((s) => s.addDrink);
  const removeDrink = useDrinks((s) => s.removeDrink);

  const logs = selectDay(allLogs, today);
  const total = totalMl(logs);
  const percent = percentOf(total, goalMl);
  const { streak, freezes, pearls } = PLACEHOLDER_STATS;

  const add = (ml: number) => {
    const closesRing = total < goalMl && total + ml >= goalMl;
    void addDrink(ml);
    if (closesRing) haptics.success();
  };

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
          accessibilityLabel={`${freezes} streak freezes`}
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
          progress={total / goalMl}
          accessibilityLabel={`${formatNumber(total)} of ${formatNumber(goalMl)} millilitres`}
        >
          <AppText variant="caption" color={palette.coral.base}>
            {`${percent}%`}
          </AppText>
          <AppText variant="display">{formatNumber(total)}</AppText>
          <AppText variant="label" color={colors.inkMuted}>
            {`of ${formatNumber(goalMl)} ml`}
          </AppText>
        </Ring>
      </View>

      <Bubble style={styles.bubble}>{encouragement(total, goalMl)}</Bubble>

      <QuickAddGrid sizes={QUICK_ADDS} onAdd={add} onCustom={() => router.push('/log')} />

      <QuestList quests={dailyQuests(logs)} />

      <TodayLog logs={logs} onDelete={(id) => void removeDrink(id)} />
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
