import { MapPin, Star, Heart, MessageCircle, DollarSign, Trophy, UserPlus, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useState } from 'react';
import { LazyImage } from '@/components/ui/lazy-image';
import { deriveModernSources, deriveLqipPlaceholder } from '@/lib/imageSources';

interface ProfileHeaderProps {
  profile: any;
  isOwnProfile?: boolean;
}

export default function ProfileHeader({ profile, isOwnProfile = false }: ProfileHeaderProps) {
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(profile.isFollowing || false);
  const [followersCount, setFollowersCount] = useState(profile.followersCount ?? profile.followers?.length ?? 0);

  const handleFollow = async () => {
    // Flip the button + count immediately so the action feels instant,
    // remember the prior values so we can revert on failure.
    const wasFollowing = isFollowing;
    const prevCount = followersCount;
    const nextFollowing = !wasFollowing;
    const nextCount = wasFollowing ? Math.max(0, prevCount - 1) : prevCount + 1;
    setIsFollowing(nextFollowing);
    setFollowersCount(nextCount);

    try {
      const res = await apiRequest('POST', `/api/users/${profile.id}/follow`);
      const data = await res.json().catch(() => ({}));
      if (typeof data.following === 'boolean') {
        setIsFollowing(data.following);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/users', profile.id] });
      toast({
        title: nextFollowing ? "Following!" : "Unfollowed",
        description: nextFollowing ? `You're now following ${profile.fullName}` : `You unfollowed ${profile.fullName}`,
      });
    } catch (error) {
      setIsFollowing(wasFollowing);
      setFollowersCount(prevCount);
      toast({ title: "Couldn't update follow", description: "Please try again in a moment.", variant: "destructive" });
    }
  };

  const handleMessage = () => {
    window.location.href = `/messages?userId=${encodeURIComponent(profile.id)}`;
  };

  const handleSponsor = () => {
    window.location.href = `/profile/${profile.id}#sponsorships`;
  };

  const handleInvite = () => {
    toast({ title: "Invite", description: "Invite to team/event..." });
  };

  const handleChallenge = () => {
    window.location.href = `/challenges/create?opponentId=${encodeURIComponent(profile.id)}&opponentType=user`;
  };

  const completionChecks = [
    { key: "photo", label: "profile photo", filled: !!(profile.avatar || profile.profileImageUrl || profile.photo) },
    { key: "bio", label: "bio", filled: !!profile.bio },
    { key: "location", label: "location", filled: !!profile.location },
    { key: "sport", label: "primary sport", filled: !!(profile.primarySport || profile.sport || (profile.sports && profile.sports[0])) },
    { key: "position", label: "position", filled: !!profile.position },
    { key: "skill", label: "skill level", filled: !!(profile.skillLevel || profile.level) },
  ];
  const completionFilled = completionChecks.filter((f) => f.filled).length;
  const completionPercent = Math.round((completionFilled / completionChecks.length) * 100);
  const nextMissing = completionChecks.find((f) => !f.filled);

  const renderRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} size={16} className="fill-token-accent text-token-accent" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} size={16} className="fill-token-accent/50 text-token-accent" />);
      } else {
        stars.push(<Star key={i} size={16} className="text-token-text-muted" />);
      }
    }
    return stars;
  };

  return (
    <div className="relative">
      {/* Cover Photo */}
      <div 
        className="h-64 bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-900 relative"
        style={{ 
          backgroundImage: profile.cover ? `url(${profile.cover})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
      </div>

      {/* Profile Section */}
      <div className="max-w-6xl mx-auto px-4 -mt-16 relative">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          {/* Avatar + Info */}
          <div className="flex items-end gap-4">
            <div className="w-32 h-32 rounded-full border-4 border-token-text bg-background overflow-hidden flex-shrink-0 relative">
              {profile.avatar ? (
                <LazyImage
                  src={profile.avatar}
                  alt={profile.fullName}
                  sources={deriveModernSources(profile.avatar)}
                  placeholder={deriveLqipPlaceholder(profile.avatar)}
                  wrapperClassName="w-full h-full"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-token-accent to-token-accent flex items-center justify-center text-4xl font-bold text-foreground">
                  {profile.fullName?.[0]}
                </div>
              )}
            </div>
            
            <div className="pb-2">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold text-token-text">{profile.fullName}</h1>
                {profile.verified && (
                  <CheckCircle2 size={24} className="text-token-accent fill-current" />
                )}
              </div>
              <div className="text-token-text-secondary">@{profile.username}</div>
              {profile.location && (
                <div className="flex items-center gap-1 text-token-text-secondary mt-1">
                  <MapPin size={14} />
                  <span className="text-sm">{profile.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={handleFollow}
                className={`px-6 ${isFollowing ? 'bg-transparent border border-border' : 'bg-token-accent hover:bg-token-accent/90'}`}
                data-testid="button-follow"
              >
                <Heart size={18} className={isFollowing ? 'fill-current' : ''} />
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
              <Button
                onClick={handleMessage}
                variant="outline"
                data-testid="button-message"
              >
                <MessageCircle size={18} />
                Message
              </Button>
              <Button
                onClick={handleSponsor}
                variant="outline"
                data-testid="button-sponsor"
              >
                <DollarSign size={18} />
                Sponsor
              </Button>
              <Button
                onClick={handleInvite}
                variant="outline"
                data-testid="button-invite"
              >
                <UserPlus size={18} />
                Invite
              </Button>
              <Button
                onClick={handleChallenge}
                variant="outline"
                data-testid="button-challenge"
              >
                <Trophy size={18} />
                Challenge
              </Button>
            </div>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-token-text/90 mt-6 max-w-2xl leading-relaxed">
            {profile.bio}
          </p>
        )}

        {/* Profile completion indicator */}
        <div className="mt-4 max-w-2xl">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-token-text-secondary">Profile completion</span>
            <span className="font-semibold text-token-text">{completionPercent}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-background border border-border">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${completionPercent}%`, background: "var(--surna-accent)" }}
            />
          </div>
          {nextMissing && (
            <p className="text-xs mt-2 text-token-text-secondary">
              Add your {nextMissing.label} to get found by teams.
            </p>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex gap-4 mt-6 flex-wrap">
          {/* Rating */}
          {profile.rating && (
            <div className="px-4 py-2 bg-background border border-border rounded-full">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {renderRatingStars(profile.rating.value)}
                </div>
                <span className="text-lg font-semibold text-token-text">{profile.rating.value.toFixed(1)}</span>
                <span className="text-xs text-token-text-secondary">({profile.rating.count})</span>
              </div>
            </div>
          )}
          
          {/* Followers */}
          <div className="px-4 py-2 bg-background border border-border rounded-full">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-token-text">
                {followersCount.toLocaleString()}
              </span>
              <span className="text-xs text-token-text-secondary">followers</span>
            </div>
          </div>

          {/* Following */}
          <div className="px-4 py-2 bg-background border border-border rounded-full">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-token-text">
                {(profile.following?.length || 0).toLocaleString()}
              </span>
              <span className="text-xs text-token-text-secondary">following</span>
            </div>
          </div>

          {/* Sports */}
          {profile.sports && profile.sports.length > 0 && (
            <div className="flex gap-2">
              {profile.sports.map((sport: string) => (
                <Badge key={sport} className="bg-token-accent text-foreground border-none">
                  {sport}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
