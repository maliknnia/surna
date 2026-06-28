/** Read ticket price in major currency units (e.g. euros) from API row shapes. */
export function getEventTicketPrice(ev: Record<string, unknown> | null | undefined): number | null {
  if (!ev) return null;
  const raw = ev.ticket_price ?? ev.ticketPrice ?? ev.price;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function formatEventTicketPrice(amount: number, currency = "EUR"): string {
  try {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `€${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
  }
}

export function eventTicketPriceLabel(ev: Record<string, unknown> | null | undefined): string | null {
  const price = getEventTicketPrice(ev);
  if (price == null) {
    const desc = String(ev?.description || "").toLowerCase();
    const priceMatch = desc.match(/€(\d+(?:\.\d+)?)/) || desc.match(/\$(\d+(?:\.\d+)?)/);
    if (priceMatch) return `€${priceMatch[1]}`;
    if (desc.includes("free entry") || desc.includes("free event") || desc.includes("no fee")) return "Free";
    return null;
  }
  return formatEventTicketPrice(price);
}

export function isPaidTicketEvent(ev: Record<string, unknown> | null | undefined): boolean {
  return getEventTicketPrice(ev) != null;
}
