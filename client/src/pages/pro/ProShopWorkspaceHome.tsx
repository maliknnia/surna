import { Link } from "wouter";
import {
  ShoppingBag,
  Package,
  BarChart3,
  Store,
  Megaphone,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { useProShop } from "./components/ProShopContext";
import { marketplaceShopPath } from "@/lib/marketplaceApi";
import { withShopQuery } from "./lib/proWorkspaceNav";
import ProWorkspaceLauncher from "./ProWorkspaceLauncher";

export default function ProShopWorkspaceHome() {
  const { shopId, activeShop, shops, shopsLoading, stats } = useProShop();

  if (!shopsLoading && shops.length === 0) {
    return <ProWorkspaceLauncher focus="shop" />;
  }

  const pending = stats?.pendingOrders ?? 0;
  const loading = shopsLoading || !shopId;

  const tools = [
    {
      key: "orders",
      label: pending > 0 ? `Orders · ${pending}` : "Orders",
      desc: "Track and fulfill sales",
      path: "/seller/dashboard",
      icon: ShoppingBag,
      external: true,
    },
    {
      key: "storefront",
      label: "Storefront",
      desc: "View your public shop",
      path: activeShop ? marketplaceShopPath(activeShop.id) : "#",
      icon: Store,
      external: true,
    },
    {
      key: "products",
      label: "Products",
      desc: `${stats?.activeProducts ?? 0} active listings`,
      path: withShopQuery("/pro/inventory", shopId),
      icon: Package,
      external: false,
    },
    {
      key: "analytics",
      label: "Analytics",
      desc: "Views, conversion, revenue",
      path: "/analytics/marketplace",
      icon: TrendingUp,
      external: true,
    },
    {
      key: "promotions",
      label: "Promotions",
      desc: "Offers and announcements",
      path: withShopQuery("/pro/comms", shopId),
      icon: Megaphone,
      external: false,
    },
    {
      key: "performance",
      label: "Performance",
      desc: "Deep shop metrics",
      path: withShopQuery("/pro/stats", shopId),
      icon: BarChart3,
      external: false,
    },
  ];

  return (
    <div data-testid="pro-shop-workspace-home">
      <section className="pro-workspace-home__hero">
        <p style={{ margin: 0, fontSize: 13, color: "var(--pro-text-muted)", lineHeight: 1.5, textTransform: "capitalize" }}>
          {activeShop?.businessType ?? "Shop"}{activeShop?.city ? ` · ${activeShop.city}` : ""}
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 15, fontWeight: 600, color: "var(--pro-text)", lineHeight: 1.45 }}>
          Grow <span style={{ color: "var(--pro-gold)" }}>{activeShop?.name ?? "your shop"}</span> — orders, products, and insights in one workspace.
        </p>
        {!loading && stats ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
            {[
              { label: "Products", value: stats.activeProducts },
              { label: "Pending orders", value: stats.pendingOrders },
              { label: "Followers", value: activeShop?.followersCount ?? 0 },
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
        <Link href="/seller/dashboard">
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
            data-testid="pro-shop-pending-banner"
          >
            <ShoppingBag size={18} style={{ color: "var(--pro-gold)", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{pending} order{pending === 1 ? "" : "s"} to fulfill</div>
              <div style={{ fontSize: 12, color: "var(--pro-text-muted)", marginTop: 2 }}>Open order tracking</div>
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
          No pending orders — your shop is ready for sales.
        </div>
      ) : null}

      <h2 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--pro-text-subtle)" }}>
        Tools
      </h2>
      <div className="pro-workspace-home__tools">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const inner = (
            <span className="pro-workspace-tool" data-testid={`pro-shop-tool-${tool.key}`}>
              <span className="pro-workspace-tool__icon"><Icon size={18} /></span>
              <span className="pro-workspace-tool__label">{tool.label}</span>
              <span className="pro-workspace-tool__desc">{tool.desc}</span>
            </span>
          );
          return (
            <Link key={tool.key} href={tool.path}>
              {inner}
            </Link>
          );
        })}
      </div>

      <h2 style={{ margin: "24px 0 12px", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--pro-text-subtle)" }}>
        Grow sales
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { key: "leads", label: "Customer messages", desc: "Reply to buyers in messenger", path: "/messages", icon: Inbox },
          { key: "marketplace", label: "Browse marketplace", desc: "See how buyers discover gear", path: "/marketplace", icon: Store },
        ].map((row) => {
          const Icon = row.icon;
          return (
            <Link key={row.key} href={row.path}>
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
    </div>
  );
}
