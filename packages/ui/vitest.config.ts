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
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    server: { deps: { inline: [/\/node_modules\/@clockwyrks\//] } },
  },
});
