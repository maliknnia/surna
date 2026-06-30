import { Link } from "wouter";
import { Users, Building2, Store, ArrowRight, Sparkles } from "lucide-react";
import { useProTeam } from "./components/ProTeamContext";
import { useProPlace } from "./components/ProPlaceContext";
import { useProShop } from "./components/ProShopContext";
import {
  proPlaceWorkspaceEntry,
  proShopWorkspaceEntry,
  proTeamWorkspaceEntry,
} from "./lib/proWorkspaceNav";

type Props = {
  /** Which workspace route the user tried to open — tunes empty copy. */
  focus?: "team" | "place" | "shop";
};

export default function ProWorkspaceLauncher({ focus = "team" }: Props) {
  const { teams, teamsLoading, activeTeam } = useProTeam();
  const { places, placesLoading, activePlace } = useProPlace();
  const { shops, shopsLoading, activeShop, stats } = useProShop();

  const loading = teamsLoading || placesLoading || shopsLoading;
  const hasTeam = teams.length > 0;
  const hasPlace = places.length > 0;
  const hasShop = shops.length > 0;
  const hasAny = hasTeam || hasPlace || hasShop;

  const cards = [
    {
      key: "team",
      title: "Team Pro",
      desc: hasTeam
        ? `${teams.length} team${teams.length === 1 ? "" : "s"} · squad, fixtures & analytics`
        : "Create or join a team in My Hub",
      icon: Users,
      href: hasTeam && activeTeam ? proTeamWorkspaceEntry(activeTeam.id) : "/my-hub/teams",
      cta: hasTeam ? "Open workspace" : "Go to teams",
      count: teams.length,
      available: hasTeam,
    },
    {
      key: "place",
      title: "Place Pro",
      desc: hasPlace
        ? `${places.length} venue${places.length === 1 ? "" : "s"} · bookings, pricing & staff`
        : "Add a venue you manage on the map",
      icon: Building2,
      href: hasPlace && activePlace ? proPlaceWorkspaceEntry(activePlace.id) : "/my-hub/places",
      cta: hasPlace ? "Open workspace" : "Go to places",
      count: places.length,
      available: hasPlace,
    },
    {
      key: "shop",
      title: "Shop Pro",
      desc: hasShop
        ? `${stats?.pendingOrders ? `${stats.pendingOrders} pending · ` : ""}orders, inventory & revenue`
        : "Set up your marketplace seller account",
      icon: Store,
      href: hasShop && activeShop ? proShopWorkspaceEntry(activeShop.id) : "/my-hub/shops",
      cta: hasShop ? "Open workspace" : "Go to shop",
      count: hasShop ? 1 : 0,
      available: hasShop,
    },
  ];

  const focusCopy =
    focus === "place"
      ? "Pick a venue workspace — or set one up in My Hub."
      : focus === "shop"
        ? "Connect your shop — or create a seller account first."
        : "Pick a workspace to manage — team, venue, or shop.";

  if (loading) {
    return (
      <div data-testid="pro-workspace-launcher-loading" style={{ padding: "24px 0" }}>
        <div
          className="animate-pulse"
          style={{
            height: 120,
            borderRadius: 16,
            background: "var(--pro-surface-2)",
            marginBottom: 16,
          }}
        />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{
              height: 88,
              borderRadius: 14,
              background: "var(--pro-bg-elevated)",
              marginBottom: 10,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div data-testid="pro-workspace-launcher">
      <section className="pro-workspace-home__hero">
        <p style={{ margin: 0, fontSize: 13, color: "var(--pro-text-muted)", lineHeight: 1.5, display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={14} style={{ color: "var(--pro-gold)" }} />
          SURNA Pro
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 15, fontWeight: 600, color: "var(--pro-text)", lineHeight: 1.45 }}>
          {hasAny ? (
            <>
              Your <span style={{ color: "var(--pro-gold)" }}>Pro workspaces</span> — one subscription, every hat you wear.
            </>
          ) : (
            <>
              Pro is ready — add a <span style={{ color: "var(--pro-gold)" }}>team, venue, or shop</span> in My Hub to get started.
            </>
          )}
        </p>
        <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--pro-text-muted)", lineHeight: 1.5 }}>
          {focusCopy}
        </p>
      </section>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {cards.map((card) => {
          const Icon = card.icon;
          const dimmed = focus !== card.key && !card.available && hasAny;
          return (
            <Link key={card.key} href={card.href}>
              <div
                className="pro-workspace-launcher__card"
                data-testid={`pro-launcher-${card.key}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 18px",
                  borderRadius: 16,
                  background: card.available ? "var(--pro-bg-elevated)" : "var(--pro-surface-2)",
                  border: `0.5px solid ${card.key === focus && !card.available ? "color-mix(in srgb, var(--pro-gold) 45%, var(--pro-border))" : "var(--pro-border)"}`,
                  opacity: dimmed ? 0.72 : 1,
                }}
              >
                <span
                  className="pro-workspace-tool__icon"
                  style={{
                    width: 44,
                    height: 44,
                    background: card.available ? "var(--pro-gold-soft)" : "var(--pro-surface-2)",
                  }}
                >
                  <Icon size={20} style={{ color: card.available ? "var(--pro-gold)" : "var(--pro-text-muted)" }} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--pro-text)" }}>{card.title}</div>
                  <div style={{ fontSize: 12, color: "var(--pro-text-muted)", marginTop: 3, lineHeight: 1.4 }}>{card.desc}</div>
                </div>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--pro-gold)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {card.cta}
                  <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {!hasAny ? (
        <Link href="/my-hub">
          <div
            style={{
              marginTop: 20,
              padding: "14px 16px",
              borderRadius: 14,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--pro-text-muted)",
              border: "0.5px dashed var(--pro-border)",
            }}
            data-testid="pro-launcher-myhub"
          >
            Open My Hub to create your first team, place, or shop →
          </div>
        </Link>
      ) : null}
    </div>
  );
}
