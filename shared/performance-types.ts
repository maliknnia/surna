// Comprehensive performance and gamification domain types
import { z } from "zod";

// Performance Metrics Types
export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface PerformanceMetrics {
  strength: number;
  endurance: number;
  speed: number;
  recovery: number;
}

// Gamification Types
export const BadgeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(['social', 'technical', 'performance', 'engagement', 'optimization', 'milestone']),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
  earnedAt: z.date(),
  iconUrl: z.string().optional()
});

export const AchievementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  points: z.number(),
  category: z.enum(['milestone', 'technical', 'social', 'performance', 'engagement']),
  progress: z.object({
    current: z.number(),
    target: z.number(),
    percentage: z.number()
  }),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
  completedAt: z.date().optional()
});

export const ChallengeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  current: z.number(),
  target: z.number(),
  progress: z.number(),
  color: z.string(),
  category: z.string(),
  deadline: z.date().optional(),
  reward: z.object({
    points: z.number(),
    badge: z.string().optional()
  }).optional()
});

export const ActivitySchema = z.object({
  id: z.string(),
  type: z.enum(['badge_earned', 'achievement_unlocked', 'challenge_completed', 'level_up', 'streak_milestone']),
  title: z.string(),
  description: z.string(),
  points: z.number().optional(),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional()
});

export const StreaksSchema = z.object({
  dailyLogin: z.number(),
  longestStreak: z.number(),
  weeklyActive: z.number().optional(),
  monthlyActive: z.number().optional(),
  lastActiveDate: z.date()
});

export const UserStatsSchema = z.object({
  totalPoints: z.number(),
  currentLevel: z.number(),
  xpToNext: z.number(),
  currentXP: z.number(),
  rank: z.number(),
  streaks: StreaksSchema,
  badges: z.array(BadgeSchema),
  achievements: z.array(AchievementSchema),
  recentActivity: z.array(ActivitySchema),
  challenges: z.array(ChallengeSchema)
});

// Derived Types
export type Badge = z.infer<typeof BadgeSchema>;
export type Achievement = z.infer<typeof AchievementSchema>;
export type Challenge = z.infer<typeof ChallengeSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type Streaks = z.infer<typeof StreaksSchema>;
export type UserStats = z.infer<typeof UserStatsSchema>;

// Goals and Performance Types
export interface GoalData {
  id: string;
  name: string;
  current: number | string;
  target: number | string;
  unit: string;
  category: 'strength' | 'endurance' | 'speed' | 'recovery';
  progress: number;
  deadline: Date;
  priority: 'low' | 'medium' | 'high';
}

export interface WorkoutData {
  id: string;
  date: string;
  type: string;
  duration: string;
  intensity: 'Low' | 'Medium' | 'High';
  caloriesBurned: number;
  notes?: string;
}

// Analytics Types
export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalSessions: number;
  avgSessionDuration: number;
  totalPageViews: number;
  totalPosts: number;
  totalEvents: number;
  totalTeamJoins: number;
  totalRevenue: number;
  bounceRate: number;
  conversionRate: number;
  retentionRate: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  avgSessionLength: number;
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label: string;
  dailyActiveUsers?: number;
  newUsers?: number;
  totalPosts?: number;
  totalLikes?: number;
  totalComments?: number;
}

export interface RealTimeData {
  activeUsers: number;
  recentEvents: number;
  timestamp: string;
  systemStatus: 'operational' | 'degraded' | 'down';
}

// Web Vitals Types
export interface WebVitalMetric {
  type: 'LCP' | 'FID' | 'CLS' | 'FCP' | 'TTFB';
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  threshold: number;
  unit: string;
  timestamp: number;
}

// API Response Types
export interface PerformanceAPIResponse {
  userStats: UserStats;
  performanceMetrics: PerformanceMetrics;
  goals: GoalData[];
  recentWorkouts: WorkoutData[];
  webVitals: WebVitalMetric[];
}

export interface AnalyticsAPIResponse {
  metrics: DashboardMetrics;
  timeSeries: {
    userActivity: TimeSeriesData[];
    userGrowth: TimeSeriesData[];
    contentEngagement: TimeSeriesData[];
    dailyMetrics: TimeSeriesData[];
  };
  realTime: RealTimeData;
}

// Theme Types
export interface DarkTheme {
  background: '#1a1522';
  text: '#f5f1ed';
  textMuted: '#b3a394';
  cardBackground: '#2d1b3d';
  border: '#3d2b4d';
  accent: {
    blue: '#3b82f6';
    green: '#10b981';
    orange: '#f59e0b';
    red: '#ef4444';
    purple: '#8b5cf6';
  };
}

// PerformanceCard specific data structure (for compatibility)
export interface RewardData {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
}

export interface TransactionData {
  id: string;
  points: number;
  action: string; // Changed from 'reason' to match actual DB field
  description: string | null;
  createdAt: Date | null;
  userId: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}

export interface PerformanceData {
  totalPoints: number;
  currentLevel: number;
  eventsAttended: number;
  teamsJoined: number;
  challengesCompleted: number;
  milestonesReached: string[];
  availableRewards: RewardData[];
  recentTransactions: TransactionData[];
}

