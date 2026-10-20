// Where the contract fixtures are, for the tests that hold a TypeScript mirror to
// them: the scoring goldens of `@clockwyrks/run-stats` and the gg query
// conformance suite of `@clockwyrks/ui`.
//
// The fixtures belong to the `test-cabinet-contracts` crate of the contracts
// repository, and this repository reads them off that crate at the version it
// pins, never off a copy: the crate is a dev-dependency of the workspace's own
// crate (crates/ui-common), and `cargo metadata` says where Cargo put it. On its
// own that is the git checkout of the tag the root Cargo.toml names; inside the
// superrepo, whose `.cargo/config.toml` patches the source to the sibling
// checkout, it is `contracts/` beside this repository. Either way the Rust half
// and the TypeScript half of a mirrored rule read the same files.
//
// A fixture that cannot be found fails the test asking for it. A suite that
// skipped would stay green while asserting nothing, which is worse than no suite.
import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The crate the fixtures belong to. */
const CRATE = "test-cabinet-contracts";

/** This repository's workspace manifest, which takes the crate up. */
const MANIFEST = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../Cargo.toml",
);

/** The fixtures directory, located once per test worker. */
let located: string | undefined;

interface Metadata {
  packages: { name: string; version: string; manifest_path: string }[];
}

/** The crate's `fixtures/` directory, as `cargo metadata` places the crate. */
function locate(): string {
  let output: string;
  try {
    output = execFileSync(
      "cargo",
      ["metadata", "--format-version", "1", "--manifest-path", MANIFEST],
      {
        encoding: "utf8",
        maxBuffer: 256 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch (error) {
    throw new Error(
      `\`cargo metadata --manifest-path ${MANIFEST}\` failed, so the ${CRATE} fixtures cannot be found: ${String(error)}`,
      { cause: error },
    );
  }
  const metadata = JSON.parse(output) as Metadata;
  const crates = metadata.packages.filter(({ name }) => name === CRATE);
  const [crate] = crates;
  if (crate === undefined || crates.length > 1) {
    throw new Error(
      `cargo metadata lists ${String(crates.length)} ${CRATE} packages, where the workspace takes exactly one up.`,
    );
  }
  const directory = join(dirname(crate.manifest_path), "fixtures");
  if (!statSync(directory, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(
      `${CRATE} ${crate.version} at ${dirname(crate.manifest_path)} has no fixtures/ directory.`,
    );
  }
  return directory;
}

/**
 * The path of a file or directory under the contract fixtures, which must exist.
 *
 * @param segments The path under `fixtures/`, one segment per argument.
 */
export function contractsFixture(...segments: string[]): string {
  located ??= locate();
  const path = join(located, ...segments);
  if (!existsSync(path)) {
    throw new Error(
      `${join("fixtures", ...segments)} is not among the ${CRATE} fixtures at ${located}.`,
    );
  }
  return path;
}
