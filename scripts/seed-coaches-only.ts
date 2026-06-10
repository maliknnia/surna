/**
 * Re-seed demo coach accounts with FULL profiles (photos, bio, media, plans).
 * Run: npm run db:seed:coaches
 */
import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";
import { FAKE_COACH_PERSONAS, buildCoachSeedRow } from "./coachSeedPersonas";

function uuid() {
  return crypto.randomUUID();
}

async function main() {
  console.log("Seeding rich fake coach profiles...");
  await db.execute(sql`ALTER TABLE coaches ADD COLUMN IF NOT EXISTS weekly_availability jsonb`);
  await db.execute(sql`ALTER TABLE coaches ADD COLUMN IF NOT EXISTS profile_json jsonb DEFAULT '{}'::jsonb`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_json jsonb DEFAULT '{}'::jsonb`);

  await db.execute(
    sql`DELETE FROM coaches WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`,
  );

  let created = 0;
  for (const persona of FAKE_COACH_PERSONAS) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, `${persona.username}@surna.app`))
      .limit(1);

    if (!user) {
      console.warn(`  Skip ${persona.username} — run npm run db:seed first`);
      continue;
    }

    await db
      .update(users)
      .set({
        profileImageUrl: persona.avatarUrl,
        bio: persona.bio,
        location: persona.location,
        sport: persona.sport,
        primarySport: persona.sport,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    const row = buildCoachSeedRow(persona, user.id, persona.userIndex);
    await db.execute(
      sql`INSERT INTO coaches (id, user_id, specialties, experience, certifications, hourly_rate, weekly_availability, profile_json, bio, is_verified, is_active) VALUES (${uuid()}, ${user.id}, ${row.specsArr}::text[], ${row.exp}, ${row.certsStr}::text[], ${row.rate}, ${row.weeklyAvail}::jsonb, ${row.profileJson}::jsonb, ${row.coachBio}, ${persona.verified}, true)`,
    );
    created++;
    console.log(`  ✓ ${persona.displayName} — photos, ${persona.achievements.length} achievements, ${persona.media.length} media`);
  }

  console.log(`\nDone. ${created} coaches with full profiles. Open /coaches and tap any card.`);
}

main().catch((e) => {
  console.error("Coach seed failed:", e);
  process.exit(1);
});
