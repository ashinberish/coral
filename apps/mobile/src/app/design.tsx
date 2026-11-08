import { StyleSheet, View } from 'react-native';

import { Logo } from '@/components/brand/Logo';
import {
  BellIcon,
  BottleIcon,
  CheckIcon,
  ChestIcon,
  CupIcon,
  FlameIcon,
  FreezeIcon,
  GlassIcon,
  HomeIcon,
  MedalIcon,
  PearlIcon,
} from '@/components/icons';
import {
  AppText,
  Bubble,
  ChunkyButton,
  Medal,
  ProgressBar,
  Ring,
  Screen,
  Tile,
} from '@/components/ui';
import { colors, palette, spacing, typography, type Tone, type TypographyVariant } from '@/theme';

const TONES: Tone[] = ['coral', 'blue', 'orange', 'gold', 'green', 'purple'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="heading">{title}</AppText>
      {children}
    </View>
  );
}

/** Living style guide for M1. Reachable at /design. */
export default function DesignScreen() {
  return (
    <Screen contentStyle={styles.content}>
      <Section title="Brand">
        <View style={styles.row}>
          <Logo size={96} />
          <Logo size={60} />
          <Logo size={38} />
          <View style={[styles.swatch, { backgroundColor: palette.coral.base }]}>
            <Logo size={56} variant="glyph" />
          </View>
        </View>
      </Section>

      <Section title="Palette">
        <View style={styles.row}>
          {TONES.map((tone) => (
            <View key={tone} style={styles.paletteItem}>
              <View style={[styles.chip, { backgroundColor: palette[tone].base }]} />
              <View style={[styles.chip, { backgroundColor: palette[tone].dark }]} />
              <View style={[styles.chip, { backgroundColor: palette[tone].light }]} />
              <AppText variant="caption" color={colors.inkMuted}>
                {tone}
              </AppText>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Typography">
        {(Object.keys(typography) as TypographyVariant[]).map((variant) => (
          <AppText key={variant} variant={variant}>
            {variant}
          </AppText>
        ))}
      </Section>

      <Section title="Buttons">
        <ChunkyButton>Continue</ChunkyButton>
        <View style={styles.row}>
          {TONES.slice(1).map((tone) => (
            <ChunkyButton key={tone} tone={tone} style={styles.flex}>
              Go
            </ChunkyButton>
          ))}
        </View>
        <ChunkyButton variant="outline" tone="blue">
          Outline
        </ChunkyButton>
        <ChunkyButton disabled>Disabled</ChunkyButton>
      </Section>

      <Section title="Tiles & bubbles">
        <Tile style={styles.pad}>
          <AppText variant="bodyStrong">Regular tile</AppText>
        </Tile>
        <Tile selected tone="coral" style={styles.pad}>
          <AppText variant="bodyStrong" color={palette.coral.dark}>
            Selected tile
          </AppText>
        </Tile>
        <Bubble>{"Only 800 ml to go. We've got this!"}</Bubble>
      </Section>

      <Section title="Progress">
        <ProgressBar progress={0.6} />
        <ProgressBar progress={1} tone="green" />
        <ProgressBar progress={0.93} tone="orange" />
        <View style={styles.row}>
          <Ring progress={0.68} size={110} thickness={14}>
            <AppText variant="heading">68%</AppText>
          </Ring>
          <Ring progress={1} size={110} thickness={14} tone="green">
            <CheckIcon size={36} color={palette.green.base} />
          </Ring>
        </View>
      </Section>

      <Section title="Medals">
        <View style={styles.row}>
          <Medal tone="coral" label="First Glass">
            <GlassIcon size={30} />
          </Medal>
          <Medal tone="orange" label="Streak">
            <FlameIcon size={34} variant="onColor" />
          </Medal>
          <Medal tone="green" label="Perfect">
            <CheckIcon size={30} />
          </Medal>
          <Medal tone="grey" label="30-Day" locked>
            30
          </Medal>
        </View>
      </Section>

      <Section title="Icons">
        <View style={[styles.row, styles.iconRow]}>
          <FlameIcon size={30} />
          <FlameIcon size={30} variant="muted" />
          <FreezeIcon size={30} />
          <PearlIcon size={30} />
          <ChestIcon size={30} />
          <HomeIcon size={30} />
          <MedalIcon size={30} />
          <BellIcon size={30} />
          <CupIcon size={30} color={palette.blue.base} />
          <GlassIcon size={30} color={palette.blue.base} />
          <BottleIcon size={30} color={palette.blue.base} />
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg, gap: spacing.xl },
  section: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  iconRow: { gap: spacing.lg },
  flex: { flex: 1 },
  pad: { padding: spacing.lg },
  swatch: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteItem: { alignItems: 'center', gap: 3 },
  chip: { width: 40, height: 18, borderRadius: 6 },
});
