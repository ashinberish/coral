/**
 * Regression: on React Native/Expo the `fetch` implementation can return Response objects of a
 * different class than `globalThis.Response`. openapi-fetch rejects any middleware result that
 * fails `instanceof Response` ("onResponse: must return new Response() when modifying the
 * response"), which broke sign-in although the server answered 200.
 */
import { describe, expect, it } from 'vitest';
import * as wf from 'whatwg-fetch';

import { createCoralClient, unwrap } from './index';

const user = { id: 'u1', email: null, display_name: 'Ash', timezone: 'UTC', daily_goal_ml: 2500 };

/** A fetch that answers with *foreign* Response objects (whatwg-fetch's class, not Node's). */
function foreignFetch(handler: (req: Request) => { status: number; body: unknown }) {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init);
    const { status, body } = handler(req);
    return new wf.Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }) as unknown as Response;
  }) as typeof fetch;
}

describe('responses from a foreign fetch implementation', () => {
  it('passes through unmodified responses', async () => {
    const client = createCoralClient({
      baseUrl: 'https://api.test',
      getAccessToken: () => null,
      fetch: foreignFetch(() => ({ status: 200, body: { access_token: 'a' } })),
    });
    const result = await client.POST('/v1/auth/apple', {
      body: { id_token: 'x'.repeat(30), nonce: 'n'.repeat(32) },
    });
    expect(unwrap(result).access_token).toBe('a');
  });

  it('returns a valid Response from refresh-and-retry', async () => {
    let token = 'old';
    const client = createCoralClient({
      baseUrl: 'https://api.test',
      getAccessToken: () => token,
      refresh: async () => (token = 'new'),
      fetch: foreignFetch((req) =>
        req.headers.get('authorization') === 'Bearer new'
          ? { status: 200, body: user }
          : { status: 401, body: { title: 'Unauthorized', status: 401 } },
      ),
    });
    expect(unwrap(await client.GET('/v1/me')).id).toBe('u1');
  });
});
