import { useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MapPin,
  Zap,
  Users,
  Calendar,
  MoreVertical,
  Play,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { markNavReturn } from "@/lib/navigation";
import { resolveContentLinks } from "@/lib/mapNavigation";
import { ROUTES } from "@/navigation";
import { PostCardMediaBackdrop } from "@/components/feed/PostCardMediaBackdrop";
import type { FeedDemoPost } from "@/lib/personalizedDemoFeed";

const DEMO_COMMENTS_BANK: Record<string, { id: string; author: string; text: string; likes: number }[]> = {
  casual: [
    { id: "c1", author: "JoeNiazi", text: "Bro this is crazy 😂", likes: 12 },
    { id: "c2", author: "maria_fc", text: "Where is this? 👀", likes: 4 },
  ],
  hype: [
    { id: "c3", author: "kyle_b", text: "I'm joining next time 🔥", likes: 19 },
    { id: "c4", author: "coach_riv", text: "Great technique! Keep it up 💪", likes: 7 },
  ],
  event: [
    { id: "c5", author: "sam_hoops", text: "LFG 🏀 I'll be there!", likes: 33 },
    { id: "c6", author: "zara_k", text: "This looks insane, who else is going?", likes: 8 },
  ],
};

function feedPrimaryCtaStyle(isDark: boolean, joined?: boolean) {
  if (joined) {
    return {
      background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      color: isDark ? "rgba(255,255,255,0.42)" : "rgba(0,0,0,0.38)",
    };
  }
  return {
    background: isDark ? "hsl(var(--primary))" : "#000000",
    color: "hsl(var(--primary-foreground))",
  };
}

export function FeedDemoPostCard({
  post,
  isDark,
  onOpenComments,
  onVideoClick,
  returnPath = ROUTES.feed,
}: {
  post: FeedDemoPost;
  isDark: boolean;
  onOpenComments?: () => void;
  onVideoClick?: () => void;
  /** Where back navigation should return after opening linked content */
  returnPath?: string;
}) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [likes, setLikes] = useState(post.likesCount);
  const [expanded, setExpanded] = useState(false);
  const [heartVisible, setHeartVisible] = useState(false);
  const lastTapRef = useRef(0);

  const text1 = isDark ? "#ffffff" : "#111111";
  const text2 = isDark ? "rgba(255,255,255,0.42)" : "rgba(0,0,0,0.38)";
  const divider = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const handleMediaTap = () => {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 320;
    lastTapRef.current = now;

    if (isDoubleTap) {
      if (!isLiked) {
        setIsLiked(true);
        setLikes((l) => l + 1);
      }
      setHeartVisible(true);
      setTimeout(() => setHeartVisible(false), 900);
      return;
    }

    if (post.type === "video" && onVideoClick) {
      window.setTimeout(() => {
        if (Date.now() - lastTapRef.current >= 280) onVideoClick();
      }, 280);
    }
  };

  const handleLike = () => {
    const next = !isLiked;
    setIsLiked(next);
    setLikes((l) => (next ? l + 1 : l - 1));
    if (next) {
      setHeartVisible(true);
      setTimeout(() => setHeartVisible(false), 900);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/feed`;
    const text = `${post.author.name}: ${post.content.slice(0, 120)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "SURNA Feed", text, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Feed link copied to clipboard." });
    } catch {
      toast({ title: "Share", description: text, variant: "destructive" });
    }
  };

  const openEntity = (preferMap = false) => {
    const route = preferMap
      ? post.mapRoute || resolveContentLinks({ entityKind: post.entityKind, entityId: post.entityId }).map
      : post.actionRoute || resolveContentLinks({ entityKind: post.entityKind, entityId: post.entityId }).primary;
    if (route) {
      markNavReturn(returnPath);
      setLocation(route);
      return true;
    }
    return false;
  };

  const handleJoinAction = () => {
    if (openEntity(false)) return;
    setIsJoined((j) => !j);
  };

  const contentShort = post.content.slice(0, 110);
  const needsTrunc = post.content.length > 110;
  const comments = DEMO_COMMENTS_BANK[post.comments];
  const renderCaptionWithHashtags = (content: string) => {
    const parts = content.split(/(#[a-zA-Z0-9_]+)/g);
    return parts.map((part, idx) => {
      if (!part.startsWith("#")) return <span key={`txt-${idx}`}>{part}</span>;
      const tag = part.slice(1);
      return (
        <button
          key={`tag-${idx}`}
          onClick={() => setLocation(`/search?hashtag=${encodeURIComponent(tag)}`)}
          style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", color: "var(--surna-accent)" }}
        >
          {part}
        </button>
      );
    });
  };

  return (
    <div style={{ borderBottom: `0.5px solid ${divider}`, paddingBottom: 6 }}>
      {post.contextNotif && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px 4px",
            fontSize: 11,
            fontWeight: 600,
            color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)",
          }}
        >
          <Zap size={10} style={{ color: text2 }} />
          {post.contextNotif}
        </div>
      )}

      {post.isSponsored && (
        <div style={{ padding: "6px 16px 2px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: text2 }}>
          SPONSORED
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px 10px" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--surna-elevated)",
            border: `1px solid ${divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            color: text1,
            flexShrink: 0,
            letterSpacing: "-0.02em",
          }}
        >
          {post.author.avatar}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: text1 }}>{post.author.name}</span>
            {post.author.role === "verified" && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                  color: text2,
                  borderRadius: 5,
                  padding: "1px 5px",
                }}
              >
                ✓
              </span>
            )}
            {post.author.role === "coach" && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                  color: text2,
                  borderRadius: 5,
                  padding: "1px 5px",
                }}
              >
                Coach
              </span>
            )}
            {post.author.role === "organizer" && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                  color: text2,
                  borderRadius: 5,
                  padding: "1px 5px",
                }}
              >
                Organizer
              </span>
            )}
            {post.author.role === "team" && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                  color: text2,
                  borderRadius: 5,
                  padding: "1px 5px",
                }}
              >
                Team
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: text2, marginTop: 2 }}>
            {post.author.sportEmoji && <span>{post.author.sportEmoji}</span>}
            {post.author.sport && <span>{post.author.sport}</span>}
            {post.author.location && (
              <>
                <span>·</span>
                <span>{post.author.location}</span>
              </>
            )}
            {post.author.distance && (
              <>
                <span>·</span>
                <MapPin size={9} />
                <span>{post.author.distance}</span>
              </>
            )}
            <span>·</span>
            <span>{post.timestamp}</span>
          </div>
        </div>
        <button
          type="button"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MoreVertical size={16} style={{ color: text2 }} />
        </button>
      </div>

      <PostCardMediaBackdrop
        imageUrl={post.imageUrl}
        sport={post.sport}
        contentKind={post.type}
        authorRole={post.author.role}
        backgroundOverride={!post.imageUrl ? post.imageGradient : undefined}
        className="cursor-pointer"
        style={{ margin: "0 0 10px" }}
        onClick={handleMediaTap}
      >
        {heartVisible && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              pointerEvents: "none",
            }}
          >
            <span className="heart-pop" style={{ fontSize: 80 }}>
              ❤️
            </span>
          </div>
        )}

        {post.type === "video" && (
          <button
            type="button"
            aria-label="Play video"
            onClick={(e) => {
              e.stopPropagation();
              onVideoClick?.();
            }}
            style={{
              position: "absolute",
              right: 10,
              bottom: 10,
              width: 36,
              height: 36,
              border: "none",
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(6px)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Play size={16} style={{ color: "#fff", marginLeft: 2 }} fill="#fff" />
          </button>
        )}

        {post.sportEmoji && post.sport && (
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              background: "rgba(0,0,0,0.42)",
              backdropFilter: "blur(6px)",
              borderRadius: 10,
              padding: "3px 9px",
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(255,255,255,0.9)",
            }}
          >
            {post.sportEmoji} {post.sport}
          </div>
        )}

        <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", flexDirection: "column", gap: 4 }}>
          {post.locationTag && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEntity(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "rgba(0,0,0,0.48)",
                backdropFilter: "blur(6px)",
                borderRadius: 10,
                padding: "3px 9px",
                border: "none",
                cursor: "pointer",
              }}
            >
              <MapPin size={9} style={{ color: "rgba(255,255,255,0.8)" }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{post.locationTag}</span>
            </button>
          )}
          {post.eventName && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEntity(false);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(6px)",
                borderRadius: 10,
                padding: "3px 9px",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Zap size={9} style={{ color: "#fff" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{post.eventName}</span>
            </button>
          )}
        </div>
      </PostCardMediaBackdrop>

      <div style={{ display: "flex", alignItems: "center", padding: "0 8px 6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, flex: 1 }}>
          <button
            type="button"
            onClick={handleLike}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 10px", border: "none", background: "transparent", cursor: "pointer" }}
          >
            <Heart
              size={21}
              style={{ color: isLiked ? "#FF453A" : text2, fill: isLiked ? "#FF453A" : "none", transition: "all 0.18s" }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: isLiked ? "#FF453A" : text2 }}>{likes}</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenComments?.()}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 10px", border: "none", background: "transparent", cursor: "pointer" }}
          >
            <MessageCircle size={21} style={{ color: text2 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: text2 }}>{post.commentsCount}</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 10px", border: "none", background: "transparent", cursor: "pointer" }}
          >
            <Share2 size={20} style={{ color: text2 }} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setIsSaved((s) => !s)}
          style={{ padding: "7px 10px", border: "none", background: "transparent", cursor: "pointer" }}
        >
          <Bookmark size={21} style={{ color: isSaved ? text1 : text2, fill: isSaved ? text1 : "none", transition: "all 0.18s" }} />
        </button>
      </div>

      {(post.type === "event" || post.type === "team" || post.isSponsored) && (
        <div style={{ padding: "0 16px 8px" }}>
          {post.type === "event" && (
            <button
              type="button"
              onClick={handleJoinAction}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 20px",
                borderRadius: 99,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                transition: "all 0.2s",
                ...feedPrimaryCtaStyle(isDark, isJoined && !post.actionRoute),
              }}
            >
              <Zap size={14} />
              {post.actionRoute ? "Open Events" : isJoined ? "Joined ✓" : "Join Event"}
            </button>
          )}
          {post.type === "team" && (
            <button
              type="button"
              onClick={handleJoinAction}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 20px",
                borderRadius: 99,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                transition: "all 0.2s",
                ...feedPrimaryCtaStyle(isDark, isJoined && !post.actionRoute),
              }}
            >
              <Users size={14} />
              {post.actionRoute ? "View Teams" : isJoined ? "Joined ✓" : "Join Team"}
            </button>
          )}
          {post.isSponsored && post.sponsorCTA && (
            <button
              type="button"
              onClick={() => {
                if (post.actionRoute) {
                  markNavReturn(returnPath);
                  setLocation(post.actionRoute);
                }
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 20px",
                borderRadius: 99,
                border: `1px solid ${divider}`,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                color: text1,
              }}
            >
              <Calendar size={14} />
              {post.sponsorCTA}
            </button>
          )}
        </div>
      )}

      <div style={{ padding: "0 16px 8px" }}>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: text1, margin: 0 }}>
          <span style={{ fontWeight: 700 }}>@{post.author.username} </span>
          {expanded || !needsTrunc ? renderCaptionWithHashtags(post.content) : renderCaptionWithHashtags(contentShort)}
          {needsTrunc && !expanded && (
            <span style={{ color: text2, cursor: "pointer", fontWeight: 600 }} onClick={() => setExpanded(true)}>
              {" "}
              ...more
            </span>
          )}
        </p>
      </div>

      <div style={{ padding: "0 16px 6px", display: "flex", flexDirection: "column", gap: 3 }}>
        {comments.map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: text1, flexShrink: 0 }}>{c.author}</span>
            <span style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.58)", flex: 1 }}>
              {c.text}
            </span>
            <span style={{ fontSize: 11, color: text2, flexShrink: 0 }}>{c.likes}</span>
          </div>
        ))}
        {post.commentsCount > 2 && (
          <button
            type="button"
            onClick={() => onOpenComments?.()}
            style={{ fontSize: 12, color: text2, cursor: "pointer", background: "transparent", border: "none", padding: 0, textAlign: "left" }}
          >
            View all {post.commentsCount} comments
          </button>
        )}
      </div>
    </div>
  );
}
