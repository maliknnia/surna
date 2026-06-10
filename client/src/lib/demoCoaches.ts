import { parseCoachProfile } from "@shared/coachProfile";
import type { CoachWithProfile } from "@shared/schema";

const IMG = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=85`;

/** Offline fallback when /api/coaches is empty — keeps cards & profiles populated in demos. */
export const DEMO_COACH_PROFILES: CoachWithProfile[] = [
  {
    id: "demo-coach-aisha",
    userId: "demo-user-aisha",
    specialties: ["Swimming", "Technique"],
    experience: "11",
    certifications: ["USMS Level 2 Coach", "ASCA Level 3"],
    hourlyRate: "70.00",
    bio: "Former NCAA swimmer coaching pool technique and open-water prep in Atlanta.",
    isVerified: true,
    isActive: true,
    weeklyAvailability: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: "demo-user-aisha",
      firstName: "Aisha",
      lastName: "Okafor",
      email: "aisha@surna.app",
      profileImageUrl: IMG("1594381898411-8465977d70af", 400, 400),
      sport: "Swimming",
      location: "Atlanta, GA",
    } as CoachWithProfile["user"],
    profileJson: {
      tagline: "Freestyle & IM technique · pool to podium",
      teachingPhilosophy: "Every stroke should feel effortless before it gets faster.",
      coverImageUrl: IMG("1571905289734-cca53f78610c", 900, 600),
      rating: 4.9,
      reviewCount: 47,
      achievements: [{ id: "1", title: "State Champion 100m Free", year: "2019" }],
      media: [{ id: "m1", type: "image", url: IMG("1530549332234-77879e400468", 800, 500), title: "Pool technique" }],
      pricingPlans: [{ id: "hourly", label: "1-on-1 session", priceEur: 70, period: "hour", highlighted: true }],
      sessionTypes: ["Individual (1-on-1)", "Video analysis"],
    },
  },
  {
    id: "demo-coach-elena",
    userId: "demo-user-elena",
    specialties: ["Tennis", "College Prep"],
    experience: "16",
    certifications: ["PTR Professional", "USTA High Performance"],
    hourlyRate: "110.00",
    bio: "D1 background · juniors pathway · match-play focused sessions in NYC.",
    isVerified: true,
    isActive: true,
    weeklyAvailability: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: "demo-user-elena",
      firstName: "Elena",
      lastName: "Volkov",
      email: "elena@surna.app",
      profileImageUrl: IMG("1544005313-94ddf0286df2", 400, 400),
      sport: "Tennis",
      location: "New York, NY",
    } as CoachWithProfile["user"],
    profileJson: {
      tagline: "High-performance juniors · USTA pathway",
      coverImageUrl: IMG("1622163640459-1b9a4661f851", 900, 600),
      rating: 5,
      reviewCount: 62,
      achievements: [{ id: "1", title: "12 juniors to D1 scholarships", year: "2022" }],
      media: [{ id: "m1", type: "image", url: IMG("1554068545-4d6fbe637681", 800, 500), title: "Doubles positioning" }],
      pricingPlans: [{ id: "hourly", label: "1-on-1 session", priceEur: 110, period: "hour", highlighted: true }],
    },
  },
  {
    id: "demo-coach-james",
    userId: "demo-user-james",
    specialties: ["CrossFit", "Olympic Lifting"],
    experience: "9",
    certifications: ["CrossFit L2", "USAW Sports Performance"],
    hourlyRate: "68.00",
    bio: "Regional-level WOD & barbell coaching — safe PRs and structured cycles.",
    isVerified: true,
    isActive: true,
    weeklyAvailability: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: "demo-user-james",
      firstName: "James",
      lastName: "Mitchell",
      email: "jmitch@surna.app",
      profileImageUrl: IMG("1571019614242-c5c5dee9f50b", 400, 400),
      sport: "CrossFit",
      location: "Denver, CO",
    } as CoachWithProfile["user"],
    profileJson: {
      tagline: "Regional-level WOD & barbell coaching",
      coverImageUrl: IMG("1517836357463-aaac8aa94f98", 900, 600),
      rating: 4.9,
      reviewCount: 55,
      achievements: [{ id: "1", title: "Regional qualifier", year: "2021" }],
      pricingPlans: [{ id: "hourly", label: "1-on-1 session", priceEur: 68, period: "hour", highlighted: true }],
    },
  },
].map((row) => {
  const profile = parseCoachProfile(row.profileJson, row, row.user);
  return { ...row, profile };
});
