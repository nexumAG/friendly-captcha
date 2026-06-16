"use client";

import type {
  FriendlyCaptchaSDK,
  FRCWidgetCompleteEvent,
  FRCWidgetStateChangeEvent,
  FRCWidgetWidgetErrorEvent,
  WidgetErrorData,
  WidgetHandle,
  WidgetState,
} from "@friendlycaptcha/sdk";
import { useCallback, useEffect, useRef, useState, type RefCallback } from "react";
import { useSdkResolver } from "./provider";
import type { FriendlyCaptchaCallbacks, WidgetConfig } from "./types";

/** Options accepted by {@link useFriendlyCaptcha}. */
export interface UseFriendlyCaptchaOptions extends WidgetConfig, FriendlyCaptchaCallbacks {
  /** Use a specific SDK instance instead of the provider/shared one. */
  sdk?: FriendlyCaptchaSDK;
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
  /** Reset the widget, clearing any progress and token. */
  reset: () => void;
  /** Imperatively read the current token (normalized), or `null`. */
  getResponse: () => string | null;
  /** The underlying SDK widget handle, or `null` before it mounts. */
  widget: WidgetHandle | null;
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
    onComplete,
    onError,
    onExpire,
    onReset,
    onStateChange,
  } = options;

  // Resolve the SDK lazily. The resolver is read during render (safe), but the
  // SDK itself is only constructed inside the effect below — never during
  // render — so server-side rendering never touches `window`.
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

    const handleStateChange = (event: FRCWidgetStateChangeEvent) => {
      const detail = event.detail;
      setState(detail.state);
      setResponse(normalizeResponse(detail.response));
      setError(detail.state === "error" ? (detail.error ?? null) : null);
      callbacksRef.current.onStateChange?.(detail.state);
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
      callbacksRef.current.onReset?.();
    };

    handle.addEventListener("frc:widget.statechange", handleStateChange);
    handle.addEventListener("frc:widget.complete", handleComplete);
    handle.addEventListener("frc:widget.error", handleError);
    handle.addEventListener("frc:widget.expire", handleExpire);
    handle.addEventListener("frc:widget.reset", handleReset);

    return () => {
      handle.removeEventListener("frc:widget.statechange", handleStateChange);
      handle.removeEventListener("frc:widget.complete", handleComplete);
      handle.removeEventListener("frc:widget.error", handleError);
      handle.removeEventListener("frc:widget.expire", handleExpire);
      handle.removeEventListener("frc:widget.reset", handleReset);
      handle.destroy();
      if (widgetRef.current === handle) {
        widgetRef.current = null;
        setWidget(null);
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
    reset,
    getResponse,
    widget,
  };
}
