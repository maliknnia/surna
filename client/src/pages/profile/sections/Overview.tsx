import { MapPin, Calendar, Trophy, Users } from 'lucide-react';
import { format } from 'date-fns';

interface OverviewProps {
  profile: any;
}

export default function Overview({ profile }: OverviewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Info */}
      <div className="lg:col-span-2 space-y-6">
        {/* Bio */}
        <div className="p-6 bg-transparent border border-border rounded-xl">
          <h3 className="text-xl font-semibold text-token-text mb-4">About</h3>
          <p className="text-token-text-secondary leading-relaxed">
            {profile.bio || 'No bio provided.'}
          </p>
        </div>

        {/* Details */}
        <div className="p-6 bg-transparent border border-border rounded-xl">
          <h3 className="text-xl font-semibold text-token-text mb-4">Details</h3>
          <div className="grid grid-cols-2 gap-4">
            {profile.location && (
              <div className="flex items-center gap-3">
                <MapPin size={20} className="text-token-accent" />
                <div>
                  <div className="text-xs text-token-text-muted">Location</div>
                  <div className="text-token-text font-medium">{profile.location}</div>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-token-accent" />
              <div>
                <div className="text-xs text-token-text-muted">Joined</div>
                <div className="text-token-text font-medium">
                  {format(new Date(profile.createdAt), 'MMM yyyy')}
                </div>
              </div>
            </div>
            
            {profile.stats && (
              <>
                <div className="flex items-center gap-3">
                  <Trophy size={20} className="text-token-accent" />
                  <div>
                    <div className="text-xs text-token-text-muted">Matches Played</div>
                    <div className="text-token-text font-medium">{profile.stats.matchesPlayed}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Users size={20} className="text-token-accent" />
                  <div>
                    <div className="text-xs text-token-text-muted">Teams</div>
                    <div className="text-token-text font-medium">
                      {profile.teamsJoined?.length || 0}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Sports */}
        {profile.sports && profile.sports.length > 0 && (
          <div className="p-6 bg-transparent border border-border rounded-xl">
            <h3 className="text-lg font-semibold text-token-text mb-4">Sports</h3>
            <div className="flex flex-wrap gap-2">
              {profile.sports.map((sport: string) => (
                <span key={sport} className="px-3 py-1 bg-token-accent text-foreground rounded-full text-sm">
                  {sport}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {profile.stats && (
          <div className="p-6 bg-transparent border border-border rounded-xl">
            <h3 className="text-lg font-semibold text-token-text mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-token-text-secondary">Win Rate</span>
                <span className="text-token-accent font-semibold">{profile.stats.winRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-token-text-secondary">Level</span>
                <span className="text-token-text font-semibold">{profile.stats.level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-token-text-secondary">Current Streak</span>
                <span className="text-token-text font-semibold">{profile.stats.currentStreak}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
