import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle } from "lucide-react";
import { markNavReturn } from "@/lib/navigation";
import { getEventCoverUrl } from "@/lib/eventCover";
import { apiRequest } from "@/lib/queryClient";
import { ROUTES } from "@/navigation";
import type { PostWithAuthor } from "@shared/schema";

const PHOTO_SCRIM = "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.12) 100%)";

type FeedResponse = {
  items: PostWithAuthor[];
  nextCursor: string | null;
};

function authorLabel(post: PostWithAuthor): string {
  const author = post.author;
  if (!author) return "Member";
  return author.displayName || author.firstName || author.username || "Member";
}

function authorInitials(post: PostWithAuthor): string {
  const name = authorLabel(post);
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "SU";
}

function locationLabel(post: PostWithAuthor & { place?: { name?: string } }): string | null {
  if (post.location?.trim()) return post.location.trim();
  if (post.place?.name?.trim()) return post.place.name.trim();
  return null;
}

function FeedCardSkeleton() {
  return (
    <div
      className="w-full rounded-xl overflow-hidden animate-pulse"
      style={{ background: "var(--surna-elevated)", border: "1px solid var(--surna-border)" }}
    >
      <div className="w-full aspect-video" style={{ background: "var(--surna-surface)" }} />
      <div className="px-3 py-2.5 space-y-2">
        <div className="h-3 rounded w-4/5" style={{ background: "var(--surna-surface)" }} />
        <div className="h-3 rounded w-1/3" style={{ background: "var(--surna-surface)" }} />
      </div>
    </div>
  );
}

/** Single feed highlight inside a card — not a full feed post layout. */
export function HomeFeedPostsSection({ contentSeed }: { contentSeed: number }) {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/posts/feed", contentSeed],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/posts/feed?limit=1");
      return (await response.json()) as FeedResponse;
    },
    staleTime: 60_000,
  });

  const post = data?.items?.[0] ?? null;

  const openFeed = () => {
    markNavReturn("/");
    setLocation(ROUTES.feed);
  };

  return (
    <section className="space-y-3">
      <h2
        className="text-base font-bold text-left"
        style={{ fontFamily: "Inter, sans-serif", color: "var(--surna-text)" }}
      >
        From the feed
      </h2>

      {isLoading ? (
        <FeedCardSkeleton />
      ) : !post ? (
        <div
          className="rounded-xl px-4 py-6 text-center"
          style={{ background: "var(--surna-elevated)", border: "1px solid var(--surna-border)" }}
        >
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--surna-text-secondary)" }}>
            Nothing in your feed yet — follow teams and players to see posts here
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={openFeed}
          className="w-full text-left rounded-xl overflow-hidden active:scale-[0.99] transition-transform"
          style={{ background: "var(--surna-elevated)", border: "1px solid var(--surna-border)" }}
        >
          <div className="relative w-full aspect-video overflow-hidden">
            {(() => {
              const coverPhoto =
                post.imageUrl?.trim() ||
                getEventCoverUrl({ sport: post.sport ?? undefined, title: post.content?.slice(0, 80) });
              const heroBg = coverPhoto || "#121212";
              return coverPhoto ? (
                <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="absolute inset-0" style={{ background: heroBg }} />
              );
            })()}
            <div className="absolute inset-0" style={{ background: PHOTO_SCRIM }} />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                {post.author?.profileImageUrl ? (
                  <img
                    src={post.author.profileImageUrl}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ background: "rgba(255,255,255,0.2)" }}
                  >
                    {authorInitials(post)}
                  </div>
                )}
                <span className="text-[12px] font-bold text-white truncate">{authorLabel(post)}</span>
                {post.createdAt && (
                  <span className="text-[10px] text-white/60 ml-auto shrink-0">
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </span>
                )}
              </div>
              <p className="text-[13px] font-bold text-white leading-snug line-clamp-2 drop-shadow-sm">
                {post.content?.slice(0, 90)}
              </p>
              {locationLabel(post) && (
                <p className="text-[11px] text-white/70 mt-0.5 line-clamp-1">{locationLabel(post)}</p>
              )}
            </div>
          </div>
          <div className="px-3 py-2.5 flex items-center justify-between gap-3">
            <p className="text-[12px] leading-snug line-clamp-2 flex-1" style={{ color: "var(--surna-text-secondary)" }}>
              {post.content}
            </p>
            <div className="flex items-center gap-3 shrink-0" style={{ color: "var(--surna-text-muted)" }}>
              <span className="flex items-center gap-1 text-[11px]">
                <Heart size={14} />
                {post.likesCount ?? 0}
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <MessageCircle size={14} />
                {post.commentsCount ?? 0}
              </span>
            </div>
          </div>
        </button>
      )}
    </section>
  );
}
