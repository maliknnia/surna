import { Link } from "wouter";
import { LayoutGrid } from "lucide-react";
import { EntityCard } from "@/features/my-hub/components";
import { useMyHubSummary } from "@/features/my-hub/hooks/useMyHubSummary";
import { HUB_MANAGE_ITEMS } from "@/lib/createHub";
import { ROUTES } from "@/navigation";

type HubManagePanelProps = {
  showMyHubLink?: boolean;
  compact?: boolean;
};

export function HubManagePanel({ showMyHubLink = true, compact = false }: HubManagePanelProps) {
  const { data, isLoading } = useMyHubSummary();

  const primaryItems = compact
    ? HUB_MANAGE_ITEMS.filter((i) => ["events", "teams", "places"].includes(i.id))
    : HUB_MANAGE_ITEMS;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2
            className="text-sm font-bold uppercase tracking-wide"
            style={{ color: "var(--surna-text)" }}
          >
            Your creations
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--surna-text-secondary)" }}>
            Everything you create lives here — edit, share, or cancel anytime.
          </p>
        </div>
        {showMyHubLink ? (
          <Link href={ROUTES.myHub}>
            <button
              type="button"
              className="text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95 transition-transform shrink-0"
              style={{
                background: "var(--surna-elevated)",
                color: "var(--surna-text)",
                border: "1px solid var(--surna-separator)",
              }}
            >
              <LayoutGrid size={12} />
              My Hub
            </button>
          </Link>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: compact ? 3 : 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl animate-pulse h-[76px]"
              style={{ background: "var(--surna-elevated)", border: "1px solid var(--surna-separator)" }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {primaryItems.map((item) => (
            <EntityCard
              key={item.id}
              href={item.route}
              icon={item.icon}
              title={item.title}
              description={item.description}
              count={item.countKey ? data?.[item.countKey] : undefined}
              badgeCount={item.badgeKey ? data?.[item.badgeKey] ?? 0 : 0}
              badgeTone={
                item.badgeKey === "pendingRequests" || item.badgeKey === "unreadMessages"
                  ? "alert"
                  : "default"
              }
              testId={item.testId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
