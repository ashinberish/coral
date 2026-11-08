import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDrinkSync } from '@/features/drinks/useDrinkSync';
import { useToday } from '@/lib/useToday';

import { BellIcon, FlameIcon, HomeIcon, MedalIcon } from '@/components/icons';
import { TabBarButton } from '@/components/ui';
import { borderWidth, colors, spacing } from '@/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  useDrinkSync(useToday());
  return (
    <Tabs>
      <TabSlot />
      <TabList style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <TabTrigger name="index" href="/" asChild>
          <TabBarButton label="Today" tone="coral" icon={<HomeIcon size={28} />} />
        </TabTrigger>
        <TabTrigger name="streak" href="/streak" asChild>
          <TabBarButton label="Streak" tone="orange" icon={<FlameIcon size={28} />} />
        </TabTrigger>
        <TabTrigger name="badges" href="/badges" asChild>
          <TabBarButton label="Badges" tone="gold" icon={<MedalIcon size={28} />} />
        </TabTrigger>
        <TabTrigger name="reminders" href="/reminders" asChild>
          <TabBarButton label="Reminders" tone="gold" icon={<BellIcon size={26} />} />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderTopWidth: borderWidth,
    borderTopColor: colors.line,
    paddingTop: spacing.sm,
  },
});
