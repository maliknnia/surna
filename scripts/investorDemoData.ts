import type { FakeCoachPersona } from "./coachSeedPersonas";

export type InvestorAthlete = {
  firstName: string;
  lastName: string;
  username: string;
  sport: string;
  position: string;
  city: string;
  county: string;
  bio: string;
  skill: string;
  verified?: boolean;
  isCoach?: boolean;
};

export const INVESTOR_ATHLETES: InvestorAthlete[] = [
  { firstName: "Conor", lastName: "Murphy", username: "conor_murphy", sport: "GAA Football", position: "Centre Forward", city: "Dublin", county: "Dublin", bio: "Dublin senior panel · 1-12 from play last Sunday · All-Ireland dream 🏐", skill: "elite", verified: true },
  { firstName: "Aoife", lastName: "Kelly", username: "aoife_kelly", sport: "Camogie", position: "Full Forward", city: "Cork", county: "Cork", bio: "Cork camogie · Páirc Uí Chaoimh regular · Glen Rovers club", skill: "advanced", verified: true },
  { firstName: "Sean", lastName: "O'Brien", username: "sean_obrien", sport: "Hurling", position: "Midfield", city: "Kilkenny", county: "Kilkenny", bio: "Kilkenny hurling · Liam MacCarthy hopeful · 6 days a week on the sod", skill: "elite", verified: true },
  { firstName: "Niamh", lastName: "Walsh", username: "niamh_walsh", sport: "GAA Football", position: "Corner Back", city: "Galway", county: "Galway", bio: "Galway ladies · TG4 Sunday Game energy · Defence wins titles", skill: "advanced", verified: true },
  { firstName: "Patrick", lastName: "Ryan", username: "paddy_ryan", sport: "GAA Football", position: "Half Forward", city: "Killarney", county: "Kerry", bio: "Kerry green & gold · Killarney Legion · Scores from 45s", skill: "elite", verified: true },
  { firstName: "Ciara", lastName: "Dunne", username: "ciara_dunne", sport: "Running", position: "Marathon", city: "Dublin", county: "Dublin", bio: "Dublin Marathon 3:04 · Phoenix Park intervals every Tuesday", skill: "advanced", verified: true },
  { firstName: "Liam", lastName: "Healy", username: "liam_healy", sport: "Boxing", position: "Welterweight", city: "Limerick", county: "Limerick", bio: "IABA national finalist · 14-2 amateur · St Francis BC", skill: "advanced", isCoach: true },
  { firstName: "Emma", lastName: "Fitzgerald", username: "emma_fit", sport: "CrossFit", position: "Coach", city: "Dublin", county: "Dublin", bio: "CrossFit Docklands · 215kg deadlift · HYROX Dublin prep", skill: "elite", verified: true, isCoach: true },
  { firstName: "Darragh", lastName: "McCarthy", username: "darragh_mcc", sport: "Soccer", position: "Attacking Mid", city: "Cork", county: "Cork", bio: "LOI fan · Turners Cross Sundays · Left foot for days ⚽", skill: "intermediate" },
  { firstName: "Orla", lastName: "Nolan", username: "orla_nolan", sport: "Swimming", position: "Freestyle", city: "Waterford", county: "Waterford", bio: "Masters swimmer · 50m free PB 28.4 · Early laps at WIT", skill: "advanced", isCoach: true },
  { firstName: "Jack", lastName: "Byrne", username: "jack_byrne", sport: "Rugby", position: "Flanker", city: "Dublin", county: "Leinster", bio: "Leinster U20 pathway · Terenure RFC · Breakdown merchant", skill: "advanced", verified: true },
  { firstName: "Sinead", lastName: "Moran", username: "sinead_moran", sport: "CrossFit", position: "Athlete", city: "Galway", county: "Galway", bio: "HYROX competitor · Eyre Square run club organiser", skill: "elite" },
  { firstName: "Cian", lastName: "Burke", username: "cian_burke", sport: "Hurling", position: "Full Back", city: "Thurles", county: "Tipperary", bio: "Tipperary hurling · Semple Stadium sessions · Clearances for days", skill: "elite", verified: true },
  { firstName: "Molly", lastName: "Hennessy", username: "molly_hennessy", sport: "GAA Football", position: "Midfield", city: "Castlebar", county: "Mayo", bio: "Mayo ladies midfield · McHale Park · Heart of the team", skill: "advanced" },
  { firstName: "Rory", lastName: "Kavanagh", username: "rory_kavanagh", sport: "GAA Football", position: "Captain", city: "Donegal", county: "Donegal", bio: "Club captain · Donegal GAA lifer · Lifting the county every year", skill: "elite", verified: true },
  { firstName: "Aidan", lastName: "Foley", username: "aidan_foley", sport: "Cycling", position: "Road", city: "Cork", county: "Cork", bio: "Cork cycling club · Ring of Kerry sportive finisher · Watt chaser", skill: "intermediate" },
  { firstName: "Grace", lastName: "O'Sullivan", username: "grace_os", sport: "Tennis", position: "Singles", city: "Dublin", county: "Dublin", bio: "FITZ club · ITF circuit · Serve-and-volley on hard courts", skill: "advanced", isCoach: true },
  { firstName: "Tom", lastName: "Walsh", username: "tom_walsh", sport: "Rugby", position: "Fly Half", city: "Limerick", county: "Munster", bio: "Munster Schools · Garryowen RFC · Boot through the posts", skill: "advanced" },
];

