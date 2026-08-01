import { sql, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { teamMembers, teams, users } from "@shared/schema";
import {
  DEFAULT_TOURNAMENT_SETTINGS,
  tournamentSportsAlign,
  type TournamentSettings,
} from "@shared/tournamentSport";
import {
  getUserEntitlement,
  isActiveProUserEntitlement,
  isProEntitlementOpenAccess,
} from "../infrastructure/proEntitlements";
import { getSportConfigByType, sportImpliesWeightClassTracking } from "../lib/sportConfigLookup";
import {
  BOXING_WEIGHT_CLASSES,
  isBoxingWeightClass,
} from "@shared/boxingWeightClasses";

export type TournamentFormat = "league" | "knockout" | "group_knockout";
export type TournamentEntryType = "team" | "individual";
export type TournamentStaffRole = "owner" | "admin" | "operations" | "scorekeeper";

export type TournamentStaffRow = {
  id: string;
  tournamentId: string;
  userId: string;
  role: TournamentStaffRole;
  displayName: string;
  hasPro: boolean;
  addedAt: string;
};

export type TournamentAccess = {
  role: TournamentStaffRole | "owner";
  canSettings: boolean;
  canApprove: boolean;
  canFixtures: boolean;
  canScore: boolean;
  canManageStaff: boolean;
};

export type TournamentRow = {
  id: string;
  name: string;
  sport: string;
  format: TournamentFormat;
  maxTeams: number;
  entryFeeEur: number;
  prizeDescription: string;
  startDate: string;
  endDate: string;
  location: string;
  organizerUserId: string;
  status: string;
  winnerTeamId: string | null;
  winnerTeamName: string | null;
  prizePoolCents: number;
  prizeReleased: boolean;
  createdAt: string;
  settings: TournamentSettings;
  description: string;
  teamId: string | null;
  hostingTeamName: string;
  entryType: TournamentEntryType;
  classChampions: Record<string, { userId: string; displayName: string }>;
};

export type RegistrationRow = {
  id: string;
  tournamentId: string;
  teamId: string;
  teamName: string;
  status: string;
  paymentIntentId: string | null;
  registeredAt: string;
  registeredByUserId: string | null;
  teamGoals: string;
  notes: string;
  contactEmail: string;
};

export type FixtureRow = {
  id: string;
  tournamentId: string;
  round: number;
  groupName: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  scheduledAt: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  isFinal: boolean;
  weightClass: string | null;
  homeUserId: string | null;
  awayUserId: string | null;
};

export type EntrantRow = {
  id: string;
  tournamentId: string;
  userId: string;
  displayName: string;
  weightClass: string;
  status: string;
  registeredAt: string;
};

let tablesReady: Promise<void> | null = null;

function parseSettings(raw: unknown): TournamentSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_TOURNAMENT_SETTINGS };
  const o = raw as Partial<TournamentSettings>;
  return {
    autoApprove: o.autoApprove ?? DEFAULT_TOURNAMENT_SETTINGS.autoApprove,
    captainOnly: o.captainOnly ?? DEFAULT_TOURNAMENT_SETTINGS.captainOnly,
    minMembers: o.minMembers ?? DEFAULT_TOURNAMENT_SETTINGS.minMembers,
    requirements: o.requirements ?? "",
    welcomeMessage: o.welcomeMessage ?? "",
    collectTeamGoals: o.collectTeamGoals ?? DEFAULT_TOURNAMENT_SETTINGS.collectTeamGoals,
  };
}

export async function ensureTournamentTables() {
  if (!tablesReady) {
    tablesReady = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS pro_tournaments (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR NOT NULL,
          sport VARCHAR NOT NULL,
          format VARCHAR NOT NULL,
          max_teams INTEGER NOT NULL,
          entry_fee_eur NUMERIC(10,2) NOT NULL DEFAULT 0,
          prize_description TEXT,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          location VARCHAR,
          organizer_user_id VARCHAR NOT NULL,
          status VARCHAR NOT NULL DEFAULT 'registration',
          winner_team_id VARCHAR,
          winner_team_name VARCHAR,
          prize_pool_cents INTEGER NOT NULL DEFAULT 0,
          prize_released BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP DEFAULT now()
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS pro_tournament_registrations (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          tournament_id VARCHAR NOT NULL REFERENCES pro_tournaments(id) ON DELETE CASCADE,
          team_id VARCHAR NOT NULL,
          team_name VARCHAR NOT NULL,
          status VARCHAR NOT NULL DEFAULT 'pending',
          payment_intent_id VARCHAR,
          registered_at TIMESTAMP DEFAULT now(),
          UNIQUE(tournament_id, team_id)
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS pro_tournament_fixtures (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          tournament_id VARCHAR NOT NULL REFERENCES pro_tournaments(id) ON DELETE CASCADE,
          round INTEGER NOT NULL DEFAULT 1,
          group_name VARCHAR,
          home_team_id VARCHAR,
          away_team_id VARCHAR,
          home_team_name VARCHAR NOT NULL,
          away_team_name VARCHAR NOT NULL,
          scheduled_at TIMESTAMP NOT NULL,
          home_score INTEGER,
          away_score INTEGER,
          status VARCHAR NOT NULL DEFAULT 'scheduled',
          is_final BOOLEAN NOT NULL DEFAULT false
        );
      `);
      await db.execute(sql`
        ALTER TABLE pro_tournament_fixtures
        ADD COLUMN IF NOT EXISTS competitive_match_id VARCHAR
      `);
      await db.execute(sql`
        DO $$
        BEGIN
          ALTER TABLE pro_tournament_fixtures
            ADD CONSTRAINT pro_tournament_fixtures_competitive_match_id_fkey
            FOREIGN KEY (competitive_match_id)
            REFERENCES competitive_matches(id)
            ON DELETE SET NULL;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS pro_tournament_fixtures_competitive_match_id_idx
        ON pro_tournament_fixtures(competitive_match_id)
      `);
      await db.execute(sql`
        ALTER TABLE pro_tournaments
        ADD COLUMN IF NOT EXISTS entry_type VARCHAR NOT NULL DEFAULT 'team'
      `);
      await db.execute(sql`
        ALTER TABLE pro_tournaments
        ADD COLUMN IF NOT EXISTS class_champions_json JSONB NOT NULL DEFAULT '{}'::jsonb
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS pro_tournament_entrants (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          tournament_id VARCHAR NOT NULL REFERENCES pro_tournaments(id) ON DELETE CASCADE,
          user_id VARCHAR NOT NULL,
          display_name VARCHAR NOT NULL,
          weight_class VARCHAR NOT NULL,
          status VARCHAR NOT NULL DEFAULT 'pending',
          registered_at TIMESTAMP DEFAULT now(),
          UNIQUE (tournament_id, user_id)
        )
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS pro_tournament_entrants_tournament_idx
        ON pro_tournament_entrants(tournament_id)
      `);
      await db.execute(sql`
        ALTER TABLE pro_tournament_fixtures
        ADD COLUMN IF NOT EXISTS weight_class VARCHAR
      `);
      await db.execute(sql`
        ALTER TABLE pro_tournament_fixtures
        ADD COLUMN IF NOT EXISTS home_user_id VARCHAR
      `);
      await db.execute(sql`
        ALTER TABLE pro_tournament_fixtures
        ADD COLUMN IF NOT EXISTS away_user_id VARCHAR
      `);
      await db.execute(sql`ALTER TABLE pro_tournaments ADD COLUMN IF NOT EXISTS settings_json JSONB DEFAULT '{}'::jsonb`);
      await db.execute(sql`ALTER TABLE pro_tournaments ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''`);
      await db.execute(sql`ALTER TABLE pro_tournament_registrations ADD COLUMN IF NOT EXISTS registered_by_user_id VARCHAR`);
      await db.execute(sql`ALTER TABLE pro_tournament_registrations ADD COLUMN IF NOT EXISTS team_goals TEXT DEFAULT ''`);
      await db.execute(sql`ALTER TABLE pro_tournament_registrations ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT ''`);
      await db.execute(sql`ALTER TABLE pro_tournament_registrations ADD COLUMN IF NOT EXISTS contact_email VARCHAR DEFAULT ''`);
      await db.execute(sql`ALTER TABLE pro_tournaments ADD COLUMN IF NOT EXISTS team_id VARCHAR`);
      await db.execute(sql`ALTER TABLE pro_tournaments ADD COLUMN IF NOT EXISTS hosting_team_name VARCHAR DEFAULT ''`);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS pro_tournament_staff (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          tournament_id VARCHAR NOT NULL REFERENCES pro_tournaments(id) ON DELETE CASCADE,
          user_id VARCHAR NOT NULL,
          role VARCHAR NOT NULL DEFAULT 'operations',
          display_name VARCHAR,
          added_at TIMESTAMP DEFAULT now(),
          UNIQUE(tournament_id, user_id)
        );
      `);
    })();
  }
  return tablesReady;
}

