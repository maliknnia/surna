import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import {
  X, Send, ChevronDown, ChevronRight,
  Heart, MoreHorizontal, Flag, Trash2, Copy,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface CommentAuthor {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  profileImageUrl?: string | null;
}

interface Comment {
  id: string;
  content: string;
  authorId: string;
  postId?: string;
  parentId?: string | null;
  createdAt: string | Date;
  likesCount?: number;
  likedByMe?: boolean;
  replyCount?: number;
  reaction?: string | null;
  author: CommentAuthor;
}

export interface CommentsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  /** optional entity context for smart CTAs */
  entityType?: "team" | "event" | "challenge" | "coach" | "person";
  entityId?: string;
  /** pre-fetched comment list (e.g. from PostCard) */
  initialComments?: Comment[];
}

/* ─── Entity CTA config ─────────────────────────────────────────────────────── */
const ENTITY_CTAS: Record<string, { label: string; color: string }[]> = {
  team:      [{ label: "View Team", color: "#000000" }, { label: "Join Team", color: "#000000" }],
  event:     [{ label: "Join Event", color: "#32D74B" }, { label: "View Details", color: "#32D74B" }],
  challenge: [{ label: "Accept Challenge", color: "#FFD60A" }],
  coach:     [{ label: "Book Session", color: "#FF9F0A" }, { label: "View Coach", color: "#FF9F0A" }],
  person:    [],
};

const QUICK_EMOJIS  = ["❤️", "😂", "😮", "🔥", "💪", "🫡", "👀", "🏆"];
const LONG_PRESS_REACTIONS = ["❤️", "😂", "🔥", "💪", "👀"];
const SORT_OPTIONS  = ["For you", "Top", "Recent"] as const;
const SMART_PLACEHOLDERS = [
  "Add a comment…",
  "Comment on this play…",
  "React to this moment…",
  "Say something…",
];

type SortOption = (typeof SORT_OPTIONS)[number];

