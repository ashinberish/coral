/**
 * Jest setup for Reanimated 4 + Worklets (resolver: react-native-reanimated/jest/resolver,
 * see https://docs.swmansion.com/react-native-reanimated/docs/guides/testing/).
 *
 * The resolver swaps in Reanimated's web implementations. jest-expo defines `window`
 * but no DOM, so Reanimated's web layer believes it runs in a browser and touches
 * `matchMedia` / `document` at import time. Provide the two minimal shims it needs.
 */
const g = globalThis as unknown as { window?: Record<string, unknown>; document?: unknown };

if (g.window && typeof g.window.matchMedia !== 'function') {
  g.window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  });
}

if (typeof g.document === 'undefined') {
  // Returning a truthy element makes Reanimated skip injecting web keyframe <style> tags.
  g.document = { getElementById: () => ({}) };
}

require('react-native-reanimated').setUpTests();

// Safe-area insets are provided natively; use the library's official mock in tests.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
