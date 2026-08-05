/**
 * Re-exported and derived types for the Friendly Captcha React bindings.
 *
 * Our declarations inline the SDK's types (see the `bundleTypes` note in
 * `vite.config.ts`), because `@friendlycaptcha/sdk` declares no `types` condition
 * in its `exports` map and is therefore unresolvable from our `.d.ts` under
 * node16/nodenext resolution.
 *
 * Inlining is safe for interfaces and unions — TypeScript compares those
 * structurally. It is **not** safe for the SDK's two classes: `FriendlyCaptchaSDK`
 * and `WidgetHandle` both have `private` members, and TypeScript compares classes
 * with private members *nominally*, so an inlined copy would reject the very
 * instance a consumer constructed from `@friendlycaptcha/sdk`. Those two are
 * therefore declared here as structural interfaces covering the members this
 * library surfaces. A real SDK instance satisfies them, and
 * `src/__tests__/sdkTypes.test.ts` fails if upstream drifts away from them.
 *
 * That compatibility is **one-way**, and unavoidably so: private members can only
 * ever be satisfied by the class that declares them, so a value typed as one of
 * our interfaces is not assignable *back* to the SDK's class, even when it is
 * that exact instance at runtime. TypeScript reports this as `TS2740` naming the
 * same type on both sides, which reads like a bug but is not. Passing a value
 * this library returns to code typed against `@friendlycaptcha/sdk` needs a cast
 * (`as unknown as import("@friendlycaptcha/sdk").WidgetHandle`); if you want to
 * avoid the cast, construct the SDK yourself and keep your own reference — that
 * instance flows into the provider, hook, and component unchanged.
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

// `WidgetResetOptions` is imported but deliberately **not** re-exported. Its only
// member is `trigger`, which the SDK marks `@internal` ("you usually don't set this
// yourself, defaults to `root` for user code") and which merely labels the
// provenance of a reset in the `frc:widget.reset` event. Exposing it would let app
// code claim a reset came from the widget or the agent when it came from the page,
// so `reset()` stays argument-less on both the hook and the component ref. The
// optional parameter survives on {@link WidgetHandle} below only so that a real SDK
// handle still satisfies our interface; anyone who genuinely needs `trigger` can
// reach the raw handle via the hook's `widget` and import the SDK's own type.
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
 * The instance you get back from {@link UseFriendlyCaptchaResult.widget} *is* an
 * SDK widget handle at runtime, and a real handle is assignable to this interface.
 * The reverse does not hold: assigning it to the SDK's `WidgetHandle` type needs a
 * cast, because that class has `private` members (see the note at the top of this
 * file). Risk Intelligence handles and the internal `setState` escape hatch are
 * not covered; import `@friendlycaptcha/sdk` directly if you need those.
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
 * An instance you construct from the SDK is assignable to this interface, so it can
 * be passed to {@link FriendlyCaptchaProvider}, the hook, or the component. Going
 * the other way — assigning what {@link getSharedSdk} returns to the SDK's
 * `FriendlyCaptchaSDK` type — needs a cast, because that class has `private`
 * members (see the note at the top of this file). The Risk Intelligence API is
 * deliberately not covered here — keep a reference to your own instance if you
 * use it.
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
