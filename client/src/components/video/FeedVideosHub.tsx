import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
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

/** Videos bottom-tab hub — Instagram explore-style reel grid. */
export function FeedVideosHub({ videos, onOpenViewer, onCreate }: FeedVideosHubProps) {
  const [segment, setSegment] = useState<HubSegment>("reels");
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const reelVideos = useMemo(() => filterVideosByMode(videos, "reels"), [videos]);
  const fullVideos = useMemo(() => filterVideosByMode(videos, "videos"), [videos]);

  const sports = useMemo(() => {
    const set = new Set<string>();
    for (const v of [...reelVideos, ...fullVideos]) {
      if (v.sport) set.add(v.sport);
    }
    return Array.from(set).sort();
  }, [reelVideos, fullVideos]);

  const filteredReels = useMemo(() => {
    let list = sportFilter ? reelVideos.filter((v) => v.sport === sportFilter) : reelVideos;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          v.content?.toLowerCase().includes(q) ||
          v.sport?.toLowerCase().includes(q) ||
          `${v.author.firstName ?? ""} ${v.author.lastName ?? ""}`.toLowerCase().includes(q),
      );
    }
    return list;
  }, [reelVideos, sportFilter, searchQuery]);

  const filteredFull = useMemo(() => {
    let list = sportFilter ? fullVideos.filter((v) => v.sport === sportFilter) : fullVideos;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          v.content?.toLowerCase().includes(q) ||
          v.sport?.toLowerCase().includes(q) ||
          `${v.author.firstName ?? ""} ${v.author.lastName ?? ""}`.toLowerCase().includes(q),
      );
    }
    return list;
  }, [fullVideos, sportFilter, searchQuery]);

  const activeList = segment === "reels" ? filteredReels : filteredFull;
  const viewerMode: FeedViewerMode = segment === "reels" ? "reels" : "videos";

  const openAt = (idx: number) => {
    const chain = segment === "reels" ? filteredReels : filteredFull;
    onOpenViewer(chain, idx, viewerMode, sportFilter || (segment === "reels" ? "Reels" : "Videos"));
  };

  return (
    <div className="animate-in fade-in duration-200 pb-4">
      {/* Search + filter row */}
      <div className="px-3 pt-2 pb-2 flex items-center gap-2">
        <div
          className="flex-1 flex items-center gap-2 h-10 px-3 rounded-xl"
          style={{ background: "var(--surna-elevated)", border: "1px solid var(--surna-border)" }}
        >
          <Search className="h-4 w-4 shrink-0" strokeWidth={2} style={{ color: "var(--surna-text-muted)" }} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="flex-1 min-w-0 bg-transparent text-[14px] outline-none"
            style={{ color: "var(--surna-text)" }}
            data-testid="videos-search"
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen((o) => !o)}
          className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl active:opacity-70"
          style={{
            background: filterOpen || sportFilter || segment === "videos" ? "var(--surna-bg-press)" : "var(--surna-elevated)",
            border: "1px solid var(--surna-border)",
          }}
          aria-label="Filters"
          data-testid="videos-filter-toggle"
        >
          <SlidersHorizontal className="h-5 w-5" strokeWidth={1.75} style={{ color: "var(--surna-text)" }} />
        </button>
      </div>

      {/* Reels / full videos — always visible, neutral pills like events/home */}
      <div className="px-3 pb-2">
        <div
          className="flex gap-1.5 p-1 rounded-xl"
          style={{ background: "var(--surna-elevated)", border: "1px solid var(--surna-border)" }}
        >
          {(["reels", "videos"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSegment(key)}
              className={cn("flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all")}
              style={
                segment === key
                  ? { background: "var(--surna-bg-press)", color: "var(--surna-text)" }
                  : { color: "var(--surna-text-muted)" }
              }
              data-testid={`videos-segment-${key}`}
            >
              {key === "reels" ? "Reels" : "Full videos"}
            </button>
          ))}
        </div>
      </div>

      {filterOpen && (
        <div className="px-3 pb-3 space-y-2">
          {sports.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setSportFilter(null)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={
                  sportFilter === null
                    ? { background: "var(--surna-bg-press)", color: "var(--surna-text)", border: "1px solid var(--surna-border)" }
                    : { background: "var(--surna-elevated)", color: "var(--surna-text-secondary)", border: "1px solid var(--surna-border)" }
                }
              >
                All
              </button>
              {sports.map((sport) => (
                <button
                  key={sport}
                  type="button"
                  onClick={() => setSportFilter(sportFilter === sport ? null : sport)}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={
                    sportFilter === sport
                      ? { background: "var(--surna-bg-press)", color: "var(--surna-text)", border: "1px solid var(--surna-border)" }
                      : { background: "var(--surna-elevated)", color: "var(--surna-text-secondary)", border: "1px solid var(--surna-border)" }
                  }
                >
                  {sport}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => onCreate(segment === "reels" ? "reel" : "post")}
            className="w-full py-2 text-[13px] font-semibold rounded-lg active:opacity-80"
            style={{
              background: "var(--surna-bg-press)",
              color: "var(--surna-text)",
              border: "1px solid var(--surna-border)",
            }}
            data-testid="videos-create"
          >
            Create {segment === "reels" ? "reel" : "video"}
          </button>
        </div>
      )}

      {activeList.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm" style={{ color: "var(--surna-text-muted)" }}>
          {segment === "reels" ? "No reels yet — capture one from the camera." : "No full videos yet."}
        </p>
      ) : segment === "reels" ? (
        <div className="-mx-0 grid grid-cols-3 gap-[1px]">
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
        <div className="grid grid-cols-1 gap-[1px] px-0">
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
