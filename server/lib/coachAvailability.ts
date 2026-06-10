export type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export type WeeklyAvailability = Partial<
  Record<DayKey, { enabled: boolean; ranges: { start: string; end: string }[] }>
>;

const DAY_ORDER: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function defaultWeeklyAvailability(): WeeklyAvailability {
  const ranges = [{ start: "09:00", end: "17:00" }];
  return {
    mon: { enabled: true, ranges },
    tue: { enabled: true, ranges },
    wed: { enabled: true, ranges },
    thu: { enabled: true, ranges },
    fri: { enabled: true, ranges },
    sat: { enabled: false, ranges: [] },
    sun: { enabled: false, ranges: [] },
  };
}

function dayKeyFromDate(d: Date): DayKey {
  return DAY_ORDER[d.getDay()];
}

export function mergeAvailability(raw: unknown): WeeklyAvailability {
  if (!raw || typeof raw !== "object") return defaultWeeklyAvailability();
  const def = defaultWeeklyAvailability();
  const o = raw as Record<string, unknown>;
  for (const k of DAY_ORDER) {
    const day = o[k];
    if (day && typeof day === "object" && "enabled" in day) {
      const e = day as { enabled?: boolean; ranges?: unknown };
      def[k] = {
        enabled: !!e.enabled,
        ranges: Array.isArray(e.ranges) ? (e.ranges as { start: string; end: string }[]) : [],
      };
    }
  }
  return def;
}

function parseHM(s: string): { h: number; m: number } {
  const [h, m] = s.split(":").map((x) => Number(x));
  return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 };
}

/** Bookable slot start times (ISO) for the next `numDays` days. */
export function generateBookableSlots(
  weekly: WeeklyAvailability,
  numDays = 14,
  slotMinutes = 60
): string[] {
  const starts: string[] = [];
  const now = new Date();
  const startDay = new Date(now);
  startDay.setHours(0, 0, 0, 0);
  for (let i = 0; i < numDays; i++) {
    const d = new Date(startDay);
    d.setDate(startDay.getDate() + i);
    const key = dayKeyFromDate(d);
    const cfg = weekly[key];
    if (!cfg?.enabled || !cfg.ranges?.length) continue;
    for (const r of cfg.ranges) {
      const { h: sh, m: sm } = parseHM(r.start);
      const { h: eh, m: em } = parseHM(r.end);
      let cursor = new Date(d);
      cursor.setHours(sh, sm, 0, 0);
      const end = new Date(d);
      end.setHours(eh, em, 0, 0);
      while (cursor.getTime() + slotMinutes * 60 * 1000 <= end.getTime()) {
        if (cursor.getTime() > now.getTime() - 60 * 1000) {
          starts.push(cursor.toISOString());
        }
        cursor = new Date(cursor.getTime() + slotMinutes * 60 * 1000);
      }
    }
  }
  return starts.sort();
}

export function slotIsValid(
  slotIso: string,
  durationMinutes: number,
  weekly: WeeklyAvailability
): boolean {
  const slotStart = new Date(slotIso);
  if (Number.isNaN(slotStart.getTime())) return false;
  const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
  const key = dayKeyFromDate(slotStart);
  const cfg = weekly[key];
  if (!cfg?.enabled || !cfg.ranges?.length) return false;
  for (const r of cfg.ranges) {
    const day = new Date(slotStart);
    day.setHours(0, 0, 0, 0);
    const { h: sh, m: sm } = parseHM(r.start);
    const { h: eh, m: em } = parseHM(r.end);
    const rangeStart = new Date(day);
    rangeStart.setHours(sh, sm, 0, 0);
    const rangeEnd = new Date(day);
    rangeEnd.setHours(eh, em, 0, 0);
    if (slotStart >= rangeStart && slotEnd <= rangeEnd) {
      return true;
    }
  }
  return false;
}
