import { format } from "date-fns";
import { MapPin, Clock, ChevronRight, Bell } from "lucide-react";
import { useLocation } from "wouter";
import { EntityEmptyState, entityCardStyle } from "@/components/entity";
import { ROUTES } from "@/navigation";

export type AgendaEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string;
  location?: string;
  sport?: string;
  going_count?: number;
  capacity?: number;
  isMine?: boolean;
};

const SPORT_DOT: Record<string, string> = {
  soccer: "#30D158",
  football: "#30D158",
  gaa: "#DC2626",
  rugby: "#FF9F0A",
  basketball: "#FF6B6B",
  running: "#4A9EFF",
};

function sportDotColor(sport?: string): string {
  if (!sport) return "var(--surna-gold, #f5c518)";
  const key = sport.toLowerCase();
  for (const [k, color] of Object.entries(SPORT_DOT)) {
    if (key.includes(k)) return color;
  }
  return "var(--surna-gold, #f5c518)";
}

export function CalendarAgenda({
  events,
  emptyTitle = "Nothing scheduled",
  emptyHint = "Pick another day or browse events.",
  emptyActionLabel = "Browse events",
  emptyActionHref = ROUTES.events,
  compact = false,
  showReminders = false,
  onToggleReminder,
  hasReminder,
  reminderTick = 0,
}: {
  events: AgendaEvent[];
  emptyTitle?: string;
  emptyHint?: string;
  emptyActionLabel?: string;
  emptyActionHref?: string;
  compact?: boolean;
  showReminders?: boolean;
  onToggleReminder?: (event: AgendaEvent) => void;
  hasReminder?: (eventId: string) => boolean;
  reminderTick?: number;
}) {
  const [, setLocation] = useLocation();

  if (events.length === 0) {
    return (
      <EntityEmptyState
        icon={Clock}
        title={emptyTitle}
        description={emptyHint}
        actionLabel={emptyActionLabel}
        actionHref={emptyActionHref}
        compact={compact}
      />
    );
  }

  return (
    <div className="space-y-2.5">
      {events.map((ev) => {
        const start = new Date(ev.starts_at);
        const dotColor = sportDotColor(ev.sport);
        const reminded = showReminders && hasReminder?.(ev.id);
        void reminderTick;
        return (
          <div key={ev.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLocation(ROUTES.event(ev.id))}
              className="flex-1 flex items-center gap-3 p-4 rounded-2xl text-left active:opacity-90 transition-opacity min-w-0"
              style={entityCardStyle}
            >
              <div className="shrink-0 text-center w-12">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--surna-text-secondary)" }}>
                  {format(start, "MMM")}
                </p>
                <p className="text-[22px] font-bold leading-none tabular-nums" style={{ color: "var(--surna-text)" }}>
                  {format(start, "d")}
                </p>
              </div>
              <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: dotColor }} />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold truncate" style={{ color: "var(--surna-text)" }}>
                  {ev.title}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[12px]" style={{ color: "var(--surna-text-secondary)" }}>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {format(start, "h:mm a")}
                  </span>
                  {ev.location ? (
                    <span className="flex items-center gap-1 truncate max-w-[140px]">
                      <MapPin size={12} />
                      {ev.location}
                    </span>
                  ) : null}
                </div>
                {ev.isMine ? (
                  <span
                    className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                    style={{ background: "var(--surna-base)", color: "var(--surna-text-secondary)" }}
                  >
                    On your schedule
                  </span>
                ) : null}
              </div>
              <ChevronRight size={18} className="shrink-0" style={{ color: "var(--surna-text-secondary)" }} />
            </button>
            {showReminders && onToggleReminder ? (
              <button
                type="button"
                onClick={() => onToggleReminder(ev)}
                className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
                style={{
                  background: reminded ? "var(--surna-text)" : "var(--surna-elevated)",
                  color: reminded ? "var(--surna-base)" : "var(--surna-text-secondary)",
                  border: reminded ? "none" : "1px solid var(--surna-border)",
                }}
                aria-label={reminded ? "Remove reminder" : "Remind me"}
              >
                <Bell size={18} className={reminded ? "fill-current" : undefined} />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
