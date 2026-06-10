import { useQuery } from '@tanstack/react-query';
import { Trophy, Target, TrendingUp, Flame } from 'lucide-react';

interface StatsProps {
  userId: string;
}

interface PerformanceApi {
  aiSummary?: string;
  recentMatches?: Array<{ opponent: string; date: string; result?: string }>;
  monthlyGoals?: { completed?: number; total?: number };
  improvementRate?: number;
  consistency?: string | number;
  weeklyActivity?: number[];
}

export default function Stats({ userId }: StatsProps) {
  const { data, isLoading } = useQuery<PerformanceApi>({
    queryKey: ['/api/profile', userId, 'performance'],
  });

  const performance: PerformanceApi = data ?? {};

  if (isLoading) {
    return <div className="py-12 text-center text-token-text">Loading stats...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Performance Summary */}
      {performance.aiSummary && (
        <div className="p-6 bg-gradient-to-br from-token-accent/10 to-token-accent/10 border border-token-accent/30 rounded-xl">
          <div className="flex items-start gap-3">
            <TrendingUp size={24} className="text-token-accent flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-token-text mb-2">AI Performance Insight</h3>
              <p className="text-token-text/90">{performance.aiSummary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-6 bg-transparent border border-border rounded-xl text-center">
          <Trophy size={32} className="text-token-accent mx-auto mb-3" />
          <div className="text-3xl font-bold text-token-text mb-1">
            {performance.recentMatches?.filter((m: any) => m.result === 'win').length || 0}
          </div>
          <div className="text-sm text-token-text-secondary">Recent Wins</div>
        </div>

        <div className="p-6 bg-transparent border border-border rounded-xl text-center">
          <Target size={32} className="text-token-accent mx-auto mb-3" />
          <div className="text-3xl font-bold text-token-text mb-1">
            {performance.monthlyGoals?.completed || 0}/{performance.monthlyGoals?.total || 0}
          </div>
          <div className="text-sm text-token-text-secondary">Monthly Goals</div>
        </div>

        <div className="p-6 bg-transparent border border-border rounded-xl text-center">
          <TrendingUp size={32} className="text-token-accent mx-auto mb-3" />
          <div className="text-3xl font-bold text-token-text mb-1">
            {performance.improvementRate || 0}%
          </div>
          <div className="text-sm text-token-text-secondary">Improvement</div>
        </div>

        <div className="p-6 bg-transparent border border-border rounded-xl text-center">
          <Flame size={32} className="text-orange-500 mx-auto mb-3" />
          <div className="text-3xl font-bold text-token-text mb-1">
            {performance.consistency || 'N/A'}
          </div>
          <div className="text-sm text-token-text-secondary">Consistency</div>
        </div>
      </div>

      {/* Weekly Activity Chart */}
      {performance.weeklyActivity && (() => {
        const weekly = performance.weeklyActivity;
        const maxVal = Math.max(...weekly);
        return (
        <div className="p-6 bg-transparent border border-border rounded-xl">
          <h3 className="text-lg font-semibold text-token-text mb-4">Weekly Activity</h3>
          <div className="flex items-end justify-between gap-2 h-48">
            {weekly.map((value: number, index: number) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-gradient-to-t from-token-accent to-token-accent rounded-t"
                  style={{ height: `${(value / maxVal) * 100}%` }}
                />
                <span className="text-xs text-token-text-secondary">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
                </span>
              </div>
            ))}
          </div>
        </div>
        );
      })()}

      {/* Recent Matches */}
      {performance.recentMatches && performance.recentMatches.length > 0 && (
        <div className="p-6 bg-transparent border border-border rounded-xl">
          <h3 className="text-lg font-semibold text-token-text mb-4">Recent Matches</h3>
          <div className="space-y-3">
            {performance.recentMatches.map((match: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
                <div>
                  <div className="font-medium text-token-text">vs {match.opponent}</div>
                  <div className="text-xs text-token-text-secondary">{match.date}</div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${
                    match.result === 'win' ? 'text-green-400' : 
                    match.result === 'loss' ? 'text-red-400' : 'text-token-text'
                  }`}>
                    {match.result.toUpperCase()}
                  </div>
                  <div className="text-xs text-token-text-secondary">{match.score}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
