import { Megaphone, MessageSquare, Inbox, CalendarCheck } from "lucide-react";
import { PageShell, Card, Button, ContextBar } from "../components/primitives";
import { useProWorkspaceContext } from "../lib/useProWorkspaceContext";
import { proRouteForFeature } from "@/lib/proFeatures";

export default function ProPlaceCommsModule() {
  const { entityName, activePlace, withQuery } = useProWorkspaceContext();
  const pending = activePlace?.pendingBookingsCount ?? 0;

  return (
    <PageShell
      title="Promotions"
      subtitle={`${entityName} · venue announcements & leads`}
      actions={
        <>
          <Button variant="primary" href="/messages" leadingIcon={<MessageSquare size={14} />}>
            Messages
          </Button>
          <Button
            variant="secondary"
            href={withQuery(proRouteForFeature("places.bookings"))}
            leadingIcon={<CalendarCheck size={14} />}
          >
            {pending > 0 ? `Bookings · ${pending}` : "Bookings"}
          </Button>
        </>
      }
    >
      <ContextBar
        context={<>Promote your venue, nurture leads, and keep bookers informed about schedule changes.</>}
        actions={[
          { key: "leads", label: "Leads pipeline", icon: <Inbox size={12} />, href: withQuery(proRouteForFeature("places.leads")) },
          { key: "messages", label: "Messenger", icon: <MessageSquare size={12} />, href: "/messages" },
        ]}
      />

      <Card>
        <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>Venue promotions</h3>
        <p className="pro-text-muted" style={{ fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>
          Highlight off-peak discounts, new facilities, or seasonal offers on your place profile and feed.
        </p>
        <Button variant="primary" href={activePlace ? `/places/${activePlace.id}/manage` : withQuery("/pro/place")}>
          Manage place profile
        </Button>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>Lead follow-up</h3>
        <p className="pro-text-muted" style={{ fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>
          Reply to booking enquiries and walk-in leads from messenger — speed wins repeat bookings.
        </p>
        <Button variant="secondary" href="/messages">Open messenger</Button>
      </Card>
    </PageShell>
  );
}
