/**
 * Re-exported and derived types for the Friendly Captcha React bindings.
 *
 * The underlying types come from `@friendlycaptcha/sdk`; we re-export the ones
 * consumers are most likely to need so they don't have to depend on the SDK's
 * type surface directly.
 */
export type {
  APIEndpoint,
  CreateWidgetOptions,
  FriendlyCaptchaSDK,
  FriendlyCaptchaSDKOptions,
  StartMode,
  WidgetErrorCode,
  WidgetErrorData,
  WidgetHandle,
  WidgetMode,
  WidgetState,
} from "@friendlycaptcha/sdk";

import type { CreateWidgetOptions, WidgetErrorData, WidgetState } from "@friendlycaptcha/sdk";

/**
 * The subset of {@link CreateWidgetOptions} that a consumer configures. The
 * `element` is supplied internally by the hook/component, so it is omitted.
 */
export type WidgetConfig = Omit<CreateWidgetOptions, "element">;

/** Callbacks fired in response to the widget's DOM events. */
export interface FriendlyCaptchaCallbacks {
  /** Fired when the captcha is solved. Receives the response token to verify server-side. */
  onComplete?: (response: string) => void;
  /** Fired when the widget errors (network issue, invalid sitekey, …). */
  onError?: (error: WidgetErrorData) => void;
  /** Fired when a previously completed response expires before submission. */
  onExpire?: () => void;
  /** Fired when the widget is reset (programmatically or by the user). */
  onReset?: () => void;
  /** Fired on every widget state transition. */
  onStateChange?: (state: WidgetState) => void;
}
