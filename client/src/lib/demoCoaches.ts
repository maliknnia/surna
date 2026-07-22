import { parseCoachProfile } from "@shared/coachProfile";
import type { CoachWithProfile } from "@shared/schema";
import { SHOWCASE_ATHLETES } from "@/lib/demoShowcase";

const IMG = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=90`;

const aisha = SHOWCASE_ATHLETES[0];
const elena = SHOWCASE_ATHLETES[1];
const marcus = SHOWCASE_ATHLETES[2];
const jordan = SHOWCASE_ATHLETES[3];

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
      firstName: aisha.firstName,
      lastName: aisha.lastName,
      email: "aisha@surna.app",
      profileImageUrl: aisha.profileImageUrl,
      sport: aisha.sport,
      location: aisha.location,
    } as CoachWithProfile["user"],
    profileJson: {
      tagline: "Freestyle & IM technique · pool to podium",
      teachingPhilosophy: "Every stroke should feel effortless before it gets faster.",
      coverImageUrl: aisha.coverImageUrl,
      rating: 4.9,
      reviewCount: 47,
      achievements: [{ id: "1", title: "State Champion 100m Free", year: "2019" }],
      media: [{ id: "m1", type: "image", url: IMG("1571019614242-c5c5dee9f50b", 800, 500), title: "Pool technique" }],
      pricingPlans: [{ id: "hourly", label: "1-on-1 session", priceEur: 70, period: "hour", highlighted: true }],
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
      firstName: elena.firstName,
      lastName: elena.lastName,
      email: "elena@surna.app",
      profileImageUrl: elena.profileImageUrl,
      sport: elena.sport,
      location: elena.location,
    } as CoachWithProfile["user"],
    profileJson: {
      tagline: "High-performance juniors · USTA pathway",
      coverImageUrl: elena.coverImageUrl,
      rating: 5,
      reviewCount: 62,
      achievements: [{ id: "1", title: "12 juniors to D1 scholarships", year: "2022" }],
      media: [{ id: "m1", type: "image", url: IMG("1601422407692-ec4eeec1d9b3", 800, 500), title: "Court session" }],
      pricingPlans: [{ id: "hourly", label: "1-on-1 session", priceEur: 110, period: "hour", highlighted: true }],
    },
  },
  {
    id: "demo-coach-marcus",
    userId: "demo-user-marcus",
    specialties: ["Running", "Endurance"],
    experience: "9",
    certifications: ["Athletics Ireland L2", "RRCA Certified"],
    hourlyRate: "55.00",
    bio: "Trail & road coach · sub-3 marathon focus · Cork-based group and 1-on-1 sessions.",
    isVerified: true,
    isActive: true,
    weeklyAvailability: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: "demo-user-marcus",
      firstName: marcus.firstName,
      lastName: marcus.lastName,
      email: "marcus@surna.app",
      profileImageUrl: marcus.profileImageUrl,
      sport: marcus.sport,
      location: marcus.location,
    } as CoachWithProfile["user"],
    profileJson: {
      tagline: "Road & trail · build to race day",
      coverImageUrl: marcus.coverImageUrl,
      rating: 4.8,
      reviewCount: 39,
      achievements: [{ id: "1", title: "Sub-3 marathon", year: "2023" }],
      media: [{ id: "m1", type: "image", url: IMG("1476480862126-209bfaa8edc8", 800, 500), title: "Long run" }],
      pricingPlans: [{ id: "hourly", label: "1-on-1 session", priceEur: 55, period: "hour", highlighted: true }],
    },
  },
  {
    id: "demo-coach-jordan",
    userId: "demo-user-jordan",
    specialties: ["Running", "Speed"],
    experience: "6",
    certifications: ["Athletics Ireland L1"],
    hourlyRate: "45.00",
    bio: "Tempo & interval coach · 5K–half focus · Dublin group sessions.",
    isVerified: true,
    isActive: true,
    weeklyAvailability: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: "demo-user-jordan",
      firstName: jordan.firstName,
      lastName: jordan.lastName,
      email: "jordan@surna.app",
      profileImageUrl: jordan.profileImageUrl,
      sport: jordan.sport,
      location: jordan.location,
    } as CoachWithProfile["user"],
    profileJson: {
      tagline: "Speed work that sticks · race-day ready",
      coverImageUrl: jordan.coverImageUrl,
      rating: 4.7,
      reviewCount: 28,
      achievements: [{ id: "1", title: "Sub-17 5K", year: "2024" }],
      media: [{ id: "m1", type: "image", url: IMG("1552674605-db6ffd4facb5", 800, 500), title: "Tempo session" }],
      pricingPlans: [{ id: "hourly", label: "1-on-1 session", priceEur: 45, period: "hour", highlighted: true }],
    },
  },
].map((row) => {
  const profile = parseCoachProfile(row.profileJson, row, row.user);
  return { ...row, profile };
});
