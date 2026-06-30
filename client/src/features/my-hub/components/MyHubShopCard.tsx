import { useState } from "react";
import { Link } from "wouter";
import {
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Package,
  BarChart3,
  Store,
  Megaphone,
} from "lucide-react";
import { LockedAction } from "./LockedAction";
import { useProEntitlement, isProEntitlementActive } from "@/hooks/useProEntitlement";
import { proShopWorkspaceHref } from "@/lib/proFeatures";
import { marketplaceShopPath } from "@/lib/marketplaceApi";

export type MyHubShop = {
  id: string;
  name: string;
  businessType?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  city?: string | null;
  followersCount?: number;
  productsCount?: number;
  isVerified?: boolean;
};

type DashboardResponse = {
  shop: MyHubShop;
  stats: {
    activeProducts: number;
    pendingOrders: number;
    completedOrders: number;
  };
};

interface Props {
  shop: MyHubShop;
  stats?: DashboardResponse["stats"];
}

export function MyHubShopCard({ shop, stats }: Props) {
  const [proOpen, setProOpen] = useState(false);
  const { data: entitlement } = useProEntitlement();
  const isPro = isProEntitlementActive(entitlement);
  const pending = stats?.pendingOrders ?? 0;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--surna-elevated)",
        border: "1px solid var(--surna-border)",
      }}
      data-testid={`my-hub-shop-${shop.id}`}
    >
      <div className="p-4 flex gap-3">
        <div
          className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
          style={{ background: "var(--surna-bg-highlight)" }}
        >
          {shop.logoUrl ? (
            <img src={shop.logoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Store className="w-6 h-6" style={{ color: "var(--surna-text-secondary)" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: "var(--surna-text)" }}>
            {shop.name}
          </h3>
          {shop.businessType ? (
            <p className="text-[11px] mt-1 capitalize truncate" style={{ color: "var(--surna-text-secondary)" }}>
              {shop.businessType}{shop.city ? ` · ${shop.city}` : ""}
            </p>
          ) : null}
          <p className="text-[11px] mt-0.5" style={{ color: "var(--surna-text-muted)" }}>
            {stats?.activeProducts ?? shop.productsCount ?? 0} products · {shop.followersCount ?? 0} followers
            {pending > 0 ? ` · ${pending} pending orders` : ""}
          </p>
        </div>
      </div>

      <div className="px-3 py-2 flex items-center gap-1 overflow-x-auto" style={{ borderTop: "0.5px solid var(--surna-border)" }}>
        <Link href={marketplaceShopPath(shop.id)}>
          <ActionChip icon={Store} label="Storefront" testId={`shop-open-${shop.id}`} />
        </Link>
        <Link href="/seller/dashboard">
          <ActionChip icon={ShoppingBag} label={pending > 0 ? `Orders · ${pending}` : "Orders"} testId={`shop-orders-${shop.id}`} />
        </Link>
        <Link href="/analytics/marketplace">
          <ActionChip icon={BarChart3} label="Analytics" testId={`shop-analytics-${shop.id}`} />
        </Link>
      </div>

      <div className="px-4 py-3" style={{ borderTop: "0.5px solid var(--surna-border)" }}>
        <Link href={proShopWorkspaceHref(shop.id)}>
          <button
            type="button"
            className="w-full flex items-center justify-between gap-3 rounded-xl px-4 py-3 mb-3 transition-all active:scale-[0.99]"
            style={{
              background: "linear-gradient(135deg, color-mix(in srgb, var(--surna-gold, #f5c518) 22%, var(--surna-elevated)), var(--surna-elevated))",
              border: "1px solid color-mix(in srgb, var(--surna-gold, #f5c518) 35%, var(--surna-border))",
            }}
            data-testid={`shop-pro-workspace-${shop.id}`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "color-mix(in srgb, var(--surna-gold, #f5c518) 25%, transparent)" }}
              >
                <Sparkles className="w-4 h-4" style={{ color: "var(--surna-gold, #f5c518)" }} />
              </span>
              <span className="text-left min-w-0">
                <span className="block text-[13px] font-bold truncate" style={{ color: "var(--surna-text)" }}>
                  {isPro ? "Open Pro workspace" : "Shop Pro workspace"}
                </span>
                <span className="block text-[11px] truncate" style={{ color: "var(--surna-text-secondary)" }}>
                  Orders, inventory, analytics & promotions
                </span>
              </span>
            </span>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--surna-text-muted)" }} />
          </button>
        </Link>
        <button
          onClick={() => setProOpen((v) => !v)}
          className="w-full flex items-center justify-between text-[12px] font-semibold"
          style={{ color: "var(--surna-text-secondary)" }}
          data-testid={`shop-pro-toggle-${shop.id}`}
        >
          <span>Quick Pro tools</span>
          <ChevronRight className="w-4 h-4 transition-transform" style={{ transform: proOpen ? "rotate(90deg)" : "rotate(0deg)" }} />
        </button>
        {proOpen ? (
          <div className="mt-3 space-y-2" data-testid={`shop-pro-actions-${shop.id}`}>
            <LockedAction icon={Package} label="Inventory" description="Stock levels and variants" featureKey="shop.inventory" fromSurface="my-hub-shops" shopId={shop.id} testId={`shop-locked-inventory-${shop.id}`} />
            <LockedAction icon={Megaphone} label="Promotions" description="Discounts and shop announcements" featureKey="shop.promotions" fromSurface="my-hub-shops" shopId={shop.id} testId={`shop-locked-promos-${shop.id}`} />
            <LockedAction icon={BarChart3} label="Shop analytics" description="Revenue and conversion trends" featureKey="shop.analytics" fromSurface="my-hub-shops" shopId={shop.id} testId={`shop-locked-analytics-${shop.id}`} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ActionChip({
  icon: Icon,
  label,
  testId,
}: {
  icon: typeof Store;
  label: string;
  testId?: string;
}) {
  return (
    <button
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all active:scale-95"
      style={{ background: "var(--surna-bg-highlight)", color: "var(--surna-text)" }}
      data-testid={testId}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}
