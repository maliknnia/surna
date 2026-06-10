import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Loader2, Trophy, Target, Medal, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fetchChallengesList, fetchTeamRatings } from '@/lib/challengesApi';

interface TeamChallengesProps {
  teamId: string;
}

export default function TeamChallenges({ teamId }: TeamChallengesProps) {
  const [, setLocation] = useLocation();

  const { data: challengesData, isLoading } = useQuery({
    queryKey: ['challenges-list', 'team', teamId],
    queryFn: () => fetchChallengesList({ teamId }),
    enabled: !!teamId,
  });

  const { data: ratingsData } = useQuery({
    queryKey: ['challenges-ratings', 'team', teamId],
    queryFn: () => fetchTeamRatings(teamId),
    enabled: !!teamId,
  });

  const handleCreateChallenge = () => {
    setLocation(`/challenges/create?opponentId=${encodeURIComponent(teamId)}&opponentType=team`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  const matches = (challengesData as any)?.matches || [];
  const teamRatings = (ratingsData as any)?.ratings || [];

  const stats = {
    total: matches.length,
    wins: matches.filter((m: any) => {
      const result = m.result;
      const isHost = m.creatorType === 'team' && m.creatorId === teamId;
      return result?.outcome === (isHost ? 'hostWin' : 'guestWin');
    }).length,
    losses: matches.filter((m: any) => {
      const result = m.result;
      const isHost = m.creatorType === 'team' && m.creatorId === teamId;
      return result?.outcome === (isHost ? 'guestWin' : 'hostWin');
    }).length,
    draws: matches.filter((m: any) => m.result?.outcome === 'draw').length,
  };

  const winRate = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Challenges</h2>
        <button
          onClick={handleCreateChallenge}
          className="h-9 px-4 rounded-full text-[13px] font-bold flex items-center gap-1.5 bg-muted/40 text-foreground border border-border active:scale-[0.96] transition-transform backdrop-blur-sm"
        >
          <Trophy size={15} />
          Create
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground' },
          { label: 'Wins', value: stats.wins, color: 'text-green-400' },
          { label: 'Losses', value: stats.losses, color: 'text-red-400' },
          { label: 'Win Rate', value: `${winRate}%`, color: 'text-amber-400' },
        ].map((s, i) => (
          <div key={i} className="glass-card text-center !py-4 !mb-0">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ELO Ratings */}
      {teamRatings.length > 0 && (
        <div className="glass-card">
          <h3 className="text-[16px] font-bold text-foreground mb-3 flex items-center gap-2">
            <Trophy size={18} style={{ color: '#FFD700' }} />
            ELO Ratings
          </h3>
          <div className="space-y-2">
            {teamRatings.map((rating: any) => (
              <div key={rating.sport} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-[14px] font-medium text-foreground">{rating.sport}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-foreground">{rating.rating}</span>
                  {rating.delta && (
                    <span className={`flex items-center gap-0.5 text-[12px] ${
                      rating.delta > 0 ? 'text-green-400' : rating.delta < 0 ? 'text-red-400' : 'text-muted-foreground'
                    }`}>
                      {rating.delta > 0 ? <TrendingUp size={12} /> : rating.delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                      {rating.delta > 0 ? '+' : ''}{rating.delta}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match History */}
      <div className="glass-card">
        <h3 className="text-[16px] font-bold text-foreground mb-3 flex items-center gap-2">
          <Target size={18} className="text-muted-foreground" />
          Match History
        </h3>
        {matches.length === 0 ? (
          <div className="text-center py-6">
            <Medal className="w-10 h-10 text-muted-foreground/60 mx-auto mb-2" />
            <p className="text-muted-foreground text-[13px]">No matches yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map((match: any) => {
              const isHost = match.creatorType === 'team' && match.creatorId === teamId;
              const result = match.result;
              const won = result?.outcome === (isHost ? 'hostWin' : 'guestWin');
              const lost = result?.outcome === (isHost ? 'guestWin' : 'hostWin');

              return (
                <div
                  key={match.id}
                  className="p-3 rounded-xl bg-muted/40 hover:bg-muted/40 transition-colors cursor-pointer active:scale-[0.98]"
                  onClick={() => setLocation(`/challenges/${match.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[14px] font-semibold text-foreground">{match.title}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground">{match.sport}</span>
                      </div>
                      {result && (
                        <span className="text-[12px] text-muted-foreground">
                          Score: {result.hostScore} - {result.guestScore}
                        </span>
                      )}
                    </div>
                    {match.status === 'completed' && result && (
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        won ? 'bg-green-500/15 text-green-400' :
                        lost ? 'bg-red-500/15 text-red-400' :
                        'bg-muted/40 text-muted-foreground'
                      }`}>
                        {won ? 'W' : lost ? 'L' : 'D'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
