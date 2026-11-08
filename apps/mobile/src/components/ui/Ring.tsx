import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { colors, motion, palette, type Tone } from '@/theme';

import { clampProgress } from './ProgressBar';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type RingProps = {
  /** 0..1 (clamped); values above 1 render a closed ring. */
  progress: number;
  size?: number;
  thickness?: number;
  tone?: Tone;
  children?: ReactNode;
  accessibilityLabel?: string;
};

/** The daily goal ring. Animates with a spring from its current value. */
export function Ring({
  progress,
  size = 214,
  thickness = 22,
  tone = 'coral',
  children,
  accessibilityLabel,
}: RingProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = clampProgress(progress);

  const fill = useSharedValue(value);
  useEffect(() => {
    fill.value = withSpring(value, motion.fill);
  }, [fill, value]);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - fill.value),
  }));

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.line}
          strokeWidth={thickness}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={palette[tone].base}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
