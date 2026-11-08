// Test-only: React Native's fetch polyfill (used by rn-fetch.test.ts).
declare module "whatwg-fetch" {
  export const fetch: typeof globalThis.fetch;
  export const Request: typeof globalThis.Request;
  export const Response: typeof globalThis.Response;
  export const Headers: typeof globalThis.Headers;
}
