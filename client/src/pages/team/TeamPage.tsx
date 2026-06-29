import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useLocation } from 'wouter';
import { useTeam } from '@/hooks/useTeam';
import { getSportConfig } from '@/components/TeamCard';
import { getSportLabels } from '@/lib/sportLabels';
import TeamHeader from './components/TeamHeader';
import TeamHighlights from './sections/TeamHighlights';
import { EntityShareSheet } from '@/components/teams/EntityShareSheet';
import { TeamPageThemeProvider } from './TeamPageTheme';
import { EntityEmptyState, EntityListSkeleton, EntitySectionTabs } from '@/components/entity';
import { Loader2, ArrowLeft, Share2, QrCode, X, Trophy } from 'lucide-react';
import { useDiscoveryCardBg } from '@/hooks/useDiscoveryCardBg';
import { teamLogoUrl } from '@/lib/teamLogo';
import { useSmartBack } from '@/lib/navigation';
import QRCode from 'qrcode';

const TeamAbout = lazy(() => import('./sections/TeamAbout'));
const TeamMembers = lazy(() => import('./sections/TeamMembers'));
const TeamSchedule = lazy(() => import('./sections/TeamSchedule'));
const TeamPhotos = lazy(() => import('./sections/TeamPhotos'));
const TeamSponsors = lazy(() => import('./sections/TeamSponsors'));
const TeamFeed = lazy(() => import('./sections/TeamFeed'));
const TeamChat = lazy(() => import('./sections/TeamChat'));
const TeamProPublic = lazy(() => import('./sections/TeamProPublic'));
const TeamChallenges = lazy(() => import('./sections/TeamChallenges'));
type TabType = 'about' | 'members' | 'schedule' | 'photos' | 'sponsors' | 'feed' | 'challenges' | 'chat' | 'roster';

type TeamAboutPropsTeam = {
  id?: string;
  sport?: string;
  description?: string | null;
  city?: string | null;
  currentMembers?: number;
  maxMembers?: number;
  createdAt?: string | Date | null;
  placeName?: string | null;
  placeId?: string | null;
  record?: { W?: number; L?: number; D?: number };
  isPublic?: boolean;
  canManage?: boolean;
  isCaptain?: boolean;
};

