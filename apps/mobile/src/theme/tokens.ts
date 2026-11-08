/**
 * Coral design tokens — single source of truth for the playful UI.
 * Mirrors docs/mockups/coral-playful.html.
 */

export const palette = {
  coral: { base: '#FF5E4D', dark: '#D9402F', light: '#FFE6E2' },
  blue: { base: '#3DA5F5', dark: '#2384D1', light: '#DDF0FF' },
  orange: { base: '#FF9F1C', dark: '#E07F00', light: '#FFF0D9' },
  gold: { base: '#FFC83D', dark: '#E3A400', light: '#FFF6DC' },
  green: { base: '#3CC46B', dark: '#26A253', light: '#DFF7E7' },
  purple: { base: '#9B6BFF', dark: '#7A4CE0', light: '#EFE7FF' },
  grey: { base: '#E8E8EE', dark: '#D5D5DE', light: '#F4F4F7' },
} as const;

export type Tone = keyof typeof palette;

export const colors = {
  brand: palette.coral.base,
  ink: '#3B3B48',
  inkMuted: '#8A8A99',
  inkDisabled: '#B5B5C2',
  line: palette.grey.base,
  background: '#FFFFFF',
  surface: palette.grey.light,
  white: '#FFFFFF',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/** Height of the solid "lip" under chunky surfaces; the face sinks by this on press. */
export const lip = {
  button: 4,
  tile: 4,
  medal: 5,
} as const;

export const borderWidth = 2;

export const fontFamily = {
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;

export const typography = {
  display: { fontFamily: fontFamily.black, fontSize: 40, lineHeight: 44 },
  title: { fontFamily: fontFamily.black, fontSize: 26, lineHeight: 32 },
  heading: { fontFamily: fontFamily.black, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fontFamily.bold, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: fontFamily.extrabold, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: fontFamily.extrabold, fontSize: 13, lineHeight: 18 },
  caption: {
    fontFamily: fontFamily.extrabold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  button: {
    fontFamily: fontFamily.black,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
} as const;

export type TypographyVariant = keyof typeof typography;

export const motion = {
  /** Critically damped press feedback — no bounce. */
  press: { damping: 40, stiffness: 900, mass: 0.6 },
  /** Ring/progress fill. */
  fill: { damping: 22, stiffness: 120 },
} as const;
