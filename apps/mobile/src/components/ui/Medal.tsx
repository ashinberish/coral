import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, lip, palette, spacing, type Tone } from '@/theme';

import { AppText } from './AppText';

export type MedalProps = {
  tone: Tone;
  /** Icon or short text (e.g. "7") shown on the medal face. */
  children: ReactNode;
  label?: string;
  locked?: boolean;
  size?: number;
};

/** A collectible badge: round face, translucent rim, solid lip. */
export function Medal({ tone, children, label, locked = false, size = 66 }: MedalProps) {
  const swatch = locked ? palette.grey : palette[tone];
  return (
    <View
      style={styles.cell}
      accessible
      accessibilityLabel={label ? `${label}${locked ? ', locked' : ''}` : undefined}
    >
      <View
        style={{
          width: size,
          height: size + lip.medal,
          borderRadius: size / 2,
          backgroundColor: swatch.dark,
        }}
      >
        <View
          style={[
            styles.medal,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: swatch.base,
              borderColor: locked ? palette.grey.light : 'rgba(255,255,255,0.55)',
            },
          ]}
        >
          {typeof children === 'string' ? (
            <AppText variant="title" color={locked ? colors.inkDisabled : colors.white}>
              {children}
            </AppText>
          ) : (
            children
          )}
        </View>
      </View>
      {label ? (
        <AppText
          variant="label"
          align="center"
          color={locked ? colors.inkDisabled : colors.ink}
          style={styles.label}
        >
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { alignItems: 'center' },
  medal: { alignItems: 'center', justifyContent: 'center', borderWidth: 4 },
  label: { marginTop: spacing.sm },
});
