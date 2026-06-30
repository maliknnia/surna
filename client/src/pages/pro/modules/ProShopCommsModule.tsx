import { Megaphone, MessageSquare, ShoppingBag, Inbox } from "lucide-react";
import { PageShell, Card, Button, ContextBar } from "../components/primitives";
import { useProWorkspaceContext } from "../lib/useProWorkspaceContext";

export default function ProShopCommsModule() {
  const { entityName, withQuery } = useProWorkspaceContext();

  return (
    <PageShell
      title="Promotions"
      subtitle={`${entityName} · buyer messages & shop announcements`}
      actions={
        <>
          <Button variant="primary" href="/messages" leadingIcon={<MessageSquare size={14} />}>
            Buyer messages
          </Button>
          <Button variant="secondary" href="/seller/dashboard" leadingIcon={<ShoppingBag size={14} />}>
            Orders
          </Button>
        </>
      }
    >
      <ContextBar
        context={<>Reply to buyers in messenger and drive sales with shop promotions and order updates.</>}
        actions={[
          { key: "messages", label: "Open messenger", icon: <Inbox size={12} />, href: "/messages" },
          { key: "stats", label: "Performance", icon: <Megaphone size={12} />, href: withQuery("/pro/stats") },
        ]}
      />

      <Card>
        <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>Customer conversations</h3>
        <p className="pro-text-muted" style={{ fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>
          Message buyers from their profile or order screen. Fast replies improve conversion and seller rating.
        </p>
        <Button variant="primary" href="/messages">Go to messages</Button>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>Shop announcements</h3>
        <p className="pro-text-muted" style={{ fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>
          Post updates on your storefront and share new drops with followers on the marketplace.
        </p>
        <div className="pro-row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Button variant="secondary" href="/seller/dashboard">Seller dashboard</Button>
          <Button variant="ghost" href={withQuery("/pro/shop")}>Shop home</Button>
        </div>
      </Card>
    </PageShell>
  );
}
