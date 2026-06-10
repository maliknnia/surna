import { useQuery } from '@tanstack/react-query';
import { Trophy, Award } from 'lucide-react';
import { format } from 'date-fns';

interface AchievementsProps {
  userId: string;
}

interface AchievementsApi {
  achievements: Array<{ title: string; description?: string; tier: string; date: string }>;
}

export default function Achievements({ userId }: AchievementsProps) {
  const { data, isLoading } = useQuery<AchievementsApi>({
    queryKey: ['/api/profile', userId, 'achievements'],
  });

  const achievements = data?.achievements ?? [];

  if (isLoading) {
    return <div className="py-12 text-center text-token-text">Loading achievements...</div>;
  }

  if (achievements.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 text-token-text-muted mx-auto mb-4" />
        <p className="text-token-text-secondary">No achievements unlocked yet</p>
      </div>
    );
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'border-orange-700 bg-orange-700/10';
      case 'silver': return 'border-gray-400 bg-gray-400/10';
      case 'gold': return 'border-yellow-500 bg-yellow-500/10';
      case 'platinum': return 'border-foreground bg-foreground/10';
      default: return 'border-border bg-transparent';
    }
  };

  const getTierIcon = (tier: string) => {
    const size = tier === 'platinum' ? 48 : tier === 'gold' ? 44 : 40;
    return <Trophy size={size} className="text-token-accent" />;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {achievements.map((achievement: any) => (
        <div
          key={achievement.title}
          className={`p-6 border rounded-xl ${getTierColor(achievement.tier)} hover:scale-105 transition-transform`}
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-4">
              {getTierIcon(achievement.tier)}
            </div>
            <h3 className="text-lg font-semibold text-token-text mb-2">{achievement.title}</h3>
            {achievement.description && (
              <p className="text-sm text-token-text-secondary mb-3">{achievement.description}</p>
            )}
            <div className="text-xs text-token-text-muted">
              Unlocked {format(new Date(achievement.date), 'MMM d, yyyy')}
            </div>
            <div className="mt-3 px-3 py-1 bg-background rounded-full">
              <span className="text-xs text-token-text capitalize">{achievement.tier} Tier</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