export const INVESTOR_POSTS: Array<{ content: string; sport: string; tags: string[]; video?: boolean }> = [
  { content: "Croke Park on a Sunday — nothing compares. Massive win for the lads, crowd was electric 🇮🇪", sport: "GAA Football", tags: ["gaa", "crokepark", "matchday"] },
  { content: "Hurling under the lights in Nowlan Park. Sliotars flying, lungs burning 🏑", sport: "Hurling", tags: ["hurling", "kilkenny", "training"], video: true },
  { content: "Camogie final replay next week — every session counts. Cork abú!", sport: "Camogie", tags: ["camogie", "cork", "final"] },
  { content: "Phoenix Park 10k before work. Dublin hits different on a crisp morning 🏃", sport: "Running", tags: ["running", "dublin", "morning"] },
  { content: "Club championship semi — 1-4 from play. County panel watch this space 👀", sport: "GAA Football", tags: ["gaa", "championship", "goals"], video: true },
  { content: "Sparring night at the club. 6 rounds in the tank. Fight announcement soon 🥊", sport: "Boxing", tags: ["boxing", "sparring", "irish"] },
  { content: "Leinster derby at the RDS — best supporters in the world 💚", sport: "Rugby", tags: ["rugby", "leinster", "matchday"], video: true },
  { content: "New boots for the league run-in. First touch felt butter ⚽", sport: "Soccer", tags: ["soccer", "loi", "boots"] },
  { content: "County training camp Day 2 — ice bath, video analysis, repeat 🧊", sport: "GAA Football", tags: ["gaa", "camp", "recovery"] },
  { content: "TG4 filming Sunday's game — no pressure lads 😅📹", sport: "GAA Football", tags: ["gaa", "media", "ladies"], video: true },
  { content: "Docklands WOD done — 12:04 RX. Leaderboard doesn't lie 💪", sport: "CrossFit", tags: ["crossfit", "wod", "dublin"], video: true },
  { content: "Morning laps at WIT — 50m splits looking sharp for nationals 🏊", sport: "Swimming", tags: ["swimming", "waterford", "masters"] },
  { content: "Ring of Kerry sportive — 180km of pain and scenery 🚴", sport: "Cycling", tags: ["cycling", "kerry", "endurance"], video: true },
  { content: "Semple Stadium session — puck-outs for an hour straight 🏑", sport: "Hurling", tags: ["hurling", "tipperary", "skills"] },
  { content: "McHale Park under floodlights — Mayo abú!", sport: "GAA Football", tags: ["gaa", "mayo", "nightgame"] },
  { content: "Match highlight reel dropping tonight — save this post 🔥", sport: "GAA Football", tags: ["highlights", "reel", "gaa"], video: true },
  { content: "Recovery walk along the Liffey after yesterday's final. Legs toast but heart full", sport: "GAA Football", tags: ["recovery", "dublin", "gaa"] },
  { content: "Club abú! Semi-final booked — see you all in the stands next Sunday", sport: "Hurling", tags: ["hurling", "club", "final"] },
  { content: "Hit a new 1RM clean today — 120kg. Coach Emma had me ready 📈", sport: "CrossFit", tags: ["crossfit", "pr", "strength"], video: true },
  { content: "Donegal hills session — lungs on fire, views worth every step", sport: "GAA Football", tags: ["donegal", "conditioning", "gaa"] },
  { content: "Turners Cross atmosphere last night was unreal. LOI season heating up ⚽", sport: "Soccer", tags: ["soccer", "cork", "matchday"], video: true },
  { content: "Serve speed up 8mph this block — FITZ hard courts in the rain ☔🎾", sport: "Tennis", tags: ["tennis", "dublin", "training"] },
  { content: "Captain's run done. Speech locked in for Sunday. This is our year", sport: "GAA Football", tags: ["captain", "gaa", "leadership"] },
  { content: "Post-match chipper with the squad — wins taste better together 🍀", sport: "GAA Football", tags: ["team", "gaa", "culture"] },
];

