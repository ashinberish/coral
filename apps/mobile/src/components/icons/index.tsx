/**
 * Coral icon set (react-native-svg). Flat, rounded, no water-drop shapes by design (the flame core is the one teardrop-like form, per the brand flame).
 * Multi-colour icons have fixed brand colours; mono icons take `color`.
 */
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { palette } from '@/theme';

export type IconProps = { size?: number; color?: string };

const FLAME_OUTLINE =
  'M22 40 C22 33 26 28 31 28 C34 28 36 31 38 33 C40 26 45 18 51 18 C56 18 60 24 64 30 L76 48 C80 54 82 58 82 64 C82 81 68 92 51 92 C34 92 20 80 20 64 C20 55 21 47 22 40Z';
const FLAME_CORE =
  'M50 46 C56 54 64 62 64 70 C64 79 58 84 50 84 C42 84 36 79 36 70 C36 62 44 54 50 46Z';

const FLAME_VARIANTS = {
  /** On white/light surfaces. */
  default: { stroke: palette.orange.base, fill: palette.orange.light, core: palette.gold.base },
  /** On orange (or other coloured) surfaces, e.g. streak badges. */
  onColor: { stroke: '#FFFFFF', fill: 'none', core: palette.gold.base },
  /** Inactive / not-yet-earned. */
  muted: { stroke: palette.grey.dark, fill: palette.grey.light, core: palette.grey.base },
} as const;

/** The streak flame: thick rounded outline with a golden core. */
export function FlameIcon({
  size = 24,
  variant = 'default',
}: IconProps & { variant?: keyof typeof FLAME_VARIANTS }) {
  const v = FLAME_VARIANTS[variant];
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d={FLAME_OUTLINE}
        fill={v.fill}
        stroke={v.stroke}
        strokeWidth={11}
        strokeLinejoin="round"
      />
      <Path d={FLAME_CORE} fill={v.core} />
    </Svg>
  );
}

export function FreezeIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={3} width={18} height={18} rx={5} fill={palette.blue.base} />
      <G stroke="#fff" strokeWidth={2} strokeLinecap="round">
        <Path d="M12 6.5v11M7.2 9.2l9.6 5.6M7.2 14.8l9.6-5.6" />
      </G>
    </Svg>
  );
}

export function PearlIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} fill={palette.purple.base} />
      <Circle cx={12} cy={12} r={9} fill="none" stroke={palette.purple.dark} strokeWidth={2} />
      <Ellipse
        cx={9}
        cy={8.5}
        rx={3}
        ry={2}
        fill="#fff"
        opacity={0.75}
        rotation={-30}
        origin="9, 8.5"
      />
    </Svg>
  );
}

export function ChestIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={9} width={18} height={12} rx={3} fill={palette.orange.base} />
      <Path d="M3 11 Q3 4 12 4 Q21 4 21 11Z" fill={palette.orange.dark} />
      <Rect x={3} y={10} width={18} height={3} fill={palette.gold.base} />
      <Rect x={10} y={10} width={4} height={6} rx={1.5} fill="#fff" />
    </Svg>
  );
}

export function HomeIcon({ size = 24, color = palette.coral.base }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 11 L12 4 L20 11 V19 a2 2 0 01-2 2 H6 a2 2 0 01-2-2Z" fill={color} />
      <Rect x={9.5} y={14} width={5} height={7} rx={1.5} fill="#fff" />
    </Svg>
  );
}

export function MedalIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={14} r={7} fill={palette.gold.base} />
      <Circle cx={12} cy={14} r={4.2} fill={palette.gold.dark} />
      <Path d="M7 2h4l2 5H9z" fill={palette.coral.base} />
      <Path d="M17 2h-4l-2 5h4z" fill={palette.coral.dark} />
    </Svg>
  );
}

export function BellIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={palette.gold.base}
        d="M12 2.5a1.4 1.4 0 011.4 1.4v.6a6 6 0 014.6 5.8v4.2l1.7 2.2c.4.5 0 1.3-.7 1.3H5c-.7 0-1.1-.8-.7-1.3L6 14.5v-4.2a6 6 0 014.6-5.8v-.6A1.4 1.4 0 0112 2.5z"
      />
      <Path fill={palette.gold.dark} d="M9.6 19h4.8a2.4 2.4 0 01-4.8 0z" />
    </Svg>
  );
}

export function GlassIcon({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5.5 4h13l-1.6 15.2a1.6 1.6 0 01-1.6 1.4H8.7a1.6 1.6 0 01-1.6-1.4L5.5 4z"
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <Path d="M6.6 11h10.8l-.8 7.6a1 1 0 01-1 .9H8.4a1 1 0 01-1-.9L6.6 11z" fill={color} />
    </Svg>
  );
}

export function CupIcon({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 7h12v7a5 5 0 01-5 5H9a5 5 0 01-5-5V7z" fill={color} />
      <Path d="M16 9h1.5a2.5 2.5 0 010 5H16" fill="none" stroke={color} strokeWidth={2.2} />
    </Svg>
  );
}

export function BottleIcon({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M10 2.5h4v2.2l1.4 2.1c.4.6.6 1.3.6 2V19.5a2 2 0 01-2 2h-4a2 2 0 01-2-2V8.8c0-.7.2-1.4.6-2L10 4.7V2.5z"
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <Rect x={9.6} y={11} width={4.8} height={8.6} rx={0.8} fill={color} />
    </Svg>
  );
}

export function PlusIcon({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={3.2} strokeLinecap="round" />
    </Svg>
  );
}

export function CheckIcon({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5.5 12.5l4.2 4.2L18.5 8"
        fill="none"
        stroke={color}
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CloseIcon({ size = 24, color = '#B5B5C2' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

/** Google "G" mark — used only on the Continue with Google button, per Google branding. */
export function GoogleIcon({ size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}
