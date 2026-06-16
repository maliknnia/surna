import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useInView } from "react-intersection-observer";
import { formatDistanceToNow } from "date-fns";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreVertical,
  Loader2,
  Play,
} from "lucide-react";
import type { PostWithAuthor } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCardMediaBackdrop } from "@/components/feed/PostCardMediaBackdrop";
import { useAuth } from "@/hooks/useAuth";
import { PostManageSheet } from "@/components/feed/PostManageSheet";
import { inferVideoFormat } from "@/components/video/FeedVideoViewer";
import type { VideoPost } from "@/components/video/FeedVideoViewer";
import { eventDetailPath } from "@/lib/eventRoutes";
import { resolveContentLinks } from "@/lib/mapNavigation";
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
    <div className="px-3 pb-1 text-sm leading-snug text-foreground">
      <span className="font-semibold mr-1.5">{authorName}</span>
      <span className="whitespace-pre-wrap break-words">
        {needsMore && !expanded
          ? renderHashtags(`${trimmed.slice(0, CAPTION_COLLAPSE_CHARS).trim()}…`)
          : renderHashtags(trimmed)}
        {needsMore && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="ml-1 font-semibold text-muted-foreground hover:text-foreground"
          >
            {expanded ? "less" : "more"}
          </button>
        )}
      </span>
    </div>
  );
}

function FeedPostVideo({
  post,
  onOpen,
}: {
  post: PostWithAuthor & { videoFormat?: string; durationSec?: number };
  onOpen: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { ref, inView } = useInView({ threshold: 0.55 });
  const format = inferVideoFormat({
    id: post.id,
    format: (post as { videoFormat?: "reel" | "video" }).videoFormat,
    durationSec: (post as { durationSec?: number }).durationSec,
  } as VideoPost);
  const aspect = format === "reel" ? "4 / 5" : "16 / 9";

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (inView) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [inView]);

  return (
    <div
      ref={ref}
      className="relative w-full cursor-pointer bg-black"
      style={{ aspectRatio: aspect }}
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
      {!inView && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Play className="h-10 w-10 text-white/90 drop-shadow-md" fill="currentColor" strokeWidth={0} />
        </div>
      )}
    </div>
  );
}

export interface FeedPostCardProps {
  post: PostWithAuthor & { likedByMe?: boolean; savedByMe?: boolean };
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
  const [manageOpen, setManageOpen] = useState(false);
  const lastTapRef = useRef(0);

  const isLiked = !!post.likedByMe;
  const isSaved = !!post.savedByMe;
  const author = post.author ?? {
    id: "",
    firstName: "SURNA",
    lastName: "Member",
    profileImageUrl: null as string | null,
    email: "",
  };
  const authorName = `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() || "Member";

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

  return (
    <article className="border-b border-border bg-background" data-testid={`feed-post-${post.id}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={() => author.id && setLocation(`/person/${author.id}`)}
          className="shrink-0 rounded-full"
          aria-label="View profile"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={author.profileImageUrl || undefined} alt={authorName} />
            <AvatarFallback className="bg-muted text-xs font-semibold">
              {author.firstName?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
        </button>
        <button
          type="button"
          onClick={() => author.id && setLocation(`/person/${author.id}`)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-semibold leading-tight">{authorName}</p>
          {post.sport && (
            <p className="truncate text-xs text-muted-foreground">{post.sport}</p>
          )}
        </button>
        <button
          type="button"
          onClick={() => setManageOpen(true)}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          aria-label="Post options"
          data-testid={`post-options-${post.id}`}
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      {/* Media — full width, no scrim */}
      {post.videoUrl && flags.videoContent && (
        <FeedPostVideo post={post} onOpen={() => onVideoClick?.(post)} />
      )}

      {(post.thumbUrl || post.imageUrl) && !post.videoUrl && (
        <div ref={imageRef} onClick={handleMediaDoubleTap} className="w-full">
          {imageInView && (() => {
            const baseSrc = post.thumbUrl || post.imageUrl!;
            const webp = post.thumbWebpUrl;
            const avif = post.thumbAvifUrl;
            return (
              <PostCardMediaBackdrop
                imageUrl={baseSrc}
                sport={post.sport}
                contentKind={post.postType ?? undefined}
                aspectRatio="4/5"
                className="w-full"
                clean
                showImage={false}
                mediaSlot={
                  <picture className="block h-full w-full">
                    {avif && <source type="image/avif" srcSet={avif} />}
                    {webp && <source type="image/webp" srcSet={webp} />}
                    <img
                      src={baseSrc}
                      alt="Post"
                      className={cn(
                        "h-full w-full object-cover transition-opacity duration-200",
                        imageLoaded ? "opacity-100" : "opacity-0",
                      )}
                      onLoad={() => setImageLoaded(true)}
                      loading="lazy"
                      data-testid={`image-post-${post.id}`}
                    />
                  </picture>
                }
              />
            );
          })()}
          {!imageLoaded && imageInView && (
            <div className="flex aspect-[4/5] w-full items-center justify-center bg-muted">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 px-3 py-2">
        <button
          type="button"
          onClick={() => onLike(post.id, isLiked)}
          className="p-1 transition-transform active:scale-95"
          aria-label={isLiked ? "Unlike" : "Like"}
          data-testid={`like-post-${post.id}`}
        >
          <Heart
            className={cn("h-6 w-6", isLiked ? "fill-red-500 text-red-500" : "text-foreground")}
            strokeWidth={isLiked ? 0 : 2}
          />
        </button>
        <button
          type="button"
          onClick={() => onComment(post.id)}
          className="p-1 transition-transform active:scale-95"
          aria-label="Comment"
          data-testid={`comment-post-${post.id}`}
        >
          <MessageCircle className="h-6 w-6 text-foreground" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => onShare(post.id)}
          className="p-1 transition-transform active:scale-95"
          aria-label="Share"
          data-testid={`share-post-${post.id}`}
        >
          <Send className="h-6 w-6 text-foreground -rotate-12" strokeWidth={1.75} />
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => onSave(post.id, isSaved)}
          className="p-1 transition-transform active:scale-95"
          aria-label={isSaved ? "Unsave" : "Save"}
          data-testid={`save-post-${post.id}`}
        >
          <Bookmark
            className={cn("h-6 w-6", isSaved ? "fill-foreground text-foreground" : "text-foreground")}
            strokeWidth={isSaved ? 0 : 1.75}
          />
        </button>
      </div>

      {(post.likesCount ?? 0) > 0 && (
        <p className="px-3 pb-1 text-sm font-semibold">
          {(post.likesCount ?? 0).toLocaleString()} {(post.likesCount ?? 0) === 1 ? "like" : "likes"}
        </p>
      )}

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
          className="px-3 pb-1 text-left text-sm text-muted-foreground hover:text-foreground"
          data-testid={`view-comments-${post.id}`}
        >
          View all {post.commentsCount} comments
        </button>
      )}

      <p className="px-3 pb-3 pt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {formatDistanceToNow(new Date(post.createdAt || Date.now()), { addSuffix: true })}
      </p>

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
