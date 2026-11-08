import { createCoralClient } from '@coral/api-client';
import type { StateStorage } from 'zustand/middleware';

import { createDrinkStore, selectDay, totalMl } from './store';

/** In-memory API that, like the real one, dedupes creates on the client id. */
function fakeServer() {
  const rows = new Map<string, Record<string, unknown>>();
  let online = true;
  let failNextAfterStore = false;
  const calls: string[] = [];

  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init);
    const url = new URL(req.url);
    calls.push(`${req.method} ${url.pathname}`);
    if (!online) throw new TypeError('Network request failed');
    const json = (status: number, body?: unknown) =>
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      });

    if (req.method === 'POST' && url.pathname === '/v1/drinks') {
      const body = (await req.json()) as Record<string, unknown>;
      if ((body.amount_ml as number) > 5000)
        return json(422, { title: 'Unprocessable', status: 422 });
      const row = { ...body, created_at: '2026-11-08T00:00:00Z' };
      if (!rows.has(body.id as string)) rows.set(body.id as string, row);
      if (failNextAfterStore) {
        failNextAfterStore = false;
        throw new TypeError('timeout after commit'); // stored, but the client never hears back
      }
      return json(201, rows.get(body.id as string));
    }
    if (req.method === 'DELETE' && url.pathname.startsWith('/v1/drinks/')) {
      rows.delete(url.pathname.split('/').pop()!);
      return json(204);
    }
    if (req.method === 'GET' && url.pathname === '/v1/drinks') {
      const day = url.searchParams.get('from_day');
      return json(
        200,
        [...rows.values()].filter((r) => r.day_key === day),
      );
    }
    return json(404);
  };

  return {
    rows,
    calls,
    setOnline: (v: boolean) => void (online = v),
    timeoutAfterNextStore: () => void (failNextAfterStore = true),
    client: createCoralClient({
      baseUrl: 'https://api.test',
      getAccessToken: () => 'token',
      fetch: fetchImpl as typeof fetch,
    }),
  };
}

function memoryStorage(): StateStorage {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

function setup() {
  const server = fakeServer();
  let n = 0;
  const rejected: string[] = [];
  const store = createDrinkStore({
    api: () => server.client,
    storage: memoryStorage(),
    newId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
    onRejected: (log) => rejected.push(log.id),
  });
  return { server, store, rejected };
}

const NOON = new Date(2026, 10, 8, 12, 0);

describe('drink store', () => {
  it('logs instantly, then syncs with the client id', async () => {
    const { server, store } = setup();
    const log = await store.getState().addDrink(250, 'water', NOON);

    expect(store.getState().logs[log.id]?.amountMl).toBe(250);
    await store.getState().sync();

    expect(store.getState().logs[log.id]?.sync).toBe('synced');
    expect(server.rows.get(log.id)).toMatchObject({ amount_ml: 250, day_key: '2026-11-08' });
  });

  it('keeps logs pending while offline and syncs later', async () => {
    const { server, store } = setup();
    server.setOnline(false);
    const log = await store.getState().addDrink(500, 'water', NOON);
    await store.getState().sync();
    expect(store.getState().logs[log.id]?.sync).toBe('pending');

    server.setOnline(true);
    await store.getState().sync();
    expect(store.getState().logs[log.id]?.sync).toBe('synced');
  });

  it('never duplicates a drink when a sync is retried after a lost response', async () => {
    const { server, store } = setup();
    server.timeoutAfterNextStore();
    const log = await store.getState().addDrink(250, 'water', NOON);
    await store.getState().sync(); // stored on the server, but the client saw a failure
    expect(store.getState().logs[log.id]?.sync).toBe('pending');

    await store.getState().sync(); // retry with the same id
    expect(server.rows.size).toBe(1);
    expect(store.getState().logs[log.id]?.sync).toBe('synced');
  });

  it('deletes locally at once and on the server during sync', async () => {
    const { server, store } = setup();
    const log = await store.getState().addDrink(250, 'water', NOON);
    await store.getState().sync();

    await store.getState().removeDrink(log.id);
    expect(selectDay(store.getState().logs, '2026-11-08')).toEqual([]);
    await store.getState().sync();
    expect(store.getState().logs[log.id]).toBeUndefined();
    expect(server.rows.size).toBe(0);
  });

  it('drops drinks the server permanently rejects', async () => {
    const { store, rejected } = setup();
    const log = await store.getState().addDrink(9000, 'water', NOON);
    await store.getState().sync();
    expect(store.getState().logs[log.id]).toBeUndefined();
    expect(rejected).toEqual([log.id]);
  });

  it('pulls a day: adds remote logs, drops ones deleted elsewhere, keeps local changes', async () => {
    const { server, store } = setup();
    const kept = await store.getState().addDrink(250, 'water', NOON);
    const deletedElsewhere = await store.getState().addDrink(150, 'tea', NOON);
    await store.getState().sync();
    server.rows.delete(deletedElsewhere.id);
    server.rows.set('remote-1', {
      id: 'remote-1',
      amount_ml: 500,
      drink_type: 'water',
      logged_at: NOON.toISOString(),
      day_key: '2026-11-08',
      created_at: NOON.toISOString(),
    });
    server.setOnline(false);
    const pending = await store.getState().addDrink(200, 'coffee', NOON);
    server.setOnline(true);

    await store.getState().pullDay('2026-11-08');

    const ids = selectDay(store.getState().logs, '2026-11-08')
      .map((l) => l.id)
      .sort();
    expect(ids).toEqual([kept.id, pending.id, 'remote-1'].sort());
    expect(totalMl(selectDay(store.getState().logs, '2026-11-08'))).toBe(950);
  });
});
