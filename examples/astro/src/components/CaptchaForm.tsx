import { FriendlyCaptcha } from "@nexumag/friendly-captcha";
import { actions } from "astro:actions";
import { useEffect, useState, type FormEvent } from "react";

interface Props {
  sitekey: string;
}

type Status =
  | { kind: "idle" }
  | { kind: "verifying" }
  | { kind: "ok"; solvedAt: string | null }
  | { kind: "error"; message: string };

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

/**
 * A React island that solves the captcha and verifies it through an Astro
 * Action (a server function). The token never has to be handled manually on the
 * server — but here we pass it explicitly to show the end-to-end flow.
 */
export default function CaptchaForm({ sitekey }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof document !== "undefined" && document.documentElement.dataset.theme === "dark"
      ? "dark"
      : "light",
  );

  // Mirror the chosen theme onto <html> so the surrounding page follows it too.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
    // Switching theme recreates the widget (clearing its token without firing
    // onExpire), so reset our local state to keep the Submit button honest.
    setToken(null);
    setStatus({ kind: "idle" });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      return;
    }
    setStatus({ kind: "verifying" });

    const { data, error } = await actions.verifyCaptcha({ response: token });
    if (error) {
      setStatus({ kind: "error", message: error.message });
    } else {
      setStatus({ kind: "ok", solvedAt: data.solvedAt });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="captcha-form">
      <button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>

      <FriendlyCaptcha
        sitekey={sitekey}
        theme={theme}
        onComplete={setToken}
        onExpire={() => setToken(null)}
        onError={() => setToken(null)}
      />

      <button type="submit" disabled={!token || status.kind === "verifying"}>
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
  );
}
