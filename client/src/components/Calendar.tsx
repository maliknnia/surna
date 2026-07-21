import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  CalendarDays,
  List,
  LayoutGrid,
  MapPin,
  Navigation,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addDays,
  isBefore,
  startOfDay,
} from "date-fns";
import { cn } from "@/lib/utils";
import { mergeWithDemoEvents } from "@/lib/demoEvents";
import { exportMyCalendarIcs } from "@/lib/eventCalendar";
import { useMyRSVPs } from "@/hooks/useEvents";
import { useToast } from "@/hooks/use-toast";
import { CalendarAgenda, type AgendaEvent } from "@/components/calendar/CalendarAgenda";
import { EntityEmptyState, EntityListSkeleton } from "@/components/entity";
import { createHubPath } from "@/lib/createHub";
import { ROUTES } from "@/navigation";
import { hasEventReminder, toggleEventReminder } from "@/lib/eventReminders";

const LOCATION_CHIPS = ["Near me", "All Ireland", "Cork", "Dublin", "Galway", "Limerick"] as const;

type CalEvent = AgendaEvent & { description?: string; city?: string };

type ViewMode = "month" | "agenda";
type FilterMode = "all" | "mine";

function mapApiEvent(event: Record<string, unknown>): CalEvent {
  return {
    id: String(event.id),
    title: String(event.title || "Event"),
    starts_at: String(event.starts_at || event.startDate),
    ends_at: event.ends_at ? String(event.ends_at) : event.endDate ? String(event.endDate) : undefined,
    location: event.location ? String(event.location) : event.venueName ? String(event.venueName) : undefined,
    sport: event.sport ? String(event.sport) : undefined,
    going_count: Number(event.going_count) || 0,
    capacity: Number(event.capacity) || undefined,
    city: event.city ? String(event.city) : undefined,
  };
}

function eventMatchesLocation(ev: CalEvent, locationChip: string, nearLabel: string): boolean {
  if (locationChip === "All Ireland") return true;
  const hay = `${ev.location ?? ""} ${ev.city ?? ""}`.toLowerCase();
  if (locationChip === "Near me") {
    if (!nearLabel || nearLabel === "Near me") return true;
    return hay.includes(nearLabel.toLowerCase());
  }
  return hay.includes(locationChip.toLowerCase());
}

