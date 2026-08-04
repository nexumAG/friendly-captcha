import { verifyCaptchaResponse } from "@nexum-ag/friendly-captcha/server";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";

export const server = {
  /**
   * Server function that verifies a Friendly Captcha response token.
   *
   * The API key only ever lives on the server. The client calls this action
   * with the token produced by the widget; verification happens here.
   */
  verifyCaptcha: defineAction({
    input: z.object({
      response: z.string().min(1, "Please complete the captcha."),
    }),
    handler: async ({ response }) => {
      const apiKey = import.meta.env.FRC_API_KEY;
      if (!apiKey) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "FRC_API_KEY is not configured on the server.",
        });
      }

      const result = await verifyCaptchaResponse({
        response,
        apiKey,
        endpoint: import.meta.env.FRC_ENDPOINT ?? "global",
      });

      if (!result.success) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: `Captcha verification failed (${result.errorCode}).`,
        });
      }

      return { verified: true, solvedAt: result.challengeTimestamp ?? null };
    },
  }),
};
