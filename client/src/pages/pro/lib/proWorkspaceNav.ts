import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Swords,
  Dumbbell,
  MessageSquare,
  BarChart3,
  Briefcase,
  Trophy,
  Package,
  ClipboardCheck,
  Activity,
  Building2,
  Settings,
  MoreHorizontal,
  CalendarCheck,
  QrCode,
  DollarSign,
  Repeat,
  Clock4,
  Megaphone,
  Inbox,
  ShoppingBag,
  Store,
  TrendingUp,
} from "lucide-react";

import type { ProWorkspaceMode } from "./proWorkspaceMode";

export type ProNavItem = {
  id: string;
  path: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  primary?: boolean;
  matchDayLabel?: string;
};

export const PRO_PRIMARY_NAV: ProNavItem[] = [
  { id: "home", path: "/pro", label: "Home", icon: LayoutDashboard, exact: true, primary: true },
  { id: "squad", path: "/pro/roster", label: "Squad", icon: Users, primary: true },
  { id: "events", path: "/pro/schedule", label: "Events", icon: Calendar, primary: true },
  { id: "match", path: "/pro/match-day", label: "Match Day", icon: Swords, primary: true, matchDayLabel: "Match Day" },
  { id: "more", path: "#more", label: "More", icon: MoreHorizontal, primary: true },
];

export const PRO_MORE_NAV: ProNavItem[] = [
  { id: "training", path: "/pro/training", label: "Training", icon: Dumbbell },
  { id: "comms", path: "/pro/comms", label: "Messages", icon: MessageSquare },
  { id: "stats", path: "/pro/stats", label: "Analytics", icon: BarChart3 },
  { id: "recruitment", path: "/pro/recruitment", label: "Recruitment", icon: Briefcase },
  { id: "tournament", path: "/pro/tournament", label: "Tournaments", icon: Trophy },
  { id: "inventory", path: "/pro/inventory", label: "Inventory", icon: Package },
  { id: "approvals", path: "/pro/approvals", label: "Approvals", icon: ClipboardCheck },
  { id: "activity", path: "/pro/activity", label: "Activity", icon: Activity },
  { id: "club", path: "/pro/club", label: "Club", icon: Building2 },
  { id: "settings", path: "/pro/settings", label: "Settings", icon: Settings },
];

export const PLACE_PRIMARY_NAV: ProNavItem[] = [
  { id: "home", path: "/pro/place", label: "Home", icon: LayoutDashboard, exact: true, primary: true },
  { id: "bookings", path: "/pro/schedule", label: "Bookings", icon: CalendarCheck, primary: true },
  { id: "analytics", path: "/pro/stats", label: "Analytics", icon: BarChart3, primary: true },
  { id: "scan", path: "#scan", label: "Scan", icon: QrCode, primary: true },
  { id: "more", path: "#more", label: "More", icon: MoreHorizontal, primary: true },
];

export const PLACE_MORE_NAV: ProNavItem[] = [
  { id: "calendar", path: "/pro/schedule", label: "Booking calendar", icon: Calendar },
  { id: "recurring", path: "/pro/schedule", label: "Recurring blocks", icon: Repeat },
  { id: "slots", path: "/pro/schedule", label: "Time slots", icon: Clock4 },
  { id: "pricing", path: "/pro/club", label: "Pricing tiers", icon: DollarSign },
  { id: "promotions", path: "/pro/comms", label: "Promotions", icon: Megaphone },
  { id: "staff", path: "/pro/roster", label: "Staff & roles", icon: Users },
  { id: "leads", path: "/pro/recruitment", label: "Leads pipeline", icon: Inbox },
  { id: "settings", path: "/pro/settings", label: "Settings", icon: Settings },
];

