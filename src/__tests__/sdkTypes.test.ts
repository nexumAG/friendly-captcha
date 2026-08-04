/**
 * Guards the structural interfaces in `../types` against upstream drift.
 *
 * `FriendlyCaptchaSDK` and `WidgetHandle` are declared by us rather than
 * re-exported from `@friendlycaptcha/sdk` (see the comment at the top of
 * `../types.ts`). That means an upstream change to either class could silently
 * make our declarations wrong. These checks fail loudly instead:
 *
 * - the `Assignable` aliases below fail `npm run typecheck` if a real SDK class
 *   stops satisfying our interface,
 * - the runtime check fails `npm test` if a member we declare disappears.
 *
 * The runtime check only covers the SDK class: `WidgetHandle` is declared as a
 * class in the SDK's types but has no runtime export, so it is type-only here.
 */
import { FriendlyCaptchaSDK as RealFriendlyCaptchaSDK } from "@friendlycaptcha/sdk";
import type { WidgetHandle as RealWidgetHandle } from "@friendlycaptcha/sdk";
import { describe, expect, it } from "vitest";
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
