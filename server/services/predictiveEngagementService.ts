// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { 
  users, 
  userInteractions,
  posts,
  events,
  engagementPredictions,
  userAiPreferences,
  type EngagementPrediction
} from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, sql, gte, lte, count } from "drizzle-orm";

export interface EngagementMetrics {
  userId: string;
  totalSessions: number;
  avgSessionDuration: number;
  lastActivity: Date;
  interactionFrequency: number;
  contentEngagement: number;
  socialEngagement: number;
  featureUsage: { [feature: string]: number };
}

export interface ChurnRiskFactors {
  daysSinceLastActivity: number;
  sessionFrequencyDecline: number;
  engagementDecline: number;
  missingGoalProgress: boolean;
  uncompletedOnboarding: boolean;
  socialIsolation: boolean;
}

export interface PredictionResult {
  userId: string;
  predictionType: 'churn_risk' | 'engagement_score' | 'activity_likelihood';
  score: number;
  confidence: number;
  factors: ChurnRiskFactors | any;
  recommendations: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export class PredictiveEngagementService {
  constructor() {}

  async calculateEngagementScore(userId: string): Promise<PredictionResult> {
    const metrics = await this.getEngagementMetrics(userId);
    const userPrefs = await this.getUserPreferences(userId);
    
    // Calculate engagement score based on multiple factors
    let score = 0;
    const factors = {
      recentActivity: 0,
      contentInteraction: 0,
      socialActivity: 0,
      goalProgress: 0,
      featureAdoption: 0
    };

    // Recent activity factor (40% weight)
    const daysSinceLastActivity = metrics.lastActivity ? 
      (Date.now() - new Date(metrics.lastActivity).getTime()) / (1000 * 60 * 60 * 24) : 30;
    
    if (daysSinceLastActivity <= 1) {
      factors.recentActivity = 1.0;
    } else if (daysSinceLastActivity <= 7) {
      factors.recentActivity = 0.8;
    } else if (daysSinceLastActivity <= 14) {
      factors.recentActivity = 0.5;
    } else {
      factors.recentActivity = 0.2;
    }

    // Content interaction factor (25% weight)
    factors.contentInteraction = Math.min(1.0, metrics.contentEngagement / 10);

    // Social activity factor (20% weight)
    factors.socialActivity = Math.min(1.0, metrics.socialEngagement / 5);

    // Feature adoption factor (15% weight)
    const totalFeatures = Object.keys(metrics.featureUsage).length;
    factors.featureAdoption = totalFeatures > 0 ? Math.min(1.0, totalFeatures / 8) : 0;

    // Calculate weighted score
    score = (
      factors.recentActivity * 0.4 +
      factors.contentInteraction * 0.25 +
      factors.socialActivity * 0.2 +
      factors.featureAdoption * 0.15
    );

    // Generate recommendations
    const recommendations = this.generateEngagementRecommendations(factors, userPrefs);

    // Determine confidence based on data quality
    const confidence = Math.min(1.0, (metrics.totalSessions + metrics.interactionFrequency) / 20);

    return {
      userId,
      predictionType: 'engagement_score',
      score,
      confidence,
      factors,
      recommendations,
      priority: this.getPriorityLevel(score)
    };
  }

  async calculateChurnRisk(userId: string): Promise<PredictionResult> {
    const metrics = await this.getEngagementMetrics(userId);
    const userPrefs = await this.getUserPreferences(userId);
    
    const churnFactors: ChurnRiskFactors = {
      daysSinceLastActivity: 0,
      sessionFrequencyDecline: 0,
      engagementDecline: 0,
      missingGoalProgress: false,
      uncompletedOnboarding: false,
      socialIsolation: false
    };

    // Calculate days since last activity
    churnFactors.daysSinceLastActivity = metrics.lastActivity ? 
      (Date.now() - new Date(metrics.lastActivity).getTime()) / (1000 * 60 * 60 * 24) : 30;

    // Session frequency decline (compare last 7 days vs previous 7 days)
    const recentSessions = await this.getSessionCount(userId, 7);
    const previousSessions = await this.getSessionCount(userId, 14, 7);
    churnFactors.sessionFrequencyDecline = previousSessions > 0 ? 
      (previousSessions - recentSessions) / previousSessions : 0;

    // Engagement decline
    const recentEngagement = await this.getEngagementCount(userId, 7);
    const previousEngagement = await this.getEngagementCount(userId, 14, 7);
    churnFactors.engagementDecline = previousEngagement > 0 ? 
      (previousEngagement - recentEngagement) / previousEngagement : 0;

    // Social isolation check
    churnFactors.socialIsolation = metrics.socialEngagement < 1;

    // Onboarding completion check
    churnFactors.uncompletedOnboarding = !userPrefs || Object.keys(metrics.featureUsage).length < 3;

    // Calculate churn risk score
    let churnScore = 0;
    
    // High risk factors
    if (churnFactors.daysSinceLastActivity > 14) churnScore += 0.4;
    else if (churnFactors.daysSinceLastActivity > 7) churnScore += 0.2;
    
    if (churnFactors.sessionFrequencyDecline > 0.5) churnScore += 0.3;
    if (churnFactors.engagementDecline > 0.5) churnScore += 0.2;
    if (churnFactors.socialIsolation) churnScore += 0.1;
    if (churnFactors.uncompletedOnboarding) churnScore += 0.15;

    churnScore = Math.min(1.0, churnScore);

    // Generate churn prevention recommendations
    const recommendations = this.generateChurnPreventionRecommendations(churnFactors, userPrefs);

    // Confidence based on data completeness
    const confidence = Math.min(1.0, metrics.totalSessions / 10);

    return {
      userId,
      predictionType: 'churn_risk',
      score: churnScore,
      confidence,
      factors: churnFactors,
      recommendations,
      priority: this.getChurnPriorityLevel(churnScore)
    };
  }

  async predictActivityLikelihood(userId: string, activityType: string): Promise<PredictionResult> {
    const metrics = await this.getEngagementMetrics(userId);
    const userPrefs = await this.getUserPreferences(userId);
    
    // Activity-specific likelihood calculation
    let likelihood = 0;
    const factors = {
      historicalEngagement: 0,
      timeOfWeek: 0,
      seasonality: 0,
      socialInfluence: 0
    };

    // Historical engagement with this activity type
    const historicalActivity = await this.getActivityHistory(userId, activityType);
    factors.historicalEngagement = Math.min(1.0, historicalActivity / 5);

    // Time-based factors
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    
    // Peak activity hours (6-9 AM, 6-10 PM)
    if ((currentHour >= 6 && currentHour <= 9) || (currentHour >= 18 && currentHour <= 22)) {
      factors.timeOfWeek = 0.8;
    } else {
      factors.timeOfWeek = 0.4;
    }

    // Weekend boost for recreational activities
    if ((currentDay === 0 || currentDay === 6) && activityType.includes('event')) {
      factors.timeOfWeek += 0.2;
    }

    // Social influence (friends' activity)
    const socialActivity = await this.getSocialActivityInfluence(userId, activityType);
    factors.socialInfluence = Math.min(1.0, socialActivity / 3);

    // Calculate weighted likelihood
    likelihood = (
      factors.historicalEngagement * 0.4 +
      factors.timeOfWeek * 0.3 +
      factors.socialInfluence * 0.3
    );

    const recommendations = this.generateActivityRecommendations(activityType, factors, userPrefs);
    const confidence = Math.min(1.0, (historicalActivity + socialActivity) / 8);

    return {
      userId,
      predictionType: 'activity_likelihood',
      score: likelihood,
      confidence,
      factors,
      recommendations,
      priority: this.getPriorityLevel(likelihood)
    };
  }

  private async getEngagementMetrics(userId: string): Promise<EngagementMetrics> {
    // Get user interactions in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const interactions = await db
      .select()
      .from(userInteractions)
      .where(and(
        eq(userInteractions.userId, userId),
        gte(userInteractions.createdAt, thirtyDaysAgo)
      ));

    // Get last activity
    const [lastInteraction] = await db
      .select()
      .from(userInteractions)
      .where(eq(userInteractions.userId, userId))
      .orderBy(desc(userInteractions.createdAt))
      .limit(1);

    // Calculate metrics
    const totalSessions = new Set(
      interactions.map(i => i.createdAt?.toDateString())
    ).size;

    const contentEngagement = interactions.filter(i => 
      ['post', 'event'].includes(i.targetType)
    ).length;

    const socialEngagement = interactions.filter(i => 
      ['like', 'comment', 'follow'].includes(i.type)
    ).length;

    // Feature usage tracking
    const featureUsage: { [feature: string]: number } = {};
    interactions.forEach(interaction => {
      const feature = interaction.targetType;
      featureUsage[feature] = (featureUsage[feature] || 0) + 1;
    });

    return {
      userId,
      totalSessions,
      avgSessionDuration: 0, // Would need session tracking for this
      lastActivity: lastInteraction?.createdAt || new Date(0),
      interactionFrequency: interactions.length,
      contentEngagement,
      socialEngagement,
      featureUsage
    };
  }

  private async getUserPreferences(userId: string) {
    const [prefs] = await db
      .select()
      .from(userAiPreferences)
      .where(eq(userAiPreferences.userId, userId));
    return prefs;
  }

  private async getSessionCount(userId: string, days: number, offset: number = 0): Promise<number> {
    const endDate = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    const result = await db
      .select({ count: count() })
      .from(userInteractions)
      .where(and(
        eq(userInteractions.userId, userId),
        gte(userInteractions.createdAt, startDate),
        lte(userInteractions.createdAt, endDate)
      ));
    
    return result[0]?.count || 0;
  }

  private async getEngagementCount(userId: string, days: number, offset: number = 0): Promise<number> {
    const endDate = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    const result = await db
      .select({ count: count() })
      .from(userInteractions)
      .where(and(
        eq(userInteractions.userId, userId),
        gte(userInteractions.createdAt, startDate),
        lte(userInteractions.createdAt, endDate),
        sql`${userInteractions.weight} > 0.5`
      ));
    
    return result[0]?.count || 0;
  }

  private async getActivityHistory(userId: string, activityType: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(userInteractions)
      .where(and(
        eq(userInteractions.userId, userId),
        eq(userInteractions.targetType, activityType)
      ));
    
    return result[0]?.count || 0;
  }

  private async getSocialActivityInfluence(userId: string, activityType: string): Promise<number> {
    // This would require a more complex query to find friends' activities
    // For now, return a placeholder
    return Math.random() * 3;
  }

  private generateEngagementRecommendations(factors: any, userPrefs: any): string[] {
    const recommendations = [];
    
    if (factors.recentActivity < 0.5) {
      recommendations.push("Welcome back! Check out what's new in your feed");
    }
    
    if (factors.contentInteraction < 0.3) {
      recommendations.push("Discover events and posts matching your interests");
    }
    
    if (factors.socialActivity < 0.3) {
      recommendations.push("Connect with other athletes in your area");
    }
    
    if (factors.featureAdoption < 0.5) {
      recommendations.push("Explore team features and coaching opportunities");
    }
    
    if (userPrefs?.preferredSports?.length > 0) {
      recommendations.push(`Find ${userPrefs.preferredSports[0]} events near you`);
    }
    
    return recommendations;
  }

  private generateChurnPreventionRecommendations(factors: ChurnRiskFactors, userPrefs: any): string[] {
    const recommendations = [];
    
    if (factors.daysSinceLastActivity > 7) {
      recommendations.push("We miss you! Come back and see what's new");
    }
    
    if (factors.uncompletedOnboarding) {
      recommendations.push("Complete your profile to get better recommendations");
    }
    
    if (factors.socialIsolation) {
      recommendations.push("Join a local sports team or find training partners");
    }
    
    if (factors.sessionFrequencyDecline > 0.3) {
      recommendations.push("Set up notifications for events you're interested in");
    }
    
    if (userPrefs?.goals?.length > 0) {
      recommendations.push("Track your progress towards your fitness goals");
    }
    
    return recommendations;
  }

  private generateActivityRecommendations(activityType: string, factors: any, userPrefs: any): string[] {
    const recommendations = [];
    
    switch (activityType) {
      case 'event':
        recommendations.push("Perfect time to join an event!");
        if (factors.socialInfluence > 0.5) {
          recommendations.push("Your friends are active - join them!");
        }
        break;
      case 'training':
        recommendations.push("Great time for a workout session");
        break;
      case 'social':
        recommendations.push("Connect with other athletes now");
        break;
    }
    
    return recommendations;
  }

  private getPriorityLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }

