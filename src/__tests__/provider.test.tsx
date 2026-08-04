import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FriendlyCaptchaProvider, useFriendlyCaptchaSdk } from "../provider";
import { getSharedSdk, resetSharedSdk, setSharedSdk } from "../sdk";
import { useFriendlyCaptcha, type UseFriendlyCaptchaOptions } from "../useFriendlyCaptcha";
import { createdSdks, createdWidgets, createFakeSdk, resetFakeSdk } from "./fakeSdk";

vi.mock("@friendlycaptcha/sdk", () => import("./fakeSdk"));

function Harness(props: UseFriendlyCaptchaOptions = {}) {
  const { ref } = useFriendlyCaptcha(props);
  return <div ref={ref} data-testid="mount" />;
}

/** The SDK instance that ended up creating the widget. */
function resolvedSdk() {
  return createdWidgets[0]?.sdk;
}

beforeEach(() => {
  resetFakeSdk();
  resetSharedSdk();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("FriendlyCaptchaProvider", () => {
  it("does not construct the SDK during render", () => {
    // The SDK constructor touches `window`, so constructing it while rendering
    // would break SSR. Nothing should be built until a widget actually mounts.
    render(
      <FriendlyCaptchaProvider options={{ apiEndpoint: "eu" }}>
        <p>no widget here</p>
      </FriendlyCaptchaProvider>,
    );
    expect(createdSdks).toHaveLength(0);
  });

  it("constructs one SDK with the provider options when the first widget mounts", () => {
    render(
      <FriendlyCaptchaProvider options={{ apiEndpoint: "eu" }}>
        <Harness sitekey="FCTEST" />
      </FriendlyCaptchaProvider>,
    );

    expect(createdSdks).toHaveLength(1);
    expect(createdSdks[0]?.options).toEqual({ apiEndpoint: "eu" });
    expect(resolvedSdk()).toBe(createdSdks[0]);
  });

  it("shares a single instance across every widget in the tree", () => {
    render(
      <FriendlyCaptchaProvider options={{ apiEndpoint: "eu" }}>
        <Harness sitekey="FC_A" />
        <Harness sitekey="FC_B" />
      </FriendlyCaptchaProvider>,
    );

    expect(createdWidgets).toHaveLength(2);
    expect(createdSdks).toHaveLength(1);
    expect(createdWidgets[0]?.sdk).toBe(createdWidgets[1]?.sdk);
  });

  it("keeps the same instance when a new options object is passed", () => {
    // Provider options are captured once by design — a fresh object literal on
    // re-render must not tear down the SDK (and its background agent iframe).
    const { rerender } = render(
      <FriendlyCaptchaProvider options={{ apiEndpoint: "eu" }}>
        <Harness sitekey="FCTEST" />
      </FriendlyCaptchaProvider>,
    );
    const first = resolvedSdk();

    rerender(
      <FriendlyCaptchaProvider options={{ apiEndpoint: "eu" }}>
        <Harness sitekey="FCTEST" />
      </FriendlyCaptchaProvider>,
    );

    expect(createdSdks).toHaveLength(1);
    expect(resolvedSdk()).toBe(first);
  });

  it("uses a ready-made sdk prop instead of constructing one", () => {
    const mine = createFakeSdk();
    resetFakeSdk();

    render(
      <FriendlyCaptchaProvider sdk={mine} options={{ apiEndpoint: "eu" }}>
        <Harness sitekey="FCTEST" />
      </FriendlyCaptchaProvider>,
    );

    // `sdk` wins over `options`, so nothing new is constructed.
    expect(createdSdks).toHaveLength(0);
    expect(resolvedSdk()).toBe(mine);
  });

  it("lets an sdk passed to the hook override the provider's", () => {
    const override = createFakeSdk();
    resetFakeSdk();

    render(
      <FriendlyCaptchaProvider options={{ apiEndpoint: "eu" }}>
        <Harness sitekey="FCTEST" sdk={override} />
      </FriendlyCaptchaProvider>,
    );

    expect(resolvedSdk()).toBe(override);
    expect(createdSdks).toHaveLength(0);
  });

  it("falls back to the shared singleton when there is no provider", () => {
    render(<Harness sitekey="FCTEST" />);

    expect(createdSdks).toHaveLength(1);
    expect(resolvedSdk()).toBe(getSharedSdk());
  });

  it("honours an SDK installed with setSharedSdk", () => {
    const injected = createFakeSdk();
    setSharedSdk(injected);
    resetFakeSdk();

    render(<Harness sitekey="FCTEST" />);

    expect(resolvedSdk()).toBe(injected);
    expect(createdSdks).toHaveLength(0);
  });
});

describe("useFriendlyCaptchaSdk", () => {
  it("is null on the first render and resolves after the effect runs", () => {
    const seen: (object | null)[] = [];

    function Probe() {
      const sdk = useFriendlyCaptchaSdk();
      seen.push(sdk);
      return <span data-testid="resolved">{String(sdk !== null)}</span>;
    }

    render(
      <FriendlyCaptchaProvider options={{ apiEndpoint: "eu" }}>
        <Probe />
      </FriendlyCaptchaProvider>,
    );

    // Null during render (SSR-safe), the instance once effects have run.
    expect(seen[0]).toBeNull();
    expect(screen.getByTestId("resolved").textContent).toBe("true");
    expect(createdSdks).toHaveLength(1);
  });

  it("returns the explicit override it is given", () => {
    const mine = createFakeSdk();
    resetFakeSdk();

    function Probe() {
      const sdk = useFriendlyCaptchaSdk(mine);
      return <span data-testid="same">{String(sdk === mine)}</span>;
    }

    render(<Probe />);

    expect(screen.getByTestId("same").textContent).toBe("true");
    expect(createdSdks).toHaveLength(0);
  });
});
