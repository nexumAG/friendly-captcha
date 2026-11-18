import node from "@astrojs/node";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";

// Actions run on the server, so the site is rendered on demand.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
});
