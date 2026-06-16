// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FriendlyCaptcha } from "../FriendlyCaptcha";
import { useFriendlyCaptcha } from "../useFriendlyCaptcha";

// These run in a Node environment (no `window`) using the *real* SDK — i.e. the
// exact condition that crashed under Astro/Next SSR. Rendering must produce the
// mount element without ever constructing the SDK (which touches `window`).
describe("server-side rendering", () => {
  it("has no window (sanity check for the node environment)", () => {
    expect(typeof window).toBe("undefined");
  });

  it("renders the component to static markup without touching window", () => {
    const html = renderToStaticMarkup(<FriendlyCaptcha sitekey="FCTEST" />);
    expect(html).toContain("frc-captcha");
  });

  it("renders a component using the headless hook without touching window", () => {
    function Harness() {
      const { ref } = useFriendlyCaptcha({ sitekey: "FCTEST" });
      return <div ref={ref} className="frc-captcha" />;
    }
    const html = renderToStaticMarkup(<Harness />);
    expect(html).toContain("frc-captcha");
  });
});