function mapTournament(row: any): TournamentRow {
  return {
    id: row.id,
    name: row.name,
    sport: row.sport,
    format: row.format,
    maxTeams: Number(row.max_teams),
    entryFeeEur: Number(row.entry_fee_eur),
    prizeDescription: row.prize_description || "",
    startDate: row.start_date,
    endDate: row.end_date,
    location: row.location || "",
    organizerUserId: row.organizer_user_id,
    status: row.status,
    winnerTeamId: row.winner_team_id,
    winnerTeamName: row.winner_team_name,
    prizePoolCents: Number(row.prize_pool_cents || 0),
    prizeReleased: !!row.prize_released,
    createdAt: row.created_at,
    settings: parseSettings(row.settings_json),
    description: row.description || "",
    teamId: row.team_id ?? null,
    hostingTeamName: row.hosting_team_name || "",
    entryType: (row.entry_type === "individual" ? "individual" : "team") as TournamentEntryType,
    classChampions: (() => {
      const raw = row.class_champions_json;
      if (!raw) return {};
      if (typeof raw === "string") {
        try {
          return JSON.parse(raw) as Record<string, { userId: string; displayName: string }>;
        } catch {
          return {};
        }
      }
      return typeof raw === "object"
        ? (raw as Record<string, { userId: string; displayName: string }>)
        : {};
    })(),
  };
}

export async function userHasPro(userId: string): Promise<boolean> {
  if (isProEntitlementOpenAccess()) return true;
  const ent = await getUserEntitlement(userId);
  return isActiveProUserEntitlement(ent);
}

function accessFromRole(role: TournamentStaffRole | "owner"): TournamentAccess {
  if (role === "owner" || role === "admin") {
    return {
      role,
      canSettings: true,
      canApprove: true,
      canFixtures: true,
      canScore: true,
      canManageStaff: role === "owner" || role === "admin",
    };
  }
  if (role === "operations") {
    return {
      role,
      canSettings: false,
      canApprove: true,
      canFixtures: true,
      canScore: true,
      canManageStaff: false,
    };
  }
  return {
    role: "scorekeeper",
    canSettings: false,
    canApprove: false,
    canFixtures: false,
    canScore: true,
    canManageStaff: false,
  };
}

export async function getTournamentAccess(userId: string, tournamentId: string): Promise<TournamentAccess | null> {
  const t = await getTournament(tournamentId);
  if (!t) return null;
  if (t.organizerUserId === userId) return accessFromRole("owner");
  const staff = await getTournamentStaff(tournamentId);
  const row = staff.find((s) => s.userId === userId);
  if (!row) return null;
  return accessFromRole(row.role);
}

export async function assertTournamentAccess(
  userId: string,
  tournamentId: string,
  need: keyof Omit<TournamentAccess, "role">,
): Promise<TournamentAccess> {
  const access = await getTournamentAccess(userId, tournamentId);
  if (!access || !access[need]) {
    throw new Error("You do not have permission for this action");
  }
  return access;
}

export async function getTournamentStaff(tournamentId: string): Promise<TournamentStaffRow[]> {
  await ensureTournamentTables();
  const result = await db.execute(sql`
    SELECT * FROM pro_tournament_staff
    WHERE tournament_id = ${tournamentId}
    ORDER BY added_at ASC
  `);
  const rows = await Promise.all(
    result.rows.map(async (row: any) => ({
      id: row.id,
      tournamentId: row.tournament_id,
      userId: row.user_id,
      role: row.role as TournamentStaffRole,
      displayName: row.display_name || "Staff",
      hasPro: await userHasPro(row.user_id),
      addedAt: row.added_at,
    })),
  );
  return rows;
}

export async function addTournamentStaff(
  tournamentId: string,
  userId: string,
  role: TournamentStaffRole,
  displayName: string,
  addedByUserId: string,
): Promise<TournamentStaffRow> {
  await ensureTournamentTables();
  await assertTournamentAccess(addedByUserId, tournamentId, "canManageStaff");
  if (role === "owner") throw new Error("Cannot assign owner role");
  const t = await getTournament(tournamentId);
  if (!t?.teamId) throw new Error("Link a hosting team before adding co-managers");
  if (!(await isUserOnTeam(userId, t.teamId))) {
    throw new Error("Co-managers must be members of the hosting team");
  }
  if (!(await userHasPro(userId))) {
    throw new Error("Co-managers must have an active Pro subscription");
  }
  const result = await db.execute(sql`
    INSERT INTO pro_tournament_staff (tournament_id, user_id, role, display_name)
    VALUES (${tournamentId}, ${userId}, ${role}, ${displayName})
    ON CONFLICT (tournament_id, user_id) DO UPDATE SET
      role = EXCLUDED.role,
      display_name = EXCLUDED.display_name
    RETURNING *
  `);
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("Failed to add tournament staff");
  return {
    id: String(row.id),
    tournamentId: String(row.tournament_id),
    userId: String(row.user_id),
    role: String(row.role) as TournamentStaffRole,
    displayName: String(row.display_name || displayName),
    hasPro: true,
    addedAt: String(row.added_at ?? new Date().toISOString()),
  };
}

export async function removeTournamentStaff(
  tournamentId: string,
  staffId: string,
  actorUserId: string,
): Promise<void> {
  await assertTournamentAccess(actorUserId, tournamentId, "canManageStaff");
  const [row] = (
    await db.execute(sql`SELECT role FROM pro_tournament_staff WHERE id = ${staffId} AND tournament_id = ${tournamentId}`)
  ).rows;
  if (row?.role === "owner") throw new Error("Cannot remove the tournament owner");
  await db.execute(sql`DELETE FROM pro_tournament_staff WHERE id = ${staffId} AND tournament_id = ${tournamentId}`);
}

