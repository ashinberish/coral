import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { colors, motion, palette, type Tone } from '@/theme';

export type ProgressBarProps = {
  /** 0..1 (clamped). */
  progress: number;
  tone?: Tone;
  height?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(1, Math.max(0, progress));
}

/** Rounded progress bar with a glossy highlight stripe. */
export function ProgressBar({
  progress,
  tone = 'gold',
  height = 14,
  style,
  accessibilityLabel,
}: ProgressBarProps) {
  const value = clampProgress(progress);
  const fill = useSharedValue(value);
  useEffect(() => {
    fill.value = withSpring(value, motion.fill);
  }, [fill, value]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={[styles.track, { height, borderRadius: height / 2 }, style]}
    >
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: palette[tone].base, borderRadius: height / 2 },
          fillStyle,
        ]}
      >
        {value > 0.08 && <View style={[styles.shine, { top: height * 0.22 }]} />}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%' },
  shine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
