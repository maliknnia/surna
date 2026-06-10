/** Rich coach showcase + flexible booking config (stored in coaches.profile_json). */

export type CoachPricingPeriod = "session" | "hour" | "month" | "package" | "contact";

export type CoachPricingPlan = {
  id: string;
  label: string;
  description?: string;
  priceEur?: number;
  period: CoachPricingPeriod;
  durationMinutes?: number;
  sessionsIncluded?: number;
  highlighted?: boolean;
};

export type CoachMediaItem = {
  id: string;
  type: "video" | "image";
  url: string;
  title?: string;
  thumbnailUrl?: string;
};

export type CoachAchievement = {
  id: string;
  title: string;
  year?: string;
  description?: string;
};

export type CoachSocialLink = {
  platform: string;
  url: string;
};

export type CoachBookingMode = "hourly_slots" | "plans_only" | "message_first";

export type CoachVerificationStatus = "none" | "pending" | "verified" | "rejected";

export type CoachVerification = {
  status: CoachVerificationStatus;
  submittedAt?: string;
  phone?: string;
  backgroundCheckConsent?: boolean;
  idDocumentProvided?: boolean;
  certificationDocsProvided?: boolean;
  skillLevelCoached?: string;
  paymentMethod?: string;
  notes?: string;
  reviewedAt?: string;
  rejectionReason?: string;
};

export type CoachProfileExtras = {
  tagline?: string;
  teachingPhilosophy?: string;
  achievements?: CoachAchievement[];
  sessionTypes?: string[];
  maxStudents?: number;
  socialLinks?: CoachSocialLink[];
  media?: CoachMediaItem[];
  pricingPlans?: CoachPricingPlan[];
  bookingMode?: CoachBookingMode;
  coverImageUrl?: string;
  rating?: number;
  reviewCount?: number;
  languages?: string[];
  sessionDurations?: number[];
  verification?: CoachVerification;
  contactPhone?: string;
  skillLevelCoached?: string;
  signupSpecializations?: string[];
  marketingConsent?: boolean;
};

export const DEFAULT_SESSION_DURATIONS = [60, 90, 120];

export const DEFAULT_COACH_PROFILE: CoachProfileExtras = {
  tagline: "",
  teachingPhilosophy: "",
  achievements: [],
  sessionTypes: [],
  socialLinks: [],
  media: [],
  pricingPlans: [],
  bookingMode: "message_first",
  languages: ["English"],
  sessionDurations: DEFAULT_SESSION_DURATIONS,
  reviewCount: 0,
};

function stableRating(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return Math.round((4.2 + (h % 8) * 0.1) * 10) / 10;
}

type CoachLike = {
  id: string;
  specialties?: string[] | null;
  experience?: string | null;
  certifications?: string[] | null;
  hourlyRate?: string | null;
  bio?: string | null;
  isVerified?: boolean | null;
};

type UserLike = {
  sport?: string | null;
  profileImageUrl?: string | null;
};

export function parseCoachProfile(raw: unknown, coach?: CoachLike, user?: UserLike): CoachProfileExtras {
  const base = { ...DEFAULT_COACH_PROFILE };
  let parsed: unknown = raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  if (parsed && typeof parsed === "object") {
    const o = parsed as Partial<CoachProfileExtras>;
    Object.assign(base, o);
    if (o.achievements) base.achievements = o.achievements;
    if (o.pricingPlans) base.pricingPlans = o.pricingPlans;
    if (o.media) base.media = o.media;
    if (o.sessionDurations?.length) base.sessionDurations = o.sessionDurations;
  }

  if (coach) {
    if (!base.tagline?.trim()) {
      const sport = coach.specialties?.[0] || user?.sport || "Performance";
      base.tagline = `${sport} coach · ${coach.experience || "—"} years experience`;
    }
    if (!base.teachingPhilosophy?.trim() && coach.bio) {
      base.teachingPhilosophy = coach.bio;
    }
    if (!base.sessionTypes?.length && coach.specialties?.length) {
      base.sessionTypes = coach.specialties;
    }
    if (!base.achievements?.length && coach.certifications?.length) {
      base.achievements = coach.certifications.map((c, i) => ({
        id: `cert-${i}`,
        title: c,
        description: "Certified qualification",
      }));
    }
    const hourly = coach.hourlyRate ? parseFloat(coach.hourlyRate) : 0;
    if (!base.pricingPlans?.length && hourly > 0) {
      base.pricingPlans = [
        {
          id: "hourly",
          label: "1-on-1 session",
          description: "Book a live coaching session at a time that works for you.",
          priceEur: hourly,
          period: "hour",
          durationMinutes: 60,
          highlighted: true,
        },
        {
          id: "monthly",
          label: "Monthly program",
          description: "4 sessions / month · progress tracking · message support",
          priceEur: Math.round(hourly * 3.5),
          period: "month",
          sessionsIncluded: 4,
        },
      ];
      base.bookingMode = base.bookingMode === "message_first" ? "hourly_slots" : base.bookingMode;
    }
    if (base.rating == null) base.rating = stableRating(coach.id);
    if (!base.coverImageUrl && user?.profileImageUrl) {
      base.coverImageUrl = user.profileImageUrl;
    }
    if (coach.isVerified) {
      base.verification = {
        ...(base.verification || { status: "verified" }),
        status: "verified",
      };
    } else if (!base.verification) {
      base.verification = { status: "none" };
    }
  }

  if (!base.sessionDurations?.length) base.sessionDurations = DEFAULT_SESSION_DURATIONS;
  return base;
}

export function formatPlanPrice(plan: CoachPricingPlan): string {
  if (plan.period === "contact" || plan.priceEur == null) return "Contact for price";
  const p = plan.priceEur;
  if (plan.period === "hour") return `€${p.toFixed(0)}/hr`;
  if (plan.period === "month") return `€${p.toFixed(0)}/mo`;
  if (plan.period === "session") return `€${p.toFixed(0)}/session`;
  if (plan.period === "package") return `€${p.toFixed(0)} package`;
  return `€${p.toFixed(0)}`;
}
