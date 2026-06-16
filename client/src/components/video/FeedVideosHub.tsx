import { useMemo, useState } from "react";
import { Camera, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { filterVideosByMode } from "@/components/video/FeedVideoViewer";
import type { FeedViewerMode, VideoPost } from "@/components/video/FeedVideoViewer";
import { VideoGridCard } from "@/components/video/VideoGridCard";
import { cn } from "@/lib/utils";

type HubSegment = "reels" | "videos";

type FeedVideosHubProps = {
  videos: VideoPost[];
  onOpenViewer: (videos: VideoPost[], startIndex: number, mode: FeedViewerMode, label: string) => void;
  onCreate: (mode: "reel" | "post") => void;
};

function segmentActiveStyle(active: boolean) {
  return active
    ? { background: "var(--surna-bg-press)", color: "var(--surna-text)", border: "1px solid var(--surna-border)" }
    : { background: "transparent", color: "var(--surna-text-muted)", border: "1px solid transparent" };
}

/** Videos bottom-tab hub — reels / full-video discovery with sport filters. */
export function FeedVideosHub({ videos, onOpenViewer, onCreate }: FeedVideosHubProps) {
  const [segment, setSegment] = useState<HubSegment>("reels");
  const [sportFilter, setSportFilter] = useState<string | null>(null);

  const reelVideos = useMemo(() => filterVideosByMode(videos, "reels"), [videos]);
  const fullVideos = useMemo(() => filterVideosByMode(videos, "videos"), [videos]);

  const sports = useMemo(() => {
    const set = new Set<string>();
    for (const v of [...reelVideos, ...fullVideos]) {
      if (v.sport) set.add(v.sport);
    }
    return Array.from(set).sort();
  }, [reelVideos, fullVideos]);

  const filteredReels = useMemo(
    () => (sportFilter ? reelVideos.filter((v) => v.sport === sportFilter) : reelVideos),
    [reelVideos, sportFilter],
  );
  const filteredFull = useMemo(
    () => (sportFilter ? fullVideos.filter((v) => v.sport === sportFilter) : fullVideos),
    [fullVideos, sportFilter],
  );

  const activeList = segment === "reels" ? filteredReels : filteredFull;
  const viewerMode: FeedViewerMode = segment === "reels" ? "reels" : "videos";

  const openAt = (idx: number) => {
    const chain = segment === "reels" ? filteredReels : filteredFull;
    onOpenViewer(chain, idx, viewerMode, sportFilter || (segment === "reels" ? "Reels" : "Videos"));
  };

  return (
    <div className="animate-in fade-in duration-200 pb-4">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5" style={{ color: "var(--surna-text)" }} fill="currentColor" />
            <h3 className="text-base font-bold" style={{ color: "var(--surna-text)" }}>
              Videos
            </h3>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--surna-text-muted)" }}>
            Sport clips & full sessions · swipe up in viewer
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-full shrink-0 bg-primary text-primary-foreground border-0"
          onClick={() => onCreate(segment === "reels" ? "reel" : "post")}
          data-testid="videos-create"
        >
          <Camera className="h-4 w-4 mr-1.5" />
          Create
        </Button>
      </div>

      {/* Reels | Full videos */}
      <div className="px-4 mb-3 flex gap-1.5 p-1 rounded-xl" style={{ background: "var(--surna-elevated)" }}>
        {(["reels", "videos"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSegment(key)}
            className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all")}
            style={segmentActiveStyle(segment === key)}
            data-testid={`videos-segment-${key}`}
          >
            {key === "reels" ? "Reels" : "Full videos"}
          </button>
        ))}
      </div>

      {/* Sport chips — Surna filter row */}
      {sports.length > 0 && (
        <div
          className="px-4 mb-3 flex gap-2 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          <button
            type="button"
            onClick={() => setSportFilter(null)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={
              sportFilter === null
                ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
                : { background: "var(--surna-elevated)", color: "var(--surna-text-muted)" }
            }
          >
            All sports
          </button>
          {sports.map((sport) => (
            <button
              key={sport}
              type="button"
              onClick={() => setSportFilter(sportFilter === sport ? null : sport)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={
                sportFilter === sport
                  ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
                  : { background: "var(--surna-elevated)", color: "var(--surna-text-muted)" }
              }
            >
              {sport}
            </button>
          ))}
        </div>
      )}

      {activeList.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm" style={{ color: "var(--surna-text-muted)" }}>
          {segment === "reels"
            ? "No reels yet — capture a reel from the camera."
            : "No full videos yet — share a longer session from the feed."}
        </p>
      ) : segment === "reels" ? (
        <div className="grid grid-cols-2 gap-1.5 px-2">
          {filteredReels.map((video, idx) => (
            <VideoGridCard
              key={`reel-${video.id}`}
              video={video}
              variant="reel"
              onClick={() => openAt(idx)}
              testId={`reel-grid-card-${video.id}`}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 px-2">
          {filteredFull.map((video, idx) => (
            <VideoGridCard
              key={`video-${video.id}`}
              video={video}
              variant="full"
              onClick={() => openAt(idx)}
              testId={`video-grid-card-${video.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
