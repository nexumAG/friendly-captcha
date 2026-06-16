import { act, render } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FriendlyCaptcha, type FriendlyCaptchaHandle } from "../FriendlyCaptcha";
import { resetSharedSdk } from "../sdk";
import { createdWidgets, emit, resetFakeSdk } from "./fakeSdk";

vi.mock("@friendlycaptcha/sdk", () => import("./fakeSdk"));

beforeEach(() => {
  resetFakeSdk();
  resetSharedSdk();
});

describe("<FriendlyCaptcha />", () => {
  it("renders a div with the frc-captcha class and mounts a widget", () => {
    const { container } = render(<FriendlyCaptcha sitekey="FCTEST" className="custom" />);
    const el = container.querySelector("div.frc-captcha");
    expect(el).not.toBeNull();
    expect(el?.classList.contains("custom")).toBe(true);
    expect(createdWidgets).toHaveLength(1);
    expect(createdWidgets[0]?.element).toBe(el);
  });

  it("forwards arbitrary div attributes", () => {
    const { container } = render(
      <FriendlyCaptcha sitekey="FCTEST" data-foo="bar" aria-label="captcha" />,
    );
    const el = container.querySelector("div.frc-captcha");
    expect(el?.getAttribute("data-foo")).toBe("bar");
    expect(el?.getAttribute("aria-label")).toBe("captcha");
  });

  it("calls onComplete with the token", () => {
    const onComplete = vi.fn();
    const { container } = render(<FriendlyCaptcha sitekey="FCTEST" onComplete={onComplete} />);
    const el = container.querySelector("div.frc-captcha") as HTMLElement;
    act(() => {
      emit(el, "frc:widget.complete", { state: "completed", response: "tok" });
    });
    expect(onComplete).toHaveBeenCalledWith("tok");
  });

  it("exposes reset and getResponse via the imperative handle", () => {
    const ref = createRef<FriendlyCaptchaHandle>();
    const { container } = render(<FriendlyCaptcha ref={ref} sitekey="FCTEST" />);
    const widget = createdWidgets[0];

    if (widget) {
      widget.response = "live-token";
    }
    expect(ref.current?.getResponse()).toBe("live-token");

    ref.current?.reset();
    expect(widget?.reset).toHaveBeenCalledTimes(1);

    expect(ref.current?.getElement()).toBe(container.querySelector("div.frc-captcha"));
  });
});
