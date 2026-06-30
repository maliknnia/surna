import { Link } from "wouter";
import {
  CalendarCheck,
  CalendarRange,
  BarChart3,
  QrCode,
  DollarSign,
  Megaphone,
  Users,
  Inbox,
  Repeat,
  Clock4,
  Building2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useProPlace } from "./components/ProPlaceContext";
import { withPlaceQuery } from "./lib/proWorkspaceNav";
import { proRouteForFeature } from "@/lib/proFeatures";
import ProWorkspaceLauncher from "./ProWorkspaceLauncher";

type ToolTile = {
  key: string;
  label: string;
  desc: string;
  path: string;
  icon: typeof CalendarCheck;
};

export default function ProPlaceWorkspaceHome() {
  const { placeId, activePlace, places, placesLoading } = useProPlace();

  if (!placesLoading && places.length === 0) {
    return <ProWorkspaceLauncher focus="place" />;
  }

  const pending = activePlace?.pendingBookingsCount ?? 0;
  const upcoming = activePlace?.upcomingBookingsCount ?? 0;
  const cityLine = [activePlace?.city, activePlace?.state].filter(Boolean).join(", ");

  const tools: ToolTile[] = [
    {
      key: "bookings",
      label: pending > 0 ? `Bookings · ${pending}` : "Bookings",
      desc: "Confirm, decline, and triage",
      path: proRouteForFeature("places.bookings"),
      icon: CalendarCheck,
    },
    {
      key: "calendar",
      label: "Calendar",
      desc: "Visual schedule & conflicts",
      path: proRouteForFeature("places.bookingCalendar"),
      icon: CalendarRange,
    },
    {
      key: "analytics",
      label: "Analytics",
      desc: "Views, conversion, trends",
      path: proRouteForFeature("places.analytics"),
      icon: BarChart3,
    },
    {
      key: "scan",
      label: "Scan at door",
      desc: "Verify guest QR check-ins",
      path: activePlace ? `/places/${activePlace.id}#scan` : "#",
      icon: QrCode,
    },
    {
      key: "pricing",
      label: "Pricing",
      desc: "Drop-ins, packages, tiers",
      path: proRouteForFeature("places.pricing"),
      icon: DollarSign,
    },
    {
      key: "staff",
      label: "Staff",
      desc: "Roles & front-desk access",
      path: proRouteForFeature("places.staff"),
      icon: Users,
    },
  ];

  const loading = placesLoading || !placeId;

  return (
    <div data-testid="pro-place-workspace-home">
      <section className="pro-workspace-home__hero">
        <p style={{ margin: 0, fontSize: 13, color: "var(--pro-text-muted)", lineHeight: 1.5, textTransform: "capitalize" }}>
          {activePlace?.category ?? "Venue"}{cityLine ? ` · ${cityLine}` : ""}
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 15, fontWeight: 600, color: "var(--pro-text)", lineHeight: 1.45 }}>
          Run <span style={{ color: "var(--pro-gold)" }}>{activePlace?.name ?? "your venue"}</span> — bookings, scan, and revenue in one place.
        </p>
        {!loading && activePlace ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
            {[
              { label: "Pending", value: pending },
              { label: "Upcoming", value: upcoming },
              { label: "Followers", value: activePlace.followersCount ?? 0 },
            ].map((chip) => (
              <span
                key={chip.label}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: "var(--pro-surface-2)",
                  border: "0.5px solid var(--pro-border)",
                  color: "var(--pro-text-muted)",
                }}
              >
                {chip.label} · {chip.value}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {pending > 0 ? (
        <Link href={withPlaceQuery(proRouteForFeature("places.bookings"), placeId)}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              borderRadius: 14,
              background: "var(--pro-gold-soft)",
              border: "0.5px solid color-mix(in srgb, var(--pro-gold) 40%, var(--pro-border))",
              marginBottom: 20,
            }}
            data-testid="pro-place-pending-banner"
          >
            <CalendarCheck size={18} style={{ color: "var(--pro-gold)", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{pending} booking{pending === 1 ? "" : "s"} need review</div>
              <div style={{ fontSize: 12, color: "var(--pro-text-muted)", marginTop: 2 }}>Tap to open bookings</div>
            </div>
            <ArrowRight size={14} style={{ color: "var(--pro-text-subtle)" }} />
          </div>
        </Link>
      ) : !loading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderRadius: 14,
            background: "var(--pro-bg-elevated)",
            border: "0.5px solid var(--pro-border)",
            marginBottom: 20,
            fontSize: 13,
            color: "var(--pro-text-muted)",
          }}
        >
          <CheckCircle2 size={16} style={{ color: "var(--pro-success)" }} />
          No pending bookings — you're all set.
        </div>
      ) : null}

      <h2 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--pro-text-subtle)" }}>
        Tools
      </h2>
      <div className="pro-workspace-home__tools">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isExternal = tool.path.startsWith("/places/");
          const href = isExternal ? tool.path : withPlaceQuery(tool.path, placeId);
          const inner = (
            <span className="pro-workspace-tool" data-testid={`pro-place-tool-${tool.key}`}>
              <span className="pro-workspace-tool__icon"><Icon size={18} /></span>
              <span className="pro-workspace-tool__label">{tool.label}</span>
              <span className="pro-workspace-tool__desc">{tool.desc}</span>
            </span>
          );
          return isExternal ? (
            <Link key={tool.key} href={href}>{inner}</Link>
          ) : (
            <Link key={tool.key} href={href}>{inner}</Link>
          );
        })}
      </div>

      <h2 style={{ margin: "24px 0 12px", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--pro-text-subtle)" }}>
        Grow your venue
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { key: "recurring", label: "Recurring schedules", desc: "Weekly classes and blocks", icon: Repeat, feature: "places.recurring" },
          { key: "slots", label: "Time-slot manager", desc: "Courts, rooms, trainers", icon: Clock4, feature: "places.slots" },
          { key: "promos", label: "Promotions", desc: "Offers and flash deals", icon: Megaphone, feature: "places.promotions" },
          { key: "leads", label: "Lead pipeline", desc: "Inquiries and follow-ups", icon: Inbox, feature: "places.leads" },
        ].map((row) => {
          const Icon = row.icon;
          return (
            <Link key={row.key} href={withPlaceQuery(proRouteForFeature(row.feature), placeId)}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 14,
                  background: "var(--pro-bg-elevated)",
                  border: "0.5px solid var(--pro-border)",
                }}
              >
                <Icon size={16} style={{ color: "var(--pro-text-muted)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{row.label}</div>
                  <div style={{ fontSize: 12, color: "var(--pro-text-muted)" }}>{row.desc}</div>
                </div>
                <ArrowRight size={14} style={{ color: "var(--pro-text-subtle)" }} />
              </div>
            </Link>
          );
        })}
      </div>

      {activePlace?.isActive === false ? (
        <div
          style={{
            marginTop: 20,
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--pro-danger-soft)",
            fontSize: 13,
            color: "var(--pro-text)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Building2 size={16} />
          This place is marked closed — reopen from My Hub when ready.
        </div>
      ) : null}
    </div>
  );
}
