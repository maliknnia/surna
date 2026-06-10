import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Loader2, Trophy, Target, Medal, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchChallengesList, fetchUserRatings } from '@/lib/challengesApi';

interface ChallengeHistoryProps {
  userId: string;
}

export default function ChallengeHistory({ userId }: ChallengeHistoryProps) {
  const [, setLocation] = useLocation();

  const { data: challengesData, isLoading } = useQuery({
    queryKey: ['challenges-list', 'user', userId],
    queryFn: () => fetchChallengesList({ userId }),
    enabled: !!userId,
  });

  const { data: ratingsData } = useQuery({
    queryKey: ['challenges-ratings', userId],
    queryFn: () => fetchUserRatings(userId),
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 text-token-text animate-spin" />
      </div>
    );
  }

  const matches = (challengesData as any)?.matches || [];
  const userRatings = (ratingsData as any)?.ratings || [];

  const stats = {
    total: matches.length,
    wins: matches.filter((m: any) => {
      const result = m.result;
      const isHost = m.creatorId === userId;
      return result?.outcome === (isHost ? 'hostWin' : 'guestWin');
    }).length,
    losses: matches.filter((m: any) => {
      const result = m.result;
      const isHost = m.creatorId === userId;
      return result?.outcome === (isHost ? 'guestWin' : 'hostWin');
    }).length,
    draws: matches.filter((m: any) => m.result?.outcome === 'draw').length,
  };

  const winRate = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-surna-purple/20 border-border p-4">
          <div className="text-sm text-token-text-secondary mb-1">Total Matches</div>
          <div className="text-3xl font-bold text-token-text">{stats.total}</div>
        </Card>
        <Card className="bg-surna-purple/20 border-border p-4">
          <div className="text-sm text-token-text-secondary mb-1">Wins</div>
          <div className="text-3xl font-bold text-green-400">{stats.wins}</div>
        </Card>
        <Card className="bg-surna-purple/20 border-border p-4">
          <div className="text-sm text-token-text-secondary mb-1">Losses</div>
          <div className="text-3xl font-bold text-red-400">{stats.losses}</div>
        </Card>
        <Card className="bg-surna-purple/20 border-border p-4">
          <div className="text-sm text-token-text-secondary mb-1">Win Rate</div>
          <div className="text-3xl font-bold text-token-accent">{winRate}%</div>
        </Card>
      </div>

      {/* ELO Ratings by Sport */}
      {userRatings.length > 0 && (
        <Card className="bg-surna-purple/20 border-border p-6">
          <h3 className="text-xl font-bold text-token-text mb-4 flex items-center gap-2">
            <Trophy className="text-token-accent" size={24} />
            ELO Ratings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userRatings.map((rating: any) => (
              <div key={rating.sport} className="bg-background/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-token-text">{rating.sport}</span>
                  <Badge className="bg-gradient-to-r from-token-accent to-token-accent text-foreground border-none">
                    {rating.rating}
                  </Badge>
                </div>
                {rating.delta && (
                  <div className={`flex items-center gap-1 text-sm ${
                    rating.delta > 0 ? 'text-green-400' : rating.delta < 0 ? 'text-red-400' : 'text-token-text-secondary'
                  }`}>
                    {rating.delta > 0 ? <TrendingUp size={14} /> : rating.delta < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                    {rating.delta > 0 ? '+' : ''}{rating.delta} recent
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Match History */}
      <div>
        <h3 className="text-xl font-bold text-token-text mb-4 flex items-center gap-2">
          <Target className="text-token-accent" size={24} />
          Match History
        </h3>
        {matches.length === 0 ? (
          <Card className="bg-surna-purple/20 border-border p-8 text-center">
            <Medal className="w-12 h-12 text-token-text-muted mx-auto mb-3" />
            <p className="text-token-text-secondary">No matches yet</p>
            <p className="text-sm text-token-text-muted mt-1">Challenge someone to get started!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {matches.map((match: any) => {
              const isHost = match.creatorId === userId;
              const result = match.result;
              const won = result?.outcome === (isHost ? 'hostWin' : 'guestWin');
              const lost = result?.outcome === (isHost ? 'guestWin' : 'hostWin');
              const draw = result?.outcome === 'draw';

              return (
                <Card
                  key={match.id}
                  className="bg-surna-purple/20 border-border p-4 hover:bg-surna-purple/30 transition-colors cursor-pointer"
                  onClick={() => setLocation(`/challenges/${match.id}`)}
                  data-testid={`challenge-${match.id}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-token-text">{match.title}</h4>
                        <Badge variant="outline" className="text-xs">{match.sport}</Badge>
                        {match.status === 'completed' && result && (
                          <Badge className={`text-xs ${
                            won ? 'bg-green-500/20 text-green-400 border-green-400/30' :
                            lost ? 'bg-red-500/20 text-red-400 border-red-400/30' :
                            'bg-gray-500/20 text-gray-400 border-gray-400/30'
                          }`}>
                            {won ? 'Won' : lost ? 'Lost' : 'Draw'}
                          </Badge>
                        )}
                      </div>
                      {result && (
                        <div className="text-sm text-token-text-secondary">
                          Score: {result.hostScore} - {result.guestScore}
                        </div>
                      )}
                      {match.timeStart && (
                        <div className="text-xs text-token-text-muted mt-1">
                          {new Date(match.timeStart).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant={match.status === 'completed' ? 'default' : 'outline'} className="text-xs">
                        {match.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
