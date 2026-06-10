import { useQuery } from '@tanstack/react-query';
import { Users, Crown, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TeamsJoinedProps {
  userId: string;
}

interface TeamsApi {
  teams: Array<{ id: string; name: string; role?: string; sport?: string; [key: string]: unknown }>;
}

export default function TeamsJoined({ userId }: TeamsJoinedProps) {
  const { data, isLoading } = useQuery<TeamsApi>({
    queryKey: ['/api/profile', userId, 'teams'],
  });

  const teams = data?.teams ?? [];

  if (isLoading) {
    return <div className="py-12 text-center text-token-text">Loading teams...</div>;
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-token-text-muted mx-auto mb-4" />
        <p className="text-token-text-secondary">Not a member of any teams yet</p>
      </div>
    );
  }

  const getRoleIcon = (role: string) => {
    if (role === 'captain') return <Crown size={16} className="text-token-accent" />;
    if (role === 'co-captain') return <Star size={16} className="text-token-accent" />;
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {teams.map((team: any) => (
        <div
          key={team.id}
          className="p-6 bg-transparent border border-border rounded-xl hover:border-token-accent/50 transition-all"
        >
          <div className="flex items-center gap-4 mb-4">
            {team.logo ? (
              <img src={team.logo} alt={team.name} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-token-accent to-token-accent flex items-center justify-center">
                <Users size={28} className="text-foreground" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-token-text">{team.name}</h3>
              <div className="text-xs text-token-text-secondary">{team.sport}</div>
            </div>
            {getRoleIcon(team.role)}
          </div>
          
          <div className="flex items-center justify-between text-sm mb-4">
            <span className="text-token-text-secondary">Role</span>
            <span className="text-token-text capitalize">{team.role}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm mb-4">
            <span className="text-token-text-secondary">Joined</span>
            <span className="text-token-text">{new Date(team.joinedAt).toLocaleDateString()}</span>
          </div>
          
          <Button
            onClick={() => window.location.href = `/teams/${team.id}`}
            className="w-full bg-gradient-to-r from-token-accent to-token-accent"
            size="sm"
          >
            View Team
          </Button>
        </div>
      ))}
    </div>
  );
}
