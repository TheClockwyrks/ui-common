// @vitest-environment node

// The README hands a Vite host the list of this package's dependencies to
// pre-bundle, because the host leaves the package itself out of pre-bundling.
// A dependency the list misses is served to the browser unbundled, and a
// CommonJS one then fails to load in the host's development server only, so
// the list is held here to the bare specifiers the published modules import.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { expect, it } from "vitest";

const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Every source the build emits: the TypeScript under `src/` but the tests. */
function emitted(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (path !== join(pkg, "src", "test")) out.push(...emitted(path));
    } else if (
      /\.tsx?$/.test(entry.name) &&
      !entry.name.endsWith(".d.ts") &&
      !/\.test\.tsx?$/.test(entry.name) &&
      entry.name !== "recordingParitySuite.ts"
    ) {
      out.push(path);
    }
  }
  return out;
}

/** Whether a host's own scan already reaches `specifier`, or it is no module. */
function excluded(specifier: string): boolean {
  return (
    specifier.startsWith("@clockwyrks/") ||
    specifier.startsWith("@fontsource") ||
    /^react(?:-dom)?(?:\/|$)/.test(specifier) ||
    /\.s?css$/.test(specifier)
  );
}

/**
 * Where the last module name that could be a bare specifier ends in `text`, or
 * `undefined` when it names none.
 *
 * Parsing every emitted module in full is most of this test's time, and the
 * coverage run instruments the compiler so that it costs several times more,
 * which is time a loaded machine stretches past the test's timeout. A
 * declaration naming a module spells `from` or `import` before the quoted
 * name, so a match of the pattern below is found for every one the parse
 * could reach (and for some string that merely reads like one, which only
 * parses more). A file with no candidate is skipped, and the rest is parsed
 * only up to its last candidate, since a declaration ends with its module
 * name but for attributes, which do not make it type-only.
 */
function candidatesEnd(text: string): number | undefined {
  let end: number | undefined;
  for (const match of text.matchAll(
    /\b(?:from|import)(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*\n)*["']([^"'\n]+)["']/g,
  )) {
    const name = match[1];
    if (!name.startsWith(".") && !excluded(name)) {
      end = match.index + match[0].length;
    }
  }
  return end;
}

it("names every bare specifier the published modules import", () => {
  const imported = new Set<string>();
  for (const file of emitted(join(pkg, "src"))) {
    const text = readFileSync(file, "utf8");
    const end = candidatesEnd(text);
    if (end === undefined) continue;
    const source = ts.createSourceFile(
      file,
      text.slice(0, end),
      ts.ScriptTarget.Latest,
    );
    for (const statement of source.statements) {
      // A type-only import or export is erased by the emit and reaches no
      // browser.
      let specifier: ts.Expression | undefined;
      if (ts.isImportDeclaration(statement)) {
        if (statement.importClause?.isTypeOnly) continue;
        specifier = statement.moduleSpecifier;
      } else if (ts.isExportDeclaration(statement)) {
        if (statement.isTypeOnly) continue;
        specifier = statement.moduleSpecifier;
      }
      if (specifier === undefined || !ts.isStringLiteral(specifier)) continue;
      const name = specifier.text;
      if (!name.startsWith(".") && !excluded(name)) imported.add(name);
    }
  }

  const readme = readFileSync(join(pkg, "README.md"), "utf8");
  const listed = new Set(
    [...readme.matchAll(/"@clockwyrks\/ui > ([^"]+)"/g)].map((m) => m[1]),
  );

  expect([...listed].sort()).toEqual([...imported].sort());
});
