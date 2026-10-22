import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigationType } from "react-router";

import {
  NavHistoryContext,
  advanceHistory,
  browserIdx,
  loadHistory,
  saveHistory,
  type NavHistory,
} from "./nav-history";

/**
 * Record the tab's in-app history for every back control beneath it. The gallery app
 * mounts this once around its routes; without it every back control uses its fallback.
 */
export function NavHistoryProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const type = useNavigationType();
  const [recorded, setRecorded] = useState<NavHistory | null>(loadHistory);
  // Folded during render (React's derived-state pattern), so a page rendered for this
  // location already sees itself as the current entry. A navigation already folded in
  // returns the record unchanged, which ends the re-render.
  const history = advanceHistory(recorded, type, {
    key: location.key,
    pathname: location.pathname,
    href: `${location.pathname}${location.search}${location.hash}`,
    idx: browserIdx(),
  });
  if (history !== recorded) setRecorded(history);
  useEffect(() => {
    saveHistory(history);
  }, [history]);
  return (
    <NavHistoryContext.Provider value={history}>
      {children}
    </NavHistoryContext.Provider>
  );
}
