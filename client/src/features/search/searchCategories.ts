export type SearchCategoryId =
  | "football"
  | "gaa"
  | "rugby"
  | "basketball"
  | "cricket"
  | "cycling"
  | "running"
  | "coaches"
  | "teams"
  | "events"
  | "instant-join"
  | "challenges"
  | "marketplace";

export interface SearchCategory {
  id: SearchCategoryId;
  label: string;
  color: string;
  emoji: string;
}

export const SEARCH_CATEGORIES: SearchCategory[] = [
  { id: "football", label: "Football", color: "#0d3318", emoji: "⚽" },
  { id: "gaa", label: "GAA", color: "#1a3a1a", emoji: "🏐" },
  { id: "rugby", label: "Rugby", color: "#0a0a2e", emoji: "🏉" },
  { id: "basketball", label: "Basketball", color: "#3a1a00", emoji: "🏀" },
  { id: "cricket", label: "Cricket", color: "#2a2000", emoji: "🏏" },
  { id: "cycling", label: "Cycling", color: "#002a2a", emoji: "🚴" },
  { id: "running", label: "Running", color: "#2a0000", emoji: "🏃" },
  { id: "coaches", label: "Coaches", color: "#1a0a2e", emoji: "🎓" },
  { id: "teams", label: "Teams", color: "#001a2a", emoji: "👥" },
  { id: "events", label: "Events", color: "#2a0a00", emoji: "📅" },
  { id: "instant-join", label: "Instant Join", color: "#1a003a", emoji: "⚡" },
  { id: "challenges", label: "Challenges", color: "#2a1a00", emoji: "🏆" },
  { id: "marketplace", label: "Marketplace", color: "#1a1a1a", emoji: "🛍️" },
];

export const RECENT_SEARCHES_KEY = "surna-recent-searches";
export const MAX_RECENT_SEARCHES = 8;

export function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(term: string) {
  const trimmed = term.trim();
  if (trimmed.length < 2) return;
  const existing = loadRecentSearches().filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...existing].slice(0, MAX_RECENT_SEARCHES);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
}

export function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}
