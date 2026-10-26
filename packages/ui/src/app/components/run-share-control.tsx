import { useCallback, useEffect, useId, useRef, useState } from "react";

import styles from "./run-share-control.module.scss";
import { ShareIcon } from "./share-icon";
import type { RunShareLinks } from "../data/share-links";

interface RunShareControlProps {
  /** The run's share links, built from its short code and the share origin. */
  links: RunShareLinks;
  /** Class for the trigger, so it matches the icon controls beside it. */
  className?: string;
  /** Class for the trigger's mark, sized like the marks beside it. */
  iconClassName?: string;
}

type LinkKind = keyof RunShareLinks;

// What a copy came to, shown in place of the row's Copy label until it fades.
interface CopyOutcome {
  kind: LinkKind;
  ok: boolean;
}

// How long a row reads "Copied" (or "Copy failed") before it reverts.
const COPIED_FEEDBACK_MS = 1600;

const ROWS: { kind: LinkKind; label: string }[] = [
  { kind: "verdict", label: "Verdict" },
  { kind: "play", label: "Play" },
];

/**
 * The share control on a published run's pages: an icon button that opens a
 * small panel offering the run's `tcab.ai` verdict and play links, each shown in
 * full and copied with one click. The copy goes through `navigator.clipboard`,
 * which the operator client's shell routes through itself, so it works inside
 * the client on every platform as it does in a browser.
 *
 * The caller renders it only for a run that has links: one with a short code, in
 * a build that names a share origin.
 */
export function RunShareControl({
  links,
  className,
  iconClassName,
}: RunShareControlProps) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<CopyOutcome | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Close on a press outside the control, and on Escape, handing focus back to
  // the trigger so a keyboard user is left where they started.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Clear a copy's confirmation after a moment; a newer copy restarts the clock.
  useEffect(() => {
    if (!outcome) return;
    const timer = setTimeout(() => {
      setOutcome(null);
    }, COPIED_FEEDBACK_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [outcome]);

  const copy = useCallback(
    async (kind: LinkKind) => {
      try {
        // Absent outside a secure context, whatever the DOM types say.
        const clipboard = navigator.clipboard as Clipboard | undefined;
        if (!clipboard) throw new Error("no clipboard");
        await clipboard.writeText(links[kind]);
        setOutcome({ kind, ok: true });
      } catch {
        // The link stays on screen, selectable, so a refused clipboard still
        // leaves the operator a way to take it.
        setOutcome({ kind, ok: false });
      }
    },
    [links],
  );

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={triggerRef}
        type="button"
        className={className}
        aria-label="Share run"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title="Copy this run's public share links"
        onClick={() => {
          setOpen((was) => !was);
        }}
      >
        <ShareIcon className={iconClassName} />
      </button>
      {open && (
        <div
          id={panelId}
          className={styles.panel}
          role="dialog"
          aria-label="Share links"
        >
          {ROWS.map(({ kind, label }) => {
            const shown = outcome?.kind === kind ? outcome : null;
            return (
              <div key={kind} className={styles.row}>
                <span className={styles.label}>{label}</span>
                <a
                  className={styles.link}
                  href={links[kind]}
                  target="_blank"
                  rel="noreferrer"
                >
                  {links[kind]}
                </a>
                <button
                  type="button"
                  className={styles.copy}
                  data-outcome={
                    shown ? (shown.ok ? "copied" : "failed") : undefined
                  }
                  aria-label={`Copy ${label.toLowerCase()} link`}
                  onClick={() => {
                    void copy(kind);
                  }}
                >
                  {shown ? (shown.ok ? "Copied" : "Copy failed") : "Copy"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
