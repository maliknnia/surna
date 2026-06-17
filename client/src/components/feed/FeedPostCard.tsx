import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useInView } from "react-intersection-observer";
import { format } from "date-fns";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreVertical,
  Loader2,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { PostWithAuthor } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { PostManageSheet } from "@/components/feed/PostManageSheet";
import { inferVideoFormat } from "@/components/video/FeedVideoViewer";
import type { VideoPost } from "@/components/video/FeedVideoViewer";
import { fmtMediaCount } from "@/components/video/immersiveMediaUi";
import { eventDetailPath } from "@/lib/eventRoutes";
import { resolveContentLinks } from "@/lib/mapNavigation";
import { clampFeedAspectRatio, feedAspectCss, feedAspectFromDimensions } from "@/lib/feedMediaAspect";
import { flags } from "@/config/flags";
import { cn } from "@/lib/utils";

const CAPTION_COLLAPSE_CHARS = 120;

function FeedPostCaption({
  authorName,
  content,
  renderHashtags,
}: {
  authorName: string;
  content: string;
  renderHashtags: (text: string) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = content.trim();
  if (!trimmed) return null;
  const needsMore = trimmed.length > CAPTION_COLLAPSE_CHARS;

  return (
    <div className="px-3 pb-1 text-[14px] leading-snug" style={{ color: "var(--surna-text)" }}>
      <span className="font-semibold mr-1.5">{authorName}</span>
      <span className="whitespace-pre-wrap break-words">
        {needsMore && !expanded
          ? renderHashtags(`${trimmed.slice(0, CAPTION_COLLAPSE_CHARS).trim()}…`)
          : renderHashtags(trimmed)}
        {needsMore && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="ml-1 font-semibold active:opacity-70"
            style={{ color: "var(--surna-text-secondary)" }}
          >
            {expanded ? "less" : "more"}
          </button>
        )}
      </span>
    </div>
  );
}

function FeedActionWithCount({
  icon: Icon,
  count,
  active,
  activeClass,
  onClick,
  label,
  testId,
  iconClass,
}: {
  icon: typeof Heart;
  count?: number;
  active?: boolean;
  activeClass?: string;
  onClick: () => void;
  label: string;
  testId?: string;
  iconClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 py-2 pl-2 pr-1 active:opacity-60 transition-opacity"
      aria-label={label}
      data-testid={testId}
    >
      <Icon
        className={cn("h-[26px] w-[26px] shrink-0", active && activeClass, iconClass)}
        strokeWidth={active ? 0 : 1.75}
        style={!active ? { color: "var(--surna-text)" } : undefined}
      />
      {(count ?? 0) > 0 && (
        <span className="text-[14px] font-semibold tabular-nums" style={{ color: "var(--surna-text)" }}>
          {fmtMediaCount(count!)}
        </span>
      )}
    </button>
  );
}

function FeedPostVideo({
  post,
  authorName,
  authorId,
  authorAvatar,
  onOpen,
  onOptions,
}: {
  post: PostWithAuthor & { videoFormat?: string; durationSec?: number };
  authorName: string;
  authorId: string;
  authorAvatar?: string | null;
  onOpen: () => void;
  onOptions: () => void;
}) {
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { ref, inView } = useInView({ threshold: 0.55 });
  const [muted, setMuted] = useState(true);
  const format = inferVideoFormat({
    id: post.id,
    format: (post as { videoFormat?: "reel" | "video" }).videoFormat,
    durationSec: (post as { durationSec?: number }).durationSec,
  } as VideoPost);
  const aspect = format === "reel" ? 4 / 5 : 16 / 9;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = muted;
    if (inView) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [inView, muted]);

  const initials = authorName.charAt(0) || "U";

  return (
    <div
      ref={ref}
      className="relative w-full cursor-pointer bg-black"
      style={{ aspectRatio: `${aspect}` }}
      onClick={onOpen}
      data-testid={`video-post-${post.id}`}
    >
      <video
        ref={videoRef}
        src={post.videoUrl!}
        muted
        playsInline
        loop={format === "reel"}
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)" }}
      />

      {/* Top-left: author on video */}
      <div className="absolute top-2.5 left-2.5 right-12 flex items-center gap-2 z-10 pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (authorId) setLocation(`/person/${authorId}`);
          }}
          className="flex items-center gap-2 min-w-0"
        >
          <Avatar className="h-8 w-8 ring-2 ring-white/90">
            <AvatarImage src={authorAvatar || undefined} alt={authorName} />
            <AvatarFallback className="text-xs font-bold bg-black/40 text-white">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-[13px] font-semibold text-white truncate drop-shadow-md">{authorName}</span>
        </button>
      </div>

      {/* Top-right: options */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOptions();
        }}
        className="absolute top-2 right-1.5 z-10 p-1.5 pointer-events-auto active:opacity-70"
        aria-label="Post options"
      >
        <MoreVertical className="h-6 w-6 text-white drop-shadow-md" strokeWidth={1.75} />
      </button>

      {/* Bottom-right: mute */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMuted((m) => !m);
        }}
        className="absolute bottom-2.5 right-2.5 z-10 p-1.5 pointer-events-auto active:opacity-70"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? (
          <VolumeX className="h-5 w-5 text-white drop-shadow-md" strokeWidth={1.75} />
        ) : (
          <Volume2 className="h-5 w-5 text-white drop-shadow-md" strokeWidth={1.75} />
        )}
      </button>

      {!inView && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Play className="h-10 w-10 text-white/90 drop-shadow-md" fill="currentColor" strokeWidth={0} />
        </div>
      )}
    </div>
  );
}

