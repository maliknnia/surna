import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Store } from "lucide-react";
import {
  SectionHeader,
  EmptyState,
  UpgradePromptCard,
} from "@/features/my-hub/components";
import { MyHubShopCard, type MyHubShop } from "@/features/my-hub/components/MyHubShopCard";
import { HubSubpageHeader } from "@/components/create/HubSubpageHeader";
import { ROUTES } from "@/navigation/routes";

type ShopDashboardResponse = {
  shop: MyHubShop;
  stats: {
    activeProducts: number;
    pendingOrders: number;
    completedOrders: number;
  };
};

export default function MyHubShopsPage() {
  const { data, isLoading, isError } = useQuery<ShopDashboardResponse>({
    queryKey: ["/api/marketplace/seller/shop"],
    retry: false,
  });

  const shop = data?.shop;
  const stats = data?.stats;
  const showEmpty = !isLoading && !isError && !shop;

  return (
    <div
      className="min-h-screen pb-32"
      style={{ background: "var(--surna-void)" }}
      data-testid="my-hub-shops-page"
    >
      <HubSubpageHeader title="My Shop" createType="post" testId="my-hub-shops-title" />

      <div className="max-w-md mx-auto px-4 pt-4 space-y-6">
        {isLoading && (
          <div className="space-y-3" data-testid="shops-loading">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl animate-pulse"
                style={{
                  height: 220,
                  background: "var(--surna-elevated)",
                  border: "1px solid var(--surna-border)",
                }}
              />
            ))}
          </div>
        )}

        {isError && !shop && (
          <div
            className="rounded-2xl p-4 text-center text-sm"
            style={{
              background: "var(--surna-elevated)",
              border: "1px solid var(--surna-border)",
              color: "var(--surna-text-secondary)",
            }}
            data-testid="shops-error"
          >
            Couldn't load your shop. Please try again.
          </div>
        )}

        {showEmpty && (
          <EmptyState
            icon={Store}
            title="You don't have a shop yet"
            description="List gear, merch, or equipment on the marketplace and manage orders from one place."
            ctaLabel="Create your first listing"
            ctaHref={ROUTES.createMarketplaceListing}
            testId="shops-empty-state"
          />
        )}

        {shop ? (
          <section className="space-y-3">
            <SectionHeader title="Your shop" subtitle="Marketplace seller account" />
            <MyHubShopCard shop={shop} stats={stats} />
            <Link href={ROUTES.createMarketplaceListing}>
              <button
                type="button"
                className="w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-all active:scale-[0.99]"
                style={{
                  background: "var(--surna-elevated)",
                  border: "1px solid var(--surna-border)",
                  color: "var(--surna-text)",
                }}
                data-testid="shops-add-listing"
              >
                Add new listing
              </button>
            </Link>
          </section>
        ) : null}

        <UpgradePromptCard
          title="Sell smarter with Shop Pro"
          description="Order fulfillment, inventory, promotions, and revenue analytics live in SURNA Pro."
          ctaHref={shop ? `/pro/shop?shop=${shop.id}` : ROUTES.subscribe}
        />

        <div className="h-4" />
      </div>
    </div>
  );
}
