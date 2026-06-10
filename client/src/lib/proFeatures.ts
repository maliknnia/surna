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
};

export function proRouteForFeature(featureKey?: string): string {
  if (!featureKey) return "/pro";
  return FEATURE_ROUTES[featureKey] ?? "/pro";
}

export function proDeepLink(featureKey?: string, fromSurface = "my-hub"): string {
  const route = proRouteForFeature(featureKey);
  const params = new URLSearchParams({ from: fromSurface });
  if (featureKey) params.set("feature", featureKey);
  return `${route}?${params.toString()}`;
}

export function proEntryHref(featureKey?: string, fromSurface = "my-hub"): string {
  const params = new URLSearchParams({ from: fromSurface });
  if (featureKey) params.set("feature", featureKey);
  return `/pro?${params.toString()}`;
}

export const PRO_FEATURE_ROUTE_MAP = FEATURE_ROUTES;
