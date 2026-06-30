import { ClipboardCheck, CalendarCheck, ArrowRight } from "lucide-react";
import { PageShell, Card, Button, ContextBar, Tag } from "../components/primitives";
import { useProWorkspaceContext } from "../lib/useProWorkspaceContext";

export default function ProPlaceApprovalsModule() {
  const { entityName, activePlace, withQuery } = useProWorkspaceContext();
  const pending = activePlace?.pendingBookingsCount ?? 0;

  return (
    <PageShell
      title="Approvals"
      subtitle={`${entityName} · booking requests awaiting action`}
      actions={
        activePlace ? (
          <Button variant="primary" href={`/places/${activePlace.id}/manage`} leadingIcon={<CalendarCheck size={14} />}>
            Review bookings
          </Button>
        ) : undefined
      }
    >
      <ContextBar
        context={<>Approve or decline booking requests so your calendar and pricing stay accurate.</>}
        actions={[{ key: "schedule", label: "Booking calendar", icon: <CalendarCheck size={12} />, href: withQuery("/pro/schedule") }]}
      />

      {pending > 0 ? (
        <Card>
          <div className="pro-row" style={{ gap: 12, alignItems: "flex-start" }}>
            <ClipboardCheck size={20} style={{ color: "var(--pro-gold)", flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                {pending} pending approval{pending === 1 ? "" : "s"}
              </div>
              <p className="pro-text-muted" style={{ fontSize: 13, margin: "0 0 14px", lineHeight: 1.5 }}>
                Open your venue manage screen to confirm times, pricing, and guest details.
              </p>
              <Button variant="primary" href={activePlace ? `/places/${activePlace.id}/manage` : withQuery("/pro/schedule")}>
                Open booking queue
              </Button>
            </div>
            <Tag tone="active">Action</Tag>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="pro-row" style={{ gap: 10, alignItems: "center" }}>
            <ClipboardCheck size={18} style={{ color: "var(--pro-success, var(--pro-text-muted))" }} />
            <div>
              <div style={{ fontWeight: 700 }}>All clear</div>
              <p className="pro-text-muted" style={{ fontSize: 13, margin: "4px 0 0" }}>
                No booking requests need approval right now.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card style={{ marginTop: 12 }}>
        <p className="pro-text-muted" style={{ fontSize: 13, margin: "0 0 12px" }}>
          Team join requests and squad approvals live in Team Pro.
        </p>
        <Button variant="ghost" href="/my-hub/teams" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          Team approvals in My Hub
          <ArrowRight size={14} />
        </Button>
      </Card>
    </PageShell>
  );
}
