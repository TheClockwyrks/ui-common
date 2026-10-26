// A published run's share links: the one place that builds them, so every
// surface offering them hands out the same two.

/** A published run's two share links, both on the build's share origin. */
export interface RunShareLinks {
  /** `<origin>/r/<code>`: the run's verdict page on the public gallery. */
  verdict: string;
  /** `<origin>/p/<code>`: the run's play page on the public gallery. */
  play: string;
}

/**
 * The links tcab.ai resolves from a published run's short code, or null when
 * there is nothing to share: a build with no share origin (a development build,
 * the public gallery itself) or a run with no code (one never published).
 *
 * Built from the record's code and the share origin alone, never from the page's
 * own location, so a link copied from the console opens on the public gallery.
 * See the console's "Sharing a published run".
 */
export function runShareLinks(
  shareOrigin: string | null | undefined,
  code: string | null | undefined,
): RunShareLinks | null {
  const origin = shareOrigin?.trim().replace(/\/+$/, "");
  const shortCode = code?.trim();
  if (!origin || !shortCode) return null;
  const encoded = encodeURIComponent(shortCode);
  return { verdict: `${origin}/r/${encoded}`, play: `${origin}/p/${encoded}` };
}
