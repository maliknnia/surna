/** Billing cadence for venue membership plans. */
export type PlaceMembershipBillingInterval = "monthly" | "annual" | "once";

export const PLACE_MEMBERSHIP_BILLING_INTERVALS: {
  value: PlaceMembershipBillingInterval;
  label: string;
}[] = [
  { value: "monthly", label: "Per month" },
  { value: "annual", label: "Per year" },
  { value: "once", label: "One-time" },
];

export function formatMembershipPrice(
  price: string | number,
  interval: PlaceMembershipBillingInterval | string,
): string {
  const amount = typeof price === "number" ? price : parseFloat(String(price));
  const formatted = Number.isFinite(amount) ? `€${amount % 1 === 0 ? amount : amount.toFixed(2)}` : String(price);
  if (interval === "monthly") return `${formatted}/mo`;
  if (interval === "annual") return `${formatted}/yr`;
  return formatted;
}
