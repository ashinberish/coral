/**
 * Coral's 3D app mark: a white seahorse lifted off a lit coral tile.
 * The ONLY place gradients are used in the product (see docs/PLAN.md).
 * Geometry is shared with assets/brand/icon.svg (used to render the store icons).
 */
import { useId } from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

type GlyphPaint = { fill: string; eye: string };

/** Seahorse glyph in a 64×64 box. */
function Glyph({ fill, eye }: GlyphPaint) {
  return (
    <G>
      <Path
        d="M27 22 C38 25 41 36 35 44"
        fill="none"
        stroke={fill}
        strokeWidth={11}
        strokeLinecap="round"
      />
      <Path
        d="M35 44 C31 50 29 56 35 58 C40 59.5 42 54 38.5 52"
        fill="none"
        stroke={fill}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <Circle cx={29} cy={17} r={9.5} fill={fill} />
      <Path d="M33 13.5 L44 15.5 Q47 16 47 19 Q47 22 44 22 L33 23Z" fill={fill} />
      <Path d="M24 9.5 L26 4.5 L29.5 8 L32 4 L33.5 9.5Z" fill={fill} />
      <Path d="M35 27 L21 29 Q20 36 34 42Z" fill={fill} />
      <Circle cx={31} cy={16} r={2.3} fill={eye} />
    </G>
  );
}

export type LogoProps = {
  size?: number;
  /** `tile` = full rounded app-icon tile; `glyph` = seahorse only (for coloured backgrounds). */
  variant?: 'tile' | 'glyph';
  accessibilityLabel?: string;
};

export function Logo({ size = 96, variant = 'tile', accessibilityLabel = 'Coral' }: LogoProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const bg = `bg${id}`;
  const sea = `sea${id}`;
  const gloss = `gloss${id}`;
  const clip = `clip${id}`;

  const glyph = (
    // 64-unit glyph placed in the 120-unit tile (scale 1.5, nudged to optical centre)
    <G transform="translate(9 12) scale(1.5)">
      {/* extrusion + soft contact shadow give the lifted, 3D feel */}
      <G transform="translate(0 3.4)" opacity={0.18}>
        <Glyph fill="#8E1D10" eye="#8E1D10" />
      </G>
      <G transform="translate(0 2.2)">
        <Glyph fill="#C8352A" eye="#C8352A" />
      </G>
      <Glyph fill={`url(#${sea})`} eye="#E8483A" />
    </G>
  );

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Defs>
        <LinearGradient id={bg} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FF8A6E" />
          <Stop offset="0.55" stopColor="#FF5E4D" />
          <Stop offset="1" stopColor="#F0402F" />
        </LinearGradient>
        <LinearGradient id={sea} x1="0" y1="4" x2="0" y2="60" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#FFE0D8" />
        </LinearGradient>
        <LinearGradient id={gloss} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.38} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
        <ClipPath id={clip}>
          <Rect width={120} height={120} rx={27} />
        </ClipPath>
      </Defs>
      {variant === 'tile' && (
        <G clipPath={`url(#${clip})`}>
          <Rect width={120} height={120} fill={`url(#${bg})`} />
          <Ellipse cx={60} cy={-6} rx={86} ry={58} fill={`url(#${gloss})`} />
          <Rect y={116} width={120} height={4} fill="#C9301F" opacity={0.35} />
        </G>
      )}
      {glyph}
    </Svg>
  );
}
