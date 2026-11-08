import type { UserRead } from '@coral/api-client';

import { createSessionStore } from './session';
import type { AppleCredential, IdentityProviders, TokenStorage } from './types';

const USER: UserRead = {
  id: 'u1',
  email: 'me@example.com',
  display_name: 'Ash',
  timezone: 'UTC',
  daily_goal_ml: 2500,
  created_at: '2026-11-08T00:00:00Z',
  updated_at: '2026-11-08T00:00:00Z',
};

function memoryStorage(initial: { refresh?: string; user?: UserRead } = {}) {
  let refresh = initial.refresh ?? null;
  let user = initial.user ?? null;
  const storage: TokenStorage = {
    getRefreshToken: async () => refresh,
    setRefreshToken: async (t) => void (refresh = t),
    getCachedUser: async () => user,
    setCachedUser: async (u) => void (user = u),
    clear: async () => {
      refresh = null;
      user = null;
    },
  };
  return { storage, peek: () => ({ refresh, user }) };
}

const appleCredential: AppleCredential = {
  idToken: 'apple-id-token-'.padEnd(30, 'x'),
  rawNonce: 'n'.repeat(32),
  givenName: 'Ash',
  familyName: null,
};

function providers(apple: AppleCredential | null = appleCredential): IdentityProviders {
  return {
    apple: { isAvailable: async () => true, signIn: jest.fn(async () => apple) },
    google: {
      isConfigured: () => true,
      signIn: jest.fn(async () => 'google-id-token'.padEnd(30, 'x')),
      signOut: jest.fn(async () => {}),
    },
  };
}

type Route = (body: unknown, req: Request) => { status: number; body?: unknown };

function fakeApi(routes: Record<string, Route>) {
  const calls: string[] = [];
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init);
    const key = `${req.method} ${new URL(req.url).pathname}`;
    calls.push(key);
    const text = await req.text();
    const route = routes[key];
    if (!route) return new Response(null, { status: 404 });
    const { status, body } = route(text ? JSON.parse(text) : undefined, req);
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'content-type': status >= 400 ? 'application/problem+json' : 'application/json' },
    });
  };
  return { calls, fetch: fetchImpl as typeof fetch };
}

const tokens = (n: number) => ({
  access_token: `access-${n}`,
  token_type: 'bearer',
  expires_in: 900,
  refresh_token: `refresh-${n}`.padEnd(30, 'r'),
  refresh_expires_in: 5184000,
});

