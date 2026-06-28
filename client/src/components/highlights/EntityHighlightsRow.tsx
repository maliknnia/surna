import { useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { FeedVideoViewer } from "@/components/video/FeedVideoViewer";
import { useVideoViewer } from "@/hooks/useVideoViewer";

export type HighlightPost = {
  id: string;
  videoUrl?: string | null;
  content?: string | null;
  author?: Record<string, unknown>;
};

type TileSize = "event" | "team" | "place";

const TILE_CLASS: Record<TileSize, string> = {
  event: "entity-highlight-tile entity-highlight-tile--event",
  team: "entity-highlight-tile entity-highlight-tile--team",
  place: "entity-highlight-tile entity-highlight-tile--place",
};

function HighlightTile({
  post,
  size,
  scrollRootRef,
  onClick,
}: {
  post: HighlightPost;
  size: TileSize;
  scrollRootRef: React.RefObject<HTMLDivElement | null>;
  onClick: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    const root = scrollRootRef.current;
    if (!el) return;

    el.muted = true;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { root: root ?? undefined, threshold: 0.55, rootMargin: "0px 8px" },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      el.pause();
    };
  }, [post.videoUrl, scrollRootRef]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${TILE_CLASS[size]} shrink-0 relative overflow-hidden active:scale-[0.97] transition-transform`}
      aria-label="Open highlight video"
    >
      {post.videoUrl ? (
        <video
          ref={videoRef}
          src={post.videoUrl}
          className="w-full h-full object-cover"
          muted
          playsInline
          loop
          preload="metadata"
        />
      ) : null}
      <span className="entity-highlight-play">
        <Play size={14} fill="currentColor" />
      </span>
    </button>
  );
}

export function EntityHighlightsRow({
  queryKey,
  enabled = true,
  label = "Highlights",
  contextLabel,
  size = "event",
  className = "",
  paddingX = "px-4",
}: {
  queryKey: unknown[];
  enabled?: boolean;
  label?: string;
  contextLabel?: string;
  size?: TileSize;
  className?: string;
  paddingX?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { videoViewer, openFromPost, close } = useVideoViewer();
  const { data, isLoading } = useQuery<{ highlights?: HighlightPost[] }>({
    queryKey,
    enabled,
  });

  const highlights = data?.highlights ?? [];

  if (isLoading) {
    return (
      <div className={`${paddingX} mt-4 ${className}`}>
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`${TILE_CLASS[size]} shrink-0 animate-pulse bg-muted/30`} />
          ))}
        </div>
      </div>
    );
  }

  if (highlights.length === 0) return null;

  const viewerLabel = contextLabel ?? label;

  return (
    <>
      <div className={`${paddingX} mt-5 w-full ${className}`}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5 text-left">
          {label}
        </p>
        <div ref={scrollRef} className="overflow-x-auto no-scrollbar -mx-1 px-1">
          <div className="flex gap-3 pb-1">
            {highlights.map((post) => (
              <HighlightTile
                key={post.id}
                post={post}
                size={size}
                scrollRootRef={scrollRef}
                onClick={() => openFromPost(post, highlights, viewerLabel)}
              />
            ))}
          </div>
        </div>
      </div>

      {videoViewer ? (
        <FeedVideoViewer
          videos={videoViewer.videos}
          initialIndex={videoViewer.startIndex}
          contextLabel={videoViewer.label}
          mode={videoViewer.mode}
          onClose={close}
        />
      ) : null}
    </>
  );
}
