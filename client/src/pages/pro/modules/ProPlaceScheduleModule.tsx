import { CalendarCheck, Clock4, Repeat, QrCode, MapPin } from "lucide-react";
import { PageShell, Card, Button, StatCard, ContextBar, Tag } from "../components/primitives";
import { useProWorkspaceContext } from "../lib/useProWorkspaceContext";
import { proRouteForFeature } from "@/lib/proFeatures";

export default function ProPlaceScheduleModule() {
  const { entityName, activePlace, withQuery } = useProWorkspaceContext();
  const pending = activePlace?.pendingBookingsCount ?? 0;
  const upcoming = activePlace?.upcomingBookingsCount ?? 0;

  return (
    <PageShell
      title="Bookings"
      subtitle={`${entityName} · requests, calendar & recurring blocks`}
      actions={
        <>
          {activePlace ? (
            <Button variant="secondary" href={`/places/${activePlace.id}/manage`} leadingIcon={<MapPin size={14} />}>
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
      <ContextBar
        context={<>Triage booking requests, manage your calendar, and block recurring maintenance windows.</>}
        actions={[
          { key: "recurring", label: "Recurring blocks", icon: <Repeat size={12} />, href: withQuery(proRouteForFeature("places.recurring")) },
          { key: "slots", label: "Time slots", icon: <Clock4 size={12} />, href: withQuery(proRouteForFeature("places.slots")) },
        ]}
      />

      <div className="pro-grid pro-grid-4" style={{ gap: 12, marginBottom: 16 }}>
        <StatCard label="Pending approval" value={pending} icon={<CalendarCheck size={12} />} />
        <StatCard label="Upcoming" value={upcoming} icon={<Clock4 size={12} />} />
        <StatCard label="All-time bookings" value={activePlace?.bookingsCount ?? 0} icon={<CalendarCheck size={12} />} />
      </div>

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
              <Button variant="primary" href={activePlace ? `/places/${activePlace.id}/manage` : withQuery("/pro/place")}>
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
        <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>Calendar tools</h3>
        <p className="pro-text-muted" style={{ fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>
          Set availability, pricing tiers, and recurring closures from your venue manage screen.
        </p>
        <div className="pro-row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Button variant="secondary" href={withQuery(proRouteForFeature("places.bookingCalendar"))}>Booking calendar</Button>
          <Button variant="secondary" href={withQuery(proRouteForFeature("places.pricing"))}>Pricing</Button>
          <Button variant="ghost" href={withQuery("/pro/place")}>Place home</Button>
        </div>
      </Card>
    </PageShell>
  );
}
