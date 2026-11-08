/**
 * Typed Coral API client (openapi-fetch over the generated `schema.d.ts`).
 *
 * - Adds `Authorization: Bearer <access token>` to every request.
 * - On a 401 from a protected endpoint, calls `refresh()` once (shared by concurrent
 *   requests), then retries the original request with the new token.
 *
 * Regenerate types after API changes:  pnpm --filter @coral/api-client generate
 */
import createClient, { type Middleware } from "openapi-fetch";

import type { components, paths } from "./schema";

export type { components, paths };
export type UserRead = components["schemas"]["UserRead"];
export type UserUpdate = components["schemas"]["UserUpdate"];
export type SignInResponse = components["schemas"]["SignInResponse"];
export type TokenPair = components["schemas"]["TokenPair"];
export type Problem = components["schemas"]["Problem"];

export type CoralClientOptions = {
  baseUrl: string;
  /** Current access token, or null when signed out. */
  getAccessToken: () => string | null | Promise<string | null>;
  /** Obtain a new access token (e.g. rotate the refresh token). Return null if that fails. */
  refresh?: () => Promise<string | null>;
  fetch?: typeof globalThis.fetch;
};

/** Endpoints that must never trigger a refresh-and-retry. */
const NO_RETRY_PREFIXES = ["/v1/auth/"];

export class ApiError extends Error {
  readonly status: number;
  readonly problem: Problem | undefined;

  constructor(status: number, problem: Problem | undefined) {
    super(
      problem?.detail ??
        problem?.title ??
        `Request failed with status ${status}`,
    );
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }
}

export function createCoralClient(options: CoralClientOptions) {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const client = createClient<paths>({
    baseUrl: options.baseUrl,
    fetch: doFetch,
  });
  const pending = new Map<string, Request>();
  let refreshing: Promise<string | null> | null = null;

  const refreshOnce = (): Promise<string | null> => {
    if (!options.refresh) return Promise.resolve(null);
    refreshing ??= options.refresh().finally(() => {
      refreshing = null;
    });
    return refreshing;
  };

  const auth: Middleware = {
    async onRequest({ request, id }) {
      const token = await options.getAccessToken();
      if (token) request.headers.set("Authorization", `Bearer ${token}`);
      pending.set(id, request.clone());
      return request;
    },
    async onResponse({ response, id }) {
      const original = pending.get(id);
      pending.delete(id);
      if (response.status !== 401 || !original) return response;

      const path = new URL(original.url).pathname;
      if (NO_RETRY_PREFIXES.some((prefix) => path.startsWith(prefix)))
        return response;

      const token = await refreshOnce();
      if (!token) return response;
      const retry = new Request(original, {
        headers: new Headers(original.headers),
      });
      retry.headers.set("Authorization", `Bearer ${token}`);
      return doFetch(retry);
    },
    onError({ id }) {
      pending.delete(id);
    },
  };
  client.use(auth);
  return client;
}

export type CoralClient = ReturnType<typeof createCoralClient>;

/** Unwrap an openapi-fetch result: return data or throw an ApiError with the problem body. */
export function unwrap<T>(result: {
  data?: T;
  error?: unknown;
  response: Response;
}): T {
  if (result.error !== undefined || result.data === undefined) {
    if (result.response.status === 204) return undefined as T;
    throw new ApiError(
      result.response.status,
      result.error as Problem | undefined,
    );
  }
  return result.data;
}