/* ─── Helper: time ago ──────────────────────────────────────────────────────── */
function timeAgo(dateStr: string | Date) {
  const diff = (Date.now() - new Date(dateStr as string).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function authorName(a: CommentAuthor) {
  return a.firstName && a.lastName ? `${a.firstName} ${a.lastName}` : a.email || "User";
}

/* ─── Highlight @mentions ────────────────────────────────────────────────────── */
function HighlightedText({ text, mentionColor }: { text: string; mentionColor: string }) {
  const parts = text.split(/(@\w+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span key={i} style={{ color: mentionColor, fontWeight: 600 }}>{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/* ─── Reaction toast ─────────────────────────────────────────────────────────── */
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
        position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)",
        zIndex: 200, display: "flex", alignItems: "center", gap: 8,
        background: "rgba(0,0,0,0.8)", backdropFilter: "blur(16px)",
        borderRadius: 24, padding: "8px 16px",
        border: "1px solid rgba(255,255,255,0.15)",
        opacity, transition: "opacity 300ms ease", pointerEvents: "none", whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 18 }}>{emoji}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>Reaction sent</span>
    </div>
  );
}

/* ─── Single comment row ─────────────────────────────────────────────────────── */
function CommentRow({
  comment,
  isReply = false,
  isDark,
  currentUserId,
  mentionColor,
  onReply,
  onDelete,
}: {
  comment: Comment;
  isReply?: boolean;
  isDark: boolean;
  currentUserId?: string;
  mentionColor: string;
  onReply: (c: Comment) => void;
  onDelete: (id: string) => void;
}) {
  const [likes, setLikes]           = useState(comment.likesCount ?? 0);
  const [liked, setLiked]           = useState(comment.likedByMe ?? false);
  const [showReplies, setShowReplies] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const holdTimer = useRef<NodeJS.Timeout>();

  const queryClient = useQueryClient();

  const { data: replies = [] } = useQuery<Comment[]>({
    queryKey: ["/api/comments", comment.id, "replies"],
    queryFn: async () => {
      const r = await fetch(`/api/comments/${comment.id}/replies`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: showReplies,
  });

  const handleLike = () => {
    setLiked((v) => !v);
    setLikes((n) => liked ? n - 1 : n + 1);
  };

  const handlePressStart = () => {
    holdTimer.current = setTimeout(() => setShowReactions(true), 420);
  };
  const handlePressEnd = () => clearTimeout(holdTimer.current);

  const isOwn = comment.authorId === currentUserId;

  const nameClr  = isDark ? "rgba(255,255,255,0.92)" : "#1a0033";
  const textClr  = isDark ? "rgba(255,255,255,0.82)" : "#2d0055";
  const metaClr  = isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.38)";
  const replyClr = isDark ? "rgba(255,255,255,0.42)" : "rgba(109,40,217,0.55)";
  const actionBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(109,40,217,0.05)";
  const reactionBg = isDark ? "rgba(22,12,42,0.97)" : "rgba(255,255,255,0.98)";
  const reactionBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const avatarSize = isReply ? 28 : 36;

  return (
    <div
      style={{ marginLeft: isReply ? 48 : 0, position: "relative" }}
      data-testid={`comment-${comment.id}`}
    >
      {/* Reaction bar */}
      {showReactions && (
        <>
          <div className="fixed inset-0 z-[120]" onClick={() => setShowReactions(false)} />
          <div
            style={{
              position: "absolute", top: -48, left: 48, zIndex: 121,
              display: "flex", gap: 4, padding: "8px 12px",
              borderRadius: 28, background: reactionBg,
              backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
              border: `1px solid ${reactionBorder}`,
              animation: "commentReactionPop 120ms cubic-bezier(0.34,1.56,0.64,1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {LONG_PRESS_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setShowReactions(false)}
                style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", padding: "2px 3px", borderRadius: 8, lineHeight: 1, transition: "transform 100ms ease" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.3)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 10, padding: isReply ? "6px 16px" : "10px 16px" }}>
        {/* Avatar */}
        <img
          src={comment.author.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author.id}`}
          alt={authorName(comment.author)}
          style={{ width: avatarSize, height: avatarSize, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(109,40,217,0.1)" }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + time + actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: nameClr }}>{authorName(comment.author)}</span>
              <span style={{ fontSize: 11, color: metaClr }}>{timeAgo(comment.createdAt)}</span>
            </div>
            <button
              onClick={() => setShowActions((v) => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, opacity: 0.5 }}
            >
              <MoreHorizontal size={14} color={nameClr} />
            </button>
          </div>

          {/* Action menu */}
          {showActions && (
            <>
              <div className="fixed inset-0 z-[118]" onClick={() => setShowActions(false)} />
              <div
                style={{
                  position: "absolute", right: 16, top: 32, zIndex: 119,
                  background: isDark ? "rgba(18,10,32,0.97)" : "rgba(255,255,255,0.98)",
                  backdropFilter: "blur(20px)", borderRadius: 14,
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                  boxShadow: "0 8px 30px rgba(0,0,0,0.2)", overflow: "hidden", minWidth: 160,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {[
                  { label: "Reply", icon: null, action: () => { onReply(comment); setShowActions(false); } },
                  { label: "Copy", icon: null, action: () => { navigator.clipboard.writeText(comment.content); setShowActions(false); } },
                  ...(isOwn ? [{ label: "Delete", icon: null, action: () => { onDelete(comment.id); setShowActions(false); } }] : [
                    { label: "Report", icon: null, action: () => setShowActions(false) },
                  ]),
                ].map(({ label, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "12px 16px", background: "none", border: "none",
                      borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
                      fontSize: 14, fontWeight: 500, cursor: "pointer",
                      color: label === "Delete" || label === "Report" ? "#FF453A" : (isDark ? "rgba(255,255,255,0.88)" : "#1a0033"),
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Comment text */}
          <p
            style={{ fontSize: 14, lineHeight: "1.45", color: textClr, wordBreak: "break-word" }}
            onPointerDown={handlePressStart}
            onPointerUp={handlePressEnd}
            onPointerLeave={handlePressEnd}
          >
            <HighlightedText text={comment.content} mentionColor={mentionColor} />
          </p>

          {/* Actions row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 6 }}>
            {/* Like */}
            <button
              onClick={handleLike}
              style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer" }}
            >
              <Heart
                size={13}
                color={liked ? "#FF453A" : metaClr}
                fill={liked ? "#FF453A" : "none"}
                style={{ transition: "all 160ms ease", transform: liked ? "scale(1.15)" : "scale(1)" }}
              />
              {likes > 0 && (
                <span style={{ fontSize: 12, color: liked ? "#FF453A" : metaClr, fontWeight: liked ? 600 : 400 }}>{likes}</span>
              )}
            </button>

            {/* Reply */}
            {!isReply && (
              <button
                onClick={() => onReply(comment)}
                style={{ fontSize: 12, color: replyClr, fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
              >
                Reply
              </button>
            )}

            {/* View replies */}
            {!isReply && (comment.replyCount || 0) > 0 && (
              <button
                onClick={() => setShowReplies((v) => !v)}
                style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, color: replyClr, fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
              >
                {showReplies ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {showReplies ? "Hide" : `View ${comment.replyCount} ${comment.replyCount === 1 ? "reply" : "replies"}`}
              </button>
            )}
          </div>

          {/* Replies */}
          {showReplies && replies.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {replies.map((reply) => (
                <CommentRow
                  key={reply.id}
                  comment={reply}
                  isReply
                  isDark={isDark}
                  currentUserId={currentUserId}
                  mentionColor={mentionColor}
                  onReply={onReply}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main CommentsSheet ─────────────────────────────────────────────────────── */
export function CommentsSheet({ isOpen, onClose, postId, entityType = "person", entityId, initialComments }: CommentsSheetProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();

  const [visible, setVisible]           = useState(false);
  const [expanded, setExpanded]         = useState(false);
  const [sort, setSort]                 = useState<SortOption>("For you");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [inputText, setInputText]       = useState("");
  const [replyTo, setReplyTo]           = useState<Comment | null>(null);
  const [localComments, setLocalComments] = useState<Comment[]>(initialComments || []);
  const [reactionToast, setReactionToast] = useState<string | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  const [dragStartY, setDragStartY]     = useState(0);
  const [sheetHeight, setSheetHeight]   = useState(70);

  const inputRef       = useRef<HTMLInputElement>(null);
  const listRef        = useRef<HTMLDivElement>(null);
  const dragHandleRef  = useRef<HTMLDivElement>(null);

  // Slide up animation
  useEffect(() => {
    if (isOpen) {
      setVisible(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    }
  }, [isOpen]);

  // Smart placeholder cycling
  useEffect(() => {
    if (inputFocused || inputText) return;
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % SMART_PLACEHOLDERS.length), 3200);
    return () => clearInterval(t);
  }, [inputFocused, inputText]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialComments?.length) {
      setLocalComments(initialComments);
    }
  }, [isOpen, initialComments]);

  // Fetch real comments
  const { data: fetchedComments } = useQuery<Comment[]>({
    queryKey: ["/api/posts", postId, "comments"],
    queryFn: async () => {
      if (!postId) return [];
      const r = await fetch(`/api/posts/${postId}/details`, { credentials: "include" });
      if (!r.ok) return [];
      const data = await r.json();
      return data.comments?.filter((c: Comment) => !c.parentId) || [];
    },
    enabled: isOpen && !!postId,
  });

  useEffect(() => {
    if (fetchedComments && fetchedComments.length > 0) setLocalComments(fetchedComments);
  }, [fetchedComments]);

  const sortedComments = [...localComments].sort((a, b) => {
    if (sort === "Top") return (b.likesCount || 0) - (a.likesCount || 0);
    if (sort === "Recent") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return 0; // "For you" — keep server order
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!postId) throw new Error("Missing post");
      const endpoint = replyTo
        ? `/api/comments/${replyTo.id}/reply`
        : `/api/posts/${postId}/comment`;
      const r = await apiRequest("POST", endpoint, { content });
      return r.json();
    },
    onSuccess: (newComment) => {
      setLocalComments((prev) => [newComment, ...prev]);
      setInputText("");
      setReplyTo(null);
      if (postId) queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "comments"] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiRequest("DELETE", `/api/comments/${commentId}`);
    },
    onSuccess: (_, commentId) => {
      setLocalComments((p) => p.filter((c) => c.id !== commentId));
    },
  });

  const handleSend = () => {
    if (!inputText.trim()) return;
    addCommentMutation.mutate(inputText.trim());
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  const handleEmojiReaction = (emoji: string) => {
    setReactionToast(emoji);
    // Treat it as a comment
    addCommentMutation.mutate(emoji);
  };

  // Drag handle touch
  const handleDragStart = (e: React.TouchEvent) => {
    setDragStartY(e.touches[0].clientY);
  };
  const handleDragMove = (e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - dragStartY;
    if (dy > 60) { handleClose(); }
    else if (dy < -30) { setSheetHeight(95); setExpanded(true); }
  };

  if (!isOpen) return null;

  // Theme
  const sheetBg     = isDark ? "#0e0814" : "#ffffff";
  const handleBg    = isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.12)";
  const titleClr    = isDark ? "#ffffff" : "#1a0033";
  const borderTop   = isDark ? "rgba(255,255,255,0.08)" : "rgba(109,40,217,0.1)";
  const sortBg      = isDark ? "rgba(255,255,255,0.07)" : "rgba(109,40,217,0.06)";
  const sortActiveClr = isDark ? "#ffffff" : "#5B21B6";
  const sortInactiveClr = isDark ? "rgba(255,255,255,0.4)" : "rgba(109,40,217,0.45)";
  const dividerClr  = isDark ? "rgba(255,255,255,0.06)" : "rgba(109,40,217,0.06)";
  const inputBarBg  = isDark ? "rgba(8,4,16,0.97)" : "rgba(255,255,255,0.98)";
  const inputBg     = isDark ? "rgba(255,255,255,0.08)" : "rgba(109,40,217,0.05)";
  const inputBorder = isDark ? "rgba(167,139,250,0.2)" : "rgba(109,40,217,0.15)";
  const inputClr    = isDark ? "rgba(255,255,255,0.9)" : "#1a0033";
  const sendBg      = `linear-gradient(135deg, #3D1878 0%, #6B35D8 100%)`;
  const mentionClr  = isDark ? "#C4B5FD" : "#6D28D9";
  const emojiRowBg  = isDark ? "rgba(255,255,255,0.04)" : "rgba(109,40,217,0.03)";
  const replyBg     = isDark ? "rgba(167,139,250,0.1)" : "rgba(109,40,217,0.06)";
  const replyAccent = isDark ? "rgba(167,139,250,0.7)" : "rgba(109,40,217,0.6)";

  const entityCTAs = ENTITY_CTAS[entityType] || [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[130]"
        style={{ background: `rgba(0,0,0,${visible ? 0.5 : 0})`, transition: "background 280ms ease" }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: `${sheetHeight}vh`,
          background: sheetBg,
          borderRadius: "24px 24px 0 0",
          zIndex: 131,
          display: "flex",
          flexDirection: "column",
          transform: `translateY(${visible ? 0 : 100}%)`,
          transition: "transform 280ms cubic-bezier(0.32,0.72,0,1)",
          maxWidth: 600,
          margin: "0 auto",
        }}
        data-testid="comments-sheet"
      >
        {/* ── Drag handle ── */}
        <div
          ref={dragHandleRef}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 10, paddingBottom: 4, cursor: "grab", flexShrink: 0 }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: handleBg }} />
        </div>

        {/* ── Header ── */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 16px 10px", borderBottom: `1px solid ${borderTop}`, flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: titleClr }}>
              Comments
            </p>
            <span style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)" }}>
              {localComments.length}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Sort */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowSortMenu((v) => !v)}
                style={{
                  height: 30, paddingLeft: 10, paddingRight: 10, borderRadius: 15,
                  background: sortBg, border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.7)" : "rgba(109,40,217,0.7)",
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                {sort} <ChevronDown size={12} />
              </button>
              {showSortMenu && (
                <>
                  <div className="fixed inset-0 z-[140]" onClick={() => setShowSortMenu(false)} />
                  <div
                    style={{
                      position: "absolute", right: 0, top: 36, zIndex: 141,
                      background: isDark ? "rgba(18,10,32,0.97)" : "#fff",
                      backdropFilter: "blur(16px)", borderRadius: 14,
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                      overflow: "hidden", minWidth: 140,
                      boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
                    }}
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setSort(opt); setShowSortMenu(false); }}
                        style={{
                          display: "block", width: "100%", textAlign: "left",
                          padding: "11px 16px", background: "none", border: "none",
                          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}`,
                          fontSize: 14, fontWeight: sort === opt ? 700 : 400,
                          color: sort === opt ? sortActiveClr : sortInactiveClr,
                          cursor: "pointer",
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {/* Close */}
            <button
              onClick={handleClose}
              style={{ width: 30, height: 30, borderRadius: "50%", background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <X size={14} color={isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)"} />
            </button>
          </div>
        </div>

        {/* ── Comment list ── */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: 8 }}
        >
          {sortedComments.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: titleClr, marginBottom: 4 }}>No comments yet</p>
              <p style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>Be the first to say something</p>
            </div>
          ) : (
            sortedComments.map((comment, idx) => (
              <div key={comment.id}>
                <CommentRow
                  comment={comment}
                  isDark={isDark}
                  currentUserId={user?.id}
                  mentionColor={mentionClr}
                  onReply={setReplyTo}
                  onDelete={(id) => deleteCommentMutation.mutate(id)}
                />
                {idx < sortedComments.length - 1 && (
                  <div style={{ height: 1, background: dividerClr, margin: "0 16px" }} />
                )}
              </div>
            ))
          )}
        </div>

        {/* ── Input area ── */}
        <div
          style={{
            background: inputBarBg, backdropFilter: "blur(16px)",
            borderTop: `1px solid ${borderTop}`,
            paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
            flexShrink: 0,
          }}
        >
          {/* Entity CTAs */}
          {entityCTAs.length > 0 && (
            <div style={{ display: "flex", gap: 8, padding: "8px 16px 4px", overflowX: "auto" }}>
              {entityCTAs.map((cta) => (
                <button
                  key={cta.label}
                  style={{
                    flexShrink: 0, height: 30, paddingLeft: 14, paddingRight: 14, borderRadius: 15,
                    background: `${cta.color}1A`, border: `1px solid ${cta.color}44`,
                    fontSize: 12, fontWeight: 600, color: cta.color, cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cta.label}
                </button>
              ))}
            </div>
          )}

          {/* Quick emoji row */}
          <div
            className="overflow-x-auto"
            style={{ display: "flex", gap: 6, padding: "6px 16px", background: emojiRowBg, borderTop: `1px solid ${dividerClr}`, borderBottom: `1px solid ${dividerClr}` }}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiReaction(emoji)}
                style={{
                  fontSize: 22, background: "none", border: "none", cursor: "pointer",
                  padding: "2px 6px", borderRadius: 8, transition: "transform 100ms ease", flexShrink: 0,
                }}
                onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.3)"; }}
                onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Reply indicator */}
          {replyTo && (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: replyBg, borderLeft: `3px solid ${replyAccent}`,
                borderRadius: "0 8px 8px 0", padding: "5px 10px", margin: "6px 12px 0",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: replyAccent, marginBottom: 1 }}>
                  Replying to {authorName(replyTo.author)}
                </p>
                <p style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {replyTo.content}
                </p>
              </div>
              <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={13} color={replyAccent} />
              </button>
            </div>
          )}

          {/* Input row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px" }}>
            {/* User avatar */}
            <img
              src={user?.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || "me"}`}
              alt="You"
              style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(109,40,217,0.1)" }}
            />

            {/* Input field */}
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={SMART_PLACEHOLDERS[placeholderIdx]}
              disabled={addCommentMutation.isPending}
              style={{
                flex: 1, height: 42, borderRadius: 21,
                background: inputBg, border: `1px solid ${inputBorder}`,
                padding: "0 14px", fontSize: 14, color: inputClr,
                outline: "none", transition: "border-color 200ms ease",
                boxSizing: "border-box",
              }}
              data-testid="comment-input"
            />

            {/* Send button */}
            {inputText.trim() && (
              <button
                onClick={handleSend}
                disabled={addCommentMutation.isPending}
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: sendBg, border: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", flexShrink: 0,
                  boxShadow: "0 2px 10px rgba(91,45,192,0.4)",
                  transition: "transform 120ms ease",
                }}
                onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.92)"; }}
                onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                data-testid="comment-send-button"
              >
                <Send size={16} color="#ffffff" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reaction sent toast */}
      {reactionToast && (
        <ReactionToast emoji={reactionToast} onDone={() => setReactionToast(null)} />
      )}

      <style>{`
        @keyframes commentReactionPop {
          from { transform: scale(0.6); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </>
  );
}