describe('session store', () => {
  it('starts signed out without a stored refresh token', async () => {
    const { storage } = memoryStorage();
    const store = createSessionStore({
      apiUrl: 'https://api.test',
      storage,
      providers: providers(),
      fetch: fakeApi({}).fetch,
    });
    await store.getState().bootstrap();
    expect(store.getState().status).toBe('signedOut');
  });

  it('starts signed out when secure storage is unavailable', async () => {
    const { storage } = memoryStorage();
    storage.getRefreshToken = async () => {
      throw new Error('SecureStore unavailable');
    };
    const store = createSessionStore({
      apiUrl: 'https://api.test',
      storage,
      providers: providers(),
      fetch: fakeApi({}).fetch,
    });
    await store.getState().bootstrap();
    expect(store.getState().status).toBe('signedOut');
  });

  it('restores a session by rotating the refresh token', async () => {
    const mem = memoryStorage({ refresh: 'refresh-0'.padEnd(30, 'r') });
    const api = fakeApi({
      'POST /v1/auth/refresh': () => ({ status: 200, body: tokens(1) }),
      'GET /v1/me': (_b, req) =>
        req.headers.get('authorization') === 'Bearer access-1'
          ? { status: 200, body: USER }
          : { status: 401, body: { title: 'Unauthorized', status: 401 } },
    });
    const store = createSessionStore({
      apiUrl: 'https://api.test',
      storage: mem.storage,
      providers: providers(),
      fetch: api.fetch,
    });

    await store.getState().bootstrap();

    expect(store.getState().status).toBe('signedIn');
    expect(store.getState().user?.display_name).toBe('Ash');
    expect(mem.peek().refresh).toBe(tokens(1).refresh_token);
  });

  it('signs out when the refresh token is rejected', async () => {
    const mem = memoryStorage({ refresh: 'stale'.padEnd(30, 'r'), user: USER });
    const store = createSessionStore({
      apiUrl: 'https://api.test',
      storage: mem.storage,
      providers: providers(),
      fetch: fakeApi({
        'POST /v1/auth/refresh': () => ({
          status: 401,
          body: { title: 'Unauthorized', status: 401 },
        }),
      }).fetch,
    });
    await store.getState().bootstrap();
    expect(store.getState().status).toBe('signedOut');
    expect(mem.peek()).toEqual({ refresh: null, user: null });
  });

  it('keeps the cached session when offline', async () => {
    const mem = memoryStorage({ refresh: 'refresh-0'.padEnd(30, 'r'), user: USER });
    const offline = (async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    const store = createSessionStore({
      apiUrl: 'https://api.test',
      storage: mem.storage,
      providers: providers(),
      fetch: offline,
    });
    await store.getState().bootstrap();
    expect(store.getState().status).toBe('signedIn');
    expect(store.getState().user?.id).toBe('u1');
  });

  it('signs in with Apple, sending the raw nonce and name', async () => {
    const mem = memoryStorage();
    let sent: unknown;
    const store = createSessionStore({
      apiUrl: 'https://api.test',
      storage: mem.storage,
      providers: providers(),
      fetch: fakeApi({
        'POST /v1/auth/apple': (body) => {
          sent = body;
          return { status: 200, body: { ...tokens(1), user: USER, is_new_user: true } };
        },
      }).fetch,
    });

    await store.getState().signInWithApple();

    expect(sent).toMatchObject({ nonce: 'n'.repeat(32), given_name: 'Ash' });
    expect(store.getState().status).toBe('signedIn');
    expect(store.getState().accessToken).toBe('access-1');
    expect(mem.peek().refresh).toBe(tokens(1).refresh_token);
  });

  it('treats a cancelled provider sheet as a no-op', async () => {
    const api = fakeApi({});
    const store = createSessionStore({
      apiUrl: 'https://api.test',
      storage: memoryStorage().storage,
      providers: providers(null),
      fetch: api.fetch,
    });
    store.setState({ status: 'signedOut' });
    await store.getState().signInWithApple();
    expect(api.calls).toEqual([]);
    expect(store.getState()).toMatchObject({ status: 'signedOut', error: null, busy: false });
  });

  it('shows a friendly error when the API rejects the sign-in', async () => {
    const store = createSessionStore({
      apiUrl: 'https://api.test',
      storage: memoryStorage().storage,
      providers: providers(),
      fetch: fakeApi({
        'POST /v1/auth/google': () => ({
          status: 401,
          body: { title: 'Unauthorized', status: 401 },
        }),
      }).fetch,
    });
    await store.getState().signInWithGoogle();
    expect(store.getState().error).toBe('We could not sign you in. Please try again.');
    expect(store.getState().busy).toBe(false);
  });

  it('signs out locally even if the network call fails', async () => {
    const mem = memoryStorage({ refresh: 'refresh-0'.padEnd(30, 'r'), user: USER });
    const p = providers();
    const store = createSessionStore({
      apiUrl: 'https://api.test',
      storage: mem.storage,
      providers: p,
      fetch: (async () => {
        throw new TypeError('offline');
      }) as unknown as typeof fetch,
    });
    store.setState({ status: 'signedIn', user: USER, accessToken: 'a' });
    await store.getState().signOut();
    expect(store.getState().status).toBe('signedOut');
    expect(mem.peek()).toEqual({ refresh: null, user: null });
    expect(p.google.signOut).toHaveBeenCalled();
  });
});
