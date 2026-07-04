import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import NotificationsPanel from "@/components/notifications/NotificationsPanel";
import NotificationPeekSheet from "@/components/notifications/NotificationPeekSheet";
import { MessageCircle, Users, TrendingUp, UserPlus, Camera, Play, ArrowLeft, Bell, User as UserProfile, Loader2, Plus, Calendar, MapPin, RefreshCw } from "lucide-react";
import { NavHomeIcon } from "@/components/icons/NavHomeIcon";
import { useTheme } from "@/contexts/ThemeContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import type { PostWithAuthorEnhanced, PostWithAuthor, User, Hashtag } from "@shared/schema";
import PlacePostCard from "@/components/PlacePostCard";
import { useSurnaCamera } from "@/features/camera";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { FeedDiscoverPeople } from "@/components/feed/FeedDiscoverPeople";
import { PostComposerSheet } from "@/components/feed/PostComposerSheet";
import { PostDetailSheet } from "@/components/feed/PostDetailSheet";
import { eventDetailPath } from "@/lib/eventRoutes";
import { apiRequest } from "@/lib/queryClient";
import {
  FeedVideoViewer,
} from "@/components/video/FeedVideoViewer";
import { FeedVideosHub } from "@/components/video/FeedVideosHub";
import { flags } from "@/config/flags";
import { StoriesBar } from "@/components/stories/StoriesBar";
import { StoryViewer } from "@/components/stories/StoryViewer";
import { AddStoryModal } from "@/components/stories/AddStoryModal";
import { ShareModal } from "@/components/ShareModal";
import { CommentsSheet } from "@/components/comments/CommentsSheet";
import { cn } from "@/lib/utils";
import { EntityEmptyState, entityBtnClass, entityBtnSurface, entityCardStyle } from "@/components/entity";
import { markNavReturn, useSmartBack } from "@/lib/navigation";
import { entityPath, mapPath, resolveContentLinks } from "@/lib/mapNavigation";
import { ROUTES } from "@/navigation";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useUnreadNotificationCount } from "@/hooks/useUnreadNotificationCount";
import { usePostEngagement } from "@/hooks/usePostEngagement";
import { useVideoViewer } from "@/hooks/useVideoViewer";
import { mapPostToVideoPost } from "@/lib/mapPostToVideoPost";

/** Event/team CTAs — solid #fff pills read as white boxes on dark feed */
function feedActiveTabStyle(isDark: boolean, active: boolean) {
  if (!active) {
    return {
      background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
      color: isDark ? "rgba(255,255,255,0.48)" : "rgba(0,0,0,0.44)",
    };
  }
  return isDark
    ? { background: "var(--surna-bg-press)", color: "var(--surna-text)", border: "1px solid var(--surna-border)" }
    : { background: "#000000", color: "#ffffff", border: "none" };
}

// Virtual scrolling constants
const ITEM_HEIGHT = 250; // Estimated height of each post
const BUFFER_SIZE = 5; // Number of items to render outside viewport
const CACHE_TIME = 1000 * 60 * 10; // 10 minutes cache
const STALE_TIME = 1000 * 60 * 2; // 2 minutes stale time

// Post Skeleton Loader Component
function PostSkeleton() {
  return (
    <div className="border-b pb-4" style={{ borderColor: "var(--surna-border)" }} data-testid="post-skeleton">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="h-9 w-9 rounded-full animate-pulse" style={{ background: "var(--surna-elevated)" }} />
        <div className="space-y-1.5">
          <div className="h-3.5 w-28 rounded animate-pulse" style={{ background: "var(--surna-elevated)" }} />
          <div className="h-3 w-16 rounded animate-pulse" style={{ background: "var(--surna-elevated)" }} />
        </div>
      </div>
      <div className="aspect-[4/5] w-full animate-pulse" style={{ background: "var(--surna-elevated)" }} />
      <div className="flex gap-3 px-3 py-2">
        <div className="h-6 w-6 rounded animate-pulse" style={{ background: "var(--surna-elevated)" }} />
        <div className="h-6 w-6 rounded animate-pulse" style={{ background: "var(--surna-elevated)" }} />
        <div className="h-6 w-6 rounded animate-pulse" style={{ background: "var(--surna-elevated)" }} />
      </div>
    </div>
  );
}

type PostsResponse = {
  items: PostWithAuthorEnhanced[];
  nextCursor: string | null;
};

