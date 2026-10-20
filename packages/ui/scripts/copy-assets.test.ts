// @vitest-environment node

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { copyAssets, isTypeScript } from "./copy-assets.mjs";

const roots: string[] = [];

function scratch(): string {
  const root = mkdtempSync(join(tmpdir(), "ui-copy-assets-"));
  roots.push(root);
  return root;
}

function write(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("isTypeScript", () => {
  it("names the sources the emit writes, declarations included", () => {
    for (const name of ["a.ts", "a.tsx", "a.d.ts", "a.mts", "a.cts"]) {
      expect(isTypeScript(name)).toBe(true);
    }
    for (const name of [
      "a.scss",
      "a.module.scss",
      "a.css",
      "a.md",
      "a.json",
      "a.png",
      "a.jpg",
      "a.svg",
      "a.wasm",
      "a.tsv",
    ]) {
      expect(isTypeScript(name)).toBe(false);
    }
  });
});

describe("copyAssets", () => {
  it("copies every non-TypeScript file to the same relative path", () => {
    const root = scratch();
    const src = join(root, "src");
    const out = join(root, "dist");
    write(join(src, "index.ts"), "export {};");
    write(join(src, "env.d.ts"), "declare module '*.scss';");
    write(join(src, "app", "App.tsx"), "export {};");
    write(join(src, "app", "App.module.scss"), ".a { color: red; }");
    write(join(src, "styles", "tokens.css"), ":root {}");
    write(join(src, "about", "about.md"), "# About");
    write(join(src, "assets", "sheet.json"), "{}");
    write(join(src, "assets", "sheet.png"), "png");
    write(join(src, "assets", "core.wasm"), "wasm");

    const copied = copyAssets(src, out);

    expect(copied).toEqual([
      join("about", "about.md"),
      join("app", "App.module.scss"),
      join("assets", "core.wasm"),
      join("assets", "sheet.json"),
      join("assets", "sheet.png"),
      join("styles", "tokens.css"),
    ]);
    for (const path of copied) {
      expect(readFileSync(join(out, path), "utf8")).toBe(
        readFileSync(join(src, path), "utf8"),
      );
    }
    expect(existsSync(join(out, "index.ts"))).toBe(false);
    expect(existsSync(join(out, "env.d.ts"))).toBe(false);
    expect(existsSync(join(out, "app", "App.tsx"))).toBe(false);
  });

  it("empties the output first when asked, so a removed source does not linger", () => {
    const root = scratch();
    const src = join(root, "src");
    const out = join(root, "dist");
    write(join(src, "kept.scss"), ".k {}");
    write(join(out, "stale.scss"), ".s {}");
    write(join(out, "stale.js"), "");

    copyAssets(src, out, { clean: true });

    expect(existsSync(join(out, "kept.scss"))).toBe(true);
    expect(existsSync(join(out, "stale.scss"))).toBe(false);
    expect(existsSync(join(out, "stale.js"))).toBe(false);
  });

  it("leaves the output alone without clean", () => {
    const root = scratch();
    const src = join(root, "src");
    const out = join(root, "dist");
    write(join(src, "kept.scss"), ".k {}");
    write(join(out, "index.js"), "");

    copyAssets(src, out);

    expect(existsSync(join(out, "index.js"))).toBe(true);
    expect(existsSync(join(out, "kept.scss"))).toBe(true);
  });
});
