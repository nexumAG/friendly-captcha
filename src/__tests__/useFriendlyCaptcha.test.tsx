import { act, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFriendlyCaptcha, type UseFriendlyCaptchaOptions } from "../useFriendlyCaptcha";
import { resetSharedSdk } from "../sdk";
import { createdWidgets, emit, resetFakeSdk } from "./fakeSdk";

vi.mock("@friendlycaptcha/sdk", () => import("./fakeSdk"));

function Harness(props: UseFriendlyCaptchaOptions) {
  const { ref, state, response, solved, error } = useFriendlyCaptcha(props);
  return (
    <div>
      <span data-testid="state">{state}</span>
      <span data-testid="response">{response ?? ""}</span>
      <span data-testid="solved">{String(solved)}</span>
      <span data-testid="error">{error?.code ?? ""}</span>
      <div ref={ref} data-testid="mount" />
    </div>
  );
}

function mountEl(): HTMLElement {
  return screen.getByTestId("mount");
}

beforeEach(() => {
  resetFakeSdk();
  resetSharedSdk();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useFriendlyCaptcha", () => {
  it("creates a widget on the mounted element", () => {
    render(<Harness sitekey="FCTEST" />);
    expect(createdWidgets).toHaveLength(1);
    expect(createdWidgets[0]?.element).toBe(mountEl());
    expect(screen.getByTestId("state").textContent).toBe("init");
    expect(screen.getByTestId("solved").textContent).toBe("false");
  });

  it("exposes the token and fires onComplete when solved", () => {
    const onComplete = vi.fn();
    render(<Harness sitekey="FCTEST" onComplete={onComplete} />);

    act(() => {
      emit(mountEl(), "frc:widget.statechange", { state: "completed", response: "token-123" });
      emit(mountEl(), "frc:widget.complete", { state: "completed", response: "token-123" });
    });

    expect(screen.getByTestId("response").textContent).toBe("token-123");
    expect(screen.getByTestId("solved").textContent).toBe("true");
    expect(onComplete).toHaveBeenCalledWith("token-123");
  });

  it("normalizes sentinel responses to null", () => {
    render(<Harness sitekey="FCTEST" />);
    act(() => {
      emit(mountEl(), "frc:widget.statechange", { state: "solving", response: ".SOLVING" });
    });
    expect(screen.getByTestId("state").textContent).toBe("solving");
    expect(screen.getByTestId("response").textContent).toBe("");
    expect(screen.getByTestId("solved").textContent).toBe("false");
  });

  it("surfaces errors via state and onError", () => {
    const onError = vi.fn();
    render(<Harness sitekey="FCTEST" onError={onError} />);

    const errorData = { code: "network_error", detail: "boom" };
    act(() => {
      emit(mountEl(), "frc:widget.statechange", {
        state: "error",
        response: ".ERROR",
        error: errorData,
      });
      emit(mountEl(), "frc:widget.error", { state: "error", response: ".ERROR", error: errorData });
    });

    expect(screen.getByTestId("state").textContent).toBe("error");
    expect(screen.getByTestId("error").textContent).toBe("network_error");
    expect(onError).toHaveBeenCalledWith(errorData);
  });

  it("fires onExpire and clears the token on expiry", () => {
    const onExpire = vi.fn();
    render(<Harness sitekey="FCTEST" onExpire={onExpire} />);

    act(() => {
      emit(mountEl(), "frc:widget.statechange", { state: "completed", response: "token-xyz" });
    });
    expect(screen.getByTestId("solved").textContent).toBe("true");

    act(() => {
      emit(mountEl(), "frc:widget.expire", { state: "expired", response: ".EXPIRED" });
      emit(mountEl(), "frc:widget.statechange", { state: "expired", response: ".EXPIRED" });
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("solved").textContent).toBe("false");
  });

  it("destroys the widget on unmount", () => {
    const { unmount } = render(<Harness sitekey="FCTEST" />);
    const widget = createdWidgets[0];
    expect(widget?.isDestroyed).toBe(false);
    unmount();
    expect(widget?.destroy).toHaveBeenCalledTimes(1);
    expect(widget?.isDestroyed).toBe(true);
  });

  it("recreates the widget when a create option changes", () => {
    const { rerender } = render(<Harness sitekey="FC_A" />);
    expect(createdWidgets).toHaveLength(1);

    rerender(<Harness sitekey="FC_B" />);
    expect(createdWidgets).toHaveLength(2);
    expect(createdWidgets[0]?.isDestroyed).toBe(true);
    expect(createdWidgets[1]?.isDestroyed).toBe(false);
  });

  it("does not change the widget when only a callback identity changes", () => {
    const { rerender } = render(<Harness sitekey="FCTEST" onComplete={() => {}} />);
    expect(createdWidgets).toHaveLength(1);
    rerender(<Harness sitekey="FCTEST" onComplete={() => {}} />);
    expect(createdWidgets).toHaveLength(1);
    expect(createdWidgets[0]?.isDestroyed).toBe(false);
  });

  it("never leaves more than one live widget under StrictMode", () => {
    render(
      <StrictMode>
        <Harness sitekey="FCTEST" />
      </StrictMode>,
    );
    const live = createdWidgets.filter((w) => !w.isDestroyed);
    expect(live).toHaveLength(1);
  });
});
