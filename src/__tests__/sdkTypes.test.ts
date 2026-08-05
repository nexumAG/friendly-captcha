/**
 * Guards the structural interfaces in `../types` against upstream drift: the
 * `Assignable` aliases fail `typecheck` if a real SDK class stops satisfying ours,
 * and the runtime check fails `test` if a member we declare disappears.
 *
 * The runtime half covers the SDK class only — `WidgetHandle` is a class in the SDK's
 * types but has no runtime export, so it is type-only here.
 */
import { FriendlyCaptchaSDK as RealFriendlyCaptchaSDK } from "@friendlycaptcha/sdk";
import type { WidgetHandle as RealWidgetHandle } from "@friendlycaptcha/sdk";
import { describe, expect, it } from "vitest";
// Re-export `WidgetResetOptions` from `../index` and this import stops erroring, so
// the directive goes unused and typecheck fails with TS2578. See ../types.ts.
// @ts-expect-error - deliberately not part of the public API
import type { WidgetResetOptions as _PublicWidgetResetOptions } from "../index";
import type { FriendlyCaptchaSDK, WidgetHandle } from "../types";

/** Fails to compile unless `Source` is assignable to `Target`. */
type Assignable<Target, Source extends Target> = [Target, Source];

export type RealSdkSatisfiesOurs = Assignable<FriendlyCaptchaSDK, RealFriendlyCaptchaSDK>;
export type RealWidgetHandleSatisfiesOurs = Assignable<WidgetHandle, RealWidgetHandle>;

describe("structural SDK types", () => {
  it.each(["attach", "createWidget", "getAllWidgets", "getWidgetById", "clear"])(
    "FriendlyCaptchaSDK still implements %s()",
    (member) => {
      const proto = RealFriendlyCaptchaSDK.prototype as unknown as Record<string, unknown>;
      expect(typeof proto[member]).toBe("function");
    },
  );
});
