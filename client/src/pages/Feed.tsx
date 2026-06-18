import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import NotificationsPanel from "@/components/notifications/NotificationsPanel";
import NotificationPeekSheet from "@/components/notifications/NotificationPeekSheet";
import { Heart, MessageCircle, Share2, Users, Zap, TrendingUp, UserPlus, Camera, Play, Trophy, ArrowLeft, Bell, User as UserProfile, Loader2, Plus, Calendar, MapPin, RefreshCw, Bookmark } from "lucide-react";
import { NavHomeIcon } from "@/components/icons/NavHomeIcon";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
import { markNavReturn } from "@/lib/navigation";
import { entityPath, mapPath, resolveContentLinks } from "@/lib/mapNavigation";
import { ROUTES } from "@/navigation";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useUnreadNotificationCount } from "@/hooks/useUnreadNotificationCount";
import { usePostEngagement } from "@/hooks/usePostEngagement";
import { useVideoViewer } from "@/hooks/useVideoViewer";
import { mapPostToVideoPost } from "@/lib/mapPostToVideoPost";
import { DEMO_FEED_VIDEOS, DEMO_REELS } from "@/components/video/FeedVideoViewer";

/** Neutral media placeholder for non-tinted surfaces (e.g. video rail) */
const FEED_MEDIA_BG = "var(--surna-elevated)";

/** Event/team CTAs — solid #fff pills read as white boxes on dark feed */
function feedPrimaryCtaStyle(isDark: boolean, joined?: boolean) {
  if (joined) {
    return {
      background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      color: isDark ? "rgba(255,255,255,0.42)" : "rgba(0,0,0,0.38)",
    };
  }
  return {
    background: isDark ? "hsl(var(--primary))" : "#000000",
    color: "hsl(var(--primary-foreground))",
  };
}

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
        <Skeleton className="h-9 w-9 rounded-full bg-token-text/10" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-28 bg-token-text/10" />
          <Skeleton className="h-3 w-16 bg-token-text/10" />
        </div>
      </div>
      <Skeleton className="aspect-[4/5] w-full rounded-none bg-token-text/10" />
      <div className="flex gap-3 px-3 py-2">
        <Skeleton className="h-6 w-6 rounded bg-token-text/10" />
        <Skeleton className="h-6 w-6 rounded bg-token-text/10" />
        <Skeleton className="h-6 w-6 rounded bg-token-text/10" />
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
      <div className="space-y-6">
        {/* Suggested Friends */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="h-4 w-4 text-token-text" />
              <h3 className="font-semibold text-sm text-token-text">Suggested Friends</h3>
            </div>
            <div className="space-y-3">
              {suggestedUsers.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onUserClick(user.id)}
                    className="flex items-center gap-2 text-left min-w-0 flex-1"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.profileImageUrl || ""} />
                      <AvatarFallback className="text-xs bg-card border border-border text-foreground">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-token-text">{user.displayName || `${user.firstName} ${user.lastName}`}</p>
                      <p className="text-xs text-token-text-muted truncate">{user.username}</p>
                    </div>
                  </button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-6 px-2 shrink-0"
                    disabled={followingUserIds.has(user.id)}
                    onClick={() => onFollowUser(user.id)}
                  >
                    {followingUserIds.has(user.id) ? "Following" : "Follow"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trending Hashtags */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-token-text" />
              <h3 className="font-semibold text-sm text-token-text">Trending Hashtags</h3>
            </div>
            <div className="space-y-2">
              {trendingHashtags.slice(0, 8).map((hashtag) => (
                <button
                  key={hashtag.id}
                  type="button"
                  onClick={() => onHashtagClick(hashtag.tag)}
                  className="flex items-center justify-between w-full text-left hover:opacity-80"
                >
                  <Badge variant="secondary" className="text-xs">
                    #{hashtag.tag}
                  </Badge>
                  <span className="text-xs text-token-text-muted">{hashtag.usageCount} posts</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
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
      console.log('[Fix 1] Home feed loaded from API:', url, `${(data as FeedResponse).items?.length ?? 0} posts`);
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
    openFromPost(post, posts);
  }, [openFromPost, posts]);

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
    const fromFeed = posts
      .filter((p: any) => p.videoUrl)
      .map((p: any) => mapPostToVideoPost(p));
    if (fromFeed.length > 0) return fromFeed;
    return [...DEMO_REELS, ...DEMO_FEED_VIDEOS];
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-token-text">Please log in to view the social feed.</p>
        </div>
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
            onClick={() => setLocation("/")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:scale-95 transition-transform"
            aria-label="Back to home"
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
                          {isFetchingNextPage
                            ? <Loader2 className="h-6 w-6 animate-spin text-token-text" />
                            : hasNextPage
                              ? <p className="text-sm text-token-text">Scroll for more</p>
                              : <p className="text-sm text-token-text opacity-30">You've reached the end</p>
                          }
                        </div>
                      )}
                      {!isLoading && feedEntries.length === 0 && (
                        <div className="py-6 px-3 space-y-4">
                          {feedTab === "Following" && (
                            <>
                              <p className="text-center text-sm" style={{ color: "var(--surna-text-secondary)" }}>
                                Follow athletes to see their posts here first.
                              </p>
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
                            <div className="py-4 px-3 text-center text-token-text-muted space-y-3">
                              <p>No event posts in your feed yet.</p>
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-full"
                                onClick={() => navigateFromFeed(ROUTES.events)}
                              >
                                Browse events
                              </Button>
                            </div>
                          )}
                          {feedTab === "Nearby" && (
                            <div className="py-4 px-3 text-center text-token-text-muted space-y-3">
                              <p>No nearby posts right now. Check the map for places and games around you.</p>
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-full"
                                onClick={() => navigateFromFeed(mapPath())}
                              >
                                Open map
                              </Button>
                            </div>
                          )}
                          {feedTab === "For You" && (
                            <div className="py-4 px-3 text-center space-y-3">
                              <p className="text-sm" style={{ color: "var(--surna-text-secondary)" }}>
                                {needsDiscover
                                  ? "Follow a few athletes below — your For You feed ranks posts from people you follow and your sports."
                                  : "Nothing here yet — pull down to refresh."}
                              </p>
                              {!needsDiscover && (
                                <Button
                                  type="button"
                                  className="rounded-full"
                                  onClick={() => setComposerOpen(true)}
                                >
                                  Create a post
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                </div>
                )}

                {feedBottomTab === "videos" && (
                  <FeedVideosHub
                    videos={videoPostsFromFeed}
                    onOpenViewer={openFromGrid}
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
          onClose={closeVideoViewer}
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