# Coral mobile

Expo (SDK 58) app — playful, game-like UI with a 3D Apple-style icon.

| Concern | Tech |
|---|---|
| App | Expo SDK 58, React Native 0.88, React 19, TypeScript (strict) |
| Navigation | Expo Router (typed routes), custom tab bar via `expo-router/ui` |
| UI | react-native-svg, Reanimated 4, expo-haptics, Nunito (`@expo-google-fonts/nunito`) |
| Quality | ESLint (flat, `eslint-config-expo`) + Prettier, Jest 30 (`jest-expo`) + Testing Library |

## Layout

```
src/
  app/                 routes only (Expo Router)
    _layout.tsx        fonts, splash, root stack
    (tabs)/            Today · Streak · Badges · Reminders
    design.tsx         living style guide (/design)
  theme/tokens.ts      colours, spacing, radii, lip depth, type scale, motion
  components/
    ui/                design-system primitives (ChunkyButton, Tile, Bubble, Ring, …)
    icons/             SVG icon set (no water-drop shapes, by design)
    brand/Logo.tsx     3D seahorse mark
  features/<feature>/  feature components + logic (today/…)
  lib/                 small framework-free helpers (format, haptics)
assets/brand/          icon geometry; `pnpm icons` renders assets/images/*
```

Rules of thumb: screens use `AppText` (never raw `Text`) and tokens (never raw hex);
non-route code stays out of `src/app/`.

## Develop

```bash
pnpm install                       # from the repo root
pnpm --filter @coral/mobile start  # Expo dev server (press i / a / w)
```

## Checks

```bash
pnpm --filter @coral/mobile lint
pnpm --filter @coral/mobile typecheck
pnpm --filter @coral/mobile test
pnpm --filter @coral/mobile run doctor
```

## Design system

Open **/design** in the app (or the "Open design system" button on placeholder tabs) to see
every token and component. The visual reference is `docs/mockups/coral-playful.html`.

- **ChunkyButton**: solid lip; the face sinks onto it on press-in (critically damped spring)
  with a light haptic. Tones: coral, blue, orange, gold, green, purple; `outline`; disabled.
- **Tile**: white card, 2px border, 4px bottom lip; `selected` + `tone` for choices.
- **Bubble**: speech bubble (tail `bottom` or `left`).
- **ProgressBar / Ring**: spring-animated, expose progress to screen readers.
- **Medal**: collectible badge, locked state announced to assistive tech.

Gradients are used **only** in the app icon / `Logo`; everything else is flat.

## Icons

```bash
pnpm --filter @coral/mobile icons
```

Regenerates `icon.png` (1024, full-bleed), splash, Android adaptive foreground/monochrome and
favicon from `assets/brand/`.
