import { db } from '../db';
import { 
  pointTransactions,
  badgeDefinitions,
  userBadges,
  userLevels,
  userStreaks,
  users,
  posts,
  events,
  teams
} from '@shared/schema';
import { eq, desc, asc, sql, and, or, sum, count, gte, lt, between } from 'drizzle-orm';
import { GamificationService, BadgeRequirement } from './gamificationService';
import { queueNotification } from '../notifications/pushService';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'individual' | 'team';
  category: 'activity' | 'social' | 'skill' | 'competition';
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  requirements: BadgeRequirement[];
  rewards: {
    points: number;
    badge?: string;
    title?: string;
    customReward?: string;
  };
  startDate: Date;
  endDate: Date;
  participantLimit?: number;
  currentParticipants: number;
  isActive: boolean;
  createdAt: Date;
}

export interface UserChallenge {
  id: string;
  userId: string;
  challengeId: string;
  status: 'active' | 'completed' | 'failed' | 'abandoned';
  progress: Record<string, number>;
  startedAt: Date;
  completedAt?: Date;
  rewardsClaimed: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  steps: QuestStep[];
  rewards: {
    points: number;
    badge?: string;
    unlocks?: string[]; // IDs of quests/features this unlocks
  };
  prerequisites?: string[]; // Required quest IDs
  category: string;
  estimatedDuration: string; // e.g., "30 minutes", "1 week"
  isActive: boolean;
}

export interface QuestStep {
  id: string;
  title: string;
  description: string;
  type: 'action' | 'achievement' | 'visit' | 'interaction';
  target: number;
  requirement: BadgeRequirement;
  order: number;
}

export class ChallengesService {
  
  // Predefined challenges that reset weekly/monthly
  static readonly WEEKLY_CHALLENGES: Omit<Challenge, 'id' | 'startDate' | 'endDate' | 'currentParticipants' | 'createdAt'>[] = [
    {
      title: "Social Butterfly",
      description: "Make 10 new friends and comment on 20 posts this week",
      type: "individual",
      category: "social",
      difficulty: "easy",
      requirements: [
        { type: 'count', metric: 'comments', target: 20, timeframe: 'weekly' },
        { type: 'count', metric: 'friends', target: 10, timeframe: 'weekly' }
      ],
      rewards: { points: 150, badge: "social-butterfly-weekly" },
      participantLimit: undefined,
      isActive: true
    },
    {
      title: "Content Creator",
      description: "Create 5 posts and get 50 total likes this week",
      type: "individual",
      category: "activity",
      difficulty: "medium",
      requirements: [
        { type: 'count', metric: 'posts', target: 5, timeframe: 'weekly' },
        { type: 'count', metric: 'post_likes_received', target: 50, timeframe: 'weekly' }
      ],
      rewards: { points: 200, badge: "content-creator-weekly" },
      participantLimit: undefined,
      isActive: true
    },
    {
      title: "Event Organizer",
      description: "Create 2 events and get 20 participants total",
      type: "individual",
      category: "skill",
      difficulty: "hard",
      requirements: [
        { type: 'count', metric: 'events_created', target: 2, timeframe: 'weekly' },
        { type: 'count', metric: 'event_participants', target: 20, timeframe: 'weekly' }
      ],
      rewards: { points: 300, badge: "event-organizer-weekly", title: "Event Master" },
      participantLimit: undefined,
      isActive: true
    },
    {
      title: "Team Builder",
      description: "Join 3 teams and help recruit 5 new team members",
      type: "individual",
      category: "social",
      difficulty: "medium",
      requirements: [
        { type: 'count', metric: 'teams_joined', target: 3, timeframe: 'weekly' },
        { type: 'count', metric: 'team_referrals', target: 5, timeframe: 'weekly' }
      ],
      rewards: { points: 250, badge: "team-builder-weekly" },
      participantLimit: undefined,
      isActive: true
    }
  ];

