import { verifyCaptchaResponse } from "@nexum-ag/friendly-captcha/server";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";

export const server = {
  /**
   * Server function that verifies the form's Friendly Captcha response.
   *
   * The API key only ever lives on the server. The widget keeps the response in a
   * hidden `frc-captcha-response` input, so it arrives with the rest of the form.
   */
  verifyCaptcha: defineAction({
    accept: "form",
    input: z.object({
      "frc-captcha-response": z.string(),
    }),
    handler: async (input) => {
      const response = input["frc-captcha-response"];
      if (response.startsWith(".")) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: `The captcha hasn't finished yet: the form sent the placeholder ${response}.`,
        });
      }

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
