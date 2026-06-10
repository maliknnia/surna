import { useState, useRef, useEffect, useCallback, type MouseEvent } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { entityPath, mapPath, resolveContentLinks } from "@/lib/mapNavigation";
import {
  ArrowLeft, Heart, MessageCircle, Share2, Bookmark,
  Volume2, VolumeX, Play, Pause, Search,
  Users, Calendar, GraduationCap, MapPin, Zap, UserPlus,
  MoreHorizontal, Flag, Ban, Copy,
} from "lucide-react";
import { CommentsSheet } from "@/components/comments/CommentsSheet";
import { ShareModal } from "@/components/ShareModal";
import {
  hideCreatorInSession,
  isDemoMediaId,
  submitContentReport,
  togglePostLike,
  togglePostSave,
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
  onClose: () => void;
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
function fmtCount(n: number = 0) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
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

/* ─── Action button ─────────────────────────────────────────────────────────── */
function ActionBtn({
  icon: Icon, label, count, active, activeColor, onClick,
}: {
  icon: React.ElementType; label: string; count?: number;
  active?: boolean; activeColor?: string; onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer" }}
    >
      <div style={{
        width: 50, height: 50, borderRadius: "50%",
        background: active ? `${activeColor || "#FF453A"}28` : "rgba(0,0,0,0.45)",
        backdropFilter: "blur(12px)",
        border: active ? `1.5px solid ${activeColor || "#FF453A"}60` : "1.5px solid rgba(255,255,255,0.14)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.18s ease",
        transform: active ? "scale(1.08)" : "scale(1)",
      }}>
        <Icon size={22} color={active ? (activeColor || "#FF453A") : "white"} fill={active ? (activeColor || "#FF453A") : "none"} style={{ transition: "all 0.18s ease" }} />
      </div>
      {count !== undefined
        ? <span style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{fmtCount(count)}</span>
        : <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>{label}</span>
      }
    </button>
  );
}

/* ─── Role badge ────────────────────────────────────────────────────────────── */
function RoleBadge({ role }: { role?: string }) {
  if (!role || role === "player") return null;
  const map: Record<string, { label: string; color: string }> = {
    coach:     { label: "Coach",     color: "#FFD700" },
    team:      { label: "Team",      color: "#000000" },
    organizer: { label: "Organizer", color: "#30D158" },
  };
  const cfg = map[role];
  if (!cfg) return null;
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, color: cfg.color,
      background: `${cfg.color}18`, borderRadius: 5,
      padding: "1px 6px", border: `1px solid ${cfg.color}35`,
    }}>{cfg.label}</span>
  );
}