  private getChurnPriorityLevel(churnScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (churnScore >= 0.8) return 'critical';
    if (churnScore >= 0.6) return 'high';
    if (churnScore >= 0.4) return 'medium';
    return 'low';
  }

  // Save prediction to database
  async savePrediction(prediction: PredictionResult): Promise<void> {
    const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db
      .insert(engagementPredictions)
      .values({
        userId: prediction.userId,
        predictionType: prediction.predictionType,
        score: prediction.score.toString(),
        confidence: prediction.confidence.toString(),
        factors: prediction.factors as any,
        recommendations: prediction.recommendations,
        validUntil
      });
  }

  // Get saved predictions
  async getPredictions(userId: string, predictionType?: string): Promise<EngagementPrediction[]> {
    const query = db
      .select()
      .from(engagementPredictions)
      .where(and(
        eq(engagementPredictions.userId, userId),
        gte(engagementPredictions.validUntil, new Date()),
        predictionType ? eq(engagementPredictions.predictionType, predictionType) : undefined
      ))
      .orderBy(desc(engagementPredictions.calculatedAt));

    return await query;
  }

  // Generate insights for admin dashboard
  async generatePlatformInsights(): Promise<{
    totalUsers: number;
    highRiskUsers: number;
    avgEngagementScore: number;
    churnPrevention: {
      actionsTaken: number;
      usersRetained: number;
    };
  }> {
    // Get high-risk users (churn score > 0.6)
    const highRiskUsers = await db
      .select({ count: count() })
      .from(engagementPredictions)
      .where(and(
        eq(engagementPredictions.predictionType, 'churn_risk'),
        sql`CAST(${engagementPredictions.score} AS FLOAT) > 0.6`,
        gte(engagementPredictions.validUntil, new Date())
      ));

    // Get average engagement score
    const avgEngagement = await db
      .select({ 
        avg: sql`AVG(CAST(${engagementPredictions.score} AS FLOAT))` 
      })
      .from(engagementPredictions)
      .where(and(
        eq(engagementPredictions.predictionType, 'engagement_score'),
        gte(engagementPredictions.validUntil, new Date())
      ));

    // Get total users count
    const totalUsers = await db
      .select({ count: count() })
      .from(users);

    return {
      totalUsers: totalUsers[0]?.count || 0,
      highRiskUsers: highRiskUsers[0]?.count || 0,
      avgEngagementScore: Number(avgEngagement[0]?.avg) || 0,
      churnPrevention: {
        actionsTaken: 0, // Would track intervention actions
        usersRetained: 0 // Would track successful retention
      }
    };
  }
}