import { useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { FeedVideoViewer } from "@/components/video/FeedVideoViewer";
import { useVideoViewer } from "@/hooks/useVideoViewer";

type HighlightPost = {
  id: string;
  videoUrl?: string | null;
  content?: string | null;
  author?: Record<string, unknown>;
};

function HighlightTile({ post, onClick }: { post: HighlightPost; onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    void el.play().catch(() => {});
    return () => {
      el.pause();
    };
  }, [post.videoUrl]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="event-highlight-tile shrink-0 relative overflow-hidden active:scale-[0.97] transition-transform"
      aria-label="Open highlight video"
    >
      {post.videoUrl ? (
        <video ref={videoRef} src={post.videoUrl} className="w-full h-full object-cover" muted playsInline loop preload="metadata" />
      ) : null}
      <span className="event-highlight-play">
        <Play size={14} fill="currentColor" />
      </span>
    </button>
  );
}

export function EventHighlights({ eventId, eventTitle }: { eventId: string; eventTitle?: string }) {
  const { videoViewer, openFromPost, close } = useVideoViewer();
  const { data, isLoading } = useQuery<{ highlights?: HighlightPost[] }>({
    queryKey: ["/api/events", eventId, "highlights"],
    enabled: !!eventId,
  });

  const highlights = data?.highlights ?? [];

  if (isLoading) {
    return (
      <div className="px-4 mt-4">
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="event-highlight-tile shrink-0 animate-pulse bg-muted/30" />
          ))}
        </div>
      </div>
    );
  }

  if (highlights.length === 0) return null;

  return (
    <>
      <div className="px-4 mt-5 w-full">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5 text-left">
          Highlights
        </p>
        <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
          <div className="flex gap-3 pb-1">
            {highlights.map((post) => (
              <HighlightTile
                key={post.id}
                post={post}
                onClick={() => openFromPost(post, highlights, eventTitle ? `${eventTitle} highlights` : "Event highlights")}
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
