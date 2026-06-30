import { Link } from "wouter";
import {
  Building2,
  Bell,
  CreditCard,
  Globe,
  MapPin,
  Shield,
  Settings,
  ChevronRight,
} from "lucide-react";
import { PageShell, Card, Button, ContextBar } from "../components/primitives";
import { useProWorkspaceContext } from "../lib/useProWorkspaceContext";
import { ROUTES } from "@/navigation/routes";

type SettingRow = {
  key: string;
  label: string;
  desc: string;
  href: string;
  icon: typeof Building2;
};

export default function ProPlaceSettingsModule() {
  const { entityName, activePlace, withQuery } = useProWorkspaceContext();

  const rows: SettingRow[] = [
    {
      key: "manage",
      label: "Venue profile",
      desc: "Photos, description, hours, and amenities",
      href: activePlace ? `/places/${activePlace.id}/manage` : withQuery("/pro/place"),
      icon: Building2,
    },
    {
      key: "public",
      label: "Public page",
      desc: "How athletes discover and book your venue",
      href: activePlace ? `/places/${activePlace.id}` : withQuery("/pro/place"),
      icon: Globe,
    },
    {
      key: "bookings",
      label: "Booking preferences",
      desc: "Approval rules, slots, and recurring blocks",
      href: withQuery("/pro/schedule"),
      icon: MapPin,
    },
    {
      key: "notifications",
      label: "Notifications",
      desc: "Email and push alerts for new bookings",
      href: ROUTES.settings,
      icon: Bell,
    },
    {
      key: "billing",
      label: "Billing & Pro plan",
      desc: "Subscription, payouts, and invoices",
      href: ROUTES.billing,
      icon: CreditCard,
    },
    {
      key: "security",
      label: "Account security",
      desc: "Password, 2FA, and active sessions",
      href: ROUTES.security,
      icon: Shield,
    },
  ];

  return (
    <PageShell
      title="Settings"
      subtitle={`${entityName} · venue configuration`}
      actions={
        activePlace ? (
          <Button variant="primary" href={`/places/${activePlace.id}/manage`} leadingIcon={<Settings size={14} />}>
            Manage venue
          </Button>
        ) : undefined
      }
    >
      <ContextBar
        context={<>Configure how your place appears, accepts bookings, and notifies your team.</>}
        actions={[{ key: "home", label: "Place home", icon: <Building2 size={12} />, href: withQuery("/pro/place") }]}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <Link key={row.key} href={row.href}>
              <Card interactive data-testid={`pro-place-setting-${row.key}`}>
                <div className="pro-row" style={{ gap: 12, alignItems: "center" }}>
                  <span className="pro-workspace-tool__icon" style={{ width: 36, height: 36 }}>
                    <Icon size={16} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{row.label}</div>
                    <div className="pro-text-muted" style={{ fontSize: 12, marginTop: 2 }}>{row.desc}</div>
                  </div>
                  <ChevronRight size={16} style={{ color: "var(--pro-text-subtle)", flexShrink: 0 }} />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}
