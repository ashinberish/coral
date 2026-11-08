import Storage from 'expo-sqlite/kv-store';
import type { StateStorage } from 'zustand/middleware';

/** Native: SQLite-backed key-value store (survives restarts, no size limits of the keychain). */
export const persistStorage: StateStorage = Storage;
