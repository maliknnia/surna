import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, X } from "lucide-react";
import { useProTeam } from "./components/ProTeamContext";
import { useProPlace } from "./components/ProPlaceContext";
import { useProShop } from "./components/ProShopContext";
import { useProWorkspaceMode } from "./lib/proWorkspaceMode";
import { marketplaceShopPath } from "@/lib/marketplaceApi";
import { useProWorkflowStream } from "./components/proWorkflowApi";
import {
  PLACE_MORE_NAV,
  PLACE_PRIMARY_NAV,
  PRO_MORE_NAV,
  PRO_PRIMARY_NAV,
  SHOP_MORE_NAV,
  SHOP_PRIMARY_NAV,
  type ProNavItem,
  type WorkspaceQuery,
  isNavActive,
  pageLabelForPath,
  withWorkspaceQuery,
} from "./lib/proWorkspaceNav";
import "./pro-workspace.css";

function isTeamModeActive(mode: string): boolean {
  return mode === "team";
}

function navHref(item: ProNavItem, query: WorkspaceQuery, special?: string): string {
  if (special) return special;
  if (item.path.startsWith("#")) return item.path;
  if (!item.path.startsWith("/pro")) return item.path;
  return withWorkspaceQuery(item.path, query);
}

function MoreToolsSheet({
  open,
  onClose,
  items,
  query,
  currentPath,
  specialHrefs,
}: {
  open: boolean;
  onClose: () => void;
  items: ProNavItem[];
  query: WorkspaceQuery;
  currentPath: string;
  specialHrefs?: Record<string, string | undefined>;
}) {
  if (!open) return null;
  return (
    <div className="pro-workspace-sheet" onClick={onClose} role="dialog" aria-modal="true">
      <div className="pro-workspace-sheet__panel" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 8px 8px" }}>
          <span style={{ fontWeight: 700, fontSize: 16, paddingLeft: 8 }}>All tools</span>
          <button type="button" className="pro-workspace__back" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {items.map((item) => {
          const Icon = item.icon;
          const href = navHref(item, query, specialHrefs?.[item.id]);
          const active = isNavActive(item.path, currentPath, item.exact);
          return (
            <Link key={item.id} href={href}>
              <button
                type="button"
                className="pro-workspace-sheet__row"
                onClick={onClose}
                style={active ? { background: "var(--pro-gold-soft)" } : undefined}
                data-testid={`pro-more-${item.id}`}
              >
                <span className="pro-workspace-tool__icon" style={{ width: 32, height: 32 }}>
                  <Icon size={16} />
                </span>
                {item.label}
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function DesktopRail({
  primary,
  morePreview,
  query,
  currentPath,
  matchLabel,
  onMore,
  specialHrefs,
}: {
  primary: ProNavItem[];
  morePreview: ProNavItem[];
  query: WorkspaceQuery;
  currentPath: string;
  matchLabel?: string;
  onMore: () => void;
  specialHrefs?: Record<string, string | undefined>;
}) {
  const primaryItems = primary.filter((n) => n.id !== "more" && n.id !== "scan" && n.id !== "products");
  return (
    <aside className="pro-workspace__rail">
      <div className="pro-workspace__rail-section">Workspace</div>
      {primaryItems.map((item) => {
        const Icon = item.icon;
        const href = navHref(item, query, specialHrefs?.[item.id]);
        const active = isNavActive(item.path, currentPath, item.exact);
        const label = item.id === "match" && matchLabel ? matchLabel : item.label;
        return (
          <Link key={item.id} href={href}>
            <span
              className={`pro-workspace__rail-item${active ? " pro-workspace__rail-item--active" : ""}`}
              data-testid={`pro-rail-${item.id}`}
            >
              <Icon size={17} strokeWidth={2.2} />
              {label}
            </span>
          </Link>
        );
      })}
      <div className="pro-workspace__rail-section" style={{ marginTop: 16 }}>More tools</div>
      {morePreview.slice(0, 6).map((item) => {
        const Icon = item.icon;
        const href = navHref(item, query, specialHrefs?.[item.id]);
        const active = isNavActive(item.path, currentPath, item.exact);
        return (
          <Link key={item.id} href={href}>
            <span
              className={`pro-workspace__rail-item${active ? " pro-workspace__rail-item--active" : ""}`}
              data-testid={`pro-rail-${item.id}`}
            >
              <Icon size={17} strokeWidth={2.2} />
              {item.label}
            </span>
          </Link>
        );
      })}
      <button type="button" className="pro-workspace__rail-item" onClick={onMore} style={{ width: "100%", border: "none", cursor: "pointer" }}>
        <span style={{ opacity: 0.7 }}>+</span>
        See all tools
      </button>
    </aside>
  );
}

function MobileTabs({
  primary,
  moreItems,
  query,
  currentPath,
  matchLabel,
  scanHref,
  storefrontHref,
  onMore,
}: {
  primary: ProNavItem[];
  moreItems: ProNavItem[];
  query: WorkspaceQuery;
  currentPath: string;
  matchLabel?: string;
  scanHref?: string;
  storefrontHref?: string;
  onMore: () => void;
}) {
  return (
    <nav className="pro-workspace__tabs" aria-label="Pro workspace">
      {primary.map((item) => {
        const Icon = item.icon;
        const label = item.id === "match" && matchLabel ? matchLabel : item.label;
        if (item.id === "more") {
          const moreActive = moreItems.some((m) => isNavActive(m.path, currentPath, m.exact));
          return (
            <button
              key={item.id}
              type="button"
              className={`pro-workspace__tab${moreActive ? " pro-workspace__tab--active" : ""}`}
              onClick={onMore}
              data-testid="pro-tab-more"
            >
              <span className="pro-workspace__tab-icon"><Icon size={20} strokeWidth={2} /></span>
              {label}
            </button>
          );
        }
        const special = item.id === "scan" ? scanHref : item.id === "products" ? storefrontHref : undefined;
        if (special) {
          return (
            <Link key={item.id} href={special}>
              <span className="pro-workspace__tab" data-testid={`pro-tab-${item.id}`}>
                <span className="pro-workspace__tab-icon"><Icon size={20} strokeWidth={2} /></span>
                {label}
              </span>
            </Link>
          );
        }
        const href = navHref(item, query);
        const active = isNavActive(item.path, currentPath, item.exact);
        return (
          <Link key={item.id} href={href}>
            <span
              className={`pro-workspace__tab${active ? " pro-workspace__tab--active" : ""}`}
              data-testid={`pro-tab-${item.id}`}
            >
              <span className="pro-workspace__tab-icon"><Icon size={20} strokeWidth={2} /></span>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function ProWorkspaceShell({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { mode, isPlaceMode, isShopMode, basePath } = useProWorkspaceMode();
  const { teamId, activeTeam, teams, setTeamId, sportProfile } = useProTeam();
  const { placeId, activePlace, places, setPlaceId } = useProPlace();
  const { shopId, activeShop, shops, setShopId } = useProShop();

  useProWorkflowStream(isTeamModeActive(mode) ? teamId ?? undefined : undefined);

  const matchLabel = sportProfile.supportsTacticalBoard ? "Match Day" : "Game Day";
  const pageTitle = pageLabelForPath(basePath, matchLabel, mode);

  const primary = isShopMode ? SHOP_PRIMARY_NAV : isPlaceMode ? PLACE_PRIMARY_NAV : PRO_PRIMARY_NAV;
  const moreItems = isShopMode ? SHOP_MORE_NAV : isPlaceMode ? PLACE_MORE_NAV : PRO_MORE_NAV;
  const query: WorkspaceQuery = isShopMode ? { shopId } : isPlaceMode ? { placeId } : { teamId };
  const backHref = isShopMode ? "/my-hub/shops" : isPlaceMode ? "/my-hub/places" : "/my-hub/teams";
  const eyebrow = isShopMode ? "Shop Pro" : isPlaceMode ? "Place Pro" : "Team Pro";
  const hasEntity = isShopMode ? shops.length > 0 : isPlaceMode ? places.length > 0 : teams.length > 0;
  const title = !hasEntity
    ? "Pro workspaces"
    : isShopMode
      ? (activeShop?.name ?? "Your shop")
      : isPlaceMode
        ? (activePlace?.name ?? "Your venue")
        : (activeTeam?.name ?? "Your team");
  const scanHref = activePlace ? `/places/${activePlace.id}#scan` : undefined;
  const storefrontHref = activeShop ? marketplaceShopPath(activeShop.id) : undefined;
  const specialHrefs: Record<string, string | undefined> = {
    scan: scanHref,
    products: storefrontHref,
  };

  useEffect(() => {
    const main = document.querySelector(".pro-workspace__main");
    if (main) main.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [location]);

  useEffect(() => {
    setMoreOpen(false);
  }, [location]);

  const switchOptions = isShopMode ? shops : isPlaceMode ? places : teams;
  const switchValue = isShopMode ? (shopId ?? "") : isPlaceMode ? (placeId ?? "") : (teamId ?? "");
  const switchLabel = isShopMode ? "Switch shop" : isPlaceMode ? "Switch venue" : "Switch team";

  return (
    <div className="pro-workspace">
      <header className="pro-workspace__header">
        <div className="pro-workspace__header-inner">
          <Link href={backHref}>
            <button type="button" className="pro-workspace__back" aria-label="Back to My Hub" data-testid="pro-back-myhub">
              <ChevronLeft size={20} />
            </button>
          </Link>
          <div className="pro-workspace__identity">
            <div className="pro-workspace__eyebrow">
              <span className="pro-workspace__eyebrow-dot" aria-hidden />
              {eyebrow} · {pageTitle}
            </div>
            <h1 className="pro-workspace__title">{title}</h1>
          </div>
          {switchOptions.length > 1 ? (
            <select
              value={switchValue}
              onChange={(e) => {
                const next = e.target.value;
                if (isShopMode) {
                  setShopId(next);
                } else if (isPlaceMode) {
                  setPlaceId(next);
                } else {
                  setTeamId(next);
                }
                const params = new URLSearchParams(window.location.search);
                if (isShopMode) {
                  params.set("shop", next);
                  params.delete("team");
                  params.delete("place");
                } else if (isPlaceMode) {
                  params.set("place", next);
                  params.delete("team");
                  params.delete("shop");
                } else {
                  params.set("team", next);
                  params.delete("place");
                  params.delete("shop");
                }
                navigate(`${basePath}?${params.toString()}`);
              }}
              aria-label={switchLabel}
              style={{
                maxWidth: 120,
                fontSize: 12,
                fontWeight: 600,
                padding: "8px 10px",
                borderRadius: 10,
                background: "var(--pro-surface-2)",
                color: "var(--pro-text)",
                border: "0.5px solid var(--pro-border)",
              }}
              data-testid={isShopMode ? "pro-shop-switcher" : isPlaceMode ? "pro-place-switcher" : "pro-team-switcher"}
            >
              {switchOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          ) : null}
        </div>
      </header>

      <div className="pro-workspace__body">
        <DesktopRail
          primary={primary}
          morePreview={moreItems}
          query={query}
          currentPath={basePath}
          matchLabel={matchLabel}
          onMore={() => setMoreOpen(true)}
          specialHrefs={specialHrefs}
        />
        <main className="pro-workspace__main">
          <div className="pro-page-fade">{children}</div>
        </main>
      </div>

      <MobileTabs
        primary={primary}
        moreItems={moreItems}
        query={query}
        currentPath={basePath}
        matchLabel={matchLabel}
        scanHref={isPlaceMode ? scanHref : undefined}
        storefrontHref={isShopMode ? storefrontHref : undefined}
        onMore={() => setMoreOpen(true)}
      />

      <MoreToolsSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        items={moreItems}
        query={query}
        currentPath={basePath}
        specialHrefs={specialHrefs}
      />
    </div>
  );
}
