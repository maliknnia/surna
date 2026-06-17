import { useState, lazy, Suspense } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import ProfileHeader from './components/ProfileHeader';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { OWNER_PROFILE_AVATAR, OWNER_COVER_URL } from '@/lib/ownerAvatar';
import { normalizeUserProfile } from '@/lib/normalizeUserProfile';
import { buildDemoUserProfile, isDemoProfileUserId } from '@/lib/demoProfiles';

// Package #5: Lazy-loaded tab sections
const Overview = lazy(() => import('./sections/Overview'));
const Stats = lazy(() => import('./sections/Stats'));
const ActivityFeed = lazy(() => import('./sections/ActivityFeed'));
const Achievements = lazy(() => import('./sections/Achievements'));
const TeamsJoined = lazy(() => import('./sections/TeamsJoined'));
const EventsAttended = lazy(() => import('./sections/EventsAttended'));
const Sponsorships = lazy(() => import('./sections/Sponsorships'));
const Gallery = lazy(() => import('./sections/Gallery'));
const Reviews = lazy(() => import('./sections/Reviews'));
const Calendar = lazy(() => import('./sections/Calendar'));
const ChallengeHistory = lazy(() => import('./sections/ChallengeHistory'));

type TabType = 'overview' | 'stats' | 'activity' | 'achievements' | 'teams' | 'events' | 'sponsorships' | 'gallery' | 'reviews' | 'calendar' | 'challenges';
type ProfileContext = 'social' | 'sports' | 'marketplace';

export default function PersonProfile({ context = 'sports' }: { context?: ProfileContext }) {
  const params = useParams();
  const userId = params.id;
  const { user } = useAuth();
  const isOwnProfile = !!user && (user as any).id === userId;
  const [activeTab, setActiveTab] = useState<TabType>('activity');

  const demoProfile = userId && isDemoProfileUserId(userId) ? buildDemoUserProfile(userId) : null;

  const { data: apiProfile, isLoading, error } = useQuery<any>({
    queryKey: ['/api/users', userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Profile not found');
      const user = await res.json();
      return normalizeUserProfile(user);
    },
    enabled: !!userId && !demoProfile,
  });

  const profile = demoProfile ?? apiProfile;

  if (!demoProfile && isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-token-text animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-token-text mb-2">Profile Not Found</h2>
          <p className="text-token-text">The profile you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string }[] =
    context === "social"
      ? [
          { id: 'overview', label: 'Overview' },
          { id: 'activity', label: 'Activity' },
          { id: 'gallery', label: 'Gallery' },
          { id: 'reviews', label: 'Reviews' },
        ]
      : context === "marketplace"
        ? [
            { id: 'overview', label: 'Seller' },
            { id: 'stats', label: 'Sales' },
            { id: 'activity', label: 'Listings' },
            { id: 'reviews', label: 'Reviews' },
          ]
        : [
            { id: 'activity', label: 'Posts' },
            { id: 'gallery', label: 'Photos' },
            { id: 'stats', label: 'Stats' },
            { id: 'teams', label: 'Teams' },
            { id: 'events', label: 'Events' },
            { id: 'achievements', label: 'Badges' },
            { id: 'challenges', label: 'Games' },
          ];

  const headerProfile = isOwnProfile
    ? {
        ...profile,
        avatar: OWNER_PROFILE_AVATAR,
        profileImageUrl: OWNER_PROFILE_AVATAR,
        photo: OWNER_PROFILE_AVATAR,
        cover: OWNER_COVER_URL,
      }
    : profile;

  return (
    <main className="min-h-screen bg-background text-token-text">
      {/* Package #5: Profile Header with cover, avatar, rating, actions */}
      <ProfileHeader profile={headerProfile} isOwnProfile={isOwnProfile} />

      <div className="max-w-6xl mx-auto px-4 py-4">
        {context === "marketplace" && (
          <div className="rounded-xl border border-border p-4 mb-4 text-sm text-token-text-muted">
            Seller rating: {(profile?.sellerRating ?? 4.8).toString()} · Sales count: {(profile?.salesCount ?? 0).toString()} · Response time: {profile?.responseTime ?? "2h"}
          </div>
        )}
      </div>

      {/* Tab Navigation - sticky below header */}
      <nav className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-4 font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'text-token-text border-b-3 border-token-accent'
                    : 'text-token-text-muted hover:text-token-text'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Tab Content - lazy-loaded sections */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Suspense fallback={
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-token-text animate-spin" />
          </div>
        }>
          {activeTab === 'overview' && <Overview profile={profile} />}
          {activeTab === 'stats' && <Stats userId={userId!} />}
          {activeTab === 'activity' && <ActivityFeed userId={userId!} />}
          {activeTab === 'achievements' && <Achievements userId={userId!} />}
          {activeTab === 'challenges' && <ChallengeHistory userId={userId!} />}
          {activeTab === 'teams' && <TeamsJoined userId={userId!} />}
          {activeTab === 'events' && <EventsAttended userId={userId!} />}
          {activeTab === 'sponsorships' && <Sponsorships sponsors={profile.sponsors || []} />}
          {activeTab === 'gallery' && <Gallery userId={userId!} isOwnProfile={isOwnProfile} />}
          {activeTab === 'reviews' && <Reviews userId={userId!} isOwnProfile={isOwnProfile} />}
          {activeTab === 'calendar' && <Calendar userId={userId!} />}
        </Suspense>
      </div>
    </main>
  );
}
