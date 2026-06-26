/** Test wave planning — Waves 1–4 integration tests implemented. */

export const WAVE_1 = {
  id: 1,
  name: "Foundation + team lifecycle",
  domains: [
    "Test harness (Vitest + supertest + createApplication)",
    "Teams: create, join template, apply, approve, invite, decline",
    "Team games: log, record, profile team-games, visibility",
    "Sport labels unit tests",
    "E2E: one real team journey (Chromium)",
    "E2E smoke: auth + nav (mocked APIs)",
  ],
} as const;

export const WAVE_2_CHECKLIST = [
  {
    domain: "Feed & posts",
    scenarios: [
      "Create text post",
      "Feed keyset pagination",
      "Like / unlike",
      "Comment thread",
      "Guest cannot post (401)",
    ],
    apiPrefix: "/api/posts",
    uiEntry: ["/feed", "/"],
  },
  {
    domain: "Events",
    scenarios: [
      "Create event",
      "RSVP yes/no",
      "Event detail + route coordinates",
      "My Hub events list",
    ],
    apiPrefix: "/api/events",
    uiEntry: ["/events", "/my-hub/events"],
  },
  {
    domain: "Profile (extended)",
    scenarios: [
      "Public profile by username",
      "Profile teams tab",
      "Profile events tab",
      "Stats merge (challenges + team games)",
    ],
    apiPrefix: "/api/profile",
    uiEntry: ["/profile"],
  },
  {
    domain: "Discovery & places",
    scenarios: [
      "Places list / detail",
      "Map entity navigation",
      "Public teams list (unauthenticated)",
    ],
    apiPrefix: "/api/places",
    uiEntry: ["/?panel=venues", "/map"],
  },
  {
    domain: "Notifications",
    scenarios: [
      "team_invite notification payload + route",
      "join request reviewed notification",
      "Mark read / unread count",
    ],
    apiPrefix: "/api/notifications",
    uiEntry: ["/notifications"],
  },
] as const;

export const WAVE_2 = {
  id: 2,
  name: "Feed, events, profile, discovery, notifications",
  integrationFile: "tests/integration/wave2.test.ts",
  checklist: WAVE_2_CHECKLIST,
} as const;

export const WAVE_3_CHECKLIST = [
  {
    domain: "Marketplace",
    scenarios: [
      "Guest product detail pricing",
      "Authed product detail pricing",
      "Cart add / remove",
      "Checkout intent (Stripe mock)",
      "Wishlist",
    ],
    script: "scripts/test-marketplace-flow.ts",
    uiEntry: ["/marketplace"],
  },
  {
    domain: "Coaches",
    scenarios: [
      "Public GET /api/coaches",
      "Coach detail",
      "Booking checkout shape",
      "Coach apply flow",
    ],
    apiPrefix: "/api/coaches",
    uiEntry: ["/coaches"],
  },
  {
    domain: "Challenges",
    scenarios: [
      "Create challenge",
      "Accept / decline",
      "Report score",
      "Profile challenge history stats",
    ],
    apiPrefix: "/api/competitive-challenges",
    uiEntry: ["/challenges"],
  },
  {
    domain: "Instant teams",
    scenarios: [
      "Create instant team",
      "Join / leave",
      "Convert to full team",
    ],
    apiPrefix: "/api/instant-teams",
    uiEntry: ["/instant-join"],
  },
  {
    domain: "Messaging",
    scenarios: [
      "DM thread",
      "Group create",
      "Unread count",
    ],
    apiPrefix: "/api/messenger",
    uiEntry: ["/messages"],
  },
] as const;

export const WAVE_3 = {
  id: 3,
  name: "Marketplace, coaches, challenges, instant teams, messaging",
  integrationFile: "tests/integration/wave3.test.ts",
  checklist: WAVE_3_CHECKLIST,
} as const;

export const WAVE_4_CHECKLIST = [
  { domain: "Security", scenarios: ["CSRF on mutating routes", "Public discovery lists", "Admin routes require auth"] },
  { domain: "Admin / GDPR", scenarios: ["Admin dashboard RBAC", "Privacy settings", "Data export", "Deletion request"] },
  { domain: "SURNA Pro", scenarios: ["Entitlement open access", "Pro team training route", "Pro workflow approvals"] },
  { domain: "Load / soak", note: "tests/load_test.js, scripts/loadtest.k6.js — run separately" },
] as const;

export const WAVE_4 = {
  id: 4,
  name: "Security, admin, GDPR, Pro smoke",
  integrationFile: "tests/integration/wave4.test.ts",
  checklist: WAVE_4_CHECKLIST,
} as const;

/** Deferred fixes — see `.cursor/rules/fix-fails-next.mdc`. */
export const FIX_NEXT = [
  "REMIND LATER: staging k6 soak (100k) — docs/STAGING_SOAK_CHECKLIST.md, npm run test:load:staging",
] as const;
