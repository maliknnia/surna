import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Calendar } from "lucide-react";
import { getSportConfig } from "@/components/TeamCard";

type StripEvent = {
  id: string;
  title: string;
  starts_at?: string;
  cover_thumb_url?: string | null;
  cover_medium_url?: string | null;
  strip_role?: string;
  my_status?: string;
};

function formatWhen(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function EventPill({ ev, onClick }: { ev: StripEvent; onClick: () => void }) {
  const cover = ev.cover_thumb_url || ev.cover_medium_url;
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full active:scale-[0.97] transition-transform"
      style={{ background: "var(--surna-surface)", border: "1px solid var(--surna-border)" }}
    >
      <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-muted/30">
        {cover ? (
          <img src={cover} alt="" className="w-full h-full object-cover" />
        ) : (
          <Calendar size={16} className="text-muted-foreground" />
        )}
      </div>
      <div className="text-left min-w-0 max-w-[130px]">
        <p className="text-[12px] font-semibold truncate" style={{ color: "var(--surna-text)" }}>
          {ev.title}
        </p>
        <p className="text-[10px] truncate text-muted-foreground capitalize">
          {ev.strip_role === "organizing" ? "Organizing" : ev.my_status || "Going"}
          {ev.starts_at ? ` · ${formatWhen(ev.starts_at)}` : ""}
        </p>
      </div>
      <ChevronRight size={14} className="text-muted-foreground shrink-0" />
    </button>
  );
}

export function YourEventsStrip({ onEventClick }: { onEventClick: (eventId: string) => void }) {
  const { data, isLoading } = useQuery<{ going?: StripEvent[]; organizing?: StripEvent[] }>({
    queryKey: ["/api/events/me/mine"],
  });

  const going = data?.going ?? [];
  const organizing = data?.organizing ?? [];
  const seen = new Set<string>();
  const merged: StripEvent[] = [];
  for (const ev of [...organizing, ...going]) {
    if (seen.has(ev.id)) continue;
    seen.add(ev.id);
    merged.push(ev);
  }

  if (isLoading || merged.length === 0) return null;

  return (
    <section className="mb-5 px-4">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--surna-text-secondary)" }}>
          Your events
        </h2>
        <span className="text-[11px] text-muted-foreground">{merged.length}</span>
      </div>
      <div className="flex gap-2.5 surna-h-scroll no-scrollbar -mx-1 px-1 pb-1">
        {merged.map((ev) => (
          <EventPill key={ev.id} ev={ev} onClick={() => onEventClick(ev.id)} />
        ))}
      </div>
    </section>
  );
}

export function EventDiscoveryCircles({
  events,
  userSport,
  onEventClick,
  onBrowse,
}: {
  events: Array<{ id: string; title: string; sport?: string | null; cover_thumb_url?: string | null; cover_medium_url?: string | null; cover_url?: string | null; starts_at?: string }>;
  userSport?: string | null;
  onEventClick: (id: string) => void;
  onBrowse: () => void;
}) {
  if (events.length === 0) return null;

  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const thisWeek = events.filter((e) => {
    const t = e.starts_at ? new Date(e.starts_at).getTime() : 0;
    return t >= now && t <= now + weekMs;
  });
  const sportKey = (userSport || "").toLowerCase();
  const yourSport = sportKey
    ? events.filter((e) => (e.sport || "").toLowerCase().includes(sportKey) || (e.title || "").toLowerCase().includes(sportKey))
    : [];

  const picks: { id: string; label: string; item?: (typeof events)[0] }[] = [
    { id: "week", label: "This week", item: thisWeek[0] ?? events[0] },
    { id: "sport", label: sportKey ? `Your sport` : "Featured", item: yourSport[0] ?? events[1] ?? events[0] },
    { id: "next", label: "Coming up", item: events[2] ?? events[0] },
  ];

  return (
    <section className="mb-4 px-4">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--surna-text-secondary)" }}>
          Discover
        </h2>
        <button type="button" onClick={onBrowse} className="text-[12px] font-semibold" style={{ color: "hsl(var(--primary))" }}>
          See all
        </button>
      </div>
      <div className="flex gap-4 surna-h-scroll no-scrollbar pb-1">
        {picks.map((pick) => {
          const ev = pick.item;
          if (!ev) return null;
          const cover = ev.cover_thumb_url || ev.cover_medium_url || ev.cover_url;
          const config = getSportConfig(ev.sport);
          return (
            <button
              key={pick.id}
              type="button"
              onClick={() => onEventClick(ev.id)}
              className="shrink-0 flex flex-col items-center w-[72px] active:scale-95 transition-transform"
            >
              <div
                className="w-[64px] h-[64px] rounded-full p-[2px]"
                style={{ background: `linear-gradient(145deg, ${config.colors[0]}, ${config.colors[1]})` }}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-background flex items-center justify-center">
                  {cover ? (
                    <img src={cover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">{config.emoji}</span>
                  )}
                </div>
              </div>
              <span className="text-[11px] font-semibold mt-2 text-center leading-tight line-clamp-2" style={{ color: "var(--surna-text)" }}>
                {pick.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
