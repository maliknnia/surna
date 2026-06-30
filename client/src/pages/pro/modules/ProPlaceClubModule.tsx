import { DollarSign, Clock4, Repeat, CalendarCheck, MapPin, Megaphone } from "lucide-react";
import { PageShell, Card, Button, StatCard, ContextBar, Tag } from "../components/primitives";
import { useProWorkspaceContext } from "../lib/useProWorkspaceContext";
import { proRouteForFeature } from "@/lib/proFeatures";

export default function ProPlaceClubModule() {
  const { entityName, activePlace, withQuery } = useProWorkspaceContext();
  const pending = activePlace?.pendingBookingsCount ?? 0;

  return (
    <PageShell
      title="Pricing & packages"
      subtitle={`${entityName} · rates, tiers, and offers`}
      actions={
        activePlace ? (
          <Button variant="primary" href={`/places/${activePlace.id}/manage`} leadingIcon={<DollarSign size={14} />}>
            Edit pricing
          </Button>
        ) : undefined
      }
    >
      <ContextBar
        context={<>Set drop-in rates, peak/off-peak pricing, and membership packages for your venue.</>}
        actions={[
          { key: "promos", label: "Promotions", icon: <Megaphone size={12} />, href: withQuery(proRouteForFeature("places.promotions")) },
          { key: "bookings", label: "Bookings", icon: <CalendarCheck size={12} />, href: withQuery("/pro/schedule") },
        ]}
      />

      <div className="pro-grid pro-grid-4" style={{ gap: 12, marginBottom: 16 }}>
        <StatCard label="Pending bookings" value={pending} icon={<CalendarCheck size={12} />} />
        <StatCard label="Upcoming" value={activePlace?.upcomingBookingsCount ?? 0} icon={<Clock4 size={12} />} />
        <StatCard label="Followers" value={activePlace?.followersCount ?? 0} icon={<MapPin size={12} />} />
        <StatCard label="Views" value={activePlace?.viewsCount ?? 0} icon={<MapPin size={12} />} />
      </div>

      {pending > 0 ? (
        <Card style={{ marginBottom: 12 }}>
          <div className="pro-row" style={{ gap: 10 }}>
            <Tag tone="active">Revenue</Tag>
            <span style={{ fontSize: 13, color: "var(--pro-text-muted)" }}>
              {pending} booking{pending === 1 ? "" : "s"} waiting — confirming quickly protects your calendar and conversion.
            </span>
          </div>
        </Card>
      ) : null}

      <Card>
        <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>Pricing tools</h3>
        <p className="pro-text-muted" style={{ fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>
          Configure hourly rates, member discounts, and recurring blocks from your venue manage screen.
        </p>
        <div className="pro-row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Button variant="primary" href={activePlace ? `/places/${activePlace.id}/manage` : withQuery("/pro/place")}>
            Manage pricing
          </Button>
          <Button variant="secondary" href={withQuery(proRouteForFeature("places.recurring"))} leadingIcon={<Repeat size={14} />}>
            Recurring blocks
          </Button>
          <Button variant="secondary" href={withQuery(proRouteForFeature("places.slots"))} leadingIcon={<Clock4 size={14} />}>
            Time slots
          </Button>
          <Button variant="ghost" href={withQuery("/pro/place")}>Place home</Button>
        </div>
      </Card>
    </PageShell>
  );
}
