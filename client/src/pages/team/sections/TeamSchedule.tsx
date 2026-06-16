import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, MapPin, Clock, Plus } from "lucide-react";
import { format } from "date-fns";
import { AddToCalendarSheet } from "@/components/calendar/AddToCalendarSheet";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CalendarEventInput } from "@/lib/eventCalendar";

interface TeamScheduleProps {
  teamId: string;
  canManage?: boolean;
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

export default function TeamSchedule({ teamId, canManage = false }: TeamScheduleProps) {
  const [calendarEvent, setCalendarEvent] = useState<CalendarEventInput | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [dateTime, setDateTime] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/teams", teamId, "schedule"],
  });

  const addSession = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/teams/${teamId}/schedule`, {
        title: title.trim(),
        dateTime: new Date(dateTime).toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Training added to schedule" });
      setTitle("");
      setDateTime("");
      setShowAdd(false);
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "schedule"] });
    },
    onError: () => toast({ title: "Couldn't add session", variant: "destructive" }),
  });

  const schedule: ScheduleItem[] = (data as { schedule?: ScheduleItem[] })?.schedule ?? [];

  if (isLoading) {
    return <div className="glass-card text-center py-8 text-muted-foreground">Loading schedule...</div>;
  }

  return (
    <>
      {canManage ? (
        <div className="mb-3">
          {!showAdd ? (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="w-full h-10 rounded-full text-[13px] font-semibold flex items-center justify-center gap-2 bg-muted/40"
            >
              <Plus size={16} />
              Add training session
            </button>
          ) : (
            <div className="glass-card space-y-3 p-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Session title"
                className="w-full h-10 rounded-xl px-3 text-[14px] bg-muted/30 border border-border"
              />
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full h-10 rounded-xl px-3 text-[14px] bg-muted/30 border border-border"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 h-9 rounded-full bg-muted/40 text-[13px] font-semibold">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => addSession.mutate()}
                  disabled={!title.trim() || !dateTime || addSession.isPending}
                  className="flex-1 h-9 rounded-full bg-foreground text-background text-[13px] font-semibold disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {schedule.length === 0 ? (
        <div className="glass-card text-center py-8">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-[14px]">No upcoming events</p>
        </div>
      ) : (
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
                      {item.opponentName ? <div className="text-[13px]">vs {item.opponentName}</div> : null}
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
      )}
      <AddToCalendarSheet open={!!calendarEvent} onClose={() => setCalendarEvent(null)} event={calendarEvent} />
    </>
  );
}
