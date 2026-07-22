import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import SurnaLogo from "@/components/SurnaLogo";
import { 
  UserStats, 
  PerformanceMetrics, 
  GoalData, 
  DarkTheme
} from "../../../shared/performance-types";
import { fetchGamificationUser, normalizeGamificationUserStats } from "@/lib/gamificationApi";
import { 
  MoreVertical, 
  MessageCircle, 
  Calendar,
  ShoppingBag,
  Trophy,
  Target,
  Zap,
  Award,
  TrendingUp,
  Users,
  Activity,
  Flame,
  Star,
  Clock,
  Eye,
  Gauge
} from "lucide-react";

// Theme colors - using CSS variables for proper theme support

export default function PerformanceHub() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Fetch user gamification data with proper typing
  const { data: userStats, isLoading } = useQuery<UserStats | null>({
    queryKey: ["/api/gamification/user"],
    queryFn: async () => {
      const raw = await fetchGamificationUser();
      return raw ? normalizeGamificationUserStats(raw) : null;
    },
    enabled: !!user?.id,
  });
  
  const performanceMetrics: PerformanceMetrics = {
    strength: 85,
    endurance: 72,
    speed: 68,
    recovery: 90
  };
  
  const goals: GoalData[] = [
    { 
      id: "goal-1", 
      name: "Bench Press", 
      current: 185, 
      target: 225, 
      unit: "lbs", 
      category: "strength", 
      progress: 82,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      priority: "medium"
    },
    { 
      id: "goal-2", 
      name: "5K Run", 
      current: "22:15", 
      target: "20:00", 
      unit: "time", 
      category: "endurance", 
      progress: 70,
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      priority: "high"
    },
    { 
      id: "goal-3", 
      name: "Sprint Speed", 
      current: 18.5, 
      target: 20, 
      unit: "mph", 
      category: "speed", 
      progress: 92,
      deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      priority: "high"
    },
    { 
      id: "goal-4", 
      name: "Sleep Quality", 
      current: 8.2, 
      target: 9, 
      unit: "hrs", 
      category: "recovery", 
      progress: 91,
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      priority: "low"
    }
  ];
  
  const stats = userStats;
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">Sign in to view your performance stats.</p>
      </div>
    );
  }

  const level = stats.currentLevel;
  const currentPoints = stats.currentXP;
  const pointsToNext = stats.xpToNext;
  
  // Calculate progress circle
  const circumference = 2 * Math.PI * 45;
  const progressPercentage = (currentPoints / (currentPoints + pointsToNext)) * 100;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  // Enhanced performance data - using theme colors
  const performanceData = {
    workouts: { count: stats.challenges.find(c => c.name.includes('workouts'))?.current || 12, label: "Workouts", colorClass: "text-primary" },
    calories: { count: 2456, label: "Calories", colorClass: "text-primary/80" },
    minutes: { count: 387, label: "Active mins", colorClass: "text-primary" },
    streak: { count: stats.streaks.dailyLogin, label: "Day Streak", colorClass: "text-primary" }
  };
  
  const getCategoryColorClass = (category: string) => {
    switch (category) {
      case "strength": return "text-primary";
      case "endurance": return "text-primary";
      case "speed": return "text-primary/80";
      case "recovery": return "text-primary/70";
      default: return "text-foreground";
    }
  };

  return (
    <div className="text-foreground min-h-screen relative bg-background">
      {/* Header */}
      <div className="flex justify-between items-center p-6 relative z-10">
        <SurnaLogo showText={true} className="text-2xl font-bold" />
        <div className="flex items-center gap-4">
          <MessageCircle 
            className="w-6 h-6 text-foreground cursor-pointer hover:opacity-70" 
            onClick={() => setLocation('/messages')}
            data-testid="messenger-icon"
          />
          <MoreVertical 
            className="w-6 h-6 text-foreground cursor-pointer hover:opacity-70" 
            onClick={() => setLocation('/settings')}
            data-testid="settings-menu"
          />
        </div>
      </div>

      {/* Performance Details */}
      <div className="px-6 py-4 relative z-10">
        <button 
          onClick={() => setLocation('/')}
          className="mb-6 px-4 py-2 rounded-lg bg-card text-card-foreground hover:bg-card/80 transition-colors"
          data-testid="back-to-home"
        >
          ← Back
        </button>

        <h2 className="text-3xl font-bold mb-4 text-foreground">Your Performance</h2>
        <button
          type="button"
          onClick={() => setLocation("/activity/track")}
          className="mb-8 w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2"
          style={{ background: "#1DB954", color: "#121212" }}
          data-testid="start-activity-track"
        >
          <Activity className="w-5 h-5" />
          Start live activity
        </button>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-lg bg-card">
              <Trophy className="w-8 h-8 mb-2 text-foreground" />
              <div className="text-2xl font-bold text-foreground">Level {level}</div>
              <div className="text-muted-foreground">Current Level</div>
            </div>
            <div className="p-4 rounded-lg bg-card">
              <Target className="w-8 h-8 mb-2 text-foreground" />
              <div className="text-2xl font-bold text-foreground">{currentPoints}</div>
              <div className="text-muted-foreground">Points Earned</div>
            </div>
            <div className="p-4 rounded-lg bg-card">
              <Zap className="w-8 h-8 mb-2 text-foreground" />
              <div className="text-2xl font-bold text-foreground">8</div>
              <div className="text-muted-foreground">Day Streak</div>
            </div>
            <div className="p-4 rounded-lg bg-card">
              <Award className="w-8 h-8 mb-2 text-foreground" />
              <div className="text-2xl font-bold text-foreground">3</div>
              <div className="text-muted-foreground">Achievements</div>
            </div>
        </div>

        {/* Enhanced Tabbed Interface */}
        <div className="mb-8">
            {/* Tab Navigation */}
            <div className="flex mb-6" style={{  }}>
              {['overview', 'goals', 'achievements', 'analytics'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 mr-4 capitalize transition-colors duration-200 ${
                    activeTab === tab ? 'text-foreground font-semibold' : 'text-muted-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Performance Metrics */}
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-foreground">Performance Metrics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(performanceMetrics).map(([key, value]) => (
                      <div key={key} className="p-4 rounded-lg bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <span className="capitalize text-foreground">{key}</span>
                          <span className={`text-sm ${getCategoryColorClass(key)}`}>
                            +{Math.floor(Math.random() * 15 + 5)}%
                          </span>
                        </div>
                        <div className={`text-2xl font-bold mb-2 ${getCategoryColorClass(key)}`}>
                          {value}%
                        </div>
                        <div className="w-full rounded-full h-2 bg-muted">
                          <div 
                            className={`h-2 rounded-full ${getCategoryColorClass(key).replace('text-', 'bg-')}`}
                            style={{ width: `${value}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Active Challenges */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-foreground">Active Challenges</h3>
                    <button
                      type="button"
                      onClick={() => setLocation('/challenges')}
                      className="text-sm text-primary hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  <div className="space-y-3">
                    {stats.challenges.map((challenge: any) => (
                      <button
                        key={challenge.id}
                        type="button"
                        onClick={() => setLocation('/challenges')}
                        className="w-full text-left p-4 rounded-lg bg-card hover:bg-card/80 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-foreground">{challenge.name}</span>
                          <span className="text-primary">
                            {challenge.current}/{challenge.target}
                          </span>
                        </div>
                        <div className="w-full rounded-full h-2 mt-2 bg-muted">
                          <div 
                            className="h-2 rounded-full bg-primary" 
                            style={{ width: `${challenge.progress}%` }}
                          ></div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'goals' && (
              <div>
                <h3 className="text-xl font-semibold mb-4 text-foreground">Current Goals</h3>
                <div className="space-y-4">
                  {goals.map((goal, index) => (
                    <div key={index} className="p-4 rounded-lg bg-card">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-foreground">{goal.name}</span>
                            <span className={`px-2 py-1 rounded text-xs bg-primary/20 ${getCategoryColorClass(goal.category)}`}>
                              {goal.category}
                            </span>
                          </div>
                          <div className="text-muted-foreground text-sm">
                            {goal.current} {goal.unit} / {goal.target} {goal.unit}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getCategoryColorClass(goal.category)}`}>
                            {goal.progress}%
                          </div>
                        </div>
                      </div>
                      <div className="w-full rounded-full h-2 mt-3 bg-muted">
                        <div 
                          className={`h-2 rounded-full ${getCategoryColorClass(goal.category).replace('text-', 'bg-')}`}
                          style={{ width: `${goal.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeTab === 'achievements' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-foreground">Achievements & Badges</h3>
                  <button
                    type="button"
                    onClick={() => setLocation('/gamification')}
                    className="text-sm text-primary hover:underline"
                  >
                    Open rewards hub
                  </button>
                </div>
                <div className="space-y-4">
                  {/* Badges */}
                  <div className="grid grid-cols-3 gap-3">
                    {stats.badges.map((badge: any) => (
                      <div key={badge.id} className="p-3 rounded-lg text-center bg-card">
                        <Award className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <div className="text-foreground text-xs font-semibold">
                          {badge.name}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {badge.rarity}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Recent Achievements */}
                  <div className="space-y-3">
                    {stats.achievements.map((achievement: any) => (
                      <div key={achievement.id} className="p-4 rounded-lg bg-card">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-foreground font-semibold">{achievement.title}</div>
                            <div className="text-muted-foreground text-sm">{achievement.description}</div>
                            <div className="text-primary text-xs">+{achievement.points} points</div>
                          </div>
                          <div className="text-right">
                            <div className="text-primary">{achievement.progress.percentage}%</div>
                            <div className="text-muted-foreground text-xs">
                              {achievement.progress.current}/{achievement.progress.target}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'analytics' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-foreground">Performance Analytics</h3>
                  <button
                    type="button"
                    onClick={() => setLocation('/analytics')}
                    className="text-sm text-primary hover:underline"
                  >
                    Full analytics
                  </button>
                </div>
                <div className="space-y-6">
                  {/* Stats Overview */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-card">
                      <div className="flex items-center mb-2">
                        <TrendingUp className="w-5 h-5 mr-2 text-primary" />
                        <span className="text-foreground">Total Points</span>
                      </div>
                      <div className="text-2xl font-bold text-primary">{stats.totalPoints}</div>
                      <div className="text-muted-foreground text-xs">Rank #{stats.rank} globally</div>
                    </div>
                    <div className="p-4 rounded-lg bg-card">
                      <div className="flex items-center mb-2">
                        <Flame className="w-5 h-5 mr-2 text-muted-foreground" />
                        <span className="text-foreground">Current Streak</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground">{stats.streaks.dailyLogin}</div>
                      <div className="text-muted-foreground text-xs">Best: {stats.streaks.longestStreak} days</div>
                    </div>
                  </div>
                  
                  {/* Weekly Performance */}
                  <div className="p-4 rounded-lg bg-card">
                    <h4 className="text-lg font-semibold mb-3 text-foreground">This Week's Performance</h4>
                    <div className="space-y-3">
                      {Object.entries(performanceData).slice(0, 3).map(([key, data]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="capitalize text-foreground">{data.label}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 rounded-full h-2 bg-muted">
                              <div 
                                className="h-2 rounded-full bg-primary" 
                                style={{ width: '70%' }}
                              ></div>
                            </div>
                            <span className="text-primary">{data.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Rewards */}
        <div>
            <h3 className="text-xl font-semibold mb-4 text-foreground">Recent Rewards</h3>
            <div className="space-y-3">
              <div className="p-4 rounded-lg flex items-center bg-card">
                <Trophy className="w-6 h-6 mr-3 text-primary" />
                <div>
                  <div className="text-foreground">Weekly Warrior</div>
                  <div className="text-muted-foreground">Completed 7 days in a row</div>
                </div>
              </div>
              <div className="p-4 rounded-lg flex items-center bg-card">
                <Award className="w-6 h-6 mr-3 text-primary" />
                <div>
                  <div className="text-foreground">First Achievement</div>
                  <div className="text-muted-foreground">Completed your first workout</div>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}