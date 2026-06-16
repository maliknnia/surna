import { Play } from "lucide-react";
import type { VideoPost } from "@/components/video/FeedVideoViewer";

const FEED_MEDIA_BG = "var(--surna-elevated)";

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

function GridThumbnail({ video }: { video: VideoPost }) {
  if (video.imageUrl) {
    return (
      <img
        src={video.imageUrl}
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
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
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
      />
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, var(--surna-elevated) 0%, var(--surna-base) 100%)",
      }}
    />
  );
}

type VideoGridCardProps = {
  video: VideoPost;
  variant: "reel" | "full";
  onClick: () => void;
  testId?: string;
};

/** Discovery grid tile — reels (9:16) or full video (16:9). */
export function VideoGridCard({ video, variant, onClick, testId }: VideoGridCardProps) {
  const isReel = variant === "reel";

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
      className="relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
      style={{
        aspectRatio: isReel ? "9/16" : "16/9",
        background: FEED_MEDIA_BG,
        maxHeight: isReel ? 280 : undefined,
        minHeight: isReel ? undefined : 120,
        borderRadius: 12,
      }}
      data-testid={testId}
    >
      <GridThumbnail video={video} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isReel
            ? "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 55%)"
            : "linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 100%)",
        }}
      />
      <VideoGridPlayBadge durationSec={isReel ? undefined : video.durationSec} />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: isReel ? "8px 10px" : "10px 12px",
          background: isReel ? undefined : "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
        }}
      >
        {video.sport && isReel && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(255,255,255,0.65)",
              background: "rgba(0,0,0,0.4)",
              borderRadius: 8,
              padding: "2px 6px",
            }}
          >
            {video.sport}
          </span>
        )}
        {video.content && (
          <p
            style={{
              fontSize: isReel ? 12 : 13,
              fontWeight: isReel ? 600 : 700,
              color: "#ffffff",
              marginTop: isReel && video.sport ? 4 : 0,
              marginBottom: isReel ? 0 : 2,
              lineHeight: 1.3,
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: isReel ? 2 : 2,
              overflow: "hidden",
            }}
          >
            {video.content}
          </p>
        )}
        {!isReel && (
          <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>
            {[video.author.firstName, video.author.lastName].filter(Boolean).join(" ") || "Athlete"}
          </p>
        )}
      </div>
    </div>
  );
}
