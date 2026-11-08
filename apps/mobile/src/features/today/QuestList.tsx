import { StyleSheet, View } from 'react-native';

import { ChestIcon } from '@/components/icons';
import { AppText, ProgressBar, Tile } from '@/components/ui';
import { colors, palette, spacing } from '@/theme';

import type { Quest } from './quests';

export function QuestList({ quests }: { quests: Quest[] }) {
  return (
    <Tile>
      {quests.map((quest, index) => {
        const done = quest.progress >= quest.target;
        return (
          <View
            key={quest.id}
            style={[styles.row, index > 0 && styles.divider]}
            accessible
            accessibilityLabel={`${quest.title}: ${done ? 'done' : `${quest.progress} of ${quest.target}`}`}
          >
            <ChestIcon size={26} />
            <View style={styles.grow}>
              <AppText variant="label" style={styles.title}>
                {quest.title}
              </AppText>
              <ProgressBar
                progress={quest.progress / quest.target}
                tone={done ? 'green' : 'gold'}
              />
            </View>
            <AppText variant="label" color={done ? palette.green.base : colors.inkMuted}>
              {done ? 'Done' : `${quest.progress}/${quest.target}`}
            </AppText>
          </View>
        );
      })}
    </Tile>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 3,
  },
  divider: { borderTopWidth: 2, borderTopColor: colors.line },
  grow: { flex: 1 },
  title: { marginBottom: spacing.xs + 1 },
});
