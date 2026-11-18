import { act, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  REVEAL_AFTER_MS,
  useFriendlyCaptcha,
  type UseFriendlyCaptchaOptions,
} from "../useFriendlyCaptcha";
import { resetSharedSdk } from "../sdk";
import { createdWidgets, emit, resetFakeSdk } from "./fakeSdk";

vi.mock("@friendlycaptcha/sdk", () => import("./fakeSdk"));

function Harness(props: UseFriendlyCaptchaOptions) {
  const { ref, state, response, solved, error, mode, visible } = useFriendlyCaptcha(props);
  return (
    <div>
      <span data-testid="state">{state}</span>
      <span data-testid="response">{response ?? ""}</span>
      <span data-testid="solved">{String(solved)}</span>
      <span data-testid="error">{error?.code ?? ""}</span>
      <span data-testid="mode">{mode ?? ""}</span>
      <span data-testid="visible">{String(visible)}</span>
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
  vi.useRealTimers();
});

function emitState(state: string, extra: Record<string, unknown> = {}): void {
  act(() => {
    emit(mountEl(), "frc:widget.statechange", {
      state,
      response: `.${state.toUpperCase()}`,
      ...extra,
    });
  });
}

function shownText(): string | null {
  return screen.getByTestId("visible").textContent;
}

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

  it("fires onReset when the widget is reset", () => {
    const onReset = vi.fn();
    render(<Harness sitekey="FCTEST" onReset={onReset} />);

    act(() => {
      emit(mountEl(), "frc:widget.statechange", { state: "completed", response: "token-abc" });
    });
    expect(screen.getByTestId("solved").textContent).toBe("true");

    act(() => {
      emit(mountEl(), "frc:widget.reset", { state: "init", response: ".UNSTARTED" });
      emit(mountEl(), "frc:widget.statechange", { state: "init", response: ".UNSTARTED" });
    });

    expect(onReset).toHaveBeenCalledTimes(1);
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

describe("useFriendlyCaptcha mode and hideUntilNeeded", () => {
  it("passes the event detail to onStateChange and exposes mode", () => {
    const onStateChange = vi.fn();
    render(<Harness sitekey="FCTEST" onStateChange={onStateChange} />);
    expect(screen.getByTestId("mode").textContent).toBe("");

    emitState("activated", { mode: "noninteractive" });

    expect(onStateChange).toHaveBeenCalledWith(
      "activated",
      expect.objectContaining({
        state: "activated",
        mode: "noninteractive",
        response: ".ACTIVATED",
      }),
    );
    expect(screen.getByTestId("mode").textContent).toBe("noninteractive");
  });

  it("is always visible when the option is off", () => {
    vi.useFakeTimers();
    render(<Harness sitekey="FCTEST" />);
    expect(shownText()).toBe("true");

    emitState("activated", { mode: "noninteractive" });
    emitState("requesting", { mode: "noninteractive" });
    act(() => {
      vi.advanceTimersByTime(REVEAL_AFTER_MS);
    });
    expect(shownText()).toBe("true");
  });

  it("starts hidden and shows when Smart mode needs a click", () => {
    render(<Harness sitekey="FCTEST" hideUntilNeeded />);
    expect(shownText()).toBe("false");

    emitState("activated", { mode: "interactive" });
    expect(shownText()).toBe("true");
  });

  it("stays hidden through a silent solve", () => {
    vi.useFakeTimers();
    render(<Harness sitekey="FCTEST" hideUntilNeeded />);

    emitState("activated", { mode: "noninteractive" });
    emitState("requesting", { mode: "noninteractive" });
    emitState("solving", { mode: "noninteractive" });
    emitState("verifying", { mode: "noninteractive" });
    act(() => {
      emit(mountEl(), "frc:widget.statechange", {
        state: "completed",
        mode: "noninteractive",
        response: "token",
      });
    });
    act(() => {
      vi.advanceTimersByTime(REVEAL_AFTER_MS * 2);
    });

    expect(screen.getByTestId("solved").textContent).toBe("true");
    expect(shownText()).toBe("false");
  });

  it("shows when requesting has not completed in time", () => {
    vi.useFakeTimers();
    render(<Harness sitekey="FCTEST" hideUntilNeeded />);

    emitState("requesting", { mode: "noninteractive" });
    act(() => {
      vi.advanceTimersByTime(REVEAL_AFTER_MS - 1);
    });
    expect(shownText()).toBe("false");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(shownText()).toBe("true");
  });

  it("does not show late after a reset cancels the wait", () => {
    vi.useFakeTimers();
    render(<Harness sitekey="FCTEST" hideUntilNeeded />);

    emitState("requesting", { mode: "noninteractive" });
    act(() => {
      emit(mountEl(), "frc:widget.reset", { state: "init", response: ".UNSTARTED" });
    });
    emitState("init");
    act(() => {
      vi.advanceTimersByTime(REVEAL_AFTER_MS);
    });
    expect(shownText()).toBe("false");
  });

  it.each(["error", "expired"])("shows on %s", (state) => {
    render(<Harness sitekey="FCTEST" hideUntilNeeded />);
    emitState(state);
    expect(shownText()).toBe("true");
  });

  it("stays visible after reset", () => {
    render(<Harness sitekey="FCTEST" hideUntilNeeded />);
    emitState("activated", { mode: "interactive" });
    expect(shownText()).toBe("true");

    act(() => {
      emit(mountEl(), "frc:widget.reset", { state: "init", response: ".UNSTARTED" });
    });
    emitState("init");

    expect(screen.getByTestId("mode").textContent).toBe("");
    expect(shownText()).toBe("true");
  });
});
