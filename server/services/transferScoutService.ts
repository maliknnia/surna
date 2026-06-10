import { sql, eq, and, ilike, ne } from "drizzle-orm";
import { db } from "../db";
import { users, teams, teamMembers, proTeamPlayers, eventParticipants } from "@shared/schema";
import { storage } from "../storage";
import { queueNotification } from "../notifications/pushService";
import {
  calculateMarketValueEur,
  ageFromDateOfBirth,
  type PlayerValuationInput,
} from "../lib/playerMarketValue";

let tablesReady: Promise<void> | null = null;

export async function ensureTransferScoutTables() {
  if (!tablesReady) {
    tablesReady = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS pro_scout_profiles (
          user_id VARCHAR PRIMARY KEY REFERENCES users(id),
          bio TEXT,
          regions VARCHAR,
          verified BOOLEAN NOT NULL DEFAULT false,
          club_affiliations JSONB DEFAULT '[]',
          created_at TIMESTAMP DEFAULT now()
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS pro_transfers (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          offering_team_id VARCHAR NOT NULL,
          target_team_id VARCHAR NOT NULL,
          target_player_user_id VARCHAR NOT NULL,
          amount_eur NUMERIC(12,2) NOT NULL,
          role_offered VARCHAR,
          message TEXT,
          contract_months INTEGER NOT NULL DEFAULT 12,
          status VARCHAR NOT NULL DEFAULT 'pending',
          created_by VARCHAR NOT NULL,
          responded_by VARCHAR,
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now()
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS pro_scout_watchlist (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          scout_user_id VARCHAR NOT NULL,
          player_user_id VARCHAR NOT NULL,
          created_at TIMESTAMP DEFAULT now(),
          UNIQUE(scout_user_id, player_user_id)
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS pro_scout_reports (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          scout_user_id VARCHAR NOT NULL,
          player_user_id VARCHAR NOT NULL,
          overall_rating INTEGER NOT NULL,
          technical_rating INTEGER NOT NULL,
          physical_rating INTEGER NOT NULL,
          tactical_rating INTEGER NOT NULL,
          notes TEXT,
          shared_team_ids JSONB DEFAULT '[]',
          created_at TIMESTAMP DEFAULT now()
        );
      `);
    })();
  }
  return tablesReady;
}

async function notifyUser(userId: string, title: string, body: string, data?: Record<string, unknown>) {
  try {
    await queueNotification({
      userId,
      title,
      body,
      type: "general",
      data,
    });
  } catch (e) {
    console.warn("[transfer/scout] notification failed", userId, e);
  }
}

export async function getPlayerStats(userId: string): Promise<PlayerValuationInput> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return { gamesPlayed: 0, winRate: 50 };

  const [gamesRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(eventParticipants)
    .where(eq(eventParticipants.userId, userId));

  const gamesPlayed = Number(gamesRow?.c ?? 0);
  const seed = userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const winRate = gamesPlayed > 0 ? 45 + (seed % 40) : 40 + (seed % 35);
  const activityScore = 30 + (seed % 70);

  return {
    gamesPlayed,
    winRate,
    skillLevel: user.skillLevel,
    position: user.position,
    age: ageFromDateOfBirth(user.dateOfBirth),
    activityScore,
  };
}

export async function enrichPlayerProfile(userId: string, extra?: Partial<PlayerValuationInput>) {
  const [user] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      username: users.username,
      profileImageUrl: users.profileImageUrl,
      sport: users.sport,
      position: users.position,
      skillLevel: users.skillLevel,
      location: users.location,
      bio: users.bio,
      dateOfBirth: users.dateOfBirth,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) return null;

  const stats = { ...(await getPlayerStats(userId)), ...extra };
  const marketValueEur = calculateMarketValueEur(stats);
  const scoutReports = await getAggregatedScoutRatings(userId);

  return {
    ...user,
    age: stats.age,
    gamesPlayed: stats.gamesPlayed,
    winRate: stats.winRate,
    activityScore: stats.activityScore,
    marketValueEur,
    scoutRatings: scoutReports,
  };
}

export async function searchPlayersForScout(filters: {
  sport?: string;
  position?: string;
  skillLevel?: string;
  location?: string;
  ageMin?: number;
  ageMax?: number;
  excludeUserId?: string;
  limit?: number;
}) {
  await ensureTransferScoutTables();
  const limit = Math.min(filters.limit ?? 40, 100);
  const conditions: any[] = [eq(users.banned, false)];
  if (filters.excludeUserId) conditions.push(ne(users.id, filters.excludeUserId));
  if (filters.sport) conditions.push(ilike(users.sport, `%${filters.sport}%`));
  if (filters.position) conditions.push(ilike(users.position, `%${filters.position}%`));
  if (filters.skillLevel) conditions.push(ilike(users.skillLevel, `%${filters.skillLevel}%`));
  if (filters.location) conditions.push(ilike(users.location, `%${filters.location}%`));

  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      username: users.username,
      profileImageUrl: users.profileImageUrl,
      sport: users.sport,
      position: users.position,
      skillLevel: users.skillLevel,
      location: users.location,
      bio: users.bio,
      dateOfBirth: users.dateOfBirth,
    })
    .from(users)
    .where(and(...conditions))
    .limit(limit);

  const enriched: NonNullable<Awaited<ReturnType<typeof enrichPlayerProfile>>>[] = [];
  for (const row of rows) {
    const age = ageFromDateOfBirth(row.dateOfBirth);
    if (filters.ageMin != null && age != null && age < filters.ageMin) continue;
    if (filters.ageMax != null && age != null && age > filters.ageMax) continue;
    const stats = await getPlayerStats(row.id);
    enriched.push({
      ...row,
      age: stats.age ?? age,
      gamesPlayed: stats.gamesPlayed,
      winRate: stats.winRate,
      activityScore: stats.activityScore,
      marketValueEur: calculateMarketValueEur(stats),
      scoutRatings: await getAggregatedScoutRatings(row.id),
    });
  }
  return enriched;
}

export async function findPlayerCurrentTeamId(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ teamId: proTeamPlayers.teamId })
    .from(proTeamPlayers)
    .where(and(eq(proTeamPlayers.userId, userId), eq(proTeamPlayers.status, "active")))
    .limit(1);
  return row?.teamId ?? null;
}

export async function createTransferOffer(data: {
  offeringTeamId: string;
  targetPlayerUserId: string;
  targetTeamId: string;
  amountEur: number;
  roleOffered?: string;
  message?: string;
  contractMonths: number;
  createdBy: string;
}) {
  await ensureTransferScoutTables();

  const [offeringTeam] = await db.select().from(teams).where(eq(teams.id, data.offeringTeamId));
  const [targetTeam] = await db.select().from(teams).where(eq(teams.id, data.targetTeamId));
  const [player] = await db.select().from(users).where(eq(users.id, data.targetPlayerUserId));
  if (!offeringTeam || !targetTeam || !player) throw new Error("Invalid team or player");

  const result = await db.execute(sql`
    INSERT INTO pro_transfers (
      offering_team_id, target_team_id, target_player_user_id,
      amount_eur, role_offered, message, contract_months, status, created_by
    ) VALUES (
      ${data.offeringTeamId}, ${data.targetTeamId}, ${data.targetPlayerUserId},
      ${data.amountEur}, ${data.roleOffered || null}, ${data.message || null},
      ${data.contractMonths}, 'pending', ${data.createdBy}
    )
    RETURNING *
  `);
  const row = result.rows[0] as any;
  const transferId = row.id;
  const playerName = player.displayName || player.username || "Player";
  const offerLabel = `€${Number(data.amountEur).toLocaleString()} from ${offeringTeam.name}`;

  if (targetTeam.captainId) {
    await notifyUser(
      targetTeam.captainId,
      "Transfer offer received",
      `${offeringTeam.name} bid ${offerLabel} for ${playerName}.`,
      { transferId, type: "transfer_offer" },
    );
  }

  await notifyUser(
    data.targetPlayerUserId,
    "Transfer interest",
    `${offeringTeam.name} made an offer (${offerLabel}). Your club will review it.`,
    { transferId, type: "transfer_offer" },
  );

  return mapTransfer(row, offeringTeam.name, targetTeam.name, playerName);
}

function mapTransfer(row: any, offeringTeamName?: string, targetTeamName?: string, playerName?: string) {
  return {
    id: row.id,
    offeringTeamId: row.offering_team_id,
    targetTeamId: row.target_team_id,
    targetPlayerUserId: row.target_player_user_id,
    amountEur: Number(row.amount_eur),
    roleOffered: row.role_offered,
    message: row.message,
    contractMonths: Number(row.contract_months),
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    offeringTeamName,
    targetTeamName,
    playerName,
    direction: row._direction as "incoming" | "outgoing" | undefined,
  };
}

export async function listTransfers(teamId: string) {
  await ensureTransferScoutTables();
  const incoming = await db.execute(sql`
    SELECT t.*, ot.name AS offering_team_name, tt.name AS target_team_name,
      u.display_name AS player_name
    FROM pro_transfers t
    JOIN teams ot ON ot.id = t.offering_team_id
    JOIN teams tt ON tt.id = t.target_team_id
    LEFT JOIN users u ON u.id = t.target_player_user_id
    WHERE t.target_team_id = ${teamId}
    ORDER BY t.created_at DESC
    LIMIT 50
  `);
  const outgoing = await db.execute(sql`
    SELECT t.*, ot.name AS offering_team_name, tt.name AS target_team_name,
      u.display_name AS player_name
    FROM pro_transfers t
    JOIN teams ot ON ot.id = t.offering_team_id
    JOIN teams tt ON tt.id = t.target_team_id
    LEFT JOIN users u ON u.id = t.target_player_user_id
    WHERE t.offering_team_id = ${teamId}
    ORDER BY t.created_at DESC
    LIMIT 50
  `);

  return {
    incoming: incoming.rows.map((r: any) =>
      mapTransfer(r, r.offering_team_name, r.target_team_name, r.player_name),
    ),
    outgoing: outgoing.rows.map((r: any) =>
      mapTransfer(r, r.offering_team_name, r.target_team_name, r.player_name),
    ),
  };
}

export async function respondToTransfer(
  transferId: string,
  status: "accepted" | "rejected",
  responderUserId: string,
) {
  await ensureTransferScoutTables();
  const result = await db.execute(sql`
    SELECT * FROM pro_transfers WHERE id = ${transferId}
  `);
  const row = result.rows[0] as any;
  if (!row) throw new Error("Transfer not found");
  if (row.status !== "pending") throw new Error("Offer already resolved");

  await db.execute(sql`
    UPDATE pro_transfers
    SET status = ${status}, responded_by = ${responderUserId}, updated_at = now()
    WHERE id = ${transferId}
  `);

  const [offeringTeam] = await db.select().from(teams).where(eq(teams.id, row.offering_team_id));
  const [targetTeam] = await db.select().from(teams).where(eq(teams.id, row.target_team_id));
  const [player] = await db.select().from(users).where(eq(users.id, row.target_player_user_id));
  const playerName = player?.displayName || player?.username || "Player";

  if (status === "accepted") {
    const existing = await db
      .select()
      .from(proTeamPlayers)
      .where(
        and(
          eq(proTeamPlayers.userId, row.target_player_user_id),
          eq(proTeamPlayers.teamId, row.target_team_id),
        ),
      );
    for (const p of existing) {
      await storage.updateProPlayer(p.id, { status: "inactive" });
    }
    await storage.addProPlayer(row.offering_team_id, {
      userId: row.target_player_user_id,
      positions: row.role_offered ? [row.role_offered] : [],
      status: "active",
    });
    try {
      const existingMember = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, row.offering_team_id),
            eq(teamMembers.userId, row.target_player_user_id),
          ),
        );
      if (existingMember.length === 0) {
        await db.insert(teamMembers).values({
          teamId: row.offering_team_id,
          userId: row.target_player_user_id,
          role: "member",
        });
      }
    } catch {
      /* optional team_members row */
    }
  }

  const msg =
    status === "accepted"
      ? `Transfer accepted: ${playerName} joins ${offeringTeam?.name || "new club"}.`
      : `Transfer rejected for ${playerName}.`;

  if (offeringTeam?.captainId) {
    await notifyUser(offeringTeam.captainId, `Transfer ${status}`, msg, { transferId });
  }
  await notifyUser(row.target_player_user_id, `Transfer ${status}`, msg, { transferId });
  if (row.created_by) {
    await notifyUser(row.created_by, `Transfer ${status}`, msg, { transferId });
  }

  return mapTransfer(
    { ...row, status },
    offeringTeam?.name,
    targetTeam?.name,
    playerName,
  );
}

export async function upsertScoutProfile(userId: string, data: { bio?: string; regions?: string }) {
  await ensureTransferScoutTables();
  await db.execute(sql`
    INSERT INTO pro_scout_profiles (user_id, bio, regions, verified)
    VALUES (${userId}, ${data.bio || null}, ${data.regions || null}, false)
    ON CONFLICT (user_id) DO UPDATE SET
      bio = COALESCE(EXCLUDED.bio, pro_scout_profiles.bio),
      regions = COALESCE(EXCLUDED.regions, pro_scout_profiles.regions)
  `);
  return getScoutProfile(userId);
}

export async function getScoutProfile(userId: string) {
  await ensureTransferScoutTables();
  const result = await db.execute(sql`
    SELECT * FROM pro_scout_profiles WHERE user_id = ${userId}
  `);
  const row = result.rows[0] as any;
  if (!row) return null;
  return {
    userId: row.user_id,
    bio: row.bio,
    regions: row.regions,
    verified: !!row.verified,
    clubAffiliations: row.club_affiliations || [],
  };
}

export async function addToWatchlist(scoutUserId: string, playerUserId: string) {
  await ensureTransferScoutTables();
  await db.execute(sql`
    INSERT INTO pro_scout_watchlist (scout_user_id, player_user_id)
    VALUES (${scoutUserId}, ${playerUserId})
    ON CONFLICT (scout_user_id, player_user_id) DO NOTHING
  `);

  const [scout] = await db.select().from(users).where(eq(users.id, scoutUserId));
  await notifyUser(
    playerUserId,
    "You are being scouted",
    `${scout?.displayName || scout?.username || "A verified scout"} added you to their watchlist on SURNA.`,
    { scoutUserId, type: "scout_watch" },
  );

  return { success: true };
}

export async function getWatchlist(scoutUserId: string) {
  await ensureTransferScoutTables();
  const result = await db.execute(sql`
    SELECT w.player_user_id FROM pro_scout_watchlist w
    WHERE w.scout_user_id = ${scoutUserId}
    ORDER BY w.created_at DESC
  `);
  const players: NonNullable<Awaited<ReturnType<typeof enrichPlayerProfile>>>[] = [];
  for (const r of result.rows as any[]) {
    const p = await enrichPlayerProfile(r.player_user_id);
    if (p) players.push(p);
  }
  return players;
}

export async function createScoutReport(data: {
  scoutUserId: string;
  playerUserId: string;
  overallRating: number;
  technicalRating: number;
  physicalRating: number;
  tacticalRating: number;
  notes?: string;
  sharedTeamIds?: string[];
}) {
  await ensureTransferScoutTables();
  const result = await db.execute(sql`
    INSERT INTO pro_scout_reports (
      scout_user_id, player_user_id, overall_rating, technical_rating,
      physical_rating, tactical_rating, notes, shared_team_ids
    ) VALUES (
      ${data.scoutUserId}, ${data.playerUserId},
      ${data.overallRating}, ${data.technicalRating},
      ${data.physicalRating}, ${data.tacticalRating},
      ${data.notes || null}, ${JSON.stringify(data.sharedTeamIds || [])}::jsonb
    )
    RETURNING *
  `);
  return result.rows[0];
}

export async function getAggregatedScoutRatings(playerUserId: string) {
  await ensureTransferScoutTables();
  const result = await db.execute(sql`
    SELECT
      ROUND(AVG(overall_rating)::numeric, 1) AS overall,
      ROUND(AVG(technical_rating)::numeric, 1) AS technical,
      ROUND(AVG(physical_rating)::numeric, 1) AS physical,
      ROUND(AVG(tactical_rating)::numeric, 1) AS tactical,
      COUNT(*)::int AS report_count
    FROM pro_scout_reports
    WHERE player_user_id = ${playerUserId}
  `);
  const r = result.rows[0] as any;
  if (!r || Number(r.report_count) === 0) return null;
  return {
    overall: Number(r.overall),
    technical: Number(r.technical),
    physical: Number(r.physical),
    tactical: Number(r.tactical),
    reportCount: Number(r.report_count),
  };
}

export async function getScoutReportsForPlayer(playerUserId: string, teamId?: string) {
  await ensureTransferScoutTables();
  const rows = await db.execute(sql`
    SELECT r.*, u.display_name AS scout_name
    FROM pro_scout_reports r
    LEFT JOIN users u ON u.id = r.scout_user_id
    WHERE r.player_user_id = ${playerUserId}
    ORDER BY r.created_at DESC
    LIMIT 20
  `);
  return (rows.rows as any[]).map((r) => ({
    id: r.id,
    scoutName: r.scout_name,
    overallRating: r.overall_rating,
    technicalRating: r.technical_rating,
    physicalRating: r.physical_rating,
    tacticalRating: r.tactical_rating,
    notes: r.notes,
    sharedTeamIds: r.shared_team_ids,
    createdAt: r.created_at,
    visibleToClub: !teamId || (Array.isArray(r.shared_team_ids) && r.shared_team_ids.includes(teamId)),
  }));
}
