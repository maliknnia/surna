/** Resolve event cover image for cards (API upload or sport/title fallback). */

const TITLE_FALLBACKS: Record<string, string> = {
  basketball: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=900&auto=format&fit=crop&q=80",
  "5v5": "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=900&auto=format&fit=crop&q=80",
  "5-a-side": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&auto=format&fit=crop&q=80",
  soccer: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&auto=format&fit=crop&q=80",
  football: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&auto=format&fit=crop&q=80",
  running: "https://images.unsplash.com/photo-1476480862126-209bf4358e27?w=900&auto=format&fit=crop&q=80",
  trail: "https://images.unsplash.com/photo-1476480862126-209bf4358e27?w=900&auto=format&fit=crop&q=80",
  mma: "https://images.unsplash.com/photo-1555597679-b6736b99b8dd?w=900&auto=format&fit=crop&q=80",
  boxing: "https://images.unsplash.com/photo-1555597679-b6736b99b8dd?w=900&auto=format&fit=crop&q=80",
  tennis: "https://images.unsplash.com/photo-1622279457485620-0f63f4a6dca0?w=900&auto=format&fit=crop&q=80",
  padel: "https://images.unsplash.com/photo-1617083274587-1e3e14efbe8d?w=900&auto=format&fit=crop&q=80",
  crossfit: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&auto=format&fit=crop&q=80",
  swim: "https://images.unsplash.com/photo-1530549380085-4f9a72c2b496?w=900&auto=format&fit=crop&q=80",
  swimming: "https://images.unsplash.com/photo-1530549380085-4f9a72c2b496?w=900&auto=format&fit=crop&q=80",
  volleyball: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=900&auto=format&fit=crop&q=80",
  beach: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=900&auto=format&fit=crop&q=80",
  yoga: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&auto=format&fit=crop&q=80",
  baseball: "https://images.unsplash.com/photo-1566577733762-1c0d0e6f0f0a?w=900&auto=format&fit=crop&q=80",
  rugby: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=900&auto=format&fit=crop&q=80",
  gaa: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&auto=format&fit=crop&q=80",
  cricket: "https://images.unsplash.com/photo-1531419140502-7a3e4e4b4c4b?w=900&auto=format&fit=crop&q=80",
  cycling: "https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=900&auto=format&fit=crop&q=80",
};

const SPORT_FALLBACKS: Record<string, string> = {
  basketball: TITLE_FALLBACKS.basketball,
  soccer: TITLE_FALLBACKS.soccer,
  football: TITLE_FALLBACKS.football,
  running: TITLE_FALLBACKS.running,
  mma: TITLE_FALLBACKS.mma,
  boxing: TITLE_FALLBACKS.boxing,
  tennis: TITLE_FALLBACKS.tennis,
  padel: TITLE_FALLBACKS.padel,
  crossfit: TITLE_FALLBACKS.crossfit,
  swimming: TITLE_FALLBACKS.swimming,
  swim: TITLE_FALLBACKS.swim,
  volleyball: TITLE_FALLBACKS.volleyball,
  yoga: TITLE_FALLBACKS.yoga,
  baseball: TITLE_FALLBACKS.baseball,
  rugby: TITLE_FALLBACKS.rugby,
  gaa: TITLE_FALLBACKS.gaa,
  cricket: TITLE_FALLBACKS.cricket,
  cycling: TITLE_FALLBACKS.cycling,
};

function fallbackFromTitle(title?: string): string | null {
  const t = (title || "").toLowerCase();
  for (const [kw, url] of Object.entries(TITLE_FALLBACKS)) {
    if (t.includes(kw)) return url;
  }
  return null;
}

function fallbackFromSport(sport?: string): string | null {
  if (!sport) return null;
  const key = sport.toLowerCase().trim();
  return SPORT_FALLBACKS[key] ?? null;
}

export function getEventCoverUrl(ev: {
  cover_url?: string | null;
  cover_medium_url?: string | null;
  coverUrl?: string | null;
  imageUrl?: string | null;
  title?: string | null;
  sport?: string | null;
}): string | null {
  const uploaded =
    ev.cover_url ||
    ev.cover_medium_url ||
    ev.coverUrl ||
    ev.imageUrl ||
    null;
  if (uploaded) return uploaded;
  return fallbackFromTitle(ev.title ?? undefined) || fallbackFromSport(ev.sport ?? undefined);
}

export function formatEventWhenShort(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Tomorrow · ${time}`;
  const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return `${date} · ${time}`;
}
