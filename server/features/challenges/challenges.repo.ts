// server/features/challenges/challenges.repo.ts
import { db } from "../../db";
import { 
  competitiveMatches, 
  matchParticipants, 
  matchResults, 
  ratingHistory,
  users,
  teams
} from "@shared/schema";
import { eq, and, or, desc, asc, gte, lte, sql, type SQL, inArray } from "drizzle-orm";
import type { 
  CompetitiveMatch, 
  InsertCompetitiveMatch,
  MatchParticipant,
  InsertMatchParticipant,
  MatchResult,
  InsertMatchResult,
  RatingHistory,
  InsertRatingHistory 
} from "@shared/schema";

export const challengesRepo = {
  // Match CRUD
  async createMatch(data: InsertCompetitiveMatch): Promise<CompetitiveMatch> {
    const [match] = await db.insert(competitiveMatches).values(data).returning();
    return match;
  },

  async getMatchById(matchId: string): Promise<CompetitiveMatch | undefined> {
    const [match] = await db
      .select()
      .from(competitiveMatches)
      .where(eq(competitiveMatches.id, matchId));
    return match;
  },

  async getMatches(filters: {
    type?: string;
    sport?: string;
    status?: string;
    visibility?: string;
    creatorId?: string;
    userId?: string; // Package #10: filter by participant user
    teamId?: string; // Package #10: filter by participant team
    participantId?: string;
    limit?: number;
  }): Promise<any[]> {
    // Package #10: Join with participants and results for complete match data
    let query = db
      .select({
        match: competitiveMatches,
        result: matchResults,
      })
      .from(competitiveMatches)
      .leftJoin(matchResults, eq(matchResults.matchId, competitiveMatches.id));
    
    const conditions: SQL[] = [];
    
    if (filters.type) {
      conditions.push(eq(competitiveMatches.type, filters.type));
    }
    if (filters.sport) {
      conditions.push(eq(competitiveMatches.sport, filters.sport));
    }
    if (filters.status) {
      const statuses = filters.status.split(",").map((s) => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        conditions.push(eq(competitiveMatches.status, statuses[0]));
      } else if (statuses.length > 1) {
        conditions.push(inArray(competitiveMatches.status, statuses));
      }
    }
    if (filters.visibility) {
      conditions.push(eq(competitiveMatches.visibility, filters.visibility));
    }
    if (filters.creatorId) {
      conditions.push(eq(competitiveMatches.creatorId, filters.creatorId));
    }

    // Package #10: Filter by user or team participation
    if (filters.userId || filters.teamId) {
      const participantConditions: SQL[] = [];
      if (filters.userId) {
        const userClause = and(
          eq(matchParticipants.participantType, 'user'),
          eq(matchParticipants.participantId, filters.userId),
        );
        if (userClause) participantConditions.push(userClause);
      }
      if (filters.teamId) {
        const teamClause = and(
          eq(matchParticipants.participantType, 'team'),
          eq(matchParticipants.participantId, filters.teamId),
        );
        if (teamClause) participantConditions.push(teamClause);
      }

      // Join with participants table and filter
      const participantMatchIds = await db
        .select({ matchId: matchParticipants.matchId })
        .from(matchParticipants)
        .where(or(...participantConditions));

      const matchIds = participantMatchIds.map(p => p.matchId);
      if (matchIds.length > 0) {
        conditions.push(sql`${competitiveMatches.id} IN (${sql.join(matchIds.map(id => sql`${id}`), sql`, `)})`);
      } else {
        // No matches found - return empty array
        return [];
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(competitiveMatches.createdAt)) as any;
    
    if (filters.limit) {
      query = query.limit(filters.limit) as any;
    }

    const results = await query;
    
    // Package #10: Flatten and deduplicate (left join may create duplicates if multiple results exist)
    const matchMap = new Map();
    for (const r of results) {
      if (!matchMap.has(r.match.id)) {
        matchMap.set(r.match.id, {
          ...r.match,
          result: r.result || undefined,
        });
      }
    }
    
    return Array.from(matchMap.values());
  },

  async updateMatch(matchId: string, data: Partial<InsertCompetitiveMatch>): Promise<CompetitiveMatch> {
    const [match] = await db
      .update(competitiveMatches)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(competitiveMatches.id, matchId))
      .returning();
    return match;
  },

  async deleteMatch(matchId: string): Promise<void> {
    await db.delete(competitiveMatches).where(eq(competitiveMatches.id, matchId));
  },

  // Participants
  async addParticipant(data: InsertMatchParticipant): Promise<MatchParticipant> {
    const [participant] = await db.insert(matchParticipants).values(data).returning();
    return participant;
  },

  async getParticipants(matchId: string): Promise<MatchParticipant[]> {
    return db
      .select()
      .from(matchParticipants)
      .where(eq(matchParticipants.matchId, matchId));
  },

  async updateParticipantStatus(
    matchId: string,
    participantId: string,
    status: string
  ): Promise<MatchParticipant> {
    const [participant] = await db
      .update(matchParticipants)
      .set({ status })
      .where(
        and(
          eq(matchParticipants.matchId, matchId),
          eq(matchParticipants.participantId, participantId)
        )
      )
      .returning();
    return participant;
  },

  async removeParticipant(matchId: string, participantId: string): Promise<void> {
    await db
      .delete(matchParticipants)
      .where(
        and(
          eq(matchParticipants.matchId, matchId),
          eq(matchParticipants.participantId, participantId)
        )
      );
  },

  // Results
  async createResult(data: InsertMatchResult): Promise<MatchResult> {
    const [result] = await db.insert(matchResults).values(data).returning();
    return result;
  },

  async getResultsByMatch(matchId: string): Promise<MatchResult[]> {
    return db
      .select()
      .from(matchResults)
      .where(eq(matchResults.matchId, matchId))
      .orderBy(desc(matchResults.createdAt));
  },

  async getResultById(resultId: string): Promise<MatchResult | undefined> {
    const [result] = await db
      .select()
      .from(matchResults)
      .where(eq(matchResults.id, resultId));
    return result;
  },

  async updateResult(resultId: string, data: Partial<InsertMatchResult>): Promise<MatchResult> {
    const [result] = await db
      .update(matchResults)
      .set(data)
      .where(eq(matchResults.id, resultId))
      .returning();
    return result;
  },

  // Ratings
  async addRatingChange(data: InsertRatingHistory): Promise<RatingHistory> {
    const [rating] = await db.insert(ratingHistory).values(data).returning();
    return rating;
  },

  async getRatingHistory(
    entityType: string,
    entityId: string,
    sport?: string,
    limit: number = 50
  ): Promise<RatingHistory[]> {
    const base = and(
      eq(ratingHistory.entityType, entityType),
      eq(ratingHistory.entityId, entityId),
    );
    const whereClause = sport ? and(base, eq(ratingHistory.sport, sport)) : base;

    return db
      .select()
      .from(ratingHistory)
      .where(whereClause)
      .orderBy(desc(ratingHistory.createdAt))
      .limit(limit);
  },

  async getCurrentRating(
    entityType: string,
    entityId: string,
    sport: string
  ): Promise<number> {
    const [latest] = await db
      .select()
      .from(ratingHistory)
      .where(
        and(
          eq(ratingHistory.entityType, entityType),
          eq(ratingHistory.entityId, entityId),
          eq(ratingHistory.sport, sport)
        )
      )
      .orderBy(desc(ratingHistory.createdAt))
      .limit(1);

    return latest?.newRating || 1500; // Default ELO rating
  },

  // Leaderboards
  async getLeaderboard(
    scope: 'user' | 'team',
    sport?: string,
    limit: number = 100
  ): Promise<Array<{ entityId: string; rating: number; sport: string }>> {
    // Get latest rating for each entity
    const subquery = db
      .select({
        entityId: ratingHistory.entityId,
        sport: ratingHistory.sport,
        maxCreatedAt: sql<string>`MAX(${ratingHistory.createdAt})`.as('max_created_at'),
      })
      .from(ratingHistory)
      .where(eq(ratingHistory.entityType, scope))
      .groupBy(ratingHistory.entityId, ratingHistory.sport)
      .as('latest');

    let query = db
      .select({
        entityId: ratingHistory.entityId,
        rating: ratingHistory.newRating,
        sport: ratingHistory.sport,
      })
      .from(ratingHistory)
      .innerJoin(
        subquery,
        and(
          eq(ratingHistory.entityId, subquery.entityId),
          eq(ratingHistory.sport, subquery.sport),
          sql`${ratingHistory.createdAt} = ${subquery.maxCreatedAt}`
        )
      );

    if (sport) {
      query = query.where(eq(ratingHistory.sport, sport)) as any;
    }

    return query.orderBy(desc(ratingHistory.newRating)).limit(limit);
  },

  // Package #10: Get all ratings by sport for a specific user/team
  async getRatingsBySports(
    entityType: 'user' | 'team',
    entityId: string
  ): Promise<Array<{ sport: string; rating: number; delta: number }>> {
    // Get latest rating for each sport
    const ratings = await db
      .select({
        sport: ratingHistory.sport,
        rating: ratingHistory.newRating,
        delta: ratingHistory.delta,
        createdAt: ratingHistory.createdAt,
      })
      .from(ratingHistory)
      .where(
        and(
          eq(ratingHistory.entityType, entityType),
          eq(ratingHistory.entityId, entityId)
        )
      )
      .orderBy(desc(ratingHistory.createdAt));

    // Group by sport and get the latest for each
    const sportRatings = new Map<string, { rating: number; delta: number }>();
    for (const r of ratings) {
      if (!sportRatings.has(r.sport)) {
        sportRatings.set(r.sport, { rating: r.rating, delta: r.delta });
      }
    }

    return Array.from(sportRatings.entries()).map(([sport, data]) => ({
      sport,
      rating: data.rating,
      delta: data.delta,
    }));
  },
};
