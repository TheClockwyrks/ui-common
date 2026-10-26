import { describe, expect, it } from "vitest";

import { runShareLinks } from "./share-links";

describe("runShareLinks", () => {
  it("builds the verdict and play links on the share origin", () => {
    expect(runShareLinks("https://tcab.ai", "d483a2f9")).toEqual({
      verdict: "https://tcab.ai/r/d483a2f9",
      play: "https://tcab.ai/p/d483a2f9",
    });
  });

  it("drops a trailing slash from the origin", () => {
    expect(runShareLinks("https://staging.tcab.ai/", "d483a2f9")?.verdict).toBe(
      "https://staging.tcab.ai/r/d483a2f9",
    );
  });

  it("offers nothing for a run with no code", () => {
    expect(runShareLinks("https://tcab.ai", undefined)).toBeNull();
    expect(runShareLinks("https://tcab.ai", "")).toBeNull();
  });

  it("offers nothing for a build with no share origin", () => {
    expect(runShareLinks(undefined, "d483a2f9")).toBeNull();
    expect(runShareLinks(null, "d483a2f9")).toBeNull();
    expect(runShareLinks("", "d483a2f9")).toBeNull();
  });
});
