/**
 * Investor demo seed — polished Irish sports community in the DB.
 *
 * Run:
 *   $env:DATABASE_URL="postgresql://..."; npm run db:seed:investor
 *
 * Optional — wire your login so stories/feed are full on first open:
 *   $env:INVESTOR_VIEWER_EMAIL="you@example.com"; npm run db:seed:investor
 */
import "dotenv/config";
import crypto from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { cleanupSeedUsers } from "./seedCleanup";
import {
  INVESTOR_ATHLETES,
  INVESTOR_EVENTS,
  INVESTOR_MATCHES,
  INVESTOR_PLACES,
  INVESTOR_POSTS,
  INVESTOR_TEAMS,
  STORY_CAPTIONS,
  buildInvestorCoachPersona,
} from "./investorDemoData";
import {
  actionPhotoAt,
  pexelsPhoto,
  portraitAt,
  videoAt,
  VENUE_COVERS,
  TEAM_COVERS,
} from "./investorMedia";
import { buildCoachSeedRow } from "./coachSeedPersonas";

const uuid = () => crypto.randomUUID();
const LOCAL_DEV_ID = "local-dev-user";

const COMMENTS = [
  "This is unreal — what a performance! 💪",
  "County panel calling your name 🔥",
  "Let's go! Best post on my feed today",
  "Respect — hard work showing",
  "Rematch soon? 👀",
  "Saved for motivation before training",
];

async function ensureSchemaColumns() {
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS creator_id varchar`);
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS starts_at timestamptz`);
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS ends_at timestamptz`);
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS visibility varchar DEFAULT 'public'`);
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity integer`);
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS lat varchar`);
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS lng varchar`);
  await db.execute(sql`ALTER TABLE coaches ADD COLUMN IF NOT EXISTS weekly_availability jsonb`);
  await db.execute(sql`ALTER TABLE coaches ADD COLUMN IF NOT EXISTS profile_json jsonb DEFAULT '{}'::jsonb`);
}

async function wireViewerFollows(createdIds: string[]) {
  const emails = [...new Set([process.env.INVESTOR_VIEWER_EMAIL, process.env.LOCAL_DEV_USER_EMAIL, "dev@surna.local"].filter(Boolean))] as string[];
  for (const email of emails) {
    const existing = await db.execute<{ id: string }>(sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`);
    const viewerId = (existing.rows[0] as { id: string } | undefined)?.id;
    if (!viewerId) continue;
    console.log(`  Wiring follows for ${email}...`);
    for (const uid of createdIds) {
      if (uid === viewerId) continue;
      await db.execute(
        sql`INSERT INTO user_follows (id, follower_id, followed_id) VALUES (${uuid()}, ${viewerId}, ${uid}) ON CONFLICT DO NOTHING`,
      ).catch(() => {});
      await db.execute(
        sql`INSERT INTO user_follows (id, follower_id, followed_id) VALUES (${uuid()}, ${uid}, ${viewerId}) ON CONFLICT DO NOTHING`,
      ).catch(() => {});
    }
  }
}

async function ensureLocalDevUser(createdIds: string[]) {
  await db.insert(users).values({
    id: LOCAL_DEV_ID,
    email: "dev@surna.local",
    firstName: "Local",
    lastName: "Developer",
    username: "localdev",
    displayName: "Local Developer",
    profileImageUrl: portraitAt(0),
    sport: "GAA Football",
    primarySport: "GAA Football",
    bio: "Local development account",
    verified: true,
    emailVerified: true,
  }).onConflictDoNothing();

  for (const uid of createdIds) {
    await db.execute(
      sql`INSERT INTO user_follows (id, follower_id, followed_id) VALUES (${uuid()}, ${LOCAL_DEV_ID}, ${uid}) ON CONFLICT DO NOTHING`,
    ).catch(() => {});
    await db.execute(
      sql`INSERT INTO user_follows (id, follower_id, followed_id) VALUES (${uuid()}, ${uid}, ${LOCAL_DEV_ID}) ON CONFLICT DO NOTHING`,
    ).catch(() => {});
  }

  const notifs = [
    { type: "follow", title: "New follower", message: "Conor Murphy started following you" },
    { type: "like", title: "Post liked", message: "Aoife Kelly liked your match highlight" },
    { type: "event", title: "Event tomorrow", message: "Dublin 7-a-side GAA Blitz starts at 2pm" },
    { type: "challenge", title: "Challenge invite", message: "Sean O'Brien challenged you to a skills duel" },
    { type: "team_invite", title: "Team invite", message: "Join Dublin Gaelic Select for the blitz" },
  ];
  for (let i = 0; i < notifs.length; i++) {
    const n = notifs[i];
    await db.execute(
      sql`INSERT INTO notifications (id, user_id, type, title, message, is_read) VALUES (${uuid()}, ${LOCAL_DEV_ID}, ${n.type}, ${n.title}, ${n.message}, ${i > 2})`,
    ).catch(() => {});
  }
}

