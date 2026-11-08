import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { borderWidth, colors, lip, palette, radii, type Tone } from '@/theme';

export type TileProps = {
  children: ReactNode;
  /** Highlighted (selected) tiles take a tone for border, lip and fill. */
  tone?: Tone;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** A white card with a 2px border and a solid bottom lip — the base surface. */
export function Tile({ children, tone = 'blue', selected = false, style, testID }: TileProps) {
  const swatch = palette[tone];
  return (
    <View
      testID={testID}
      style={[
        styles.tile,
        selected && {
          borderColor: swatch.base,
          borderBottomColor: swatch.base,
          backgroundColor: swatch.light,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth,
    borderBottomWidth: borderWidth + lip.tile,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
});
