import { db } from "../../db";
import { 
  analyticsFacts, 
  InsertAnalyticsFact,
  userRollups,
  teamRollups,
  gymRollups,
  eventRollups,
  marketplaceRollups,
  globalRollups,
  UserRollup,
  TeamRollup,
  GymRollup,
  EventRollup,
  MarketplaceRollup,
  GlobalRollup
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql, isNull } from "drizzle-orm";

export type Period = 'day' | 'week' | 'month' | 'all';

export class AnalyticsService {
  static async logFact(fact: InsertAnalyticsFact): Promise<void> {
    await db.insert(analyticsFacts).values(fact);
  }

  static getPeriodBounds(period: Period, referenceDate: Date = new Date()): { start: Date; end: Date } {
    const end = new Date(referenceDate);
    const start = new Date(referenceDate);
    
    switch (period) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'all':
        start.setFullYear(2020, 0, 1);
        start.setHours(0, 0, 0, 0);
        end.setFullYear(2100, 11, 31);
        end.setHours(23, 59, 59, 999);
        break;
    }
    
    return { start, end };
  }

  static async getUserRollup(userId: string, period: Period): Promise<UserRollup | null> {
    const { start } = this.getPeriodBounds(period);
    
    const [rollup] = await db
      .select()
      .from(userRollups)
      .where(
        and(
          eq(userRollups.userId, userId),
          eq(userRollups.period, period),
          eq(userRollups.periodStart, start)
        )
      )
      .limit(1);
    
    return rollup || null;
  }

  static async computeUserRollup(userId: string, period: Period): Promise<UserRollup> {
    const { start, end } = this.getPeriodBounds(period);
    
    const socialStats = await db
      .select({
        posts: sql<number>`COUNT(DISTINCT CASE WHEN ${analyticsFacts.kind} = 'post_create' THEN ${analyticsFacts.targetId} END)`,
        likes: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'post_like' THEN 1 END)`,
        comments: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'post_comment' THEN 1 END)`,
        shares: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'post_share' THEN 1 END)`,
      })
      .from(analyticsFacts)
      .where(
        and(
          eq(analyticsFacts.actorId, userId),
          gte(analyticsFacts.ts, start),
          lte(analyticsFacts.ts, end)
        )
      );

    const challengeStats = await db
      .select({
        played: sql<number>`COUNT(DISTINCT ${analyticsFacts.targetId})`,
        wins: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'challenge_win' THEN 1 END)`,
        losses: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'challenge_loss' THEN 1 END)`,
        draws: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'challenge_draw' THEN 1 END)`,
      })
      .from(analyticsFacts)
      .where(
        and(
          eq(analyticsFacts.actorId, userId),
          sql`${analyticsFacts.kind} IN ('challenge_win', 'challenge_loss', 'challenge_draw')`,
          gte(analyticsFacts.ts, start),
          lte(analyticsFacts.ts, end)
        )
      );

    const donations = await db
      .select({
        total: sql<number>`COALESCE(SUM(${analyticsFacts.amountCents}), 0)`,
      })
      .from(analyticsFacts)
      .where(
        and(
          eq(analyticsFacts.targetId, userId),
          eq(analyticsFacts.kind, 'donation_received'),
          gte(analyticsFacts.ts, start),
          lte(analyticsFacts.ts, end)
        )
      );

    const rollupData = {
      userId,
      period,
      periodStart: start,
      periodEnd: end,
      posts: socialStats[0]?.posts || 0,
      likes: socialStats[0]?.likes || 0,
      comments: socialStats[0]?.comments || 0,
      shares: socialStats[0]?.shares || 0,
      challengesPlayed: challengeStats[0]?.played || 0,
      wins: challengeStats[0]?.wins || 0,
      losses: challengeStats[0]?.losses || 0,
      draws: challengeStats[0]?.draws || 0,
      donationsReceivedCents: donations[0]?.total || 0,
      rating: "0",
      ratingDelta: "0",
      xp: 0,
      streakDays: 0,
      trainingHours: "0",
    };

    await db
      .insert(userRollups)
      .values(rollupData)
      .onConflictDoUpdate({
        target: [userRollups.userId, userRollups.period, userRollups.periodStart],
        set: {
          ...rollupData,
          updatedAt: new Date(),
        },
      });

    const [savedRollup] = await db
      .select()
      .from(userRollups)
      .where(
        and(
          eq(userRollups.userId, userId),
          eq(userRollups.period, period),
          eq(userRollups.periodStart, start)
        )
      )
      .limit(1);

    return savedRollup;
  }

  static async getTeamRollup(teamId: string, period: Period): Promise<TeamRollup | null> {
    const { start } = this.getPeriodBounds(period);
    
    const [rollup] = await db
      .select()
      .from(teamRollups)
      .where(
        and(
          eq(teamRollups.teamId, teamId),
          eq(teamRollups.period, period),
          eq(teamRollups.periodStart, start)
        )
      )
      .limit(1);
    
    return rollup || null;
  }

  static async computeTeamRollup(teamId: string, period: Period): Promise<TeamRollup> {
    const { start, end } = this.getPeriodBounds(period);
    
    const matchStats = await db
      .select({
        matches: sql<number>`COUNT(DISTINCT ${analyticsFacts.targetId})`,
        wins: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'match_win' THEN 1 END)`,
        losses: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'match_loss' THEN 1 END)`,
        draws: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'match_draw' THEN 1 END)`,
      })
      .from(analyticsFacts)
      .where(
        and(
          eq(analyticsFacts.actorId, teamId),
          sql`${analyticsFacts.kind} IN ('match_win', 'match_loss', 'match_draw')`,
          gte(analyticsFacts.ts, start),
          lte(analyticsFacts.ts, end)
        )
      );

    const followers = await db
      .select({
        gained: sql<number>`COUNT(*)`,
      })
      .from(analyticsFacts)
      .where(
        and(
          eq(analyticsFacts.targetId, teamId),
          eq(analyticsFacts.kind, 'team_follow'),
          gte(analyticsFacts.ts, start),
          lte(analyticsFacts.ts, end)
        )
      );

    const financial = await db
      .select({
        donations: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsFacts.kind} = 'donation_received' THEN ${analyticsFacts.amountCents} END), 0)`,
        sponsorship: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsFacts.kind} = 'sponsorship_received' THEN ${analyticsFacts.amountCents} END), 0)`,
      })
      .from(analyticsFacts)
      .where(
        and(
          eq(analyticsFacts.targetId, teamId),
          gte(analyticsFacts.ts, start),
          lte(analyticsFacts.ts, end)
        )
      );

    const rollupData = {
      teamId,
      period,
      periodStart: start,
      periodEnd: end,
      matches: matchStats[0]?.matches || 0,
      wins: matchStats[0]?.wins || 0,
      losses: matchStats[0]?.losses || 0,
      draws: matchStats[0]?.draws || 0,
      followersGained: followers[0]?.gained || 0,
      participationRate: "0",
      donationsCents: financial[0]?.donations || 0,
      sponsorshipCents: financial[0]?.sponsorship || 0,
    };

    await db
      .insert(teamRollups)
      .values(rollupData)
      .onConflictDoUpdate({
        target: [teamRollups.teamId, teamRollups.period, teamRollups.periodStart],
        set: {
          ...rollupData,
          updatedAt: new Date(),
        },
      });

    const [savedRollup] = await db
      .select()
      .from(teamRollups)
      .where(
        and(
          eq(teamRollups.teamId, teamId),
          eq(teamRollups.period, period),
          eq(teamRollups.periodStart, start)
        )
      )
      .limit(1);

    return savedRollup;
  }

  static async getGymRollup(gymId: string, period: Period): Promise<GymRollup | null> {
    const { start } = this.getPeriodBounds(period);
    
    const [rollup] = await db
      .select()
      .from(gymRollups)
      .where(
        and(
          eq(gymRollups.gymId, gymId),
          eq(gymRollups.period, period),
          eq(gymRollups.periodStart, start)
        )
      )
      .limit(1);
    
    return rollup || null;
  }

  static async computeGymRollup(gymId: string, period: Period): Promise<GymRollup> {
    const { start, end } = this.getPeriodBounds(period);
    
    const activity = await db
      .select({
        bookings: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'gym_booking' THEN 1 END)`,
        attendance: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'gym_checkin' THEN 1 END)`,
      })
      .from(analyticsFacts)
      .where(
        and(
          eq(analyticsFacts.targetId, gymId),
          gte(analyticsFacts.ts, start),
          lte(analyticsFacts.ts, end)
        )
      );

    const financial = await db
      .select({
        revenue: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsFacts.kind} = 'gym_booking' THEN ${analyticsFacts.amountCents} END), 0)`,
        refunds: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsFacts.kind} = 'gym_refund' THEN ${analyticsFacts.amountCents} END), 0)`,
      })
      .from(analyticsFacts)
      .where(
        and(
          eq(analyticsFacts.targetId, gymId),
          gte(analyticsFacts.ts, start),
          lte(analyticsFacts.ts, end)
        )
      );

    const rollupData = {
      gymId,
      period,
      periodStart: start,
      periodEnd: end,
      bookings: activity[0]?.bookings || 0,
      attendance: activity[0]?.attendance || 0,
      revenueCents: financial[0]?.revenue || 0,
      refundsCents: financial[0]?.refunds || 0,
      topClasses: null,
    };

    await db
      .insert(gymRollups)
      .values(rollupData)
      .onConflictDoUpdate({
        target: [gymRollups.gymId, gymRollups.period, gymRollups.periodStart],
        set: {
          ...rollupData,
          updatedAt: new Date(),
        },
      });

    const [savedRollup] = await db
      .select()
      .from(gymRollups)
      .where(
        and(
          eq(gymRollups.gymId, gymId),
          eq(gymRollups.period, period),
          eq(gymRollups.periodStart, start)
        )
      )
      .limit(1);

    return savedRollup;
  }

  static async getEventRollup(eventId: string): Promise<EventRollup | null> {
    const [rollup] = await db
      .select()
      .from(eventRollups)
      .where(eq(eventRollups.eventId, eventId))
      .limit(1);
    
    return rollup || null;
  }

  static async computeEventRollup(eventId: string): Promise<EventRollup> {
    const tickets = await db
      .select({
        sold: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'event_ticket_purchase' THEN 1 END)`,
        revenue: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsFacts.kind} = 'event_ticket_purchase' THEN ${analyticsFacts.amountCents} END), 0)`,
        attendees: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'event_checkin' THEN 1 END)`,
      })
      .from(analyticsFacts)
      .where(eq(analyticsFacts.targetId, eventId));

    const engagement = await db
      .select({
        views: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'event_view' THEN 1 END)`,
        shares: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'event_share' THEN 1 END)`,
        comments: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'event_comment' THEN 1 END)`,
      })
      .from(analyticsFacts)
      .where(eq(analyticsFacts.targetId, eventId));

    const rollupData = {
      eventId,
      ticketsSold: tickets[0]?.sold || 0,
      revenueCents: tickets[0]?.revenue || 0,
      attendees: tickets[0]?.attendees || 0,
      views: engagement[0]?.views || 0,
      shares: engagement[0]?.shares || 0,
      comments: engagement[0]?.comments || 0,
      demographics: null,
    };

    await db
      .insert(eventRollups)
      .values(rollupData)
      .onConflictDoUpdate({
        target: [eventRollups.eventId],
        set: {
          ...rollupData,
          updatedAt: new Date(),
        },
      });

    const [savedRollup] = await db
      .select()
      .from(eventRollups)
      .where(eq(eventRollups.eventId, eventId))
      .limit(1);

    return savedRollup;
  }

  static async getMarketplaceRollup(filters: {
    sellerId?: string;
    productId?: string;
    period: Period;
  }): Promise<MarketplaceRollup | null> {
    const { start } = this.getPeriodBounds(filters.period);
    
    const conditions = [
      eq(marketplaceRollups.period, filters.period),
      eq(marketplaceRollups.periodStart, start),
    ];
    
    if (filters.sellerId) {
      conditions.push(eq(marketplaceRollups.sellerId, filters.sellerId));
    } else {
      conditions.push(isNull(marketplaceRollups.sellerId));
    }
    
    if (filters.productId) {
      conditions.push(eq(marketplaceRollups.productId, filters.productId));
    } else {
      conditions.push(isNull(marketplaceRollups.productId));
    }
    
    const [rollup] = await db
      .select()
      .from(marketplaceRollups)
      .where(and(...conditions))
      .limit(1);
    
    return rollup || null;
  }

  static async computeMarketplaceRollup(filters: {
    sellerId?: string;
    productId?: string;
    period: Period;
  }): Promise<MarketplaceRollup> {
    const { start, end } = this.getPeriodBounds(filters.period);
    
    const factConditions = [
      gte(analyticsFacts.ts, start),
      lte(analyticsFacts.ts, end),
    ];
    
    if (filters.sellerId) {
      factConditions.push(eq(analyticsFacts.actorId, filters.sellerId));
    }
    if (filters.productId) {
      factConditions.push(eq(analyticsFacts.targetId, filters.productId));
    }

    const funnel = await db
      .select({
        views: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'product_view' THEN 1 END)`,
        addToCarts: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'product_add_to_cart' THEN 1 END)`,
        purchases: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'product_purchase' THEN 1 END)`,
        revenue: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsFacts.kind} = 'product_purchase' THEN ${analyticsFacts.amountCents} END), 0)`,
        refunds: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsFacts.kind} = 'product_refund' THEN ${analyticsFacts.amountCents} END), 0)`,
      })
      .from(analyticsFacts)
      .where(and(...factConditions));

    const purchases = funnel[0]?.purchases || 0;
    const revenue = funnel[0]?.revenue || 0;
    const aov = purchases > 0 ? Math.floor(revenue / purchases) : 0;

    const rollupData = {
      sellerId: filters.sellerId || null,
      productId: filters.productId || null,
      period: filters.period,
      periodStart: start,
      periodEnd: end,
      views: funnel[0]?.views || 0,
      addToCarts: funnel[0]?.addToCarts || 0,
      purchases,
      revenueCents: revenue,
      refundsCents: funnel[0]?.refunds || 0,
      aovCents: aov,
    };

    await db
      .insert(marketplaceRollups)
      .values(rollupData)
      .onConflictDoUpdate({
        target: [marketplaceRollups.sellerId, marketplaceRollups.productId, marketplaceRollups.period, marketplaceRollups.periodStart],
        set: {
          ...rollupData,
          updatedAt: new Date(),
        },
      });

    const conditions = [
      eq(marketplaceRollups.period, filters.period),
      eq(marketplaceRollups.periodStart, start),
    ];
    
    if (filters.sellerId) {
      conditions.push(eq(marketplaceRollups.sellerId, filters.sellerId));
    } else {
      conditions.push(isNull(marketplaceRollups.sellerId));
    }
    
    if (filters.productId) {
      conditions.push(eq(marketplaceRollups.productId, filters.productId));
    } else {
      conditions.push(isNull(marketplaceRollups.productId));
    }

    const [savedRollup] = await db
      .select()
      .from(marketplaceRollups)
      .where(and(...conditions))
      .limit(1);

    return savedRollup;
  }

  static async getGlobalRollup(period: Period): Promise<GlobalRollup | null> {
    const { start } = this.getPeriodBounds(period);
    
    const [rollup] = await db
      .select()
      .from(globalRollups)
      .where(
        and(
          eq(globalRollups.period, period),
          eq(globalRollups.periodStart, start)
        )
      )
      .limit(1);
    
    return rollup || null;
  }

  static async computeGlobalRollup(period: Period): Promise<GlobalRollup> {
    const { start, end } = this.getPeriodBounds(period);
    
    const users = await db
      .select({
        signups: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'user_signup' THEN 1 END)`,
        dau: sql<number>`COUNT(DISTINCT CASE WHEN ${analyticsFacts.kind} = 'user_active' THEN ${analyticsFacts.actorId} END)`,
      })
      .from(analyticsFacts)
      .where(
        and(
          gte(analyticsFacts.ts, start),
          lte(analyticsFacts.ts, end)
        )
      );

    const financial = await db
      .select({
        revenue: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsFacts.kind} IN ('product_purchase', 'event_ticket_purchase', 'gym_booking') THEN ${analyticsFacts.amountCents} END), 0)`,
        gmv: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsFacts.kind} = 'product_purchase' THEN ${analyticsFacts.amountCents} END), 0)`,
        refunds: sql<number>`COALESCE(SUM(CASE WHEN ${analyticsFacts.kind} IN ('product_refund', 'gym_refund') THEN ${analyticsFacts.amountCents} END), 0)`,
      })
      .from(analyticsFacts)
      .where(
        and(
          gte(analyticsFacts.ts, start),
          lte(analyticsFacts.ts, end)
        )
      );

    const comm = await db
      .select({
        messages: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'message_sent' THEN 1 END)`,
        calls: sql<number>`COUNT(CASE WHEN ${analyticsFacts.kind} = 'call_started' THEN 1 END)`,
      })
      .from(analyticsFacts)
      .where(
        and(
          gte(analyticsFacts.ts, start),
          lte(analyticsFacts.ts, end)
        )
      );

    const rollupData = {
      period,
      periodStart: start,
      periodEnd: end,
      dau: users[0]?.dau || 0,
      mau: 0,
      signups: users[0]?.signups || 0,
      revenueCents: financial[0]?.revenue || 0,
      gmvCents: financial[0]?.gmv || 0,
      refundsCents: financial[0]?.refunds || 0,
      activeCities: 0,
      topSports: null,
      protestsCreated: 0,
      signatures: 0,
      messagesSent: comm[0]?.messages || 0,
      calls: comm[0]?.calls || 0,
    };

    await db
      .insert(globalRollups)
      .values(rollupData)
      .onConflictDoUpdate({
        target: [globalRollups.period, globalRollups.periodStart],
        set: {
          ...rollupData,
          updatedAt: new Date(),
        },
      });

    const [savedRollup] = await db
      .select()
      .from(globalRollups)
      .where(
        and(
          eq(globalRollups.period, period),
          eq(globalRollups.periodStart, start)
        )
      )
      .limit(1);

    return savedRollup;
  }

  static async getOrComputeUserRollup(userId: string, period: Period): Promise<UserRollup> {
    const existing = await this.getUserRollup(userId, period);
    if (existing) return existing;
    return this.computeUserRollup(userId, period);
  }

  static async getOrComputeTeamRollup(teamId: string, period: Period): Promise<TeamRollup> {
    const existing = await this.getTeamRollup(teamId, period);
    if (existing) return existing;
    return this.computeTeamRollup(teamId, period);
  }

  static async getOrComputeGymRollup(gymId: string, period: Period): Promise<GymRollup> {
    const existing = await this.getGymRollup(gymId, period);
    if (existing) return existing;
    return this.computeGymRollup(gymId, period);
  }

  static async getOrComputeEventRollup(eventId: string): Promise<EventRollup> {
    const existing = await this.getEventRollup(eventId);
    if (existing) return existing;
    return this.computeEventRollup(eventId);
  }

  static async getOrComputeMarketplaceRollup(filters: {
    sellerId?: string;
    productId?: string;
    period: Period;
  }): Promise<MarketplaceRollup> {
    const existing = await this.getMarketplaceRollup(filters);
    if (existing) return existing;
    return this.computeMarketplaceRollup(filters);
  }

  static async getOrComputeGlobalRollup(period: Period): Promise<GlobalRollup> {
    const existing = await this.getGlobalRollup(period);
    if (existing) return existing;
    return this.computeGlobalRollup(period);
  }
}
