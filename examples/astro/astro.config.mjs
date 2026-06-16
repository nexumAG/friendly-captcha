import react from "@astrojs/react";
import { defineConfig } from "astro/config";

// Actions run on the server, so the site is rendered on demand.
// For production you would add a deployment adapter (e.g. @astrojs/node).
export default defineConfig({
  output: "server",
  integrations: [react()],
});
