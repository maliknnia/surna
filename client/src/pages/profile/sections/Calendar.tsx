import { Calendar as CalendarIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { CalendarAgenda, type AgendaEvent } from "@/components/calendar/CalendarAgenda";

interface CalendarItem {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  location?: unknown;
  category?: string | null;
  status?: string;
}

interface CalendarProps {
  userId: string;
}

function toAgendaItem(ev: CalendarItem): AgendaEvent {
  let location: string | undefined;
  if (typeof ev.location === "string") location = ev.location;
  else if (ev.location && typeof ev.location === "object") {
    const loc = ev.location as { address?: string; name?: string };
    location = loc.address || loc.name;
  }
  return {
    id: ev.id,
    title: ev.title,
    starts_at: ev.starts_at,
    ends_at: ev.ends_at || undefined,
    location,
    sport: ev.category || undefined,
    isMine: true,
  };
}

export default function Calendar({ userId }: CalendarProps) {
  const [, setLocation] = useLocation();
  const { data: items = [], isLoading } = useQuery<CalendarItem[]>({
    queryKey: ["/api/users", userId, "calendar"],
    queryFn: getQueryFn({ on401: "returnNull" }) as () => Promise<CalendarItem[]>,
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted/40 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass-card text-center py-12 px-4">
        <CalendarIcon className="w-14 h-14 text-muted-foreground mx-auto mb-3 opacity-60" />
        <p className="text-[15px] font-semibold text-foreground">No upcoming events</p>
        <p className="text-[13px] text-muted-foreground mt-1">RSVP&apos;d matches and events appear here.</p>
        <button
          type="button"
          onClick={() => setLocation("/calendar")}
          className="mt-4 px-5 h-10 rounded-full text-[13px] font-bold bg-foreground text-background"
        >
          Open full schedule
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CalendarAgenda events={items.map(toAgendaItem)} emptyTitle="No events" />
      <button
        type="button"
        onClick={() => setLocation("/calendar")}
        className="w-full glass-card py-3.5 text-[14px] font-semibold text-foreground"
      >
        View full calendar →
      </button>
    </div>
  );
}
