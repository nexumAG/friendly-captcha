# Changelog

All notable changes to this package are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Until
`1.0.0` the public API may still change between prereleases.

## [1.0.0-beta.7] - 2026-08-04

### Fixed

- **Types now resolve under `node16`/`nodenext` module resolution.** Declarations are
  emitted as one self-contained file per entry point, with the SDK's types inlined.
  Previously the emitted `.d.ts` re-exported types from `@friendlycaptcha/sdk`, which
  declares no `types` condition in its `exports` map: consumers on `nodenext` with
  `skipLibCheck: true` silently lost type safety on every SDK-derived type (they
  degraded to `any`), and with `skipLibCheck: false` got `TS2834` errors from the
  extensionless relative imports in the declarations.
- **Releases publish again.** The publish workflow still targeted GitHub Packages under
  the pre-rename `@nexumag` scope, so every release since `1.0.0-beta.4` failed. It now
  publishes to the public npm registry using trusted publishing (OIDC), which also
  attaches a provenance attestation. Requires a trusted publisher to be configured for
  this repository on npm.
- The Astro example imported the pre-rename `@nexumag/friendly-captcha` and could not be
  installed. It now uses `@nexum-ag/friendly-captcha` and is typechecked in CI.

### Changed

- **`WidgetHandle` and `FriendlyCaptchaSDK` are now structural interfaces** declared by
  this package rather than re-exports of the SDK's classes. Both SDK classes have
  `private` members, and TypeScript compares such classes nominally, so inlining their
  declarations would have rejected an SDK instance constructed by the consumer. An
  instance you create from `@friendlycaptcha/sdk` remains assignable to both. The Risk
  Intelligence API and the internal `setState` escape hatch are not covered — import
  `@friendlycaptcha/sdk` directly for those.

  The compatibility is one-way. Values this package hands back — `getSharedSdk()`, the
  hook's `widget` — are no longer assignable to the SDK's own `FriendlyCaptchaSDK` and
  `WidgetHandle` types, because private members can only be satisfied by the class that
  declares them. If you annotate against those SDK types you'll get `TS2740` naming the
  same type on both sides; add a cast
  (`as unknown as import("@friendlycaptcha/sdk").WidgetHandle`), or construct the SDK
  yourself and keep your own reference.

- `@friendlycaptcha/sdk` is now a caret range (`^1.0.2`) instead of an exact pin, so it
  deduplicates with a consumer's own copy. Two copies of the SDK means two background
  agent iframes on the page.
- **`engines.node` raised from `>=20` to `>=22`.** Node 20 reached end-of-life on
  2026-04-30. CI runs on Node 22 (maintenance LTS) and 24 (active LTS).

### Removed

- `useSdkResolver` and the `SdkResolver` type are no longer exported. They are internal
  plumbing for resolving an SDK instance, not public API.

### Added

- `npm run check:pkg` — validates the published package shape with
  [publint](https://publint.dev) and type resolution with
  [`@arethetypeswrong/cli`](https://arethetypeswrong.github.io). Runs in CI and before
  every publish. `node10` resolution is intentionally not checked; this package requires
  Node 22+ and React 19.
- `npm run test:coverage`.
- `WidgetResetOptions` is now exported from the package entry point. It is the parameter
  type of the public `WidgetHandle.reset()`, and with the SDK's types inlined this
  package is the only place a consumer can import it from.

## [1.0.0-beta.6] - 2026-06-18

### Changed

- Renamed the package from `@nexumag/friendly-captcha` to `@nexum-ag/friendly-captcha` to
  match the organisation's npm scope.
- Renamed `LICENSE.md` to `LICENSE` and added the unaffiliated-with-Friendly-Captcha
  disclaimer.

## [1.0.0-beta.1] - 2026-06-16

### Added

- Initial release: the `<FriendlyCaptcha>` component, the `useFriendlyCaptcha` headless
  hook, `FriendlyCaptchaProvider` for sharing a configured SDK instance, and the
  runtime-agnostic `verifyCaptchaResponse` helper on the `/server` entry point.

[unreleased]: https://github.com/nexumAG/friendly-captcha/compare/v1.0.0-beta.7...HEAD
[1.0.0-beta.7]: https://github.com/nexumAG/friendly-captcha/compare/v1.0.0-beta.6...v1.0.0-beta.7
[1.0.0-beta.6]: https://github.com/nexumAG/friendly-captcha/compare/v1.0.0-beta.1...v1.0.0-beta.6
[1.0.0-beta.1]: https://github.com/nexumAG/friendly-captcha/releases/tag/v1.0.0-beta.1