export function Calendar() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [locationChip, setLocationChip] = useState<string>("Near me");
  const [nearCityLabel, setNearCityLabel] = useState("Near me");
  const [reminderTick, setReminderTick] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
          );
          if (!res.ok) return;
          const data = (await res.json()) as { address?: { city?: string; town?: string; village?: string } };
          const city = data.address?.city || data.address?.town || data.address?.village;
          if (city) {
            setNearCityLabel(city);
            setLocationChip("Near me");
          }
        } catch {
          /* keep default */
        }
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
    );
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const { data: apiEvents = [], isLoading, isError, refetch } = useQuery<CalEvent[]>({
    queryKey: ["calendar-events", calendarStart.toISOString(), calendarEnd.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: calendarStart.toISOString(),
        to: calendarEnd.toISOString(),
        limit: "200",
      });
      const res = await fetch(`/api/events?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load events");
      const data = await res.json();
      const items = data?.items ?? data ?? [];
      return (items as Record<string, unknown>[]).map((e) => mapApiEvent(e));
    },
    staleTime: 60_000,
  });

  const eventsData = useMemo(() => {
    if (filterMode === "mine") return apiEvents;
    return mergeWithDemoEvents(apiEvents, {
      skipDemo: false,
      mixDemos: true,
      fallback: true,
    }).map((e) => mapApiEvent(e as Record<string, unknown>));
  }, [apiEvents, filterMode]);

  const { data: myRsvps } = useMyRSVPs();
  const myEventIds = useMemo(() => {
    const ids = new Set<string>();
    (myRsvps?.items ?? []).forEach((r: { event_id?: string; eventId?: string }) => {
      const id = r.event_id || r.eventId;
      if (id) ids.add(String(id));
    });
    return ids;
  }, [myRsvps]);

  const filteredEvents = useMemo(() => {
    let list = filterMode === "mine"
      ? eventsData.filter((e) => myEventIds.has(e.id))
      : eventsData;
    list = list.filter((e) => eventMatchesLocation(e, locationChip, nearCityLabel));
    return list;
  }, [eventsData, filterMode, myEventIds, locationChip, nearCityLabel]);

  const eventsByDate = useMemo(() => {
    const groups: Record<string, CalEvent[]> = {};
    filteredEvents.forEach((event) => {
      const key = format(new Date(event.starts_at), "yyyy-MM-dd");
      if (!groups[key]) groups[key] = [];
      groups[key].push({ ...event, isMine: myEventIds.has(event.id) });
    });
    Object.values(groups).forEach((list) =>
      list.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    );
    return groups;
  }, [filteredEvents, myEventIds]);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedDateEvents = eventsByDate[selectedKey] || [];

  const agendaEvents = useMemo(() => {
    const now = startOfDay(new Date());
    return filteredEvents
      .filter((e) => !isBefore(new Date(e.starts_at), now))
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
      .map((e) => ({ ...e, isMine: myEventIds.has(e.id) }));
  }, [filteredEvents, myEventIds]);

  const monthEventCount = filteredEvents.length;

  const goToday = () => {
    const t = new Date();
    setCurrentMonth(t);
    setSelectedDate(t);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportMyCalendarIcs("3m");
      toast({ title: "Calendar exported", description: "Open surna-schedule.ics in your calendar app." });
    } catch {
      toast({ title: "Could not export", description: "Sign in and try again.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const weekDays = useMemo(() => {
    const anchor = startOfWeek(selectedDate);
    return eachDayOfInterval({ start: anchor, end: addDays(anchor, 6) });
  }, [selectedDate]);

  if (isLoading) {
    return <EntityListSkeleton rows={4} rowHeight={72} />;
  }

  if (isError) {
    return (
      <EntityEmptyState
        icon={CalendarDays}
        title="Couldn't load schedule"
        description="Check your connection and try again."
        actionLabel="Retry"
        onAction={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/40 active:scale-95"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="px-3 h-9 rounded-full text-[13px] font-bold bg-foreground text-background active:scale-95"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/40 active:scale-95"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <h2 className="text-lg font-bold text-foreground tabular-nums">{format(currentMonth, "MMMM yyyy")}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex rounded-full p-0.5"
            style={{ background: "var(--surna-elevated)", border: "1px solid var(--surna-border)" }}
          >
            {(["mine", "all"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilterMode(f)}
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors"
                style={{
                  background: filterMode === f ? "var(--surna-text)" : "transparent",
                  color: filterMode === f ? "var(--surna-base)" : "var(--surna-text-secondary)",
                }}
              >
                {f === "all" ? "Discover" : "My schedule"}
              </button>
            ))}
          </div>
          <div className="flex rounded-full p-0.5 bg-muted/40 ml-auto">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                viewMode === "month" ? "bg-foreground text-background" : "text-muted-foreground",
              )}
              aria-label="Month view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("agenda")}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                viewMode === "agenda" ? "bg-foreground text-background" : "text-muted-foreground",
              )}
              aria-label="Agenda view"
            >
              <List size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="h-8 px-3 rounded-full text-[12px] font-semibold flex items-center gap-1 bg-muted/40 disabled:opacity-50"
          >
            <Download size={14} />
            Export
          </button>
          <button
            type="button"
            onClick={() => setLocation(createHubPath("event"))}
            className="h-8 w-8 flex items-center justify-center active:scale-95"
            aria-label="Create event"
            style={{ color: "var(--surna-text)" }}
          >
            <Plus size={22} strokeWidth={2.25} />
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          <MapPin size={14} className="shrink-0" style={{ color: "var(--surna-text-secondary)" }} />
          {LOCATION_CHIPS.map((chip) => {
            const active = locationChip === chip;
            const label = chip === "Near me" && nearCityLabel !== "Near me" ? nearCityLabel : chip;
            return (
              <button
                key={chip}
                type="button"
                onClick={() => setLocationChip(chip)}
                className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors active:scale-[0.97]"
                style={{
                  background: active ? "var(--surna-text)" : "var(--surna-elevated)",
                  color: active ? "var(--surna-base)" : "var(--surna-text-secondary)",
                  border: active ? "none" : "1px solid var(--surna-border)",
                }}
              >
                {chip === "Near me" ? (
                  <span className="inline-flex items-center gap-1">
                    <Navigation size={11} />
                    {label}
                  </span>
                ) : (
                  label
                )}
              </button>
            );
          })}
        </div>

        {/* 7-day strip */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {weekDays.map((day) => {
            const selected = isSameDay(day, selectedDate);
            const dateKey = format(day, "yyyy-MM-dd");
            const hasEvents = (eventsByDate[dateKey]?.length ?? 0) > 0;
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => {
                  setSelectedDate(day);
                  if (!isSameMonth(day, currentMonth)) setCurrentMonth(day);
                }}
                className="flex flex-col items-center min-w-[44px] py-2 px-1 rounded-xl active:opacity-80"
                style={{
                  background: selected ? "var(--surna-text)" : "var(--surna-elevated)",
                  border: selected ? "none" : "1px solid var(--surna-border)",
                }}
              >
                <span
                  className="text-[10px] font-semibold uppercase"
                  style={{ color: selected ? "var(--surna-base)" : "var(--surna-text-secondary)" }}
                >
                  {format(day, "EEE")}
                </span>
                <span
                  className="text-[15px] font-bold tabular-nums"
                  style={{ color: selected ? "var(--surna-base)" : "var(--surna-text)" }}
                >
                  {format(day, "d")}
                </span>
                {hasEvents ? (
                  <span
                    className="w-1 h-1 rounded-full mt-1"
                    style={{ background: selected ? "var(--surna-base)" : "var(--surna-gold, #f5c518)" }}
                  />
                ) : (
                  <span className="h-1 mt-1" />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-[13px]" style={{ color: "var(--surna-text-secondary)" }}>
          {monthEventCount} event{monthEventCount === 1 ? "" : "s"} this month
          {filterMode === "mine" && myEventIds.size > 0 ? ` · ${myEventIds.size} on your schedule` : ""}
        </p>
      </div>

      {viewMode === "month" ? (
        <>
          <div className="glass-card p-3">
            <div className="grid grid-cols-7 mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={`${d}-${i}`} className="text-center text-[11px] font-bold text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDate[dateKey] || [];
                const inMonth = isSameMonth(day, currentMonth);
                const selected = isSameDay(day, selectedDate);
                const today = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95",
                      !inMonth && "opacity-35",
                      selected && "bg-foreground text-background ring-2 ring-foreground/20",
                      !selected && inMonth && "hover:bg-muted/50",
                      today && !selected && "ring-1 ring-foreground/30",
                    )}
                  >
                    <span className={cn("text-[13px] font-semibold tabular-nums", selected && "text-background")}>
                      {format(day, "d")}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="flex gap-0.5">
                        {dayEvents.slice(0, 3).map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "w-1 h-1 rounded-full",
                              selected ? "bg-background/80" : "bg-foreground/70",
                            )}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-bold text-foreground">{format(selectedDate, "EEEE, MMM d")}</h3>
              <span className="text-[12px] text-muted-foreground">{selectedDateEvents.length} events</span>
            </div>
            <CalendarAgenda
              events={selectedDateEvents}
              emptyTitle="Free day"
              emptyHint="No events on this day — try another location or browse what's on."
              emptyActionLabel="Browse events"
              emptyActionHref={ROUTES.events}
              compact
              showReminders
              reminderTick={reminderTick}
              onToggleReminder={(ev) => {
                const added = toggleEventReminder({
                  eventId: ev.id,
                  title: ev.title,
                  startsAt: ev.starts_at,
                  location: ev.location,
                });
                setReminderTick((n) => n + 1);
                toast({
                  title: added ? "Reminder saved" : "Reminder removed",
                  description: added
                    ? `We'll keep ${ev.title} on your schedule list.`
                    : `${ev.title} removed from reminders.`,
                });
              }}
              hasReminder={(id) => hasEventReminder(id)}
            />
          </div>
        </>
      ) : (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={18} className="text-muted-foreground" />
            <h3 className="text-[15px] font-bold text-foreground">Upcoming agenda</h3>
          </div>
          <CalendarAgenda
            events={agendaEvents}
            emptyTitle={filterMode === "mine" ? "Nothing on your schedule" : "Nothing coming up"}
            emptyHint={
              filterMode === "mine"
                ? "RSVP to events and they'll appear here automatically."
                : "Explore events near you or create your own."
            }
            emptyActionLabel={filterMode === "mine" ? "Find events" : "Browse events"}
            emptyActionHref={ROUTES.events}
          />
        </div>
      )}
    </div>
  );
}