export const INVESTOR_TEAMS = [
  { name: "Dublin Gaelic Select", sport: "GAA Football", location: "Dublin", description: "Elite county select squad — championship prep, video analysis, and squad culture.", members: 22, verified: true },
  { name: "Cork Hurling Club", sport: "Hurling", location: "Cork", description: "Premier hurling club on the Lee. Minor to senior panels, all welcome on trial nights.", members: 24, verified: true },
  { name: "Kerry Kingdom FC", sport: "GAA Football", location: "Killarney", description: "Killarney-based football club with county championship pedigree.", members: 20, verified: true },
  { name: "Galway Bay Run Club", sport: "Running", location: "Galway", description: "Salthill prom runs, marathon blocks, and coffee after every session.", members: 48, verified: true },
  { name: "Leinster Touch Rugby", sport: "Rugby", location: "Dublin", description: "Mixed touch rugby — RDS summer league and social after every round.", members: 30, verified: true },
  { name: "CrossFit Docklands", sport: "CrossFit", location: "Dublin", description: "Competition-ready box on the Docklands — HYROX, Open, and community WODs.", members: 35, verified: true },
];

export const INVESTOR_PLACES = [
  { name: "Croke Park Training Centre", category: "field", sports: ["GAA Football", "Hurling"], bio: "Elite GAA training facility with full-size pitches and analysis suite.", address: "Jones Road", city: "Dublin", lat: "53.3607", lng: "-6.2513" },
  { name: "Páirc Uí Chaoimh", category: "field", sports: ["Hurling", "Camogie"], bio: "Iconic Cork stadium — camogie and hurling on the banks of the Lee.", address: "Centre Park Road", city: "Cork", lat: "51.8943", lng: "-8.4356" },
  { name: "Fitzgerald Stadium", category: "field", sports: ["GAA Football"], bio: "Killarney's cathedral of Kerry football — county finals and summer camps.", address: "Lewis Road", city: "Killarney", lat: "52.0588", lng: "-9.5072" },
  { name: "Pearse Stadium", category: "field", sports: ["GAA Football", "Hurling"], bio: "Galway's home ground — Salthill sea air and championship nights.", address: "Salthill", city: "Galway", lat: "53.2630", lng: "-9.0670" },
  { name: "RDS Arena Fitness", category: "gym", sports: ["Rugby", "CrossFit"], bio: "Leinster rugby touch leagues and strength & conditioning bays.", address: "Ballsbridge", city: "Dublin", lat: "53.3279", lng: "-6.2286" },
  { name: "WIT Sports Arena", category: "pool", sports: ["Swimming"], bio: "50m pool, masters lanes, and Waterford's swim club hub.", address: "Cork Road", city: "Waterford", lat: "52.2464", lng: "-7.1297" },
];