export const SHOP_PRIMARY_NAV: ProNavItem[] = [
  { id: "home", path: "/pro/shop", label: "Home", icon: LayoutDashboard, exact: true, primary: true },
  { id: "orders", path: "/seller/dashboard", label: "Orders", icon: ShoppingBag, primary: true },
  { id: "products", path: "#storefront", label: "Store", icon: Store, primary: true },
  { id: "analytics", path: "/analytics/marketplace", label: "Analytics", icon: TrendingUp, primary: true },
  { id: "more", path: "#more", label: "More", icon: MoreHorizontal, primary: true },
];

export const SHOP_MORE_NAV: ProNavItem[] = [
  { id: "inventory", path: "/pro/inventory", label: "Inventory", icon: Package },
  { id: "promotions", path: "/pro/comms", label: "Promotions", icon: Megaphone },
  { id: "stats", path: "/pro/stats", label: "Performance", icon: BarChart3 },
  { id: "recruitment", path: "/pro/recruitment", label: "Customer leads", icon: Inbox },
  { id: "settings", path: "/pro/settings", label: "Settings", icon: Settings },
];

export type WorkspaceQuery = {
  teamId?: string | null;
  placeId?: string | null;
  shopId?: string | null;
};

export function withWorkspaceQuery(path: string, ctx: WorkspaceQuery): string {
  if (!path || path.startsWith("#")) return path;
  const [base, query] = path.split("?");
  const params = new URLSearchParams(query ?? "");
  if (ctx.teamId) {
    params.set("team", ctx.teamId);
    params.delete("place");
    params.delete("shop");
  } else if (ctx.placeId) {
    params.set("place", ctx.placeId);
    params.delete("team");
    params.delete("shop");
  } else if (ctx.shopId) {
    params.set("shop", ctx.shopId);
    params.delete("team");
    params.delete("place");
  }
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

export function withTeamQuery(path: string, teamId: string | null | undefined): string {
  return withWorkspaceQuery(path, { teamId });
}

export function withPlaceQuery(path: string, placeId: string | null | undefined): string {
  return withWorkspaceQuery(path, { placeId });
}

export function withShopQuery(path: string, shopId: string | null | undefined): string {
  return withWorkspaceQuery(path, { shopId });
}

export function isNavActive(path: string, currentPath: string, exact?: boolean): boolean {
  if (exact) return currentPath === path || currentPath.startsWith(`${path}?`);
  return currentPath === path || currentPath.startsWith(`${path}/`) || currentPath.startsWith(`${path}?`);
}

export function proTeamWorkspaceEntry(teamId: string, featureKey?: string): string {
  const params = new URLSearchParams({ team: teamId });
  if (featureKey) params.set("feature", featureKey);
  return `/pro?${params.toString()}`;
}

export function proPlaceWorkspaceEntry(placeId: string, featureKey?: string): string {
  const params = new URLSearchParams({ place: placeId });
  if (featureKey) params.set("feature", featureKey);
  return `/pro/place?${params.toString()}`;
}

export function proShopWorkspaceEntry(shopId: string, featureKey?: string): string {
  const params = new URLSearchParams({ shop: shopId });
  if (featureKey) params.set("feature", featureKey);
  return `/pro/shop?${params.toString()}`;
}

export function pageLabelForPath(path: string, sportMatchLabel = "Match Day", mode: ProWorkspaceMode = "team"): string {
  const base = path.split("?")[0];
  if (base === "/pro" || base === "/pro/place" || base === "/pro/shop") return "Home";
  if (base === "/seller/dashboard") return "Orders";
  if (base === "/analytics/marketplace") return "Analytics";
  const all =
    mode === "shop"
      ? [...SHOP_PRIMARY_NAV, ...SHOP_MORE_NAV]
      : mode === "place"
        ? [...PLACE_PRIMARY_NAV, ...PLACE_MORE_NAV]
        : [...PRO_PRIMARY_NAV, ...PRO_MORE_NAV];
  const hit = all.find((n) => isNavActive(n.path, base, n.exact));
  if (hit?.id === "match") return sportMatchLabel;
  return hit?.label ?? "Pro";
}
