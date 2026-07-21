/** Env-driven demo/showcase toggles — off in production builds by default. */

function parseEnvBool(value: string | undefined): boolean | undefined {
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return undefined;
}

function devUnlessExplicit(explicit: boolean | undefined): boolean {
  if (explicit !== undefined) return explicit;
  return import.meta.env.DEV;
}

/** Supplement empty map viewports with showcase pins (Aisha/Elena events & places). */
export function isMapDemoPinsEnabled(): boolean {
  return devUnlessExplicit(parseEnvBool(import.meta.env.VITE_MAP_DEMO_PINS));
}

/** Sample messenger threads when the inbox is empty. */
export function isMessengerDemosEnabled(realConversationCount: number): boolean {
  const explicit = parseEnvBool(import.meta.env.VITE_MESSENGER_DEMOS);
  if (explicit !== undefined) return explicit;
  return import.meta.env.DEV && realConversationCount === 0;
}

/** Hardcoded demo rows when public APIs return empty (e.g. coaches discover). */
export function isDemoContentFallbackEnabled(): boolean {
  return devUnlessExplicit(parseEnvBool(import.meta.env.VITE_DEMO_FALLBACK));
}
