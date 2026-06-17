import { Eye, Play } from "lucide-react";
import type { VideoPost } from "@/components/video/FeedVideoViewer";
import { fmtMediaCount } from "@/components/video/immersiveMediaUi";

function GridThumbnail({ video }: { video: VideoPost }) {
  if (video.imageUrl) {
    return (
      <img
        src={video.imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
    );
  }
  if (video.videoUrl) {
    return (
      <video
        src={video.videoUrl}
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover pointer-events-none"
      />
    );
  }
  return (
    <div
      className="absolute inset-0"
      style={{ background: "linear-gradient(180deg, var(--surna-elevated) 0%, var(--surna-base) 100%)" }}
    />
  );
}

type VideoGridCardProps = {
  video: VideoPost;
  variant: "reel" | "full";
  onClick: () => void;
  testId?: string;
};

/** Discovery grid tile — Instagram explore style (3-col reels or full-width row). */
export function VideoGridCard({ video, variant, onClick, testId }: VideoGridCardProps) {
  const isReel = variant === "reel";
  const viewCount = video.likesCount ?? 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="relative overflow-hidden cursor-pointer active:opacity-90 transition-opacity bg-black"
      style={{
        aspectRatio: isReel ? "9/16" : "16/9",
        minHeight: isReel ? undefined : 120,
      }}
      data-testid={testId}
    >
      <GridThumbnail video={video} />

      {/* View count — bottom left */}
      {viewCount > 0 && (
        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 z-[1]">
          <Eye className="h-3.5 w-3.5 text-white drop-shadow-md" strokeWidth={2} />
          <span className="text-[12px] font-semibold text-white drop-shadow-md tabular-nums">
            {fmtMediaCount(viewCount)}
          </span>
        </div>
      )}

      {!isReel && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Play className="h-10 w-10 text-white/85 drop-shadow-lg" fill="currentColor" strokeWidth={0} />
        </div>
      )}
    </div>
  );
}
