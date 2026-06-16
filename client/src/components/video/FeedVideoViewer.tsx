import { useState, useRef, useEffect, useCallback, useMemo, type MouseEvent } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, Heart, MessageCircle, Share2, Bookmark,
  Volume2, VolumeX, Play,
  MoreHorizontal, Flag, Ban, Copy,
} from "lucide-react";
import { CommentsSheet } from "@/components/comments/CommentsSheet";
import { ShareModal } from "@/components/ShareModal";
import {
  ImmersiveActionIcon,
  ImmersiveCaption,
  PrimaryEntityLink,
  IMMERSIVE,
} from "@/components/video/immersiveMediaUi";
import { usePostEngagement } from "@/hooks/usePostEngagement";
import {
  hideCreatorInSession,
  isDemoMediaId,
  submitContentReport,
} from "@/lib/feedMediaActions";

/* ─── Types ────────────────────────────────────────────────────────────────── */

export type VideoFormat = "reel" | "video";

export interface VideoPost {
  id: string;
  videoUrl?: string | null;
  imageUrl?: string | null;
  content?: string | null;
  sport?: string | null;
  sportEmoji?: string | null;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  likedByMe?: boolean;
  savedByMe?: boolean;
  context?: "For You" | "Nearby" | "Following";
  format?: VideoFormat;
  durationSec?: number;
  entityType?: "team" | "event" | "challenge" | "coach" | "person";
  entityId?: string;
  role?: "coach" | "player" | "team" | "organizer";
  location?: string | null;
  distance?: string | null;
  eventName?: string | null;
  author: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    profileImageUrl?: string | null;
    email?: string | null;
  };
}

export type FeedViewerMode = "reels" | "videos";

/** Reel vs long-form — used to keep vertical scroll on one format at a time. */
export function inferVideoFormat(v: VideoPost): VideoFormat {
  if (v.format === "reel" || v.format === "video") return v.format;
  if (v.durationSec != null && v.durationSec > 90) return "video";
  return "reel";
}

export function formatForViewerMode(mode: FeedViewerMode): VideoFormat {
  return mode === "videos" ? "video" : "reel";
}

export function demoPoolForMode(mode: FeedViewerMode): VideoPost[] {
  return mode === "videos" ? DEMO_FEED_VIDEOS : DEMO_REELS;
}

/** Only items matching the opened viewer mode (reels chain or videos chain). */
export function filterVideosByMode(videos: VideoPost[], mode: FeedViewerMode): VideoPost[] {
  const target = formatForViewerMode(mode);
  const filtered = videos.filter((v) => inferVideoFormat(v) === target);
  const fallback = demoPoolForMode(mode);
  return filtered.length > 0 ? filtered : fallback;
}

interface FeedVideoViewerProps {
  videos: VideoPost[];
  initialIndex?: number;
  contextLabel?: string;
  mode?: FeedViewerMode;
  followingIds?: Set<string>;
  onClose: () => void;
  onEngagementChange?: () => void;
}

/* ─── Demo videos ─────────────────────────────────────────────────────────── */

const DEMO_GRADIENTS = [
  "linear-gradient(180deg,#1a0a3d 0%,#2d1165 45%,#0e0514 100%)",
  "linear-gradient(180deg,#0a1a2d 0%,#0f3460 45%,#050d14 100%)",
  "linear-gradient(180deg,#1a0d0a 0%,#4a1800 45%,#100800 100%)",
  "linear-gradient(180deg,#0a1a0d 0%,#0d4018 45%,#040d06 100%)",
  "linear-gradient(180deg,#1a1000 0%,#3d2800 45%,#0d0900 100%)",
  "linear-gradient(180deg,#12002d 0%,#280060 45%,#080012 100%)",
  "linear-gradient(180deg,#1a0010 0%,#42001a 45%,#0d0008 100%)",
];

const SPORT_EMOJIS: Record<string, string> = {
  Basketball: "🏀", Football: "⚽", Soccer: "⚽", Fitness: "🏋️",
  Swimming: "🏊", Tennis: "🎾", Running: "🏃", Yoga: "🧘",
  CrossFit: "💪", MMA: "🥊", Rugby: "🏉", Volleyball: "🏐",
};

