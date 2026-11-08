import { describe, expect, it } from "vitest";

// Minimal XMLHttpRequest that answers like the API, so whatwg-fetch (React Native's fetch) runs.
class FakeXHR {
  status = 0;
  statusText = "";
  responseURL = "";
  response: unknown = null;
  responseText = "";
  responseType = "";
  withCredentials = false;
  readyState = 0;
  onload: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  private headers: Record<string, string> = {};
  open(_m: string, url: string) {
    this.responseURL = url;
  }
  setRequestHeader(k: string, v: string) {
    this.headers[k] = v;
  }
  getAllResponseHeaders() {
    return "content-type: application/json\r\ncontent-length: 120\r\n";
  }
  send(_body: unknown) {
    setTimeout(() => {
      this.status = 200;
      this.statusText = "OK";
      const json = JSON.stringify({
        access_token: "a",
        token_type: "bearer",
        expires_in: 900,
        refresh_token: "r".repeat(30),
        refresh_expires_in: 1,
        user: { id: "u1" },
        is_new_user: true,
      });
      this.responseText = json;
      this.response = json;
      this.onload?.();
    }, 0);
  }
  abort() {}
}

describe("client on React Native fetch (whatwg-fetch over XHR)", () => {
  it("signs in", async () => {
    const g = globalThis as Record<string, unknown>;
    const saved = {
      fetch: g.fetch,
      Request: g.Request,
      Response: g.Response,
      Headers: g.Headers,
      XMLHttpRequest: g.XMLHttpRequest,
    };
    g.XMLHttpRequest = FakeXHR;
    const wf = await import("whatwg-fetch");
    Object.assign(g, {
      fetch: wf.fetch,
      Request: wf.Request,
      Response: wf.Response,
      Headers: wf.Headers,
    });
    try {
      const { createCoralClient, unwrap } = await import("./index");
      const client = createCoralClient({
        baseUrl: "https://api.test",
        getAccessToken: () => null,
      });
      const result = await client.POST("/v1/auth/apple", {
        body: { id_token: "x".repeat(30), nonce: "n".repeat(32) },
      });
      expect(unwrap(result).access_token).toBe("a");
    } finally {
      Object.assign(g, saved);
    }
  });
});
