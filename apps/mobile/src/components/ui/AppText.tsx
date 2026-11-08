import { Text, type TextProps } from 'react-native';

import { colors, typography, type TypographyVariant } from '@/theme';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: string;
  align?: 'auto' | 'left' | 'center' | 'right';
};

/** The only Text component screens should use: guarantees Nunito + the type scale. */
export function AppText({
  variant = 'body',
  color = colors.ink,
  align,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[typography[variant], { color }, align ? { textAlign: align } : null, style]}
    />
  );
}