export async function runInvestorSeed() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required.");
  }

  console.log("\n✨ SURNA investor demo seed\n");
  await ensureSchemaColumns();
  await cleanupSeedUsers();

  const createdUsers: { id: string; username: string }[] = [];

  console.log("Creating flagship athletes...");
  for (let i = 0; i < INVESTOR_ATHLETES.length; i++) {
    const a = INVESTOR_ATHLETES[i];
    const [user] = await db
      .insert(users)
      .values({
        id: uuid(),
        email: `${a.username}@surna.app`,
        firstName: a.firstName,
        lastName: a.lastName,
        username: a.username,
        displayName: `${a.firstName} ${a.lastName}`,
        profileImageUrl: portraitAt(i),
        bio: a.bio,
        sport: a.sport,
        primarySport: a.sport,
        position: a.position,
        skillLevel: a.skill,
        location: `${a.city}, Ireland`,
        availability: "Evenings & weekends",
        lookingFor: "competitive",
        verified: Boolean(a.verified),
        emailVerified: true,
        profileType: "normal",
        profileJson: {
          profilePathChosenAt: new Date().toISOString(),
          profileSetupCompletedAt: new Date().toISOString(),
          onboardingSkipped: true,
        },
        sportIdentity: { gaaCounty: a.county, primarySport: a.sport, position: a.position },
        clubHistory: `${a.county} county & local club`,
        points: 400 + i * 55,
      })
      .returning({ id: users.id, username: users.username });
    createdUsers.push({ id: user.id, username: user.username! });

    const level = 10 + (i % 12);
    await db.execute(
      sql`INSERT INTO user_levels (id, user_id, level, total_points, points_to_next_level) VALUES (${uuid()}, ${user.id}, ${level}, ${level * 220}, ${(level + 1) * 220})`,
    );
  }

  console.log("Building follow graph...");
  for (let i = 0; i < createdUsers.length; i++) {
    for (let j = 1; j <= 7; j++) {
      const target = createdUsers[(i + j) % createdUsers.length];
      if (target.id === createdUsers[i].id) continue;
      await db.execute(
        sql`INSERT INTO user_follows (id, follower_id, followed_id) VALUES (${uuid()}, ${createdUsers[i].id}, ${target.id}) ON CONFLICT DO NOTHING`,
      ).catch(() => {});
    }
  }

  const createdPlaces: { id: string }[] = [];
  console.log("Creating Irish venues...");
  for (let i = 0; i < INVESTOR_PLACES.length; i++) {
    const p = INVESTOR_PLACES[i];
    const owner = createdUsers[i % createdUsers.length];
    const placeId = uuid();
    const sportsStr = `{${p.sports.join(",")}}`;
    await db.execute(
      sql`INSERT INTO places (id, owner_id, name, category, sports, bio, address, city, state, country, latitude, longitude, amenities, is_verified, average_rating, profile_image_url, cover_image_url) VALUES (${placeId}, ${owner.id}, ${p.name}, ${p.category}, ${sportsStr}::text[], ${p.bio}, ${p.address}, ${p.city}, ${p.city}, 'Ireland', ${p.lat}, ${p.lng}, ${"{parking,showers}"}::text[], true, ${(4.5 + (i % 5) * 0.1).toFixed(2)}, ${pexelsPhoto(VENUE_COVERS[i % VENUE_COVERS.length], 600, 600)}, ${pexelsPhoto(VENUE_COVERS[(i + 2) % VENUE_COVERS.length], 1200, 675)})`,
    );
    createdPlaces.push({ id: placeId });
  }

  const createdTeams: { id: string; captainId: string; memberIds: string[] }[] = [];
  const teamVideoPosts: string[][] = [];

  console.log("Creating teams...");
  for (let i = 0; i < INVESTOR_TEAMS.length; i++) {
    const t = INVESTOR_TEAMS[i];
    const captainIdx = i * 3;
    const captain = createdUsers[captainIdx % createdUsers.length];
    const tid = uuid();
    const slug = t.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const plId = createdPlaces[i % createdPlaces.length]?.id;
    const memberIds: string[] = [captain.id];

    await db.execute(
      sql`INSERT INTO teams (id, name, slug, description, sport, location, captain_id, place_id, logo, cover, verified, rating, rating_count, followers_count, is_public, max_members, current_members) VALUES (${tid}, ${t.name}, ${slug}, ${t.description}, ${t.sport}, ${t.location}, ${captain.id}, ${plId}, ${pexelsPhoto(TEAM_COVERS[i % TEAM_COVERS.length], 400, 400)}, ${pexelsPhoto(TEAM_COVERS[(i + 1) % TEAM_COVERS.length], 1200, 500)}, ${t.verified}, ${(4.6 + (i % 4) * 0.1).toFixed(1)}, ${40 + i * 8}, ${300 + i * 45}, true, 30, ${t.members})`,
    );
    await db.execute(
      sql`INSERT INTO team_members (id, team_id, user_id, role) VALUES (${uuid()}, ${tid}, ${captain.id}, 'captain')`,
    );

    for (let m = 0; m < Math.min(8, t.members - 1); m++) {
      const member = createdUsers[(captainIdx + m + 1) % createdUsers.length];
      if (member.id === captain.id) continue;
      memberIds.push(member.id);
      await db.execute(
        sql`INSERT INTO team_members (id, team_id, user_id, role) VALUES (${uuid()}, ${tid}, ${member.id}, ${m === 0 ? "co-captain" : "member"}) ON CONFLICT DO NOTHING`,
      ).catch(() => {});
    }

    createdTeams.push({ id: tid, captainId: captain.id, memberIds });
    teamVideoPosts.push([]);
  }

  const allVideoPostIds: string[] = [];
  console.log("Creating feed posts (images + highlight videos)...");
  for (let i = 0; i < INVESTOR_POSTS.length; i++) {
    const p = INVESTOR_POSTS[i];
    const author = createdUsers[i % createdUsers.length];
    const pid = uuid();
    const isVideo = Boolean(p.video);
    const imgUrl = isVideo ? null : actionPhotoAt(i);
    const vidUrl = isVideo ? videoAt(i) : null;
    const likes = 80 + Math.floor(Math.random() * 420);
    const comments = 12 + Math.floor(Math.random() * 48);
    const createdAt = new Date(Date.now() - Math.floor(Math.random() * 72) * 60 * 60 * 1000);
    const tags = `{${p.tags.join(",")}}`;

    await db.execute(
      sql`INSERT INTO posts (id, author_id, content, image_url, video_url, media_type, sport, hashtags, visibility, post_type, likes_count, comments_count, shares_count, created_at) VALUES (${pid}, ${author.id}, ${p.content}, ${imgUrl}, ${vidUrl}, ${isVideo ? "video" : "image"}, ${p.sport}, ${tags}::text[], 'public', ${isVideo ? "video" : "image"}, ${likes}, ${comments}, ${Math.floor(likes / 6)}, ${createdAt.toISOString()})`,
    );

    if (isVideo) {
      allVideoPostIds.push(pid);
      const teamIdx = i % createdTeams.length;
      teamVideoPosts[teamIdx].push(pid);
    }

    for (let l = 0; l < 8; l++) {
      const liker = createdUsers[(i + l + 2) % createdUsers.length];
      await db.execute(
        sql`INSERT INTO post_likes (id, post_id, user_id) VALUES (${uuid()}, ${pid}, ${liker.id}) ON CONFLICT DO NOTHING`,
      ).catch(() => {});
    }
    for (let c = 0; c < 3; c++) {
      const commenter = createdUsers[(i + c + 4) % createdUsers.length];
      await db.execute(
        sql`INSERT INTO post_comments (id, post_id, author_id, content) VALUES (${uuid()}, ${pid}, ${commenter.id}, ${COMMENTS[(i + c) % COMMENTS.length]})`,
      ).catch(() => {});
    }
  }

  console.log("Setting team highlight reels...");
  for (let i = 0; i < createdTeams.length; i++) {
    const highlights = teamVideoPosts[i].slice(0, 4);
    if (highlights.length === 0) continue;
    const arr = `{${highlights.join(",")}}`;
    await db.execute(sql`UPDATE teams SET featured_highlight_ids = ${arr}::text[] WHERE id = ${createdTeams[i].id}`);
  }

  console.log("Creating stories (photos + autoplay videos)...");
  const expiresAt = new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString();
  let storyCount = 0;
  for (let i = 0; i < createdUsers.length; i++) {
    for (let s = 0; s < 2; s++) {
      const idx = i * 2 + s;
      const isVideo = s === 1;
      const sid = uuid();
      const mediaUrl = isVideo ? videoAt(idx) : actionPhotoAt(idx + 40);
      const thumb = isVideo ? actionPhotoAt(idx + 40) : null;
      await db.execute(
        sql`INSERT INTO stories (id, user_id, owner_type, owner_id, media_url, media_type, thumbnail_url, caption, visibility, view_count, expires_at, duration) VALUES (${sid}, ${createdUsers[i].id}, 'person', ${createdUsers[i].id}, ${mediaUrl}, ${isVideo ? "video" : "image"}, ${thumb}, ${STORY_CAPTIONS[idx % STORY_CAPTIONS.length]}, 'public', ${60 + idx * 4}, ${expiresAt}, ${isVideo ? 15 : 5})`,
      );
      storyCount++;
    }
  }

  console.log("Creating events...");
  for (let i = 0; i < INVESTOR_EVENTS.length; i++) {
    const e = INVESTOR_EVENTS[i];
    const creator = createdUsers[i % createdUsers.length];
    const starts = new Date(Date.now() + e.days * 24 * 60 * 60 * 1000);
    starts.setHours(14 + (i % 3), 0, 0, 0);
    const ends = new Date(starts.getTime() + 3 * 60 * 60 * 1000);
    const eid = uuid();
    await db.execute(
      sql`INSERT INTO events (id, creator_id, organizer_id, title, description, event_type, sport, starts_at, ends_at, start_date, end_date, location, visibility, capacity, is_public, lat, lng) VALUES (${eid}, ${creator.id}, ${creator.id}, ${e.title}, ${e.desc}, 'competition', ${e.sport}, ${starts.toISOString()}, ${ends.toISOString()}, ${starts.toISOString()}, ${ends.toISOString()}, ${e.location}, 'public', ${e.cap}, true, ${e.lat}, ${e.lng})`,
    );
    for (let p = 0; p < 6; p++) {
      await db.execute(
        sql`INSERT INTO event_participants (id, event_id, user_id) VALUES (${uuid()}, ${eid}, ${createdUsers[(i + p) % createdUsers.length].id}) ON CONFLICT DO NOTHING`,
      ).catch(() => {});
    }
  }

  console.log("Creating coaches...");
  for (let i = 0; i < INVESTOR_ATHLETES.length; i++) {
    const a = INVESTOR_ATHLETES[i];
    if (!a.isCoach) continue;
    const persona = buildInvestorCoachPersona(a, i);
    persona.coverImageUrl = actionPhotoAt(i + 100);
    persona.avatarUrl = portraitAt(i);
    persona.media = [
      { id: "m1", type: "image", url: actionPhotoAt(i + 110), title: "Session day" },
      { id: "m2", type: "video", url: videoAt(i), title: "Technique reel" },
    ];
    const row = buildCoachSeedRow(persona, createdUsers[i].id, i);
    await db.execute(
      sql`INSERT INTO coaches (id, user_id, specialties, experience, certifications, hourly_rate, weekly_availability, profile_json, bio, is_verified, is_active) VALUES (${uuid()}, ${createdUsers[i].id}, ${row.specsArr}::text[], ${row.exp}, ${row.certsStr}::text[], ${row.rate}, ${row.weeklyAvail}::jsonb, ${row.profileJson}::jsonb, ${row.coachBio}, ${persona.verified}, true)`,
    );
  }

  console.log("Creating challenges + ELO leaderboard...");
  for (let i = 0; i < INVESTOR_MATCHES.length; i++) {
    const m = INVESTOR_MATCHES[i];
    const creator = createdUsers[i % createdUsers.length];
    const mid = uuid();
    const timeStart = new Date(Date.now() + (i + 1) * 2 * 24 * 60 * 60 * 1000);
    const timeEnd = new Date(timeStart.getTime() + 3 * 60 * 60 * 1000);
    const creatorType = m.type === "teamVsTeam" ? "team" : "user";
    const creatorId = m.type === "teamVsTeam" ? createdTeams[i % createdTeams.length].id : creator.id;
    const opponentId = m.type === "player1v1" ? createdUsers[(i + 3) % createdUsers.length].id : null;
    const opponentType = m.type === "player1v1" ? "user" : m.type === "teamVsTeam" ? "team" : null;
    await db.execute(
      sql`INSERT INTO competitive_matches (id, title, type, sport, creator_type, creator_id, opponent_type, opponent_id, visibility, time_start, time_end, status, reward, capacity) VALUES (${mid}, ${m.title}, ${m.type}, ${m.sport}, ${creatorType}, ${creatorId}, ${opponentType}, ${opponentId}, 'public', ${timeStart.toISOString()}, ${timeEnd.toISOString()}, ${m.status}, 'xp', ${m.type === "open" ? 50 : null})`,
    );
  }

  for (let i = 0; i < Math.min(12, createdUsers.length); i++) {
    const rating = 1680 - i * 35 + Math.floor(Math.random() * 20);
    await db.execute(
      sql`INSERT INTO rating_history (id, entity_type, entity_id, sport, delta, new_rating, created_at) VALUES (${uuid()}, 'user', ${createdUsers[i].id}, ${INVESTOR_ATHLETES[i].sport}, ${12 - i}, ${rating}, ${new Date().toISOString()})`,
    );
  }
  for (let i = 0; i < createdTeams.length; i++) {
    const rating = 1720 - i * 40;
    await db.execute(
      sql`INSERT INTO rating_history (id, entity_type, entity_id, sport, delta, new_rating, created_at) VALUES (${uuid()}, 'team', ${createdTeams[i].id}, ${INVESTOR_TEAMS[i].sport}, ${8 - i}, ${rating}, ${new Date().toISOString()})`,
    );
  }

  console.log("Creating DMs + notifications...");
  const dmSnippets = [
    "You in for the blitz Sunday?",
    "That highlight reel was insane 🔥",
    "Sent you the pin for training 📍",
    "County final tickets sorted?",
    "Rematch after the final?",
  ];
  for (let i = 0; i < 24; i++) {
    const sender = createdUsers[i % createdUsers.length];
    const receiver = createdUsers[(i + 5) % createdUsers.length];
    if (sender.id === receiver.id) continue;
    await db.execute(
      sql`INSERT INTO messages (id, sender_id, receiver_id, content, message_type, is_read) VALUES (${uuid()}, ${sender.id}, ${receiver.id}, ${dmSnippets[i % dmSnippets.length]}, 'text', ${Math.random() > 0.35})`,
    ).catch(() => {});
  }

  const createdIds = createdUsers.map((u) => u.id);
  await ensureLocalDevUser(createdIds);
  await wireViewerFollows(createdIds);

  console.log("\n✅ Investor demo ready!");
  console.log(`   ${createdUsers.length} athletes (@surna.app)`);
  console.log(`   ${INVESTOR_POSTS.length} feed posts (${allVideoPostIds.length} videos)`);
  console.log(`   ${storyCount} stories (50% video)`);
  console.log(`   ${INVESTOR_TEAMS.length} teams with highlight reels`);
  console.log(`   ${INVESTOR_PLACES.length} venues · ${INVESTOR_EVENTS.length} events`);
  console.log(`   ${INVESTOR_MATCHES.length} challenges + ELO leaderboard`);
  console.log("\n   Tip: set INVESTOR_VIEWER_EMAIL to your login email before seeding so your feed & stories are full.");
}

async function main() {
  await runInvestorSeed();
  console.log("\nRunning marketplace seed...");
  const { spawnSync } = await import("node:child_process");
  spawnSync("npx", ["tsx", "scripts/seed-marketplace.ts"], { stdio: "inherit", shell: true });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Investor seed failed:", err);
    process.exit(1);
  });
