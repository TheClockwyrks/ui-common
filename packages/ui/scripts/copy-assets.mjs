// Copies every source file the TypeScript emit does not carry into `dist/`.
//
// `@clockwyrks/ui` is published as its `dist/`: `tsc` writes the JavaScript and
// the declarations, and this copies everything else the emitted modules import —
// the stylesheets (`.scss`, `.css`), the Markdown the About pages read with
// `?raw`, the JSON, the images and the wasm — to the same relative path under
// `dist/`, so each emitted import still names a file beside it and the consuming
// application's bundler resolves it as it resolved the source. A TypeScript file
// (`.ts`, `.tsx`, the ambient `.d.ts` included) is the emit's to write and is
// never copied.
//
// Run from the package directory (`npm run build` does): it empties `dist/`
// first, so a file removed from `src/` does not linger in the next tarball.

import { cpSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Whether `name` is a TypeScript source, which the emit handles. */
export function isTypeScript(name) {
  return /\.(?:ts|tsx|mts|cts)$/.test(name);
}

/** Every file under `dir`, as paths relative to it, in a stable order. */
function walk(dir, base = dir) {
  const out = [];
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path, base));
    else if (entry.isFile()) out.push(relative(base, path));
  }
  return out;
}

/**
 * Copies every non-TypeScript file under `srcDir` to the same relative path
 * under `outDir`, and returns the relative paths it copied.
 *
 * With `clean`, `outDir` is removed first.
 */
export function copyAssets(srcDir, outDir, { clean = false } = {}) {
  if (clean) rmSync(outDir, { recursive: true, force: true });
  const copied = [];
  for (const path of walk(srcDir)) {
    if (isTypeScript(path)) continue;
    const to = join(outDir, path);
    mkdirSync(dirname(to), { recursive: true });
    cpSync(join(srcDir, path), to);
    copied.push(path);
  }
  return copied;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const pkg = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const clean = process.argv.includes("--clean");
  const copied = copyAssets(join(pkg, "src"), join(pkg, "dist"), { clean });
  console.log(`copied ${copied.length} asset file(s) into dist/`);
}
