import { Link } from "wouter";
import { BarChart3, ShoppingBag, Package, TrendingUp, Users, Store } from "lucide-react";
import { PageShell, Card, Button, StatCard, ContextBar } from "../components/primitives";
import { useProWorkspaceContext } from "../lib/useProWorkspaceContext";
import { marketplaceShopPath } from "@/lib/marketplaceApi";

export default function ProShopStatsModule() {
  const { entityName, activeShop, shopStats, withQuery } = useProWorkspaceContext();
  const stats = shopStats;

  return (
    <PageShell
      title="My Shop Performance"
      subtitle={`${entityName} · sales & shop metrics`}
      actions={
        <>
          <Button variant="secondary" href="/analytics/marketplace" leadingIcon={<TrendingUp size={14} />}>
            Marketplace Trends
          </Button>
          {activeShop ? (
            <Button variant="secondary" href={marketplaceShopPath(activeShop.id)} leadingIcon={<Store size={14} />}>
              Storefront
            </Button>
          ) : null}
        </>
      }
    >
      <ContextBar
        context={<>This shop’s pulse — open Marketplace Trends for conversion, traffic, and revenue across the marketplace.</>}
        actions={[
          { key: "analytics", label: "Marketplace Trends", icon: <BarChart3 size={12} />, href: "/analytics/marketplace" },
          { key: "orders", label: "Orders", icon: <ShoppingBag size={12} />, href: "/seller/dashboard" },
        ]}
      />

      <div className="pro-grid pro-grid-4" style={{ gap: 12, marginBottom: 16 }}>
        <StatCard label="Active products" value={stats?.activeProducts ?? 0} icon={<Package size={12} />} />
        <StatCard label="Pending orders" value={stats?.pendingOrders ?? 0} icon={<ShoppingBag size={12} />} />
        <StatCard label="Completed orders" value={stats?.completedOrders ?? 0} icon={<TrendingUp size={12} />} />
        <StatCard label="Followers" value={activeShop?.followersCount ?? 0} icon={<Users size={12} />} />
      </div>

      <Card>
        <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>Grow your shop</h3>
        <p className="pro-text-muted" style={{ fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>
          Promote listings, reply to buyers quickly, and track conversion in marketplace analytics.
        </p>
        <div className="pro-row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Button variant="primary" href="/analytics/marketplace">Marketplace Trends</Button>
          <Button variant="secondary" href={withQuery("/pro/comms")}>Promotions & messages</Button>
          <Link href={withQuery("/pro/shop")}>
            <Button variant="ghost">Back to shop home</Button>
          </Link>
        </div>
      </Card>
    </PageShell>
  );
}