export default function TeamPage() {
  const params = useParams();
  const teamId = params.id;
  const [, setLocation] = useLocation();
  const goBack = useSmartBack({ fallback: '/?panel=teams' });
  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const { data: team, isLoading, error } = useTeam(teamId);

  const openJoinFromNotification =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("join") === "1";

  const teamPhoto = team ? teamLogoUrl(team as never) : null;
  const extractedColor = useDiscoveryCardBg(teamPhoto, (team as any)?.sport);

  useEffect(() => {
    if (!showQrModal || !teamId) return;
    const teamUrl = `${window.location.origin}/teams/${teamId}`;
    QRCode.toDataURL(teamUrl, { width: 300, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [showQrModal, teamId]);

  const config = getSportConfig((team as any)?.sport);
  const topColor = extractedColor || config.colors[0];

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const y = scrollRef.current.scrollTop;
      setScrollY(y);
      setHeaderCollapsed(y > 280);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll, { passive: true });
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surna-base)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--surna-text-secondary)" }} />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "var(--surna-base)" }}>
        <EntityEmptyState
          icon={Trophy}
          title="Team not found"
          description="This team may have been removed or the link is invalid."
          actionLabel="Browse teams"
          actionHref="/teams"
        />
      </div>
    );
  }

  const teamAny = team as Record<string, unknown>;
  const sponsors = (teamAny.sponsors as unknown[] | null) ?? [];
  const sportLabels = getSportLabels((team as { sport?: string }).sport);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'about', label: 'About' },
    { id: 'members', label: sportLabels.rosterLabel },
    { id: 'feed', label: 'Feed' },
    { id: 'chat', label: 'Chat' },
    { id: 'challenges', label: 'Challenges' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'photos', label: 'Photos' },
    { id: 'roster', label: 'Roster' },
    ...(sponsors.length > 0 ? [{ id: 'sponsors' as TabType, label: 'Sponsors' }] : []),
  ];

  const bgOpacity = Math.max(0, 1 - scrollY / 400);
  const heroParallax = scrollY * 0.4;

  return (
    <div className="spotify-team-page">
      {/* LAYER 1: Fixed gradient background */}
      <div className="spotify-bg-layer" style={{ opacity: bgOpacity }}>
        <div className="spotify-bg-color" style={{ backgroundColor: topColor }} />
        <div className="spotify-bg-gradient-dark" />
      </div>

      {/* LAYER 2: Fixed top bar (glassmorphism) */}
      <div className="spotify-top-bar" style={{
        background: headerCollapsed
          ? 'color-mix(in srgb, var(--background) 85%, transparent)'
          : 'transparent',
        backdropFilter: headerCollapsed ? 'blur(20px)' : 'none',
      }}>
        <button onClick={goBack}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-background/40 backdrop-blur-sm">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        {headerCollapsed && (
          <h2 className="text-foreground text-[15px] font-bold truncate flex-1 ml-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {(team as any).name}
          </h2>
        )}
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center bg-background/40 backdrop-blur-sm ml-auto"
          onClick={() => setShowQrModal(true)}
          aria-label="Show team QR code"
        >
          <QrCode size={16} className="text-foreground" />
        </button>
        <button
          type="button"
          className="w-8 h-8 rounded-full flex items-center justify-center bg-background/40 backdrop-blur-sm ml-2"
          onClick={() => setShowShare(true)}
          aria-label="Share team"
        >
          <Share2 size={16} className="text-foreground" />
        </button>
      </div>

      {/* LAYER 3: Scrollable content */}
      <div className="spotify-content-layer" ref={scrollRef} onScroll={handleScroll}>
        {/* Hero section with parallax */}
        <div className="spotify-hero" style={{ transform: `translateY(-${heroParallax}px)` }}>
          <TeamHeader
            team={team}
            sportConfig={extractedColor ? { ...config, colors: [extractedColor, extractedColor] as [string, string], ringColor: extractedColor } : config}
            openJoinSheet={openJoinFromNotification}
          />
          <TeamHighlights teamId={teamId!} teamName={(team as any).name} />
        </div>

        {/* Sticky tab bar — entity tabs with sport accent */}
        <div className="px-2" style={{ background: "var(--surna-base)" }}>
          <EntitySectionTabs
            tabs={tabs}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as TabType)}
            stickyTop="top-0"
            accentColor={topColor}
            testIdPrefix="team-section"
          />
        </div>

        {/* Tab content */}
        <TeamPageThemeProvider accentColor={topColor}>
          <div className="spotify-sections pb-8">
            <Suspense fallback={
              <div className="px-3 py-6">
                <EntityListSkeleton rows={3} rowHeight={120} />
              </div>
            }>
              {activeTab === 'about' && (
                <TeamAbout
                  team={{
                    ...(teamAny as TeamAboutPropsTeam),
                    canManage: !!(teamAny.canManage || teamAny.isCaptain),
                    isCaptain: !!teamAny.isCaptain,
                  }}
                />
              )}
            {activeTab === 'members' && (
              <TeamMembers
                teamId={teamId!}
                teamName={(team as any).name}
                canManage={!!teamAny.canManage || !!teamAny.isCaptain}
                isMember={!!teamAny.isMember || !!teamAny.hasJoined}
              />
            )}
            {activeTab === 'challenges' && <TeamChallenges teamId={teamId!} />}
            {activeTab === 'schedule' && (
              <TeamSchedule teamId={teamId!} canManage={!!teamAny.canManage || !!teamAny.isCaptain} />
            )}
            {activeTab === 'photos' && <TeamPhotos teamId={teamId!} />}
            {activeTab === 'feed' && <TeamFeed teamId={teamId!} />}
            {activeTab === 'chat' && (
              <TeamChat teamId={teamId!} isMember={!!teamAny.isMember || !!teamAny.hasJoined} />
            )}
            {activeTab === 'roster' && <TeamProPublic teamId={teamId!} />}
            {activeTab === 'sponsors' && <TeamSponsors sponsors={sponsors} />}
            </Suspense>
          </div>
        </TeamPageThemeProvider>
      </div>

      {showQrModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 bg-background border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-foreground">Team QR Code</h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/40"
                aria-label="Close QR modal"
              >
                <X size={16} className="text-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Scan to open this team profile and join quickly.
            </p>
            <div className="rounded-xl bg-white p-3 flex items-center justify-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Team profile QR code" className="w-64 h-64 object-contain" />
              ) : (
                <Loader2 className="w-6 h-6 animate-spin text-black" />
              )}
            </div>
          </div>
        </div>
      )}

      <EntityShareSheet
        open={showShare}
        onClose={() => setShowShare(false)}
        title={(team as any).name}
        path={`/teams/${teamId}`}
        shareText={`Check out ${(team as any).name} on Surna`}
      />
    </div>
  );
}
