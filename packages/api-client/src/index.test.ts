// Exercises auth + refresh-and-retry against an in-memory fetch (no server).
import { describe, expect, it, vi } from 'vitest';

import { ApiError, createCoralClient, unwrap } from './index';

type Handler = (req: Request) => Response | Promise<Response>;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': status >= 400 ? 'application/problem+json' : 'application/json' },
  });
}

function server(handler: Handler) {
  const calls: Request[] = [];
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init);
    calls.push(req.clone());
    return handler(req);
  };
  return { calls, fetch: fetchImpl as typeof fetch };
}

const user = { id: 'u1', email: null, display_name: 'Ash', timezone: 'UTC', daily_goal_ml: 2500 };

describe('createCoralClient', () => {
  it('sends the bearer token', async () => {
    const s = server(() => json(200, user));
    const client = createCoralClient({
      baseUrl: 'https://api.test',
      getAccessToken: () => 'tok-1',
      fetch: s.fetch,
    });
    const me = unwrap(await client.GET('/v1/me'));
    expect(me.display_name).toBe('Ash');
    expect(s.calls[0]?.headers.get('authorization')).toBe('Bearer tok-1');
  });

  it('refreshes once on 401 and retries concurrent requests with the new token', async () => {
    let token = 'old';
    const refresh = vi.fn(async () => {
      token = 'new';
      return token;
    });
    const s = server((req) =>
      req.headers.get('authorization') === 'Bearer new'
        ? json(200, user)
        : json(401, { title: 'Unauthorized', status: 401 }),
    );
    const client = createCoralClient({
      baseUrl: 'https://api.test',
      getAccessToken: () => token,
      refresh,
      fetch: s.fetch,
    });

    const [a, b] = await Promise.all([client.GET('/v1/me'), client.GET('/v1/me')]);
    expect(unwrap(a).id).toBe('u1');
    expect(unwrap(b).id).toBe('u1');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('never retries auth endpoints and surfaces problem details', async () => {
    const refresh = vi.fn(async () => 'new');
    const s = server(() =>
      json(401, { title: 'Unauthorized', status: 401, detail: 'Invalid refresh token' }),
    );
    const client = createCoralClient({
      baseUrl: 'https://api.test',
      getAccessToken: () => null,
      refresh,
      fetch: s.fetch,
    });
    const result = await client.POST('/v1/auth/refresh', { body: { refresh_token: 'x'.repeat(30) } });
    expect(refresh).not.toHaveBeenCalled();
    expect(() => unwrap(result)).toThrow(ApiError);
    expect(() => unwrap(result)).toThrow('Invalid refresh token');
  });
});