// Default/Mock Data with Proper Types
export const createMockUserStats = (): UserStats => ({
  totalPoints: 2450,
  currentLevel: 8,
  xpToNext: 750,
  currentXP: 450,
  rank: 15,
  streaks: {
    dailyLogin: 12,
    longestStreak: 28,
    weeklyActive: 5,
    monthlyActive: 22,
    lastActiveDate: new Date()
  },
  badges: [
    {
      id: "1",
      name: "First Post",
      description: "Created your first post",
      category: "social",
      rarity: "common",
      earnedAt: new Date("2024-01-15"),
    },
    {
      id: "2", 
      name: "Social Butterfly",
      description: "Created 10 posts",
      category: "social",
      rarity: "rare",
      earnedAt: new Date("2024-02-01"),
    },
    {
      id: "3",
      name: "Event Master",
      description: "Attended 5 events",
      category: "engagement",
      rarity: "epic",
      earnedAt: new Date("2024-02-10"),
    },
  ],
  achievements: [
    {
      id: "1",
      title: "Level Up",
      description: "Reach level 10",
      points: 100,
      category: "milestone",
      progress: { current: 8, target: 10, percentage: 80 },
      rarity: "common",
    },
    {
      id: "2",
      title: "Point Collector",
      description: "Earn 5000 total points",
      points: 200,
      category: "milestone", 
      progress: { current: 2450, target: 5000, percentage: 49 },
      rarity: "rare",
    },
  ],
  recentActivity: [],
  challenges: [
    {
      id: "1",
      name: "Complete 15 workouts this month",
      description: "Stay consistent with your fitness routine",
      current: 12,
      target: 15,
      progress: 80,
      color: "#10b981",
      category: "fitness"
    },
    {
      id: "2",
      name: "Run 50km this month",
      description: "Build your endurance with regular running",
      current: 32,
      target: 50,
      progress: 64,
      color: "#f59e0b",
      category: "cardio"
    },
    {
      id: "3",
      name: "Attend 5 team events",
      description: "Engage with your community",
      current: 3,
      target: 5,
      progress: 60,
      color: "#3b82f6",
      category: "social"
    }
  ],
});

export const createMockAnalyticsData = (): AnalyticsAPIResponse => ({
  metrics: {
    totalUsers: 15420,
    activeUsers: 8340,
    newUsers: 1250,
    totalSessions: 24680,
    avgSessionDuration: 420,
    totalPageViews: 89500,
    totalPosts: 3240,
    totalEvents: 890,
    totalTeamJoins: 1680,
    totalRevenue: 45600,
    bounceRate: 32,
    conversionRate: 12.5,
    retentionRate: 68,
    dailyActiveUsers: 2800,
    weeklyActiveUsers: 8340,
    monthlyActiveUsers: 15420,
    avgSessionLength: 420
  },
  timeSeries: {
    userActivity: [
      { date: '2024-01-01', value: 2400, label: 'Jan 1' },
      { date: '2024-01-02', value: 2800, label: 'Jan 2' },
      { date: '2024-01-03', value: 3200, label: 'Jan 3' },
      { date: '2024-01-04', value: 2900, label: 'Jan 4' },
      { date: '2024-01-05', value: 3400, label: 'Jan 5' },
      { date: '2024-01-06', value: 3100, label: 'Jan 6' },
      { date: '2024-01-07', value: 3600, label: 'Jan 7' }
    ],
    userGrowth: [
      { date: '2024-01-01', value: 1200, label: 'Jan 1' },
      { date: '2024-01-02', value: 1350, label: 'Jan 2' },
      { date: '2024-01-03', value: 1420, label: 'Jan 3' },
      { date: '2024-01-04', value: 1380, label: 'Jan 4' },
      { date: '2024-01-05', value: 1500, label: 'Jan 5' },
      { date: '2024-01-06', value: 1620, label: 'Jan 6' },
      { date: '2024-01-07', value: 1750, label: 'Jan 7' }
    ],
    contentEngagement: [
      { date: '2024-01-01', value: 850, label: 'Jan 1' },
      { date: '2024-01-02', value: 920, label: 'Jan 2' },
      { date: '2024-01-03', value: 1100, label: 'Jan 3' },
      { date: '2024-01-04', value: 980, label: 'Jan 4' },
      { date: '2024-01-05', value: 1200, label: 'Jan 5' },
      { date: '2024-01-06', value: 1050, label: 'Jan 6' },
      { date: '2024-01-07', value: 1300, label: 'Jan 7' }
    ],
    dailyMetrics: []
  },
  realTime: {
    activeUsers: 340,
    recentEvents: 28,
    timestamp: new Date().toISOString(),
    systemStatus: 'operational'
  }
});

// Type Guards and Validation Helpers
export const isValidUserStats = (data: any): data is UserStats => {
  try {
    UserStatsSchema.parse(data);
    return true;
  } catch {
    return false;
  }
};

export const isValidBadge = (data: any): data is Badge => {
  try {
    BadgeSchema.parse(data);
    return true;
  } catch {
    return false;
  }
};

export const isValidAchievement = (data: any): data is Achievement => {
  try {
    AchievementSchema.parse(data);
    return true;
  } catch {
    return false;
  }
};

export const isValidChallenge = (data: any): data is Challenge => {
  try {
    ChallengeSchema.parse(data);
    return true;
  } catch {
    return false;
  }
};