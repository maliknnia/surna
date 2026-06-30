import { Sparkles, Crown } from "lucide-react";
import { Link } from "wouter";
import { useProEntitlement, isProEntitlementActive } from "@/hooks/useProEntitlement";

interface Props {
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function UpgradePromptCard({
  title = "Manage like a pro",
  description = "Schedules, analytics, and team workflows live in SURNA Pro.",
  ctaLabel = "Subscribe to Pro",
  ctaHref = "/subscribe",
}: Props) {
  const { data: entitlement, isLoading } = useProEntitlement();
  const isPro = isProEntitlementActive(entitlement);

  if (isLoading) return null;

  if (isPro) {
    return (
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{
          background: "linear-gradient(135deg, var(--surna-elevated) 0%, var(--surna-bg-highlight) 100%)",
          border: "1px solid var(--surna-border)",
        }}
        data-testid="pro-active-prompt-card"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--surna-text)", color: "var(--surna-bg)" }}
        >
          <Crown className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
            Pro is active
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--surna-text-secondary)" }}>
            Open a team, place, or shop in My Hub → Pro workspace.
          </div>
        </div>
        <Link href="/my-hub">
          <button
            className="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap"
            style={{ background: "var(--surna-text)", color: "var(--surna-bg)" }}
            data-testid="pro-active-cta"
          >
            My Hub
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-3"
      style={{
        background:
          "linear-gradient(135deg, var(--surna-elevated) 0%, var(--surna-bg-highlight) 100%)",
        border: "1px solid var(--surna-border)",
      }}
      data-testid="upgrade-prompt-card"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--surna-text)", color: "var(--surna-bg)" }}
      >
        <Sparkles className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
          {title}
        </div>
        <div className="text-xs mt-0.5" style={{ color: "var(--surna-text-secondary)" }}>
          {description}
        </div>
      </div>
      <Link href={ctaHref}>
        <button
          className="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap"
          style={{ background: "var(--surna-text)", color: "var(--surna-bg)" }}
          data-testid="upgrade-cta"
        >
          {ctaLabel}
        </button>
      </Link>
    </div>
  );
}
