import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { CommentsSheet } from "@/components/comments/CommentsSheet";
import {
  X,
  MoreVertical,
  Send,
  Users,
  GraduationCap,
  Calendar,
  Building2,
  ChevronRight,
  Volume2,
  VolumeX,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Plus,
  Mic,
  BarChart2,
  MapPin,
  Trophy,
  Tag,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { StoryWithUser } from "@shared/schema";
import {
  isDemoStoryId,
  mergeApiStoriesWithDemo,
} from "@/lib/demoStories";

interface StoryViewerProps {
  initialUserId: string;
  initialStoryIndex: number;
  onClose: () => void;
}

const ENTITY_CONFIGS: Record<
  string,
  {
    icon: React.ElementType;
    label: string;
    color: string;
    actions: { label: string; route?: string }[];
  }
> = {
  team: {
    icon: Users,
    label: "Team",
    color: "#000000",
    actions: [{ label: "View Team" }, { label: "Join Team" }, { label: "Message" }],
  },
  coach: {
    icon: GraduationCap,
    label: "Coach",
    color: "#FF9F0A",
    actions: [{ label: "View Coach" }, { label: "Book Session" }, { label: "Message" }],
  },
  event: {
    icon: Calendar,
    label: "Event",
    color: "#32D74B",
    actions: [{ label: "View Event" }, { label: "Join" }, { label: "Save" }, { label: "Map" }],
  },
  place: {
    icon: Building2,
    label: "Place",
    color: "#007AFF",
    actions: [{ label: "View Place" }, { label: "Directions" }, { label: "Book" }],
  },
  challenge: {
    icon: Trophy,
    label: "Challenge",
    color: "#FFD60A",
    actions: [{ label: "Accept Challenge" }, { label: "View Details" }],
  },
  person: {
    icon: Users,
    label: "Person",
    color: "#8B5CF6",
    actions: [{ label: "View Profile" }, { label: "Follow" }, { label: "Message" }],
  },
};

const QUICK_REACTIONS = ["❤️", "😂", "😮"];

const SMART_PLACEHOLDERS = [
  "Reply to story…",
  "React to moment…",
  "Join this event…",
  "Comment on play…",
];

const PLUS_OPTIONS = [
  { emoji: "💬", label: "Reply with message", action: "reply" },
  { emoji: "🎙️", label: "Send voice note",   action: "voice"   },
  { emoji: "📊", label: "Create poll",         action: "poll"    },
  { emoji: "↗️", label: "Share this video",   action: "share"   },
  { emoji: "📅", label: "Invite to event",    action: "event"   },
  { emoji: "📌", label: "Save to plan",        action: "save"    },
  { emoji: "🏷️", label: "Tag team / coach",  action: "tag"     },
];

function formatTime(dateStr: string | Date | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr as string);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ─── Plus bottom sheet ─────────────────────────────────────────────────── */
function PlusSheet({
  onSelect,
  onClose,
}: {
  onSelect: (action: string) => void;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 12); return () => clearTimeout(t); }, []);
  const close = () => { setVisible(false); setTimeout(onClose, 260); };
  const pick  = (a: string) => { setVisible(false); setTimeout(() => onSelect(a), 260); };

  return (
    <div
      className="fixed inset-0 z-[110]"
      style={{ background: `rgba(0,0,0,${visible ? 0.55 : 0})`, transition: "background 260ms ease" }}
      onClick={close}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(14,8,28,0.97)",
          backdropFilter: "blur(24px)",
          borderRadius: "24px 24px 0 0",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
          transform: `translateY(${visible ? 0 : 100}%)`,
          transition: "transform 280ms cubic-bezier(0.32,0.72,0,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, marginBottom: 18 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)" }} />
        </div>
        <p style={{ fontSize: 17, fontWeight: 700, color: "#ffffff", padding: "0 20px", marginBottom: 16 }}>
          Story Actions
        </p>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {PLUS_OPTIONS.map((opt, i) => (
            <button
              key={opt.action}
              onClick={() => pick(opt.action)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 20px",
                background: "none",
                border: "none",
                borderBottom: i < PLUS_OPTIONS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 120ms ease",
              }}
              onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
              onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
              onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{opt.emoji}</span>
              <span style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.88)" }}>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── "Reaction sent" toast ─────────────────────────────────────────────── */
function ReactionToast({ emoji, onDone }: { emoji: string; onDone: () => void }) {
  const [opacity, setOpacity] = useState(1);
  useEffect(() => {
    const t1 = setTimeout(() => setOpacity(0), 1100);
    const t2 = setTimeout(onDone, 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 130,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(16px)",
        borderRadius: 24,
        padding: "8px 16px",
        border: "1px solid rgba(255,255,255,0.15)",
        opacity,
        transition: "opacity 300ms ease",
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 18 }}>{emoji}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
        Reaction sent
      </span>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export function StoryViewer({ initialUserId, initialStoryIndex, onClose }: StoryViewerProps) {
  const { user } = useAuth();
  const [visible, setVisible]               = useState(false);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [isPaused, setIsPaused]             = useState(false);
  const [isMuted, setIsMuted]               = useState(false);
  const [showReply, setShowReply]           = useState(false);
  const [replyText, setReplyText]           = useState("");
  const [progress, setProgress]             = useState(0);
  const [dragY, setDragY]                   = useState(0);
  const [isDragging, setIsDragging]         = useState(false);
  const [reactionToast, setReactionToast]   = useState<string | null>(null);
  const [centerPop, setCenterPop]           = useState<string | null>(null);
  const [showMenu, setShowMenu]             = useState(false);
  const [showPlus, setShowPlus]             = useState(false);
  const [likedStories, setLikedStories]     = useState<Set<string>>(new Set());
  const [savedStories, setSavedStories]     = useState<Set<string>>(new Set());
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [showCommentsSheet, setShowCommentsSheet] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [inputFocused, setInputFocused]     = useState(false);

  const progressInterval = useRef<NodeJS.Timeout>();
  const containerRef     = useRef<HTMLDivElement>(null);
  const videoRef         = useRef<HTMLVideoElement>(null);
  const touchStartX      = useRef(0);
  const touchStartY      = useRef(0);
  const holdTimer        = useRef<NodeJS.Timeout>();
  const inputRef         = useRef<HTMLInputElement>(null);

  const { data: apiStories = [] } = useQuery<StoryWithUser[]>({
    queryKey: ["/api/stories"],
    enabled: !!user,
  });

  const allStories = mergeApiStoriesWithDemo(apiStories);

  const storiesByUser = useMemo(
    () =>
      allStories.reduce(
        (acc, story) => {
          const uid = story.userId;
          if (!acc[uid]) acc[uid] = { user: story.user, stories: [] };
          acc[uid].stories.push(story);
          return acc;
        },
        {} as Record<string, { user: any; stories: StoryWithUser[] }>,
      ),
    [allStories],
  );

  const userGroups = useMemo(() => Object.values(storiesByUser), [storiesByUser]);
  const currentGroup = userGroups[currentUserIndex];
  const currentStory = currentGroup?.stories[currentStoryIndex];
  const isOwnStory   = currentStory?.userId === user?.id;
  const ownerType    = (currentStory as any)?.ownerType || "person";
  const entityConfig = ENTITY_CONFIGS[ownerType] || ENTITY_CONFIGS.person;
  const storyId      = currentStory?.id || "";

  useEffect(() => {
    const idx = userGroups.findIndex((g) => g.user.id === initialUserId);
    if (idx !== -1) {
      setCurrentUserIndex(idx);
      setCurrentStoryIndex(Math.min(initialStoryIndex, userGroups[idx].stories.length - 1));
    }
  }, [initialUserId, initialStoryIndex, userGroups]);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 16);
    return () => clearTimeout(t);
  }, []);

  // Smart placeholder cycle
  useEffect(() => {
    if (inputFocused || replyText) return;
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % SMART_PLACEHOLDERS.length), 3200);
    return () => clearInterval(t);
  }, [inputFocused, replyText]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  const viewMutation = useMutation({
    mutationFn: async (sid: string) => {
      await apiRequest("POST", `/api/stories/${sid}/view`);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/stories"] }); },
  });

  const replyMutation = useMutation({
    mutationFn: async (data: { storyId: string; content: string }) => {
      const res = await apiRequest("POST", `/api/stories/${data.storyId}/reply`, { content: data.content });
      return res.json();
    },
    onSuccess: () => { setReplyText(""); setShowReply(false); setIsPaused(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (sid: string) => {
      await apiRequest("DELETE", `/api/stories/${sid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      nextStory();
    },
  });

  const nextStory = useCallback(() => {
    if (!currentGroup) return;
    setCaptionExpanded(false);
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      setCurrentStoryIndex((p) => p + 1); setProgress(0);
    } else if (currentUserIndex < userGroups.length - 1) {
      setCurrentUserIndex((p) => p + 1); setCurrentStoryIndex(0); setProgress(0);
    } else {
      handleClose();
    }
  }, [currentGroup, currentStoryIndex, currentUserIndex, userGroups.length, handleClose]);

  const previousStory = useCallback(() => {
    setCaptionExpanded(false);
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((p) => p - 1); setProgress(0);
    } else if (currentUserIndex > 0) {
      const prevGroup = userGroups[currentUserIndex - 1];
      setCurrentUserIndex((p) => p - 1);
      setCurrentStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
    }
  }, [currentStoryIndex, currentUserIndex, userGroups]);

  // Auto-progress
  useEffect(() => {
    if (!currentStory || isPaused || showReply || showMenu || showPlus) return;
    if (!currentStory.viewedByCurrentUser && !isDemoStoryId(currentStory.id)) {
      viewMutation.mutate(currentStory.id);
    }
    const duration = (currentStory.duration || 5) * 1000;
    setProgress(0);
    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 100 / (duration / 100);
        if (next >= 100) {
          clearInterval(progressInterval.current);
          setTimeout(nextStory, 50);
          return 100;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(progressInterval.current);
  }, [currentStory, isPaused, showReply, showMenu, showPlus, currentStoryIndex, currentUserIndex]);

  // Touch gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    holdTimer.current = setTimeout(() => {
      setIsPaused(true);
      videoRef.current?.pause();
    }, 200);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - touchStartY.current;
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
    if (dy > 8 && dy > dx) {
      clearTimeout(holdTimer.current);
      setIsDragging(true);
      setDragY(Math.max(0, dy));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    clearTimeout(holdTimer.current);
    setIsPaused(false);
    videoRef.current?.play().catch(() => {});

    if (isDragging) {
      setIsDragging(false);
      if (dragY > 90) handleClose();
      else setDragY(0);
      return;
    }
    setDragY(0);

    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    if (dy > 40) return;
    if (Math.abs(dx) > 50) { if (dx > 0) nextStory(); else previousStory(); }
  };

  const handleTap = (e: React.MouseEvent) => {
    if (showMenu) { setShowMenu(false); return; }
    if (isDragging) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.35) previousStory();
    else nextStory();
  };

  const handleReaction = (emoji: string) => {
    // center pop for big feel, then toast
    setCenterPop(emoji);
    setTimeout(() => setCenterPop(null), 900);
    setReactionToast(emoji);
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !currentStory) return;
    if (isDemoStoryId(currentStory.id)) {
      setReplyText("");
      setShowReply(false);
      setIsPaused(false);
      setReactionToast("💬");
      return;
    }
    replyMutation.mutate({ storyId: currentStory.id, content: replyText });
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedStories((prev) => {
      const next = new Set(prev);
      if (next.has(storyId)) next.delete(storyId);
      else { next.add(storyId); handleReaction("❤️"); }
      return next;
    });
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedStories((prev) => {
      const next = new Set(prev);
      if (next.has(storyId)) next.delete(storyId); else next.add(storyId);
      return next;
    });
  };

  if (!currentStory || !currentGroup) {
    return (
      <div
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 px-6"
        style={{ background: "rgba(0,0,0,0.92)" }}
      >
        <p className="text-white/80 text-sm text-center">This story is no longer available.</p>
        <button
          type="button"
          onClick={handleClose}
          className="px-5 py-2 rounded-full text-sm font-semibold bg-white text-black"
        >
          Close
        </button>
      </div>
    );
  }

  const displayName =
    currentGroup.user.displayName ||
    currentGroup.user.username ||
    currentGroup.user.firstName ||
    "User";

  const isLiked = likedStories.has(storyId);
  const isSaved = savedStories.has(storyId);
  const dragScale = Math.max(0.88, 1 - dragY * 0.0003);
  const dragOpacity = Math.max(0.4, 1 - dragY * 0.003);

  return (
    <>
      <div
        className="fixed inset-0 z-[200]"
        style={{
          background: `rgba(0,0,0,${visible ? Math.max(0.6, 0.98 - dragY * 0.004) : 0})`,
          transition: "background 200ms ease",
        }}
      >
        <div
          ref={containerRef}
          className="relative w-full h-full overflow-hidden"
          style={{
            transform: `scale(${visible ? dragScale : 0.94}) translateY(${dragY}px)`,
            opacity: visible ? dragOpacity : 0,
            transition: isDragging
              ? "none"
              : "transform 220ms cubic-bezier(0.25,0.46,0.45,0.94), opacity 220ms ease",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleTap}
        >
          {/* ── Media ── */}
          <div className="absolute inset-0">
            {currentStory.mediaType === "image" && (
              <img src={currentStory.mediaUrl} alt="Story" className="w-full h-full object-cover" />
            )}
            {currentStory.mediaType === "video" && (
              <video
                ref={videoRef}
                src={currentStory.mediaUrl}
                className="w-full h-full object-cover"
                autoPlay
                muted={isMuted}
                playsInline
                loop
              />
            )}
            {currentStory.mediaType === "text" && (
              <div
                className="w-full h-full flex items-center justify-center px-8"
                style={{ background: currentStory.backgroundColor || "#120024" }}
              >
                <p className="text-foreground text-2xl font-bold text-center leading-snug">
                  {currentStory.caption}
                </p>
              </div>
            )}
            {/* Top gradient */}
            <div
              className="absolute inset-x-0 top-0 pointer-events-none"
              style={{ height: 200, background: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)" }}
            />
            {/* Bottom gradient */}
            <div
              className="absolute inset-x-0 bottom-0 pointer-events-none"
              style={{ height: 260, background: "linear-gradient(0deg, rgba(0,0,0,0.82) 0%, transparent 100%)" }}
            />
          </div>

          {/* ── Progress bars ── */}
          <div className="absolute top-0 left-0 right-0 flex z-20" style={{ padding: "14px 12px 0", gap: 4 }}>
            {currentGroup.stories.map((_, idx) => (
              <div
                key={idx}
                style={{ flex: 1, height: 2.5, borderRadius: 2, background: "rgba(255,255,255,0.28)", overflow: "hidden" }}
              >
                <div
                  style={{
                    height: "100%",
                    background: "#ffffff",
                    borderRadius: 2,
                    width: idx < currentStoryIndex ? "100%" : idx === currentStoryIndex ? `${progress}%` : "0%",
                    transition: idx === currentStoryIndex ? "none" : undefined,
                  }}
                />
              </div>
            ))}
          </div>

          {/* ── User row ── */}
          <div
            className="absolute left-0 right-0 z-20 flex items-center justify-between"
            style={{ top: 32, padding: "0 12px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5">
              <img
                src={currentGroup.user.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentGroup.user.id}`}
                alt={displayName}
                style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "1.5px solid rgba(255,255,255,0.6)", flexShrink: 0 }}
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.95)", lineHeight: "1.2", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                    {displayName}
                  </span>
                  {ownerType !== "person" && (
                    <div
                      className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5"
                      style={{ background: `${entityConfig.color}33`, border: `1px solid ${entityConfig.color}66` }}
                    >
                      <entityConfig.icon size={9} color={entityConfig.color} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: entityConfig.color, letterSpacing: "0.04em" }}>
                        {entityConfig.label.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
                  {formatTime(currentStory.createdAt)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {currentStory.mediaType === "video" && (
                <button
                  onClick={() => setIsMuted((m) => !m)}
                  className="flex items-center justify-center rounded-full"
                  style={{ width: 34, height: 34, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(10px)" }}
                >
                  {isMuted ? <VolumeX size={15} color="white" /> : <Volume2 size={15} color="white" />}
                </button>
              )}
              <button
                onClick={() => setShowMenu((s) => !s)}
                className="flex items-center justify-center rounded-full"
                style={{ width: 34, height: 34, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(10px)" }}
              >
                <MoreVertical size={15} color="white" />
              </button>
              <button
                onClick={handleClose}
                className="flex items-center justify-center rounded-full"
                style={{ width: 34, height: 34, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(10px)" }}
              >
                <X size={15} color="white" />
              </button>
            </div>
          </div>

          {/* ── Context menu ── */}
          {showMenu && (
            <div
              className="absolute right-3 z-30 rounded-2xl overflow-hidden"
              style={{ top: 76, background: "rgba(18,12,32,0.97)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", minWidth: 190 }}
              onClick={(e) => e.stopPropagation()}
            >
              {(isOwnStory
                ? ["View Viewers", "Delete Story", "Share to Feed", "Highlight / Pin"]
                : ["Mute", "Report", "Copy Link", "Share"]
              ).map((label) => (
                <button
                  key={label}
                  className="w-full text-left px-4 py-3 text-sm font-medium"
                  style={{
                    color: label === "Delete Story" || label === "Report" ? "#FF453A" : "rgba(255,255,255,0.88)",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    background: "none",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    if (label === "Delete Story" && confirm("Delete this story?")) {
                      deleteMutation.mutate(currentStory.id);
                    }
                    setShowMenu(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* ── Right-side action stack ── */}
          {!isOwnStory && (
            <div
              className="absolute right-3 z-20 flex flex-col items-center"
              style={{ bottom: 130, gap: 22 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Like */}
              <button
                onClick={handleLike}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer" }}
              >
                <div
                  style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: isLiked ? "rgba(255,69,58,0.25)" : "rgba(0,0,0,0.45)",
                    backdropFilter: "blur(10px)",
                    border: isLiked ? "1.5px solid rgba(255,69,58,0.5)" : "1.5px solid rgba(255,255,255,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 180ms ease",
                    transform: isLiked ? "scale(1.1)" : "scale(1)",
                  }}
                >
                  <Heart size={20} color={isLiked ? "#FF453A" : "white"} fill={isLiked ? "#FF453A" : "none"} />
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Like</span>
              </button>

              {/* Comment */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowCommentsSheet(true); setIsPaused(true); }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer" }}
              >
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(10px)", border: "1.5px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MessageCircle size={20} color="white" />
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Comments</span>
              </button>

              {/* Share */}
              <button
                onClick={(e) => e.stopPropagation()}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer" }}
              >
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(10px)", border: "1.5px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Share2 size={20} color="white" />
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Share</span>
              </button>

              {/* Save */}
              <button
                onClick={handleSave}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer" }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: isSaved ? "rgba(139,92,246,0.25)" : "rgba(0,0,0,0.45)",
                  backdropFilter: "blur(10px)",
                  border: isSaved ? "1.5px solid rgba(139,92,246,0.5)" : "1.5px solid rgba(255,255,255,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 180ms ease",
                }}>
                  <Bookmark size={20} color={isSaved ? "#8B5CF6" : "white"} fill={isSaved ? "#8B5CF6" : "none"} />
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Save</span>
              </button>
            </div>
          )}

          {/* ── Caption ── */}
          {currentStory.caption && currentStory.mediaType !== "text" && (
            <div
              className="absolute left-0 z-10"
              style={{ bottom: showReply ? 128 : 108, padding: "0 16px", right: isOwnStory ? 16 : 72 }}
              onClick={(e) => { e.stopPropagation(); setCaptionExpanded((v) => !v); }}
            >
              <p
                style={{
                  color: "rgba(255,255,255,0.92)",
                  fontSize: 14,
                  lineHeight: "1.5",
                  textShadow: "0 1px 6px rgba(0,0,0,0.7)",
                  display: "-webkit-box",
                  WebkitLineClamp: captionExpanded ? undefined : 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  transition: "all 200ms ease",
                }}
              >
                {currentStory.caption}
              </p>
              {!captionExpanded && (currentStory.caption?.length || 0) > 80 && (
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2, display: "block" }}>
                  Tap to expand
                </span>
              )}
            </div>
          )}

          {/* ── Entity CTAs ── */}
          {ownerType !== "person" && !isOwnStory && (
            <div
              className="absolute left-0 right-0 z-20 flex gap-2 overflow-x-auto"
              style={{ bottom: showReply ? 152 : 130, padding: "0 12px", paddingRight: 72 }}
              onClick={(e) => e.stopPropagation()}
            >
              {entityConfig.actions.map((action) => (
                <button
                  key={action.label}
                  className="flex-shrink-0 flex items-center gap-1 rounded-full px-3"
                  style={{
                    height: 30, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.25)", fontSize: 12, fontWeight: 600,
                    color: "#ffffff", whiteSpace: "nowrap", cursor: "pointer",
                  }}
                >
                  {action.label}
                  <ChevronRight size={11} />
                </button>
              ))}
            </div>
          )}

          {/* ── Reaction center pop ── */}
          {centerPop && (
            <div
              className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
              style={{ animation: "reactionPop 900ms ease forwards" }}
            >
              <span style={{ fontSize: 72 }}>{centerPop}</span>
            </div>
          )}

          {/* ── Reaction sent toast ── */}
          {reactionToast && (
            <ReactionToast emoji={reactionToast} onDone={() => setReactionToast(null)} />
          )}

          {/* ── Bottom area ── */}
          <div
            className="absolute left-0 right-0 z-20"
            style={{ bottom: 0, paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {isOwnStory ? (
              /* ── Own story controls ── */
              <div className="flex items-center gap-2 px-3 pb-1">
                <button
                  className="flex-1 rounded-full flex items-center justify-center font-semibold"
                  style={{ height: 44, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.85)", fontSize: 14, cursor: "pointer" }}
                >
                  View Viewers
                </button>
                <button
                  onClick={() => { if (confirm("Delete this story?")) deleteMutation.mutate(currentStory.id); }}
                  className="rounded-full flex items-center justify-center"
                  style={{ height: 44, width: 44, background: "rgba(255,67,58,0.2)", border: "1px solid rgba(255,67,58,0.35)", backdropFilter: "blur(16px)", cursor: "pointer" }}
                >
                  <X size={18} color="#FF453A" />
                </button>
              </div>
            ) : showReply ? (
              /* ── Expanded reply input ── */
              <div className="flex items-center gap-2 px-3 pb-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendReply(); if (e.key === "Escape") { setShowReply(false); setIsPaused(false); } }}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="Reply to story…"
                  autoFocus
                  className="flex-1"
                  style={{
                    height: 44, borderRadius: 22,
                    background: "rgba(255,255,255,0.12)", backdropFilter: "blur(16px)",
                    border: "1px solid rgba(139,92,246,0.5)", paddingLeft: 16, paddingRight: 16,
                    fontSize: 14, color: "#ffffff", outline: "none",
                  }}
                />
                <button
                  onClick={handleSendReply}
                  style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #8B5CF6 0%, #C1001F 100%)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                >
                  <Send size={17} color="white" />
                </button>
                <button
                  onClick={() => { setShowReply(false); setIsPaused(false); }}
                  style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                >
                  <X size={15} color="rgba(255,255,255,0.7)" />
                </button>
              </div>
            ) : (
              /* ── Combined bottom bar ── */
              <div className="px-3 pb-1">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: 50,
                    borderRadius: 25,
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    padding: "0 6px 0 14px",
                    gap: 4,
                  }}
                >
                  {/* Smart reply field */}
                  <button
                    onClick={() => { setShowReply(true); setIsPaused(true); setTimeout(() => inputRef.current?.focus(), 100); }}
                    style={{ flex: 1, background: "none", border: "none", textAlign: "left", cursor: "pointer", color: "rgba(255,255,255,0.45)", fontSize: 14, padding: "0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    {SMART_PLACEHOLDERS[placeholderIdx]}
                  </button>

                  {/* Quick reactions */}
                  <div style={{ display: "flex", gap: 0, flexShrink: 0 }}>
                    {QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(emoji)}
                        style={{
                          width: 38, height: 38, borderRadius: "50%", background: "none", border: "none",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 20, cursor: "pointer",
                          transition: "transform 100ms ease",
                        }}
                        onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.25)"; }}
                        onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                        onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  {/* Plus button */}
                  <button
                    onClick={() => { setShowPlus(true); setIsPaused(true); }}
                    style={{
                      width: 38, height: 38, borderRadius: "50%",
                      background: "rgba(255,255,255,0.12)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", flexShrink: 0,
                      transition: "transform 120ms ease",
                    }}
                    onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.9)"; }}
                    onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                    onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                  >
                    <Plus size={17} color="rgba(255,255,255,0.8)" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Tap zones (invisible nav) ── */}
          <div
            className="absolute inset-y-0 left-0 z-10"
            style={{ width: "35%" }}
            onClick={(e) => { e.stopPropagation(); previousStory(); }}
          />
          <div
            className="absolute inset-y-0 right-0 z-10"
            style={{ width: "35%" }}
            onClick={(e) => { e.stopPropagation(); nextStory(); }}
          />
        </div>
      </div>

      {/* ── Plus sheet (outside main container so it sits above backdrop) ── */}
      {showPlus && (
        <PlusSheet
          onSelect={(action) => {
            setShowPlus(false);
            setIsPaused(false);
            if (action === "reply") { setShowReply(true); setIsPaused(true); }
          }}
          onClose={() => { setShowPlus(false); setIsPaused(false); }}
        />
      )}

      <CommentsSheet
        isOpen={showCommentsSheet}
        onClose={() => { setShowCommentsSheet(false); setIsPaused(false); }}
      />

      <style>{`
        @keyframes reactionPop {
          0%   { transform: scale(0.4); opacity: 0; }
          30%  { transform: scale(1.25); opacity: 1; }
          70%  { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.1); opacity: 0; }
        }
      `}</style>
    </>
  );
}
