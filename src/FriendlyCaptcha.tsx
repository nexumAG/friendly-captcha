"use client";

import { forwardRef, useImperativeHandle, type HTMLAttributes } from "react";
import { useFriendlyCaptcha, type UseFriendlyCaptchaOptions } from "./useFriendlyCaptcha";

/** Imperative handle exposed via `ref` on {@link FriendlyCaptcha}. */
export interface FriendlyCaptchaHandle {
  /** Reset the widget, clearing any progress and token. */
  reset: () => void;
  /** Read the current verification token (normalized), or `null`. */
  getResponse: () => string | null;
  /** The mount element, or `null` before mount. */
  getElement: () => HTMLDivElement | null;
}

/**
 * Props for {@link FriendlyCaptcha}: every widget option and callback from the
 * hook, plus standard `<div>` attributes for styling (`className`, `style`, …).
 * The DOM `onError`/`onReset` handlers are omitted to avoid clashing with the
 * widget callbacks of the same name.
 */
export interface FriendlyCaptchaProps
  extends UseFriendlyCaptchaOptions, Omit<HTMLAttributes<HTMLDivElement>, "onError" | "onReset"> {}

/**
 * Declarative Friendly Captcha v2 widget.
 *
 * Render it inside your `<form>` — the widget injects a hidden input
 * (`frc-captcha-response` by default) so the token is submitted automatically
 * with the form (including via FormData in server actions / Astro Actions).
 *
 * ```tsx
 * <form action={verifyAction}>
 *   <FriendlyCaptcha sitekey="FCMxxxxx" onComplete={setToken} />
 *   <button type="submit">Send</button>
 * </form>
 * ```
 */
export const FriendlyCaptcha = forwardRef<FriendlyCaptchaHandle, FriendlyCaptchaProps>(
  function FriendlyCaptcha(props, ref) {
    const {
      sitekey,
      startMode,
      theme,
      language,
      formFieldName,
      apiEndpoint,
      sdk,
      onComplete,
      onError,
      onExpire,
      onReset,
      onStateChange,
      className,
      ...divProps
    } = props;

    const {
      ref: setWidgetRef,
      reset,
      getResponse,
      element,
    } = useFriendlyCaptcha<HTMLDivElement>({
      sitekey,
      startMode,
      theme,
      language,
      formFieldName,
      apiEndpoint,
      sdk,
      onComplete,
      onError,
      onExpire,
      onReset,
      onStateChange,
    });

    useImperativeHandle(ref, () => ({ reset, getResponse, getElement: () => element }), [
      reset,
      getResponse,
      element,
    ]);

    return (
      <div
        {...divProps}
        ref={setWidgetRef}
        className={className ? `frc-captcha ${className}` : "frc-captcha"}
      />
    );
  },
);