  static readonly MONTHLY_CHALLENGES: Omit<Challenge, 'id' | 'startDate' | 'endDate' | 'currentParticipants' | 'createdAt'>[] = [
    {
      title: "Rising Star",
      description: "Gain 1000 points and reach the next level this month",
      type: "individual",
      category: "activity",
      difficulty: "medium",
      requirements: [
        { type: 'points', target: 1000, timeframe: 'monthly' }
      ],
      rewards: { points: 500, badge: "rising-star-monthly", title: "Rising Star" },
      participantLimit: undefined,
      isActive: true
    },
    {
      title: "Community Champion",
      description: "Help 50 users, organize 5 events, and maintain a 30-day login streak",
      type: "individual",
      category: "social",
      difficulty: "extreme",
      requirements: [
        { type: 'count', metric: 'help_actions', target: 50, timeframe: 'monthly' },
        { type: 'count', metric: 'events_created', target: 5, timeframe: 'monthly' },
        { type: 'streak', metric: 'daily_login', target: 30 }
      ],
      rewards: { points: 1000, badge: "community-champion-monthly", title: "Community Champion" },
      participantLimit: 100,
      isActive: true
    }
  ];

  // Onboarding and progression quests
  static readonly ONBOARDING_QUESTS: Omit<Quest, 'id'>[] = [
    {
      title: "Welcome to SURNA",
      description: "Complete your profile and take your first steps in the community",
      steps: [
        {
          id: "1",
          title: "Complete Profile",
          description: "Add your bio, profile picture, and favorite sports",
          type: "action",
          target: 1,
          requirement: { type: 'custom', target: 1, metric: 'profile_completion' },
          order: 1
        },
        {
          id: "2", 
          title: "Make Your First Post",
          description: "Share something with the community",
          type: "action",
          target: 1,
          requirement: { type: 'count', target: 1, metric: 'posts' },
          order: 2
        },
        {
          id: "3",
          title: "Join a Team",
          description: "Find a team that matches your interests",
          type: "action", 
          target: 1,
          requirement: { type: 'count', target: 1, metric: 'teams_joined' },
          order: 3
        }
      ],
      rewards: { points: 100, badge: "newcomer" },
      prerequisites: undefined,
      category: "onboarding",
      estimatedDuration: "15 minutes",
      isActive: true
    },
    {
      title: "Social Starter",
      description: "Start connecting with other athletes and coaches",
      steps: [
        {
          id: "1",
          title: "Add 5 Friends",
          description: "Connect with other athletes",
          type: "action",
          target: 5,
          requirement: { type: 'count', target: 5, metric: 'friends' },
          order: 1
        },
        {
          id: "2",
          title: "Comment on 10 Posts", 
          description: "Engage with the community",
          type: "interaction",
          target: 10,
          requirement: { type: 'count', target: 10, metric: 'comments' },
          order: 2
        },
        {
          id: "3",
          title: "Attend an Event",
          description: "Join your first community event",
          type: "action",
          target: 1,
          requirement: { type: 'count', target: 1, metric: 'events_attended' },
          order: 3
        }
      ],
      rewards: { points: 150, badge: "social-starter", unlocks: ["athlete-progression"] },
      prerequisites: ["welcome-to-surna"],
      category: "social",
      estimatedDuration: "1 week", 
      isActive: true
    },
    {
      title: "Athlete Progression",
      description: "Focus on your athletic development and skill tracking",
      steps: [
        {
          id: "1",
          title: "Log Training Session",
          description: "Record your first workout or training session",
          type: "action",
          target: 1,
          requirement: { type: 'custom', target: 1, metric: 'training_logged' },
          order: 1
        },
        {
          id: "2",
          title: "Set Performance Goals",
          description: "Define what you want to achieve",
          type: "action",
          target: 3,
          requirement: { type: 'custom', target: 3, metric: 'goals_set' },
          order: 2
        },
        {
          id: "3",
          title: "Find a Coach",
          description: "Connect with a coach in your sport",
          type: "action", 
          target: 1,
          requirement: { type: 'custom', target: 1, metric: 'coach_connection' },
          order: 3
        }
      ],
      rewards: { points: 200, badge: "athlete", unlocks: ["advanced-training"] },
      prerequisites: ["social-starter"],
      category: "development",
      estimatedDuration: "2 weeks",
      isActive: true
    }
  ];

  // Generate weekly challenges
  static async generateWeeklyChallenges(): Promise<void> {
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    for (const challengeTemplate of this.WEEKLY_CHALLENGES) {
      const challengeId = `weekly_${challengeTemplate.title.toLowerCase().replace(/\s+/g, '_')}_${weekStart.getTime()}`;
      
      // Check if this week's challenge already exists
      // In a real implementation, you'd store challenges in the database
      console.log(`Generating weekly challenge: ${challengeTemplate.title} (${challengeId})`);
    }
  }

