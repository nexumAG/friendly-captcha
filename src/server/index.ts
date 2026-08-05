/**
 * Server-side verification for Friendly Captcha v2.
 *
 * Runtime-agnostic: depends only on the global `fetch`, so it runs on Node 22+,
 * Deno, Bun, edge runtimes, and Cloudflare Workers. It has **no** React or DOM
 * dependency and is exposed from the `@nexum-ag/friendly-captcha/server`
 * entry point so it never reaches the client bundle.
 *
 * Your API key is a secret — only ever use it on the server.
 */

/** Built-in endpoint shortcuts, or a full custom siteverify URL. */
export type VerifyEndpoint = "global" | "eu" | (string & {});

const ENDPOINT_URLS = new Map<string, string>([
  ["global", "https://global.frcapi.com/api/v2/captcha/siteverify"],
  ["eu", "https://eu.frcapi.com/api/v2/captcha/siteverify"],
]);

function resolveEndpoint(endpoint: VerifyEndpoint = "global"): string {
  // A Map rather than an object literal: a miss passes a custom URL through unchanged
  // with no prototype-key pitfalls.
  return ENDPOINT_URLS.get(endpoint) ?? endpoint;
}

/** Default request timeout (ms) when the caller does not pass a `signal`/`timeoutMs`. */
const DEFAULT_TIMEOUT_MS = 10_000;

/** `timeoutMs <= 0` disables the timeout, falling back to the caller's signal or none. */
function resolveSignal(
  signal: AbortSignal | undefined,
  timeoutMs: number,
): AbortSignal | undefined {
  if (timeoutMs <= 0) {
    return signal;
  }
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

/**
 * Failure code synthesized when the body carries no API `error_code`: an error
 * HTTP status is an `"http_error"`, a 2xx is a malformed `"bad_request"`.
 */
function fallbackErrorCode(res: Response): "bad_request" | "http_error" {
  return res.ok ? "bad_request" : "http_error";
}

/** Error codes returned by the siteverify endpoint. */
export type VerifyErrorCode =
  | "auth_required"
  | "auth_invalid"
  | "sitekey_invalid"
  | "response_missing"
  | "response_invalid"
  | "response_timeout"
  | "response_duplicate"
  | "bad_request"
  | (string & {});

export interface VerifyCaptchaOptions {
  /** The `frc-captcha-response` token submitted by the client. */
  response: string;
  /** Your Friendly Captcha API key. Sent as the `X-API-Key` header. Keep it secret. */
  apiKey: string;
  /** Optionally assert the puzzle was generated for this sitekey. */
  sitekey?: string;
  /** `"global"` (default), `"eu"`, or a full custom URL. */
  endpoint?: VerifyEndpoint;
  /** Inject a custom `fetch` (e.g. for testing or a proxy). Defaults to global `fetch`. */
  fetch?: typeof fetch;
  /** Abort signal forwarded to the request. Combined with the default timeout. */
  signal?: AbortSignal;
  /** Abort the request after this many ms. Defaults to 10000; set to 0 to disable. */
  timeoutMs?: number;
}

/** Successful verification (`success: true`). */
export interface VerifyCaptchaSuccess {
  success: true;
  /** Unique event id for this verification. */
  eventId?: string;
  /** ISO timestamp of when the challenge was solved. */
  challengeTimestamp?: string;
  /** Origin the challenge was solved on. */
  origin?: string;
  /** The raw, unmodified API response. */
  raw: unknown;
}

/** Failed verification (`success: false`), including transport/parse failures. */
export interface VerifyCaptchaFailure {
  success: false;
  /**
   * Machine-readable error code. Beyond the API's own codes, two are synthesized
   * locally: `"network_error"` for transport failures (the request never
   * completed) and `"http_error"` for an error HTTP status whose body carried no
   * `error_code` (inspect `status` to distinguish e.g. a 500 from a 4xx).
   */
  errorCode: VerifyErrorCode | "network_error" | "http_error";
  /** Human-readable detail, when available. Do not depend on its exact wording. */
  detail?: string;
  /** HTTP status code, when a response was received. */
  status?: number;
  /** The raw, unmodified API response (or the thrown error for transport failures). */
  raw: unknown;
}

export type VerifyCaptchaResult = VerifyCaptchaSuccess | VerifyCaptchaFailure;

interface SiteverifyResponseBody {
  success?: boolean;
  data?: {
    event_id?: string;
    challenge?: { timestamp?: string; origin?: string };
  };
  error?: { error_code?: string; detail?: string };
}

/**
 * Verifies a Friendly Captcha response token against the siteverify API.
 *
 * A 200 status does **not** mean the solution was valid — always branch on the
 * returned `success` field, never on the HTTP status. This helper never throws:
 * transport errors are returned as a failure with `errorCode: "network_error"`.
 *
 * @example
 * ```ts
 * const result = await verifyCaptchaResponse({
 *   response: formData.get("frc-captcha-response") as string,
 *   apiKey: process.env.FRC_API_KEY!,
 * });
 * if (!result.success) {
 *   return new Response("captcha failed", { status: 400 });
 * }
 * ```
 */
export async function verifyCaptchaResponse(
  options: VerifyCaptchaOptions,
): Promise<VerifyCaptchaResult> {
  const {
    response,
    apiKey,
    sitekey,
    endpoint,
    fetch: fetchImpl = fetch,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const body: Record<string, string> = { response };
  if (sitekey) {
    body.sitekey = sitekey;
  }

  let res: Response;
  try {
    res = await fetchImpl(resolveEndpoint(endpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(body),
      signal: resolveSignal(signal, timeoutMs),
    });
  } catch (err) {
    return {
      success: false,
      errorCode: "network_error",
      detail: err instanceof Error ? err.message : String(err),
      raw: err,
    };
  }

  let parsed: SiteverifyResponseBody;
  try {
    parsed = (await res.json()) as SiteverifyResponseBody;
  } catch (err) {
    // An error status (incl. an empty/204 body) is an HTTP failure, not a
    // malformed request on our side — only a 2xx with unparseable JSON is.
    return {
      success: false,
      errorCode: fallbackErrorCode(res),
      detail: res.ok
        ? "Failed to parse siteverify response as JSON."
        : `siteverify returned HTTP ${res.status} with a non-JSON body.`,
      status: res.status,
      raw: err,
    };
  }

  if (parsed.success === true) {
    return {
      success: true,
      eventId: parsed.data?.event_id,
      challengeTimestamp: parsed.data?.challenge?.timestamp,
      origin: parsed.data?.challenge?.origin,
      raw: parsed,
    };
  }

  // Prefer the API's own code; fall back to the HTTP-status-aware code so a 500
  // never masquerades as a client-side "bad_request" in retry logic.
  return {
    success: false,
    errorCode: parsed.error?.error_code ?? fallbackErrorCode(res),
    detail: parsed.error?.detail,
    status: res.status,
    raw: parsed,
  };
}