export const DEMO_REELS: VideoPost[] = [
  {
    id: "dv1", content: "Game day drill — our U17 squad running the new press break at full pace 🏀🔥",
    sport: "Basketball", sportEmoji: "🏀", format: "reel",
    likesCount: 1247, commentsCount: 84, sharesCount: 56,
    context: "For You", entityType: "team", entityId: "dt1", role: "team",
    location: "Cork", distance: "1.4 km", eventName: "U17 Training · Daily 6pm",
    author: { id: "u1", firstName: "Marcus", lastName: "Johnson", profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=marcus` },
  },
  {
    id: "dv2", content: "Strength block session — progressive overload week 4. Squat numbers are moving 💪",
    sport: "Fitness", sportEmoji: "🏋️", format: "reel",
    likesCount: 892, commentsCount: 41, sharesCount: 19,
    context: "For You", entityType: "coach", entityId: "dc0", role: "coach",
    location: "Dublin", distance: "8 km",
    author: { id: "u2", firstName: "Sarah", lastName: "Chen", profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=sarah` },
  },
  {
    id: "dv3", content: "Local 5-a-side tournament goal of the day — just look at the technique ⚽️",
    sport: "Soccer", sportEmoji: "⚽", format: "reel",
    likesCount: 3104, commentsCount: 167, sharesCount: 234,
    context: "Nearby", entityType: "event", entityId: "demo-ev-5v5-soccer", role: "organizer",
    location: "Cork", distance: "0.8 km", eventName: "5-a-side · Tonight 7pm",
    author: { id: "u3", firstName: "Jordan", lastName: "Williams", profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=jordan` },
  },
  {
    id: "dv4", content: "60-day swim challenge update — 2km each morning, this is day 38 🏊‍♂️",
    sport: "Swimming", sportEmoji: "🏊", format: "reel",
    likesCount: 521, commentsCount: 33, sharesCount: 12,
    context: "Following", entityType: "challenge", role: "player",
    location: "Limerick", distance: "12 km",
    author: { id: "u4", firstName: "Alex", lastName: "Rivera", profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=alex` },
  },
  {
    id: "dv5", content: "Tennis serve clinic recap — look at the toss height difference between lesson 1 and today 🎾",
    sport: "Tennis", sportEmoji: "🎾", format: "reel",
    likesCount: 789, commentsCount: 52, sharesCount: 31,
    context: "For You", entityType: "coach", entityId: "dc1", role: "coach",
    location: "Cork", distance: "3 km",
    author: { id: "u5", firstName: "Taylor", lastName: "Smith", profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=taylor` },
  },
  {
    id: "dv6", content: "Sunday trail run recap 🏃 12km through the Cork hills, the views were insane 🌄",
    sport: "Running", sportEmoji: "🏃", format: "reel",
    likesCount: 643, commentsCount: 39, sharesCount: 27,
    context: "Nearby", entityType: "event", entityId: "demo-ev-trail-run", role: "organizer",
    location: "Cork", distance: "4 km", eventName: "Trail Run · Sunday 8am",
    author: { id: "u6", firstName: "Dylan", lastName: "Healy", profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=dylan` },
  },
  {
    id: "dv7", content: "Morning yoga flow — 20 minutes that changed everything 🧘 Try this sequence! #yoga",
    sport: "Yoga", sportEmoji: "🧘", format: "reel",
    likesCount: 1891, commentsCount: 94, sharesCount: 143,
    context: "Following", entityType: "coach", entityId: "dc3", role: "coach",
    location: "Cork", distance: "1.4 km",
    author: { id: "u7", firstName: "Leila", lastName: "Musa", profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=leila` },
  },
];

export const DEMO_FEED_VIDEOS: VideoPost[] = [
  {
    id: "fv1",
    content: "Full match highlights — U17 championship semifinal extended cut with coach breakdown",
    sport: "Basketball", sportEmoji: "🏀", format: "video", durationSec: 754,
    likesCount: 4201, commentsCount: 312, sharesCount: 89,
    context: "For You", entityType: "team", entityId: "dt1", role: "team",
    location: "Cork", distance: "1.4 km",
    author: { id: "u1", firstName: "Marcus", lastName: "Johnson", profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=marcus` },
  },
  {
    id: "fv2",
    content: "45-min strength seminar — progressive overload, deload weeks, and tracking PRs",
    sport: "Fitness", sportEmoji: "🏋️", format: "video", durationSec: 2712,
    likesCount: 2890, commentsCount: 198, sharesCount: 64,
    context: "For You", entityType: "coach", entityId: "dc0", role: "coach",
    location: "Dublin", distance: "8 km",
    author: { id: "u2", firstName: "Sarah", lastName: "Chen", profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=sarah` },
  },
  {
    id: "fv3",
    content: "Tournament day vlog — 5-a-side cup from warm-up to penalties ⚽",
    sport: "Soccer", sportEmoji: "⚽", format: "video", durationSec: 1180,
    likesCount: 6102, commentsCount: 421, sharesCount: 210,
    context: "Nearby", entityType: "event", entityId: "demo-ev-5v5-soccer", role: "organizer",
    location: "Cork", distance: "0.8 km", eventName: "5-a-side cup final",
    author: { id: "u3", firstName: "Jordan", lastName: "Williams", profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=jordan` },
  },
  {
    id: "fv4",
    content: "Open-water swim technique — sighting, breathing, and race-day pacing",
    sport: "Swimming", sportEmoji: "🏊", format: "video", durationSec: 936,
    likesCount: 1544, commentsCount: 87, sharesCount: 41,
    context: "Following", entityType: "coach", entityId: "dc2", role: "coach",
    location: "Limerick", distance: "12 km",
    author: { id: "u4", firstName: "Alex", lastName: "Rivera", profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=alex` },
  },
  {
    id: "fv5",
    content: "Trail ultra documentary — 42km Cork ridge route with crew support",
    sport: "Running", sportEmoji: "🏃", format: "video", durationSec: 3420,
    likesCount: 3310, commentsCount: 256, sharesCount: 118,
    context: "Nearby", entityType: "event", entityId: "demo-ev-trail-run", role: "organizer",
    location: "Cork", distance: "4 km", eventName: "Ridge ultra",
    author: { id: "u6", firstName: "Dylan", lastName: "Healy", profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=dylan` },
  },
];

