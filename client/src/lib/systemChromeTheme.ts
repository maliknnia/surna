/**
 * Colors the OS browser chrome (status bar, home indicator area) to match the app.
 * Uses theme-color meta, color-scheme, iOS PWA status-bar hints, and Capacitor StatusBar on native.
 */

import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

export type ResolvedChromeTheme = "dark" | "light";

const CHROME_BG: Record<ResolvedChromeTheme, string> = {
  dark: "#000000",
  light: "#ffffff",
};

const APPLE_STATUS_BAR: Record<ResolvedChromeTheme, string> = {
  dark: "black",
  light: "default",
};

const META_THEME_COLOR_ID = "surna-theme-color";
const META_APPLE_STATUS_ID = "surna-apple-status-bar";

function ensureMeta(id: string, name: string, content: string) {
  let el = document.getElementById(id) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.id = id;
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  return el;
}

async function syncNativeStatusBar(
  hex: string,
  resolved: ResolvedChromeTheme,
  immersive: boolean,
) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setOverlaysWebView({ overlay: immersive });
    await StatusBar.setBackgroundColor({ color: hex });
    await StatusBar.setStyle({
      style: resolved === "light" ? Style.Dark : Style.Light,
    });
  } catch {
    /* StatusBar unavailable on this platform/build */
  }
}

/** Apply before React hydrates and whenever the in-app theme changes. */
export function applySystemChromeTheme(resolved: ResolvedChromeTheme) {
  applyPageChromeColor(CHROME_BG[resolved]);
}

export type PageChromeOptions = {
  /** Edge-to-edge under the status bar (map, camera). */
  immersive?: boolean;
};

/** Per-route chrome (e.g. full-bleed map) — restores theme on unmount via applySystemChromeTheme. */
export function applyPageChromeColor(hex: string, opts?: PageChromeOptions) {
  if (typeof document === "undefined") return;

  const immersive = opts?.immersive ?? false;
  const normalized = hex.toLowerCase();
  const resolved: ResolvedChromeTheme =
    normalized === "#ffffff" || normalized === "#fff" ? "light" : "dark";

  document.documentElement.style.colorScheme = resolved;
  document.documentElement.style.setProperty("--surna-nav-bar-bg", hex);
  document.documentElement.style.backgroundColor = hex;
  document.documentElement.setAttribute("data-theme", resolved);

  ensureMeta(META_THEME_COLOR_ID, "theme-color", hex);

  const appleStatus = document.getElementById(META_APPLE_STATUS_ID) as HTMLMetaElement | null;
  if (appleStatus) {
    appleStatus.setAttribute("content", APPLE_STATUS_BAR[resolved]);
  }

  for (const name of ["background-color", "msapplication-TileColor"] as const) {
    const el = document.querySelector(`meta[name="${name}"]`);
    if (el) el.setAttribute("content", hex);
  }

  document.body.style.backgroundColor = hex;
  void syncNativeStatusBar(hex, resolved, immersive);
}

/** Read next-themes storageKey (`theme`) for a flash-free first paint. */
export function resolveChromeThemeFromStorage(): ResolvedChromeTheme {
  if (typeof window === "undefined") return "dark";

  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light") return "light";
    if (stored === "dark") return "dark";
    if (stored === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
  } catch {
    /* private mode */
  }
  return "dark";
}
