import { format } from "date-fns";
import { MapPin, Clock, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

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

function sportDot(sport?: string) {
  return "bg-foreground/80";
}

export function CalendarAgenda({
  events,
  emptyTitle = "Nothing scheduled",
  emptyHint = "Pick another day or browse events.",
  compact = false,
}: {
  events: AgendaEvent[];
  emptyTitle?: string;
  emptyHint?: string;
  compact?: boolean;
}) {
  const [, setLocation] = useLocation();

  if (events.length === 0) {
    return (
      <div className={cn("text-center py-10 px-4", compact && "py-6")}>
        <p className="text-[15px] font-semibold text-foreground">{emptyTitle}</p>
        <p className="text-[13px] text-muted-foreground mt-1">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((ev) => {
        const start = new Date(ev.starts_at);
        return (
          <button
            key={ev.id}
            type="button"
            onClick={() => setLocation(`/events/${ev.id}`)}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left active:scale-[0.99] transition-all bg-muted/25 hover:bg-muted/40 border border-border/30"
          >
            <div className="shrink-0 text-center w-12">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {format(start, "MMM")}
              </p>
              <p className="surna-stat text-[22px] leading-none text-foreground">{format(start, "d")}</p>
            </div>
            <div className={cn("w-1 self-stretch rounded-full shrink-0", sportDot(ev.sport))} />
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-foreground truncate">{ev.title}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[12px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {format(start, "h:mm a")}
                </span>
                {ev.location && (
                  <span className="flex items-center gap-1 truncate max-w-[140px]">
                    <MapPin size={12} />
                    {ev.location}
                  </span>
                )}
              </div>
              {ev.isMine && (
                <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-foreground/10 text-muted-foreground">
                  On your schedule
                </span>
              )}
            </div>
            <ChevronRight size={18} className="text-muted-foreground shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
