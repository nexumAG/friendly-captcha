import { vi } from "vitest";
import type {
  CreateWidgetOptions,
  FriendlyCaptchaSDKOptions,
  WidgetState,
} from "@friendlycaptcha/sdk";
import type { FriendlyCaptchaSDK as PublicFriendlyCaptchaSDK } from "../types";

/** Every widget the fake SDK has created, in order. Inspect in tests. */
export const createdWidgets: FakeWidget[] = [];

/** Every fake SDK instance constructed, in order. Inspect in tests. */
export const createdSdks: FriendlyCaptchaSDK[] = [];

export function resetFakeSdk(): void {
  createdWidgets.length = 0;
  createdSdks.length = 0;
}

/**
 * A minimal stand-in for the real `WidgetHandle`. It delegates event handling to
 * the actual DOM element it is mounted on, so tests can drive it by dispatching
 * `CustomEvent`s (see {@link emit}).
 */
export class FakeWidget {
  readonly id = `fake-${createdWidgets.length}`;
  isDestroyed = false;
  state: WidgetState = "init";
  response = ".UNSTARTED";
  reset = vi.fn();
  destroy = vi.fn(() => {
    this.isDestroyed = true;
  });

  constructor(
    readonly element: HTMLElement,
    /** The SDK instance that created this widget — asserts which one was resolved. */
    readonly sdk: FriendlyCaptchaSDK,
  ) {
    createdWidgets.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    this.element.addEventListener(type, listener);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    this.element.removeEventListener(type, listener);
  }

  getState() {
    return this.state;
  }

  getResponse() {
    return this.response;
  }
}

export class FriendlyCaptchaSDK {
  constructor(readonly options?: FriendlyCaptchaSDKOptions) {
    createdSdks.push(this);
  }

  createWidget(opts: CreateWidgetOptions): FakeWidget {
    return new FakeWidget(opts.element, this);
  }
}

/**
 * A fake SDK typed as the library's public SDK interface.
 *
 * The fake implements only the members the bindings actually call, so it is cast
 * rather than stubbing the rest of the SDK surface. Type-level fidelity against
 * the real SDK is covered separately by `sdkTypes.test.ts`.
 */
export function createFakeSdk(options?: FriendlyCaptchaSDKOptions): PublicFriendlyCaptchaSDK {
  return new FriendlyCaptchaSDK(options) as unknown as PublicFriendlyCaptchaSDK;
}

/** Dispatch a Friendly Captcha custom event on the widget's element. */
export function emit(element: HTMLElement, name: string, detail: Record<string, unknown>): void {
  element.dispatchEvent(new CustomEvent(name, { detail }));
}