/* ─── Smart contextual CTA row ──────────────────────────────────────────────── */
function ContextCTAs({ video }: { video: VideoPost; isDark: boolean }) {
  const [, setLocation] = useLocation();
  const [joined, setJoined] = useState(false);
  const [booked, setBooked] = useState(false);

  const links = resolveContentLinks({
    entityKind: video.entityType,
    entityId: video.entityId,
    postType: video.entityType,
  });

  const go = (path?: string) => (e: MouseEvent) => {
    e.stopPropagation();
    if (path) setLocation(path);
  };

  if (video.entityType === "event" || (video.role === "organizer" && video.eventName)) {
    return (
      <div style={{ display: "flex", gap: 7, marginBottom: 10, flexWrap: "wrap" }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (links.primary) setLocation(links.primary);
            else setJoined((j) => !j);
          }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            height: 33, paddingLeft: 14, paddingRight: 14, borderRadius: 99,
            background: joined ? "rgba(255,255,255,0.12)" : "linear-gradient(135deg,#000000,#000000)",
            border: "none", fontSize: 12, fontWeight: 700,
            color: joined ? "rgba(255,255,255,0.6)" : "#fff", cursor: "pointer",
            transition: "all 0.18s ease",
          }}
        >
          <Zap size={12} />{joined ? "Joined ✓" : "Join Event"}
        </button>
        {links.map && (
          <button
            onClick={go(links.map)}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 33, paddingLeft: 14, paddingRight: 14, borderRadius: 99, background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)", cursor: "pointer" }}
          >
            <MapPin size={12} />View on Map
          </button>
        )}
      </div>
    );
  }

  if (video.entityType === "coach" || video.role === "coach") {
    const coachRoute =
      links.primary ||
      (video.entityId ? entityPath("coach", video.entityId) : undefined);
    return (
      <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (coachRoute) setLocation(coachRoute);
            else setBooked((b) => !b);
          }}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 33, paddingLeft: 14, paddingRight: 14, borderRadius: 99, background: booked ? "rgba(255,255,255,0.12)" : "linear-gradient(135deg,#FF9F0A,#D4750A)", border: "none", fontSize: 12, fontWeight: 700, color: booked ? "rgba(255,255,255,0.6)" : "#fff", cursor: "pointer", transition: "all 0.18s ease" }}
        >
          <Calendar size={12} />{booked ? "Booked ✓" : "Book Session"}
        </button>
        {coachRoute && (
          <button
            onClick={go(coachRoute)}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 33, paddingLeft: 14, paddingRight: 14, borderRadius: 99, background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)", cursor: "pointer" }}
          >
            <GraduationCap size={12} />View Coach
          </button>
        )}
      </div>
    );
  }

  if (video.entityType === "team" || video.role === "team") {
    return (
      <div style={{ display: "flex", gap: 7, marginBottom: 10, flexWrap: "wrap" }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (links.primary) setLocation(links.primary);
            else setJoined((j) => !j);
          }}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 33, paddingLeft: 14, paddingRight: 14, borderRadius: 99, background: joined ? "rgba(255,255,255,0.12)" : "linear-gradient(135deg,#0A84FF,#0055CC)", border: "none", fontSize: 12, fontWeight: 700, color: joined ? "rgba(255,255,255,0.6)" : "#fff", cursor: "pointer", transition: "all 0.18s ease" }}
        >
          <Users size={12} />{joined ? "Joined ✓" : "Join Team"}
        </button>
        {links.map && (
          <button
            onClick={go(links.map)}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 33, paddingLeft: 14, paddingRight: 14, borderRadius: 99, background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)", cursor: "pointer" }}
          >
            <MapPin size={12} />View on Map
          </button>
        )}
      </div>
    );
  }

  return null;
}

/* ─── Single video slide ────────────────────────────────────────────────────── */

