// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { 
  users, 
  events, 
  teams, 
  coaches,
  smartMatches,
  userAiPreferences,
  type SmartMatch,
  type UserAiPreferences
} from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, asc, gte, sql, ne } from "drizzle-orm";

export interface MatchingCriteria {
  userId: string;
  matchType: 'event' | 'team' | 'coach' | 'training_partner';
  location?: string;
  sport?: string;
  skillLevel?: string;
  availabilityDays?: string[];
  budgetRange?: { min: number; max: number };
  maxResults?: number;
}

export interface SmartMatchResult {
  matchId: string;
  compatibilityScore: number;
  matchFactors: {
    locationMatch: number;
    sportMatch: number;
    skillMatch: number;
    scheduleMatch: number;
    budgetMatch: number;
    personalityMatch: number;
  };
  item: any; // The matched item (event, team, coach, etc.)
  reasons: string[];
}

export class SmartMatchingService {
  constructor() {}

  async findMatches(criteria: MatchingCriteria): Promise<SmartMatchResult[]> {
    const { userId, matchType, maxResults = 20 } = criteria;
    
    // Get user profile and preferences
    const userProfile = await this.getUserProfile(userId);
    const userPrefs = await this.getUserAiPreferences(userId);
    
    let matches: SmartMatchResult[] = [];
    
    switch (matchType) {
      case 'event':
        matches = await this.findEventMatches(userId, userProfile, userPrefs, criteria);
        break;
      case 'team':
        matches = await this.findTeamMatches(userId, userProfile, userPrefs, criteria);
        break;
      case 'coach':
        matches = await this.findCoachMatches(userId, userProfile, userPrefs, criteria);
        break;
      case 'training_partner':
        matches = await this.findTrainingPartnerMatches(userId, userProfile, userPrefs, criteria);
        break;
    }
    
    // Sort by compatibility score and limit results
    matches = matches
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, maxResults);
    
    // Save smart matches to database
    await this.saveSmartMatches(userId, matchType, matches);
    
