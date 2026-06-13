import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Calendar as CalendarIcon, List, Plus, Search, Filter, MapPin, Users,
  Clock, MoreHorizontal, ChevronLeft, ChevronRight, MessageSquare,
  Eye, Copy, Trash2, ArrowRight,
} from "lucide-react";
import { PageShell, Card, Button, Tag, Tabs, EmptyState, FilterChips, ContextBar } from "./components/primitives";
import { useProRole } from "./components/useProRole";
import { useProTeam } from "./components/ProTeamContext";

type EventStatus = "draft" | "published" | "filling" | "full" | "cancelled";
type EventVisibility = "public" | "private" | "invite";
type ViewMode = "list" | "calendar";

type EventItem = {
  id: string;
  title: string;
  team: string;
  date: string;
  isoDate: string;
  time: string;
  venue: string;
  attendees: number;
  capacity: number;
  status: EventStatus;
  visibility: EventVisibility;
};

function StatusTag({ status }: { status: EventStatus }) {
  if (status === "published") return <Tag tone="success">Published</Tag>;
  if (status === "filling")   return <Tag tone="active">Filling fast</Tag>;
  if (status === "full")      return <Tag tone="muted">Full</Tag>;
  if (status === "cancelled") return <Tag tone="danger">Cancelled</Tag>;
  return <Tag tone="muted">Draft</Tag>;
}

function VisibilityTag({ v }: { v: EventVisibility }) {
  return <Tag tone="muted">{v === "public" ? "Public" : v === "invite" ? "Invite-only" : "Private"}</Tag>;
}

