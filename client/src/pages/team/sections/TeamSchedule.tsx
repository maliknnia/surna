import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { AddToCalendarSheet } from "@/components/calendar/AddToCalendarSheet";
import type { CalendarEventInput } from "@/lib/eventCalendar";

interface TeamScheduleProps {
  teamId: string;
}

type ScheduleItem = {
  id?: string;
  title?: string;
  timeStart?: string;
  starts_at?: string;
  timeEnd?: string;
  location?: { address?: string };
  opponentName?: string;
  status?: string;
};

export default function TeamSchedule({ teamId }: TeamScheduleProps) {
  const [calendarEvent, setCalendarEvent] = useState<CalendarEventInput | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["/api/teams", teamId, "schedule"],
  });

  const schedule: ScheduleItem[] = (data as { schedule?: ScheduleItem[] })?.schedule ?? [];

  if (isLoading) {
    return <div className="glass-card text-center py-8 text-muted-foreground">Loading schedule...</div>;
  }

  if (schedule.length === 0) {
    return (
      <div className="glass-card text-center py-8">
        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-[14px]">No upcoming events</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {schedule.map((item) => {
          const address = item.location?.address;
          const start = String(item.timeStart || item.starts_at || "");
          return (
            <div key={String(item.id ?? start)} className="glass-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-[16px] font-bold text-foreground mb-2">{item.title ?? "Event"}</h3>
                  <div className="space-y-1.5 text-muted-foreground">
                    {start && (
                      <div className="flex items-center gap-2">
                        <Clock size={14} />
                        <span className="text-[13px]">{format(new Date(start), "EEE, MMM d · h:mm a")}</span>
                      </div>
                    )}
                    {address && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} />
                        <span className="text-[13px]">{address}</span>
                      </div>
                    )}
                    {item.opponentName ? (
                      <div className="text-[13px]">vs {item.opponentName}</div>
                    ) : null}
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-muted/40 text-muted-foreground shrink-0">
                  {String(item.status || "upcoming")}
                </span>
              </div>
              {start && (
                <button
                  type="button"
                  onClick={() =>
                    setCalendarEvent({
                      id: String(item.id),
                      title: String(item.title),
                      startsAt: start,
                      endsAt: item.timeEnd ? String(item.timeEnd) : undefined,
                      location: address,
                    })
                  }
                  className="mt-3 w-full h-9 rounded-full text-[12px] font-semibold bg-muted/40 text-foreground"
                >
                  Add to calendar
                </button>
              )}
            </div>
          );
        })}
      </div>
      <AddToCalendarSheet open={!!calendarEvent} onClose={() => setCalendarEvent(null)} event={calendarEvent} />
    </>
  );
}
