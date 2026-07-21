// UnifiedDashboard - Combined PerformanceDashboard + GamificationDashboard with dark theme
import { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { Trophy, Star, Target, Flame, Award, TrendingUp, Clock, Users, Zap, Eye, Gauge } from 'lucide-react';
import { 
  UserStats, 
  PerformanceMetric, 
  WebVitalMetric,
  DarkTheme 
} from "../../../shared/performance-types";
import { fetchGamificationUser, normalizeGamificationUserStats } from "@/lib/gamificationApi";

interface UnifiedDashboardProps {
  userId?: string;
  className?: string;
  showWebVitals?: boolean;
  showGamification?: boolean;
}

export function UnifiedDashboard({ 
  userId, 
  className = "",
  showWebVitals = true,
  showGamification = true 
}: UnifiedDashboardProps) {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  const { trackCustomMetric } = usePerformanceMonitoring({
    enableLogging: true,
    onMetric: (metric) => {
      setMetrics(prev => [...prev.slice(-19), metric]); // Keep last 20 metrics
    }
  });

  // Fetch user gamification data
  const { data: userStats, isLoading: statsLoading } = useQuery<UserStats | null>({
    queryKey: ["/api/gamification/user", userId],
    queryFn: async () => {
      const raw = await fetchGamificationUser();
      return raw ? normalizeGamificationUserStats(raw) : null;
    },
    enabled: !!userId && showGamification,
  });

  const { data: leaderboardData } = useQuery({
    queryKey: ["/api/gamification/leaderboard", "points", "all-time"],
    enabled: showGamification,
  });

  const stats = userStats;

  const getMetricsByType = (type: string) => {
    return metrics.filter(m => m.name.includes(type));
  };

  const getAverageValue = (metricType: string) => {
    const typeMetrics = getMetricsByType(metricType);
    if (typeMetrics.length === 0) return 0;
    return typeMetrics.reduce((sum, m) => sum + m.value, 0) / typeMetrics.length;
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'var(--surna-text)';
      case 'needs-improvement': return 'var(--surna-bg-highlight)';
      case 'poor': return '#1a1625';
      default: return 'var(--surna-text)';
    }
  };

  const getRatingProgress = (rating: string) => {
    switch (rating) {
      case 'good': return 90;
      case 'needs-improvement': return 60;
      case 'poor': return 30;
      default: return 0;
    }
  };

  const getBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'var(--surna-text)';
      case 'epic': return 'var(--surna-bg-highlight)';
      case 'rare': return 'var(--surna-text)';
      case 'common': return 'var(--surna-text)';
      default: return 'var(--surna-text)';
    }
  };

  const webVitalsMetrics = [
    { type: 'LCP', name: 'Largest Contentful Paint', icon: Eye, unit: 'ms', threshold: 2500 },
    { type: 'FID', name: 'First Input Delay', icon: Clock, unit: 'ms', threshold: 100 },
    { type: 'CLS', name: 'Cumulative Layout Shift', icon: Zap, unit: '', threshold: 0.1 },
    { type: 'FCP', name: 'First Contentful Paint', icon: Gauge, unit: 'ms', threshold: 1800 }
  ];

  if (showGamification && statsLoading) {
    return (
      <div className={`p-6 ${className}`} style={{ color: "var(--surna-text)" }}>
        Loading stats…
      </div>
    );
  }

  if (showGamification && !stats) {
    return (
      <div className={`p-6 ${className}`} style={{ color: "var(--surna-text-secondary)" }}>
        Sign in to view gamification stats.
      </div>
    );
  }

  const displayStats = stats as UserStats;

  return (
    <div 
      className={`space-y-6 p-6 ${className}`}
      style={{ 
        backgroundColor: 'var(--surna-elevated)',
        color: 'var(--surna-text)',
        border: '1px solid var(--surna-border)',
        borderRadius: '12px'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="w-6 h-6" style={{ color: 'var(--surna-text)' }} />
          <h2 className="text-2xl font-bold" style={{ color: 'var(--surna-text)' }}>
            Performance & Gamification Dashboard
          </h2>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-2">
          {showWebVitals && showGamification && (
            <>
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'overview' ? 'font-semibold' : ''
                }`}
                style={{
                  backgroundColor: activeTab === 'overview' ? 'var(--surna-bg-highlight)' : 'transparent',
                  color: activeTab === 'overview' ? 'var(--surna-text)' : 'var(--surna-text)'
                }}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('vitals')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'vitals' ? 'font-semibold' : ''
                }`}
                style={{
                  backgroundColor: activeTab === 'vitals' ? 'var(--surna-bg-highlight)' : 'transparent',
                  color: activeTab === 'vitals' ? 'var(--surna-text)' : 'var(--surna-text)'
                }}
              >
                Web Vitals
              </button>
              <button
                onClick={() => setActiveTab('gamification')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'gamification' ? 'font-semibold' : ''
                }`}
                style={{
                  backgroundColor: activeTab === 'gamification' ? 'var(--surna-bg-highlight)' : 'transparent',
                  color: activeTab === 'gamification' ? 'var(--surna-text)' : 'var(--surna-text)'
                }}
              >
                Achievements
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {showGamification && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--surna-bg-highlight)' }}>
                <div className="flex items-center mb-2">
                  <Trophy className="w-5 h-5 mr-2" style={{ color: 'var(--surna-text)' }} />
                  <span style={{ color: 'var(--surna-text)', fontSize: '0.9rem' }}>Level</span>
                </div>
                <div className="text-2xl font-bold" style={{ color: 'var(--surna-text)' }}>{displayStats.currentLevel}</div>
                <div style={{ color: 'var(--surna-text)', fontSize: '0.8rem' }}>{displayStats.currentXP}/{displayStats.xpToNext} XP</div>
              </div>
            )}
            
            {showGamification && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--surna-bg-highlight)' }}>
                <div className="flex items-center mb-2">
                  <Star className="w-5 h-5 mr-2" style={{ color: 'var(--surna-text)' }} />
                  <span style={{ color: 'var(--surna-text)', fontSize: '0.9rem' }}>Points</span>
                </div>
                <div className="text-2xl font-bold" style={{ color: 'var(--surna-text)' }}>{displayStats.totalPoints.toLocaleString()}</div>
                <div style={{ color: 'var(--surna-text)', fontSize: '0.8rem' }}>Rank #{displayStats.rank}</div>
              </div>
            )}

            {showGamification && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--surna-bg-highlight)' }}>
                <div className="flex items-center mb-2">
                  <Flame className="w-5 h-5 mr-2" style={{ color: 'var(--surna-text)' }} />
                  <span style={{ color: 'var(--surna-text)', fontSize: '0.9rem' }}>Streak</span>
                </div>
                <div className="text-2xl font-bold" style={{ color: 'var(--surna-text)' }}>{displayStats.streaks.dailyLogin}</div>
                <div style={{ color: 'var(--surna-text)', fontSize: '0.8rem' }}>Best: {displayStats.streaks.longestStreak}</div>
              </div>
            )}

            {showWebVitals && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--surna-bg-highlight)' }}>
                <div className="flex items-center mb-2">
                  <Gauge className="w-5 h-5 mr-2" style={{ color: 'var(--surna-text)' }} />
                  <span style={{ color: 'var(--surna-text)', fontSize: '0.9rem' }}>Performance</span>
                </div>
                <div className="text-2xl font-bold" style={{ color: 'var(--surna-text)' }}>92</div>
                <div style={{ color: 'var(--surna-text)', fontSize: '0.8rem' }}>Excellent</div>
              </div>
            )}
          </div>

          {/* Recent Achievements */}
          {showGamification && (
            <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--surna-bg-highlight)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--surna-text)' }}>Recent Achievements</h3>
              <div className="space-y-3">
                {displayStats.achievements.slice(0, 3).map((achievement: any) => (
                  <div key={achievement.id} className="flex items-center justify-between p-3 rounded-lg" 
                       style={{ backgroundColor: 'var(--surna-base)' }}>
                    <div className="flex items-center">
                      <Award className="w-5 h-5 mr-3" style={{ color: getBadgeColor(achievement.rarity) }} />
                      <div>
                        <div style={{ color: 'var(--surna-text)', fontWeight: '600', fontSize: '0.9rem' }}>{achievement.title}</div>
                        <div style={{ color: 'var(--surna-text)', fontSize: '0.8rem' }}>{achievement.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div style={{ color: 'var(--surna-text)', fontSize: '0.9rem' }}>+{achievement.points}</div>
                      <div style={{ color: 'var(--surna-text)', fontSize: '0.8rem' }}>{achievement.progress.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'vitals' && showWebVitals && (
        <div className="space-y-6">
          {/* Core Web Vitals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {webVitalsMetrics.map((vital) => {
              const latestMetric = getMetricsByType(vital.type).slice(-1)[0];
              const averageValue = getAverageValue(vital.type);
              
              return (
                <div key={vital.type} className="p-6 rounded-lg" style={{ backgroundColor: 'var(--surna-bg-highlight)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <vital.icon className="w-6 h-6" style={{ color: 'var(--surna-text)' }} />
                    <span 
                      className="px-2 py-1 rounded text-xs"
                      style={{ 
                        backgroundColor: getRatingColor(latestMetric?.rating || 'poor') + '20',
                        color: getRatingColor(latestMetric?.rating || 'poor')
                      }}
                    >
                      {latestMetric?.rating || 'N/A'}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--surna-text)' }}>{vital.name}</h3>
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold" style={{ color: 'var(--surna-text)' }}>
                        {latestMetric ? Math.round(latestMetric.value) : '-'}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--surna-text)' }}>{vital.unit}</span>
                    </div>
                    <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--surna-bg-highlight)' }}>
                      <div 
                        className="h-2 rounded-full transition-all duration-500" 
                        style={{ 
                          backgroundColor: getRatingColor(latestMetric?.rating || 'poor'),
                          width: `${latestMetric ? getRatingProgress(latestMetric.rating) : 0}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs" style={{ color: 'var(--surna-text)' }}>
                      Avg: {Math.round(averageValue)}{vital.unit} | Threshold: {vital.threshold}{vital.unit}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Performance Tips */}
          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--surna-bg-highlight)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--surna-text)' }}>Performance Tips</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <TrendingUp className="w-5 h-5 mr-3 mt-0.5" style={{ color: 'var(--surna-text)' }} />
                <div>
                  <div style={{ color: 'var(--surna-text)', fontSize: '0.9rem', fontWeight: '600' }}>Optimize Images</div>
                  <div style={{ color: 'var(--surna-text)', fontSize: '0.8rem' }}>Use WebP format and proper sizing for better LCP scores</div>
                </div>
              </div>
              <div className="flex items-start">
                <Zap className="w-5 h-5 mr-3 mt-0.5" style={{ color: 'var(--surna-text)' }} />
                <div>
                  <div style={{ color: 'var(--surna-text)', fontSize: '0.9rem', fontWeight: '600' }}>Reduce JavaScript</div>
                  <div style={{ color: 'var(--surna-text)', fontSize: '0.8rem' }}>Split bundles and lazy load components to improve FID</div>
                </div>
              </div>
              <div className="flex items-start">
                <Target className="w-5 h-5 mr-3 mt-0.5" style={{ color: 'var(--surna-text)' }} />
                <div>
                  <div style={{ color: 'var(--surna-text)', fontSize: '0.9rem', fontWeight: '600' }}>Stable Layout</div>
                  <div style={{ color: 'var(--surna-text)', fontSize: '0.8rem' }}>Reserve space for images and ads to minimize CLS</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'gamification' && showGamification && (
        <div className="space-y-6">
          {/* Badges Grid */}
          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--surna-bg-highlight)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--surna-text)' }}>Earned Badges</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {displayStats.badges.map((badge: any) => (
                <div key={badge.id} className="text-center p-3 rounded-lg" 
                     style={{ backgroundColor: 'var(--surna-base)' }}>
                  <Award className="w-8 h-8 mx-auto mb-2" style={{ color: getBadgeColor(badge.rarity) }} />
                  <div style={{ color: 'var(--surna-text)', fontSize: '0.8rem', fontWeight: '600' }}>{badge.name}</div>
                  <div style={{ color: 'var(--surna-text)', fontSize: '0.7rem' }}>{badge.rarity}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Tracking */}
          <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--surna-bg-highlight)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--surna-text)' }}>Achievement Progress</h3>
            <div className="space-y-4">
              {displayStats.achievements.map((achievement: any) => (
                <div key={achievement.id} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--surna-base)' }}>
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <div style={{ color: 'var(--surna-text)', fontWeight: '600' }}>{achievement.title}</div>
                      <div style={{ color: 'var(--surna-text)', fontSize: '0.9rem' }}>{achievement.description}</div>
                    </div>
                    <div className="text-right">
                      <div style={{ color: getBadgeColor(achievement.rarity) }}>+{achievement.points}</div>
                      <div style={{ color: 'var(--surna-text)', fontSize: '0.8rem' }}>{achievement.progress.percentage}%</div>
                    </div>
                  </div>
                  <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--surna-bg-highlight)' }}>
                    <div 
                      className="h-2 rounded-full transition-all duration-500" 
                      style={{ 
                        backgroundColor: getBadgeColor(achievement.rarity),
                        width: `${achievement.progress.percentage}%` 
                      }}
                    ></div>
                  </div>
                  <div className="mt-2 text-xs" style={{ color: 'var(--surna-text)' }}>
                    {achievement.progress.current} / {achievement.progress.target} completed
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}