"use client";

import type {
  FRCWidgetCompleteEvent,
  FRCWidgetStateChangeEvent,
  FRCWidgetWidgetErrorEvent,
} from "@friendlycaptcha/sdk";
import { useCallback, useEffect, useRef, useState, type RefCallback } from "react";
import { useSdkResolver } from "./provider";
import type {
  FriendlyCaptchaCallbacks,
  FriendlyCaptchaSDK,
  WidgetConfig,
  WidgetErrorData,
  WidgetHandle,
  WidgetMode,
  WidgetState,
} from "./types";

/**
 * How long a `hideUntilNeeded` widget may stay in `"requesting"` without completing
 * before it is shown, as recommended by Friendly Captcha's invisible-captcha guide.
 */
export const REVEAL_AFTER_MS = 5_000;

/** Options accepted by {@link useFriendlyCaptcha}. */
export interface UseFriendlyCaptchaOptions extends WidgetConfig, FriendlyCaptchaCallbacks {
  /** Use a specific SDK instance instead of the provider/shared one. */
  sdk?: FriendlyCaptchaSDK;
  /**
   * Keep the widget hidden while Smart mode solves it silently, and report `visible: true`
   * once the visitor has to act or should see what is happening: Smart mode asks for a
   * click, solving takes longer than {@link REVEAL_AFTER_MS}, or the widget errors or
   * expires. Once shown it stays shown, including after `reset()`.
   *
   * Only use this with the Smart widget mode, and show Friendly Captcha's attribution
   * yourself while the widget can be hidden. See the README.
   *
   * @defaultValue `false`
   */
  hideUntilNeeded?: boolean;
}

/** Value returned by {@link useFriendlyCaptcha}. */
export interface UseFriendlyCaptchaResult<E extends HTMLElement = HTMLDivElement> {
  /** Attach this to the element the widget should mount into. */
  ref: RefCallback<E>;
  /** The current widget lifecycle state. */
  state: WidgetState;
  /** The verification token once solved, otherwise `null` (sentinel values are normalized away). */
  response: string | null;
  /** The latest widget error, or `null`. */
  error: WidgetErrorData | null;
  /** `true` once the widget has produced a verification token. */
  solved: boolean;
  /**
   * Whether Smart mode needs a click (`"interactive"`) or solves silently
   * (`"noninteractive"`). `undefined` until the widget has been activated.
   */
  mode: WidgetMode | undefined;
  /** Whether the widget should be shown. Always `true` unless `hideUntilNeeded` is set. */
  visible: boolean;
  /** Reset the widget, clearing any progress and token. */
  reset: () => void;
  /** Imperatively read the current token (normalized), or `null`. */
  getResponse: () => string | null;
  /** The underlying SDK widget handle, or `null` before it mounts. */
  widget: WidgetHandle | null;
  /** The element the widget is mounted into, or `null` before it mounts. */
  element: E | null;
}

/** Sentinel responses (e.g. `.UNSTARTED`, `.EXPIRED`) all start with a dot; a real token never does. */
function normalizeResponse(response: string | null | undefined): string | null {
  return response && !response.startsWith(".") ? response : null;
}

/**
 * Headless hook that mounts and manages a Friendly Captcha v2 widget.
 *
 * Attach the returned `ref` to a DOM element; the hook creates the widget there,
 * keeps reactive `state` / `response` / `error` in sync, fires the optional
 * callbacks, and tears the widget down on unmount. It is safe under React
 * StrictMode — the widget is destroyed and recreated cleanly on the dev
 * double-invoke without leaking duplicate widgets.
 */
