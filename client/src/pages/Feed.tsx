import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import NotificationsPanel from "@/components/notifications/NotificationsPanel";
import NotificationPeekSheet from "@/components/notifications/NotificationPeekSheet";
import { Heart, MessageCircle, Share2, Users, Zap, TrendingUp, UserPlus, Camera, Play, Trophy, ArrowLeft, Bell, User as UserProfile, Loader2, MoreVertical, Calendar, MapPin, RefreshCw, Bookmark } from "lucide-react";
import { NavHomeIcon } from "@/components/icons/NavHomeIcon";
import { Icon } from "@/components/Icon";
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
import { FeedShareMoment, useSurnaCamera } from "@/features/camera";
import { FeedMenuSheet } from "@/components/feed/FeedMenuSheet";
import { PostManageSheet } from "@/components/feed/PostManageSheet";
import { FeedProfilePanel } from "@/components/feed/FeedProfilePanel";
import { eventDetailPath } from "@/lib/eventRoutes";
import { apiRequest } from "@/lib/queryClient";
import {
  FeedVideoViewer,
  filterVideosByMode,
  inferVideoFormat,
} from "@/components/video/FeedVideoViewer";
import type { VideoPost, FeedViewerMode } from "@/components/video/FeedVideoViewer";
import { flags } from "@/config/flags";
import { StoriesBar } from "@/components/stories/StoriesBar";
import { StoryViewer } from "@/components/stories/StoryViewer";
import { AddStoryModal } from "@/components/stories/AddStoryModal";
import { GoLiveModal } from "@/components/live/GoLiveModal";
import { LiveStreamViewer } from "@/components/live/LiveStreamViewer";
import { ShareModal } from "@/components/ShareModal";
import { CommentsSheet } from "@/components/comments/CommentsSheet";
import { cn } from "@/lib/utils";
import { markNavReturn } from "@/lib/navigation";
import { entityPath, mapPath, resolveContentLinks } from "@/lib/mapNavigation";
import { ROUTES } from "@/navigation";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useUnreadNotificationCount } from "@/hooks/useUnreadNotificationCount";
import { PostCardMediaBackdrop } from "@/components/feed/PostCardMediaBackdrop";
import { postCardTintGradient } from "@/lib/postCardBackground";

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
    <div className="relative p-4 bg-background" data-testid="post-skeleton">
      <div className="absolute bottom-0 left-4 right-4 h-px bg-surna-outline"></div>
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 rounded-full bg-token-text/10" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-32 bg-token-text/10" />
              <Skeleton className="h-3 w-20 bg-token-text/10" />
            </div>
          </div>
          <Skeleton className="h-12 w-full bg-token-text/10" />
          <Skeleton className="h-48 w-full rounded-lg bg-token-text/10" />
          <div className="flex items-center gap-4 pt-2">
            <Skeleton className="h-8 w-16 bg-token-text/10" />
            <Skeleton className="h-8 w-16 bg-token-text/10" />
            <Skeleton className="h-8 w-16 bg-token-text/10" />
          </div>
        </div>
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

