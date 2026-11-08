import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, ChunkyButton, Screen, Tile } from '@/components/ui';
import { useDrinks, type DrinkType } from '@/features/drinks';
import { AMOUNT_STEP as STEP, clampAmount } from '@/features/drinks/amount';
import { formatMl } from '@/lib/format';
import { colors, palette, spacing } from '@/theme';

const PRESETS = [100, 200, 300, 400, 750, 1000];
const TYPES: { value: DrinkType; label: string }[] = [
  { value: 'water', label: 'Water' },
  { value: 'tea', label: 'Tea' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'other', label: 'Other' },
];

/** Custom amount + drink type sheet. */
export default function LogDrinkSheet() {
  const addDrink = useDrinks((s) => s.addDrink);
  const [amount, setAmount] = useState(350);
  const [type, setType] = useState<DrinkType>('water');

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.amountRow}>
        <ChunkyButton
          tone="blue"
          variant="outline"
          onPress={() => setAmount((a) => clampAmount(a - STEP))}
          accessibilityLabel="Decrease by 50 millilitres"
          style={styles.step}
        >
          −
        </ChunkyButton>
        <AppText variant="display" accessibilityLiveRegion="polite" style={styles.amount}>
          {formatMl(amount)}
        </AppText>
        <ChunkyButton
          tone="blue"
          variant="outline"
          onPress={() => setAmount((a) => clampAmount(a + STEP))}
          accessibilityLabel="Increase by 50 millilitres"
          style={styles.step}
        >
          +
        </ChunkyButton>
      </View>

      <View style={styles.chips}>
        {PRESETS.map((ml) => (
          <Pressable
            key={ml}
            onPress={() => setAmount(ml)}
            accessibilityRole="button"
            accessibilityState={{ selected: amount === ml }}
          >
            <Tile selected={amount === ml} tone="blue" style={styles.chip}>
              <AppText variant="label" color={amount === ml ? palette.blue.dark : colors.ink}>
                {formatMl(ml)}
              </AppText>
            </Tile>
          </Pressable>
        ))}
      </View>

      <View style={styles.types} accessibilityRole="radiogroup">
        {TYPES.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setType(t.value)}
            style={styles.typeCell}
            accessibilityRole="radio"
            accessibilityState={{ checked: type === t.value }}
          >
            <Tile selected={type === t.value} tone="coral" style={styles.typeTile}>
              <AppText
                variant="bodyStrong"
                color={type === t.value ? palette.coral.dark : colors.ink}
              >
                {t.label}
              </AppText>
            </Tile>
          </Pressable>
        ))}
      </View>

      <ChunkyButton
        onPress={() => {
          void addDrink(amount, type);
          router.back();
        }}
      >
        Add drink
      </ChunkyButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xl, gap: spacing.xl },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount: { flex: 1, textAlign: 'center' },
  step: { width: 64 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  types: { flexDirection: 'row', gap: spacing.sm },
  typeCell: { flex: 1 },
  typeTile: { alignItems: 'center', paddingVertical: spacing.md },
});
