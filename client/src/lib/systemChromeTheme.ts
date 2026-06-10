/**
 * Colors the OS browser chrome (status bar, home indicator area) to match the app.
 * Uses theme-color meta, color-scheme, and iOS PWA status-bar hints.
 */

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

/** Apply before React hydrates and whenever the in-app theme changes. */
export function applySystemChromeTheme(resolved: ResolvedChromeTheme) {
  if (typeof document === "undefined") return;

  const bg = CHROME_BG[resolved];

  document.documentElement.style.colorScheme = resolved;
  document.documentElement.style.setProperty("--surna-nav-bar-bg", bg);
  document.documentElement.setAttribute("data-theme", resolved);

  ensureMeta(META_THEME_COLOR_ID, "theme-color", bg);

  const appleStatus = document.getElementById(META_APPLE_STATUS_ID) as HTMLMetaElement | null;
  if (appleStatus) {
    appleStatus.setAttribute("content", APPLE_STATUS_BAR[resolved]);
  }

  for (const name of ["background-color", "msapplication-TileColor"] as const) {
    const el = document.querySelector(`meta[name="${name}"]`);
    if (el) el.setAttribute("content", bg);
  }

  document.body.style.backgroundColor = bg;
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