  // Generate monthly challenges  
  static async generateMonthlyChallenges(): Promise<void> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    for (const challengeTemplate of this.MONTHLY_CHALLENGES) {
      const challengeId = `monthly_${challengeTemplate.title.toLowerCase().replace(/\s+/g, '_')}_${monthStart.getTime()}`;
      
      console.log(`Generating monthly challenge: ${challengeTemplate.title} (${challengeId})`);
    }
  }

  // Check user progress on active challenges
  static async checkChallengeProgress(userId: string): Promise<{
    completedChallenges: string[];
    updatedProgress: Record<string, any>;
  }> {
    // In a real implementation, you would:
    // 1. Get user's active challenges from database
    // 2. Check progress against requirements
    // 3. Update progress and award rewards for completed challenges
    // 4. Send notifications for progress milestones
    
    const completedChallenges: string[] = [];
    const updatedProgress: Record<string, any> = {};

    // Example challenge progress checking
    const userLevel = await GamificationService.getUserLevel(userId);
    
    // Check if user completed "Rising Star" challenge (gain 1000 points in a month)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyPoints = await db
      .select({ total: sum(pointTransactions.points) })
      .from(pointTransactions)
      .where(
        and(
          eq(pointTransactions.userId, userId),
          gte(pointTransactions.createdAt, monthStart)
        )
      );

    const monthlyTotal = Number(monthlyPoints[0]?.total ?? 0);
    
    if (monthlyTotal >= 1000) {
      // User completed Rising Star challenge
      completedChallenges.push('rising-star-monthly');
      
      // Award rewards
      await GamificationService.awardPoints(userId, {
        action: 'CHALLENGE_COMPLETED',
        points: 500,
        description: 'Completed "Rising Star" monthly challenge',
        relatedEntityType: 'challenge',
        relatedEntityId: 'rising-star-monthly'
      });

      // Send notification
      await queueNotification({
        userId,
        title: 'Challenge Completed!',
        body: 'Congratulations! You completed the "Rising Star" challenge and earned 500 points!',
        type: 'gamification',
        data: { 
          challenge: 'rising-star-monthly',
          points: 500,
          badge: 'rising-star-monthly'
        }
      });
    }

    return {
      completedChallenges,
      updatedProgress: {
        'rising-star-monthly': {
          pointsProgress: monthlyTotal,
          pointsRequired: 1000,
          completed: Number(monthlyTotal) >= 1000
        }
      }
    };
  }

  // Check user progress on quests
  static async checkQuestProgress(userId: string): Promise<{
    completedQuests: string[];
    completedSteps: Array<{questId: string; stepId: string}>;
  }> {
    const completedQuests: string[] = [];
    const completedSteps: Array<{questId: string; stepId: string}> = [];

    // Check onboarding quest progress
    for (const quest of this.ONBOARDING_QUESTS) {
      let questCompleted = true;

      for (const step of quest.steps) {
        const stepCompleted = await this.checkQuestStepProgress(userId, step);
        
        if (stepCompleted && !completedSteps.some(cs => cs.questId === quest.title && cs.stepId === step.id)) {
          completedSteps.push({ questId: quest.title, stepId: step.id });
          
          // Award step completion points (smaller reward)
          await GamificationService.awardPoints(userId, {
            action: 'QUEST_STEP_COMPLETED',
            points: 20,
            description: `Completed quest step: ${step.title}`,
            relatedEntityType: 'quest_step',
            relatedEntityId: `${quest.title}_${step.id}`
          });
        }

        if (!stepCompleted) {
          questCompleted = false;
        }
      }

      if (questCompleted && !completedQuests.includes(quest.title)) {
        completedQuests.push(quest.title);
        
        // Award quest completion rewards
        await GamificationService.awardPoints(userId, {
          action: 'QUEST_COMPLETED',
          points: quest.rewards.points,
          description: `Completed quest: ${quest.title}`,
          relatedEntityType: 'quest',
          relatedEntityId: quest.title
        });

        // Send notification
        await queueNotification({
          userId,
          title: 'Quest Completed!',
          body: `Congratulations! You completed the "${quest.title}" quest!`,
          type: 'gamification',
          data: { 
            quest: quest.title,
            points: quest.rewards.points,
            badge: quest.rewards.badge,
            unlocks: quest.rewards.unlocks
          }
        });
      }
    }

    return { completedQuests, completedSteps };
  }

  // Check individual quest step progress
  private static async checkQuestStepProgress(userId: string, step: QuestStep): Promise<boolean> {
    const requirement = step.requirement;

    switch (requirement.type) {
      case 'count': {
        let query;
        switch (requirement.metric) {
          case 'posts':
            query = db
              .select({ count: count() })
              .from(posts)
              .where(eq(posts.authorId, userId));
            break;
          case 'comments':
            // Would need to implement post comments counting
            return false; // Placeholder
          case 'teams_joined':
            // Would need to implement team membership counting
            return false; // Placeholder
          case 'friends':
            // Would need to implement friends counting
            return false; // Placeholder
          default:
            return false;
        }

        const result = await query;
        return result[0]?.count >= requirement.target;
      }

      case 'custom': {
        switch (requirement.metric) {
          case 'profile_completion': {
            const [user] = await db
              .select()
              .from(users)
              .where(eq(users.id, userId))
              .limit(1);

            if (!user) return false;

            // Check if profile is complete (has bio, profile image, etc.)
            const hasProfileImage = !!user.profileImageUrl;
            const hasBio = !!user.bio; // Note: bio column doesn't exist yet in schema
            const hasFirstName = !!user.firstName;
            const hasLastName = !!user.lastName;

            return hasProfileImage && hasBio && hasFirstName && hasLastName;
          }
          
          default:
            return false;
        }
      }

      default:
        return false;
    }
  }

  // Get available challenges for a user
  static async getAvailableChallenges(userId: string): Promise<Challenge[]> {
    const challenges: Challenge[] = [];
    
    // Add current weekly challenges
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    for (const template of this.WEEKLY_CHALLENGES) {
      challenges.push({
        ...template,
        id: `weekly_${template.title.toLowerCase().replace(/\s+/g, '_')}_${weekStart.getTime()}`,
        startDate: weekStart,
        endDate: weekEnd,
        currentParticipants: 0, // Would get from database
        createdAt: weekStart
      });
    }

    // Add current monthly challenges
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    for (const template of this.MONTHLY_CHALLENGES) {
      challenges.push({
        ...template,
        id: `monthly_${template.title.toLowerCase().replace(/\s+/g, '_')}_${monthStart.getTime()}`,
        startDate: monthStart,
        endDate: monthEnd,
        currentParticipants: 0, // Would get from database
        createdAt: monthStart
      });
    }

    return challenges;
  }

  // Get available quests for a user
  static async getAvailableQuests(userId: string): Promise<Quest[]> {
    // In a real implementation, you would:
    // 1. Check user's completed quests
    // 2. Filter by prerequisites
    // 3. Return available quests

    const quests: Quest[] = this.ONBOARDING_QUESTS.map(quest => ({
      ...quest,
      id: quest.title.toLowerCase().replace(/\s+/g, '-')
    }));

    return quests;
  }

  // Start a challenge for a user
  static async startChallenge(userId: string, challengeId: string): Promise<boolean> {
    try {
      // In a real implementation, you would:
      // 1. Check if challenge exists and is active
      // 2. Check if user is already participating
      // 3. Add user to challenge participants
      // 4. Initialize progress tracking

      await queueNotification({
        userId,
        title: 'Challenge Started!',
        body: `You've joined a new challenge. Good luck!`,
        type: 'gamification',
        data: { challengeId }
      });

      return true;
    } catch (error) {
      console.error('Error starting challenge:', error);
      return false;
    }
  }

  // Get user's active challenges and progress
  static async getUserChallengeProgress(userId: string): Promise<{
    activeChallenges: Array<{
      challenge: Challenge;
      progress: Record<string, any>;
      timeRemaining: string;
    }>;
    completedChallenges: Array<{
      challenge: Challenge;
      completedAt: Date;
      rewardsEarned: any;
    }>;
  }> {
    // This would be implemented with actual database queries
    // For now, return sample data structure
    
    return {
      activeChallenges: [],
      completedChallenges: []
    };
  }
}
