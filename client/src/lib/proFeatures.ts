/** Maps My Hub Pro feature keys to Pro app routes. */
const FEATURE_ROUTES: Record<string, string> = {
  "teams.roles": "/pro/roster",
  "teams.joinRules": "/pro/approvals",
  "teams.analytics": "/pro/stats",
  "teams.attendance": "/pro/training",
  "teams.recruitment": "/pro/recruitment",
  "teams.multiTeam": "/pro/club",
  "teams.memberFilters": "/pro/roster",

  "events.analytics": "/pro/stats",
  "events.recurring": "/pro/schedule",
  "events.reminders": "/pro/schedule",
  "events.bulkMessaging": "/pro/comms",
  "events.organizerRoles": "/pro/approvals",
  "events.promote": "/pro/tournament",

  "places.bookings": "/pro/schedule",
  "places.bookingCalendar": "/pro/schedule",
  "places.recurring": "/pro/schedule",
  "places.slots": "/pro/schedule",
  "places.pricing": "/pro/club",
  "places.analytics": "/pro/stats",
  "places.promotions": "/pro/comms",
  "places.priority": "/pro/club",
  "places.leads": "/pro/recruitment",
  "places.staff": "/pro/roster",

  "shop.inventory": "/pro/inventory",
  "shop.promotions": "/pro/comms",
  "shop.analytics": "/pro/stats",
  "shop.orders": "/seller/dashboard",
};

function withQuery(base: string, params: URLSearchParams): string {
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

function isPlaceFeature(featureKey?: string): boolean {
  return Boolean(featureKey?.startsWith("places."));
}

function isShopFeature(featureKey?: string): boolean {
  return Boolean(featureKey?.startsWith("shop."));
}

export function proRouteForFeature(featureKey?: string): string {
  if (!featureKey) return "/pro";
  return FEATURE_ROUTES[featureKey] ?? "/pro";
}

export function proDeepLink(
  featureKey?: string,
  fromSurface = "my-hub",
  ctx?: { teamId?: string; placeId?: string; shopId?: string },
): string {
  const route = proRouteForFeature(featureKey);
  const params = new URLSearchParams({ from: fromSurface });
  if (featureKey && route === "/pro") params.set("feature", featureKey);
  if (ctx?.shopId || isShopFeature(featureKey)) {
    if (ctx?.shopId) params.set("shop", ctx.shopId);
  } else if (ctx?.placeId || isPlaceFeature(featureKey)) {
    if (ctx?.placeId) params.set("place", ctx.placeId);
  } else if (ctx?.teamId) {
    params.set("team", ctx.teamId);
  }
  return withQuery(route, params);
}

export function proEntryHref(
  featureKey?: string,
  fromSurface = "my-hub",
  ctx?: { teamId?: string; placeId?: string; shopId?: string },
): string {
  const params = new URLSearchParams({ from: fromSurface });
  if (featureKey) params.set("feature", featureKey);
  if (ctx?.shopId || isShopFeature(featureKey)) {
    if (ctx?.shopId) params.set("shop", ctx.shopId);
    return withQuery("/pro/shop", params);
  }
  if (ctx?.placeId || isPlaceFeature(featureKey)) {
    if (ctx?.placeId) params.set("place", ctx.placeId);
    return withQuery("/pro/place", params);
  }
  if (ctx?.teamId) params.set("team", ctx.teamId);
  return withQuery("/pro", params);
}

/** Primary entry from My Hub — team workspace home. */
export function proTeamWorkspaceHref(teamId: string, featureKey?: string): string {
  return proEntryHref(featureKey, "my-hub", { teamId });
}

/** Primary entry from My Hub — place workspace home. */
export function proPlaceWorkspaceHref(placeId: string, featureKey?: string): string {
  return proEntryHref(featureKey, "my-hub", { placeId });
}

/** Primary entry from My Hub — shop workspace home. */
export function proShopWorkspaceHref(shopId: string, featureKey?: string): string {
  return proEntryHref(featureKey, "my-hub", { shopId });
}

export const PRO_FEATURE_ROUTE_MAP = FEATURE_ROUTES;
