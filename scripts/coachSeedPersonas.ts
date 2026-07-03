/** Rich demo coach personas — full profiles for cards + coach detail pages */

import type { CoachAchievement, CoachMediaItem, CoachPricingPlan, CoachSocialLink } from "../shared/coachProfile";
import { actionPhotoUrl } from "./seedImages";

function IMG(id: string, w: number, h: number): string {
  return actionPhotoUrl(`coach-${id}`, w, h);
}

export type FakeCoachPersona = {
  userIndex: number;
  username: string;
  displayName: string;
  bio: string;
  location: string;
  sport: string;
  specialties: string[];
  experience: string;
  rate: number;
  verified: boolean;
  tagline: string;
  sessionTypes: string[];
  philosophy: string;
  longBio: string;
  certifications: string[];
  achievements: CoachAchievement[];
  media: CoachMediaItem[];
  socialLinks: CoachSocialLink[];
  pricingPlans: CoachPricingPlan[];
  coverImageUrl: string;
  avatarUrl: string;
  rating: number;
  reviewCount: number;
  maxStudents: number;
};

export const FAKE_COACH_PERSONAS: FakeCoachPersona[] = [
  {
    userIndex: 0,
    username: "aisha_swim",
    displayName: "Aisha Okafor",
    sport: "Swimming",
    location: "Atlanta, GA",
    bio: "Competitive swimmer | Freestyle specialist | Pool is life",
    specialties: ["Swimming", "Technique", "Open Water"],
    experience: "11",
    rate: 70,
    verified: true,
    tagline: "Freestyle & IM technique · pool to podium",
    sessionTypes: ["Individual (1-on-1)", "Video analysis", "Small Group (2-5)"],
    philosophy:
      "I believe every stroke should feel effortless before it gets faster. We break down your catch, rotation, and breathing until the water works with you — not against you.",
    longBio:
      "Former NCAA Division I swimmer and US Masters coach. I've helped 120+ athletes fix shoulder strain, drop split times, and build confidence for open-water events. Sessions blend pool drills, dry-land mobility, and race-week planning.",
    certifications: ["USMS Level 2 Coach", "ASCA Level 3", "CPR/AED Instructor"],
    achievements: [
      { id: "a1", title: "State Champion 100m Free", year: "2019", description: "Georgia Masters Championships" },
      { id: "a2", title: "50 athletes to Nationals", year: "2023", description: "Coached qualifiers across 4 age groups" },
      { id: "a3", title: "Technique clinic host", year: "2024", description: "Monthly freestyle workshops in Atlanta" },
    ],
    media: [
      { id: "m1", type: "image", url: IMG("1530549332234-77879e400468", 800, 500), title: "Pool technique day" },
      { id: "m2", type: "image", url: IMG("1571905289734-cca53f78610c", 800, 500), title: "Open water prep" },
      { id: "m3", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Intro: how I coach freestyle" },
    ],
    socialLinks: [
      { platform: "Instagram", url: "https://instagram.com/" },
      { platform: "YouTube", url: "https://youtube.com/" },
    ],
    pricingPlans: [],
    coverImageUrl: IMG("1571905289734-cca53f78610c", 900, 600),
    avatarUrl: IMG("1594381898411-8465977d70af", 400, 400),
    rating: 4.9,
    reviewCount: 47,
    maxStudents: 8,
  },
  {
    userIndex: 1,
    username: "elena_tennis",
    displayName: "Elena Volkov",
    sport: "Tennis",
    location: "New York, NY",
    bio: "Former college tennis | Coaching + competing",
    specialties: ["Tennis", "College Prep", "Doubles"],
    experience: "16",
    rate: 110,
    verified: true,
    tagline: "High-performance juniors · USTA pathway",
    sessionTypes: ["Individual (1-on-1)", "Online Sessions", "Match play"],
    philosophy:
      "Tennis is decisions at speed. I train patterns — when to attack, when to reset — so you stop panicking in long rallies and start owning key points.",
    longBio:
      "Played D1 at Columbia, then 6 years on the USTA pro circuit. Now I develop juniors targeting scholarships and adults chasing 4.5+ ratings. Video review and match-play sessions are my signature.",
    certifications: ["PTR Professional", "USTA High Performance", "Sports Psychology (Cert.)"],
    achievements: [
      { id: "e1", title: "ITF Futures quarterfinalist", year: "2014", description: "Singles · hard court" },
      { id: "e2", title: "12 juniors to D1 scholarships", year: "2022", description: "Combined athletic + academic placement" },
      { id: "e3", title: "Club coach of the year", year: "2024", description: "NYC Metro Tennis Association" },
    ],
    media: [
      { id: "m1", type: "image", url: IMG("1622163640459-1b9a4661f851", 800, 500), title: "Forehand progression" },
      { id: "m2", type: "image", url: IMG("1554068545-4d6fbe637681", 800, 500), title: "Doubles positioning" },
      { id: "m3", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Serve rhythm breakdown" },
    ],
    socialLinks: [{ platform: "Instagram", url: "https://instagram.com/" }],
    pricingPlans: [],
    coverImageUrl: IMG("1622163640459-1b9a4661f851", 900, 600),
    avatarUrl: IMG("1544005313-94ddf0286df2", 400, 400),
    rating: 5.0,
    reviewCount: 62,
    maxStudents: 6,
  },
];

function defaultPricingPlans(rate: number): CoachPricingPlan[] {
  return [
    {
      id: "hourly",
      label: "1-on-1 session",
      description: "Live coaching tailored to your goals. Video recap optional.",
      priceEur: rate,
      period: "hour",
      durationMinutes: 60,
      highlighted: true,
    },
    {
      id: "pack5",
      label: "5-session pack",
      description: "Save 10% · use within 8 weeks.",
      priceEur: Math.round(rate * 5 * 0.9),
      period: "package",
      sessionsIncluded: 5,
    },
    {
      id: "monthly",
      label: "Monthly program",
      description: "4 sessions + messaging support between visits.",
      priceEur: Math.round(rate * 3.5),
      period: "month",
      sessionsIncluded: 4,
    },
    {
      id: "intro",
      label: "Intro assessment",
      description: "60 min skill screen + written plan.",
      priceEur: Math.round(rate * 0.75),
      period: "session",
      durationMinutes: 60,
    },
  ];
}

export function buildCoachSeedRow(persona: FakeCoachPersona, _userId: string, imageIndex: number) {
  const plans = persona.pricingPlans.length ? persona.pricingPlans : defaultPricingPlans(persona.rate);
  const specsArr = `{${persona.specialties.join(",")}}`;
  const certsStr = `{${persona.certifications.join(",")}}`;
  const rate = persona.rate.toFixed(2);
  const coachBio = persona.longBio;

  const weeklyAvail = JSON.stringify({
    mon: { enabled: true, ranges: [{ start: "07:00", end: "12:00" }, { start: "16:00", end: "20:00" }] },
    tue: { enabled: true, ranges: [{ start: "09:00", end: "17:00" }] },
    wed: { enabled: true, ranges: [{ start: "09:00", end: "17:00" }] },
    thu: { enabled: true, ranges: [{ start: "09:00", end: "17:00" }] },
    fri: { enabled: true, ranges: [{ start: "08:00", end: "14:00" }] },
    sat: { enabled: imageIndex % 2 === 0, ranges: imageIndex % 2 === 0 ? [{ start: "09:00", end: "13:00" }] : [] },
    sun: { enabled: false, ranges: [] },
  });

  const profileJson = JSON.stringify({
    tagline: persona.tagline,
    teachingPhilosophy: persona.philosophy,
    achievements: persona.achievements,
    sessionTypes: persona.sessionTypes,
    sessionDurations: [45, 60, 90],
    languages: ["English", imageIndex % 3 === 0 ? "Spanish" : "English"].filter((v, i, a) => a.indexOf(v) === i),
    pricingPlans: plans,
    media: persona.media,
    socialLinks: persona.socialLinks,
    bookingMode: "hourly_slots",
    coverImageUrl: actionPhotoUrl(`coach-cover-${persona.username}`, 900, 600),
    rating: persona.rating,
    reviewCount: persona.reviewCount,
    maxStudents: persona.maxStudents,
    verification: {
      status: persona.verified ? "verified" : "pending",
      submittedAt: new Date().toISOString(),
      backgroundCheckConsent: true,
      idDocumentProvided: persona.verified,
      certificationDocsProvided: true,
      skillLevelCoached: "advanced",
      paymentMethod: "stripe",
    },
  });

  return { specsArr, exp: persona.experience, certsStr, rate, weeklyAvail, profileJson, coachBio };
}