// Optimized Post Card with lazy loading
const OptimizedPostCard = ({ post, onLike, onComment, onShare, onVideoClick }: {
  post: PostWithAuthor & { likedByMe?: boolean };
  onLike: (postId: string, currentlyLiked: boolean) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onVideoClick?: (post: PostWithAuthor) => void;
}) => {
  const [, setLocation] = useLocation();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const { user } = useAuth();

  // Derive liked state from the cached post so that when the parent
  // rolls back the cache on failure, the heart re-renders correctly.
  const isLiked = !!post.likedByMe;
  const author = post.author ?? {
    id: "",
    firstName: "SURNA",
    lastName: "Member",
    profileImageUrl: null as string | null,
    email: "",
  };

  // Lazy load images
  const { ref: imageRef, inView: imageInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const handleLike = useCallback(() => {
    onLike(post.id, isLiked);
  }, [isLiked, post.id, onLike]);

  const renderContentWithHashtags = (content: string) => {
    const parts = content.split(/(#[a-zA-Z0-9_]+)/g);
    return parts.map((part, idx) => {
      if (!part.startsWith("#")) return <span key={`txt-${idx}`}>{part}</span>;
      const tag = part.slice(1);
      return (
        <button
          key={`tag-${idx}`}
          onClick={() => setLocation(`/search?hashtag=${encodeURIComponent(tag)}`)}
          className="text-token-accent hover:underline"
          style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
        >
          {part}
        </button>
      );
    });
  };

  return (
    <div className="relative p-4 bg-background">
      {/* Minimal divider line that doesn't touch sides */}
      <div className="absolute bottom-0 left-4 right-4 h-px bg-surna-outline"></div>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => author.id && setLocation(`/person/${author.id}`)}
          className="shrink-0 rounded-full"
          aria-label="View profile"
        >
        <Avatar className="h-8 w-8">
          <AvatarImage 
            src={author.profileImageUrl || undefined} 
            alt={author.firstName || "User"}
          />
          <AvatarFallback className="bg-card border border-border text-foreground text-xs font-medium">
            {author.firstName?.[0] || "U"}
          </AvatarFallback>
        </Avatar>
        </button>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2 gap-2">
            <button
              type="button"
              onClick={() => author.id && setLocation(`/person/${author.id}`)}
              className="text-left min-w-0 flex-1"
            >
              <p className="font-semibold text-sm hover:underline">
                {author.firstName} {author.lastName}
              </p>
              <p className="text-xs text-token-text-muted">
                {new Date(post.createdAt || Date.now()).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              {post.sport && (
                <Badge variant="secondary" className="text-xs">
                  {post.sport}
                </Badge>
              )}
              <button
                type="button"
                onClick={() => setManageOpen(true)}
                className="p-1.5 rounded-full text-token-text-muted hover:text-token-text hover:bg-muted/50 transition-colors"
                aria-label="Post options"
                data-testid={`post-options-${post.id}`}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <p className="text-sm text-token-text mb-3 whitespace-pre-wrap break-words">
            {renderContentWithHashtags(post.content || "")}
          </p>

          {(() => {
            const links = resolveContentLinks({
              postType: (post as { postType?: string }).postType,
              eventId: (post as { eventId?: string }).eventId,
              placeId: (post as { placeId?: string }).placeId,
              teamId: (post as { teamId?: string }).teamId,
            });
            if (!links.primary) return null;
            return (
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border border-border bg-card text-foreground hover:bg-muted/50"
                  onClick={() => setLocation(links.primary!)}
                >
                  {(post as { postType?: string }).postType === "event" ? "View event" : (post as { postType?: string }).postType === "place" ? "View venue" : "View details"}
                </button>
                {links.map && (
                  <button
                    type="button"
                    className="text-xs font-semibold px-3 py-1.5 rounded-full border border-border hover:bg-accent/10"
                    onClick={() => setLocation(links.map!)}
                  >
                    Map
                  </button>
                )}
              </div>
            );
          })()}

          {post.postType === "event" && (post as { eventData?: Record<string, unknown> }).eventData && (
            <div className="mb-3 p-3 sm:p-4 border border-border rounded-lg bg-card w-full">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-foreground truncate">
                    {String((post as { eventData?: { title?: string } }).eventData?.title || "Event")}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {String((post as { eventData?: { date?: string } }).eventData?.date || "Date TBD")}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {String((post as { eventData?: { location?: string } }).eventData?.location || "Location TBD")}
                  </p>
                </div>
              </div>
              <Button
                variant="default"
                className="w-full mt-3 text-sm"
                onClick={() => {
                  const eventData = (post as { eventData?: { id?: string; sport?: string }; eventId?: string }).eventData;
                  const eventId = eventData?.id ?? (post as { eventId?: string }).eventId;
                  if (eventId) setLocation(eventDetailPath(eventId, eventData?.sport ?? (post as { sport?: string }).sport));
                }}
              >
                Join Event
              </Button>
            </div>
          )}
          
          {/* Video card — tap to open immersive viewer */}
          {post.videoUrl && flags.videoContent && (
            <div
              className="mb-3 relative rounded-xl overflow-hidden cursor-pointer"
              style={{ aspectRatio: "16/9", background: "linear-gradient(180deg, #1a0a3d 0%, #2d1165 50%, #0e0514 100%)" }}
              onClick={() => onVideoClick?.(post)}
              data-testid={`video-post-${post.id}`}
            >
              <video
                src={post.videoUrl}
                muted
                playsInline
                preload="metadata"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(10px)", border: "1.5px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Play className="h-6 w-6 text-foreground" style={{ marginLeft: 3 }} />
                </div>
              </div>
              {post.sport && (
                <div style={{ position: "absolute", bottom: 8, left: 10, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)", borderRadius: 10, padding: "2px 8px" }}>
                  {post.sport}
                </div>
              )}
            </div>
          )}
          
          {/* Lazy loaded image — feed cards are a list surface, so we prefer
              the small `_thumb` variant when the resize worker has produced
              one (and serve modern WebP/AVIF siblings via <picture>). Falls
              back to the legacy `imageUrl` for posts that pre-date the
              worker. */}
          {(post.thumbUrl || post.imageUrl) && !post.videoUrl && (() => {
            const baseSrc = post.thumbUrl || post.imageUrl!;
            const webp = post.thumbWebpUrl;
            const avif = post.thumbAvifUrl;
            return (
            <div ref={imageRef} className="relative mb-3 rounded-lg overflow-hidden border border-border">
              {imageInView && (
                <PostCardMediaBackdrop
                  imageUrl={baseSrc}
                  sport={post.sport}
                  contentKind={post.postType ?? undefined}
                  aspectRatio="auto"
                  className="min-h-[200px] max-h-96"
                  showImage={false}
                  mediaSlot={
                    <picture className="block h-full w-full">
                      {avif && <source type="image/avif" srcSet={avif} />}
                      {webp && <source type="image/webp" srcSet={webp} />}
                      <img
                        src={baseSrc}
                        alt="Post"
                        className={`h-full w-full max-h-96 object-cover transition-opacity duration-300 ${
                          imageLoaded ? "opacity-100" : "opacity-0"
                        }`}
                        onLoad={() => setImageLoaded(true)}
                        loading="lazy"
                        data-testid={`image-post-${post.id}`}
                      />
                    </picture>
                  }
                />
              )}
              {!imageLoaded && imageInView && (
                <div className="absolute inset-0 z-[2] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-white/60" />
                </div>
              )}
            </div>
            );
          })()}
          
          {/* Interaction buttons */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className={`p-1 h-8 ${isLiked ? 'text-token-text' : 'text-token-text-muted'} hover:text-token-text transition-colors`}
              onClick={handleLike}
              data-testid={`like-post-${post.id}`}
            >
              <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-xs">{post.likesCount || 0}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-8 text-token-text-muted hover:text-token-text transition-colors"
              onClick={() => onComment(post.id)}
              data-testid={`comment-post-${post.id}`}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              <span className="text-xs">{post.commentsCount || 0}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-8 text-token-text-muted hover:text-token-text transition-colors"
              onClick={() => onShare(post.id)}
              data-testid={`share-post-${post.id}`}
            >
              <Share2 className="h-4 w-4 mr-1" />
              <span className="text-xs">Share</span>
            </Button>
          </div>
        </div>
      </div>

      <PostManageSheet
        post={post}
        open={manageOpen}
        onOpenChange={setManageOpen}
        currentUserId={user?.id}
      />
    </div>
  );
};

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

/** One play badge for reels and long-form grid cards. */
function VideoGridPlayBadge({ durationSec }: { durationSec?: number }) {
  const label =
    durationSec != null
      ? `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}`
      : null;
  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        display: "flex",
        alignItems: "center",
        gap: 5,
        background: "rgba(0,0,0,0.5)",
        borderRadius: 8,
        padding: label ? "4px 8px" : "5px 7px",
      }}
    >
      <Play size={14} color="#fff" fill="#fff" />
      {label && <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{label}</span>}
    </div>
  );
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
  const [feedMenuOpen, setFeedMenuOpen] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStory, setSelectedStory] = useState<{ userId: string; storyIndex: number } | null>(null);
  const [showAddStory, setShowAddStory] = useState(false);
  const [showGoLive, setShowGoLive] = useState(false);
  const [showNotifPeek, setShowNotifPeek] = useState(false);
  const [viewingStream, setViewingStream] = useState<{ streamId: string; isStreamer: boolean } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePostId, setSharePostId] = useState<string>("");
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [videoViewer, setVideoViewer] = useState<{
    videos: VideoPost[];
    startIndex: number;
    label: string;
    mode: FeedViewerMode;
  } | null>(null);
  const [feedTab, setFeedTab] = useState<FeedTabType>("For You");
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const unreadNotificationCount = useUnreadNotificationCount(isAuthenticated);
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const scrollPositionRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const feedScrollRef = useRef<HTMLDivElement>(null);
  const createPostRef = useRef<HTMLDivElement>(null);

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

  // Optimistic updates for likes — flip the cached count instantly,
  // snapshot the previous cache so we can restore it if the request fails.
  const handleLike = useCallback(async (postId: string, currentlyLiked: boolean) => {
    const likeDelta = currentlyLiked ? -1 : 1;
    const queryKey = ['/api/posts/feed-keyset'];

    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData(queryKey);

    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page: FeedResponse) => ({
          ...page,
          items: page.items.map((post: PostWithAuthor & { likedByMe?: boolean }) =>
            post.id === postId
              ? {
                  ...post,
                  likedByMe: !currentlyLiked,
                  likesCount: Math.max(0, (post.likesCount || 0) + likeDelta),
                }
              : post
          ),
        })),
      };
    });

    try {
      if (currentlyLiked) {
        await apiRequest("POST", `/api/posts/${postId}/unlike`);
      } else {
        await apiRequest("POST", `/api/posts/${postId}/like`);
      }
    } catch (error) {
      // Restore the exact prior cache so we don't double-count.
      if (previous !== undefined) {
        queryClient.setQueryData(queryKey, previous);
      }
      toast({
        title: 'Could not update like',
        description: 'Please check your connection and try again.',
        variant: 'destructive',
      });
    }
  }, [queryClient, toast]);

  const handleComment = useCallback((postId: string) => {
    setCommentsPostId(postId);
  }, []);

  const handleVideoClick = useCallback((post: PostWithAuthor) => {
    const author = post.author ?? {
      id: "",
      firstName: "SURNA",
      lastName: "Member",
      profileImageUrl: null as string | null,
      email: "",
    };
    const videoPost: VideoPost = {
      id: post.id,
      videoUrl: post.videoUrl ?? undefined,
      imageUrl: post.imageUrl ?? undefined,
      content: post.content ?? undefined,
      sport: (post as any).sport ?? undefined,
      format: (post as any).videoFormat,
      durationSec: (post as any).durationSec,
      likesCount: post.likesCount ?? 0,
      commentsCount: post.commentsCount ?? 0,
      author: {
        id: author.id,
        firstName: author.firstName,
        lastName: author.lastName,
        profileImageUrl: author.profileImageUrl,
        email: author.email,
      },
    };
    const format = inferVideoFormat(videoPost);
    const mode: FeedViewerMode = format === "video" ? "videos" : "reels";
    const feedVideos = posts
      .filter((p: any) => p.videoUrl)
      .map((p: any) => {
        const a = p.author ?? author;
        const item: VideoPost = {
          id: p.id,
          videoUrl: p.videoUrl ?? undefined,
          format: p.videoFormat,
          durationSec: p.durationSec,
          content: p.content ?? undefined,
          sport: p.sport ?? undefined,
          likesCount: p.likesCount ?? 0,
          commentsCount: p.commentsCount ?? 0,
          author: {
            id: a.id,
            firstName: a.firstName,
            lastName: a.lastName,
            profileImageUrl: a.profileImageUrl,
            email: a.email,
          },
        };
        return { ...item, format: inferVideoFormat(item) };
      });
    const chain = filterVideosByMode(feedVideos, mode);
    const startIndex = chain.findIndex((v) => v.id === post.id);
    setVideoViewer({
      videos: chain,
      startIndex: startIndex >= 0 ? startIndex : 0,
      label: (post as any).sport || (mode === "videos" ? "Videos" : "Reels"),
      mode,
    });
  }, [posts]);

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
      .map((p: any) => {
        const a = p.author ?? {};
        const item: VideoPost = {
          id: p.id,
          videoUrl: p.videoUrl ?? undefined,
          content: p.content ?? undefined,
          sport: p.sport ?? undefined,
          format: p.videoFormat,
          durationSec: p.durationSec,
          likesCount: p.likesCount ?? 0,
          commentsCount: p.commentsCount ?? 0,
          author: {
            id: a.id,
            firstName: a.firstName,
            lastName: a.lastName,
            profileImageUrl: a.profileImageUrl,
            email: a.email,
          },
        };
        return { ...item, format: inferVideoFormat(item) };
      });
  }, [posts]);

  const reelVideos = useMemo(
    () => filterVideosByMode(videoPostsFromFeed, "reels"),
    [videoPostsFromFeed],
  );

  const fullVideos = useMemo(
    () => filterVideosByMode(videoPostsFromFeed, "videos"),
    [videoPostsFromFeed],
  );

  const handleFollowUser = useCallback(async (userId: string) => {
    try {
      await apiRequest("POST", `/api/users/${userId}/follow`);
      queryClient.invalidateQueries({ queryKey: ["/api/users/suggested"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
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

  useEffect(() => {
    const el = feedScrollRef.current;
    if (!el) return;
    if (feedMenuOpen) {
      el.style.overflow = "hidden";
    } else {
      el.style.overflow = "auto";
    }
  }, [feedMenuOpen]);

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
      mode: "photo",
      onFeedPosted: invalidateFeedAndStories,
      onStoryPosted: invalidateFeedAndStories,
    });
  }, [openCamera, invalidateFeedAndStories]);

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
        className="surna-header sticky top-0 z-50 flex w-full items-center justify-between gap-2 border-b px-3"
        style={{
          background: "var(--surna-base)",
          borderColor: "var(--surna-border)",
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
            onClick={() => setShowGoLive(true)}
            className="mr-0.5 flex h-7 items-center gap-1 rounded-full px-2 active:scale-95 transition-transform"
            style={{
              border: "1px solid rgba(255, 59, 48, 0.35)",
              background: "rgba(255, 59, 48, 0.12)",
            }}
            aria-label="Go live"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-surna-ios-red" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-surna-coral">Live</span>
          </button>
          <button
            type="button"
            onClick={() => setShowNotifPeek(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full active:scale-95 transition-transform"
            aria-label="Notifications"
            data-testid="bell-notif-btn"
          >
            <Icon name="bell" size="sm" weight="regular" color="var(--surna-text)" />
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
            className="flex h-9 w-9 items-center justify-center rounded-full active:scale-95 transition-transform"
            aria-label="Messages"
          >
            <Icon name="chat-circle" size="sm" weight="regular" color="var(--surna-text)" />
          </button>
          <button
            type="button"
            onClick={() => setFeedMenuOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full active:scale-95 transition-transform"
            aria-label="Menu"
          >
            <Icon name="dots-three-vertical" size="sm" weight="bold" color="var(--surna-text)" />
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

                    <div ref={createPostRef}>
                      <FeedShareMoment isDark={isDark} />
                    </div>

                    {/* ── Content tabs: For You / Following / Events / Nearby ── */}
                    <div style={{ overflowX: "auto", scrollbarWidth: "none", display: "flex", padding: "8px 16px 4px", gap: 6 }}>
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

                    <div ref={containerRef} className="space-y-0" style={{ minHeight: "50vh" }}>
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
                            <OptimizedPostCard
                              key={post.id}
                              post={post}
                              onLike={handleLike}
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
                        <div className="py-10 px-6 text-center text-token-text-muted space-y-3">
                          {feedTab === "Following" && (
                            <p>Follow players and teams to see their posts here.</p>
                          )}
                          {feedTab === "Events" && (
                            <>
                              <p>No event posts in your feed yet.</p>
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-full"
                                onClick={() => navigateFromFeed(ROUTES.events)}
                              >
                                Browse events
                              </Button>
                            </>
                          )}
                          {feedTab === "Nearby" && (
                            <>
                              <p>No nearby posts right now. Check the map for places and games around you.</p>
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-full"
                                onClick={() => navigateFromFeed(mapPath())}
                              >
                                Open map
                              </Button>
                            </>
                          )}
                          {feedTab === "For You" && (
                            <p>Nothing here yet — pull down to refresh or share a moment above.</p>
                          )}
                        </div>
                      )}
                    </div>
                </div>
                )}

                {feedBottomTab === "videos" && (
                  <div className="animate-in fade-in duration-200 pb-4">
                    <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Play className="h-5 w-5" style={{ color: "var(--surna-text)" }} fill="currentColor" />
                          <h3 className="text-base font-bold" style={{ color: "var(--surna-text)" }}>Videos</h3>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "var(--surna-text-muted)" }}>
                          Reels and full videos · swipe up stays on the same type
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-full shrink-0"
                        style={{ background: "linear-gradient(135deg, #7C3AED, #5B21B6)", color: "#fff", border: "none" }}
                        onClick={openFeedSnapCamera}
                        data-testid="videos-create"
                      >
                        <Camera className="h-4 w-4 mr-1.5" />
                        Create
                      </Button>
                    </div>

                    <p className="px-4 text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--surna-text-muted)" }}>
                      Reels
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 px-2 mb-4">
                      {reelVideos.length === 0 ? (
                        <p className="col-span-2 px-2 py-6 text-center text-sm text-token-text-muted">No reels yet — share a video from the feed.</p>
                      ) : reelVideos.map((video, idx) => (
                        <div
                          key={`reel-${video.id}`}
                          className="relative rounded-xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                          style={{ aspectRatio: "9/16", background: FEED_MEDIA_BG, maxHeight: 280 }}
                          onClick={() => setVideoViewer({ videos: reelVideos, startIndex: idx, label: "Reels", mode: "reels" })}
                          data-testid={`reel-grid-card-${video.id}`}
                        >
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 55%)" }} />
                          <VideoGridPlayBadge />
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 10px" }}>
                            {video.sport && (
                              <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.65)", background: "rgba(0,0,0,0.4)", borderRadius: 8, padding: "2px 6px" }}>{video.sport}</span>
                            )}
                            <p style={{ fontSize: 12, fontWeight: 600, color: "#ffffff", marginTop: 4, lineHeight: 1.3, display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" }}>
                              {video.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="px-4 text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--surna-text-muted)" }}>
                      Full videos
                    </p>
                    <div className="grid grid-cols-1 gap-2 px-2">
                      {fullVideos.length === 0 ? (
                        <p className="px-2 py-6 text-center text-sm text-token-text-muted">No full videos yet.</p>
                      ) : fullVideos.map((video, idx) => (
                        <div
                          key={`video-${video.id}`}
                          className="relative rounded-xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform flex"
                          style={{ aspectRatio: "16/9", background: FEED_MEDIA_BG, minHeight: 120 }}
                          onClick={() => setVideoViewer({ videos: fullVideos, startIndex: idx, label: video.sport || "Videos", mode: "videos" })}
                          data-testid={`video-grid-card-${video.id}`}
                        >
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 100%)" }} />
                          <VideoGridPlayBadge durationSec={video.durationSec} />
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 12px", background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.25, marginBottom: 2 }}>{video.content}</p>
                            <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>
                              {video.author.firstName} {video.author.lastName}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {feedBottomTab === "notifications" && (
                  <div className="animate-in fade-in duration-200 rounded-2xl overflow-hidden">
                    <NotificationsPanel />
                  </div>
                )}

                {feedBottomTab === "profile" && (
                  <div className="animate-in fade-in duration-200 px-4 pt-3">
                    <FeedProfilePanel user={user as any} onNavigate={navigateFromFeed} />
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
          <Play className="w-6 h-6" strokeWidth={feedBottomTab === "videos" ? 2.5 : 1.5} fill={feedBottomTab === "videos" ? "currentColor" : "none"} />
          <span className="nav-label">Videos</span>
        </button>
        <button type="button" onClick={() => handleTabChange("notifications")} className={cn("nav-item relative", activeTab === "notifications" && "active")} data-testid="tab-notifications" aria-label="Notifications">
          <Bell className="w-6 h-6" strokeWidth={activeTab === "notifications" ? 2.5 : 1.5} />
          {unreadNotificationCount > 0 && (
            <span className="absolute top-0.5 right-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-bold text-white px-0.5 bg-surna-ios-red">
              {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
            </span>
          )}
          <span className="nav-label">Alerts</span>
        </button>
        <button type="button" onClick={() => handleTabChange("profile")} className={cn("nav-item", activeTab === "profile" && "active")} data-testid="tab-profile" aria-label="Profile">
          <UserProfile className="w-6 h-6" strokeWidth={activeTab === "profile" ? 2.5 : 1.5} />
          <span className="nav-label">Profile</span>
        </button>
      </nav>

      <FeedMenuSheet
        open={feedMenuOpen}
        onClose={() => setFeedMenuOpen(false)}
        onNavigate={navigateFromFeed}
      />

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
          onClose={() => setVideoViewer(null)}
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

      {/* Go Live Modal */}
      <GoLiveModal
        open={showGoLive}
        onClose={() => setShowGoLive(false)}
        onStreamStarted={(streamId) => {
          setViewingStream({ streamId, isStreamer: true });
        }}
      />

      {/* Live Stream Viewer */}
      {viewingStream && (
        <LiveStreamViewer
          streamId={viewingStream.streamId}
          isStreamer={viewingStream.isStreamer}
          onClose={() => setViewingStream(null)}
        />
      )}

    </div>
  );
}