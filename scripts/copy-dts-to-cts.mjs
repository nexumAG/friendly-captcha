// vite-plugin-dts only emits `.d.ts`, but `require()` on node16/nodenext resolution
// needs a matching `.d.cts`. A plain copy is valid because `bundleTypes` leaves no
// imports in the emitted declarations for the extension to matter to.
import { cp, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.name.endsWith(".d.ts")) {
      yield full;
    }
  }
}

for await (const file of walk(distDir)) {
  await cp(file, file.replace(/\.d\.ts$/, ".d.cts"));
}