export interface FeedPostCardProps {
  post: PostWithAuthor & { likedByMe?: boolean; savedByMe?: boolean; sharesCount?: number | null };
  onLike: (postId: string, currentlyLiked: boolean) => void;
  onSave: (postId: string, currentlySaved: boolean) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onVideoClick?: (post: PostWithAuthor) => void;
  onDeleted?: () => void;
}

export function FeedPostCard({
  post,
  onLike,
  onSave,
  onComment,
  onShare,
  onVideoClick,
  onDeleted,
}: FeedPostCardProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageAspect, setImageAspect] = useState(1);
  const [manageOpen, setManageOpen] = useState(false);
  const lastTapRef = useRef(0);

  const isLiked = !!post.likedByMe;
  const isSaved = !!post.savedByMe;
  const isVideo = Boolean(post.videoUrl && flags.videoContent);
  const author = post.author ?? {
    id: "",
    firstName: "SURNA",
    lastName: "Member",
    profileImageUrl: null as string | null,
    email: "",
  };
  const authorName = `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() || "Member";
  const postDate = post.createdAt ? format(new Date(post.createdAt), "d MMMM") : null;

  const { ref: imageRef, inView: imageInView } = useInView({
    triggerOnce: true,
    threshold: 0.05,
  });

  const renderContentWithHashtags = useCallback(
    (content: string) => {
      const parts = content.split(/(#[a-zA-Z0-9_]+)/g);
      return parts.map((part, idx) => {
        if (!part.startsWith("#")) return <span key={`txt-${idx}`}>{part}</span>;
        const tag = part.slice(1);
        return (
          <button
            key={`tag-${idx}`}
            type="button"
            onClick={() => setLocation(`/search?hashtag=${encodeURIComponent(tag)}`)}
            className="text-primary hover:underline"
            style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
          >
            {part}
          </button>
        );
      });
    },
    [setLocation],
  );

  const handleMediaDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      if (!isLiked) onLike(post.id, false);
    }
    lastTapRef.current = now;
  }, [isLiked, onLike, post.id]);

  const links = resolveContentLinks({
    postType: (post as { postType?: string }).postType,
    eventId: (post as { eventId?: string }).eventId,
    placeId: (post as { placeId?: string }).placeId,
    teamId: (post as { teamId?: string }).teamId,
  });

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageAspect(clampFeedAspectRatio(img.naturalWidth, img.naturalHeight));
    setImageLoaded(true);
  };

  const aspectStyle = { aspectRatio: feedAspectCss(imageAspect) };

  return (
    <article
      className="mb-3"
      style={{ background: "var(--surna-base)", color: "var(--surna-text)" }}
      data-testid={`feed-post-${post.id}`}
    >
      {/* Header — photos/text only (videos use overlay) */}
      {!isVideo && (
        <div className="flex items-center gap-3 px-3 py-2">
          <button
            type="button"
            onClick={() => author.id && setLocation(`/person/${author.id}`)}
            className="shrink-0 rounded-full"
            aria-label="View profile"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={author.profileImageUrl || undefined} alt={authorName} />
              <AvatarFallback
                className="text-xs font-semibold"
                style={{ background: "var(--surna-elevated)", color: "var(--surna-text)" }}
              >
                {author.firstName?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
          </button>
          <button
            type="button"
            onClick={() => author.id && setLocation(`/person/${author.id}`)}
            className="min-w-0 flex-1 text-left"
          >
            <p className="truncate text-[14px] font-semibold leading-tight" style={{ color: "var(--surna-text)" }}>
              {authorName}
            </p>
            {postDate && (
              <p className="truncate text-[12px] leading-tight mt-0.5" style={{ color: "var(--surna-text-secondary)" }}>
                {postDate}
              </p>
            )}
          </button>
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="p-1 active:opacity-60"
            aria-label="Post options"
            data-testid={`post-options-${post.id}`}
          >
            <MoreVertical className="h-6 w-6" strokeWidth={1.75} style={{ color: "var(--surna-text)" }} />
          </button>
        </div>
      )}

      {isVideo && (
        <FeedPostVideo
          post={post}
          authorName={authorName}
          authorId={author.id}
          authorAvatar={author.profileImageUrl}
          onOpen={() => onVideoClick?.(post)}
          onOptions={() => setManageOpen(true)}
        />
      )}

      {(post.thumbUrl || post.imageUrl) && !isVideo && (
        <div ref={imageRef} onClick={handleMediaDoubleTap} className="w-full bg-black">
          {imageInView && (() => {
            const baseSrc = post.thumbUrl || post.imageUrl!;
            const webp = post.thumbWebpUrl;
            const avif = post.thumbAvifUrl;
            return (
              <div className="w-full" style={imageLoaded ? aspectStyle : { aspectRatio: "1" }}>
                <picture className="block w-full h-full">
                  {avif && <source type="image/avif" srcSet={avif} />}
                  {webp && <source type="image/webp" srcSet={webp} />}
                  <img
                    src={baseSrc}
                    alt="Post"
                    className={cn(
                      "w-full h-full object-cover transition-opacity duration-200",
                      imageLoaded ? "opacity-100" : "opacity-0",
                    )}
                    onLoad={handleImageLoad}
                    loading="lazy"
                    data-testid={`image-post-${post.id}`}
                  />
                </picture>
              </div>
            );
          })()}
          {!imageLoaded && imageInView && (
            <div className="flex w-full items-center justify-center bg-black" style={{ aspectRatio: "1" }}>
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--surna-text-muted)" }} />
            </div>
          )}
        </div>
      )}

      {/* Actions — inline counts like Instagram */}
      <div className="flex items-center pr-1.5 pl-0.5" style={{ color: "var(--surna-text)" }}>
        <FeedActionWithCount
          icon={Heart}
          count={post.likesCount ?? 0}
          active={isLiked}
          activeClass="fill-red-500 text-red-500"
          onClick={() => onLike(post.id, isLiked)}
          label={isLiked ? "Unlike" : "Like"}
          testId={`like-post-${post.id}`}
        />
        <FeedActionWithCount
          icon={MessageCircle}
          count={post.commentsCount ?? 0}
          onClick={() => onComment(post.id)}
          label="Comment"
          testId={`comment-post-${post.id}`}
        />
        <FeedActionWithCount
          icon={Send}
          count={post.sharesCount ?? 0}
          onClick={() => onShare(post.id)}
          label="Share"
          iconClass="-rotate-[24deg]"
          testId={`share-post-${post.id}`}
        />
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => onSave(post.id, isSaved)}
          className="p-2 active:opacity-60"
          aria-label={isSaved ? "Unsave" : "Save"}
          data-testid={`save-post-${post.id}`}
        >
          <Bookmark
            className={cn("h-[26px] w-[26px]", isSaved && "fill-[var(--surna-text)]")}
            strokeWidth={isSaved ? 0 : 1.75}
            style={{ color: "var(--surna-text)" }}
          />
        </button>
      </div>

      {post.content?.trim() && (
        <FeedPostCaption
          authorName={authorName}
          content={post.content}
          renderHashtags={renderContentWithHashtags}
        />
      )}

      {post.postType === "event" && (post as { eventData?: { title?: string; id?: string; sport?: string } }).eventData && (
        <button
          type="button"
          className="mx-3 mb-1 text-left text-sm font-semibold text-primary hover:underline"
          onClick={() => {
            const eventData = (post as { eventData?: { id?: string; sport?: string } }).eventData;
            const eventId = eventData?.id ?? (post as { eventId?: string }).eventId;
            if (eventId) {
              setLocation(eventDetailPath(eventId, eventData?.sport ?? (post as { sport?: string }).sport));
            }
          }}
        >
          View event
          {(post as { eventData?: { title?: string } }).eventData?.title
            ? ` · ${(post as { eventData?: { title?: string } }).eventData!.title}`
            : ""}
        </button>
      )}

      {links.primary && post.postType !== "event" && (
        <button
          type="button"
          className="mx-3 mb-1 text-sm font-semibold text-primary hover:underline"
          onClick={() => setLocation(links.primary!)}
        >
          {(post as { postType?: string }).postType === "place" ? "View venue" : "View details"}
        </button>
      )}

      {(post.commentsCount ?? 0) > 0 && (
        <button
          type="button"
          onClick={() => onComment(post.id)}
          className="px-3 pb-1 text-left text-[14px] active:opacity-70"
          style={{ color: "var(--surna-text-secondary)" }}
          data-testid={`view-comments-${post.id}`}
        >
          View all {post.commentsCount} comments
        </button>
      )}

      <PostManageSheet
        post={post}
        open={manageOpen}
        onOpenChange={setManageOpen}
        currentUserId={user?.id}
        onDeleted={onDeleted}
      />
    </article>
  );
}
