import { vi } from "vitest";
import type { CreateWidgetOptions, WidgetState } from "@friendlycaptcha/sdk";

/** Every widget the fake SDK has created, in order. Inspect in tests. */
export const createdWidgets: FakeWidget[] = [];

export function resetFakeSdk(): void {
  createdWidgets.length = 0;
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

  constructor(readonly element: HTMLElement) {
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
  createWidget(opts: CreateWidgetOptions): FakeWidget {
    return new FakeWidget(opts.element);
  }
}

/** Dispatch a Friendly Captcha custom event on the widget's element. */
export function emit(element: HTMLElement, name: string, detail: Record<string, unknown>): void {
  element.dispatchEvent(new CustomEvent(name, { detail }));
}
