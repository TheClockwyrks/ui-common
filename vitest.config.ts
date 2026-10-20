// The workspace's tests: every package's own suite, each run as a vitest project
// under the package's own configuration (jsdom with the React plugin for
// `@clockwyrks/ui`, node for `@clockwyrks/run-stats`), so one run from the root
// covers them all and writes one report.
//
// The projects are named rather than globbed, so a directory under packages/ that
// is not a package is no project. A package with a configuration of its own is
// named by that file; one without is named by its directory.
//
// Given CI_GATE_ARTIFACTS (the typescript gate sets it), the run writes the JUnit
// report and the coverage summary into that directory, as ci/README.md names
// them; without it, it writes neither.
import { defineConfig } from "vitest/config";

const artifacts = process.env.CI_GATE_ARTIFACTS;

export default defineConfig({
  test: {
    projects: ["packages/run-stats", "packages/ui/vitest.config.ts"],
    ...(artifacts
      ? {
          reporters: ["default", "junit"],
          outputFile: { junit: `${artifacts}/junit.xml` },
          coverage: {
            enabled: true,
            provider: "v8",
            reporter: ["json-summary"],
            reportsDirectory: artifacts,
            include: ["packages/*/src/**/*.{ts,tsx}"],
          },
        }
      : {}),
  },
});
