import { FriendlyCaptcha } from "@nexumag/friendly-captcha";
import { actions } from "astro:actions";
import { useState, type FormEvent } from "react";

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

/**
 * A React island that solves the captcha and verifies it through an Astro
 * Action (a server function). The token never has to be handled manually on the
 * server — but here we pass it explicitly to show the end-to-end flow.
 */
export default function CaptchaForm({ sitekey }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

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
      <FriendlyCaptcha
        sitekey={sitekey}
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