export const INVESTOR_EVENTS = [
  { title: "Dublin 7-a-side GAA Blitz", desc: "Fast-paced football blitz at St Anne's Park. All clubs welcome.", sport: "GAA Football", location: "St Anne's Park, Dublin", lat: "53.3702", lng: "-6.1745", days: 2, cap: 56 },
  { title: "Cork Hurling Skills Clinic", desc: "Puck-out, striking and first touch with county coaches.", sport: "Hurling", location: "Páirc Uí Chaoimh, Cork", lat: "51.8943", lng: "-8.4356", days: 4, cap: 40 },
  { title: "Galway Bay Sunset Run", desc: "5k + 10k along the prom. Coffee after at Salthill.", sport: "Running", location: "Salthill Promenade, Galway", lat: "53.2630", lng: "-9.0670", days: 1, cap: 120 },
  { title: "Leinster Touch Tournament", desc: "Mixed touch rugby — music and food trucks after.", sport: "Rugby", location: "RDS Arena, Dublin", lat: "53.3279", lng: "-6.2286", days: 6, cap: 64 },
  { title: "Kerry County Football Trial", desc: "Open trial for U20 panel. Boots and gumshield required.", sport: "GAA Football", location: "Fitzgerald Stadium, Killarney", lat: "52.0588", lng: "-9.5072", days: 9, cap: 80 },
  { title: "CrossFit Dublin Charity WOD", desc: "Teams of 3. Proceeds to local youth sports.", sport: "CrossFit", location: "Grand Canal Dock, Dublin", lat: "53.3434", lng: "-6.2365", days: 3, cap: 36 },
  { title: "Kilkenny Hurling Masterclass", desc: "Elite striking drills with county panel alumni.", sport: "Hurling", location: "Nowlan Park, Kilkenny", lat: "52.6542", lng: "-7.2448", days: 5, cap: 32 },
  { title: "Mayo Ladies Football Open Session", desc: "Open training — meet the squad at McHale Park.", sport: "GAA Football", location: "McHale Park, Castlebar", lat: "53.8558", lng: "-9.2950", days: 7, cap: 50 },
];

export const INVESTOR_MATCHES = [
  { title: "Dublin vs Kerry — Charity Football", type: "teamVsTeam", sport: "GAA Football", status: "accepted" },
  { title: "Cork Hurling 1v1 Skills Duel", type: "player1v1", sport: "Hurling", status: "live" },
  { title: "Galway Bay 5K Time Trial", type: "open", sport: "Running", status: "pending" },
  { title: "Leinster Touch Showdown", type: "teamVsTeam", sport: "Rugby", status: "accepted" },
  { title: "CrossFit Docklands Throwdown", type: "teamVsTeam", sport: "CrossFit", status: "completed" },
  { title: "Limerick Boxing Exhibition", type: "player1v1", sport: "Boxing", status: "pending" },
  { title: "Cork vs Dublin LOI Friendly", type: "teamVsTeam", sport: "Soccer", status: "accepted" },
  { title: "Masters Swim Relay Challenge", type: "open", sport: "Swimming", status: "pending" },
];

export const STORY_CAPTIONS = [
  "County final week 💚", "Morning pitch session", "Matchday fit check",
  "Training camp vibes", "Highlight reel dropping soon", "Club abú!",
  "Under the floodlights", "Recovery mode ON", "Captain's run today",
  "TG4 bound 📹", "New boots unboxed ⚽", "Ice bath crew 🧊",
];

export function buildInvestorCoachPersona(athlete: InvestorAthlete, userIndex: number): FakeCoachPersona {
  return {
    userIndex,
    username: athlete.username,
    displayName: `${athlete.firstName} ${athlete.lastName}`,
    bio: athlete.bio,
    location: `${athlete.city}, Ireland`,
    sport: athlete.sport,
    specialties: [athlete.sport, "Technique", "Match prep"],
    experience: "8",
    rate: 55 + userIndex * 3,
    verified: Boolean(athlete.verified),
    tagline: `${athlete.sport} coaching · ${athlete.city}`,
    sessionTypes: ["Individual (1-on-1)", "Small Group (2-5)", "Video analysis"],
    philosophy: "Build confidence through reps, film, and honest feedback — then compete free.",
    longBio: `${athlete.firstName} coaches athletes across ${athlete.county} with a focus on match-day performance and long-term development.`,
    certifications: ["National governing body Level 2", "First Aid / CPR"],
    achievements: [
      { id: "c1", title: "County panel experience", year: "2024", description: athlete.county },
      { id: "c2", title: "100+ athletes coached", year: "2025", description: athlete.city },
    ],
    media: [],
    socialLinks: [{ platform: "Instagram", url: "https://instagram.com/" }],
    pricingPlans: [],
    coverImageUrl: "",
    avatarUrl: "",
    rating: 4.7 + (userIndex % 3) * 0.1,
    reviewCount: 20 + userIndex * 4,
    maxStudents: 10,
  };
}
