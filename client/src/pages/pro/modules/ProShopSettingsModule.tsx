import { Link } from "wouter";
import {
  Store,
  ShoppingBag,
  Bell,
  CreditCard,
  Shield,
  Settings,
  ChevronRight,
  Package,
} from "lucide-react";
import { PageShell, Card, Button, ContextBar } from "../components/primitives";
import { useProWorkspaceContext } from "../lib/useProWorkspaceContext";
import { marketplaceShopPath } from "@/lib/marketplaceApi";
import { ROUTES } from "@/navigation/routes";

type SettingRow = {
  key: string;
  label: string;
  desc: string;
  href: string;
  icon: typeof Store;
};

export default function ProShopSettingsModule() {
  const { entityName, activeShop, withQuery } = useProWorkspaceContext();

  const rows: SettingRow[] = [
    {
      key: "seller",
      label: "Seller dashboard",
      desc: "Orders, payouts, and shop policies",
      href: "/seller/dashboard",
      icon: ShoppingBag,
    },
    {
      key: "storefront",
      label: "Storefront",
      desc: "Logo, banner, and public shop page",
      href: activeShop ? marketplaceShopPath(activeShop.id) : withQuery("/pro/shop"),
      icon: Store,
    },
    {
      key: "products",
      label: "Products & inventory",
      desc: "Listings, stock, and pricing",
      href: withQuery("/pro/inventory"),
      icon: Package,
    },
    {
      key: "notifications",
      label: "Notifications",
      desc: "Order alerts and buyer messages",
      href: ROUTES.settings,
      icon: Bell,
    },
    {
      key: "billing",
      label: "Billing & Pro plan",
      desc: "Subscription and marketplace fees",
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
      subtitle={`${entityName} · shop configuration`}
      actions={
        <Button variant="primary" href="/seller/dashboard" leadingIcon={<Settings size={14} />}>
          Seller settings
        </Button>
      }
    >
      <ContextBar
        context={<>Manage how your shop sells, fulfills orders, and appears on the marketplace.</>}
        actions={[{ key: "home", label: "Shop home", icon: <Store size={12} />, href: withQuery("/pro/shop") }]}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <Link key={row.key} href={row.href}>
              <Card interactive data-testid={`pro-shop-setting-${row.key}`}>
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
