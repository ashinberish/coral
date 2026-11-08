import { StyleSheet, View } from 'react-native';

import { BottleIcon, CupIcon, GlassIcon, PlusIcon } from '@/components/icons';
import { AppText, ChunkyButton } from '@/components/ui';
import { colors, spacing } from '@/theme';

import type { QuickAddSize } from './quickAdds';

const ICONS = { cup: CupIcon, glass: GlassIcon, bottle: BottleIcon } as const;

export type QuickAddGridProps = {
  sizes: QuickAddSize[];
  onAdd: (ml: number) => void;
  onCustom: () => void;
};

export function QuickAddGrid({ sizes, onAdd, onCustom }: QuickAddGridProps) {
  return (
    <View style={styles.grid}>
      {sizes.map((size) => {
        const Icon = ICONS[size.kind];
        return (
          <ChunkyButton
            key={size.ml}
            tone="blue"
            onPress={() => onAdd(size.ml)}
            accessibilityLabel={`Add ${size.ml} millilitres (${size.label})`}
            style={styles.cell}
            contentStyle={styles.content}
          >
            <Icon size={22} />
            <AppText variant="bodyStrong" color={colors.white}>
              {String(size.ml)}
            </AppText>
            <AppText variant="caption" color={colors.white} style={styles.sub}>
              {size.label}
            </AppText>
          </ChunkyButton>
        );
      })}
      <ChunkyButton
        tone="coral"
        onPress={onCustom}
        accessibilityLabel="Add a custom amount"
        style={styles.cell}
        contentStyle={styles.content}
      >
        <PlusIcon size={22} />
        <AppText variant="bodyStrong" color={colors.white}>
          Add
        </AppText>
        <AppText variant="caption" color={colors.white} style={styles.sub}>
          Custom
        </AppText>
      </ChunkyButton>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1 },
  content: { paddingHorizontal: 0, paddingVertical: spacing.sm, gap: 1 },
  sub: { fontSize: 10, opacity: 0.9 },
});
