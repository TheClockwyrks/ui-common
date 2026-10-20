# history

The record of how this repository's history was extracted from the monorepo,
[The Test Cabinet](https://github.com/TheClockwyrks/TheTestCabinet), where the
packages here lived until the extraction. Nothing builds or tests against these
files; they are kept so the provenance outlives the scratch clone the
extraction ran in.

## The extraction

The history below the scaffold commit is the monorepo's `nightly` at
`4ad039d7df29a5fcce45e88462b521fc354a5337`, filtered to the paths in
[`paths.txt`](paths.txt) by git filter-repo 2.47.0:

```sh
git clone -q --no-local --no-checkout --single-branch --branch nightly --no-tags \
  <the-test-cabinet> x
cd x
uvx --from git-filter-repo==2.47.0 git-filter-repo --force \
  --paths-from-file ../paths.txt --prune-empty always --preserve-commit-hashes
```

Of the 6,963 commits reachable from that commit, 940 touched a path in the list
and were kept (90 of them merges); the rest were pruned. No tag was carried. The
tip tree of both moved directories hashes the same as the monorepo's at that
commit.

The paths are kept where they were in the monorepo, so the filter needed no
rename and every relative path inside the packages works as it did.

## The files

- [`paths.txt`](paths.txt) is the list handed to `--paths-from-file`
  (sha256 `ea06677416aa7baff47412ad3a55404f51d3d8407a5a04441033c4bd1682d823`).
  It is generated, not hand-written: the two moved directories
  (`packages/ui/` and `packages/run-stats/`), and every path a tracked file
  under them had before a rename or copy, collected by
  `git log --follow --name-status` over each of the 903 files, so a file's
  history reaches back past the commits that moved it into place. The earlier
  paths are the gallery's components, pages and layouts under `apps/site/`, the
  console's and the desktop app's files under `apps/web/` and `apps/desktop/`,
  the `package.json` and `tsconfig.json` of `packages/voxel-runtime/`,
  `packages/particle-runtime/` and `packages/run-record/` that run-stats' own
  began as copies of, and the lattice scenario cases under `test-cases/` the
  reference scenarios were vendored from.
- [`commit-map`](commit-map) is filter-repo's map from each monorepo commit (left)
  to the commit it became here (right), all zeros for a pruned one.
  `--preserve-commit-hashes` left the commit ids quoted in the messages as they
  were, so an id in a message below the scaffold commit names a monorepo commit,
  and this map translates it.

## The live-path review

`paths.txt` intersected with the monorepo's tree at the extraction commit names,
outside the two moved directories, no live file: every earlier path in the list
had been renamed or deleted by then. So the history carries no commit after a
copy that touched the monorepo's own copy alone, and the scaffold commit
deletes nothing.