export async function seedTournamentStaff(
  tournamentId: string,
  organizerUserId: string,
  organizerName: string,
  staff: Array<{ userId: string; role: TournamentStaffRole; displayName: string }>,
): Promise<void> {
  await ensureTournamentTables();
  for (const s of staff) {
    if (s.userId === organizerUserId) continue;
    if (!(await userHasPro(s.userId))) continue;
    await db.execute(sql`
      INSERT INTO pro_tournament_staff (tournament_id, user_id, role, display_name)
      VALUES (${tournamentId}, ${s.userId}, ${s.role}, ${s.displayName})
      ON CONFLICT (tournament_id, user_id) DO NOTHING
    `);
  }
  await db.execute(sql`
    INSERT INTO pro_tournament_staff (tournament_id, user_id, role, display_name)
    VALUES (${tournamentId}, ${organizerUserId}, 'owner', ${organizerName})
    ON CONFLICT (tournament_id, user_id) DO UPDATE SET role = 'owner'
  `);
}

export async function listEligibleCoManagers(teamId: string): Promise<
  Array<{ userId: string; displayName: string; role: string; hasPro: boolean; isCaptain: boolean }>
> {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) return [];

  const idSet = new Map<string, { displayName: string; role: string; isCaptain: boolean }>();
  if (team.captainId) {
    const [cap] = await db
      .select({ id: users.id, displayName: users.displayName, username: users.username })
      .from(users)
      .where(eq(users.id, team.captainId));
    idSet.set(team.captainId, {
      displayName: cap?.displayName || cap?.username || "Captain",
      role: "Captain",
      isCaptain: true,
    });
  }

  const proStaff = await storage.getProStaff(teamId);
  for (const s of proStaff) {
    const uid = s.userId || s.user?.id;
    if (!uid) continue;
    idSet.set(uid, {
      displayName: s.user?.displayName || s.user?.username || s.title || "Staff",
      role: s.staffType || s.title || "Staff",
      isCaptain: uid === team.captainId,
    });
  }

  const members = await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
  for (const m of members) {
    if (idSet.has(m.userId)) continue;
    const [u] = await db
      .select({ id: users.id, displayName: users.displayName, username: users.username })
      .from(users)
      .where(eq(users.id, m.userId));
    idSet.set(m.userId, {
      displayName: u?.displayName || u?.username || "Member",
      role: m.role || "Member",
      isCaptain: m.userId === team.captainId,
    });
  }

  const out: Array<{ userId: string; displayName: string; role: string; isCaptain: boolean; hasPro: boolean }> = [];
  for (const [userId, meta] of idSet) {
    out.push({
      userId,
      displayName: meta.displayName,
      role: meta.role,
      isCaptain: meta.isCaptain,
      hasPro: await userHasPro(userId),
    });
  }
  return out.sort((a, b) => Number(b.isCaptain) - Number(a.isCaptain));
}

export async function isUserOnTeam(userId: string, teamId: string): Promise<boolean> {
  const eligible = await listEligibleCoManagers(teamId);
  return eligible.some((m) => m.userId === userId);
}

export async function assertUserOnTeam(userId: string, teamId: string): Promise<void> {
  if (!(await isUserOnTeam(userId, teamId))) {
    throw new Error("User must be a member of the hosting team");
  }
}

/** Backfill owner row for tournaments created before staff table existed. */
export async function ensureOrganizerStaffRecord(tournamentId: string): Promise<void> {
  const t = await getTournament(tournamentId);
  if (!t) return;
  const staff = await getTournamentStaff(tournamentId);
  if (staff.some((s) => s.userId === t.organizerUserId)) return;

  const [organizer] = await db
    .select({ displayName: users.displayName, username: users.username })
    .from(users)
    .where(eq(users.id, t.organizerUserId));
  const organizerName = organizer?.displayName || organizer?.username || "Organizer";
  await seedTournamentStaff(tournamentId, t.organizerUserId, organizerName, []);
}

function mapRegistration(row: any): RegistrationRow {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    teamId: row.team_id,
    teamName: row.team_name,
    status: row.status,
    paymentIntentId: row.payment_intent_id,
    registeredAt: row.registered_at,
    registeredByUserId: row.registered_by_user_id ?? null,
    teamGoals: row.team_goals || "",
    notes: row.notes || "",
    contactEmail: row.contact_email || "",
  };
}

function mapFixture(row: any): FixtureRow {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    round: Number(row.round),
    groupName: row.group_name,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    homeTeamName: row.home_team_name,
    awayTeamName: row.away_team_name,
    scheduledAt: row.scheduled_at,
    homeScore: row.home_score != null ? Number(row.home_score) : null,
    awayScore: row.away_score != null ? Number(row.away_score) : null,
    status: row.status,
    isFinal: !!row.is_final,
    weightClass: row.weight_class ?? null,
    homeUserId: row.home_user_id ?? null,
    awayUserId: row.away_user_id ?? null,
  };
}

export function isApprovedRegistration(status: string): boolean {
  return status === "approved" || status === "paid";
}

export async function createTournament(data: {
  name: string;
  sport: string;
  format: TournamentFormat;
  maxTeams: number;
  entryFeeEur: number;
  prizeDescription: string;
  startDate: string;
  endDate: string;
  location: string;
  organizerUserId: string;
  organizerName?: string;
  description?: string;
  settings?: Partial<TournamentSettings>;
  teamId?: string | null;
  hostingTeamName?: string;
  coManagers?: Array<{ userId: string; role: TournamentStaffRole; displayName: string }>;
  entryType?: TournamentEntryType;
}): Promise<TournamentRow> {
  await ensureTournamentTables();
  const settings = { ...DEFAULT_TOURNAMENT_SETTINGS, ...(data.settings || {}) };
  const entryType: TournamentEntryType = data.entryType === "individual" ? "individual" : "team";

  if (entryType === "individual" && data.format !== "knockout") {
    throw new Error("Individual (weight-class) tournaments must use knockout format");
  }

  if (data.teamId) {
    await assertUserOnTeam(data.organizerUserId, data.teamId);
  }

  const validatedCoManagers: Array<{ userId: string; role: TournamentStaffRole; displayName: string }> = [];
  for (const cm of data.coManagers || []) {
    if (cm.userId === data.organizerUserId) continue;
    if (cm.role === "owner") continue;
    if (data.teamId && !(await isUserOnTeam(cm.userId, data.teamId))) continue;
    if (!(await userHasPro(cm.userId))) continue;
    validatedCoManagers.push(cm);
  }

  const result = await db.execute(sql`
    INSERT INTO pro_tournaments (
      name, sport, format, max_teams, entry_fee_eur, prize_description,
      start_date, end_date, location, organizer_user_id, description, settings_json,
      team_id, hosting_team_name, entry_type
    ) VALUES (
      ${data.name}, ${data.sport}, ${data.format}, ${data.maxTeams},
      ${data.entryFeeEur}, ${data.prizeDescription},
      ${data.startDate}::date, ${data.endDate}::date,
      ${data.location}, ${data.organizerUserId},
      ${data.description || ""},
      ${JSON.stringify(settings)}::jsonb,
      ${data.teamId || null},
      ${data.hostingTeamName || ""},
      ${entryType}
    )
    RETURNING *
  `);
  const row = mapTournament(result.rows[0]);
  await seedTournamentStaff(
    row.id,
    data.organizerUserId,
    data.organizerName || "Organizer",
    validatedCoManagers,
  );
  return row;
}

