import { useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { CalendarCheck, Clock4, Repeat, QrCode, MapPin, Calendar } from "lucide-react";
import { PageShell, Card, Button, StatCard, ContextBar, Tag, Tabs } from "../components/primitives";
import { useProWorkspaceContext } from "../lib/useProWorkspaceContext";

type PlaceScheduleView = "calendar" | "recurring" | "slots";

function parseView(search: string): PlaceScheduleView {
  const raw = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("view");
  if (raw === "recurring" || raw === "slots" || raw === "calendar") return raw;
  return "calendar";
}

export default function ProPlaceScheduleModule() {
  const { entityName, activePlace, withQuery } = useProWorkspaceContext();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const view = useMemo(() => parseView(search), [search]);
  const pending = activePlace?.pendingBookingsCount ?? 0;
  const upcoming = activePlace?.upcomingBookingsCount ?? 0;
  const manageHref = activePlace ? `/places/${activePlace.id}/manage` : withQuery("/pro/place");

  const setView = (next: PlaceScheduleView) => {
    setLocation(withQuery(`/pro/schedule?view=${next}`));
  };

  return (
    <PageShell
      title="Bookings"
      subtitle={`${entityName} · calendar, recurring blocks & time slots`}
      actions={
        <>
          {activePlace ? (
            <Button variant="secondary" href={manageHref} leadingIcon={<MapPin size={14} />}>
              Manage venue
            </Button>
          ) : null}
          {activePlace ? (
            <Button variant="secondary" href={`/places/${activePlace.id}#scan`} leadingIcon={<QrCode size={14} />}>
              Scan
            </Button>
          ) : null}
        </>
      }
    >
      <Tabs
        tabs={[
          { key: "calendar", label: "Calendar" },
          { key: "recurring", label: "Recurring" },
          { key: "slots", label: "Slots" },
        ]}
        value={view}
        onChange={setView}
      />

      <div className="pro-grid pro-grid-4" style={{ gap: 12, margin: "16px 0" }}>
        <StatCard label="Pending approval" value={pending} icon={<CalendarCheck size={12} />} />
        <StatCard label="Upcoming" value={upcoming} icon={<Clock4 size={12} />} />
        <StatCard label="All-time bookings" value={activePlace?.bookingsCount ?? 0} icon={<CalendarCheck size={12} />} />
      </div>

      {view === "calendar" ? (
        <>
          <ContextBar
            context={<>Triage booking requests and keep your venue calendar accurate.</>}
            actions={[
              { key: "recurring", label: "Recurring", icon: <Repeat size={12} />, href: withQuery("/pro/schedule?view=recurring") },
              { key: "slots", label: "Time slots", icon: <Clock4 size={12} />, href: withQuery("/pro/schedule?view=slots") },
            ]}
          />

          {pending > 0 ? (
            <Card style={{ marginBottom: 12, borderColor: "color-mix(in srgb, var(--pro-gold) 40%, var(--pro-border))" }}>
              <div className="pro-row" style={{ gap: 10, alignItems: "flex-start" }}>
                <CalendarCheck size={18} style={{ color: "var(--pro-gold)", flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {pending} booking{pending === 1 ? "" : "s"} need attention
                  </div>
                  <p className="pro-text-muted" style={{ fontSize: 13, margin: "0 0 12px" }}>
                    Confirm or decline requests so your calendar stays accurate.
                  </p>
                  <Button variant="primary" href={manageHref}>
                    Review bookings
                  </Button>
                </div>
                <Tag tone="active">Action</Tag>
              </div>
            </Card>
          ) : (
            <Card style={{ marginBottom: 12 }}>
              <p className="pro-text-muted" style={{ fontSize: 13, margin: 0 }}>
                No pending booking requests — your schedule is clear.
              </p>
            </Card>
          )}

          <Card>
            <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>Booking calendar</h3>
            <p className="pro-text-muted" style={{ fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>
              Open the venue manage screen for the full calendar of confirmed and pending bookings.
            </p>
            <div className="pro-row" style={{ gap: 8, flexWrap: "wrap" }}>
              <Button variant="primary" href={manageHref} leadingIcon={<Calendar size={14} />}>
                Open calendar
              </Button>
              <Button variant="ghost" href={withQuery("/pro/place")}>
                Place home
              </Button>
            </div>
          </Card>
        </>
      ) : null}

      {view === "recurring" ? (
        <Card>
          <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>Recurring blocks</h3>
          <p className="pro-text-muted" style={{ fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>
            Block regular maintenance windows, staff-only hours, or weekly closures so guests cannot book those slots.
          </p>
          <div className="pro-row" style={{ gap: 8, flexWrap: "wrap" }}>
            <Button variant="primary" href={manageHref} leadingIcon={<Repeat size={14} />}>
              Manage recurring blocks
            </Button>
            <Button variant="secondary" href={withQuery("/pro/schedule?view=calendar")}>
              Back to calendar
            </Button>
          </div>
        </Card>
      ) : null}

      {view === "slots" ? (
        <Card>
          <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>Time slots</h3>
          <p className="pro-text-muted" style={{ fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>
            Set open hours and bookable slot lengths for courts, lanes, or rooms on your venue manage screen.
          </p>
          <div className="pro-row" style={{ gap: 8, flexWrap: "wrap" }}>
            <Button variant="primary" href={manageHref} leadingIcon={<Clock4 size={14} />}>
              Edit time slots
            </Button>
            <Button variant="secondary" href={withQuery("/pro/schedule?view=calendar")}>
              Back to calendar
            </Button>
          </div>
        </Card>
      ) : null}
    </PageShell>
  );
}
