import { MapPin, Star, Users, Heart, MessageCircle, UserPlus, Trophy, Settings, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { teamLogoUrl } from '@/lib/teamLogo';
import {
  joinTeamUnified,
  joinButtonLabel,
  leaveTeam,
  fetchTeamJoinTemplate,
  shouldOpenJoinSheet,
} from '@/lib/teamJoin';
import { TeamJoinSheet } from '@/components/teams/TeamJoinSheet';
import { getSportLabels } from '@/lib/sportLabels';

interface SportConfig {
  emoji: string;
  colors: [string, string];
  ringColor: string;
}

interface TeamHeaderProps {
  team: any;
  sportConfig: SportConfig;
  /** Open join sheet on mount (e.g. from notification ?join=1) */
  openJoinSheet?: boolean;
}

export default function TeamHeader({ team, sportConfig, openJoinSheet }: TeamHeaderProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isFollowing, setIsFollowing] = useState(!!team.isFollowing);
  const [followersCount, setFollowersCount] = useState(team.followersCount || 0);
  const [hasJoined, setHasJoined] = useState(!!(team.hasJoined || team.isMember));
  const [hasRequested, setHasRequested] = useState(!!team.hasRequestedToJoin);
  const [memberCountState, setMemberCountState] = useState<number>(
    team.currentMembers || team.memberCount || 0
  );
  const [joinSheetOpen, setJoinSheetOpen] = useState(false);
  const accentColor = sportConfig.ringColor;
  const labels = getSportLabels(team.sport);

  useEffect(() => {
    if (openJoinSheet && !hasJoined && !hasRequested) {
      setJoinSheetOpen(true);
    }
  }, [openJoinSheet, hasJoined, hasRequested]);

  const handleFollow = async () => {
    // Flip state immediately so the button reflects the tap, snapshot
    // prior values so we can revert if the request fails.
    const wasFollowing = isFollowing;
    const prevCount = followersCount;
    const nextFollowing = !wasFollowing;
    const nextCount = wasFollowing ? Math.max(0, prevCount - 1) : prevCount + 1;
    setIsFollowing(nextFollowing);
    setFollowersCount(nextCount);

    try {
      if (nextFollowing) {
        await apiRequest('POST', `/api/teams/${team.id}/follow`, {});
      } else {
        await apiRequest('DELETE', `/api/teams/${team.id}/unfollow`);
      }
      const data: { following?: boolean; followersCount?: number } = { following: nextFollowing };
      if (typeof data.followersCount === 'number') setFollowersCount(data.followersCount);
      if (typeof data.following === 'boolean') setIsFollowing(data.following);
      queryClient.invalidateQueries({ queryKey: ['/api/teams', team.id] });
      toast({
        title: nextFollowing ? "Following!" : "Unfollowed",
        description: nextFollowing ? `You're now following ${team.name}` : `You unfollowed ${team.name}`,
      });
    } catch (error) {
      setIsFollowing(wasFollowing);
      setFollowersCount(prevCount);
      toast({ title: "Couldn't update follow", description: "Please try again in a moment.", variant: "destructive" });
    }
  };

  const handleMessage = () => {
    const captainId = team.captainId || team.captainUserId;
    if (captainId) {
      setLocation(`/messages?userId=${encodeURIComponent(captainId)}`);
      return;
    }
    toast({
      title: "Message unavailable",
      description: "Could not find the team captain to message.",
      variant: "destructive",
    });
  };

  const handleJoin = async () => {
    if (hasJoined || hasRequested) return;
    if (team.pendingInvite) {
      setJoinSheetOpen(true);
      return;
    }
    if (team.joinPolicy === 'invite_only') {
      toast({
        title: 'Invite only',
        description: 'Ask the captain to invite you to this team.',
      });
      return;
    }
    try {
      const template = await fetchTeamJoinTemplate(team.id);
      if (shouldOpenJoinSheet(template)) {
        setJoinSheetOpen(true);
        return;
      }
      const result = await joinTeamUnified(team.id);
      if (result.status === 'pending') {
        setHasRequested(true);
        queryClient.invalidateQueries({ queryKey: ['/api/teams', team.id] });
        toast({ title: 'Request sent', description: 'The captain will review your request' });
        return;
      }
      setHasJoined(true);
      if (typeof result.currentMembers === 'number') {
        setMemberCountState(result.currentMembers);
      } else {
        setMemberCountState((c) => c + 1);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/teams', team.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams/my-teams'] });
      toast({ title: 'Joined Team!', description: `You're now a member of ${team.name}` });
    } catch (err) {
      if (err instanceof Error && err.message === 'JOIN_APPLICATION_REQUIRED') {
        setJoinSheetOpen(true);
        return;
      }
      toast({ title: "Couldn't join team", description: 'Please try again in a moment.', variant: 'destructive' });
    }
  };

  const handleLeave = async () => {
    if (!hasJoined || team.canManage || team.isCaptain) return;
    try {
      await leaveTeam(team.id);
      setHasJoined(false);
      setMemberCountState((c) => Math.max(0, c - 1));
      queryClient.invalidateQueries({ queryKey: ['/api/teams', team.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams/my-teams'] });
      toast({ title: "Left team", description: `You left ${team.name}` });
    } catch (err) {
      toast({
        title: "Couldn't leave team",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleChallenge = () => {
    setLocation(`/challenges/create?opponentId=${encodeURIComponent(team.id)}&opponentType=team`);
  };

  const memberCount = memberCountState;
  const maxMembers = team.maxMembers || 25;
  const logoUrl = teamLogoUrl(team);

  return (
    <div className="spotify-hero-inner">
      {/* Large team logo/photo — Spotify album art style */}
      <div className="spotify-album-art">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={team.name}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl"
            style={{ background: `linear-gradient(135deg, ${sportConfig.colors[0]}88, ${sportConfig.colors[1]}88)` }}>
            {sportConfig.emoji}
          </div>
        )}
        <div className="spotify-album-shadow" style={{ boxShadow: `0 24px 64px ${accentColor}44, 0 12px 32px rgba(0,0,0,0.6)` }} />
      </div>

      {/* Team name + metadata */}
      <h1 className="text-[28px] font-extrabold text-foreground leading-tight mt-6 mb-2 tracking-tight">
        {team.name}
      </h1>

      <div className="flex items-center gap-2 mb-5 flex-wrap justify-center">
        <span className="spotify-sport-badge" style={{
          background: `${accentColor}18`,
          color: accentColor,
          border: `1px solid ${accentColor}30`,
        }}>
          {sportConfig.emoji} {team.sport || 'Sports'}
        </span>
        {team.city && (
          <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
            <MapPin size={11} />
            {team.city}
          </span>
        )}
      </div>

      {/* Stats row — glassmorphism pill */}
      <div className="spotify-stats-pill">
        <div className="text-center">
          <p className="text-[17px] font-bold text-foreground">{memberCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{labels.rosterLabel}</p>
        </div>
        <div className="w-px h-8 bg-muted/40" />
        <div className="text-center">
          <p className="text-[17px] font-bold text-foreground">{followersCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Followers</p>
        </div>
        <div className="w-px h-8 bg-muted/40" />
        <div className="text-center">
          <div className="flex items-center gap-1 justify-center">
            <Star size={14} style={{ color: '#FFD700' }} />
            <p className="text-[17px] font-bold text-foreground">{team.rating || '—'}</p>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rating</p>
        </div>
        {team.currentWinStreak > 0 ? (
          <>
            <div className="w-px h-8 bg-muted/40" />
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center">
                <Trophy size={14} style={{ color: accentColor }} />
                <p className="text-[17px] font-bold text-foreground">{team.currentWinStreak}</p>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Win streak</p>
            </div>
          </>
        ) : null}
      </div>

      {(team.canManage || team.isCaptain) ? (
        <button
          type="button"
          onClick={() => setLocation('/my-hub/teams')}
          className="mt-4 h-10 px-5 rounded-full text-[13px] font-semibold flex items-center gap-2 bg-muted/40 text-foreground active:scale-[0.97] transition-transform"
        >
          <Settings size={15} />
          Manage team
        </button>
      ) : null}

      {/* Primary CTA buttons */}
      <div className="flex items-center gap-2.5 w-full max-w-sm mt-5">
        <button onClick={handleJoin} disabled={hasJoined || hasRequested || (team.joinPolicy === 'invite_only' && !team.pendingInvite)}
          className="flex-1 h-12 rounded-full text-[14px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.96] disabled:active:scale-100"
          style={{
            background: accentColor,
            color: '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            boxShadow: `0 8px 24px ${accentColor}44`,
            opacity: (hasJoined || hasRequested) ? 0.85 : 1,
          }}>
          <UserPlus size={16} />
          {joinButtonLabel({
            hasJoined,
            hasRequestedToJoin: hasRequested,
            joinPolicy: team.joinPolicy,
            pendingInvite: team.pendingInvite,
          })}
        </button>
        <button onClick={handleFollow}
          className="h-12 px-5 rounded-full text-[13px] font-semibold flex items-center gap-2 transition-all active:scale-[0.96] bg-muted/60 hover:bg-muted text-foreground border border-border backdrop-blur-sm">
          <Heart size={15} className={isFollowing ? 'fill-current' : ''} style={isFollowing ? { color: '#FF6B6B' } : {}} />
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      </div>

      {/* Secondary actions */}
      <div className="flex items-center gap-2 mt-3">
        <button onClick={handleMessage}
          className="h-9 px-4 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all active:scale-[0.96] bg-muted/40 text-muted-foreground border border-border backdrop-blur-sm">
          <MessageCircle size={14} />
          Message
        </button>
        <button onClick={handleChallenge}
          className="h-9 px-4 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all active:scale-[0.96] bg-muted/40 text-muted-foreground border border-border backdrop-blur-sm">
          <Trophy size={14} />
          Challenge
        </button>
        {hasJoined && !team.canManage && !team.isCaptain ? (
          <button
            type="button"
            onClick={() => void handleLeave()}
            className="h-9 px-4 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all active:scale-[0.96] bg-muted/40 text-muted-foreground border border-border backdrop-blur-sm"
          >
            <LogOut size={14} />
            Leave
          </button>
        ) : null}
      </div>

      {team.record && (
        <div className="mt-4 px-4 py-2 rounded-xl bg-muted/40">
          <span className="text-[11px] uppercase tracking-wider mr-2 text-muted-foreground">Record</span>
          <span className="text-sm font-bold text-foreground">{team.record.W}-{team.record.L}-{team.record.D}</span>
        </div>
      )}

      <TeamJoinSheet
        teamId={team.id}
        teamName={team.name}
        open={joinSheetOpen}
        onOpenChange={setJoinSheetOpen}
        onJoined={(count) => {
          setHasJoined(true);
          if (typeof count === 'number') setMemberCountState(count);
        }}
        onPending={() => setHasRequested(true)}
      />
    </div>
  );
}
