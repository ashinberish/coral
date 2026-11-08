import type { TabTriggerSlotProps } from 'expo-router/ui';
import type { ComponentRef, ReactNode, Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { palette, radii, type Tone } from '@/theme';

export type TabBarButtonProps = TabTriggerSlotProps & {
  icon: ReactNode;
  label: string;
  tone: Tone;
};

/** Icon-only tab with a toned, outlined "selected" box. Used via `<TabTrigger asChild>`. */
export function TabBarButton({
  icon,
  label,
  tone,
  isFocused,
  onPress,
  ref,
  ...rest
}: TabBarButtonProps) {
  const swatch = palette[tone];
  return (
    <Pressable
      {...rest}
      // expo-router/ui types the slot ref as Ref<typeof View> (the component), while RN 0.88's
      // Pressable expects a host-instance ref; the runtime value is the same host element.
      ref={ref as unknown as Ref<ComponentRef<typeof Pressable>>}
      onPress={(e) => {
        haptics.tap();
        onPress?.(e);
      }}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!isFocused }}
      style={styles.hit}
    >
      <View
        style={[
          styles.box,
          isFocused && { borderColor: swatch.base, backgroundColor: swatch.light },
        ]}
      >
        {icon}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { flex: 1, alignItems: 'center' },
  box: {
    width: 56,
    height: 46,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
