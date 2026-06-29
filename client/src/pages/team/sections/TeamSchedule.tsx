import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, MapPin, Clock, Plus } from "lucide-react";
import { format } from "date-fns";
import { AddToCalendarSheet } from "@/components/calendar/AddToCalendarSheet";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CalendarEventInput } from "@/lib/eventCalendar";
import { EntityEmptyState, EntityListSkeleton, entityCardStyle, entityBtnClass, entityBtnSurface } from "@/components/entity";
import { TeamSectionCard } from "../components/TeamSectionCard";
import { useTeamPageAccent } from "../TeamPageTheme";
import { cn } from "@/lib/utils";

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
  const accent = useTeamPageAccent();
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
    return (
      <div className="px-1">
        <EntityListSkeleton rows={3} rowHeight={100} />
      </div>
    );
  }

  return (
    <div className="space-y-3 px-1">
      {canManage ? (
        !showAdd ? (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className={cn(entityBtnClass, "w-full gap-2")}
            style={{ ...entityBtnSurface, background: `${accent}18`, color: accent, border: `1px solid ${accent}33` }}
          >
            <Plus size={16} />
            Add training session
          </button>
        ) : (
          <TeamSectionCard title="New session">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Session title"
              className="w-full h-10 rounded-xl px-3 text-[14px] mb-2"
              style={{ background: "var(--surna-bg-highlight)", border: "1px solid var(--surna-border)", color: "var(--surna-text)" }}
            />
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full h-10 rounded-xl px-3 text-[14px] mb-3"
              style={{ background: "var(--surna-bg-highlight)", border: "1px solid var(--surna-border)", color: "var(--surna-text)" }}
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className={cn(entityBtnClass, "flex-1")} style={entityBtnSurface}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => addSession.mutate()}
                disabled={!title.trim() || !dateTime || addSession.isPending}
                className={cn(entityBtnClass, "flex-1 disabled:opacity-50")}
                style={{ background: "var(--surna-text)", color: "var(--surna-base)" }}
              >
                Save
              </button>
            </div>
          </TeamSectionCard>
        )
      ) : null}

      {schedule.length === 0 ? (
        <EntityEmptyState
          icon={Calendar}
          title="No upcoming sessions"
          description={canManage ? "Add a training session to get the calendar started." : "Check back when the team posts their schedule."}
          actionLabel={canManage ? "Add session" : undefined}
          onAction={canManage ? () => setShowAdd(true) : undefined}
        />
      ) : (
        <div className="space-y-2.5">
          {schedule.map((item) => {
            const address = item.location?.address;
            const start = String(item.timeStart || item.starts_at || "");
            return (
              <div key={String(item.id ?? start)} className="rounded-2xl p-4" style={entityCardStyle}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-bold mb-2" style={{ color: "var(--surna-text)" }}>
                      {item.title ?? "Event"}
                    </h3>
                    <div className="space-y-1.5">
                      {start ? (
                        <div className="flex items-center gap-2" style={{ color: "var(--surna-text-secondary)" }}>
                          <Clock size={14} />
                          <span className="text-[13px]">{format(new Date(start), "EEE, MMM d · h:mm a")}</span>
                        </div>
                      ) : null}
                      {address ? (
                        <div className="flex items-center gap-2" style={{ color: "var(--surna-text-secondary)" }}>
                          <MapPin size={14} />
                          <span className="text-[13px]">{address}</span>
                        </div>
                      ) : null}
                      {item.opponentName ? (
                        <div className="text-[13px]" style={{ color: "var(--surna-text-secondary)" }}>
                          vs {item.opponentName}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase shrink-0"
                    style={{ background: `${accent}18`, color: accent }}
                  >
                    {String(item.status || "upcoming")}
                  </span>
                </div>
                {start ? (
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
                    className={cn(entityBtnClass, "w-full mt-3")}
                    style={entityBtnSurface}
                  >
                    Add to calendar
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      <AddToCalendarSheet open={!!calendarEvent} onClose={() => setCalendarEvent(null)} event={calendarEvent} />
    </div>
  );
}