export function useFriendlyCaptcha<E extends HTMLElement = HTMLDivElement>(
  options: UseFriendlyCaptchaOptions = {},
): UseFriendlyCaptchaResult<E> {
  const {
    sitekey,
    startMode,
    theme,
    language,
    formFieldName,
    apiEndpoint,
    sdk: sdkOverride,
    hideUntilNeeded = false,
    onComplete,
    onError,
    onExpire,
    onReset,
    onStateChange,
  } = options;

  // Reading the resolver during render is safe; calling it is not. The SDK is only
  // constructed inside the effect below, so SSR never touches `window`.
  const resolveSdk = useSdkResolver(sdkOverride);
  const resolveSdkRef = useRef(resolveSdk);
  useEffect(() => {
    resolveSdkRef.current = resolveSdk;
  });

  const [element, setElement] = useState<E | null>(null);
  const [widget, setWidget] = useState<WidgetHandle | null>(null);
  const [state, setState] = useState<WidgetState>("init");
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<WidgetErrorData | null>(null);
  const [mode, setMode] = useState<WidgetMode | undefined>(undefined);
  const [revealed, setRevealed] = useState(false);

  const widgetRef = useRef<WidgetHandle | null>(null);

  // Keep the latest callbacks in a ref so changing their identity does not
  // recreate the widget; event listeners always read the current values.
  const callbacksRef = useRef<FriendlyCaptchaCallbacks>({});
  useEffect(() => {
    callbacksRef.current = { onComplete, onError, onExpire, onReset, onStateChange };
  });

  const ref = useCallback<RefCallback<E>>((node) => {
    setElement(node);
  }, []);

  useEffect(() => {
    if (!element) {
      return;
    }

    const handle = resolveSdkRef.current().createWidget({
      element,
      sitekey,
      startMode,
      theme,
      language,
      formFieldName,
      apiEndpoint,
    });
    widgetRef.current = handle;
    setWidget(handle);
    setState(handle.getState());
    setResponse(normalizeResponse(handle.getResponse()));
    setError(null);
    setMode(undefined);
    setRevealed(false);

    let revealTimer: ReturnType<typeof setTimeout> | undefined;
    const reveal = () => setRevealed(true);

    const handleStateChange = (event: FRCWidgetStateChangeEvent) => {
      const detail = event.detail;
      setState(detail.state);
      setResponse(normalizeResponse(detail.response));
      setError(detail.state === "error" ? (detail.error ?? null) : null);
      setMode(detail.mode);

      if (detail.state === "requesting") {
        clearTimeout(revealTimer);
        revealTimer = setTimeout(reveal, REVEAL_AFTER_MS);
      } else if (detail.state === "completed") {
        clearTimeout(revealTimer);
      }
      if (detail.mode === "interactive" || detail.state === "error" || detail.state === "expired") {
        reveal();
      }

      callbacksRef.current.onStateChange?.(detail.state, detail);
    };
    const handleComplete = (event: FRCWidgetCompleteEvent) => {
      callbacksRef.current.onComplete?.(event.detail.response);
    };
    const handleError = (event: FRCWidgetWidgetErrorEvent) => {
      callbacksRef.current.onError?.(event.detail.error);
    };
    const handleExpire = () => {
      callbacksRef.current.onExpire?.();
    };
    const handleReset = () => {
      clearTimeout(revealTimer);
      callbacksRef.current.onReset?.();
    };

    handle.addEventListener("frc:widget.statechange", handleStateChange);
    handle.addEventListener("frc:widget.complete", handleComplete);
    handle.addEventListener("frc:widget.error", handleError);
    handle.addEventListener("frc:widget.expire", handleExpire);
    handle.addEventListener("frc:widget.reset", handleReset);

    return () => {
      clearTimeout(revealTimer);
      handle.removeEventListener("frc:widget.statechange", handleStateChange);
      handle.removeEventListener("frc:widget.complete", handleComplete);
      handle.removeEventListener("frc:widget.error", handleError);
      handle.removeEventListener("frc:widget.expire", handleExpire);
      handle.removeEventListener("frc:widget.reset", handleReset);
      handle.destroy();
      if (widgetRef.current === handle) {
        widgetRef.current = null;
        // Clear reactive state too, so `solved`/`response`/`state` can't outlive
        // the widget. Otherwise `solved` stays true while `getResponse()` (which
        // reads the now-null ref) returns null — a form could submit an empty token.
        setWidget(null);
        setState("init");
        setResponse(null);
        setError(null);
        setMode(undefined);
      }
    };
  }, [element, sdkOverride, sitekey, startMode, theme, language, formFieldName, apiEndpoint]);

  const reset = useCallback(() => {
    widgetRef.current?.reset();
  }, []);

  const getResponse = useCallback(() => normalizeResponse(widgetRef.current?.getResponse()), []);

  return {
    ref,
    state,
    response,
    error,
    solved: response !== null,
    mode,
    visible: !hideUntilNeeded || revealed,
    reset,
    getResponse,
    widget,
    element,
  };
}
