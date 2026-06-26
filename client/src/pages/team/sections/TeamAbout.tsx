import { MapPin, Calendar, Users, Trophy, Map as MapIcon } from 'lucide-react';
import { useLocation } from 'wouter';
import { entityPath, mapPath } from '@/lib/mapNavigation';
import { getSportLabels } from '@/lib/sportLabels';
import TeamRecentGames from './TeamRecentGames';

interface TeamAboutProps {
  team: any;
}

export default function TeamAbout({ team }: TeamAboutProps) {
  const [, setLocation] = useLocation();
  const labels = getSportLabels(team.sport);
  const handleViewOnMap = () => {
    if (team.placeId) {
      setLocation(mapPath({ type: "place", id: String(team.placeId) }));
      return;
    }
    if (team.id) {
      setLocation(mapPath({ type: "team", id: String(team.id) }));
      return;
    }
    setLocation(mapPath());
  };

  const handleViewVenue = () => {
    if (team.placeId) {
      setLocation(entityPath("place", String(team.placeId)));
    }
  };

  return (
    <div className="space-y-4">
      {/* Description card */}
      <div className="glass-card">
        <h3 className="text-lg font-bold text-foreground mb-3">About</h3>
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          {team.description || 'No description provided.'}
        </p>
      </div>

      {/* Details grid card */}
      <div className="glass-card">
        <h3 className="text-lg font-bold text-foreground mb-4">{labels.groupNoun} details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/40">
              <Trophy size={18} className="text-muted-foreground" />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Sport</div>
              <div className="text-[14px] text-foreground font-medium">{team.sport}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/40">
              <MapPin size={18} className="text-muted-foreground" />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Location</div>
              <div className="text-[14px] text-foreground font-medium">{team.city || 'Not specified'}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/40">
              <Users size={18} className="text-muted-foreground" />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{labels.sizeLabel}</div>
              <div className="text-[14px] text-foreground font-medium">
                {team.currentMembers} / {team.maxMembers}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/40">
              <Calendar size={18} className="text-muted-foreground" />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Founded</div>
              <div className="text-[14px] text-foreground font-medium">
                {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Home Pitch */}
      {team.placeName && (
        <div className="glass-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-foreground">{labels.homeVenue}</h3>
            <button
              onClick={handleViewOnMap}
              className="h-8 px-3 rounded-full text-[12px] font-semibold flex items-center gap-1.5 bg-muted/40 text-muted-foreground border border-border backdrop-blur-sm active:scale-[0.96] transition-transform"
            >
              <MapIcon size={14} />
              View on Map
            </button>
          </div>
          <p
            className="text-[14px] text-muted-foreground cursor-pointer hover:underline"
            onClick={handleViewVenue}
            onKeyDown={(e) => e.key === "Enter" && handleViewVenue()}
            role={team.placeId ? "button" : undefined}
            tabIndex={team.placeId ? 0 : undefined}
          >
            {team.placeName}
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="glass-card">
        <h3 className="text-lg font-bold text-foreground mb-4">Quick Stats</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[14px] text-muted-foreground">Wins</span>
            <span className="text-[15px] text-foreground font-bold">{team.record?.W || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[14px] text-muted-foreground">Losses</span>
            <span className="text-[15px] text-foreground font-bold">{team.record?.L || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[14px] text-muted-foreground">Draws</span>
            <span className="text-[15px] text-foreground font-bold">{team.record?.D || 0}</span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-border">
            <span className="text-[14px] text-muted-foreground">Win Rate</span>
            <span className="text-[15px] font-bold" style={{ color: '#FFD700' }}>
              {team.record ? Math.round((team.record.W / Math.max(team.record.W + team.record.L + team.record.D, 1)) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {team.id ? <TeamRecentGames teamId={String(team.id)} sport={team.sport} /> : null}

      {/* Visibility */}
      <div className="glass-card">
        <h3 className="text-lg font-bold text-foreground mb-3">{labels.groupNoun} type</h3>
        <div className="flex items-center gap-2">
          <Users size={18} className={team.isPublic ? 'text-muted-foreground' : 'text-muted-foreground'} />
          <span className="text-[14px] text-foreground font-medium">
            {team.isPublic ? `Public ${labels.groupNoun.toLowerCase()}` : `Private ${labels.groupNoun.toLowerCase()}`}
          </span>
        </div>
        <p className="text-[13px] text-muted-foreground mt-2">
          {team.isPublic ? `Anyone can request to join this ${labels.groupNoun.toLowerCase()}` : 'Invitation only'}
        </p>
      </div>
    </div>
  );
}
