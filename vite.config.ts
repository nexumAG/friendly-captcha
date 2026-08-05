/// <reference types="vitest/config" />
import preserveDirectives from "rollup-preserve-directives";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    // Keeps the "use client" banner on the client chunk so the package can be
    // imported from React Server Component environments.
    preserveDirectives(),
    dts({
      include: ["src"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/__tests__/**"],
      tsconfigPath: "./tsconfig.build.json",
      // One self-contained .d.ts per entry, with the SDK's types inlined.
      // @friendlycaptcha/sdk declares no "types" condition in its exports map, so any
      // `from "@friendlycaptcha/sdk"` left in our declarations is unresolvable for
      // consumers on node16/nodenext.
      bundleTypes: {
        bundledPackages: ["@friendlycaptcha/sdk"],
      },
    }),
  ],
  build: {
    sourcemap: true,
    minify: false,
    lib: {
      entry: {
        index: "src/index.ts",
        "server/index": "src/server/index.ts",
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format === "es" ? "js" : "cjs"}`,
    },
    rollupOptions: {
      // React is a peer dependency and the SDK a runtime one; bundling either would
      // duplicate it (two SDK copies means two background agent iframes).
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@friendlycaptcha/sdk",
      ],
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      include: ["src/**"],
      exclude: ["src/**/__tests__/**"],
    },
  },
});
