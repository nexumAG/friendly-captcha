/**
 * Re-exported and derived types for the Friendly Captcha React bindings.
 *
 * Our `.d.ts` inlines the SDK's types (see `bundleTypes` in `vite.config.ts`).
 * That is safe for interfaces and unions, but not for the SDK's two classes:
 * `FriendlyCaptchaSDK` and `WidgetHandle` have `private` members, so TypeScript
 * compares them nominally and an inlined copy would reject the very instance a
 * consumer constructed. Both are therefore redeclared below as structural
 * interfaces, guarded against upstream drift by `__tests__/sdkTypes.test.ts`.
 *
 * The resulting compatibility is one-way: a real SDK instance satisfies our
 * interfaces, but our values need a cast to go back the other way. The README
 * documents this for consumers.
 */
export type {
  APIEndpoint,
  CreateWidgetOptions,
  FriendlyCaptchaSDKOptions,
  StartMode,
  WidgetErrorCode,
  WidgetErrorData,
  WidgetMode,
  WidgetState,
} from "@friendlycaptcha/sdk";

// `WidgetResetOptions` is imported but deliberately not re-exported: its only member
// is the SDK's `@internal` `trigger`, which labels who caused a reset rather than
// configuring it. It stays on `WidgetHandle.reset()` below so a real SDK handle still
// satisfies the interface. Guarded by `__tests__/sdkTypes.test.ts`.
import type {
  CreateWidgetOptions,
  FRCEventMap,
  StartMode,
  WidgetErrorData,
  WidgetResetOptions,
  WidgetState,
} from "@friendlycaptcha/sdk";

/**
 * A mounted Friendly Captcha widget.
 *
 * The value returned by {@link UseFriendlyCaptchaResult.widget} *is* an SDK widget
 * handle at runtime. Risk Intelligence handles and the internal `setState` escape
 * hatch are not covered; import `@friendlycaptcha/sdk` directly for those.
 */
export interface WidgetHandle {
  /** A random ID that uniquely identifies this widget in this session. */
  readonly id: string;
  /** The sitekey this widget was created with. */
  readonly sitekey?: string;
  /** When the widget starts solving its challenge. */
  startMode: StartMode;
  /** Resolves once the widget has finished mounting. */
  readonly ready: Promise<undefined>;
  /** `true` once {@link WidgetHandle.destroy} has run. */
  isDestroyed: boolean;
  /** Reset the widget, clearing any progress and token. */
  reset(options?: WidgetResetOptions): void;
  /** Tear the widget down and remove it from the DOM. */
  destroy(): void;
  /** Start solving the challenge now, regardless of `startMode`. */
  start(): void;
  /** The current widget lifecycle state. */
  getState(): WidgetState;
  /** The current response token, or a `.`-prefixed sentinel value. */
  getResponse(): string;
  /** The element the widget is mounted under. */
  getElement(): HTMLElement;
  /** Strictly-typed `addEventListener` for the widget's DOM events. */
  addEventListener<K extends keyof FRCEventMap>(
    type: K,
    listener: (this: HTMLElement, event: FRCEventMap[K]) => unknown,
    options?: AddEventListenerOptions,
  ): void;
  /** Strictly-typed `removeEventListener` for the widget's DOM events. */
  removeEventListener<K extends keyof FRCEventMap>(
    type: K,
    listener: (this: HTMLElement, event: FRCEventMap[K]) => unknown,
    options?: EventListenerOptions,
  ): void;
}

/**
 * A Friendly Captcha SDK instance.
 *
 * An instance you construct yourself satisfies this interface, so it can be passed
 * to {@link FriendlyCaptchaProvider}, the hook, or the component. The Risk
 * Intelligence API is not covered — keep a reference to your own instance for that.
 */
export interface FriendlyCaptchaSDK {
  /** Resolves to all widgets currently attached. */
  readonly attached: Promise<WidgetHandle[]>;
  /** Attach to the given elements, or scan the page for `.frc-captcha` elements. */
  attach(elements?: HTMLElement | HTMLElement[] | NodeListOf<Element>): WidgetHandle[];
  /** Create a widget under the given element. */
  createWidget(options: CreateWidgetOptions): WidgetHandle;
  /** Every widget this instance knows about, in an unspecified order. */
  getAllWidgets(): WidgetHandle[];
  /** Look up a widget by its ID. */
  getWidgetById(id: string): WidgetHandle | undefined;
  /** Remove all widgets and background agents for this instance. */
  clear(): void;
}

/**
 * The subset of `CreateWidgetOptions` that a consumer configures. The
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