export async function updateTournamentSettings(
  tournamentId: string,
  patch: Partial<TournamentSettings> & { description?: string },
): Promise<TournamentRow | null> {
  await ensureTournamentTables();
  const t = await getTournament(tournamentId);
  if (!t) return null;
  const settings = { ...t.settings, ...patch };
  const description = patch.description ?? t.description;
  const result = await db.execute(sql`
    UPDATE pro_tournaments
    SET settings_json = ${JSON.stringify(settings)}::jsonb,
        description = ${description}
    WHERE id = ${tournamentId}
    RETURNING *
  `);
  return result.rows[0] ? mapTournament(result.rows[0]) : null;
}

export async function listTournaments(organizerUserId?: string): Promise<TournamentRow[]> {
  await ensureTournamentTables();
  const result = organizerUserId
    ? await db.execute(sql`
        SELECT t.* FROM pro_tournaments t
        WHERE t.organizer_user_id = ${organizerUserId}
           OR EXISTS (
             SELECT 1 FROM pro_tournament_staff s
             WHERE s.tournament_id = t.id AND s.user_id = ${organizerUserId}
           )
        ORDER BY t.created_at DESC
      `)
    : await db.execute(sql`
        SELECT * FROM pro_tournaments ORDER BY start_date DESC LIMIT 100
      `);
  return result.rows.map(mapTournament);
}

export async function getTournament(id: string): Promise<TournamentRow | null> {
  await ensureTournamentTables();
  const result = await db.execute(sql`SELECT * FROM pro_tournaments WHERE id = ${id}`);
  return result.rows[0] ? mapTournament(result.rows[0]) : null;
}

export async function getApprovedRegistrations(tournamentId: string): Promise<RegistrationRow[]> {
  await ensureTournamentTables();
  const result = await db.execute(sql`
    SELECT * FROM pro_tournament_registrations
    WHERE tournament_id = ${tournamentId}
      AND status IN ('approved', 'paid')
    ORDER BY registered_at ASC
  `);
  return result.rows.map(mapRegistration);
}

/** Alias used by existing code paths. */
export async function getRegistrations(tournamentId: string): Promise<RegistrationRow[]> {
  return getApprovedRegistrations(tournamentId);
}

export async function getAllRegistrations(tournamentId: string): Promise<RegistrationRow[]> {
  await ensureTournamentTables();
  const result = await db.execute(sql`
    SELECT * FROM pro_tournament_registrations
    WHERE tournament_id = ${tournamentId}
    ORDER BY registered_at ASC
  `);
  return result.rows.map(mapRegistration);
}

export async function assertTeamCaptain(userId: string, teamId: string): Promise<void> {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) throw new Error("Team not found");
  if (team.captainId !== userId) {
    throw new Error("Only the team captain can register for this tournament");
  }
}

export async function validateTeamEligibility(
  tournament: TournamentRow,
  teamId: string,
  userId: string,
): Promise<{ team: typeof teams.$inferSelect }> {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) throw new Error("Team not found");

  if (tournament.settings.captainOnly) {
    await assertTeamCaptain(userId, teamId);
  } else {
    if (team.captainId === userId) {
      return { team };
    }
    const members = await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
    if (!members.some((m) => m.userId === userId)) {
      throw new Error("You must be a member of this team to register");
    }
  }

  if (!tournamentSportsAlign(team.sport || "", tournament.sport)) {
    throw new Error(`This tournament is for ${tournament.sport} teams only. Your team sport is ${team.sport || "unknown"}.`);
  }

  const minMembers = tournament.settings.minMembers || 1;
  const rosterSize = team.currentMembers ?? 0;
  if (rosterSize > 0 && rosterSize < minMembers) {
    throw new Error(`Your team needs at least ${minMembers} members to enter (currently ${rosterSize}).`);
  }

  return { team };
}

export async function registerTeam(
  tournamentId: string,
  teamId: string,
  teamName: string,
  opts: {
    paymentIntentId?: string;
    registeredByUserId: string;
    teamGoals?: string;
    notes?: string;
    contactEmail?: string;
  },
): Promise<RegistrationRow> {
  await ensureTournamentTables();
  const t = await getTournament(tournamentId);
  if (!t) throw new Error("Tournament not found");
  if (t.entryType === "individual") throw new Error("This tournament only accepts individual entrants");
  if (t.status !== "registration") throw new Error("Registration is closed for this tournament");

  await validateTeamEligibility(t, teamId, opts.registeredByUserId);

  const approved = await getApprovedRegistrations(tournamentId);
  const pending = (await getAllRegistrations(tournamentId)).filter((r) => r.status === "pending");
  if (approved.length + pending.length >= t.maxTeams) {
    throw new Error("Tournament is full");
  }
  if (approved.some((r) => r.teamId === teamId) || pending.some((r) => r.teamId === teamId)) {
    throw new Error("Team already registered");
  }

  const feeCents = Math.round(t.entryFeeEur * 100);
  const paid = feeCents <= 0 || !!opts.paymentIntentId;
  let status = "pending";
  if (paid && t.settings.autoApprove) status = "approved";
  else if (paid && !t.settings.autoApprove) status = "pending";
  else if (!paid) status = "pending";

  const result = await db.execute(sql`
    INSERT INTO pro_tournament_registrations (
      tournament_id, team_id, team_name, status, payment_intent_id,
      registered_by_user_id, team_goals, notes, contact_email
    ) VALUES (
      ${tournamentId}, ${teamId}, ${teamName}, ${status},
      ${opts.paymentIntentId || null},
      ${opts.registeredByUserId},
      ${opts.teamGoals || ""},
      ${opts.notes || ""},
      ${opts.contactEmail || ""}
    )
    ON CONFLICT (tournament_id, team_id) DO UPDATE SET
      status = EXCLUDED.status,
      payment_intent_id = COALESCE(EXCLUDED.payment_intent_id, pro_tournament_registrations.payment_intent_id),
      team_goals = EXCLUDED.team_goals,
      notes = EXCLUDED.notes,
      contact_email = EXCLUDED.contact_email
    RETURNING *
  `);

  if (feeCents > 0 && opts.paymentIntentId && status === "approved") {
    await db.execute(sql`
      UPDATE pro_tournaments
      SET prize_pool_cents = prize_pool_cents + ${feeCents}
      WHERE id = ${tournamentId}
    `);
  }

  return mapRegistration(result.rows[0]);
}

export async function setRegistrationStatus(
  tournamentId: string,
  registrationId: string,
  status: "approved" | "rejected",
  actorUserId: string,
): Promise<RegistrationRow> {
  await ensureTournamentTables();
  await assertTournamentAccess(actorUserId, tournamentId, "canApprove");
  const t = await getTournament(tournamentId);
  if (!t) throw new Error("Tournament not found");

  const all = await getAllRegistrations(tournamentId);
  const reg = all.find((r) => r.id === registrationId);
  if (!reg) throw new Error("Registration not found");

  if (status === "approved") {
    const approved = await getApprovedRegistrations(tournamentId);
    if (approved.length >= t.maxTeams) throw new Error("Tournament is full");
    const feeCents = Math.round(t.entryFeeEur * 100);
    if (feeCents > 0 && reg.paymentIntentId) {
      await db.execute(sql`
        UPDATE pro_tournaments
        SET prize_pool_cents = prize_pool_cents + ${feeCents}
        WHERE id = ${tournamentId}
      `);
    }
  }

  const result = await db.execute(sql`
    UPDATE pro_tournament_registrations
    SET status = ${status}
    WHERE id = ${registrationId} AND tournament_id = ${tournamentId}
    RETURNING *
  `);
  return mapRegistration(result.rows[0]);
}

