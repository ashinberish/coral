import type { StateStorage } from 'zustand/middleware';

/** Web (dev preview only): localStorage — avoids expo-sqlite's WASM/COOP requirements. */
export const persistStorage: StateStorage = {
  getItem: (key) => globalThis.localStorage?.getItem(key) ?? null,
  setItem: (key, value) => globalThis.localStorage?.setItem(key, value),
  removeItem: (key) => globalThis.localStorage?.removeItem(key),
};
