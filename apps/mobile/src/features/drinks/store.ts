/**
 * Drink logs: written locally first (instant, works offline), then synced to the API.
 *
 * Each log gets a client UUID up front; the API's create is idempotent on that id, so a
 * sync that is retried after a timeout never duplicates a drink. Deletes are idempotent too.
 */
import { ApiError, unwrap, type CoralClient } from '@coral/api-client';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { dayKey as toDayKey } from '@/lib/dates';

export type DrinkType = 'water' | 'tea' | 'coffee' | 'other';
export type SyncState = 'pending' | 'synced' | 'deleting';

export type DrinkLog = {
  id: string;
  amountMl: number;
  drinkType: DrinkType;
  loggedAt: string; // ISO with offset
  dayKey: string; // YYYY-MM-DD, device-local
  sync: SyncState;
};

export type DrinkState = {
  logs: Record<string, DrinkLog>;
  syncing: boolean;
  addDrink: (amountMl: number, drinkType?: DrinkType, at?: Date) => Promise<DrinkLog>;
  removeDrink: (id: string) => Promise<void>;
  /** Push pending creates/deletes. Stops quietly when offline; safe to call any time. */
  sync: () => Promise<void>;
  /** Replace synced logs for a day with the server's view (keeps unsynced local changes). */
  pullDay: (dayKey: string) => Promise<void>;
  reset: () => void;
};

export type DrinkDeps = {
  api: () => CoralClient;
  storage: StateStorage;
  newId: () => string;
  /** Log ids that were rejected permanently (validation), for diagnostics. */
  onRejected?: (log: DrinkLog, error: ApiError) => void;
};

const isPermanent = (error: unknown) =>
  error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 401;

export function createDrinkStore({ api, storage, newId, onRejected }: DrinkDeps) {
  return create<DrinkState>()(
    persist(
      (set, get) => {
        const patch = (id: string, changes: Partial<DrinkLog> | null) =>
          set((state) => {
            const logs = { ...state.logs };
            const current = logs[id];
            if (!current) return state;
            if (changes === null) delete logs[id];
            else logs[id] = { ...current, ...changes };
            return { logs };
          });

        let inflight: Promise<void> | null = null;
        let again = false;

        /** Push every unsynced change once. Returns false if it had to stop (offline etc.). */
        const pushOnce = async (): Promise<boolean> => {
          for (const log of Object.values(get().logs)) {
            if (log.sync === 'synced') continue;
            try {
              if (log.sync === 'deleting') {
                unwrap(
                  await api().DELETE('/v1/drinks/{log_id}', {
                    params: { path: { log_id: log.id } },
                  }),
                );
                patch(log.id, null);
              } else {
                unwrap(
                  await api().POST('/v1/drinks', {
                    body: {
                      id: log.id,
                      amount_ml: log.amountMl,
                      drink_type: log.drinkType,
                      logged_at: log.loggedAt,
                      day_key: log.dayKey,
                    },
                  }),
                );
                // A delete may have been requested while the create was in flight.
                if (get().logs[log.id]?.sync === 'pending') patch(log.id, { sync: 'synced' });
              }
            } catch (error) {
              if (isPermanent(error)) {
                onRejected?.(log, error as ApiError);
                patch(log.id, null); // the server will never accept it; don't retry forever
                continue;
              }
              return false; // offline / server error / signed out: try again later
            }
          }
          return true;
        };

        return {
          logs: {},
          syncing: false,

          async addDrink(amountMl, drinkType = 'water', at = new Date()) {
            const log: DrinkLog = {
              id: newId(),
              amountMl,
              drinkType,
              loggedAt: at.toISOString(),
              dayKey: toDayKey(at),
              sync: 'pending',
            };
            set((state) => ({ logs: { ...state.logs, [log.id]: log } }));
            void get().sync();
            return log;
          },

          async removeDrink(id) {
            const log = get().logs[id];
            if (!log) return;
            patch(id, { sync: 'deleting' });
            void get().sync();
          },

          sync() {
            // Concurrent callers share one run; a call during a run schedules one more pass
            // so changes made meanwhile are pushed before the promise resolves.
            if (inflight) {
              again = true;
              return inflight;
            }
            set({ syncing: true });
            inflight = (async () => {
              try {
                do {
                  again = false;
                  if (!(await pushOnce())) break; // offline: stop until the next trigger
                } while (again);
              } finally {
                inflight = null;
                set({ syncing: false });
              }
            })();
            return inflight;
          },

          async pullDay(day) {
            const remote = unwrap(
              await api().GET('/v1/drinks', { params: { query: { from_day: day, to_day: day } } }),
            );
            set((state) => {
              const logs: Record<string, DrinkLog> = {};
              for (const log of Object.values(state.logs)) {
                // Keep other days, and anything not yet confirmed by the server.
                if (log.dayKey !== day || log.sync !== 'synced') logs[log.id] = log;
              }
              for (const r of remote) {
                if (logs[r.id]) continue; // local pending/deleting state wins
                logs[r.id] = {
                  id: r.id,
                  amountMl: r.amount_ml,
                  drinkType: r.drink_type,
                  loggedAt: r.logged_at,
                  dayKey: r.day_key,
                  sync: 'synced',
                };
              }
              return { logs };
            });
          },

          reset: () => set({ logs: {}, syncing: false }),
        };
      },
      {
        name: 'coral.drinks',
        version: 1,
        storage: createJSONStorage(() => storage),
        partialize: (state) => ({ logs: state.logs }),
      },
    ),
  );
}

export type DrinkStore = ReturnType<typeof createDrinkStore>;

/** Visible logs for a day (hides ones being deleted), oldest first. */
export function selectDay(logs: Record<string, DrinkLog>, day: string): DrinkLog[] {
  return Object.values(logs)
    .filter((log) => log.dayKey === day && log.sync !== 'deleting')
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
}

export function totalMl(logs: DrinkLog[]): number {
  return logs.reduce((sum, log) => sum + log.amountMl, 0);
}
