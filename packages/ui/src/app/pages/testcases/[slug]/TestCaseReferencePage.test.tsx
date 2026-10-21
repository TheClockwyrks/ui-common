import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { type ReactNode, useEffect } from "react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { TestCaseDetail, VariantSummary } from "../../../data/testCases";
import { routePatterns, routes } from "../../../routes";
import { TestCaseReferencePage } from "./TestCaseReferencePage";

// The detail layout's chrome pulls in PageLayout (backdrop/prompt contexts) that
// are irrelevant here; stub it to a bare wrapper.
vi.mock("../../../components/PageLayout", () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

// The catalog is injected through `useTestCase`; mock it so each test seeds an
// exact fixture. The gallery data is read by the layout (run/arena affordances
// and the coordinate resolver) and the sheet view (the reference-media
// resolver), so it is stubbed per test — a host with no media resolver at all is
// a case the view must handle, and a NEW `fetchCaseVariant` per test keeps the
// layout's per-resolver resolution cache from leaking between tests.
const catalog = vi.fn<() => { testCases: TestCaseDetail[]; status: string }>();
// The layout resolves the case it is about through `useTestCase` (a per-slug
// fetch), so the stub answers from the fixture catalog each test seeds — the same
// lookup the real hook performs against the host.
vi.mock("../../../data/useTestCase", () => ({
  useTestCase: (slug: string | undefined) => {
    const { testCases, status } = catalog();
    return { testCase: testCases.find((c) => c.slug === slug), status };
  },
}));
const galleryData = vi.fn();
vi.mock("../../../data/galleryContext", () => ({
  useGalleryData: () => galleryData(),
}));

// Resolve reference media the way a configured host does: the deterministic layout
// from `contracts/crates/contracts/src/asset_reference.rs`, rooted at a snapshot base.
const referenceMediaUrl = (
  slug: string,
  version: string,
  variant: string,
  file: string,
) =>
  `https://snap.example/media/references/${slug}/${version}/${variant}/${file}`;

function variant(extra: Partial<VariantSummary> = {}): VariantSummary {
  return {
    slug: "base",
    name: "Base",
    referenceBuilds: {},
    referenceSheet: null,
    ...extra,
  } as VariantSummary;
}

// The gallery-data stub for one test: the affordance flags, a fresh coordinate
// resolver, and (optionally) the media resolver. The resolver's answer is held
// back until the test releases it. Between the resolution and what a test
// asserts lie several hops React schedules (the layout's state update, the
// redirect's `<Navigate>` effect, the router's location update), so a test
// that polls for the outcome races those hops against a timer and fails when
// the process stalls past it. Releasing the answer inside `act` drains every
// hop before `act` returns, so the outcome is asserted synchronously and no
// timer is involved.
function seedGalleryData(extra: Record<string, unknown> = {}) {
  let release!: (resolved: VariantSummary) => void;
  // The workspace's `lib` predates ES2024, so `Promise.withResolvers` is not typed.
  // eslint-disable-next-line unicorn/prefer-promise-with-resolvers
  const answer = new Promise<VariantSummary>((resolve) => {
    release = resolve;
  });
  const fetchCaseVariant = vi.fn(() => answer);
  galleryData.mockReturnValue({
    canExecute: false,
    arena: undefined,
    fetchCaseVariant,
    ...extra,
  });
  return { answer, release, fetchCaseVariant };
}

// A catalog entry carrying only the fields the Reference tab and its layout read.
function testCase(extra: Partial<TestCaseDetail> = {}): TestCaseDetail {
  return {
    slug: "lattice-belt",
    name: "Lattice Belt",
    testType: "asset-generation",
    difficulty: "medium",
    tags: [],
    summary: null,
    description: null,
    versions: ["v1.0.0"],
    latestVersion: "v1.0.0",
    variants: [variant()],
    variantsByVersion: { "v1.0.0": [{ slug: "base", name: "Base" }] },
    enginesByVersion: { "v1.0.0": ["none"] },
    changelog: [],
    errata: [],
    sheet: {
      frameWidth: 32,
      frameHeight: 32,
      frames: [0, 1],
      sequences: [{ slug: "run", name: "Run", frames: [0, 1], fps: 8 }],
    },
    ...extra,
  } as TestCaseDetail;
}

// Where a sheetless coordinate's redirect lands: the detail landing route,
// probed so a test can assert both the arrival and that the query string (the
// anchored coordinate) survived the hop.
function LandingProbe() {
  const { search } = useLocation();
  return <p>landing{search}</p>;
}

// Every location the router commits, with how it got there, so a test observes
// the navigation the page performs rather than only where it ends up.
interface Navigation {
  action: string;
  path: string;
}

function NavigationLog({ into }: { into: Navigation[] }) {
  const location = useLocation();
  const action = useNavigationType();
  useEffect(() => {
    into.push({ action, path: location.pathname + location.search });
  }, [into, action, location]);
  return null;
}

// Render the tab for a coordinate the resolver answers with `resolved`: assert
// the layout holds the body while the coordinate is unresolved, then release
// the answer inside `act` (see `seedGalleryData`). Returns the router's
// navigation log.
async function renderResolved(
  resolved: VariantSummary,
  {
    search = "",
    slug = "lattice-belt",
    gallery = {},
  }: { search?: string; slug?: string; gallery?: Record<string, unknown> } = {},
) {
  const { answer, release, fetchCaseVariant } = seedGalleryData(gallery);
  const navigations: Navigation[] = [];
  render(
    <MemoryRouter initialEntries={[routes.testCaseReference(slug) + search]}>
      <NavigationLog into={navigations} />
      <Routes>
        <Route
          path={routePatterns.testCaseReference}
          element={<TestCaseReferencePage />}
        />
        <Route path={routePatterns.testCaseDetail} element={<LandingProbe />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(fetchCaseVariant).toHaveBeenCalled();
  expect(screen.getByText("Loading test case…")).toBeInTheDocument();
  expect(screen.queryByText(/^landing/)).toBeNull();

  await act(async () => {
    release(resolved);
    await answer;
  });
  return { navigations };
}

describe("TestCaseReferencePage", () => {
  it("renders the published frames and their action logs for an asset case", async () => {
    catalog.mockReturnValue({ testCases: [testCase()], status: "ready" });
    await renderResolved(variant({ referenceSheet: { frames: [0, 1] } }), {
      gallery: { referenceMediaUrl },
    });

    // One image per published frame, at the deterministic key.
    const frame0 = screen.getByAltText("Reference frame 0") as HTMLImageElement;
    expect(frame0.src).toBe(
      "https://snap.example/media/references/lattice-belt/v1.0.0/base/frames/0.png",
    );
    expect(screen.getByAltText("Reference frame 1")).toBeInTheDocument();

    // The action log — the output a run is actually scored on — is reachable from
    // every frame, at its own key beside the image.
    const logs = screen.getAllByRole("link", { name: "log" });
    expect(logs).toHaveLength(2);
    expect(logs[0]!.getAttribute("href")).toBe(
      "https://snap.example/media/references/lattice-belt/v1.0.0/base/frames/0.actions.json",
    );

    // The case's own sheet spec supplies the sequences, so the motion is played
    // rather than only listed.
    expect(screen.getByLabelText("Run")).toBeInTheDocument();
    expect(screen.getByText("Run")).toBeInTheDocument();

    // A published sheet is a reference in its own right, so the layout offers the
    // tab off that signal alone — no `referenceBuilds` involved.
    expect(screen.getByRole("link", { name: "Reference" })).toBeInTheDocument();
  });

  it("resolves the frames under the ANCHORED version, not the latest", async () => {
    // A reference is published per case version, so anchoring an older version
    // must fetch that version's objects — the latest version's frames belong to
    // a different deliverable.
    catalog.mockReturnValue({
      testCases: [
        testCase({
          versions: ["v1.1.0", "v1.0.0"],
          latestVersion: "v1.1.0",
          variantsByVersion: {
            "v1.1.0": [{ slug: "base", name: "Base" }],
            "v1.0.0": [{ slug: "base", name: "Base" }],
          },
          enginesByVersion: { "v1.1.0": ["none"], "v1.0.0": ["none"] },
        }),
      ],
      status: "ready",
    });
    await renderResolved(variant({ referenceSheet: { frames: [0] } }), {
      search: "?version=v1.0.0",
      gallery: { referenceMediaUrl },
    });

    const frame0 = screen.getByAltText("Reference frame 0") as HTMLImageElement;
    expect(frame0.src).toBe(
      "https://snap.example/media/references/lattice-belt/v1.0.0/base/frames/0.png",
    );
  });

  it("degrades to a placeholder when the host serves no reference media", async () => {
    catalog.mockReturnValue({ testCases: [testCase()], status: "ready" });
    // A host with no snapshot bucket wired up supplies no resolver at all.
    await renderResolved(variant({ referenceSheet: { frames: [0] } }));

    expect(screen.getByText(/not available here/)).toBeInTheDocument();
    expect(screen.queryByAltText("Reference frame 0")).toBeNull();
  });

  it("shows the frames without animations when the host omits the sheet spec", async () => {
    // The static snapshot may not carry the case's `[sheet]`; the frames still
    // stand on their own, they just cannot be played as sequences.
    catalog.mockReturnValue({
      testCases: [testCase({ sheet: null })],
      status: "ready",
    });
    await renderResolved(variant({ referenceSheet: { frames: [0, 1] } }), {
      gallery: { referenceMediaUrl },
    });

    expect(screen.getByAltText("Reference frame 0")).toBeInTheDocument();
    expect(screen.queryByText("Animated sequences")).toBeNull();
  });

  it("redirects a builds-only variant to the detail landing, keeping the anchor", async () => {
    // A deployed reference BUILD no longer has a tab of its own — it folds into
    // the landing tab's Play surface — so a hand-typed /reference URL (or a
    // variant switch to a builds-only coordinate) lands there, with the query
    // string (the anchored coordinate) intact.
    catalog.mockReturnValue({
      testCases: [
        testCase({
          testType: "end-to-end",
          sheet: null,
          enginesByVersion: { "v1.0.0": ["none", "simple-2d"] },
        }),
      ],
      status: "ready",
    });
    const { navigations } = await renderResolved(
      variant({
        referenceBuilds: {
          "simple-2d": "https://ref.example/carom/base/simple-2d/",
        },
      }),
      { search: "?engine=simple-2d" },
    );

    expect(screen.getByText("landing?engine=simple-2d")).toBeInTheDocument();
    expect(document.querySelector("iframe")).toBeNull();
    // One hop, replacing the /reference entry rather than stacking on it.
    expect(navigations).toEqual([
      {
        action: "POP",
        path: "/test-cases/lattice-belt/reference?engine=simple-2d",
      },
      { action: "REPLACE", path: "/test-cases/lattice-belt?engine=simple-2d" },
    ]);
  });

  it("plays the scored factories through the reference engine for the performance case", async () => {
    // A performance case produces an engine, not a page or an image, so its
    // reference is what the authoritative engine does — and it ships with the
    // bundle rather than being published, so no variant signal and no host media
    // resolver is involved.
    catalog.mockReturnValue({
      testCases: [
        testCase({
          slug: "lattice",
          name: "Lattice",
          testType: "performance",
          difficulty: "hard",
          sheet: null,
        }),
      ],
      status: "ready",
    });
    await renderResolved(variant(), { slug: "lattice" });

    // All three factories, each launchable, each labelled by scale and grid — and
    // nothing else. The tab is the reference, so the rows carry no prose.
    const play = screen.getAllByRole("button", { name: "▶ Play" });
    expect(play).toHaveLength(3);
    expect(screen.getByText("Small — 24×12")).toBeInTheDocument();
    expect(screen.getByText("Medium — 48×32")).toBeInTheDocument();
    expect(screen.getByText("Large — 72×40")).toBeInTheDocument();

    // The tab is offered off the CASE alone — this variant declares neither of the
    // published reference signals, so the layout and the page have to agree that a
    // bundled playback is a reference in its own right.
    expect(screen.getByRole("link", { name: "Reference" })).toBeInTheDocument();

    // Nothing plays until asked: stepping a factory builds thousands of frames.
    expect(
      screen.queryByRole("dialog", { name: "Factory playback" }),
    ).toBeNull();
    fireEvent.click(play[2]!);
    const player = screen.getByRole("dialog", { name: "Factory playback" });
    // The player carries the same name that was clicked, so a full-viewport player
    // is still identifiable.
    expect(within(player).getByText("Large — 72×40")).toBeInTheDocument();

    // The player then goes off to fetch the vendored engine and scenario, which
    // jsdom cannot serve (there is no canvas or wasm here either — that stack is
    // covered by `renderer.integration.test.ts` against the real engine). Let that
    // failure land inside the test rather than after it, and assert the player
    // reports it instead of hanging on a blank canvas.
    await waitFor(() =>
      expect(
        within(player).getByText(/Could not play this scenario/),
      ).toBeInTheDocument(),
    );
  });

  it("offers no reference playback for a performance case the bundle has no factories for", async () => {
    // The scenarios are vendored for one case at build time, so a future
    // performance case must not be handed Lattice's factories. It falls through to
    // the ordinary per-variant signals, has neither, and so redirects to the
    // landing exactly like any other coordinate with nothing to show.
    catalog.mockReturnValue({
      testCases: [
        testCase({
          slug: "some-other-performance-case",
          testType: "performance",
          sheet: null,
        }),
      ],
      status: "ready",
    });
    const { navigations } = await renderResolved(variant(), {
      slug: "some-other-performance-case",
    });

    expect(screen.getByText("landing")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "▶ Play" })).toBeNull();
    expect(navigations).toEqual([
      {
        action: "POP",
        path: "/test-cases/some-other-performance-case/reference",
      },
      { action: "REPLACE", path: "/test-cases/some-other-performance-case" },
    ]);
  });

  it("redirects to the detail landing when the variant declares no reference at all", async () => {
    // Only reachable by hand-typed URL (the layout offers no tab), but it must
    // not dead-end on an empty page — which is also what a backend old enough to
    // send no `referenceSheet` field produces.
    catalog.mockReturnValue({ testCases: [testCase()], status: "ready" });
    const { navigations } = await renderResolved(variant());

    expect(screen.getByText("landing")).toBeInTheDocument();
    expect(navigations).toEqual([
      { action: "POP", path: "/test-cases/lattice-belt/reference" },
      { action: "REPLACE", path: "/test-cases/lattice-belt" },
    ]);
  });
});