export const DEMO_VIDEOS = DEMO_REELS;

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function fmtDuration(sec?: number) {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function authorName(v: VideoPost) {
  return v.author.firstName && v.author.lastName
    ? `${v.author.firstName} ${v.author.lastName}`
    : v.author.email || "User";
}
function authorInitials(v: VideoPost) {
  const f = v.author.firstName?.[0] || "";
  const l = v.author.lastName?.[0]  || "";
  return (f + l).toUpperCase() || "U";
}

const REELS_TABS = ["For You", "Nearby", "Following"] as const;
type ReelsTab = (typeof REELS_TABS)[number];

/* ─── Single video slide ────────────────────────────────────────────────────── */

function VideoSlide({
  video, index, isActive, isMuted, viewerMode, onToggleMuted,
  onLike, likedSet, savedSet, onSave, onComment,
  onShare, onProgress, onOpenAuthor, onOpenOptions,
  followingIds, onFollow, followPending,
}: {
  video: VideoPost; index: number; isActive: boolean; isMuted: boolean;
  viewerMode: FeedViewerMode;
  onToggleMuted: () => void;
  onLike: (id: string) => void; likedSet: Set<string>;
  savedSet: Set<string>; onSave: (id: string) => void;
  onComment: () => void;
  onShare: (id: string) => void;
  onProgress: (progress: number) => void;
  onOpenAuthor: (authorId: string) => void;
  onOpenOptions: () => void;
  followingIds: Set<string>;
  onFollow: (authorId: string) => void;
  followPending: boolean;
}) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [localLikes, setLocalLikes]     = useState(video.likesCount || 0);
  const [heartVisible, setHeartVisible] = useState(false);
  const [progress, setProgress]         = useState(0);

  const lastTapRef    = useRef(0);
  const holdTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isActive) onProgress(progress);
  }, [isActive, progress, onProgress]);

  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLiked = likedSet.has(video.id);
  const isSaved = savedSet.has(video.id);
  const isFollowing = followingIds.has(video.author.id);
  const gradient = DEMO_GRADIENTS[index % DEMO_GRADIENTS.length];
  const isReel = viewerMode === "reels";
  const durationLabel = fmtDuration(video.durationSec);

  useEffect(() => {
    setLocalLikes(video.likesCount || 0);
  }, [video.id, video.likesCount]);

  // Play / pause on active change
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) el.play().then(() => setIsPlaying(true)).catch(() => {});
    else { el.pause(); setIsPlaying(false); }
  }, [isActive]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  // Simulated progress bar for demo videos (no real src)
  useEffect(() => {
    if (!isActive) { setProgress(0); return; }
    if (video.videoUrl) return;
    setProgress(0);
    const total = isReel ? 18000 : (video.durationSec || 120) * 1000;
    const tick  = 200;
    let elapsed = 0;
    progressTimer.current = setInterval(() => {
      elapsed += tick;
      if (elapsed >= total) elapsed = 0;
      setProgress(elapsed / total);
    }, tick);
    return () => { if (progressTimer.current) clearInterval(progressTimer.current); };
  }, [isActive, video.videoUrl, isReel]);

  // Real video progress
  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    setProgress(el.currentTime / el.duration);
  };

  const doubleTapLike = () => {
    if (!isLiked) { setLocalLikes(n => n + 1); onLike(video.id); }
    setHeartVisible(true);
    setTimeout(() => setHeartVisible(false), 900);
  };

  const handleMediaTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      doubleTapLike();
    } else {
      // Single tap — toggle play
      const el = videoRef.current;
      if (el) {
        if (isPlaying) { el.pause(); setIsPlaying(false); }
        else { el.play().then(() => setIsPlaying(true)).catch(() => {}); }
      }
    }
    lastTapRef.current = now;
  };

  const handleHoldStart = () => {
    holdTimerRef.current = setTimeout(() => {
      const el = videoRef.current;
      if (el && !el.paused) {
        el.pause();
        setIsPlaying(false);
      }
    }, 450);
  };

  const handleHoldEnd = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalLikes(n => isLiked ? n - 1 : n + 1);
    onLike(video.id);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#000", flexShrink: 0 }} data-testid={`video-slide-${video.id}`}>
      {/* Video or gradient poster */}
      {video.videoUrl ? (
        <video
          ref={videoRef}
          src={video.videoUrl}
          loop playsInline muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          onClick={handleMediaTap}
          onTouchStart={handleHoldStart}
          onTouchEnd={handleHoldEnd}
        />
      ) : (
        <div
          style={{ position: "absolute", inset: 0, background: gradient }}
          onClick={handleMediaTap}
          onTouchStart={handleHoldStart}
          onTouchEnd={handleHoldEnd}
        >
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: isReel ? 72 : 64, opacity: 0.1 }}>
              {video.sportEmoji || SPORT_EMOJIS[video.sport || ""] || "🏆"}
            </div>
          </div>
          {!isPlaying && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
              }}
            >
              <Play size={isReel ? 44 : 40} strokeWidth={1.5} fill="rgba(255,255,255,0.9)" color="rgba(255,255,255,0.9)" style={{ marginLeft: 4, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }} />
              {!isReel && durationLabel && (
                <span style={{ display: "block", textAlign: "center", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginTop: 6, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
                  {durationLabel}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Double-tap heart pop */}
      {heartVisible && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 25, pointerEvents: "none" }}>
          <span className="heart-pop" style={{ fontSize: 100 }}>❤️</span>
        </div>
      )}

      {/* Top progress bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2.5, background: "rgba(255,255,255,0.14)", zIndex: 22, pointerEvents: "none" }} />

      {/* Mute + options — icon only */}
      <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 16, zIndex: 15 }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenOptions(); }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
          aria-label="More options"
        >
          <MoreHorizontal size={22} color={IMMERSIVE.icon} style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleMuted(); }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted
            ? <VolumeX size={22} color={IMMERSIVE.icon} style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />
            : <Volume2 size={22} color={IMMERSIVE.icon} style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />}
        </button>
      </div>

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 120, background: IMMERSIVE.overlayTop, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "42%", background: IMMERSIVE.overlayBottom, pointerEvents: "none" }} />

      {/* Right action rail — bare icons */}
      <div
        style={{ position: "absolute", right: 8, bottom: 120, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, zIndex: 15 }}
        onClick={(e) => e.stopPropagation()}
      >
        <ImmersiveActionIcon icon={Heart} count={localLikes} active={isLiked} onClick={handleLike} testId={`like-${video.id}`} />
        <ImmersiveActionIcon icon={MessageCircle} count={video.commentsCount} onClick={() => onComment()} testId={`comment-${video.id}`} />
        <ImmersiveActionIcon icon={Share2} count={video.sharesCount} onClick={() => onShare(video.id)} testId={`share-${video.id}`} />
        <ImmersiveActionIcon icon={Bookmark} active={isSaved} activeColor={IMMERSIVE.saveActive} onClick={() => onSave(video.id)} testId={`save-${video.id}`} />
      </div>

      {/* Bottom info */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 56, padding: "0 14px max(20px, env(safe-area-inset-bottom))", zIndex: 15 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenAuthor(video.author.id); }}
            style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, overflow: "hidden", border: "1.5px solid rgba(255,255,255,0.35)", padding: 0, background: "transparent", cursor: "pointer" }}
          >
            {video.author.profileImageUrl ? (
              <img src={video.author.profileImageUrl} alt={authorName(video)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>{authorInitials(video)}</div>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenAuthor(video.author.id); }}
            style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: IMMERSIVE.icon, textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>{authorName(video)}</span>
            {(video.sport || video.location) && (
              <div style={{ fontSize: 11, color: IMMERSIVE.meta, marginTop: 1, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                {[video.sportEmoji, video.sport, video.location].filter(Boolean).join(" · ")}
              </div>
            )}
          </button>
          {video.author.id && (
            <button
              type="button"
              disabled={followPending}
              onClick={(e) => { e.stopPropagation(); onFollow(video.author.id); }}
              style={{
                flexShrink: 0,
                height: 28,
                paddingLeft: 12,
                paddingRight: 12,
                borderRadius: 8,
                background: isFollowing ? "transparent" : "rgba(255,255,255,0.2)",
                border: isFollowing ? "1px solid rgba(255,255,255,0.25)" : "none",
                fontSize: 12,
                fontWeight: 700,
                color: isFollowing ? IMMERSIVE.meta : IMMERSIVE.icon,
                cursor: followPending ? "wait" : "pointer",
              }}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>

        <PrimaryEntityLink video={video} />
        {video.content && <ImmersiveCaption text={video.content} />}
      </div>
    </div>
  );
}

/* ─── Toast ────────────────────────────────────────────────────────────────── */
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const [opacity, setOpacity] = useState(1);
  useEffect(() => {
    const t1 = setTimeout(() => setOpacity(0), 1100);
    const t2 = setTimeout(onDone, 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", zIndex: 200, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(16px)", borderRadius: 24, padding: "8px 20px", border: "1px solid rgba(255,255,255,0.14)", opacity, transition: "opacity 300ms ease", pointerEvents: "none", whiteSpace: "nowrap" }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>{message}</span>
    </div>
  );
}

/* ─── Options sheet (report, block, etc.) ─────────────────────────────────── */
function MediaOptionsSheet({
  open,
  video,
  onClose,
  onReport,
  onBlock,
  onSave,
  onShare,
  saved,
}: {
  open: boolean;
  video: VideoPost | null;
  onClose: () => void;
  onReport: (reason: string) => void;
  onBlock: () => void;
  onSave: () => void;
  onShare: () => void;
  saved: boolean;
}) {
  const [reportReason, setReportReason] = useState<string | null>(null);
  if (!open || !video) return null;

  const reasons = [
    { id: "spam", label: "Spam" },
    { id: "harassment", label: "Harassment or bullying" },
    { id: "inappropriate", label: "Inappropriate content" },
    { id: "other", label: "Something else" },
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 180, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end" }}
      onClick={onClose}
    >
      <div
        style={{ width: "100%", background: "#121212", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: "12px 14px max(20px, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 42, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.25)", margin: "0 auto 12px" }} />
        {!reportReason ? (
          <>
            {[
              { label: saved ? "Unsave" : "Save", icon: Bookmark, action: onSave },
              { label: "Share", icon: Share2, action: onShare },
              { label: "Copy link", icon: Copy, action: () => { navigator.clipboard?.writeText(`${window.location.origin}/feed?post=${video.id}`); onClose(); } },
              { label: "Not interested", icon: Ban, action: () => { onBlock(); onClose(); } },
              { label: "Report", icon: Flag, action: () => setReportReason("pick"), danger: true },
            ].map(({ label, icon: Icon, action, danger }) => (
              <button
                key={label}
                type="button"
                onClick={action}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left", color: danger ? "#FF453A" : "#fff", background: "transparent", border: "none", padding: "12px 6px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </>
        ) : (
          <>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Report this {video.format === "video" ? "video" : "reel"}</p>
            {reasons.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => { onReport(r.id); onClose(); setReportReason(null); }}
                style={{ width: "100%", textAlign: "left", color: "#fff", background: "transparent", border: "none", padding: "12px 6px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                {r.label}
              </button>
            ))}
            <button type="button" onClick={() => setReportReason(null)} style={{ width: "100%", marginTop: 8, color: "rgba(255,255,255,0.6)", background: "transparent", border: "none", padding: 10, fontSize: 14 }}>
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── FeedVideoViewer ──────────────────────────────────────────────────────── */
export function FeedVideoViewer({
  videos,
  initialIndex = 0,
  contextLabel,
  mode = "reels",
  followingIds: followingIdsProp,
  onClose,
  onEngagementChange,
}: FeedVideoViewerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { like: engagementLike, save: engagementSave } = usePostEngagement();
  const [, setLocation] = useLocation();
  const resolvedVideos = filterVideosByMode(videos, mode);
  const initialVideoIdx = Math.max(0, Math.min(initialIndex, Math.max(0, resolvedVideos.length - 1)));
  const [activeProgress, setActiveProgress] = useState(0);
  const { data: myProfile } = useQuery<any>({
    queryKey: ["/api/profile", (user as any)?.id],
    enabled: !!(user as any)?.id,
  });

  const [visible, setVisible]         = useState(false);
  const [currentIdx, setCurrentIdx]   = useState(initialVideoIdx);
  const [isMuted, setIsMuted]         = useState(true);
  const [likedSet, setLikedSet]       = useState<Set<string>>(() => new Set(videos.filter((v) => v.likedByMe).map((v) => v.id)));
  const [savedSet, setSavedSet]       = useState<Set<string>>(() => new Set(videos.filter((v) => v.savedByMe).map((v) => v.id)));
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePostId, setSharePostId] = useState<string>("");
  const [toast, setToast]             = useState<string | null>(null);
  const [reelsTab, setReelsTab]       = useState<ReelsTab>("For You");
  const [showOptions, setShowOptions] = useState(false);
  const [hiddenIds, setHiddenIds]     = useState<Set<string>>(new Set());
  const [followPending, setFollowPending] = useState(false);

  const profileFollowing = useMemo(
    () =>
      new Set(
        ((myProfile?.following || []) as Array<{ id?: string } | string>)
          .map((f) => (typeof f === "string" ? f : f?.id))
          .filter(Boolean) as string[],
      ),
    [myProfile],
  );
  const followingIds = followingIdsProp ?? profileFollowing;

  useEffect(() => {
    setLikedSet(new Set(videos.filter((v) => v.likedByMe).map((v) => v.id)));
    setSavedSet(new Set(videos.filter((v) => v.savedByMe).map((v) => v.id)));
  }, [videos]);
  const filteredVideos = resolvedVideos.filter((v) => {
    if (hiddenIds.has(v.id)) return false;
    if (mode === "videos") return true;
    if (reelsTab === "For You") return true;
    if (reelsTab === "Nearby") {
      const fromDistance = Number(String(v.distance || "").replace(/[^\d.]/g, ""));
      if (!Number.isNaN(fromDistance) && fromDistance <= 10) return true;
      return (v.context || "").toLowerCase() === "nearby";
    }
    return followingIds.has(v.author.id) || (v.context || "").toLowerCase() === "following";
  });
  const safeVideos = filteredVideos.length > 0 ? filteredVideos : resolvedVideos;

  // Vertical swipe
  const touchStartY   = useRef(0);
  const touchStartX   = useRef(0);
  const dragOffset    = useRef(0);
  const [dragY, setDragY] = useState(0);
  const isDragging    = useRef(false);
  const swipeDir      = useRef<"v" | "h" | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 16);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 260);
  };

  const goTo = (idx: number) => {
    const c = Math.max(0, Math.min(idx, safeVideos.length - 1));
    setCurrentIdx(c);
    setDragY(0);
    dragOffset.current = 0;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (showComments) return;
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    swipeDir.current = null;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || showComments) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    const dx = e.touches[0].clientX - touchStartX.current;
    if (!swipeDir.current) {
      swipeDir.current = Math.abs(dy) > Math.abs(dx) ? "v" : "h";
    }
    if (swipeDir.current === "v") {
      dragOffset.current = dy;
      setDragY(dy);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const threshold = 55;
    if (swipeDir.current === "v") {
      if (dragOffset.current < -threshold && currentIdx < safeVideos.length - 1) goTo(currentIdx + 1);
      else if (dragOffset.current > threshold && currentIdx > 0) goTo(currentIdx - 1);
      else { setDragY(0); dragOffset.current = 0; }
    } else {
      setDragY(0); dragOffset.current = 0;
    }
  };

  const handleLike = useCallback(async (id: string) => {
    const wasLiked = likedSet.has(id);
    setLikedSet((s) => {
      const n = new Set(s);
      if (wasLiked) n.delete(id);
      else n.add(id);
      return n;
    });
    try {
      await engagementLike(id, wasLiked);
      onEngagementChange?.();
      if (isDemoMediaId(id)) setToast(wasLiked ? "Like removed" : "❤️ Liked");
    } catch {
      setLikedSet((s) => {
        const n = new Set(s);
        if (wasLiked) n.add(id);
        else n.delete(id);
        return n;
      });
      setToast("Could not update like");
    }
  }, [likedSet, engagementLike, onEngagementChange]);

  const handleSave = useCallback(async (id: string) => {
    const wasSaved = savedSet.has(id);
    setSavedSet((s) => {
      const n = new Set(s);
      if (wasSaved) n.delete(id);
      else n.add(id);
      return n;
    });
    try {
      await engagementSave(id, wasSaved);
      onEngagementChange?.();
      setToast(wasSaved ? "Removed from saved" : "🔖 Saved");
    } catch {
      setSavedSet((s) => {
        const n = new Set(s);
        if (wasSaved) n.add(id);
        else n.delete(id);
        return n;
      });
      setToast("Could not save");
    }
  }, [savedSet, engagementSave, onEngagementChange]);

  const handleFollow = useCallback(async (authorId: string) => {
    if (!authorId || isDemoMediaId(authorId)) return;
    const wasFollowing = followingIds.has(authorId);
    setFollowPending(true);
    try {
      if (wasFollowing) {
        await apiRequest("DELETE", `/api/users/${authorId}/unfollow`);
      } else {
        await apiRequest("POST", `/api/users/${authorId}/follow`, { followingType: "user" });
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/profile", (user as any)?.id] });
      await queryClient.invalidateQueries({ queryKey: ["/api/users", (user as any)?.id, "following"] });
      setToast(wasFollowing ? "Unfollowed" : "Following");
    } catch {
      setToast("Could not update follow");
    } finally {
      setFollowPending(false);
    }
  }, [followingIds, queryClient, user]);

  const handleShare = useCallback((id: string) => {
    setSharePostId(id);
    setShowShareModal(true);
  }, []);

  useEffect(() => {
    setCurrentIdx((i) => Math.max(0, Math.min(i, safeVideos.length - 1)));
  }, [safeVideos.length]);

  const activeVideo = safeVideos[currentIdx];

  const handleReport = useCallback(async (reason: string) => {
    if (!activeVideo) return;
    try {
      await submitContentReport({
        contentType: "post",
        contentId: activeVideo.id,
        reason,
        reportedUserId: activeVideo.author.id,
      });
      setToast("Report submitted — thanks for helping keep SURNA safe");
    } catch {
      if (isDemoMediaId(activeVideo.id)) {
        setToast("Report submitted — thanks for helping keep SURNA safe");
      } else {
        setToast("Could not submit report");
      }
    }
  }, [activeVideo]);

  const handleBlockCreator = useCallback(() => {
    if (!activeVideo) return;
    hideCreatorInSession(activeVideo.author.id);
    setHiddenIds((prev) => new Set(prev).add(activeVideo.id));
    setToast("We will show you less from this creator");
    if (currentIdx >= safeVideos.length - 1 && currentIdx > 0) goTo(currentIdx - 1);
  }, [activeVideo, currentIdx, safeVideos.length]);

  return (
    <>
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 150, background: "#000",
          transform: visible ? `translateY(${dragY}px)` : "translateY(100%)",
          transition: isDragging.current ? "none" : "transform 260ms cubic-bezier(0.32,0.72,0,1)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          touchAction: "none",
        }}
        data-testid="feed-video-viewer"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* ── Top bar ── */}
        <div
          style={{
            position: "absolute", top: 0, left: 0, right: 0, zIndex: 20,
            padding: "max(env(safe-area-inset-top), 12px) 14px 0",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Story-like top progress lines — reels only */}
          {mode === "reels" && (
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {safeVideos.map((_, idx) => (
              <div key={`line-${idx}`} style={{ flex: 1, height: 2, borderRadius: 99, background: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: idx < currentIdx ? "100%" : idx === currentIdx ? `${Math.max(0, Math.min(100, activeProgress * 100))}%` : "0%",
                    background: "rgba(255,255,255,0.95)",
                    transition: "width 0.18s linear",
                  }}
                />
              </div>
            ))}
          </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <button
              onClick={handleClose}
              style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              data-testid="video-back-button"
            >
              <ArrowLeft size={18} color="white" />
            </button>

            {mode === "reels" ? (
            <div style={{ display: "flex", gap: 6 }}>
              {REELS_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setReelsTab(tab)}
                  style={{
                    padding: "5px 13px", borderRadius: 99,
                    fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
                    background: reelsTab === tab ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.14)",
                    color: reelsTab === tab ? "#000" : "rgba(255,255,255,0.75)",
                    backdropFilter: "blur(10px)",
                    transition: "all 0.18s ease",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: IMMERSIVE.icon, fontWeight: 800, fontSize: 15 }}>
                <Play size={16} fill={IMMERSIVE.icon} color={IMMERSIVE.icon} />
                <span>{contextLabel || "Videos"}</span>
              </div>
            )}

            <div style={{ width: 38 }} />
          </div>

          {/* Active sport / context subtitle */}
          {activeVideo?.sport && (
            <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 500, marginBottom: 4 }}>
              {activeVideo.sportEmoji || SPORT_EMOJIS[activeVideo.sport] || ""} {activeVideo.sport}
            </p>
          )}
        </div>

        {/* ── Video stack ── */}
        <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
          {safeVideos.map((video, idx) => {
            const offset = (idx - currentIdx) * 100;
            return (
              <div
                key={video.id}
                style={{
                  position: "absolute", inset: 0,
                  transform: `translateY(calc(${offset}% + ${dragY}px))`,
                  transition: isDragging.current ? "none" : "transform 320ms cubic-bezier(0.32,0.72,0,1)",
                  willChange: "transform",
                }}
              >
                <VideoSlide
                  video={video} index={idx}
                  viewerMode={mode}
                  isActive={idx === currentIdx && !showComments}
                  isMuted={isMuted} onToggleMuted={() => setIsMuted(v => !v)}
                  onLike={handleLike} likedSet={likedSet}
                  savedSet={savedSet} onSave={handleSave}
                  onComment={() => setShowComments(true)}
                  onShare={handleShare}
                  onProgress={setActiveProgress}
                  onOpenAuthor={(authorId) => setLocation(`/person/${authorId}`)}
                  onOpenOptions={() => setShowOptions(true)}
                  followingIds={followingIds}
                  onFollow={handleFollow}
                  followPending={followPending}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Comments sheet ── */}
      {showComments && (
        <CommentsSheet
          postId={activeVideo?.id || ""}
          isOpen={showComments}
          variant="immersive"
          onClose={() => setShowComments(false)}
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <ShareModal
        postId={sharePostId}
        open={showShareModal}
        onOpenChange={setShowShareModal}
        contentPath={`/feed?post=${sharePostId}&type=${mode}`}
      />

      <MediaOptionsSheet
        open={showOptions}
        video={activeVideo ?? null}
        onClose={() => setShowOptions(false)}
        onReport={handleReport}
        onBlock={handleBlockCreator}
        onSave={() => activeVideo && handleSave(activeVideo.id)}
        onShare={() => activeVideo && handleShare(activeVideo.id)}
        saved={activeVideo ? savedSet.has(activeVideo.id) : false}
      />
    </>
  );
}
