import { Building2, CalendarCheck, Eye, Users, BarChart3, QrCode } from "lucide-react";
import { PageShell, Card, Button, StatCard, ContextBar } from "../components/primitives";
import { useProWorkspaceContext } from "../lib/useProWorkspaceContext";
import { proRouteForFeature } from "@/lib/proFeatures";

export default function ProPlaceStatsModule() {
  const { entityName, activePlace, withQuery } = useProWorkspaceContext();
  const pending = activePlace?.pendingBookingsCount ?? 0;
  const upcoming = activePlace?.upcomingBookingsCount ?? 0;

  return (
    <PageShell
      title="Analytics"
      subtitle={`${entityName} · venue performance`}
      actions={
        <>
          <Button variant="secondary" href={withQuery(proRouteForFeature("places.bookings"))} leadingIcon={<CalendarCheck size={14} />}>
            Bookings
          </Button>
          {activePlace ? (
            <Button variant="secondary" href={`/places/${activePlace.id}`} leadingIcon={<Building2 size={14} />}>
              Public page
            </Button>
          ) : null}
        </>
      }
    >
      <ContextBar
        context={<>Venue snapshot — bookings pipeline, discovery views, and follower growth for your place.</>}
        actions={[
          { key: "bookings", label: "Booking queue", icon: <CalendarCheck size={12} />, href: withQuery("/pro/schedule") },
          { key: "scan", label: "Door scan", icon: <QrCode size={12} />, href: activePlace ? `/places/${activePlace.id}#scan` : "#" },
        ]}
      />

      <div className="pro-grid pro-grid-4" style={{ gap: 12, marginBottom: 16 }}>
        <StatCard label="Pending bookings" value={pending} icon={<CalendarCheck size={12} />} />
        <StatCard label="Upcoming" value={upcoming} icon={<BarChart3 size={12} />} />
        <StatCard label="Total bookings" value={activePlace?.bookingsCount ?? 0} icon={<CalendarCheck size={12} />} />
        <StatCard label="Views" value={activePlace?.viewsCount ?? 0} icon={<Eye size={12} />} />
        <StatCard label="Followers" value={activePlace?.followersCount ?? 0} icon={<Users size={12} />} />
      </div>

      <Card>
        <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>Improve conversion</h3>
        <p className="pro-text-muted" style={{ fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>
          Respond to pending bookings quickly, keep photos fresh, and run promotions when slots are quiet.
        </p>
        <div className="pro-row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Button variant="primary" href={withQuery(proRouteForFeature("places.promotions"))}>Promotions</Button>
          <Button variant="secondary" href={withQuery(proRouteForFeature("places.pricing"))}>Pricing tiers</Button>
          <Button variant="ghost" href={withQuery("/pro/place")}>Place home</Button>
        </div>
      </Card>
    </PageShell>
  );
}