function VideoSlide({
  video, index, isActive, isMuted, viewerMode, onToggleMuted,
  onLike, likedSet, savedSet, onSave, onComment,
  onShare, onProgress, onOpenAuthor, onOpenOptions,
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
}) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [localLikes, setLocalLikes]     = useState(video.likesCount || 0);
  const [followed, setFollowed]         = useState(false);
  const [heartVisible, setHeartVisible] = useState(false);
  const [progress, setProgress]         = useState(0);
  const [connected, setConnected]       = useState(false);
  const [showLongPressMenu, setShowLongPressMenu] = useState(false);

  const lastTapRef    = useRef(0);
  const holdTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isActive) onProgress(progress);
  }, [isActive, progress, onProgress]);

  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLiked = likedSet.has(video.id);
  const isSaved = savedSet.has(video.id);
  const gradient = DEMO_GRADIENTS[index % DEMO_GRADIENTS.length];
  const isReel = viewerMode === "reels";
  const durationLabel = fmtDuration(video.durationSec);

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
      setShowLongPressMenu(true);
    }, 500);
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
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  width: isReel ? 56 : 52,
                  height: isReel ? 56 : 52,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.45)",
                  backdropFilter: "blur(8px)",
                  border: "1.5px solid rgba(255,255,255,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Play size={isReel ? 26 : 22} strokeWidth={2.2} fill="#fff" color="#fff" style={{ marginLeft: 3 }} />
              </div>
              {!isReel && durationLabel && (
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.92)", background: "rgba(0,0,0,0.5)", borderRadius: 8, padding: "3px 10px" }}>
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

      {/* Mute + options */}
      <div style={{ position: "absolute", top: 70, right: 12, display: "flex", flexDirection: "column", gap: 8, zIndex: 15 }}>
        <button
          onClick={(e) => { e.stopPropagation(); onOpenOptions(); }}
          style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          aria-label="More options"
        >
          <MoreHorizontal size={16} color="white" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleMuted(); }}
          style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX size={15} color="white" /> : <Volume2 size={15} color="white" />}
        </button>
      </div>

      {/* Gradient overlays */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 180, background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "65%", background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)", pointerEvents: "none" }} />

      {/* Right action stack */}
      <div
        style={{ position: "absolute", right: 10, bottom: 150, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, zIndex: 15 }}
        onClick={(e) => e.stopPropagation()}
      >
        <ActionBtn icon={Heart} label="Like" count={localLikes} active={isLiked} activeColor="#FF453A" onClick={handleLike} />
        <ActionBtn icon={MessageCircle} label="Comments" count={video.commentsCount} onClick={() => onComment()} />
        <ActionBtn icon={Share2} label="Share" count={video.sharesCount} onClick={() => onShare(video.id)} />
        <ActionBtn icon={Bookmark} label="Save" active={isSaved} activeColor="#000000" onClick={() => onSave(video.id)} />
        {/* Join button — shown if event or team */}
        {(video.entityType === "event" || video.entityType === "team") && (
          <ActionBtn icon={Zap} label="Join" activeColor="#000000" />
        )}
        {/* Connect — shown for people / coaches */}
        {(video.entityType === "coach" || video.entityType === "person") && (
          <ActionBtn
            icon={UserPlus} label={connected ? "Added" : "Connect"}
            active={connected} activeColor="#30D158"
            onClick={() => setConnected(c => !c)}
          />
        )}
      </div>

      {/* Bottom info area */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 70, padding: "0 14px 28px", zIndex: 15 }}>
        {/* Smart contextual CTAs */}
        <ContextCTAs video={video} isDark={true} />

        {/* Location + event tags */}
        {(video.location || video.eventName) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
            {video.location && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.8)", background: "rgba(0,0,0,0.38)", backdropFilter: "blur(6px)", borderRadius: 8, padding: "2px 8px" }}>
                <MapPin size={9} />{video.location}{video.distance && ` · ${video.distance}`}
              </span>
            )}
            {video.eventName && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", borderRadius: 8, padding: "2px 8px" }}>
                <Zap size={9} />{video.eventName}
              </span>
            )}
          </div>
        )}

        {/* Creator row */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
          {/* Avatar */}
          <button
            onClick={(e) => { e.stopPropagation(); onOpenAuthor(video.author.id); }}
            style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, overflow: "hidden", border: "1.5px solid rgba(255,255,255,0.28)", padding: 0, background: "transparent", cursor: "pointer" }}
          >
            {video.author.profileImageUrl ? (
              <img src={video.author.profileImageUrl} alt={authorName(video)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>{authorInitials(video)}</div>
            )}
          </button>

          {/* Name + badge + sport */}
          <button
            onClick={(e) => { e.stopPropagation(); onOpenAuthor(video.author.id); }}
            style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>{authorName(video)}</span>
              <RoleBadge role={video.role} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 1 }}>
              {video.sportEmoji && <span>{video.sportEmoji}</span>}
              {video.sport && <span>{video.sport}</span>}
              {video.location && <><span>·</span><span>{video.location}</span></>}
              {video.distance && <><span>·</span><span>{video.distance}</span></>}
            </div>
          </button>

          {/* Follow pill */}
          <button
            onClick={(e) => { e.stopPropagation(); setFollowed(f => !f); }}
            style={{
              flexShrink: 0, height: 30, paddingLeft: 14, paddingRight: 14,
              borderRadius: 99,
              background: followed ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.16)",
              backdropFilter: "blur(8px)",
              border: followed ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.28)",
              fontSize: 12, fontWeight: 700,
              color: followed ? "rgba(255,255,255,0.5)" : "#fff",
              cursor: "pointer", transition: "all 0.18s ease",
            }}
          >
            {followed ? "Following" : "Follow"}
          </button>
        </div>

        {/* Caption */}
        {video.content && (
          <p
            onClick={(e) => { e.stopPropagation(); setCaptionExpanded(v => !v); }}
            style={{
              fontSize: 13, color: "rgba(255,255,255,0.88)", lineHeight: 1.5,
              display: "-webkit-box", WebkitBoxOrient: "vertical" as any,
              WebkitLineClamp: captionExpanded ? undefined : 2,
              overflow: "hidden", cursor: "pointer",
            }}
          >
            {video.content}
          </p>
        )}
      </div>

      {showLongPressMenu && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end" }}
          onClick={() => setShowLongPressMenu(false)}
        >
          <div
            style={{ width: "100%", background: "#121212", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: "12px 14px 20px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 42, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.25)", margin: "0 auto 10px" }} />
            {[
              { label: "Not interested", action: () => { setShowLongPressMenu(false); onOpenOptions(); } },
              { label: "Report", action: () => { setShowLongPressMenu(false); onOpenOptions(); } },
              { label: "Save", action: () => { onSave(video.id); setShowLongPressMenu(false); } },
              { label: "Share", action: () => { onShare(video.id); setShowLongPressMenu(false); } },
              { label: "Copy link", action: () => { navigator.clipboard?.writeText(`${window.location.origin}/feed?post=${video.id}`); setShowLongPressMenu(false); } },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                style={{ width: "100%", textAlign: "left", color: "white", background: "transparent", border: "none", padding: "12px 6px", fontSize: 15, fontWeight: 600 }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
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
export function FeedVideoViewer({ videos, initialIndex = 0, contextLabel, mode = "reels", onClose }: FeedVideoViewerProps) {
  const { user } = useAuth();
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
  const [likedSet, setLikedSet]       = useState<Set<string>>(new Set());
  const [savedSet, setSavedSet]       = useState<Set<string>>(new Set());
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePostId, setSharePostId] = useState<string>("");
  const [toast, setToast]             = useState<string | null>(null);
  const [reelsTab, setReelsTab]       = useState<ReelsTab>("For You");
  const [showOptions, setShowOptions] = useState(false);
  const [hiddenIds, setHiddenIds]     = useState<Set<string>>(new Set());
  const followingIds = new Set(
    ((myProfile?.following || []) as Array<any>)
      .map((f) => (typeof f === "string" ? f : f?.id))
      .filter(Boolean)
  );
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
      await togglePostLike(id, wasLiked);
      setToast(wasLiked ? "Like removed" : "❤️ Liked");
    } catch {
      setLikedSet((s) => {
        const n = new Set(s);
        if (wasLiked) n.add(id);
        else n.delete(id);
        return n;
      });
      setToast("Could not update like");
    }
  }, [likedSet]);

  const handleSave = useCallback(async (id: string) => {
    const wasSaved = savedSet.has(id);
    setSavedSet((s) => {
      const n = new Set(s);
      if (wasSaved) n.delete(id);
      else n.add(id);
      return n;
    });
    try {
      await togglePostSave(id, wasSaved);
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
  }, [savedSet]);

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
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#fff", fontWeight: 800, fontSize: 15 }}>
                <Play size={16} fill="#fff" color="#fff" />
                <span>{contextLabel || "Videos"}</span>
              </div>
            )}

            <button
              style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              aria-label="Search"
            >
              <Search size={16} color="white" />
            </button>
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
