import { Users, Shield, MessageSquare, MapPin } from "lucide-react";
import { PageShell, Card, Button, ContextBar } from "../components/primitives";
import { useProWorkspaceContext } from "../lib/useProWorkspaceContext";

export default function ProPlaceStaffModule() {
  const { entityName, activePlace, withQuery } = useProWorkspaceContext();

  return (
    <PageShell
      title="Staff & roles"
      subtitle={`${entityName} · front desk and venue team`}
      actions={
        activePlace ? (
          <Button variant="primary" href={`/places/${activePlace.id}/manage`} leadingIcon={<MapPin size={14} />}>
            Manage venue
          </Button>
        ) : undefined
      }
    >
      <ContextBar
        context={<>Assign staff who can confirm bookings, run scan at the door, and reply to guest messages.</>}
        actions={[
          { key: "messages", label: "Staff messages", icon: <MessageSquare size={12} />, href: "/messages" },
          { key: "home", label: "Place home", icon: <MapPin size={12} />, href: withQuery("/pro/place") },
        ]}
      />

      <Card>
        <div className="pro-row" style={{ gap: 12, alignItems: "flex-start" }}>
          <span className="pro-workspace-tool__icon" style={{ width: 40, height: 40 }}>
            <Users size={18} />
          </span>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>Venue team access</h3>
            <p className="pro-text-muted" style={{ fontSize: 13, margin: "0 0 14px", lineHeight: 1.5 }}>
              Staff roles and permissions are configured on your place manage screen — invite co-managers and set who can approve bookings.
            </p>
            <div className="pro-row" style={{ gap: 8, flexWrap: "wrap" }}>
              <Button variant="primary" href={activePlace ? `/places/${activePlace.id}/manage` : withQuery("/pro/place")}>
                Open manage screen
              </Button>
              <Button variant="secondary" leadingIcon={<Shield size={14} />} href="/messages">
                Message staff
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </PageShell>
  );
}
