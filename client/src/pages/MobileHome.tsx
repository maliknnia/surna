import { useState, useEffect, useRef, useCallback, lazy, Suspense, type RefObject } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadNotificationCount } from '@/hooks/useUnreadNotificationCount';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { BottomNav } from '@/features/home/components/BottomNav';
import { mobileShellPanelByIndex } from '@/features/home/constants/mobilePanels';
import HamburgerMenu from '@/components/HamburgerMenu';
import LeftDrawer from '@/components/RightDrawer';
import { Calendar, MessageSquare, Users, Swords, BarChart3, Sparkles, RefreshCw } from 'lucide-react';
import { Icon } from '@/components/Icon';
import NotificationPeekSheet from '@/components/notifications/NotificationPeekSheet';
import {
  mobilePanelReturnPath,
  panelIndexFromSearch,
  type MobilePanelId,
} from '@/lib/navigation';
import { StoriesBar } from '@/components/stories/StoriesBar';
import { StoryViewer } from '@/components/stories/StoryViewer';
import { AddStoryModal } from '@/components/stories/AddStoryModal';
import { SmartActionRow } from '@/features/home/components/SmartActionRow';
import { SpotifyHomeFeed } from '@/features/home/components/SpotifyHomeSections';
import {
  HOME_QUERY_KEYS,
  HOME_STALE_TIME_MS,
  getHomeLastVisit,
  refetchAllHomeQueries,
  setHomeLastVisit,
} from '@/features/home/homeFeedDynamics';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSurnaCamera } from '@/features/camera';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useProEntitlement, isProEntitlementActive } from '@/hooks/useProEntitlement';

const Teams = lazy(() => import('./Teams'));
const Map = lazy(() => import('./Map'));
const PlacesDiscovery = lazy(() => import('./PlacesDiscovery'));
const EventsPage = lazy(() => import('@/components/events/EventsPage'));

const PanelSkeleton = () => (
  <div className="animate-pulse p-5">
    <div className="h-6 rounded mb-4 w-1/3" style={{ background: 'var(--surna-surface)' }}></div>
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 rounded" style={{ background: 'var(--surna-surface)' }}></div>
      ))}
    </div>
  </div>
);



function HomePanel({
  scrollRef,
  onProPress,
  onSheetOpenChange,
  onStoryOpen,
  onPanelSelect,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  onProPress?: () => void;
  onSheetOpenChange?: (open: boolean) => void;
  onStoryOpen: (userId: string, index: number) => void;
  onPanelSelect?: (panel: MobilePanelId) => void;
}) {
  const [showAddStory, setShowAddStory] = useState(false);
  const [contentSeed, setContentSeed] = useState(0);
  const [lastVisitAt] = useState(() => getHomeLastVisit());
  const { openCamera } = useSurnaCamera();
  const queryClient = useQueryClient();

  useEffect(() => {
    return () => {
      setHomeLastVisit(Date.now());
    };
  }, []);

  useEffect(() => {
    const now = Date.now();
    for (const queryKey of Object.values(HOME_QUERY_KEYS)) {
      const state = queryClient.getQueryState([...queryKey]);
      if (state?.dataUpdatedAt && now - state.dataUpdatedAt > HOME_STALE_TIME_MS) {
        void queryClient.refetchQueries({ queryKey: [...queryKey], type: 'active' });
      }
    }
  }, [queryClient]);

  const openStoryCamera = useCallback(() => {
    openCamera({
      source: 'story',
      mode: 'story',
      onStoryPosted: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/stories'] });
      },
    });
  }, [openCamera, queryClient]);

  const handleRefresh = useCallback(async () => {
    await refetchAllHomeQueries(queryClient);
    setContentSeed((seed) => seed + 1);
  }, [queryClient]);

  const { isRefreshing, pullDistance, touchHandlers } = usePullToRefresh(handleRefresh, {
    getScrollTop: () => scrollRef.current?.scrollTop ?? 0,
  });

  return (
    <div {...touchHandlers}>
      {(isRefreshing || pullDistance > 12) && (
        <div
          className="flex items-center justify-center"
          style={{
            height: isRefreshing ? 28 : Math.min(28, pullDistance * 0.35),
            opacity: isRefreshing ? 1 : Math.min(1, pullDistance / 48),
          }}
          aria-hidden={!isRefreshing}
          data-testid="home-pull-refresh-indicator"
        >
          <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isRefreshing && "animate-spin")} />
        </div>
      )}

      <div className="px-4 pt-2 pb-28 space-y-6" style={{ background: "var(--surna-base)" }}>
        <div className="-mx-4">
          <StoriesBar
            onStoryClick={onStoryOpen}
            onAddStory={openStoryCamera}
          />
        </div>

        <SmartActionRow onProPress={onProPress} onSheetOpenChange={onSheetOpenChange} onPanelSelect={onPanelSelect} />

        <SpotifyHomeFeed contentSeed={contentSeed} lastVisitAt={lastVisitAt} />

        <AddStoryModal open={showAddStory} onClose={() => setShowAddStory(false)} />
      </div>
    </div>
  );
}

