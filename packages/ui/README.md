# @clockwyrks/ui

The shared frontend library of The Test Cabinet's GUIs: the routed gallery
application, the presentational primitives and the transport-agnostic client
interfaces. What it holds and how a host mounts it is stated by the UI
library's overview in the superrepo's documentation,
`apps/docs/src/content/docs/components/ui/overview.md`.

## What is published

The package is published as its `dist/`: `npm run build` empties it, copies
every source file the TypeScript emit does not carry (the stylesheets, the
Markdown, the JSON, the images and the wasm) to the same relative path, and
emits the JavaScript and the declarations beside them. The entries are `.`,
`./app`, `./client`, `./routes`, `./transport` and `./tokens.css`.

The emitted modules keep the imports a bundler resolves: Sass stylesheets and
CSS modules, Vite's `?raw`, `?url` and `?worker` imports, and relative
specifiers without an extension. A host builds the package with Vite and installs `sass`,
which the package names as a peer.

## A Vite host

`vite build` needs nothing more. The development server's dependency
pre-bundling cannot take the package, because esbuild has no loader for a
`?raw` Markdown import and no default export for a `?worker` one, so a host
leaves the package out of it and pre-bundles the package's own CommonJS-reaching
dependencies instead, every bare specifier its `dist/` imports other than
the `@clockwyrks` packages and React:

```ts
optimizeDeps: {
  exclude: ["@clockwyrks/ui"],
  include: [
    "@clockwyrks/ui > @dnd-kit/core",
    "@clockwyrks/ui > @dnd-kit/modifiers",
    "@clockwyrks/ui > @dnd-kit/sortable",
    "@clockwyrks/ui > @dnd-kit/utilities",
    "@clockwyrks/ui > @observablehq/plot",
    "@clockwyrks/ui > @react-three/drei",
    "@clockwyrks/ui > @react-three/fiber",
    "@clockwyrks/ui > gifenc",
    "@clockwyrks/ui > highlight.js/lib/core",
    "@clockwyrks/ui > highlight.js/lib/languages/bash",
    "@clockwyrks/ui > highlight.js/lib/languages/css",
    "@clockwyrks/ui > highlight.js/lib/languages/ini",
    "@clockwyrks/ui > highlight.js/lib/languages/javascript",
    "@clockwyrks/ui > highlight.js/lib/languages/json",
    "@clockwyrks/ui > highlight.js/lib/languages/python",
    "@clockwyrks/ui > highlight.js/lib/languages/rust",
    "@clockwyrks/ui > highlight.js/lib/languages/scss",
    "@clockwyrks/ui > highlight.js/lib/languages/typescript",
    "@clockwyrks/ui > highlight.js/lib/languages/xml",
    "@clockwyrks/ui > highlight.js/lib/languages/yaml",
    "@clockwyrks/ui > react-icons/fa",
    "@clockwyrks/ui > react-markdown",
    "@clockwyrks/ui > react-router",
    "@clockwyrks/ui > react-toastify",
    "@clockwyrks/ui > react-virtuoso",
    "@clockwyrks/ui > remark-gfm",
    "@clockwyrks/ui > three",
    "@clockwyrks/ui > three/examples/jsm/utils/SkeletonUtils.js",
    "@clockwyrks/ui > zustand",
    "@clockwyrks/ui > zustand/middleware"
  ],
},
```

Vitest hands a package in `node_modules` to Node, whose ESM resolver refuses
the specifiers without an extension, so a host's tests inline it:
`server.deps.inline: [/\/node_modules\/@clockwyrks\//]`.
