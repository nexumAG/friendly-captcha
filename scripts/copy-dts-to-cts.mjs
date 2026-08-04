// vite-plugin-dts only emits `.d.ts`. For correct types under Node16/NodeNext
// module resolution when consumers `require()` the CJS build, we also need
// matching `.d.cts` files. `bundleTypes` (see vite.config.ts) emits one
// self-contained file per entry with no relative or external imports left in it,
// so a 1:1 copy is valid for both the ESM (`.d.ts`) and CJS (`.d.cts`) entries.
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
