import { z } from "zod";

export const EVENT_FORMATS = ["open", "versus", "route", "lineup"] as const;
export type EventFormat = (typeof EVENT_FORMATS)[number];

export type EventLineupSide = {
  label: string;
  meta?: { weightClass?: string; subtitle?: string };
};

export type EventLineupAct = { name: string };

export type EventLineup = {
  sides?: EventLineupSide[];
  headliner?: string;
  acts?: EventLineupAct[];
  route?: { distanceKm?: number };
};

export const EVENT_FORMAT_META: Record<
  EventFormat,
  { label: string; shortLabel: string; description: string }
> = {
  open: {
    label: "Open session",
    shortLabel: "Open",
    description: "Pick-up games, training, meetups — no fixed matchup.",
  },
  versus: {
    label: "Versus",
    shortLabel: "Versus",
    description: "Two sides — fights, derbies, finals, head-to-head.",
  },
  route: {
    label: "Route",
    shortLabel: "Route",
    description: "Runs, rides, hikes — distance and GPS track.",
  },
  lineup: {
    label: "Lineup",
    shortLabel: "Lineup",
    description: "Fight cards, gigs, festivals — headliner and support.",
  },
};

export const EVENT_SPORT_OPTIONS = [
  "Basketball",
  "Soccer",
  "Football",
  "Tennis",
  "Volleyball",
  "Boxing",
  "MMA",
  "Cycling",
  "Running",
  "CrossFit",
  "Yoga",
  "Swimming",
  "Golf",
  "Hockey",
  "Padel",
  "Entertainment",
  "Music",
] as const;

export const EventLineupSideSchema = z.object({
  label: z.string().min(1).max(120),
  meta: z
    .object({
      weightClass: z.string().max(80).optional(),
      subtitle: z.string().max(120).optional(),
    })
    .optional(),
});

export const EventLineupSchema = z.object({
  sides: z.array(EventLineupSideSchema).max(2).optional(),
  headliner: z.string().max(140).optional(),
  acts: z.array(z.object({ name: z.string().min(1).max(120) })).max(12).optional(),
  route: z.object({ distanceKm: z.number().positive().max(9999).optional() }).optional(),
});

export function normalizeEventFormat(value: unknown): EventFormat {
  const raw = String(value ?? "open").toLowerCase();
  return EVENT_FORMATS.includes(raw as EventFormat) ? (raw as EventFormat) : "open";
}

export function parseEventLineup(raw: unknown): EventLineup | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return parseEventLineup(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  if (typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const parsed = EventLineupSchema.safeParse(o);
  return parsed.success ? parsed.data : null;
}

export function resolveEventFormatFromRow(row: Record<string, unknown>): EventFormat {
  return normalizeEventFormat(row.event_format ?? row.eventFormat);
}

export function resolveEventLineupFromRow(row: Record<string, unknown>): EventLineup | null {
  return parseEventLineup(row.event_lineup ?? row.eventLineup);
}

export function validateEventFormatPayload(
  eventFormat: EventFormat,
  eventLineup: EventLineup | undefined,
  title: string,
): string | null {
  if (eventFormat === "versus") {
    const sides = eventLineup?.sides ?? [];
    if (sides.length < 2 || !sides[0]?.label?.trim() || !sides[1]?.label?.trim()) {
      return "Versus events need two side names.";
    }
  }
  if (eventFormat === "lineup") {
    const head = eventLineup?.headliner?.trim() || title.trim();
    if (!head) return "Lineup events need a headliner or title.";
  }
  return null;
}
