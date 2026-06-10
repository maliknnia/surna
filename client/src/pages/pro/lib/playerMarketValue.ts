/** Client-side mirror of server market value formula (display only). */

export function formatMarketValue(eur: number): string {
  if (eur >= 1_000_000) return `€${(eur / 1_000_000).toFixed(1)}M`;
  if (eur >= 1_000) return `€${Math.round(eur / 1000)}k`;
  return `€${eur}`;
}
