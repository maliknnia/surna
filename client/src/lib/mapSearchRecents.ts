const STORAGE_KEY = "surna_map_recents";
const MAX_RECENTS = 12;

export type MapRecentEntry = {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  lat?: number;
  lng?: number;
  visitedAt: string;
};

export function loadMapRecents(): MapRecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MapRecentEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushMapRecent(entry: Omit<MapRecentEntry, "visitedAt">) {
  if (typeof window === "undefined" || !entry.id) return;
  const now = new Date().toISOString();
  const next: MapRecentEntry = { ...entry, visitedAt: now };
  const existing = loadMapRecents().filter((r) => !(r.id === entry.id && r.type === entry.type));
  const merged = [next, ...existing].slice(0, MAX_RECENTS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    /* ignore quota */
  }
}

export function clearMapRecents() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
