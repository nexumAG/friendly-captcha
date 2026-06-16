import { FriendlyCaptchaSDK, type FriendlyCaptchaSDKOptions } from "@friendlycaptcha/sdk";

/**
 * A lazily-created, shared {@link FriendlyCaptchaSDK} instance.
 *
 * Generally there should only be one SDK instance per page (it manages a single
 * background agent iframe). The hook and component use this shared instance by
 * default. To customize it — e.g. to target the EU endpoint or disable eval
 * patching — either call {@link getSharedSdk} with options *before* the first
 * widget mounts, or wrap your app in `FriendlyCaptchaProvider` with your own
 * instance.
 */
let sharedSdk: FriendlyCaptchaSDK | undefined;

/**
 * Returns the shared SDK instance, creating it on first call.
 *
 * The `options` argument only takes effect on the call that actually
 * constructs the instance; later calls return the existing instance and ignore
 * their `options`. For per-app configuration prefer `FriendlyCaptchaProvider`.
 */
export function getSharedSdk(options?: FriendlyCaptchaSDKOptions): FriendlyCaptchaSDK {
  if (!sharedSdk) {
    sharedSdk = new FriendlyCaptchaSDK(options);
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
