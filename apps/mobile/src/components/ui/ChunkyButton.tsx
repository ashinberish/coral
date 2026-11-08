import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { colors, lip, motion, palette, radii, spacing, type Tone } from '@/theme';

import { AppText } from './AppText';

type Variant = 'solid' | 'outline';

export type ChunkyButtonProps = {
  /** Text label (rendered uppercase) or custom content. */
  children: ReactNode;
  onPress?: () => void;
  tone?: Tone;
  variant?: Variant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * The signature Coral button: a solid "lip" under the face. On press-in the face
 * sinks onto the lip (critically damped spring) with a light haptic — feedback on
 * touch-down, commit on release.
 */
export function ChunkyButton({
  children,
  onPress,
  tone = 'coral',
  variant = 'solid',
  disabled = false,
  style,
  contentStyle,
  accessibilityLabel,
  testID,
}: ChunkyButtonProps) {
  const pressed = useSharedValue(0);
  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressed.value * lip.button }],
  }));

  const swatch = disabled ? palette.grey : palette[tone];
  const solid = variant === 'solid';
  const faceColor = solid ? swatch.base : colors.white;
  const lipColor = solid ? swatch.dark : colors.line;
  const labelColor = disabled ? colors.inkDisabled : solid ? colors.white : swatch.dark;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withSpring(1, motion.press);
        haptics.tap();
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, motion.press);
      }}
      style={style}
    >
      <View style={[styles.lip, { backgroundColor: lipColor }]}>
        <Animated.View
          style={[
            styles.face,
            { backgroundColor: faceColor },
            !solid && { borderColor: colors.line, borderWidth: 2 },
            faceStyle,
            contentStyle,
          ]}
        >
          {typeof children === 'string' ? (
            <AppText variant="button" color={labelColor}>
              {children}
            </AppText>
          ) : (
            children
          )}
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lip: { borderRadius: radii.lg, paddingBottom: lip.button },
  face: {
    borderRadius: radii.lg,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
