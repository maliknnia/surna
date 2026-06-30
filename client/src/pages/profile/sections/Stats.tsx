import { useQuery } from '@tanstack/react-query';
import { Trophy, Target, TrendingUp, Flame } from 'lucide-react';
import { MatchResultBadge } from '@/components/entity';
import { statCardSurface, type StatCardTone } from '@/lib/statCardStyle';

interface StatsProps {
  userId: string;
}

interface PerformanceApi {
  aiSummary?: string;
  recentMatches?: Array<{ opponent: string; date: string; result?: string; score?: string }>;
  monthlyGoals?: { completed?: number; total?: number };
  improvementRate?: number;
  consistency?: string | number;
  weeklyActivity?: number[];
}

const STAT_ITEMS: Array<{
  key: keyof PerformanceApi | 'wins';
  label: string;
  tone: StatCardTone;
  icon: typeof Trophy;
}> = [
  { key: 'wins', label: 'Recent Wins', tone: 'win', icon: Trophy },
  { key: 'monthlyGoals', label: 'Monthly Goals', tone: 'accent', icon: Target },
  { key: 'improvementRate', label: 'Improvement', tone: 'amber', icon: TrendingUp },
  { key: 'consistency', label: 'Consistency', tone: 'gold', icon: Flame },
];

export default function Stats({ userId }: StatsProps) {
  const { data, isLoading } = useQuery<PerformanceApi>({
    queryKey: ['/api/profile', userId, 'performance'],
  });

  const performance: PerformanceApi = data ?? {};

  if (isLoading) {
    return <div className="py-12 text-center text-token-text">Loading stats...</div>;
  }

  const statValues: Record<string, string | number> = {
    wins: performance.recentMatches?.filter((m) => m.result === 'win').length || 0,
    monthlyGoals: `${performance.monthlyGoals?.completed || 0}/${performance.monthlyGoals?.total || 0}`,
    improvementRate: `${performance.improvementRate || 0}%`,
    consistency: performance.consistency || 'N/A',
  };

  return (
    <div className="space-y-6">
      {performance.aiSummary && (
        <div
          className="p-6 rounded-2xl"
          style={{
            background: statCardSurface('accent').background,
            border: `1px solid ${statCardSurface('accent').border}`,
          }}
        >
          <div className="flex items-start gap-3">
            <TrendingUp size={24} className="flex-shrink-0 mt-1" style={{ color: statCardSurface('accent').iconColor }} />
            <div>
              <h3 className="text-lg font-semibold text-token-text mb-2">AI Performance Insight</h3>
              <p className="text-token-text/90">{performance.aiSummary}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_ITEMS.map((item) => {
          const surface = statCardSurface(item.tone);
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="p-5 rounded-2xl text-center"
              style={{ background: surface.background, border: `1px solid ${surface.border}` }}
            >
              <Icon size={28} className="mx-auto mb-3" style={{ color: surface.iconColor }} />
              <div className="text-3xl font-bold tabular-nums mb-1" style={{ color: surface.valueColor }}>
                {statValues[item.key]}
              </div>
              <div className="text-sm" style={{ color: surface.labelColor }}>
                {item.label}
              </div>
            </div>
          );
        })}
      </div>

      {performance.weeklyActivity && (() => {
        const weekly = performance.weeklyActivity;
        const maxVal = Math.max(...weekly, 1);
        const chartSurface = statCardSurface('neutral');
        return (
          <div
            className="p-6 rounded-2xl"
            style={{ background: chartSurface.background, border: `1px solid ${chartSurface.border}` }}
          >
            <h3 className="text-lg font-semibold text-token-text mb-4">Weekly Activity</h3>
            <div className="flex items-end justify-between gap-2 h-48">
              {weekly.map((value: number, index: number) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${(value / maxVal) * 100}%`,
                      background: statCardSurface('accent').iconColor,
                      opacity: 0.85,
                    }}
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

      {performance.recentMatches && performance.recentMatches.length > 0 && (
        <div
          className="p-6 rounded-2xl"
          style={{
            background: statCardSurface('neutral').background,
            border: `1px solid ${statCardSurface('neutral').border}`,
          }}
        >
          <h3 className="text-lg font-semibold text-token-text mb-4">Recent Matches</h3>
          <div className="space-y-3">
            {performance.recentMatches.map((match, index) => {
              const resultKind =
                match.result === 'win' ? 'win' : match.result === 'loss' ? 'loss' : 'draw';
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{
                    background: statCardSurface('neutral').background,
                    border: `1px solid ${statCardSurface('neutral').border}`,
                  }}
                >
                  <div>
                    <div className="font-medium text-token-text">vs {match.opponent}</div>
                    <div className="text-xs text-token-text-secondary">{match.date}</div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    {match.result ? <MatchResultBadge result={resultKind} compact /> : null}
                    {match.score ? (
                      <div className="text-xs text-token-text-secondary">{match.score}</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
