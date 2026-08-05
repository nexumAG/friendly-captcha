"use client";

import { FriendlyCaptchaSDK as FriendlyCaptchaSDKClass } from "@friendlycaptcha/sdk";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getSharedSdk } from "./sdk";
import type { FriendlyCaptchaSDK, FriendlyCaptchaSDKOptions } from "./types";

/**
 * A lazy resolver that returns the SDK instance, creating it the first time it
 * is called. It must only be called on the client (inside an effect) — the SDK
 * constructor touches `window`, so calling it during render breaks SSR.
 */
export type SdkResolver = () => FriendlyCaptchaSDK;

const SdkContext = createContext<SdkResolver | null>(null);

export interface FriendlyCaptchaProviderProps {
  /**
   * A ready-made SDK instance to share. Takes precedence over `options`. Use
   * this if you construct the SDK yourself (e.g. to share it with non-React code).
   */
  sdk?: FriendlyCaptchaSDK;
  /**
   * Options used to construct the SDK instance when `sdk` is not provided.
   * The instance is created once, lazily, and kept stable for the provider's lifetime.
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
  // Options are fixed for the provider's lifetime; capture once so the resolver
  // identity stays stable across re-renders.
  const optionsRef = useRef(options);
  const resolver = useMemo<SdkResolver>(() => {
    if (sdk) {
      return () => sdk;
    }
    let instance: FriendlyCaptchaSDK | undefined;
    return () => (instance ??= new FriendlyCaptchaSDKClass(optionsRef.current));
  }, [sdk]);

  return <SdkContext.Provider value={resolver}>{children}</SdkContext.Provider>;
}

/**
 * Resolves the lazy SDK resolver, in priority order:
 * 1. an explicit `override` (e.g. a `sdk` prop on the hook/component),
 * 2. the nearest {@link FriendlyCaptchaProvider},
 * 3. the lazily-created shared module singleton.
 */
export function useSdkResolver(override?: FriendlyCaptchaSDK): SdkResolver {
  const fromContext = useContext(SdkContext);
  // Stable identity across renders, or consumers using it as an effect dependency
  // re-run every render.
  const overrideResolver = useMemo<SdkResolver | null>(
    () => (override ? () => override : null),
    [override],
  );
  return overrideResolver ?? fromContext ?? getSharedSdk;
}

/**
 * Returns the resolved {@link FriendlyCaptchaSDK} instance, or `null` during SSR
 * and before the first client effect runs. Useful for advanced scenarios; most
 * apps should use {@link FriendlyCaptchaProvider} and the component/hook instead.
 */
export function useFriendlyCaptchaSdk(override?: FriendlyCaptchaSDK): FriendlyCaptchaSDK | null {
  const resolve = useSdkResolver(override);
  const [sdk, setSdk] = useState<FriendlyCaptchaSDK | null>(null);
  useEffect(() => {
    setSdk(resolve());
  }, [resolve]);
  return sdk;
}
