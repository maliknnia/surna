import { useCallback } from "react";
import { useLocation } from "wouter";

const RETURN_KEY = "surna-nav-return";

/** Remember where to return after opening a full-screen route from a tab panel. */
export function markNavReturn(path: string) {
  try {
    sessionStorage.setItem(RETURN_KEY, path);
  } catch {
    /* ignore */
  }
}

export function consumeNavReturn(): string | null {
  try {
    const path = sessionStorage.getItem(RETURN_KEY);
    if (path) sessionStorage.removeItem(RETURN_KEY);
    return path;
  } catch {
    return null;
  }
}

export type MobilePanelId = "home" | "teams" | "map" | "venues" | "events";

const PANEL_INDEX: Record<MobilePanelId, number> = {
  home: 0,
  teams: 1,
  map: 2,
  venues: 3,
  events: 4,
};

export function mobilePanelReturnPath(panel: MobilePanelId): string {
  return `/?panel=${panel}`;
}

export function panelFromSearch(search: string): MobilePanelId | null {
  const panel = new URLSearchParams(search).get("panel");
  if (panel && panel in PANEL_INDEX) return panel as MobilePanelId;
  return null;
}

export function panelIndexFromSearch(search: string): number | null {
  const id = panelFromSearch(search);
  return id != null ? PANEL_INDEX[id] : null;
}

type SmartBackOptions = {
  /** When inside MobileHome carousel — go to previous tab instead of leaving the app */
  onPanelBack?: () => void;
  /** Route when there is no history and no saved return */
  fallback?: string;
};

export function useSmartBack(options: SmartBackOptions = {}) {
  const [, setLocation] = useLocation();
  const { onPanelBack, fallback = "/" } = options;

  return useCallback(() => {
    if (onPanelBack) {
      onPanelBack();
      return;
    }

    const saved = consumeNavReturn();
    if (saved) {
      setLocation(saved);
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }

    setLocation(fallback);
  }, [onPanelBack, fallback, setLocation]);
}