function EventList({ items }: { items: EventItem[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<CalendarIcon size={18} />}
          title="No events match"
          description="Try clearing filters or change the date range."
          action={<Button variant="primary" leadingIcon={<Plus size={13} />} href="/events/create">Create event</Button>}
        />
      </Card>
    );
  }
  return (
    <Card padded={false}>
      <div style={{ overflowX: "auto" }}>
        <table className="pro-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Team</th>
              <th>When</th>
              <th>Venue</th>
              <th>Attendance</th>
              <th>Visibility</th>
              <th>Status</th>
              <th style={{ width: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} data-testid={`event-row-${e.id}`}>
                <td>
                  <div style={{ fontWeight: 700 }}>{e.title}</div>
                </td>
                <td className="pro-text-muted">{e.team}</td>
                <td>
                  <div className="pro-row" style={{ gap: 6 }}>
                    <CalendarIcon size={12} style={{ color: "var(--pro-text-subtle)" }} />
                    <span style={{ fontWeight: 600 }}>{e.date}</span>
                    <Clock size={12} style={{ color: "var(--pro-text-subtle)", marginLeft: 6 }} />
                    <span className="pro-text-muted">{e.time}</span>
                  </div>
                </td>
                <td className="pro-row" style={{ gap: 6 }}>
                  <MapPin size={12} style={{ color: "var(--pro-text-subtle)" }} />
                  <span>{e.venue}</span>
                </td>
                <td>
                  <div className="pro-row" style={{ gap: 8 }}>
                    <div style={{ width: 70, height: 6, borderRadius: 99, background: "var(--pro-surface-3)", overflow: "hidden" }}>
                      <div style={{ width: `${(e.attendees / e.capacity) * 100}%`, height: "100%", background: "var(--pro-active)" }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--pro-text-muted)" }}>{e.attendees}/{e.capacity}</span>
                  </div>
                </td>
                <td><VisibilityTag v={e.visibility} /></td>
                <td><StatusTag status={e.status} /></td>
                <td>
                  <div className="pro-row" style={{ gap: 4 }}>
                    <button className="pro-icon-btn" aria-label="View" style={{ width: 28, height: 28 }}><Eye size={13} /></button>
                    <button className="pro-icon-btn" aria-label="Chat" style={{ width: 28, height: 28 }}><MessageSquare size={13} /></button>
                    <button className="pro-icon-btn" aria-label="Duplicate" style={{ width: 28, height: 28 }}><Copy size={13} /></button>
                    <button className="pro-icon-btn" aria-label="More" style={{ width: 28, height: 28 }}><MoreHorizontal size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function MonthCalendar({ items, onPick }: { items: EventItem[]; onPick: (id: string) => void }) {
  const [cursor, setCursor] = useState(() => new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = (firstDay.getDay() + 6) % 7; // Mon-first

  const cells: { date: string; day: number; events: EventItem[] }[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ date: "", day: 0, events: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date: iso, day: d, events: items.filter((e) => e.isoDate === iso) });
  }

  const monthLabel = cursor.toLocaleString("en-US", { month: "long", year: "numeric" });
  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <Card padded={false}>
      <div className="pro-row" style={{ padding: "14px 18px", borderBottom: "1px solid var(--pro-border)", gap: 10 }}>
        <button className="pro-icon-btn" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Previous month" data-testid="cal-prev"><ChevronLeft size={15} /></button>
        <div style={{ fontWeight: 800, fontSize: "var(--pro-fs-h2)", flex: 1 }}>{monthLabel}</div>
        <button className="pro-icon-btn" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Next month" data-testid="cal-next"><ChevronRight size={15} /></button>
        <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>Today</Button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--pro-border)" }}>
        {weekdayLabels.map((d) => (
          <div key={d} style={{ padding: "8px 10px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--pro-text-subtle)" }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {cells.map((c, idx) => (
          <div key={idx} style={{
            minHeight: 92,
            padding: 8,
            borderRight: (idx % 7) !== 6 ? "1px solid var(--pro-border-soft)" : "none",
            borderBottom: "1px solid var(--pro-border-soft)",
            background: c.day ? "var(--pro-surface)" : "var(--pro-surface-2)",
          }}>
            {c.day > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--pro-text-muted)", marginBottom: 4 }}>{c.day}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {c.events.slice(0, 3).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => onPick(e.id)}
                      data-testid={`cal-event-${e.id}`}
                      style={{
                        textAlign: "left",
                        padding: "3px 6px",
                        borderRadius: 5,
                        fontSize: 10, fontWeight: 700,
                        background: e.status === "draft" ? "var(--pro-surface-3)" : "var(--pro-active)",
                        color: e.status === "draft" ? "var(--pro-text-muted)" : "var(--pro-active-text)",
                        border: "0",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        cursor: "pointer", fontFamily: "inherit",
                      }}
                    >{e.time} {e.title}</button>
                  ))}
                  {c.events.length > 3 && (
                    <span style={{ fontSize: 10, color: "var(--pro-text-subtle)", fontWeight: 700 }}>+{c.events.length - 3} more</span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function ProSchedule() {
  const [view, setView] = useState<ViewMode>("list");
  type ScheduleFilter = "all" | "upcoming" | "past" | "low" | EventStatus;
  const [statusFilter, setStatusFilter] = useState<ScheduleFilter>("all");
  const [search, setSearch] = useState("");
  const { can } = useProRole();
  const { teamId, activeTeam, sportProfile } = useProTeam();

  const { data: events = [], isLoading } = useQuery<EventItem[]>({
    queryKey: ["/api/pro/team", teamId, "events", "all"],
    enabled: !!teamId,
    queryFn: async () => {
      const r = await fetch(`/api/pro/team/${teamId}/events?range=all`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const isLowAttendance = (e: EventItem) =>
    e.status !== "cancelled" && e.status !== "full" && e.attendees / e.capacity < 0.5;

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (statusFilter === "all") {/* keep */}
      else if (statusFilter === "upcoming") { if (e.isoDate < today) return false; }
      else if (statusFilter === "past")     { if (e.isoDate >= today) return false; }
      else if (statusFilter === "low")      { if (!isLowAttendance(e)) return false; }
      else if (e.status !== statusFilter) return false;
      if (search.trim() && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.venue.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [events, statusFilter, search, today]);

  const weekCount = useMemo(
    () => events.filter((e) => e.isoDate >= today && e.isoDate <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)).length,
    [events, today],
  );
  const totalRsvps = useMemo(() => events.reduce((s, e) => s + e.attendees, 0), [events]);
  const avgFill = useMemo(() => {
    const eligible = events.filter((e) => e.capacity > 0);
    if (!eligible.length) return 0;
    return Math.round((eligible.reduce((s, e) => s + e.attendees / e.capacity, 0) / eligible.length) * 100);
  }, [events]);

  const counts = useMemo(() => ({
    all: events.length,
    upcoming: events.filter((e) => e.isoDate >= today).length,
    past: events.filter((e) => e.isoDate < today).length,
    low: events.filter(isLowAttendance).length,
    draft: events.filter((e) => e.status === "draft").length,
    published: events.filter((e) => e.status === "published").length,
    filling: events.filter((e) => e.status === "filling").length,
    full: events.filter((e) => e.status === "full").length,
    cancelled: events.filter((e) => e.status === "cancelled").length,
  }), [events, today]);

  const RightPanel = (
    <>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 10 }}>This week</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="pro-row" style={{ justifyContent: "space-between", fontSize: "var(--pro-fs-sm)" }}>
            <span className="pro-text-muted">Events scheduled</span><span style={{ fontWeight: 800 }}>{weekCount}</span>
          </div>
          <div className="pro-row" style={{ justifyContent: "space-between", fontSize: "var(--pro-fs-sm)" }}>
            <span className="pro-text-muted">Total RSVPs</span><span style={{ fontWeight: 800 }}>{totalRsvps}</span>
          </div>
          <div className="pro-row" style={{ justifyContent: "space-between", fontSize: "var(--pro-fs-sm)" }}>
            <span className="pro-text-muted">Avg fill rate</span><span style={{ fontWeight: 800 }}>{avgFill}%</span>
          </div>
          <div className="pro-row" style={{ justifyContent: "space-between", fontSize: "var(--pro-fs-sm)" }}>
            <span className="pro-text-muted">Team sport</span><span style={{ fontWeight: 800 }}>{activeTeam?.sport || "—"}</span>
          </div>
        </div>
      </Card>

      <Card>
        <h3 style={{ margin: 0, marginBottom: 10 }}>Quick actions</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Button href="/events" variant="secondary" size="sm" fullWidth leadingIcon={<Plus size={13} />}>Create in SURNA</Button>
          <Button href="/pro/comms" variant="ghost" size="sm" fullWidth leadingIcon={<MessageSquare size={13} />}>Message team</Button>
          {sportProfile.supportsMatchDay && (
            <Button href="/pro/match-day" variant="ghost" size="sm" fullWidth leadingIcon={<CalendarIcon size={13} />}>Match Day</Button>
          )}
        </div>
      </Card>
    </>
  );

  if (!teamId) {
    return (
      <PageShell title="Events" subtitle="Select a team to view its schedule.">
        <EmptyState icon={<CalendarIcon size={18} />} title="No team selected" description="Choose a team from Teams to load events." />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Events"
      subtitle={`${sportProfile.scheduleLabel}${activeTeam ? ` · ${activeTeam.name}` : ""}`}
      actions={
        <>
          <div style={{ display: "flex", padding: 2, background: "var(--pro-surface-2)", border: "1px solid var(--pro-border)", borderRadius: 10 }}>
            <button
              onClick={() => setView("list")}
              data-testid="view-list"
              className="pro-row"
              style={{
                gap: 6, padding: "5px 10px", borderRadius: 8,
                background: view === "list" ? "var(--pro-surface)" : "transparent",
                color: view === "list" ? "var(--pro-text)" : "var(--pro-text-muted)",
                border: 0, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                boxShadow: view === "list" ? "var(--pro-shadow-sm)" : "none",
              }}
            ><List size={13} />List</button>
            <button
              onClick={() => setView("calendar")}
              data-testid="view-calendar"
              className="pro-row"
              style={{
                gap: 6, padding: "5px 10px", borderRadius: 8,
                background: view === "calendar" ? "var(--pro-surface)" : "transparent",
                color: view === "calendar" ? "var(--pro-text)" : "var(--pro-text-muted)",
                border: 0, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                boxShadow: view === "calendar" ? "var(--pro-shadow-sm)" : "none",
              }}
            ><CalendarIcon size={13} />Calendar</button>
          </div>
          {can("events.create") && <Button variant="primary" leadingIcon={<Plus size={14} />} href="/events/create">New event</Button>}
        </>
      }
      rightPanel={RightPanel}
    >
      <ContextBar
        context={<><CalendarIcon size={13} /><span>Plan, publish and follow up on every event.</span></>}
        actions={[
          { key: "new", label: "New event", icon: <Plus size={13} />, hidden: !can("events.create"), href: "/events/create" },
          { key: "remind", label: "Send reminder", icon: <MessageSquare size={13} />, href: "/pro/comms", hidden: !can("messages.announce") },
          { key: "lowatt", label: `${counts.low} low-attendance`, icon: <Users size={13} />, onClick: () => setStatusFilter("low") },
        ]}
      />

      {isLoading ? (
        <Card><div className="animate-pulse" style={{ height: 160, borderRadius: 8, background: "var(--pro-surface-2)" }} /></Card>
      ) : (
        <>
          <div className="pro-row" style={{ gap: 8, flexWrap: "wrap" }}>
            <div className="pro-topbar__search" style={{ height: 34, maxWidth: 320, flex: 1, minWidth: 220 }}>
              <Search size={13} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events…" data-testid="input-event-search" />
            </div>
            <Button variant="secondary" size="md" leadingIcon={<Filter size={14} />}>Filters</Button>
          </div>

          <FilterChips<ScheduleFilter>
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { key: "all",       label: "All",          count: counts.all },
              { key: "upcoming",  label: "Upcoming",     count: counts.upcoming },
              { key: "past",      label: "Past",         count: counts.past },
              { key: "low",       label: "Low attendance", count: counts.low },
              { key: "published", label: "Published",    count: counts.published },
              { key: "filling",   label: "Filling",      count: counts.filling },
              { key: "full",      label: "Full",         count: counts.full },
              { key: "draft",     label: "Drafts",       count: counts.draft },
              { key: "cancelled", label: "Cancelled",    count: counts.cancelled },
            ]}
          />

          {view === "list" ? <EventList items={filtered} /> : <MonthCalendar items={filtered} onPick={() => {}} />}
        </>
      )}
    </PageShell>
  );
}