export async function removeRegistration(
  tournamentId: string,
  registrationId: string,
  actorUserId: string,
): Promise<void> {
  await ensureTournamentTables();
  await assertTournamentAccess(actorUserId, tournamentId, "canApprove");
  const t = await getTournament(tournamentId);
  if (!t) throw new Error("Tournament not found");
  await db.execute(sql`
    DELETE FROM pro_tournament_registrations
    WHERE id = ${registrationId} AND tournament_id = ${tournamentId}
  `);
}

export async function getFixtures(tournamentId: string): Promise<FixtureRow[]> {
  await ensureTournamentTables();
  const result = await db.execute(sql`
    SELECT * FROM pro_tournament_fixtures
    WHERE tournament_id = ${tournamentId}
    ORDER BY round ASC, scheduled_at ASC
  `);
  return result.rows.map(mapFixture);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type TeamRef = { teamId: string; teamName: string };

function scheduleBase(tournament: TournamentRow, dayOffset: number, hour: number): string {
  const d = new Date(tournament.startDate);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

async function insertFixture(
  tournamentId: string,
  f: Omit<FixtureRow, "id" | "tournamentId" | "homeScore" | "awayScore" | "status">,
) {
  await db.execute(sql`
    INSERT INTO pro_tournament_fixtures (
      tournament_id, round, group_name, home_team_id, away_team_id,
      home_team_name, away_team_name, scheduled_at, is_final,
      weight_class, home_user_id, away_user_id
    ) VALUES (
      ${tournamentId}, ${f.round}, ${f.groupName}, ${f.homeTeamId}, ${f.awayTeamId},
      ${f.homeTeamName}, ${f.awayTeamName}, ${f.scheduledAt}::timestamptz, ${f.isFinal},
      ${f.weightClass}, ${f.homeUserId}, ${f.awayUserId}
    )
  `);
}

type FighterRef = { userId: string; displayName: string };

/** Knockout pairings for one weight class — even count required (v1, no BYE). */
export function buildWeightClassKnockoutPairings(
  fighters: FighterRef[],
  weightClass: string,
): Array<{
  home: FighterRef;
  away: FighterRef;
  weightClass: string;
  isFinal: boolean;
}> {
  if (fighters.length < 2) {
    throw new Error(`${weightClass}: need at least 2 entrants`);
  }
  if (fighters.length % 2 !== 0) {
    throw new Error(
      `${weightClass}: even number of entrants required (got ${fighters.length}). No byes in v1.`,
    );
  }
  const drawn = shuffle(fighters);
  const isFinal = drawn.length === 2;
  const out: Array<{ home: FighterRef; away: FighterRef; weightClass: string; isFinal: boolean }> = [];
  for (let i = 0; i < drawn.length; i += 2) {
    out.push({
      home: drawn[i],
      away: drawn[i + 1],
      weightClass,
      isFinal,
    });
  }
  return out;
}

export async function getApprovedEntrants(tournamentId: string): Promise<EntrantRow[]> {
  await ensureTournamentTables();
  const result = await db.execute(sql`
    SELECT * FROM pro_tournament_entrants
    WHERE tournament_id = ${tournamentId} AND status IN ('approved', 'paid')
    ORDER BY weight_class, display_name
  `);
  return result.rows.map(mapEntrant);
}

export async function getAllEntrants(tournamentId: string): Promise<EntrantRow[]> {
  await ensureTournamentTables();
  const result = await db.execute(sql`
    SELECT * FROM pro_tournament_entrants
    WHERE tournament_id = ${tournamentId}
    ORDER BY weight_class, display_name
  `);
  return result.rows.map(mapEntrant);
}

function mapEntrant(row: any): EntrantRow {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    userId: row.user_id,
    displayName: row.display_name,
    weightClass: row.weight_class,
    status: row.status,
    registeredAt: row.registered_at,
  };
}

export async function registerEntrant(
  tournamentId: string,
  opts: { userId: string; displayName: string; weightClass: string; autoApprove?: boolean },
): Promise<EntrantRow> {
  await ensureTournamentTables();
  const t = await getTournament(tournamentId);
  if (!t) throw new Error("Tournament not found");
  if (t.entryType !== "individual") throw new Error("This tournament only accepts team registrations");
  if (t.status !== "registration") throw new Error("Registration is closed for this tournament");
  if (!isBoxingWeightClass(opts.weightClass)) {
    throw new Error(`Invalid weight class. Allowed: ${BOXING_WEIGHT_CLASSES.join(", ")}`);
  }

  const all = await getAllEntrants(tournamentId);
  if (all.some((e) => e.userId === opts.userId)) throw new Error("Already registered");
  if (all.filter((e) => e.status === "approved" || e.status === "paid" || e.status === "pending").length >= t.maxTeams) {
    throw new Error("Tournament is full");
  }

  const status = opts.autoApprove || t.settings.autoApprove ? "approved" : "pending";
  const result = await db.execute(sql`
    INSERT INTO pro_tournament_entrants (
      tournament_id, user_id, display_name, weight_class, status
    ) VALUES (
      ${tournamentId}, ${opts.userId}, ${opts.displayName}, ${opts.weightClass}, ${status}
    )
    RETURNING *
  `);
  return mapEntrant(result.rows[0]);
}

export async function setEntrantStatus(
  tournamentId: string,
  entrantId: string,
  status: "approved" | "rejected",
  actorUserId: string,
): Promise<EntrantRow> {
  await assertTournamentAccess(actorUserId, tournamentId, "canApprove");
  const result = await db.execute(sql`
    UPDATE pro_tournament_entrants
    SET status = ${status}
    WHERE id = ${entrantId} AND tournament_id = ${tournamentId}
    RETURNING *
  `);
  if (!result.rows[0]) throw new Error("Entrant not found");
  return mapEntrant(result.rows[0]);
}

export async function generateFixtures(tournamentId: string): Promise<FixtureRow[]> {
  await ensureTournamentTables();
  const tournament = await getTournament(tournamentId);
  if (!tournament) throw new Error("Tournament not found");

  if (tournament.entryType === "individual") {
    return generateIndividualWeightClassFixtures(tournament);
  }

  const regs = await getApprovedRegistrations(tournamentId);
  if (regs.length < 2) throw new Error("Need at least 2 approved teams");

  await db.execute(sql`DELETE FROM pro_tournament_fixtures WHERE tournament_id = ${tournamentId}`);

  const teamsList: TeamRef[] = regs.map((r) => ({ teamId: r.teamId, teamName: r.teamName }));
  const toInsert: Omit<FixtureRow, "id" | "tournamentId" | "homeScore" | "awayScore" | "status">[] = [];
  let slot = 0;

  const blankIndividual = { weightClass: null as string | null, homeUserId: null as string | null, awayUserId: null as string | null };

  if (tournament.format === "knockout") {
    const drawn = shuffle(teamsList);
    const round = 1;
    for (let i = 0; i < drawn.length; i += 2) {
      const home = drawn[i];
      const away = drawn[i + 1];
      if (!away) continue;
      toInsert.push({
        round,
        groupName: null,
        homeTeamId: home.teamId,
        awayTeamId: away.teamId,
        homeTeamName: home.teamName,
        awayTeamName: away.teamName,
        scheduledAt: scheduleBase(tournament, Math.floor(slot / 2), 10 + (slot % 4) * 2),
        isFinal: drawn.length === 2,
        ...blankIndividual,
      });
      slot++;
    }
  } else if (tournament.format === "league") {
    const n = teamsList.length;
    const list = [...teamsList];
    if (n % 2 === 1) list.push({ teamId: "bye", teamName: "BYE" });
    const rounds = list.length - 1;
    const half = list.length / 2;
    for (let r = 0; r < rounds; r++) {
      for (let i = 0; i < half; i++) {
        const home = list[i];
        const away = list[list.length - 1 - i];
        if (home.teamId === "bye" || away.teamId === "bye") continue;
        toInsert.push({
          round: r + 1,
          groupName: null,
          homeTeamId: home.teamId,
          awayTeamId: away.teamId,
          homeTeamName: home.teamName,
          awayTeamName: away.teamName,
          scheduledAt: scheduleBase(tournament, r, 10 + (i % 3) * 2),
          isFinal: false,
          ...blankIndividual,
        });
      }
      const fixed = list.shift()!;
      list.splice(list.length - 1, 0, fixed);
    }
  } else {
    const groupCount = teamsList.length <= 8 ? 2 : 4;
    const perGroup = Math.ceil(teamsList.length / groupCount);
    const groups: TeamRef[][] = [];
    const shuffled = shuffle(teamsList);
    for (let g = 0; g < groupCount; g++) {
      groups.push(shuffled.slice(g * perGroup, (g + 1) * perGroup));
    }
    let round = 1;
    for (let g = 0; g < groups.length; g++) {
      const groupName = String.fromCharCode(65 + g);
      const gt = groups[g];
      for (let i = 0; i < gt.length; i++) {
        for (let j = i + 1; j < gt.length; j++) {
          toInsert.push({
            round,
            groupName,
            homeTeamId: gt[i].teamId,
            awayTeamId: gt[j].teamId,
            homeTeamName: gt[i].teamName,
            awayTeamName: gt[j].teamName,
            scheduledAt: scheduleBase(tournament, round - 1 + g, 10 + ((i + j) % 4) * 2),
            isFinal: false,
            ...blankIndividual,
          });
        }
      }
    }
  }

  for (const f of toInsert) {
    await insertFixture(tournamentId, f);
  }

  await db.execute(sql`
    UPDATE pro_tournaments SET status = 'in_progress' WHERE id = ${tournamentId}
  `);

  return getFixtures(tournamentId);
}

async function generateIndividualWeightClassFixtures(tournament: TournamentRow): Promise<FixtureRow[]> {
  if (tournament.format !== "knockout") {
    throw new Error("Individual / weight-class tournaments use knockout format only in v1");
  }
  const config = await getSportConfigByType(tournament.sport);
  if (!sportImpliesWeightClassTracking(tournament.sport, config)) {
    throw new Error("This sport does not use weight-class brackets");
  }

  const entrants = await getApprovedEntrants(tournament.id);
  if (entrants.length < 2) throw new Error("Need at least 2 approved entrants");

  const byClass = new Map<string, EntrantRow[]>();
  for (const e of entrants) {
    if (!byClass.has(e.weightClass)) byClass.set(e.weightClass, []);
    byClass.get(e.weightClass)!.push(e);
  }

  for (const [wc, list] of byClass) {
    if (list.length % 2 !== 0) {
      throw new Error(
        `${wc}: even number of entrants required (got ${list.length}). No byes in v1.`,
      );
    }
    if (list.length < 2) {
      throw new Error(`${wc}: need at least 2 entrants to open a bracket`);
    }
  }

  await db.execute(sql`DELETE FROM pro_tournament_fixtures WHERE tournament_id = ${tournament.id}`);
  await db.execute(sql`
    UPDATE pro_tournaments SET class_champions_json = '{}'::jsonb WHERE id = ${tournament.id}
  `);

  let slot = 0;
  for (const [wc, list] of [...byClass.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const fighters = list.map((e) => ({ userId: e.userId, displayName: e.displayName }));
    const pairings = buildWeightClassKnockoutPairings(fighters, wc);
    for (const p of pairings) {
      await insertFixture(tournament.id, {
        round: 1,
        groupName: null,
        homeTeamId: null,
        awayTeamId: null,
        homeTeamName: p.home.displayName,
        awayTeamName: p.away.displayName,
        scheduledAt: scheduleBase(tournament, Math.floor(slot / 2), 10 + (slot % 4) * 2),
        isFinal: p.isFinal,
        weightClass: p.weightClass,
        homeUserId: p.home.userId,
        awayUserId: p.away.userId,
      });
      slot++;
    }
  }

  await db.execute(sql`
    UPDATE pro_tournaments SET status = 'in_progress' WHERE id = ${tournament.id}
  `);

  return getFixtures(tournament.id);
}

export type StandingRow = {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
};

export type GroupStandingBlock = {
  groupName: string;
  standings: StandingRow[];
};

function emptyStanding(teamId: string, teamName: string): StandingRow {
  return {
    teamId,
    teamName,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    points: 0,
  };
}

function applyPlayedFixture(home: StandingRow, away: StandingRow, homeScore: number, awayScore: number) {
  home.played++;
  away.played++;
  home.gf += homeScore;
  home.ga += awayScore;
  away.gf += awayScore;
  away.ga += homeScore;
  if (homeScore > awayScore) {
    home.won++;
    home.points += 3;
    away.lost++;
  } else if (homeScore < awayScore) {
    away.won++;
    away.points += 3;
    home.lost++;
  } else {
    home.drawn++;
    away.drawn++;
    home.points++;
    away.points++;
  }
}

function goalDiff(s: StandingRow): number {
  return s.gf - s.ga;
}

/** Head-to-head: return negative if a beat b, positive if b beat a, 0 if draw/missing. */
function headToHeadResult(
  fixtures: FixtureRow[],
  aId: string,
  bId: string,
): number {
  for (const f of fixtures) {
    if (f.homeScore == null || f.awayScore == null) continue;
    if (f.homeTeamId === aId && f.awayTeamId === bId) {
      if (f.homeScore > f.awayScore) return -1;
      if (f.homeScore < f.awayScore) return 1;
      return 0;
    }
    if (f.homeTeamId === bId && f.awayTeamId === aId) {
      if (f.awayScore > f.homeScore) return -1;
      if (f.awayScore < f.homeScore) return 1;
      return 0;
    }
  }
  return 0;
}

/**
 * Tie-break order: points → GD → GF → head-to-head (two-way) → team name.
 */
export function compareStandings(
  a: StandingRow,
  b: StandingRow,
  fixtures: FixtureRow[],
): number {
  if (b.points !== a.points) return b.points - a.points;
  const gd = goalDiff(b) - goalDiff(a);
  if (gd !== 0) return gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  const h2h = headToHeadResult(fixtures, a.teamId, b.teamId);
  if (h2h !== 0) return h2h;
  return a.teamName.localeCompare(b.teamName);
}

export function computeStandings(
  fixtures: FixtureRow[],
  registrations: RegistrationRow[],
): StandingRow[] {
  const map = new Map<string, StandingRow>();
  for (const r of registrations) {
    map.set(r.teamId, emptyStanding(r.teamId, r.teamName));
  }
  for (const f of fixtures) {
    if (f.homeScore == null || f.awayScore == null) continue;
    const home = map.get(f.homeTeamId || "");
    const away = map.get(f.awayTeamId || "");
    if (!home || !away) continue;
    applyPlayedFixture(home, away, f.homeScore, f.awayScore);
  }
  return [...map.values()].sort((a, b) => compareStandings(a, b, fixtures));
}

/** Rank teams within each group_name (group stage only). */
export function computeGroupStandings(
  fixtures: FixtureRow[],
  registrations: RegistrationRow[],
): GroupStandingBlock[] {
  const groupFixtures = fixtures.filter((f) => f.groupName);
  const byGroup = new Map<string, FixtureRow[]>();
  for (const f of groupFixtures) {
    const g = f.groupName!;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(f);
  }

  const teamName = new Map(registrations.map((r) => [r.teamId, r.teamName]));
  const blocks: GroupStandingBlock[] = [];

  for (const [groupName, gFixtures] of [...byGroup.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const ids = new Set<string>();
    for (const f of gFixtures) {
      if (f.homeTeamId) ids.add(f.homeTeamId);
      if (f.awayTeamId) ids.add(f.awayTeamId);
    }
    const map = new Map<string, StandingRow>();
    for (const id of ids) {
      map.set(id, emptyStanding(id, teamName.get(id) || id));
    }
    for (const f of gFixtures) {
      if (f.homeScore == null || f.awayScore == null) continue;
      const home = map.get(f.homeTeamId || "");
      const away = map.get(f.awayTeamId || "");
      if (!home || !away) continue;
      applyPlayedFixture(home, away, f.homeScore, f.awayScore);
    }
    const standings = [...map.values()].sort((a, b) => compareStandings(a, b, gFixtures));
    blocks.push({ groupName, standings });
  }

  return blocks;
}

export function groupFixturesComplete(fixtures: FixtureRow[]): boolean {
  const group = fixtures.filter((f) => f.groupName);
  return group.length > 0 && group.every((f) => f.status === "played");
}

export function knockoutFixturesExist(fixtures: FixtureRow[]): boolean {
  return fixtures.some((f) => !f.groupName);
}

/** Top N per group (default 2). */
export function selectGroupAdvancers(
  blocks: GroupStandingBlock[],
  perGroup = 2,
): { groupName: string; seed: number; team: StandingRow }[] {
  const out: { groupName: string; seed: number; team: StandingRow }[] = [];
  for (const block of blocks) {
    for (let i = 0; i < perGroup && i < block.standings.length; i++) {
      out.push({ groupName: block.groupName, seed: i + 1, team: block.standings[i] });
    }
  }
  return out;
}

type Advancer = { groupName: string; seed: number; team: StandingRow };

/**
 * Cross-group knockout pairing.
 * 2 groups: A1–B2, B1–A2
 * 4 groups: A1–B2, C1–D2, B1–A2, D1–C2
 *   (insert order so auto-advance yields SF: W(A1/B2)–W(C1/D2), W(B1/A2)–W(D1/C2))
 */
export function buildCrossGroupKnockoutPairings(advancers: Advancer[]): [Advancer, Advancer][] {
  const groups = [...new Set(advancers.map((a) => a.groupName))].sort();
  if (groups.length < 2) throw new Error("Need at least 2 groups to build knockout");
  if (groups.length % 2 !== 0) {
    throw new Error("Knockout pairing expects an even number of groups (2 or 4)");
  }

  const byKey = new Map(advancers.map((a) => [`${a.groupName}:${a.seed}`, a]));
  const need = (g: string, seed: number) => {
    const hit = byKey.get(`${g}:${seed}`);
    if (!hit) throw new Error(`Missing advancer ${g}${seed}`);
    return hit;
  };

  const firstHalf: [Advancer, Advancer][] = [];
  const secondHalf: [Advancer, Advancer][] = [];
  for (let i = 0; i < groups.length; i += 2) {
    const g = groups[i];
    const h = groups[i + 1];
    firstHalf.push([need(g, 1), need(h, 2)]);
    secondHalf.push([need(h, 1), need(g, 2)]);
  }
  return [...firstHalf, ...secondHalf];
}

export async function generateKnockoutFromGroups(tournamentId: string): Promise<{
  fixtures: FixtureRow[];
  groupStandings: GroupStandingBlock[];
  advancers: Advancer[];
}> {
  await ensureTournamentTables();
  const tournament = await getTournament(tournamentId);
  if (!tournament) throw new Error("Tournament not found");
  if (tournament.format !== "group_knockout") {
    throw new Error("Generate knockout is only for group_knockout tournaments");
  }

  const fixtures = await getFixtures(tournamentId);
  if (!groupFixturesComplete(fixtures)) {
    throw new Error("Group stage is not complete — finish all group fixtures first");
  }
  if (knockoutFixturesExist(fixtures)) {
    throw new Error("Knockout bracket already exists for this tournament");
  }

  const regs = await getApprovedRegistrations(tournamentId);
  const groupStandings = computeGroupStandings(fixtures, regs);
  const advancers = selectGroupAdvancers(groupStandings, 2);
  if (advancers.length < 4) {
    throw new Error("Need at least 4 advancers (top 2 from each of 2+ groups)");
  }

  const pairings = buildCrossGroupKnockoutPairings(advancers);
  const maxGroupRound = Math.max(...fixtures.filter((f) => f.groupName).map((f) => f.round), 1);
  const knockoutRound = maxGroupRound + 1;
  const isFinal = pairings.length === 1;

  let slot = 0;
  for (const [home, away] of pairings) {
    await insertFixture(tournamentId, {
      round: knockoutRound,
      groupName: null,
      homeTeamId: home.team.teamId,
      awayTeamId: away.team.teamId,
      homeTeamName: home.team.teamName,
      awayTeamName: away.team.teamName,
      scheduledAt: scheduleBase(tournament, knockoutRound + slot, 14 + (slot % 3) * 2),
      isFinal,
      weightClass: null,
      homeUserId: null,
      awayUserId: null,
    });
    slot++;
  }

  return {
    fixtures: await getFixtures(tournamentId),
    groupStandings,
    advancers,
  };
}

async function maybeAdvanceKnockout(tournamentId: string, tournament: TournamentRow): Promise<boolean> {
  if (tournament.format !== "knockout" && tournament.format !== "group_knockout") return false;
  const fixtures = await getFixtures(tournamentId);
  // Pure knockout: all fixtures. Group+knockout: only post-group (group_name null) fixtures.
  const koFixtures =
    tournament.format === "group_knockout" ? fixtures.filter((f) => !f.groupName) : fixtures;
  if (!koFixtures.length) return false;

  const maxRound = Math.max(...koFixtures.map((f) => f.round));
  const roundFixtures = koFixtures.filter((f) => f.round === maxRound);
  if (!roundFixtures.every((f) => f.status === "played")) return false;
  if (roundFixtures.some((f) => f.homeScore === f.awayScore)) return false;

  const winners: TeamRef[] = [];
  for (const f of roundFixtures) {
    if (f.homeScore == null || f.awayScore == null) continue;
    const homeWins = f.homeScore > f.awayScore;
    winners.push({
      teamId: (homeWins ? f.homeTeamId : f.awayTeamId)!,
      teamName: homeWins ? f.homeTeamName : f.awayTeamName,
    });
  }

  if (winners.length === 1) {
    await db.execute(sql`
      UPDATE pro_tournaments
      SET status = 'completed', winner_team_id = ${winners[0].teamId}, winner_team_name = ${winners[0].teamName}
      WHERE id = ${tournamentId}
    `);
    return true;
  }

  if (winners.length < 2) return false;

  const nextRound = maxRound + 1;
  const isFinal = winners.length === 2;
  let slot = 0;
  for (let i = 0; i < winners.length; i += 2) {
    const home = winners[i];
    const away = winners[i + 1];
    if (!away) continue;
    await insertFixture(tournamentId, {
      round: nextRound,
      groupName: null,
      homeTeamId: home.teamId,
      awayTeamId: away.teamId,
      homeTeamName: home.teamName,
      awayTeamName: away.teamName,
      scheduledAt: scheduleBase(tournament, nextRound + slot, 14 + (slot % 3) * 2),
      isFinal,
      weightClass: null,
      homeUserId: null,
      awayUserId: null,
    });
    slot++;
  }
  return false;
}

/** Advance one weight-class bracket; complete tournament when every class has a champion. */
async function maybeAdvanceWeightClassBracket(
  tournamentId: string,
  tournament: TournamentRow,
  weightClass: string,
): Promise<boolean> {
  const fixtures = await getFixtures(tournamentId);
  const classFixtures = fixtures.filter((f) => f.weightClass === weightClass);
  if (!classFixtures.length) return false;

  const maxRound = Math.max(...classFixtures.map((f) => f.round));
  const roundFixtures = classFixtures.filter((f) => f.round === maxRound);
  if (!roundFixtures.every((f) => f.status === "played")) return false;
  if (roundFixtures.some((f) => f.homeScore === f.awayScore)) return false;

  const winners: FighterRef[] = [];
  for (const f of roundFixtures) {
    if (f.homeScore == null || f.awayScore == null) continue;
    const homeWins = f.homeScore > f.awayScore;
    winners.push({
      userId: (homeWins ? f.homeUserId : f.awayUserId)!,
      displayName: homeWins ? f.homeTeamName : f.awayTeamName,
    });
  }

  if (winners.length === 1) {
    const champ = winners[0];
    const champions = { ...tournament.classChampions, [weightClass]: { userId: champ.userId, displayName: champ.displayName } };
    await db.execute(sql`
      UPDATE pro_tournaments
      SET class_champions_json = ${JSON.stringify(champions)}::jsonb
      WHERE id = ${tournamentId}
    `);

    const allClasses = [...new Set(fixtures.map((f) => f.weightClass).filter(Boolean))] as string[];
    const allDone = allClasses.every((wc) => champions[wc]);
    if (allDone) {
      await db.execute(sql`
        UPDATE pro_tournaments
        SET status = 'completed',
            winner_team_name = ${`Champions: ${allClasses.map((c) => champions[c].displayName).join(", ")}`}
        WHERE id = ${tournamentId}
      `);
      return true;
    }
    return false;
  }

  if (winners.length < 2) return false;

  const nextRound = maxRound + 1;
  const isFinal = winners.length === 2;
  let slot = 0;
  for (let i = 0; i < winners.length; i += 2) {
    const home = winners[i];
    const away = winners[i + 1];
    if (!away) continue;
    await insertFixture(tournamentId, {
      round: nextRound,
      groupName: null,
      homeTeamId: null,
      awayTeamId: null,
      homeTeamName: home.displayName,
      awayTeamName: away.displayName,
      scheduledAt: scheduleBase(tournament, nextRound + slot, 14 + (slot % 3) * 2),
      isFinal,
      weightClass,
      homeUserId: home.userId,
      awayUserId: away.userId,
    });
    slot++;
  }
  return false;
}

export async function updateFixtureScore(
  tournamentId: string,
  fixtureId: string,
  homeScore: number,
  awayScore: number,
): Promise<{ fixture: FixtureRow; tournament: TournamentRow; winnerTriggered: boolean }> {
  await ensureTournamentTables();
  await db.execute(sql`
    UPDATE pro_tournament_fixtures
    SET home_score = ${homeScore}, away_score = ${awayScore}, status = 'played'
    WHERE id = ${fixtureId} AND tournament_id = ${tournamentId}
  `);
  const fixtures = await getFixtures(tournamentId);
  const fixture = fixtures.find((f) => f.id === fixtureId);
  if (!fixture) throw new Error("Fixture not found");
  let tournament = (await getTournament(tournamentId))!;

  let winnerTriggered = false;

  if (tournament.entryType === "individual" && fixture.weightClass) {
    winnerTriggered = await maybeAdvanceWeightClassBracket(
      tournamentId,
      tournament,
      fixture.weightClass,
    );
  } else if (fixture.isFinal && homeScore !== awayScore) {
    const winnerId = homeScore > awayScore ? fixture.homeTeamId : fixture.awayTeamId;
    const winnerName = homeScore > awayScore ? fixture.homeTeamName : fixture.awayTeamName;
    if (winnerId) {
      await db.execute(sql`
        UPDATE pro_tournaments
        SET status = 'completed', winner_team_id = ${winnerId}, winner_team_name = ${winnerName}
        WHERE id = ${tournamentId}
      `);
      winnerTriggered = true;
    }
  } else if (tournament.format === "knockout" || tournament.format === "group_knockout") {
    winnerTriggered = await maybeAdvanceKnockout(tournamentId, tournament);
  } else if (tournament.format === "league") {
    const allPlayed = fixtures.length > 0 && fixtures.every((f) => f.status === "played");
    if (allPlayed && tournament.status !== "completed") {
      const regs = await getApprovedRegistrations(tournamentId);
      const standings = computeStandings(fixtures, regs);
      const top = standings[0];
      if (top) {
        await db.execute(sql`
          UPDATE pro_tournaments
          SET status = 'completed', winner_team_id = ${top.teamId}, winner_team_name = ${top.teamName}
          WHERE id = ${tournamentId} AND winner_team_id IS NULL
        `);
        winnerTriggered = true;
      }
    }
  }

  tournament = (await getTournament(tournamentId))!;

  return {
    fixture: { ...fixture, homeScore, awayScore, status: "played" },
    tournament,
    winnerTriggered,
  };
}

export async function getTeamMemberUserIds(teamId: string): Promise<string[]> {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  const ids = new Set<string>();
  if (team?.captainId) ids.add(team.captainId);
  const members = await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
  for (const m of members) ids.add(m.userId);
  return [...ids];
}

export async function markPrizeReleased(tournamentId: string): Promise<void> {
  await db.execute(sql`
    UPDATE pro_tournaments SET prize_released = true WHERE id = ${tournamentId}
  `);
}

export async function listEligibleTeamsForUser(userId: string, tournamentSport: string) {
  const owned = await db.select().from(teams).where(eq(teams.captainId, userId));
  const memberRows = await db.select({ teamId: teamMembers.teamId }).from(teamMembers).where(eq(teamMembers.userId, userId));
  const idSet = new Set<string>([...owned.map((t) => t.id), ...memberRows.map((m) => m.teamId)]);
  if (idSet.size === 0) return [];
  const allTeams = await db.select().from(teams).where(inArray(teams.id, [...idSet]));
  return allTeams
    .filter((t) => tournamentSportsAlign(t.sport || "", tournamentSport))
    .map((t) => ({
      id: t.id,
      name: t.name,
      sport: t.sport || "",
      members: t.currentMembers ?? 0,
      isCaptain: t.captainId === userId,
    }));
}
