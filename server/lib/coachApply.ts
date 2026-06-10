import type { WeeklyAvailability, DayKey } from "./coachAvailability";
import { defaultWeeklyAvailability } from "./coachAvailability";
import type { CoachProfileExtras, CoachAchievement } from "@shared/coachProfile";
import { DEFAULT_SESSION_DURATIONS } from "@shared/coachProfile";

const DAY_MAP: Record<string, DayKey> = {
  Monday: "mon",
  Tuesday: "tue",
  Wednesday: "wed",
  Thursday: "thu",
  Friday: "fri",
  Saturday: "sat",
  Sunday: "sun",
};

const PERIOD_RANGES: Record<string, { start: string; end: string }> = {
  Morning: { start: "06:00", end: "12:00" },
  Afternoon: { start: "12:00", end: "17:00" },
  Evening: { start: "17:00", end: "21:00" },
};

/** Convert signup availability labels ("Monday Morning") to weekly JSON. */
export function availabilityLabelsToWeekly(labels: string[]): WeeklyAvailability {
  const weekly = defaultWeeklyAvailability();
  const dayRanges = new Map<DayKey, { start: string; end: string }[]>();

  for (const label of labels) {
    const parts = label.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const dayKey = DAY_MAP[parts[0]];
    const period = parts.slice(1).join(" ");
    const range = PERIOD_RANGES[period];
    if (!dayKey || !range) continue;
    const list = dayRanges.get(dayKey) || [];
    list.push(range);
    dayRanges.set(dayKey, list);
  }

  for (const key of Object.keys(weekly) as DayKey[]) {
    const ranges = dayRanges.get(key);
    if (ranges?.length) {
      weekly[key] = { enabled: true, ranges };
    }
  }
  return weekly;
}

export function parseCertifications(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function parseAchievementsText(text: string): CoachAchievement[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 15)
    .map((line, i) => {
      const yearMatch = line.match(/\b(19|20)\d{2}\b/);
      return {
        id: `ach-${i}`,
        title: line.replace(/\b(19|20)\d{2}\b/, "").trim() || line,
        year: yearMatch?.[0],
        description: "",
      };
    });
}

export function parseSocialLinks(raw: string): { platform: string; url: string }[] {
  if (!raw.trim()) return [];
  return raw
    .split(/[,|\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((entry) => {
      if (entry.startsWith("http")) {
        let platform = "Link";
        if (entry.includes("instagram")) platform = "Instagram";
        else if (entry.includes("youtube")) platform = "YouTube";
        else if (entry.includes("twitter") || entry.includes("x.com")) platform = "X";
        else if (entry.includes("tiktok")) platform = "TikTok";
        return { platform, url: entry };
      }
      return { platform: entry.split(":")[0]?.trim() || "Social", url: entry };
    })
    .filter((l) => l.url.startsWith("http"));
}

export type CoachApplyInput = {
  phone: string;
  experience: string;
  certifications: string;
  primarySports: string[];
  specializations: string[];
  skillLevel: string;
  hourlyRate: number;
  availability: string[];
  sessionTypes: string[];
  maxStudents?: number;
  bio: string;
  achievements: string;
  teachingPhilosophy: string;
  socialMedia: string;
  backgroundCheckConsent: boolean;
  marketingConsent?: boolean;
  paymentMethod: string;
  verificationNotes?: string;
  idDocumentProvided?: boolean;
  certificationDocsProvided?: boolean;
  demoVideoUrl?: string;
};

export function buildProfileFromApplication(input: CoachApplyInput, coachId: string): CoachProfileExtras {
  const hourly = input.hourlyRate;
  const achievements = parseAchievementsText(input.achievements);
  const media = input.demoVideoUrl?.trim()
    ? [{ id: "intro-video", type: "video" as const, url: input.demoVideoUrl.trim(), title: "Introduction" }]
    : [];

  const verificationStatus = input.backgroundCheckConsent ? "pending" : "none";

  return {
    tagline: `${input.primarySports[0] || "Sports"} coach · ${input.experience} years`,
    teachingPhilosophy: input.teachingPhilosophy,
    achievements,
    sessionTypes: [...input.sessionTypes, ...input.specializations].slice(0, 12),
    maxStudents: input.maxStudents,
    socialLinks: parseSocialLinks(input.socialMedia),
    media,
    bookingMode: hourly > 0 ? "hourly_slots" : "message_first",
    sessionDurations: DEFAULT_SESSION_DURATIONS,
    languages: ["English"],
    pricingPlans:
      hourly > 0
        ? [
            {
              id: "hourly",
              label: "1-on-1 session",
              description: "Live coaching session",
              priceEur: hourly,
              period: "hour",
              durationMinutes: 60,
              highlighted: true,
            },
          ]
        : [],
    verification: {
      status: verificationStatus,
      submittedAt: verificationStatus === "pending" ? new Date().toISOString() : undefined,
      phone: input.phone,
      backgroundCheckConsent: input.backgroundCheckConsent,
      idDocumentProvided: !!input.idDocumentProvided,
      certificationDocsProvided: !!input.certificationDocsProvided,
      skillLevelCoached: input.skillLevel,
      paymentMethod: input.paymentMethod,
      notes: input.verificationNotes,
    },
    contactPhone: input.phone,
    skillLevelCoached: input.skillLevel,
    signupSpecializations: input.specializations,
    marketingConsent: input.marketingConsent,
  };
}

/** Dev/demo: auto-approve when env set. Production stays pending until manual review. */
export function shouldAutoVerifyCoach(): boolean {
  return process.env.COACH_AUTO_VERIFY === "1" || process.env.COACH_AUTO_VERIFY === "true";
}

export function syncVerifiedFlags(profile: CoachProfileExtras, isVerified: boolean): CoachProfileExtras {
  if (!profile.verification) return profile;
  return {
    ...profile,
    verification: {
      ...profile.verification,
      status: isVerified ? "verified" : profile.verification.status,
    },
  };
}
