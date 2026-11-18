import {
  FriendlyCaptcha,
  type APIEndpoint,
  type FriendlyCaptchaHandle,
  type StartMode,
  type WidgetMode,
  type WidgetState,
} from "@nexum-ag/friendly-captcha";
import { actions } from "astro:actions";
import { useEffect, useRef, useState, type FormEvent } from "react";

interface Props {
  sitekey: string;
  apiEndpoint: APIEndpoint;
}

type Status =
  | { kind: "idle" }
  | { kind: "verifying" }
  | { kind: "ok"; solvedAt: string | null }
  | { kind: "error"; message: string };

const RESPONSE_FIELD = "frc-captcha-response";

const START_MODE_HINTS: Record<StartMode, string> = {
  focus: "Starts when you focus a field in the form.",
  auto: "Starts as soon as the widget mounts.",
  none: "Waits for a press on the widget, so it is never hidden.",
};

const LANGUAGES = [
  ["", "Browser default"],
  ["en", "English"],
  ["de", "Deutsch"],
  ["fr", "Français"],
  ["es", "Español"],
  ["it", "Italiano"],
] as const;

const MODE_HINTS: Record<WidgetMode, string> = {
  interactive: "Smart mode needs a click",
  noninteractive: "Smart mode solves on its own",
};

/** Turn the API's ISO timestamp (nanosecond precision) into a readable local time. */
function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    date,
  );
}

/** Monocolor icons (inherit the button's `color` via `currentColor`). */
function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function Attribution() {
  return (
    <p className="attribution">
      This site is protected by{" "}
      <a href="https://friendlycaptcha.com" target="_blank" rel="noopener">
        Friendly Captcha
      </a>{" "}
      and its{" "}
      <a href="https://friendlycaptcha.com/privacy/user-protection/" target="_blank" rel="noopener">
        Privacy Policy
      </a>{" "}
      and{" "}
      <a href="https://friendlycaptcha.com/legal/terms/" target="_blank" rel="noopener">
        Terms of Use
      </a>{" "}
      apply.
    </p>
  );
}

/**
 * A playground for every widget option. The form posts its fields, including the
 * hidden `frc-captcha-response` input the widget manages, to an Astro Action that
 * verifies the response server-side.
 */
export default function CaptchaForm({ sitekey, apiEndpoint }: Props) {
  const captchaRef = useRef<FriendlyCaptchaHandle>(null);
  const [hideUntilNeeded, setHideUntilNeeded] = useState(true);
  const [startMode, setStartMode] = useState<StartMode>("focus");
  const [language, setLanguage] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof document !== "undefined" && document.documentElement.dataset.theme === "dark"
      ? "dark"
      : "light",
  );
  const [widgetState, setWidgetState] = useState<WidgetState>("init");
  const [widgetMode, setWidgetMode] = useState<WidgetMode | undefined>(undefined);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // Mirror the chosen theme onto <html> so the surrounding page follows it too.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const sentRealToken = !String(formData.get(RESPONSE_FIELD) ?? "").startsWith(".");
    setStatus({ kind: "verifying" });

    const { data, error } = await actions.verifyCaptcha(formData);
    setStatus(
      error ? { kind: "error", message: error.message } : { kind: "ok", solvedAt: data.solvedAt },
    );
    // A token verifies only once; solve a fresh one for the next submit.
    if (sentRealToken) {
      captchaRef.current?.reset();
    }
  }

  return (
    <div className="playground">
      <button
        type="button"
        className="theme-toggle"
        onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>

      <fieldset className="options">
        <legend>Widget options</legend>
        <dl className="widget-status" aria-live="polite">
          <dt>State</dt>
          <dd>{widgetState}</dd>
          <dt>Mode</dt>
          <dd title={widgetMode ? MODE_HINTS[widgetMode] : "Decided when the widget activates"}>
            {widgetMode ?? "pending"}
          </dd>
        </dl>
        <label className="option option--inline">
          <input
            type="checkbox"
            checked={hideUntilNeeded}
            onChange={(event) => setHideUntilNeeded(event.target.checked)}
          />
          <code>hideUntilNeeded</code>
        </label>
        <label className="option">
          <code>startMode</code>
          <select
            value={startMode}
            onChange={(event) => setStartMode(event.target.value as StartMode)}
          >
            <option value="focus">focus</option>
            <option value="auto">auto</option>
            <option value="none">none</option>
          </select>
          <small>{START_MODE_HINTS[startMode]}</small>
        </label>
        <label className="option">
          <code>language</code>
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            {LANGUAGES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <p className="option">
          <code>apiEndpoint</code> <span>{apiEndpoint} (from FRC_ENDPOINT)</span>
        </p>
      </fieldset>

      <form onSubmit={handleSubmit} className="captcha-form">
        <label className="option">
          Email
          <input name="email" type="email" placeholder="you@example.com" />
        </label>

        <FriendlyCaptcha
          ref={captchaRef}
          sitekey={sitekey}
          apiEndpoint={apiEndpoint}
          theme={theme}
          startMode={startMode}
          language={language || undefined}
          hideUntilNeeded={hideUntilNeeded}
          onStateChange={(state, { mode }) => {
            setWidgetState(state);
            setWidgetMode(mode);
          }}
        />
        {hideUntilNeeded && <Attribution />}

        <button type="submit" disabled={status.kind === "verifying"}>
          {status.kind === "verifying" ? "Verifying…" : "Submit"}
        </button>

        {status.kind === "ok" && (
          <p className="status ok">
            ✅ Verified server-side
            {status.solvedAt ? ` · solved at ${formatTimestamp(status.solvedAt)}` : ""}.
          </p>
        )}
        {status.kind === "error" && <p className="status error">❌ {status.message}</p>}
      </form>
    </div>
  );
}
