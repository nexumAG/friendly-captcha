"use client";

import { FriendlyCaptchaSDK, type FriendlyCaptchaSDKOptions } from "@friendlycaptcha/sdk";
import { createContext, useContext, useRef, type ReactNode } from "react";
import { getSharedSdk } from "./sdk";

const SdkContext = createContext<FriendlyCaptchaSDK | null>(null);

export interface FriendlyCaptchaProviderProps {
  /**
   * A ready-made SDK instance to share. Takes precedence over `options`. Use
   * this if you construct the SDK yourself (e.g. to share it with non-React code).
   */
  sdk?: FriendlyCaptchaSDK;
  /**
   * Options used to construct the SDK instance when `sdk` is not provided.
   * The instance is created once and kept stable for the provider's lifetime.
   */
  options?: FriendlyCaptchaSDKOptions;
  children: ReactNode;
}

/**
 * Provides a shared {@link FriendlyCaptchaSDK} instance to the React tree.
 *
 * Optional: when absent, the hook and component fall back to a lazily-created
 * module singleton. Use the provider when you need to configure the endpoint
 * (`apiEndpoint: "eu"`), disable eval patching for strict CSP, or share one
 * instance across the app.
 */
export function FriendlyCaptchaProvider({ sdk, options, children }: FriendlyCaptchaProviderProps) {
  // Construct exactly once; never recreate across re-renders.
  const instanceRef = useRef<FriendlyCaptchaSDK | null>(null);
  if (!instanceRef.current) {
    instanceRef.current = sdk ?? new FriendlyCaptchaSDK(options);
  }
  return <SdkContext.Provider value={instanceRef.current}>{children}</SdkContext.Provider>;
}

/**
 * Resolves the SDK instance to use, in priority order:
 * 1. an explicit `override` (e.g. a `sdk` prop on the hook/component),
 * 2. the nearest {@link FriendlyCaptchaProvider},
 * 3. the lazily-created shared module singleton.
 */
export function useFriendlyCaptchaSdk(override?: FriendlyCaptchaSDK): FriendlyCaptchaSDK {
  const fromContext = useContext(SdkContext);
  return override ?? fromContext ?? getSharedSdk();
}
