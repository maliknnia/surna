export const toISO = (d: Date) => d.toISOString();

export const startOfTodayISO = () => {
  const d = new Date(); 
  d.setHours(0, 0, 0, 0); 
  return d.toISOString();
};

export const endOfWeekISO = () => {
  const d = new Date(); 
  d.setDate(d.getDate() + (7 - d.getDay())); 
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

export const fmtRange = (a?: string, b?: string) => {
  if (!a) return "";
  const s = new Date(a).toLocaleString();
  const e = b ? new Date(b).toLocaleString() : "";
  return e ? `${s} — ${e}` : s;
};

export function safeFormatDate(
  dateStr: string | null | undefined,
  opts?: Intl.DateTimeFormatOptions
): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric" });
}

export function safeFormatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const day = d.toLocaleDateString("en-US", { weekday: "short" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${day} ${time}`;
}

export function safeFormatRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
