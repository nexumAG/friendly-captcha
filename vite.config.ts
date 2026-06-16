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
      // Mirror the src tree into dist so the "./server" entry gets its own types.
      tsconfigPath: "./tsconfig.build.json",
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
      // Never bundle React or the SDK — they are peer dependencies.
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
  },
});