interface FeedResponse {
  items: PostWithAuthor[];
  nextCursor: string | null;
  totalCount?: number;
}


interface SidebarProps {
  suggestedUsers: User[];
  trendingHashtags: Hashtag[];
  onFollowUser: (userId: string) => void;
  onHashtagClick: (tag: string) => void;
  onUserClick: (userId: string) => void;
  followingUserIds: Set<string>;
}

const FEED_TABS = ["For You", "Following", "Events", "Nearby"] as const;
type FeedTabType = (typeof FEED_TABS)[number];

/** Swipeable feed panels (camera is nav action only — Snapchat-style center button) */
const FEED_SWIPE_TABS = ["home", "videos", "notifications", "profile"] as const;
type FeedSwipeTab = (typeof FEED_SWIPE_TABS)[number];

function normalizeFeedBottomTab(tab: string): FeedSwipeTab {
  if (tab === "feed") return "home";
  if (tab === "reels") return "videos";
  return (FEED_SWIPE_TABS as readonly string[]).includes(tab) ? (tab as FeedSwipeTab) : "home";
}

function Sidebar({ suggestedUsers, trendingHashtags, onFollowUser, onHashtagClick, onUserClick, followingUserIds }: SidebarProps) {
  return (
    <div className="hidden lg:block w-80 fixed right-4 top-20 h-[calc(100vh-6rem)] overflow-y-auto">
      <div className="space-y-4">
        <div className="p-4 rounded-2xl" style={entityCardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="h-4 w-4" style={{ color: "var(--surna-gold)" }} />
            <h3 className="font-semibold text-[13px]" style={{ color: "var(--surna-text)" }}>
              Suggested friends
            </h3>
          </div>
          <div className="space-y-3">
            {suggestedUsers.slice(0, 5).map((user) => {
              const following = followingUserIds.has(user.id);
              return (
                <div key={user.id} className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onUserClick(user.id)}
                    className="flex items-center gap-2 text-left min-w-0 flex-1 active:opacity-80"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.profileImageUrl || ""} />
                      <AvatarFallback
                        className="text-[10px]"
                        style={{ background: "var(--surna-bg-highlight)", color: "var(--surna-text)" }}
                      >
                        {user.firstName?.[0]}
                        {user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: "var(--surna-text)" }}>
                        {user.displayName || `${user.firstName} ${user.lastName}`}
                      </p>
                      <p className="text-[11px] truncate" style={{ color: "var(--surna-text-secondary)" }}>
                        {user.username}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={cn(entityBtnClass, "shrink-0 !flex-none h-7 px-3 text-[11px]")}
                    style={following ? entityBtnSurface : { background: "var(--surna-gold)", color: "#000" }}
                    disabled={following}
                    onClick={() => onFollowUser(user.id)}
                  >
                    {following ? "Following" : "Follow"}
                  </button>
                </div>
              );
            })}
            {suggestedUsers.length === 0 ? (
              <p className="text-[12px] text-center py-2" style={{ color: "var(--surna-text-secondary)" }}>
                No suggestions right now
              </p>
            ) : null}
          </div>
        </div>

        <div className="p-4 rounded-2xl" style={entityCardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4" style={{ color: "var(--surna-gold)" }} />
            <h3 className="font-semibold text-[13px]" style={{ color: "var(--surna-text)" }}>
              Trending hashtags
            </h3>
          </div>
          <div className="space-y-2">
            {trendingHashtags.slice(0, 8).map((hashtag) => (
              <button
                key={hashtag.id}
                type="button"
                onClick={() => onHashtagClick(hashtag.tag)}
                className="flex items-center justify-between w-full text-left rounded-lg px-2 py-1.5 active:opacity-80 hover:bg-[var(--surna-bg-highlight)]"
              >
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "var(--surna-bg-highlight)", color: "var(--surna-text)" }}
                >
                  #{hashtag.tag}
                </span>
                <span className="text-[11px]" style={{ color: "var(--surna-text-secondary)" }}>
                  {hashtag.usageCount} posts
                </span>
              </button>
            ))}
            {trendingHashtags.length === 0 ? (
              <p className="text-[12px] text-center py-2" style={{ color: "var(--surna-text-secondary)" }}>
                No trending tags yet
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Feed() {
  const [, setLocation] = useLocation();
  const { openCamera, isOpen: cameraOpen, options: cameraOptions } = useSurnaCamera();
  const feedCameraOpen = cameraOpen && cameraOptions.source === "feed";
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("home");
  const [composerOpen, setComposerOpen] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStory, setSelectedStory] = useState<{ userId: string; storyIndex: number } | null>(null);
  const [showAddStory, setShowAddStory] = useState(false);
  const [showNotifPeek, setShowNotifPeek] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePostId, setSharePostId] = useState<string>("");
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const { videoViewer, openFromPost, openFromGrid, close: closeVideoViewer } = useVideoViewer();
  const feedTabBeforeVideo = useRef<string>("home");
  const feedVideoHistoryPushed = useRef(false);
  const suppressVideoPopClose = useRef(false);
  const goBackFromFeed = useSmartBack({ fallback: "/" });
  const [feedTab, setFeedTab] = useState<FeedTabType>("For You");
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const unreadNotificationCount = useUnreadNotificationCount(isAuthenticated);
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const scrollPositionRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const feedScrollRef = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.5,
    rootMargin: '100px',
  });

  // Optimized infinite query with caching
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['/api/posts/feed-keyset'],
    queryFn: async ({ pageParam }) => {
      const url = pageParam 
        ? `/api/posts/feed-keyset?cursor=${pageParam}&limit=20`
        : '/api/posts/feed-keyset?limit=20';
      
      const response = await apiRequest('GET', url);
      const data = await response.json();
      return data as FeedResponse;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: isAuthenticated,
  });

  // Flatten all posts
  const posts = useMemo(() => 
    data?.pages?.flatMap((page: FeedResponse) => page.items) || [],
    [data]
  );

  // Auto-fetch more when scrolling
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(async () => {
    setFeedRefreshKey((k) => k + 1);
    await refetch();
  }, [refetch]);

  const { isRefreshing, pullDistance, touchHandlers } = usePullToRefresh(handleRefresh, {
    getScrollTop: () => feedScrollRef.current?.scrollTop ?? 0,
  });

  const { like: handleLike, save: handleSave } = usePostEngagement();

  const handleComment = useCallback((postId: string) => {
    setCommentsPostId(postId);
  }, []);

  const handleVideoClick = useCallback((post: PostWithAuthor) => {
    feedTabBeforeVideo.current = normalizeFeedBottomTab(activeTab);
    openFromPost(post, posts);
  }, [openFromPost, posts, activeTab]);

  const handleOpenVideoGrid = useCallback(
    (videos: Parameters<typeof openFromGrid>[0], startIndex: number, mode: Parameters<typeof openFromGrid>[2], label: string) => {
      feedTabBeforeVideo.current = "videos";
      openFromGrid(videos, startIndex, mode, label);
    },
    [openFromGrid],
  );

  const restoreFeedTabAfterVideo = useCallback((tab: string) => {
    const restoreTab = normalizeFeedBottomTab(tab);
    if (restoreTab === "videos" || restoreTab === "notifications") {
      setActiveTab(restoreTab);
    } else {
      setActiveTab("home");
    }
  }, []);

  const handleCloseVideoViewer = useCallback(() => {
    const restoreTab = feedTabBeforeVideo.current;
    closeVideoViewer();
    restoreFeedTabAfterVideo(restoreTab);
    if (feedVideoHistoryPushed.current) {
      suppressVideoPopClose.current = true;
      feedVideoHistoryPushed.current = false;
      window.history.back();
    }
  }, [closeVideoViewer, restoreFeedTabAfterVideo]);

  useEffect(() => {
    if (!videoViewer) return;

    window.history.pushState({ surnaFeedVideoOverlay: true }, "");
    feedVideoHistoryPushed.current = true;

    const onPopState = () => {
      if (suppressVideoPopClose.current) {
        suppressVideoPopClose.current = false;
        return;
      }
      if (!feedVideoHistoryPushed.current) return;
      feedVideoHistoryPushed.current = false;
      const restoreTab = feedTabBeforeVideo.current;
      closeVideoViewer();
      restoreFeedTabAfterVideo(restoreTab);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [videoViewer, closeVideoViewer, restoreFeedTabAfterVideo]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("post");
    if (!id) return;
    setDetailPostId(id);
    setActiveTab("home");
    const url = new URL(window.location.href);
    url.searchParams.delete("post");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const handleShare = useCallback((postId: string) => {
    setSharePostId(postId);
    setShowShareModal(true);
  }, []);

  // Preserve scroll position on the feed scroller (not inner post list)
  useEffect(() => {
    const handleScroll = () => {
      if (feedScrollRef.current) {
        scrollPositionRef.current = feedScrollRef.current.scrollTop;
      }
    };

    const container = feedScrollRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const scrollFeedToTop = useCallback(() => {
    feedScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const { data: apiSuggestedUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/suggested"],
    enabled: isAuthenticated,
  });
  const suggestedUsers = apiSuggestedUsers;

  // Fetch trending hashtags
  const { data: trendingHashtags = [] } = useQuery<Hashtag[]>({
    queryKey: ["/api/hashtags/trending"],
    enabled: isAuthenticated,
  });

  const { data: followingList = [] } = useQuery<Array<{ id: string }>>({
    queryKey: ["/api/users", (user as any)?.id, "following"],
    enabled: isAuthenticated && !!(user as any)?.id,
  });

  const followingIds = useMemo(() => {
    return new Set(followingList.map((f) => f.id).filter(Boolean));
  }, [followingList]);

  const needsDiscover = followingIds.size < 5;

  const filteredPosts = useMemo(() => {
    if (feedTab === "Following") {
      return posts.filter((post: any) => followingIds.has(post?.author?.id));
    }
    if (feedTab === "Events") {
      return posts.filter(
        (post: any) => post.eventId || post.postType === "event" || post.type === "event",
      );
    }
    if (feedTab === "Nearby") {
      return posts.filter(
        (post: any) => post.location || post.placeId || post.place || post.postType === "place",
      );
    }
    return posts;
  }, [feedTab, followingIds, posts]);

  const feedEntries = useMemo(
    () => filteredPosts.map((item) => ({ kind: "api" as const, item })),
    [filteredPosts],
  );

  const videoPostsFromFeed = useMemo(() => {
    return posts
      .filter((p: any) => p.videoUrl)
      .map((p: any) => mapPostToVideoPost(p));
  }, [posts]);

  const handleFollowUser = useCallback(async (userId: string) => {
    try {
      await apiRequest("POST", `/api/users/${userId}/follow`);
      queryClient.invalidateQueries({ queryKey: ["/api/users/suggested"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", (user as any)?.id, "following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/feed-keyset"] });
      toast({ title: "Following!", description: "You'll see more from them in your feed." });
    } catch {
      toast({
        title: "Couldn't follow",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    }
  }, [queryClient, toast]);

  const navigateFromFeed = useCallback(
    (path: string) => {
      markNavReturn(ROUTES.feed);
      setLocation(path);
    },
    [setLocation],
  );

  const handleFeedTabClick = useCallback((tab: FeedTabType) => {
    setFeedTab(tab);
    scrollFeedToTop();
  }, [scrollFeedToTop]);

  const handleTabChange = (tab: string) => {
    if (tab === "profile") {
      navigateFromFeed(ROUTES.profile);
      return;
    }
    const next = normalizeFeedBottomTab(tab);
    const current = normalizeFeedBottomTab(activeTab);
    if (next === current) return;
    setActiveTab(next);
    scrollFeedToTop();
  };

  const feedBottomTab = normalizeFeedBottomTab(activeTab);
  const skipTabScrollReset = useRef(true);

  useEffect(() => {
    if (skipTabScrollReset.current) {
      skipTabScrollReset.current = false;
      return;
    }
    scrollFeedToTop();
  }, [feedBottomTab, scrollFeedToTop]);

  /** Facebook-style: every Home tap → scroll to top + refresh */
  const handleHomePress = useCallback(() => {
    setActiveTab("home");
    setFeedTab("For You");
    setFeedRefreshKey((k) => k + 1);
    scrollFeedToTop();
    void handleRefresh();
  }, [scrollFeedToTop, handleRefresh]);

  const invalidateFeedAndStories = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    queryClient.invalidateQueries({ queryKey: ["/api/posts/feed-keyset"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
  }, [queryClient]);

  const openFeedSnapCamera = useCallback(() => {
    openCamera({
      source: "feed",
      mode: "post",
      onFeedPosted: invalidateFeedAndStories,
      onStoryPosted: invalidateFeedAndStories,
    });
  }, [openCamera, invalidateFeedAndStories]);

  const openVideosCamera = useCallback(
    (captureMode: "reel" | "post") => {
      openCamera({
        source: "feed",
        mode: captureMode === "reel" ? "reel" : "post",
        onFeedPosted: invalidateFeedAndStories,
        onStoryPosted: invalidateFeedAndStories,
      });
    },
    [openCamera, invalidateFeedAndStories],
  );

  const openStoryCamera = useCallback(() => {
    openCamera({
      source: "story",
      mode: "story",
      onStoryPosted: invalidateFeedAndStories,
    });
  }, [openCamera, invalidateFeedAndStories]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surna-base)" }}>
        <EntityEmptyState
          icon={UserProfile}
          title="Sign in to view your feed"
          description="Follow athletes, see stories, and stay up with your sports community."
          actionLabel="Sign in"
          actionHref="/login"
        />
      </div>
    );
  }



  return (
    <div className="min-h-screen" style={{ background: 'var(--surna-base)', color: 'var(--surna-text)' }}>
      <div
        ref={feedScrollRef}
        {...touchHandlers}
        className="mx-auto w-full max-w-[480px]"
        style={{
          minHeight: "100dvh",
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
      <header
        className="surna-header sticky top-0 z-50 flex w-full items-center justify-between gap-2 px-3"
        style={{
          background: "var(--surna-base)",
          paddingTop: "max(6px, env(safe-area-inset-top))",
          paddingBottom: 6,
          minHeight: 44,
        }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={goBackFromFeed}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:scale-95 transition-transform"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.75} style={{ color: "var(--surna-text)" }} />
          </button>
          <span
            className="surna-header-title truncate text-base font-semibold tracking-tight"
            style={{ color: "var(--surna-text)" }}
          >
            Feed
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setShowNotifPeek(true)}
            className="relative flex h-9 w-9 items-center justify-center active:opacity-60 transition-opacity"
            aria-label="Notifications"
            data-testid="bell-notif-btn"
          >
            <Bell className="h-[22px] w-[22px]" strokeWidth={1.75} style={{ color: "var(--surna-text)" }} />
            {unreadNotificationCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white bg-surna-ios-red"
              >
                {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setLocation("/messages")}
            className="flex h-9 w-9 items-center justify-center active:opacity-60 transition-opacity"
            aria-label="Messages"
          >
            <MessageCircle className="h-[22px] w-[22px]" strokeWidth={1.75} style={{ color: "var(--surna-text)" }} />
          </button>
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="flex h-9 w-9 items-center justify-center active:opacity-60 transition-opacity"
            aria-label="Create post"
            data-testid="feed-create-post"
          >
            <Plus className="h-[24px] w-[24px]" strokeWidth={1.75} style={{ color: "var(--surna-text)" }} />
          </button>
        </div>
      </header>



      {/* Main Content */}
      <div className="pb-[calc(54px+env(safe-area-inset-bottom,0px))]">
        <div className="max-w-[480px] mx-auto">
          <div className="flex w-full min-w-0">
            {/* Feed Content */}
            <div className="flex-1 w-full min-w-0">
              <div className="w-full">
                {feedBottomTab === "home" && (
                <div className="animate-in fade-in duration-200">
                    <StoriesBar
                      onStoryClick={(userId, storyIndex) => {
                        setSelectedStory({ userId, storyIndex });
                        setShowStoryViewer(true);
                      }}
                      onAddStory={openStoryCamera}
                    />

                    {needsDiscover && (
                      <FeedDiscoverPeople
                        suggestedUsers={suggestedUsers}
                        followingIds={followingIds}
                        onFollowUser={handleFollowUser}
                        onUserClick={(userId) => setLocation(`/person/${userId}`)}
                      />
                    )}

                    {/* ── Content tabs: For You / Following / Events / Nearby ── */}
                    <div
                      className="border-b"
                      style={{ borderColor: "var(--surna-border)" }}
                    >
                      <div style={{ overflowX: "auto", scrollbarWidth: "none", display: "flex", padding: "10px 16px 12px", gap: 6 }}>
                        {FEED_TABS.map(tab => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => handleFeedTabClick(tab)}
                            style={{
                              flexShrink: 0, padding: "7px 16px", borderRadius: 99,
                              fontSize: 13, fontWeight: 700, cursor: "pointer",
                              transition: "all 0.18s ease",
                              ...feedActiveTabStyle(isDark, feedTab === tab),
                            }}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(pullDistance > 0 || isRefreshing) && (
                      <div
                        className="flex items-center justify-center gap-2 text-token-accent transition-[height,padding]"
                        style={{ height: Math.max(36, pullDistance), paddingTop: pullDistance > 0 ? 8 : 0 }}
                        data-testid="pull-refresh-indicator"
                      >
                        <RefreshCw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
                        <span className="text-sm">{isRefreshing ? "Refreshing…" : "Pull to refresh"}</span>
                      </div>
                    )}

                    <div ref={containerRef} style={{ minHeight: "50vh" }}>
                      {isLoading && feedEntries.length === 0 ? (
                        <div data-testid="posts-loading">
                          <PostSkeleton /><PostSkeleton /><PostSkeleton />
                        </div>
                      ) : (
                        feedEntries.map((entry) => {
                          const post = entry.item as any;
                          if (post.postType === "place" && post.place) {
                            return <PlacePostCard key={post.id} post={post} onShare={handleShare} />;
                          }
                          return (
                            <FeedPostCard
                              key={post.id}
                              post={post}
                              onLike={handleLike}
                              onSave={handleSave}
                              onComment={handleComment}
                              onShare={handleShare}
                              onVideoClick={handleVideoClick}
                            />
                          );
                        })
                      )}
                      {!isLoading && feedEntries.length > 0 && (
                        <div ref={loadMoreRef} className="py-4 flex justify-center" data-testid="load-more-trigger">
                          {isFetchingNextPage ? (
                            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--surna-gold)" }} />
                          ) : hasNextPage ? (
                            <p className="text-[13px]" style={{ color: "var(--surna-text-secondary)" }}>
                              Scroll for more
                            </p>
                          ) : (
                            <p className="text-[13px]" style={{ color: "var(--surna-text-secondary)", opacity: 0.5 }}>
                              You&apos;ve reached the end
                            </p>
                          )}
                        </div>
                      )}
                      {!isLoading && feedEntries.length === 0 && (
                        <div className="px-2">
                          {feedTab === "Following" && (
                            <>
                              <EntityEmptyState
                                icon={Users}
                                title="No posts from people you follow"
                                description="Follow more athletes to fill this tab."
                                compact
                              />
                              <FeedDiscoverPeople
                                suggestedUsers={suggestedUsers}
                                followingIds={followingIds}
                                onFollowUser={handleFollowUser}
                                onUserClick={(userId) => setLocation(`/person/${userId}`)}
                                compact
                              />
                            </>
                          )}
                          {feedTab === "Events" && (
                            <EntityEmptyState
                              icon={Calendar}
                              title="No event posts yet"
                              description="Games, meetups, and match days will show up here."
                              actionLabel="Browse events"
                              onAction={() => navigateFromFeed(ROUTES.events)}
                            />
                          )}
                          {feedTab === "Nearby" && (
                            <EntityEmptyState
                              icon={MapPin}
                              title="No nearby posts right now"
                              description="Check the map for places and games around you."
                              actionLabel="Open map"
                              onAction={() => navigateFromFeed(mapPath())}
                            />
                          )}
                          {feedTab === "For You" && (
                            <EntityEmptyState
                              icon={RefreshCw}
                              title={needsDiscover ? "Your feed is warming up" : "Nothing here yet"}
                              description={
                                needsDiscover
                                  ? "Follow athletes from the suggestions above — For You ranks posts from people you follow and your sports."
                                  : "Pull down to refresh, or share your first moment."
                              }
                              actionLabel={needsDiscover ? undefined : "Create a post"}
                              onAction={needsDiscover ? undefined : () => setComposerOpen(true)}
                              compact={needsDiscover}
                            />
                          )}
                        </div>
                      )}
                    </div>
                </div>
                )}

                {feedBottomTab === "videos" && (
                  <FeedVideosHub
                    videos={videoPostsFromFeed}
                    onOpenViewer={handleOpenVideoGrid}
                    onCreate={openVideosCamera}
                  />
                )}

                {feedBottomTab === "notifications" && (
                  <div className="animate-in fade-in duration-200 rounded-2xl overflow-hidden">
                    <NotificationsPanel />
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <Sidebar 
              suggestedUsers={suggestedUsers}
              trendingHashtags={trendingHashtags}
              onFollowUser={handleFollowUser}
              onHashtagClick={(tag) => setLocation(`/search?hashtag=${encodeURIComponent(tag)}`)}
              onUserClick={(userId) => setLocation(`/person/${userId}`)}
              followingUserIds={followingIds}
            />
          </div>
        </div>
      </div>
      </div>

      {/* Feed bottom nav */}
      <nav
        className="surna-bottom-nav"
        style={{
          transform: feedCameraOpen ? "translateY(120px)" : "translateY(0)",
          transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          opacity: feedCameraOpen ? 0 : 1,
          pointerEvents: feedCameraOpen ? "none" : "auto",
        }}
        aria-label="Feed navigation"
      >
        <button type="button" onClick={handleHomePress} className={cn("nav-item", (activeTab === "home" || activeTab === "feed") && "active")} data-testid="tab-home" aria-label="Home">
          <NavHomeIcon size={24} active={activeTab === "home" || activeTab === "feed"} />
          <span className="nav-label">Home</span>
        </button>
        <button
          type="button"
          onClick={openFeedSnapCamera}
          className="nav-item"
          data-testid="tab-feed-camera"
          aria-label="Camera"
        >
          <Camera className="w-6 h-6" strokeWidth={1.75} />
          <span className="nav-label">Camera</span>
        </button>
        <button type="button" onClick={() => handleTabChange("videos")} className={cn("nav-item", feedBottomTab === "videos" && "active")} data-testid="tab-videos" aria-label="Videos">
          <Play className="w-6 h-6" strokeWidth={feedBottomTab === "videos" ? 2.25 : 1.75} fill={feedBottomTab === "videos" ? "currentColor" : "none"} />
          <span className="nav-label">Videos</span>
        </button>
        <button type="button" onClick={() => handleTabChange("notifications")} className={cn("nav-item relative", activeTab === "notifications" && "active")} data-testid="tab-notifications" aria-label="Notifications">
          <Bell className="w-6 h-6" strokeWidth={activeTab === "notifications" ? 2.25 : 1.75} />
          {unreadNotificationCount > 0 && (
            <span className="absolute top-0.5 right-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-bold text-white px-0.5 bg-surna-ios-red">
              {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
            </span>
          )}
          <span className="nav-label">Alerts</span>
        </button>
        <button type="button" onClick={() => navigateFromFeed(ROUTES.profile)} className="nav-item" data-testid="tab-profile" aria-label="Profile">
          <UserProfile className="w-6 h-6" strokeWidth={activeTab === "profile" ? 2.25 : 1.75} />
          <span className="nav-label">Profile</span>
        </button>
      </nav>

      <PostComposerSheet open={composerOpen} onOpenChange={setComposerOpen} />

      {/* Story Viewer */}
      {showStoryViewer && selectedStory && (
        <StoryViewer
          initialUserId={selectedStory.userId}
          initialStoryIndex={selectedStory.storyIndex}
          onClose={() => {
            setShowStoryViewer(false);
            setSelectedStory(null);
          }}
        />
      )}

      {/* Feed Video Viewer — immersive full-screen overlay */}
      {videoViewer && (
        <FeedVideoViewer
          videos={videoViewer.videos}
          initialIndex={videoViewer.startIndex}
          contextLabel={videoViewer.label}
          mode={videoViewer.mode}
          followingIds={followingIds}
          onEngagementChange={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/posts/feed-keyset"] });
            queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
          }}
          onClose={handleCloseVideoViewer}
        />
      )}

      {/* Notification Peek Sheet */}
      <NotificationPeekSheet
        open={showNotifPeek}
        onClose={() => setShowNotifPeek(false)}
      />

      {/* Add Story Modal */}
      <AddStoryModal
        open={showAddStory}
        onClose={() => setShowAddStory(false)}
      />

      {/* Share Modal */}
      <ShareModal
        postId={sharePostId}
        open={showShareModal}
        onOpenChange={setShowShareModal}
      />

      <CommentsSheet
        isOpen={!!commentsPostId}
        onClose={() => setCommentsPostId(null)}
        postId={commentsPostId || undefined}
      />

      <PostDetailSheet
        postId={detailPostId}
        open={!!detailPostId}
        onClose={() => setDetailPostId(null)}
        onVideoClick={handleVideoClick}
      />

    </div>
  );
}