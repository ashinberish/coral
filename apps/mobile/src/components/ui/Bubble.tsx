import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { borderWidth, colors, radii, spacing } from '@/theme';

import { AppText } from './AppText';

export type BubbleProps = {
  children: ReactNode;
  /** Side the tail points to (towards the speaker). */
  tail?: 'left' | 'bottom';
  style?: StyleProp<ViewStyle>;
};

const TAIL = 9;

/** Speech bubble used for encouraging, conversational copy. */
export function Bubble({ children, tail = 'bottom', style }: BubbleProps) {
  return (
    <View style={[styles.bubble, style]} accessibilityRole="text">
      {typeof children === 'string' ? (
        <AppText variant="bodyStrong" align={tail === 'bottom' ? 'center' : 'left'}>
          {children}
        </AppText>
      ) : (
        children
      )}
      <View style={[styles.tailOuter, tail === 'left' ? styles.tailLeft : styles.tailBottom]}>
        <View style={styles.tailInner} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md - 2,
  },
  // A rotated square, bordered on two sides, reads as a tail continuous with the outline.
  tailOuter: {
    position: 'absolute',
    width: TAIL * 2,
    height: TAIL * 2,
    backgroundColor: colors.white,
    borderColor: colors.line,
    transform: [{ rotate: '45deg' }],
  },
  tailBottom: {
    bottom: -TAIL - 1,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -TAIL,
    borderRightWidth: borderWidth,
    borderBottomWidth: borderWidth,
  },
  tailLeft: {
    left: -TAIL - 1,
    top: '50%',
    marginTop: -TAIL,
    borderLeftWidth: borderWidth,
    borderBottomWidth: borderWidth,
  },
  tailInner: { flex: 1 },
});
