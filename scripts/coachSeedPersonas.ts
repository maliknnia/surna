/** Rich demo coach personas — full profiles for cards + coach detail pages */

import type { CoachAchievement, CoachMediaItem, CoachPricingPlan, CoachSocialLink } from "../shared/coachProfile";

const IMG = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=85`;

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
    userIndex: 5,
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
    userIndex: 15,
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
  {
    userIndex: 28,
    username: "kira_mma",
    displayName: "Kira Foster",
    sport: "MMA",
    location: "Phoenix, AZ",
    bio: "Strawweight fighter | Wrestler turned striker",
    specialties: ["MMA", "Striking", "Fight camp"],
    experience: "8",
    rate: 80,
    verified: true,
    tagline: "Striking & fight camp · amateur to pro",
    sessionTypes: ["Individual (1-on-1)", "Team Training", "Pad work"],
    philosophy:
      "You earn confidence through reps under pressure. We build your stance, entries, and cardio in layers so fight night feels familiar — not chaotic.",
    longBio:
      "Pro-am MMA record 9-2. Wrestling base from high school, Muay Thai in Thailand for 2 years. I corner regional amateurs and coach hobbyists who want real skill, not just a sweat session.",
    certifications: ["Muay Thai Kru", "USA Wrestling Level 1", "First Aid Certified"],
    achievements: [
      { id: "k1", title: "Regional strawweight title", year: "2023", description: "Submission win R2" },
      { id: "k2", title: "Fight camp lead", year: "2024", description: "6-athlete amateur card · 5 wins" },
    ],
    media: [
      { id: "m1", type: "image", url: IMG("1549719386-74da2f064f29", 800, 500), title: "Pad work fundamentals" },
      { id: "m2", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Stance & entry drills" },
    ],
    socialLinks: [{ platform: "Instagram", url: "https://instagram.com/" }],
    pricingPlans: [],
    coverImageUrl: IMG("1549719386-74da2f064f29", 900, 600),
    avatarUrl: IMG("1507003211169-0a1dd7228f2d", 400, 400),
    rating: 4.8,
    reviewCount: 31,
    maxStudents: 10,
  },
  {
    userIndex: 37,
    username: "nscott_hoops",
    displayName: "Nathan Scott",
    sport: "Basketball",
    location: "Miami, FL",
    bio: "Small forward | Triple-double machine | Versatile",
    specialties: ["Basketball", "Skills Training", "Youth Development"],
    experience: "9",
    rate: 75,
    verified: false,
    tagline: "Skills · footwork · game IQ for guards & wings",
    sessionTypes: ["Individual (1-on-1)", "Small Group (2-5)"],
    philosophy:
      "Great players read the floor two passes ahead. I teach footwork, shot mechanics, and decision-making through game-like reps — not isolated circus drills.",
    longBio:
      "Played overseas in Spain and Belgium. Now based in Miami training middle-school through adult rec leagues. Strong focus on ball-handling chains and finishing through contact.",
    certifications: ["USA Basketball Licensed", "NASM CPT"],
    achievements: [
      { id: "n1", title: "AAU regional champion coach", year: "2022", description: "U15 boys" },
      { id: "n2", title: "100+ clients skill rating up", year: "2024", description: "Avg. +1.2 player grade self-report" },
    ],
    media: [
      { id: "m1", type: "image", url: IMG("1546519638-68d0994c5a0a", 800, 500), title: "Ball handling lab" },
      { id: "m2", type: "image", url: IMG("1519861535567-7471fffa08af", 800, 500), title: "Finishing at the rim" },
    ],
    socialLinks: [],
    pricingPlans: [],
    coverImageUrl: IMG("1546519638-68d0994c5a0a", 900, 600),
    avatarUrl: IMG("1438761681033-6461ffad8d80", 400, 400),
    rating: 4.6,
    reviewCount: 18,
    maxStudents: 12,
  },
  {
    userIndex: 4,
    username: "jmitch_crossfit",
    displayName: "James Mitchell",
    sport: "CrossFit",
    location: "Denver, CO",
    bio: "CrossFit competitor | Regional qualifier | WOD warrior",
    specialties: ["CrossFit", "Olympic Lifting", "Competition Prep"],
    experience: "9",
    rate: 68,
    verified: true,
    tagline: "Regional-level WOD & barbell coaching",
    sessionTypes: ["Individual (1-on-1)", "Small Group (2-5)", "Programming"],
    philosophy:
      "Intensity without injury is the game. We master positions first, then add load and speed — so you PR safely and still walk upstairs the next day.",
    longBio:
      "CrossFit Games regional athlete 2019–2021. I program 12-week cycles for competitors and busy professionals who want structured progress without burning out.",
    certifications: ["CrossFit L2", "USAW Sports Performance", "NASM CPT"],
    achievements: [
      { id: "j1", title: "Regional qualifier", year: "2021", description: "Team division" },
      { id: "j2", title: "Snatch PR clinic series", year: "2023", description: "Sold-out 8-week cohort" },
    ],
    media: [
      { id: "m1", type: "image", url: IMG("1517836357463-aaac8aa94f98", 800, 500), title: "Olympic lifting blocks" },
      { id: "m2", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Snatch footwork primer" },
    ],
    socialLinks: [{ platform: "YouTube", url: "https://youtube.com/" }],
    pricingPlans: [],
    coverImageUrl: IMG("1517836357463-aaac8aa94f98", 900, 600),
    avatarUrl: IMG("1571019614242-c5c5dee9f50b", 400, 400),
    rating: 4.9,
    reviewCount: 55,
    maxStudents: 15,
  },
  {
    userIndex: 7,
    username: "maya_yoga_fit",
    displayName: "Maya Patel",
    sport: "CrossFit",
    location: "Portland, OR",
    bio: "Yoga + CrossFit hybrid athlete | Mind body connection",
    specialties: ["CrossFit", "Mobility", "Recovery"],
    experience: "8",
    rate: 58,
    verified: true,
    tagline: "Mobility · strength · sustainable training",
    sessionTypes: ["Individual (1-on-1)", "Online Sessions"],
    philosophy:
      "You can't out-train poor movement. I blend mobility flows with strength progressions so you lift heavier and feel looser — not tighter.",
    longBio:
      "RYT-200 yoga teacher and CrossFit coach. Ideal for desk athletes, post-injury return, and masters athletes who need smart recovery between hard sessions.",
    certifications: ["CrossFit L1", "RYT-200 Yoga", "FMS Level 1"],
    achievements: [
      { id: "y1", title: "Mobility workshop series", year: "2023", description: "Portland · 200+ attendees" },
    ],
    media: [
      { id: "m1", type: "image", url: IMG("1571019613454-1ab2e0d8d03b", 800, 500), title: "Hip flow for lifters" },
    ],
    socialLinks: [{ platform: "Instagram", url: "https://instagram.com/" }],
    pricingPlans: [],
    coverImageUrl: IMG("1571019613454-1ab2e0d8d03b", 900, 600),
    avatarUrl: IMG("1494790108377-be9c29b29330", 400, 400),
    rating: 4.7,
    reviewCount: 29,
    maxStudents: 10,
  },
  {
    userIndex: 12,
    username: "zara_track",
    displayName: "Zara Thompson",
    sport: "Running",
    location: "Atlanta, GA",
    bio: "400m sprinter | State champion | Speed kills",
    specialties: ["Running", "Sprint Training", "Track"],
    experience: "6",
    rate: 55,
    verified: true,
    tagline: "Speed · blocks · acceleration for track athletes",
    sessionTypes: ["Individual (1-on-1)", "Small Group (2-5)"],
    philosophy:
      "Speed is a skill you can teach. We nail start mechanics, drive phase, and max velocity with video feedback every session.",
    longBio:
      "Still competing in masters 400m while coaching high-school sprinters and weekend warriors chasing faster 5Ks through speed work.",
    certifications: ["USATF Level 1", "Speed Academy Certified"],
    achievements: [
      { id: "z1", title: "State 400m champion", year: "2020", description: "Personal best 56.2" },
      { id: "z2", title: "Sprint clinic founder", year: "2024", description: "Monthly at Westside Track" },
    ],
    media: [
      { id: "m1", type: "image", url: IMG("1476480862127-20992f0a0b66", 800, 500), title: "Block start drills" },
    ],
    socialLinks: [],
    pricingPlans: [],
    coverImageUrl: IMG("1476480862127-20992f0a0b66", 900, 600),
    avatarUrl: IMG("1580489944761-15a19d654956", 400, 400),
    rating: 4.8,
    reviewCount: 22,
    maxStudents: 8,
  },
  {
    userIndex: 21,
    username: "kob_run",
    displayName: "Kevin O'Brien",
    sport: "Running",
    location: "Denver, CO",
    bio: "Ultra runner | 100-miler finisher",
    specialties: ["Running", "Endurance", "Trail"],
    experience: "7",
    rate: 50,
    verified: false,
    tagline: "5K → marathon · smart mileage builds",
    sessionTypes: ["Individual (1-on-1)", "Online Sessions"],
    philosophy:
      "Long-term consistency beats hero weeks. I build durable aerobic bases, fueling habits, and race plans that respect your life schedule.",
    longBio:
      "Finished 12 ultras including Leadville 100. I coach first-time marathoners and trail curious road runners with weekly check-ins and TrainingPeaks plans.",
    certifications: ["RRCA Endurance Coach", "Wilderness First Responder"],
    achievements: [
      { id: "r1", title: "Leadville 100 finisher", year: "2022", description: "Under 25 hours" },
      { id: "r2", title: "Marathon BQ pacing group", year: "2024", description: "18 athletes under 3:30" },
    ],
    media: [
      { id: "m1", type: "image", url: IMG("1552674605-db6ffd4facb5", 800, 500), title: "Trail long run crew" },
      { id: "m2", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Marathon week pacing tips" },
    ],
    socialLinks: [{ platform: "Strava", url: "https://www.strava.com/" }],
    pricingPlans: [],
    coverImageUrl: IMG("1552674605-db6ffd4facb5", 900, 600),
    avatarUrl: IMG("1500648767791-00dcc994a43e", 400, 400),
    rating: 4.7,
    reviewCount: 36,
    maxStudents: 20,
  },
  {
    userIndex: 25,
    username: "btorres_mma",
    displayName: "Brandon Torres",
    sport: "MMA",
    location: "Miami, FL",
    bio: "Jiu-jitsu black belt | Competing at 170lbs",
    specialties: ["MMA", "Grappling", "BJJ"],
    experience: "12",
    rate: 78,
    verified: true,
    tagline: "BJJ · wrestling · cage-ready grappling",
    sessionTypes: ["Individual (1-on-1)", "Team Training"],
    philosophy:
      "Position before submission. I teach a tight top game and escapes that work under fatigue — because that's when fights are decided.",
    longBio:
      "Black belt under Marcelo Garcia lineage. I run no-gi labs for MMA fighters and hobbyists, plus competition prep for IBJJF and local cards.",
    certifications: ["IBJJF Black Belt", "SafeSport Certified"],
    achievements: [
      { id: "b1", title: "IBJJF Pan Ams bronze", year: "2018", description: "Medium-heavy" },
      { id: "b2", title: "MMA grappling specialist", year: "2024", description: "Corner for 4 pro debuts" },
    ],
    media: [
      { id: "m1", type: "image", url: IMG("1599058917212-d750089bc07e", 800, 500), title: "Guard retention flow" },
    ],
    socialLinks: [{ platform: "Instagram", url: "https://instagram.com/" }],
    pricingPlans: [],
    coverImageUrl: IMG("1599058917212-d750089bc07e", 900, 600),
    avatarUrl: IMG("1506794778202-cad84cf34f4d", 400, 400),
    rating: 4.9,
    reviewCount: 41,
    maxStudents: 8,
  },
  {
    userIndex: 38,
    username: "amber_crossfit",
    displayName: "Amber Phillips",
    sport: "CrossFit",
    location: "Atlanta, GA",
    bio: "CrossFit L2 trainer | Nutrition coach",
    specialties: ["CrossFit", "Nutrition Guidance", "Women's fitness"],
    experience: "10",
    rate: 72,
    verified: false,
    tagline: "L2 coach · macros · strength for busy moms",
    sessionTypes: ["Individual (1-on-1)", "Online Sessions", "Nutrition check-in"],
    philosophy:
      "Training should fit your life — not the other way around. We pair simple nutrition habits with efficient strength sessions you can repeat.",
    longBio:
      "Mom of two, still competing in masters 35-39. I specialize in return-to-fitness after pregnancy and high-stress careers with travel schedules.",
    certifications: ["CrossFit L2", "Precision Nutrition L1", "Pre/Postnatal Coach"],
    achievements: [
      { id: "am1", title: "Nutrition cohort lead", year: "2023", description: "40 clients · avg 4kg lean gain goal" },
    ],
    media: [
      { id: "m1", type: "image", url: IMG("1518611012118-696072aa0dc8", 800, 500), title: "Home gym strength circuit" },
      { id: "m2", type: "image", url: IMG("1574680096145-05c3977a3b42", 800, 500), title: "Macro-friendly meal prep" },
    ],
    socialLinks: [{ platform: "Instagram", url: "https://instagram.com/" }],
    pricingPlans: [],
    coverImageUrl: IMG("1518611012118-696072aa0dc8", 900, 600),
    avatarUrl: IMG("1438761681033-6461ffad8d80", 400, 400),
    rating: 4.8,
    reviewCount: 27,
    maxStudents: 12,
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
    coverImageUrl: persona.coverImageUrl,
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
