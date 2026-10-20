import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Component tests for the shared gallery app run under jsdom with the React
// plugin (so JSX/Fast-Refresh-free transforms work). SCSS modules are stubbed —
// see `src/test/setup.ts` — since these tests assert behavior, not styling.
//
// The project's own packages (the contracts and engines packages from the feed)
// are inlined rather than handed to Node: their `dist/` is built for a bundler,
// with extensionless relative imports Node's ESM resolver refuses, so they go
// through Vite's resolver as they do in every application that bundles them.
//
// Vite's file-system guard is off. It refuses to load a file outside the
// workspace root, and a producer linked in place of its feed version (the
// superrepo's sibling contracts and engines checkouts, scripts/repos/
// link-packages.sh) lies outside this repository, so an asset a test imports
// from one, such as the lattice runtime's `lattice-core.wasm?url`, would be
// refused. The guard protects a development server from the network; the
// tests serve nothing.
export default defineConfig({
  plugins: [react()],
  server: { fs: { strict: false } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    server: { deps: { inline: [/\/node_modules\/@clockwyrks\//] } },
  },
});
