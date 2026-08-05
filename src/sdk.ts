import { FriendlyCaptchaSDK as FriendlyCaptchaSDKClass } from "@friendlycaptcha/sdk";
import type { FriendlyCaptchaSDK, FriendlyCaptchaSDKOptions } from "./types";

let sharedSdk: FriendlyCaptchaSDK | undefined;

/**
 * Returns the shared SDK instance, creating it on first call.
 *
 * There should only be one instance per page — each one manages a background agent
 * iframe. `options` therefore only takes effect on the call that constructs the
 * instance; later calls ignore theirs. For per-app configuration prefer
 * `FriendlyCaptchaProvider`.
 */
export function getSharedSdk(options?: FriendlyCaptchaSDKOptions): FriendlyCaptchaSDK {
  if (!sharedSdk) {
    sharedSdk = new FriendlyCaptchaSDKClass(options);
  }
  return sharedSdk;
}

/** Replaces the shared SDK instance. Mostly useful in tests. */
export function setSharedSdk(sdk: FriendlyCaptchaSDK): void {
  sharedSdk = sdk;
}

/** Clears the shared SDK instance so the next {@link getSharedSdk} recreates it. */
export function resetSharedSdk(): void {
  sharedSdk = undefined;
}