const PANEL_IDS: MobilePanelId[] = ['home', 'teams', 'map', 'venues', 'events'];

const proUpgradeBullets = [
  { icon: Users, text: 'Multi-team rosters, staff, and join approvals' },
  { icon: Calendar, text: 'Events, training blocks, and attendance signals' },
  { icon: Swords, text: 'Match day: formations, squads, and tactical broadcast' },
  { icon: MessageSquare, text: 'Club comms tied to your messenger' },
  { icon: BarChart3, text: 'Analytics and recruitment tools' },
];

export default function MobileHome() {
  const [location, setLocation] = useLocation();
  const initialPanel = panelIndexFromSearch(
    typeof window !== 'undefined' ? window.location.search : '',
  );
  const [activeIndex, setActiveIndex] = useState(initialPanel ?? 0);
  const [hamburgerMenuOpen, setHamburgerMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mapPinOpen, setMapPinOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const [smartSheetOpen, setSmartSheetOpen] = useState(false);
  const [storyViewer, setStoryViewer] = useState<{ userId: string; index: number } | null>(null);
  const [showAddStory, setShowAddStory] = useState(false);
  const [showNotifPeek, setShowNotifPeek] = useState(false);
  const [showProUpgradeModal, setShowProUpgradeModal] = useState(false);
  const homeScrollRef = useRef<HTMLDivElement | null>(null);
  const lastScrollYRef = useRef(0);
  const { user } = useAuth();

  const { data: proEntitlement } = useProEntitlement();

  const bottomNavHidden =
    mapPinOpen ||
    !!storyViewer ||
    showNotifPeek ||
    showProUpgradeModal ||
    drawerOpen ||
    smartSheetOpen ||
    (navHidden && !smartSheetOpen);

  const openProEntry = useCallback(() => {
    if (isProEntitlementActive(proEntitlement)) {
      setLocation('/pro');
      return;
    }
    if (!user) {
      window.location.href = '/login?next=/pro';
      return;
    }
    setShowProUpgradeModal(true);
  }, [proEntitlement, user, setLocation]);
  const unreadNotificationCount = useUnreadNotificationCount();
  const unreadMessageCount = useUnreadMessageCount();
  const handlePanelScroll = useCallback((e: { currentTarget: { scrollTop: number } }) => {
    const currentY = e.currentTarget.scrollTop;
    const diff = currentY - lastScrollYRef.current;
    if (diff > 8) {
      setNavHidden(true);
    } else if (diff < -8) {
      setNavHidden(false);
    }
    lastScrollYRef.current = currentY;
  }, []);

  const edgeSwipeRef = useRef({ startX: 0, startY: 0, tracking: false });

  const handleGlobalTouchStart = useCallback((e: TouchEvent) => {
    const x = e.touches[0].clientX;
    if (x < 20) {
      edgeSwipeRef.current = { startX: x, startY: e.touches[0].clientY, tracking: true };
    }
  }, []);

  const handleGlobalTouchEnd = useCallback((e: TouchEvent) => {
    if (!edgeSwipeRef.current.tracking) return;
    const endX = e.changedTouches[0].clientX;
    const diff = endX - edgeSwipeRef.current.startX;
    if (diff > 50) {
      setDrawerOpen(true);
    }
    edgeSwipeRef.current.tracking = false;
  }, []);

  useEffect(() => {
    document.addEventListener('touchstart', handleGlobalTouchStart, { passive: true });
    document.addEventListener('touchend', handleGlobalTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleGlobalTouchStart);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [handleGlobalTouchStart, handleGlobalTouchEnd]);

  const isMapPanel = activeIndex === 2;
  const shellPanel = mobileShellPanelByIndex(activeIndex);
  const isHomePanel = activeIndex === 0;

  useEffect(() => {
    if (!isMapPanel) setMapPinOpen(false);
  }, [isMapPanel]);

  useEffect(() => {
    const idx = panelIndexFromSearch(window.location.search);
    setActiveIndex(idx ?? 0);
  }, [location]);

  const goToPanel = useCallback((index: number) => {
    setActiveIndex(index);
    setNavHidden(false);
    const panel = PANEL_IDS[index];
    if (panel === 'home') {
      setLocation('/');
      requestAnimationFrame(() => {
        homeScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } else {
      setLocation(mobilePanelReturnPath(panel));
    }
  }, [setLocation]);

  const selectHomePanel = useCallback(
    (panel: MobilePanelId) => {
      const index = PANEL_IDS.indexOf(panel);
      if (index >= 0) goToPanel(index);
    },
    [goToPanel],
  );

  useEffect(() => {
    if (!storyViewer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [storyViewer]);

  return (
    <div className="h-screen flex flex-col overflow-hidden text-foreground" data-testid="mobile-home" style={{ background: 'var(--surna-base)' }}>
      {!isMapPanel && !storyViewer && (
      <header className="sticky top-0 z-20 px-3 h-11 flex items-center justify-between surna-header">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setDrawerOpen(true)} className="flex-shrink-0 relative">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--surna-elevated)', color: 'var(--surna-text)' }}>
                {(user?.displayName || user?.firstName || 'S').charAt(0)}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2" style={{ background: 'var(--surna-text)', borderColor: 'var(--surna-base)' }} />
          </button>
          <span
            key={shellPanel.id}
            className="surna-header-title text-base tracking-tight truncate"
            style={{ color: 'var(--surna-text)' }}
          >
            {isHomePanel ? 'For you' : shellPanel.title}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setLocation('/search')}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Search"
          >
            <Icon name="magnifying-glass" size="sm" weight="regular" color="var(--surna-text)" />
          </button>
          <button
            type="button"
            onClick={() => setShowNotifPeek(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform relative"
            aria-label="Notifications"
          >
            <Icon name="bell" size="sm" weight="regular" color="var(--surna-text)" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5 bg-surna-ios-red">
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setLocation('/messages')}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform relative"
            aria-label="Messages"
          >
            <Icon name="chat-circle" size="sm" weight="regular" color="var(--surna-text)" />
            {unreadMessageCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5 bg-surna-ios-red">
                {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
              </span>
            )}
          </button>
        </div>
      </header>
      )}

      <HamburgerMenu
        isOpen={hamburgerMenuOpen}
        onClose={() => setHamburgerMenuOpen(false)}
      />

      <LeftDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <main className="flex-1 relative overflow-hidden">
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {PANEL_IDS.map((panelId, i) => {
            const isMap = panelId === 'map';
            return (
              <div
                key={panelId}
                ref={i === 0 ? homeScrollRef : undefined}
                className={`w-full flex-shrink-0 h-full ${isMap ? 'overflow-hidden' : 'overflow-y-auto smooth-scroll'}`}
                onScroll={isMap ? undefined : handlePanelScroll}
              >
                {i === 0 ? (
                  <HomePanel
                    scrollRef={homeScrollRef}
                    onProPress={openProEntry}
                    onSheetOpenChange={setSmartSheetOpen}
                    onStoryOpen={(userId, index) => setStoryViewer({ userId, index })}
                    onPanelSelect={selectHomePanel}
                  />
                ) : isMap ? (
                  <Suspense fallback={<PanelSkeleton />}>
                    <Map
                      embedded
                      mapActive={activeIndex === 2}
                      onPinSheetToggle={setMapPinOpen}
                      onOpenProfile={() => setDrawerOpen(true)}
                    />
                  </Suspense>
                ) : panelId === 'teams' ? (
                  <Suspense fallback={<PanelSkeleton />}>
                    <Teams embedded panelActive={activeIndex === 1} onPanelBack={() => goToPanel(0)} />
                  </Suspense>
                ) : panelId === 'venues' ? (
                  <Suspense fallback={<PanelSkeleton />}>
                    <PlacesDiscovery embedded panelActive={activeIndex === 3} onPanelBack={() => goToPanel(0)} />
                  </Suspense>
                ) : (
                  <Suspense fallback={<PanelSkeleton />}>
                    <EventsPage compact maxEvents={12} panelActive={activeIndex === 4} onPanelBack={() => goToPanel(0)} />
                  </Suspense>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <BottomNav activeIndex={activeIndex} onNavClick={goToPanel} hidden={bottomNavHidden} />

      {storyViewer && (
        <StoryViewer
          initialUserId={storyViewer.userId}
          initialStoryIndex={storyViewer.index}
          onClose={() => setStoryViewer(null)}
        />
      )}
      <AddStoryModal open={showAddStory} onClose={() => setShowAddStory(false)} />
      <NotificationPeekSheet open={showNotifPeek} onClose={() => setShowNotifPeek(false)} />

      {showProUpgradeModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pro-upgrade-title"
          onClick={() => setShowProUpgradeModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--surna-elevated)', color: 'var(--surna-text)', border: '1px solid var(--surna-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, var(--surna-pro) 0%, var(--surna-pro-dark) 100%)' }}>
                  <Sparkles size={22} />
                </div>
                <h2 id="pro-upgrade-title" className="text-lg font-black leading-tight">SURNA Pro</h2>
              </div>
              <button type="button" className="text-sm font-bold px-2 py-1 rounded-lg" style={{ color: 'var(--surna-text-muted)' }} onClick={() => setShowProUpgradeModal(false)}>
                Close
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--surna-text-muted)', lineHeight: 1.5 }}>
              Your account is on the <strong style={{ color: 'var(--surna-text)' }}>free</strong> plan. Upgrade for the full club workspace ÔÇö rosters, match day, comms, and more.
            </p>
            <ul className="space-y-3 mb-5">
              {proUpgradeBullets.map(({ icon: Icon, text }) => (
                <li key={text} className="flex gap-3 text-sm">
                  <Icon size={18} className="flex-shrink-0 mt-0.5 text-surna-pro" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            <Link href="/subscribe" onClick={() => setShowProUpgradeModal(false)}>
              <button
                type="button"
                className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 active:scale-[0.99] transition-transform bg-surna-pro text-white"
              >
                <Sparkles size={18} />
                Subscribe
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