    return matches;
  }

  private async getUserProfile(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  private async getUserAiPreferences(userId: string): Promise<UserAiPreferences | null> {
    const [prefs] = await db.select().from(userAiPreferences).where(eq(userAiPreferences.userId, userId));
    return prefs || null;
  }

  private async findEventMatches(
    userId: string, 
    userProfile: any, 
    userPrefs: UserAiPreferences | null,
    criteria: MatchingCriteria
  ): Promise<SmartMatchResult[]> {
    const matches: SmartMatchResult[] = [];
    
    // Get upcoming events excluding user's own
    const upcomingEvents = await db
      .select()
      .from(events)
      .where(and(
        ne(events.organizerId, userId),
        gte(events.startDate, new Date())
      ))
      .orderBy(asc(events.startDate))
      .limit(100);

    for (const event of upcomingEvents) {
      const matchFactors = {
        locationMatch: 0,
        sportMatch: 0,
        skillMatch: 0,
        scheduleMatch: 0,
        budgetMatch: 0,
        personalityMatch: 0
      };
      const reasons: string[] = [];

      // Location matching
      if (userProfile?.location && event.location) {
        const userLocation = userProfile.location.toLowerCase();
        const eventLocation = event.location.toLowerCase();
        
        if (eventLocation.includes(userLocation) || userLocation.includes(eventLocation)) {
          matchFactors.locationMatch = 1.0;
          reasons.push('Perfect location match');
        } else if (this.calculateLocationSimilarity(userLocation, eventLocation) > 0.5) {
          matchFactors.locationMatch = 0.7;
          reasons.push('Good location proximity');
        }
      }

      // Sport matching
      if (userPrefs?.preferredSports && event.sport) {
        if (userPrefs.preferredSports.includes(event.sport)) {
          matchFactors.sportMatch = 1.0;
          reasons.push(`Perfect sport match: ${event.sport}`);
        }
      }

      // Schedule matching
      if (userPrefs?.availabilityDays && event.startDate) {
        const eventDay = new Date(event.startDate).toLocaleDateString('en', { weekday: 'long' }).toLowerCase();
        if (userPrefs.availabilityDays.some(day => day.toLowerCase().includes(eventDay))) {
          matchFactors.scheduleMatch = 1.0;
          reasons.push('Fits your schedule perfectly');
        }
      }

      // Calculate overall compatibility score
      const compatibilityScore = this.calculateWeightedScore(matchFactors, {
        locationMatch: 0.3,
        sportMatch: 0.4,
        skillMatch: 0.1,
        scheduleMatch: 0.2,
        budgetMatch: 0.0,
        personalityMatch: 0.0
      });

      if (compatibilityScore > 0.4) {
        matches.push({
          matchId: event.id,
          compatibilityScore,
          matchFactors,
          item: event,
          reasons
        });
      }
    }

    return matches;
  }

  private async findTeamMatches(
    userId: string, 
    userProfile: any, 
    userPrefs: UserAiPreferences | null,
    criteria: MatchingCriteria
  ): Promise<SmartMatchResult[]> {
    const matches: SmartMatchResult[] = [];
    
    // Get teams that are public and not user's own
    const availableTeams = await db
      .select()
      .from(teams)
      .where(and(
        eq(teams.isPublic, true),
        ne(teams.captainId, userId)
      ))
      .limit(100);

    for (const team of availableTeams) {
      const matchFactors = {
        locationMatch: 0,
        sportMatch: 0,
        skillMatch: 0,
        scheduleMatch: 0,
        budgetMatch: 0,
        personalityMatch: 0
      };
      const reasons: string[] = [];

      // Location matching
      if (userProfile?.location && team.location) {
        const similarity = this.calculateLocationSimilarity(
          userProfile.location.toLowerCase(),
          team.location.toLowerCase()
        );
        matchFactors.locationMatch = similarity;
        if (similarity > 0.8) {
          reasons.push('Local team');
        } else if (similarity > 0.5) {
          reasons.push('Regional team');
        }
      }

      // Sport matching
      if (userPrefs?.preferredSports && team.sport) {
        if (userPrefs.preferredSports.includes(team.sport)) {
          matchFactors.sportMatch = 1.0;
          reasons.push(`Plays your favorite sport: ${team.sport}`);
        }
      }

      // Team availability
      if (team.maxMembers && team.currentMembers) {
        const availabilityRatio = (team.maxMembers - team.currentMembers) / team.maxMembers;
        if (availabilityRatio > 0) {
          matchFactors.skillMatch = 0.8; // Using skillMatch as proxy for availability
          reasons.push(`${team.maxMembers - team.currentMembers} spots available`);
        }
      }

      // Calculate overall compatibility score
      const compatibilityScore = this.calculateWeightedScore(matchFactors, {
        locationMatch: 0.3,
        sportMatch: 0.5,
        skillMatch: 0.2,
        scheduleMatch: 0.0,
        budgetMatch: 0.0,
        personalityMatch: 0.0
      });

      if (compatibilityScore > 0.3) {
        matches.push({
          matchId: team.id,
          compatibilityScore,
          matchFactors,
          item: team,
          reasons
        });
      }
    }

    return matches;
  }

  private async findCoachMatches(
    userId: string, 
    userProfile: any, 
    userPrefs: UserAiPreferences | null,
    criteria: MatchingCriteria
  ): Promise<SmartMatchResult[]> {
    const matches: SmartMatchResult[] = [];
    
    // Get active coaches
    const activeCoaches = await db
      .select()
      .from(coaches)
      .where(eq(coaches.isActive, true))
      .limit(50);

    for (const coach of activeCoaches) {
      const matchFactors = {
        locationMatch: 0,
        sportMatch: 0,
        skillMatch: 0,
        scheduleMatch: 0,
        budgetMatch: 0,
        personalityMatch: 0
      };
      const reasons: string[] = [];

      // Sport specialization matching
      if (userPrefs?.preferredSports && coach.specialties) {
        const coachSports = Array.isArray(coach.specialties) ? coach.specialties : [];
        const matchingCount = userPrefs.preferredSports.filter(sport =>
          coachSports.some((spec: string) => spec.toLowerCase().includes(sport.toLowerCase()))
        ).length;
        
        if (matchingCount > 0) {
          matchFactors.sportMatch = Math.min(1.0, matchingCount / userPrefs.preferredSports.length);
          reasons.push(`Specializes in ${matchingCount} of your sports`);
        }
      }

      // Budget matching
      if (userPrefs?.budgetRange && coach.hourlyRate) {
        const budget = userPrefs.budgetRange as any;
        const rate = parseFloat(coach.hourlyRate);
        if (budget?.min && budget?.max && !isNaN(rate)) {
          if (rate >= budget.min && rate <= budget.max) {
            matchFactors.budgetMatch = 1.0;
            reasons.push('Within your budget');
          } else if (rate <= budget.max * 1.2) {
            matchFactors.budgetMatch = 0.7;
            reasons.push('Close to your budget');
          }
        }
      }

      // Experience matching
      if (coach.experience) {
        matchFactors.skillMatch = 0.8; // Assume experienced coaches are good matches
        reasons.push('Experienced coach');
      }

      // Calculate overall compatibility score
      const compatibilityScore = this.calculateWeightedScore(matchFactors, {
        locationMatch: 0.2,
        sportMatch: 0.4,
        skillMatch: 0.2,
        scheduleMatch: 0.0,
        budgetMatch: 0.2,
        personalityMatch: 0.0
      });

      if (compatibilityScore > 0.4) {
        matches.push({
          matchId: coach.id,
          compatibilityScore,
          matchFactors,
          item: coach,
          reasons
        });
      }
    }

    return matches;
  }

  private async findTrainingPartnerMatches(
    userId: string, 
    userProfile: any, 
    userPrefs: UserAiPreferences | null,
    criteria: MatchingCriteria
  ): Promise<SmartMatchResult[]> {
    const matches: SmartMatchResult[] = [];
    
    // Find users with similar preferences (excluding current user)
    const potentialPartners = await db
      .select({
        user: users,
        prefs: userAiPreferences
      })
      .from(users)
      .leftJoin(userAiPreferences, eq(users.id, userAiPreferences.userId))
      .where(ne(users.id, userId))
      .limit(100);

    for (const partner of potentialPartners) {
      if (!partner.prefs) continue; // Skip users without AI preferences
      
      const matchFactors = {
        locationMatch: 0,
        sportMatch: 0,
        skillMatch: 0,
        scheduleMatch: 0,
        budgetMatch: 0,
        personalityMatch: 0
      };
      const reasons: string[] = [];

      // Location matching
      if (userProfile?.location && partner.user.location) {
        const similarity = this.calculateLocationSimilarity(
          userProfile.location.toLowerCase(),
          partner.user.location.toLowerCase()
        );
        matchFactors.locationMatch = similarity;
        if (similarity > 0.8) {
          reasons.push('Lives nearby');
        }
      }

      // Sport interests matching
      if (userPrefs?.preferredSports && partner.prefs.preferredSports) {
        const commonSports = userPrefs.preferredSports.filter(sport =>
          partner.prefs.preferredSports?.includes(sport)
        );
        if (commonSports.length > 0) {
          matchFactors.sportMatch = commonSports.length / Math.max(
            userPrefs.preferredSports.length,
            partner.prefs.preferredSports.length
          );
          reasons.push(`Shares interest in ${commonSports.join(', ')}`);
        }
      }

      // Experience level matching
      if (userPrefs?.experienceLevel && partner.prefs.experienceLevel) {
        if (userPrefs.experienceLevel === partner.prefs.experienceLevel) {
          matchFactors.skillMatch = 1.0;
          reasons.push('Same experience level');
        } else if (this.isCompatibleExperienceLevel(userPrefs.experienceLevel, partner.prefs.experienceLevel)) {
          matchFactors.skillMatch = 0.7;
          reasons.push('Compatible experience level');
        }
      }

      // Schedule compatibility
      if (userPrefs?.availabilityDays && partner.prefs.availabilityDays) {
        const commonDays = userPrefs.availabilityDays.filter(day =>
          partner.prefs.availabilityDays?.includes(day)
        );
        if (commonDays.length > 0) {
          matchFactors.scheduleMatch = commonDays.length / Math.max(
            userPrefs.availabilityDays.length,
            partner.prefs.availabilityDays.length
          );
          reasons.push(`Available on ${commonDays.join(', ')}`);
        }
      }

      // Goals alignment
      if (userPrefs?.goals && partner.prefs.goals) {
        const commonGoals = userPrefs.goals.filter(goal =>
          partner.prefs.goals?.includes(goal)
        );
        if (commonGoals.length > 0) {
          matchFactors.personalityMatch = commonGoals.length / Math.max(
            userPrefs.goals.length,
            partner.prefs.goals.length
          );
          reasons.push(`Shares goals: ${commonGoals.join(', ')}`);
        }
      }

      // Calculate overall compatibility score
      const compatibilityScore = this.calculateWeightedScore(matchFactors, {
        locationMatch: 0.2,
        sportMatch: 0.3,
        skillMatch: 0.2,
        scheduleMatch: 0.2,
        budgetMatch: 0.0,
        personalityMatch: 0.1
      });

      if (compatibilityScore > 0.4) {
        matches.push({
          matchId: partner.user.id,
          compatibilityScore,
          matchFactors,
          item: partner.user,
          reasons
        });
      }
    }

    return matches;
  }

  private calculateLocationSimilarity(location1: string, location2: string): number {
    // Simple similarity calculation
    if (location1 === location2) return 1.0;
    if (location1.includes(location2) || location2.includes(location1)) return 0.8;
    
    // Check for common words
    const words1 = location1.split(/\s+/);
    const words2 = location2.split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    
    if (commonWords.length > 0) {
      return commonWords.length / Math.max(words1.length, words2.length);
    }
    
    return 0;
  }

  private isCompatibleExperienceLevel(level1: string, level2: string): boolean {
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const index1 = levels.indexOf(level1);
    const index2 = levels.indexOf(level2);
    
    if (index1 === -1 || index2 === -1) return false;
    
    // Compatible if within 1 level difference
    return Math.abs(index1 - index2) <= 1;
  }

  private calculateWeightedScore(
    factors: { [key: string]: number },
    weights: { [key: string]: number }
  ): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const [factor, weight] of Object.entries(weights)) {
      if (weight > 0 && factors[factor] !== undefined) {
        totalScore += factors[factor] * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private async saveSmartMatches(
    userId: string,
    matchType: string,
    matches: SmartMatchResult[]
  ): Promise<void> {
    if (matches.length === 0) return;

    // Delete existing matches of this type for the user
    await db
      .delete(smartMatches)
      .where(and(
        eq(smartMatches.userId, userId),
        eq(smartMatches.matchType, matchType)
      ));

    // Insert new matches
    const matchesToInsert = matches.map(match => ({
      userId,
      matchType,
      matchId: match.matchId,
      compatibilityScore: match.compatibilityScore.toString(),
      matchFactors: match.matchFactors as any,
      isRecommended: true
    }));

    await db.insert(smartMatches).values(matchesToInsert);
  }

  // Get saved smart matches for a user
  async getSmartMatches(userId: string, matchType?: string): Promise<SmartMatch[]> {
    const query = db
      .select()
      .from(smartMatches)
      .where(and(
        eq(smartMatches.userId, userId),
        matchType ? eq(smartMatches.matchType, matchType) : undefined
      ))
      .orderBy(desc(smartMatches.compatibilityScore))
      .limit(50);

    return await query;
  }

  // Update match feedback
  async updateMatchFeedback(
    userId: string,
    matchId: string,
    feedback: 'interested' | 'not_interested' | 'contacted'
  ): Promise<void> {
    await db
      .update(smartMatches)
      .set({ userFeedback: feedback })
      .where(and(
        eq(smartMatches.userId, userId),
        eq(smartMatches.matchId, matchId)
      ));
  }
}