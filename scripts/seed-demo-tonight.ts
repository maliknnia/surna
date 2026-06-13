/**
 * Full demo populate for live demos — run against Railway Postgres:
 *   $env:DATABASE_URL="postgresql://..."; npm run db:seed:demo
 */
import "dotenv/config";
import crypto from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { runSeed } from "./seed-data";
import { avatarUrl, actionPhotoUrl } from "./seedImages";

const uuid = () => crypto.randomUUID();

const IMG = (id: string, w: number, h: number, extra = "") =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=85${extra}`;

const irishPortraits = [
  "1571011273684-49f92094c40d", "1594381898411-846e442a8b68", "1568602471122-7832951ccda0",
  "1507003211169-0a1dd7228f2d", "1494790108377-be9c29b29330", "1552374196-c4e7ffc6e126",
  "1517841905240-472988babdf9", "1500648767791-00dcc994a43e", "1438761681033-6461ffad8d80",
  "1542206395-9feb3edaa68d", "1522075469751-3a6694fb2f61", "1601422407696-bc8942f6b527",
  "1582750433449-648ed127bb54", "1519085361429-33805a1261a6", "1552053831-7157e71027ef",
].map((id, i) => IMG(id, 400, 400, i % 2 ? "&crop=face" : ""));

const gaaAction = [
  IMG("1521417535008-fd1fb9c83ffb", 900, 600),
  IMG("1517649763962-0c623066013b", 900, 600),
  IMG("1574629810360-7efbbe195018", 900, 600),
  IMG("1546519638-68d0994c5a0a", 900, 600),
  IMG("1552674605-db6ffd4facb5", 900, 600),
  IMG("1461896836934-bd45ba51ce6a", 900, 600),
  IMG("1517644712207-74307c90dcef", 900, 600),
  IMG("1599058917212-d750089bc07e", 900, 600),
  IMG("1534438327276-14e9ded8db37", 900, 600),
  IMG("1622163640459-1b9a4661f851", 900, 600),
];

const irishAthletes = [
  { firstName: "Conor", lastName: "Murphy", username: "conor_murphy_15", sport: "GAA Football", position: "Centre Forward", city: "Dublin", county: "Dublin", bio: "Dublin senior panel · 1-12 from play last Sunday · All-Ireland dream 🏐", skill: "elite" },
  { firstName: "Aoife", lastName: "Kelly", username: "aoife_kelly_cork", sport: "Camogie", position: "Full Forward", city: "Cork", county: "Cork", bio: "Cork camogie · Páirc Uí Chaoimh regular · Club: Glen Rovers", skill: "advanced" },
  { firstName: "Sean", lastName: "O'Brien", username: "sean_obrien_hurl", sport: "Hurling", position: "Midfield", city: "Kilkenny", county: "Kilkenny", bio: "Hurling midfielder · Liam MacCarthy hopeful · Training 6 days a week", skill: "elite" },
  { firstName: "Niamh", lastName: "Walsh", username: "niamh_walsh_gaa", sport: "GAA Football", position: "Corner Back", city: "Galway", county: "Galway", bio: "Galway ladies · Tough as nails defending · TG4 highlights reel incoming", skill: "advanced" },
  { firstName: "Patrick", lastName: "Ryan", username: "paddy_ryan_kerry", sport: "GAA Football", position: "Half Forward", city: "Killarney", county: "Kerry", bio: "Kerry green & gold · Killarney Legion · Point machine from 45s", skill: "elite" },
  { firstName: "Ciara", lastName: "Dunne", username: "ciara_dunne_fit", sport: "Running", position: "Distance", city: "Dublin", county: "Dublin", bio: "Dublin City Marathon 3:04 · Phoenix Park intervals every Tuesday", skill: "advanced" },
  { firstName: "Liam", lastName: "Healy", username: "liam_healy_box", sport: "Boxing", position: "Welterweight", city: "Limerick", county: "Limerick", bio: "IABA national finalist · St. Francis Boxing Club · 14-2 amateur", skill: "advanced" },
  { firstName: "Emma", lastName: "Fitzgerald", username: "emma_fit_dub", sport: "CrossFit", position: "Athlete", city: "Dublin", county: "Dublin", bio: "CrossFit Dublin · 215kg deadlift · Coaching mornings at the Docklands box", skill: "intermediate" },
  { firstName: "Darragh", lastName: "McCarthy", username: "darragh_mccarthy", sport: "Soccer", position: "Attacking Mid", city: "Cork", county: "Cork", bio: "LOI fan · Turners Cross Sundays · Left foot for days ⚽", skill: "intermediate" },
  { firstName: "Orla", lastName: "Nolan", username: "orla_nolan_swim", sport: "Swimming", position: "Freestyle", city: "Waterford", county: "Waterford", bio: "Masters swimmer · 50m free PB 28.4 · Early laps at the WIT arena", skill: "advanced" },
  { firstName: "Jack", lastName: "Byrne", username: "jack_byrne_rugby", sport: "Rugby", position: "Openside Flanker", city: "Dublin", county: "Leinster", bio: "Leinster U20s pathway · Terenure RFC · Breakdown merchant", skill: "advanced" },
  { firstName: "Sinead", lastName: "Moran", username: "sinead_moran_gym", sport: "CrossFit", position: "Coach", city: "Galway", county: "Galway", bio: "Coach · HYROX competitor · Eyre Square run club organiser", skill: "elite" },
  { firstName: "Cian", lastName: "Burke", username: "cian_burke_gaa", sport: "Hurling", position: "Full Back", city: "Tipperary", county: "Tipperary", bio: "Tipperary hurling · Thurles training camp this week · Clearances for days", skill: "elite" },
  { firstName: "Molly", lastName: "Hennessy", username: "molly_hennessy", sport: "GAA Football", position: "Midfield", city: "Mayo", county: "Mayo", bio: "Mayo ladies midfield · McHale Park · Heart of the team", skill: "advanced" },
  { firstName: "Rory", lastName: "Kavanagh", username: "rory_kavanagh", sport: "GAA Football", position: "Captain", city: "Donegal", county: "Donegal", bio: "Club captain · Donegal GAA lifer · Lifting the county every year", skill: "elite" },
];

const irishPosts = [
  { content: "What a Sunday in Croke Park! Massive win for the lads — atmosphere was unreal 🇮🇪", sport: "GAA Football", tags: ["gaa", "crokepark", "matchday"] },
  { content: "Hurling training under the lights in Nowlan Park. Sliotars flying, lungs burning 🏑", sport: "Hurling", tags: ["hurling", "kilkenny", "training"] },
  { content: "Camogie final replay next week — every session counts. Cork abú!", sport: "Camogie", tags: ["camogie", "cork", "final"] },
  { content: "Phoenix Park 10k done before work. Dublin hits different on a crisp morning 🏃", sport: "Running", tags: ["running", "dublin", "morning"] },
  { content: "Club championship semi — scored 1-4 from play. County panel watch this space 👀", sport: "GAA Football", tags: ["gaa", "championship", "goals"] },
  { content: "Sparring night at the club. 6 rounds in the tank. Fight announcement soon 🥊", sport: "Boxing", tags: ["boxing", "sparring", "irish"] },
  { content: "Leinster derby energy at the RDS — best supporters in the world 💚", sport: "Rugby", tags: ["rugby", "leinster", "matchday"] },
  { content: "New boots for the league run-in. First touch felt butter smooth ⚽", sport: "Soccer", tags: ["soccer", "loi", "boots"] },
  { content: "County training camp Day 2 — ice bath, video analysis, repeat 🧊", sport: "GAA Football", tags: ["gaa", "camp", "recovery"] },
  { content: "TG4 are coming to film Sunday's game — no pressure lads 😅📹", sport: "GAA Football", tags: ["gaa", "media", "ladies"] },
];

const irishEvents = [
  { title: "Dublin 7-a-side GAA Blitz", desc: "Fast-paced football blitz at St Anne's Park. All clubs welcome.", sport: "GAA Football", location: "St Anne's Park, Dublin", days: 2, cap: 56 },
  { title: "Cork Hurling Skills Clinic", desc: "Puck-out, striking and first touch drills with county coaches.", sport: "Hurling", location: "Páirc Uí Chaoimh, Cork", days: 4, cap: 40 },
  { title: "Galway Bay Sunset Run", desc: "5k + 10k along the prom. Coffee after at Salthill.", sport: "Running", location: "Salthill Promenade, Galway", days: 1, cap: 120 },
  { title: "Leinster Rugby Touch Tournament", desc: "Mixed touch rugby — 6-a-side, music and food trucks after.", sport: "Rugby", location: "UCD Bowl, Dublin", days: 6, cap: 64 },
  { title: "Kerry County Football Open Trial", desc: "Open trial for U20 panel. Bring boots and gumshield.", sport: "GAA Football", location: "Fitzgerald Stadium, Killarney", days: 9, cap: 80 },
  { title: "CrossFit Dublin Charity WOD", desc: "Teams of 3. All proceeds to local youth sports.", sport: "CrossFit", location: "Grand Canal Dock, Dublin", days: 3, cap: 36 },
];

async function seedIrishDemoLayer() {
  console.log("\n🇮🇪 Adding Irish / GAA demo layer...");
  const created: { id: string }[] = [];

  for (let i = 0; i < irishAthletes.length; i++) {
    const a = irishAthletes[i];
    const [user] = await db
      .insert(users)
      .values({
        id: uuid(),
        email: `${a.username}@surna.app`,
        firstName: a.firstName,
        lastName: a.lastName,
        username: a.username,
        displayName: `${a.firstName} ${a.lastName}`,
        profileImageUrl: avatarUrl(a.username),
        bio: a.bio,
        sport: a.sport,
        primarySport: a.sport,
        position: a.position,
        skillLevel: a.skill,
        location: `${a.city}, Ireland`,
        availability: "Evenings & weekends",
        lookingFor: "competitive",
        verified: i < 6,
        emailVerified: true,
        profileType: "normal",
        profileJson: {
          profilePathChosenAt: new Date().toISOString(),
          profileSetupCompletedAt: new Date().toISOString(),
          onboardingSkipped: true,
        },
        sportIdentity: {
          gaaCounty: a.county,
          primarySport: a.sport,
          position: a.position,
        },
        clubHistory: `${a.county} county & local club`,
        points: 200 + i * 37,
      })
      .returning({ id: users.id });
    created.push(user);

    const level = 8 + (i % 15);
    await db.execute(
      sql`INSERT INTO user_levels (id, user_id, level, total_points, points_to_next_level) VALUES (${uuid()}, ${user.id}, ${level}, ${level * 180}, ${(level + 1) * 180})`,
    );
  }

  // Cross-follow Irish athletes
  for (let i = 0; i < created.length; i++) {
    for (let j = 1; j <= 5; j++) {
      const target = created[(i + j) % created.length];
      if (target.id === created[i].id) continue;
      await db.execute(
        sql`INSERT INTO user_follows (id, follower_id, followed_id) VALUES (${uuid()}, ${created[i].id}, ${target.id}) ON CONFLICT DO NOTHING`,
      ).catch(() => {});
    }
  }

  // Posts with images
  for (let i = 0; i < irishPosts.length; i++) {
    const author = created[i % created.length];
    const p = irishPosts[i];
    const pid = uuid();
    const tags = `{${p.tags.join(",")}}`;
    const likes = 40 + Math.floor(Math.random() * 180);
    const comments = 5 + Math.floor(Math.random() * 35);
    const createdAt = new Date(Date.now() - Math.floor(Math.random() * 48) * 60 * 60 * 1000);
    await db.execute(
      sql`INSERT INTO posts (id, author_id, content, image_url, media_type, sport, hashtags, visibility, post_type, likes_count, comments_count, shares_count, created_at) VALUES (${pid}, ${author.id}, ${p.content}, ${actionPhotoUrl(`gaa-post-${i}`, 900, 600)}, 'image', ${p.sport}, ${tags}::text[], 'public', 'image', ${likes}, ${comments}, ${Math.floor(likes / 8)}, ${createdAt.toISOString()})`,
    );
    for (let l = 0; l < 6; l++) {
      const liker = created[(i + l + 1) % created.length];
      await db.execute(
        sql`INSERT INTO post_likes (id, post_id, user_id) VALUES (${uuid()}, ${pid}, ${liker.id})`,
      ).catch(() => {});
    }
  }

  // Stories — every Irish athlete gets 2
  const expiresAt = new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString();
  const storyLines = [
    "County final week 💚", "Morning pitch session", "Matchday fit check",
    "Training camp vibes", "Highlight reel dropping soon", "Club abú!",
    "Under the floodlights", "Recovery mode ON", "Captain's run today",
  ];
  let stories = 0;
  for (let i = 0; i < created.length; i++) {
    for (let s = 0; s < 2; s++) {
      const sid = uuid();
      const idx = i * 2 + s;
      await db.execute(
        sql`INSERT INTO stories (id, user_id, owner_type, owner_id, media_url, media_type, caption, visibility, view_count, expires_at) VALUES (${sid}, ${created[i].id}, 'person', ${created[i].id}, ${actionPhotoUrl(`gaa-story-${idx}`, 900, 600)}, 'image', ${storyLines[idx % storyLines.length]}, 'public', ${30 + idx * 3}, ${expiresAt})`,
      );
      stories++;
    }
  }

  // Events
  for (let i = 0; i < irishEvents.length; i++) {
    const e = irishEvents[i];
    const creator = created[i % created.length];
    const starts = new Date(Date.now() + e.days * 24 * 60 * 60 * 1000);
    starts.setHours(14 + (i % 4), 0, 0, 0);
    const ends = new Date(starts.getTime() + 3 * 60 * 60 * 1000);
    const eid = uuid();
    await db.execute(
      sql`INSERT INTO events (id, creator_id, organizer_id, title, description, event_type, sport, starts_at, ends_at, start_date, end_date, location, visibility, capacity, is_public) VALUES (${eid}, ${creator.id}, ${creator.id}, ${e.title}, ${e.desc}, 'competition', ${e.sport}, ${starts.toISOString()}, ${ends.toISOString()}, ${starts.toISOString()}, ${ends.toISOString()}, ${e.location}, 'public', ${e.cap}, true)`,
    );
    for (let p = 0; p < 5; p++) {
      await db.execute(
        sql`INSERT INTO event_participants (id, event_id, user_id) VALUES (${uuid()}, ${eid}, ${created[(i + p) % created.length].id})`,
      ).catch(() => {});
    }
  }

  // Notifications for demo accounts
  const notifs = [
    { type: "follow", title: "New follower", message: "Conor Murphy started following you" },
    { type: "like", title: "Post liked", message: "Aoife Kelly liked your match highlight" },
    { type: "event", title: "Event tomorrow", message: "Dublin 7-a-side GAA Blitz starts at 2pm" },
    { type: "challenge", title: "Challenge invite", message: "Sean O'Brien challenged you to a skills duel" },
    { type: "team_invite", title: "Team invite", message: "Join Kerry County Select for the blitz" },
  ];
  for (const u of created.slice(0, 8)) {
    for (let n = 0; n < notifs.length; n++) {
      await db.execute(
        sql`INSERT INTO notifications (id, user_id, type, title, message, is_read) VALUES (${uuid()}, ${u.id}, ${notifs[n].type}, ${notifs[n].title}, ${notifs[n].message}, ${n > 2})`,
      ).catch(() => {});
    }
  }

  console.log(`  + ${created.length} Irish athletes (@surna.app)`);
  console.log(`  + ${irishPosts.length} GAA/sports posts with photos`);
  console.log(`  + ${stories} stories`);
  console.log(`  + ${irishEvents.length} Irish events`);
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required. Paste your Railway Postgres URL and run again.");
    process.exit(1);
  }

  console.log("🌱 SURNA demo seed — fake users, posts, stories, events, teams, coaches...\n");
  await runSeed();
  await seedIrishDemoLayer();
  console.log("\n✅ Demo ready! Open the app — feed, stories, events & coaches should be full.");
  console.log("   Demo accounts use emails like marcusj_hoops@surna.app (not for login — browse as guest or your account).");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Demo seed failed:", err);
    process.exit(1);
  });
