# 🤖 Friendly Captcha for React

<img align="right" src="https://avatars.githubusercontent.com/u/2322771?s=200&v=4" width="90" alt="nexum" />

Modern, type-safe React bindings for [Friendly Captcha v2](https://developer.friendlycaptcha.com/docs/v2), built on the official [`@friendlycaptcha/sdk`](https://www.npmjs.com/package/@friendlycaptcha/sdk).

👉 [Getting Started](#-getting-started)

🧩 [Usage](#-usage)

🔒 [Server-side verification](#-server-side-verification)

🛠️ [Configuration](#-configuration)

🧪 [Local development](#-local-development)

🐾 [Useful links](#-useful-links)

## 👉 Getting Started

> [!IMPORTANT]
> This package is published to **GitHub Packages** under the `@nexumag` scope. Point the scope at the GitHub registry in your `.npmrc` (and authenticate with a token that has `read:packages`):
>
> ```ini
> @nexumag:registry=https://npm.pkg.github.com
> ```

```bash
npm install @nexumag/friendly-captcha
```

> [!NOTE]
> `react` 19+ is the only peer dependency. The Friendly Captcha SDK is bundled as a dependency, so you don't install it separately.

Render the widget inside your `<form>`. It injects a hidden `frc-captcha-response` input, so the token is submitted automatically with the form:

```tsx
import { FriendlyCaptcha } from "@nexumag/friendly-captcha";

function ContactForm() {
  return (
    <form method="POST" action="/api/contact">
      <input name="email" type="email" required />
      <FriendlyCaptcha sitekey="FCMxxxxxxxxxxxxxxx" />
      <button type="submit">Send</button>
    </form>
  );
}
```

## 🧩 Usage

This package ships two ways to use the widget — a declarative component and a headless hook — plus a server-side verification helper.

### Component

Capture the token via `onComplete` when you control submission yourself:

```tsx
const [token, setToken] = useState<string | null>(null);

<FriendlyCaptcha
  sitekey="FCMxxxxxxxxxxxxxxx"
  onComplete={setToken}
  onExpire={() => setToken(null)}
/>;
```

The component forwards a ref with imperative helpers:

```tsx
const ref = useRef<FriendlyCaptchaHandle>(null);
// ref.current?.reset();
// ref.current?.getResponse();
<FriendlyCaptcha ref={ref} sitekey="…" />;
```

### Hook

For full control, `useFriendlyCaptcha()` returns a `ref` to attach plus reactive state:

```tsx
import { useFriendlyCaptcha } from "@nexumag/friendly-captcha";

function Captcha() {
  const { ref, state, response, solved, error, reset } = useFriendlyCaptcha({
    sitekey: "FCMxxxxxxxxxxxxxxx",
    onComplete: (token) => console.log("solved", token),
  });

  return (
    <div>
      <div ref={ref} className="frc-captcha" />
      {error && <button onClick={reset}>Retry</button>}
    </div>
  );
}
```

> [!NOTE]
> `response` is the normalized token — internal sentinel values (e.g. `.SOLVING`) are surfaced as `null`. Use `solved` for a simple "is there a token" check.

### Props & options

All of the SDK's [`createWidget` options](https://developer.friendlycaptcha.com/docs/v2/sdk/reference/sdk.createwidgetoptions) are accepted by both the component and the hook:

| Option          | Type                          | Default                  | Notes                              |
| --------------- | ----------------------------- | ------------------------ | ---------------------------------- |
| `sitekey`       | `string`                      | —                        | Your sitekey (`FC…`).              |
| `startMode`     | `"auto" \| "focus" \| "none"` | `"focus"`                | When the challenge starts solving. |
| `theme`         | `"light" \| "dark" \| "auto"` | `"light"`                | Widget appearance.                 |
| `language`      | `string`                      | auto-detected            | e.g. `"en"`, `"de"`.               |
| `formFieldName` | `string \| null`              | `"frc-captcha-response"` | Hidden input name.                 |
| `apiEndpoint`   | `"global" \| "eu" \| string`  | `"global"`               | Data residency / custom endpoint.  |

Callbacks: `onComplete(token)`, `onError(error)`, `onExpire()`, `onReset()`, `onStateChange(state)`.

## 🔒 Server-side verification

> [!IMPORTANT]
> Always verify the token on your server — a client-side token alone is not proof. Your API key is a secret and must never reach the browser.

The helper lives in a separate entry point and depends only on `fetch`, so it runs on Node 20+, Deno, Bun, edge runtimes, and Cloudflare Workers:

```ts
import { verifyCaptchaResponse } from "@nexumag/friendly-captcha/server";

const result = await verifyCaptchaResponse({
  response: formData.get("frc-captcha-response") as string,
  apiKey: process.env.FRC_API_KEY!, // secret — server only
  // endpoint: "eu",                // optional, defaults to "global"
});

if (!result.success) {
  // result.errorCode, result.detail, result.status
  return new Response("Captcha failed", { status: 400 });
}
// result.eventId, result.challengeTimestamp, result.origin
```

> [!NOTE]
> A `200` status does **not** mean the solution was valid — always branch on `result.success`. The helper never throws: transport failures come back as `{ success: false, errorCode: "network_error" }`.

See [`examples/astro`](./examples/astro) for an end-to-end demo using an Astro Action (a server function) to verify the token.

## 🛠️ Configuration

### Sharing & configuring the SDK

By default a single SDK instance is created lazily and shared. To customize it — EU data residency, or relaxing eval-patching for a strict CSP — wrap your app in the provider:

```tsx
import { FriendlyCaptchaProvider } from "@nexumag/friendly-captcha";

<FriendlyCaptchaProvider options={{ apiEndpoint: "eu", disableEvalPatching: true }}>
  <App />
</FriendlyCaptchaProvider>;
```

You can also pass an `sdk` instance directly to the provider, hook, or component.

> [!NOTE]
>
> - **SSR / islands:** the component renders a placeholder element on the server and activates the widget on the client, so it's safe with Astro islands (`client:load`), Next, etc. — the SDK is never constructed during render.
> - **Security:** the API key is server-only. Only import `/server` on the server.
> - **CSP:** the SDK patches `window.eval`; set `disableEvalPatching: true` if your CSP forbids it (this can affect some dev hot-reload setups).
> - **Data residency:** set `apiEndpoint` on the widget **and** `endpoint` on the verify helper to `"eu"` for EU-only processing.
> - **TypeScript:** use `"moduleResolution": "bundler"` (the default for Vite/Astro/Next). The client entry re-exposes types from `@friendlycaptcha/sdk`, whose types are not resolvable under raw `node16`/`nodenext` resolution; the `/server` entry resolves cleanly everywhere.

## 🧪 Local development

```bash
npm install
npm run build       # build dist/ (ESM + CJS + types)
npm test            # vitest
npm run typecheck   # tsc --noEmit
npm run lint        # oxlint
npm run format      # oxfmt
```

Run the example (after building the library so its `dist/` exists):

```bash
npm run build
cd examples/astro
npm install         # links the library via file:../..
cp .env.example .env  # add your sitekey + API key
npm run dev
```

### Tech stack

- [**Vite**](https://vite.dev/) — library build (ESM + CJS + types) and the Vitest test runner.
- [**Vitest**](https://vitest.dev/) — unit tests, jsdom + Testing Library.
- [**oxc**](https://oxc.rs/) — `oxlint` for linting and `oxfmt` for formatting.
- Published to [**GitHub Packages**](https://docs.github.com/packages) on each GitHub release (the version is taken from the release tag).

## 🐾 Useful links

- [Friendly Captcha v2 docs](https://developer.friendlycaptcha.com/docs/v2)
- [Widget SDK reference](https://developer.friendlycaptcha.com/docs/v2/sdk/introduction)
- [siteverify API](https://developer.friendlycaptcha.com/docs/v2/api/siteverify)
- [`@friendlycaptcha/sdk` on npm](https://www.npmjs.com/package/@friendlycaptcha/sdk)

## 📄 License

Licensed under the Apache License, Version 2.0. See [LICENSE.md](./LICENSE.md).

Copyright © nexum AG and its associated companies.
