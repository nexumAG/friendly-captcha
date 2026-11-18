import {
  FriendlyCaptcha,
  type APIEndpoint,
  type FriendlyCaptchaHandle,
  type StartMode,
  type WidgetMode,
  type WidgetState,
} from "@nexum-ag/friendly-captcha";
import { actions } from "astro:actions";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

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
  focus: "Starts when a field gets focus.",
  auto: "Starts as soon as it mounts.",
  none: "Starts on click, so it's never hidden.",
};

const LANGUAGES = ["en", "de", "fr", "es", "it"];

const NARROW_SCREEN = "(max-width: 48rem)";

const MODE_HINTS: Record<WidgetMode, string> = {
  interactive: "needs a click",
  noninteractive: "solves itself",
};

const MODE_PENDING = "pending until activation";

function Prop({ name, children }: { name: string; children: ReactNode }) {
  return (
    <label className="prop">
      <span className="prop__name">{name}</span>
      <span className="prop__punct" aria-hidden="true">
        =
      </span>
      {children}
    </label>
  );
}

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
  const panelRef = useRef<HTMLDetailsElement>(null);
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

  useEffect(() => {
    if (panelRef.current && matchMedia(NARROW_SCREEN).matches) {
      panelRef.current.open = false;
    }
  }, []);

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
    <>
      <details ref={panelRef} className="props-panel" open>
        <summary>
          <span className="props-panel__tag">&lt;FriendlyCaptcha</span>
          <span className="widget-state" data-state={widgetState} aria-live="polite">
            {widgetState}
          </span>
        </summary>
        <div className="props-panel__body">
          <Prop name="hideUntilNeeded">
            <button
              type="button"
              role="switch"
              aria-checked={hideUntilNeeded}
              onClick={() => setHideUntilNeeded((current) => !current)}
            >
              {`{${hideUntilNeeded}}`}
            </button>
          </Prop>
          <Prop name="startMode">
            <select
              value={startMode}
              onChange={(event) => setStartMode(event.target.value as StartMode)}
            >
              <option value="focus">"focus"</option>
              <option value="auto">"auto"</option>
              <option value="none">"none"</option>
            </select>
          </Prop>
          <p className="prop__comment">{START_MODE_HINTS[startMode]}</p>
          <Prop name="language">
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="">{"{undefined}"}</option>
              {LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  "{code}"
                </option>
              ))}
            </select>
          </Prop>
          {!language && <p className="prop__comment">Follows the browser's language.</p>}
          <Prop name="theme">
            <select
              value={theme}
              onChange={(event) => setTheme(event.target.value as "light" | "dark")}
            >
              <option value="light">"light"</option>
              <option value="dark">"dark"</option>
            </select>
          </Prop>
          <p className="prop">
            <span className="prop__name">apiEndpoint</span>
            <span className="prop__punct">=</span>
            <span>"{apiEndpoint}"</span>
          </p>
          <p className="prop__comment">Set on the server by FRC_ENDPOINT.</p>
          <p className="props-panel__tag">/&gt;</p>
          <p className="prop__comment props-panel__mode">
            mode: {widgetMode ? `${widgetMode}, ${MODE_HINTS[widgetMode]}` : MODE_PENDING}
          </p>
        </div>
      </details>

      <form onSubmit={handleSubmit} className="captcha-form">
        <label className="field">
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
    </>
  );
}
