import { describe, expect, it, vi } from "vitest";
import { verifyCaptchaResponse } from "../server";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(impl: () => Promise<Response>) {
  return vi.fn<typeof fetch>(impl);
}

describe("verifyCaptchaResponse", () => {
  it("posts to the global endpoint with the API key and response", async () => {
    const fetchImpl = mockFetch(async () =>
      jsonResponse({
        success: true,
        data: {
          event_id: "ev_1",
          challenge: { timestamp: "2026-02-05T13:01:25Z", origin: "https://example.com" },
        },
      }),
    );

    const result = await verifyCaptchaResponse({
      response: "tok",
      apiKey: "secret-key",
      sitekey: "FCSITE",
      fetch: fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://global.frcapi.com/api/v2/captcha/siteverify");
    expect(init!.method).toBe("POST");
    expect((init!.headers as Record<string, string>)["X-API-Key"]).toBe("secret-key");
    expect(JSON.parse(init!.body as string)).toEqual({ response: "tok", sitekey: "FCSITE" });

    expect(result).toMatchObject({
      success: true,
      eventId: "ev_1",
      challengeTimestamp: "2026-02-05T13:01:25Z",
      origin: "https://example.com",
    });
  });

  it("targets the EU endpoint when requested", async () => {
    const fetchImpl = mockFetch(async () => jsonResponse({ success: true, data: {} }));
    await verifyCaptchaResponse({ response: "tok", apiKey: "k", endpoint: "eu", fetch: fetchImpl });
    expect(fetchImpl.mock.calls[0]![0]).toBe("https://eu.frcapi.com/api/v2/captcha/siteverify");
  });

  it("supports a fully custom endpoint URL", async () => {
    const fetchImpl = mockFetch(async () => jsonResponse({ success: true, data: {} }));
    await verifyCaptchaResponse({
      response: "tok",
      apiKey: "k",
      endpoint: "https://proxy.internal/verify",
      fetch: fetchImpl,
    });
    expect(fetchImpl.mock.calls[0]![0]).toBe("https://proxy.internal/verify");
  });

  it("omits the sitekey from the body when not provided", async () => {
    const fetchImpl = mockFetch(async () => jsonResponse({ success: true, data: {} }));
    await verifyCaptchaResponse({ response: "tok", apiKey: "k", fetch: fetchImpl });
    expect(JSON.parse(fetchImpl.mock.calls[0]![1]!.body as string)).toEqual({ response: "tok" });
  });

  it("returns a failure with the error code on an unsuccessful verification", async () => {
    const fetchImpl = mockFetch(async () =>
      jsonResponse(
        { success: false, error: { error_code: "response_timeout", detail: "expired" } },
        200,
      ),
    );
    const result = await verifyCaptchaResponse({ response: "tok", apiKey: "k", fetch: fetchImpl });
    expect(result).toEqual({
      success: false,
      errorCode: "response_timeout",
      detail: "expired",
      status: 200,
      raw: { success: false, error: { error_code: "response_timeout", detail: "expired" } },
    });
  });

  it("maps auth failures (401) to a failure result", async () => {
    const fetchImpl = mockFetch(async () =>
      jsonResponse(
        { success: false, error: { error_code: "auth_invalid", detail: "bad key" } },
        401,
      ),
    );
    const result = await verifyCaptchaResponse({
      response: "tok",
      apiKey: "wrong",
      fetch: fetchImpl,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("auth_invalid");
      expect(result.status).toBe(401);
    }
  });

  it("never throws on transport errors", async () => {
    const fetchImpl = mockFetch(async () => {
      throw new Error("connection refused");
    });
    const result = await verifyCaptchaResponse({ response: "tok", apiKey: "k", fetch: fetchImpl });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("network_error");
      expect(result.detail).toBe("connection refused");
    }
  });

  it("classifies an error status with a non-JSON body as an http_error", async () => {
    const fetchImpl = mockFetch(async () => new Response("<html>oops</html>", { status: 500 }));
    const result = await verifyCaptchaResponse({ response: "tok", apiKey: "k", fetch: fetchImpl });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("http_error");
      expect(result.status).toBe(500);
    }
  });

  it("classifies a 2xx with an unparseable body as a bad_request", async () => {
    const fetchImpl = mockFetch(async () => new Response("<html>oops</html>", { status: 200 }));
    const result = await verifyCaptchaResponse({ response: "tok", apiKey: "k", fetch: fetchImpl });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("bad_request");
      expect(result.status).toBe(200);
    }
  });

  it("classifies an error status whose JSON body has no error_code as an http_error", async () => {
    const fetchImpl = mockFetch(async () => jsonResponse({ success: false }, 500));
    const result = await verifyCaptchaResponse({ response: "tok", apiKey: "k", fetch: fetchImpl });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("http_error");
      expect(result.status).toBe(500);
    }
  });

  it("treats a custom endpoint named like a prototype property as a URL", async () => {
    const fetchImpl = mockFetch(async () => jsonResponse({ success: true, data: {} }));
    await verifyCaptchaResponse({
      response: "tok",
      apiKey: "k",
      endpoint: "constructor",
      fetch: fetchImpl,
    });
    expect(fetchImpl.mock.calls[0]![0]).toBe("constructor");
  });

  it("aborts a hung request once the timeout elapses", async () => {
    // Mimic real fetch: reject when the forwarded signal aborts, never otherwise.
    const fetchImpl = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          (init!.signal as AbortSignal).addEventListener("abort", () => {
            reject(new DOMException("The operation timed out.", "TimeoutError"));
          });
        }),
    );
    const result = await verifyCaptchaResponse({
      response: "tok",
      apiKey: "k",
      fetch: fetchImpl,
      timeoutMs: 10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("network_error");
    }
  });
});
