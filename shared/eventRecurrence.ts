import { z } from "zod";

export const EVENT_RECURRENCE_FREQUENCIES = ["once", "daily", "weekly"] as const;
export type EventRecurrenceFrequency = (typeof EVENT_RECURRENCE_FREQUENCIES)[number];

export const EventRecurrenceRuleSchema = z.object({
  frequency: z.enum(EVENT_RECURRENCE_FREQUENCIES).default("once"),
  /** Total occurrences in the series (including the first). */
  occurrenceCount: z.number().int().min(1).max(52).default(1),
});

export type EventRecurrenceRule = z.infer<typeof EventRecurrenceRuleSchema>;

export function normalizeRecurrenceRule(
  input?: Partial<EventRecurrenceRule> | null,
): EventRecurrenceRule {
  const parsed = EventRecurrenceRuleSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { frequency: "once", occurrenceCount: 1 };
  }
  const rule = parsed.data;
  if (rule.frequency === "once") {
    return { frequency: "once", occurrenceCount: 1 };
  }
  return {
    frequency: rule.frequency,
    occurrenceCount: Math.max(2, Math.min(52, rule.occurrenceCount)),
  };
}

export function buildOccurrenceTimes(
  startsAt: Date,
  endsAt: Date,
  rule: EventRecurrenceRule,
): { startsAt: Date; endsAt: Date }[] {
  const normalized = normalizeRecurrenceRule(rule);
  const durationMs = endsAt.getTime() - startsAt.getTime();
  if (durationMs <= 0) return [{ startsAt, endsAt }];

  if (normalized.frequency === "once" || normalized.occurrenceCount <= 1) {
    return [{ startsAt, endsAt }];
  }

  const out: { startsAt: Date; endsAt: Date }[] = [{ startsAt, endsAt }];
  let curStart = new Date(startsAt);

  for (let i = 1; i < normalized.occurrenceCount; i++) {
    curStart = new Date(curStart);
    if (normalized.frequency === "daily") {
      curStart.setDate(curStart.getDate() + 1);
    } else {
      curStart.setDate(curStart.getDate() + 7);
    }
    out.push({
      startsAt: new Date(curStart),
      endsAt: new Date(curStart.getTime() + durationMs),
    });
  }

  return out;
}

export function recurrenceSummary(rule: EventRecurrenceRule): string {
  const normalized = normalizeRecurrenceRule(rule);
  if (normalized.frequency === "once") return "One-time event";
  const n = normalized.occurrenceCount;
  if (normalized.frequency === "daily") {
    return `${n} daily sessions`;
  }
  return `${n} weekly sessions`;
}
