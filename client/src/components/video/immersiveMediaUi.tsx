import { useState, type MouseEvent } from "react";
import { useLocation } from "wouter";
import type { LucideIcon } from "lucide-react";
import { entityPath, resolveContentLinks } from "@/lib/mapNavigation";

type EntityVideo = {
  entityType?: "team" | "event" | "challenge" | "coach" | "person";
  entityId?: string;
  role?: string;
  eventName?: string | null;
};

/** Shared chrome for fullscreen video / story overlays (always on dark media). */
export const IMMERSIVE = {
  icon: "#ffffff",
  iconMuted: "rgba(255,255,255,0.75)",
  count: "#ffffff",
  countShadow: "0 1px 3px rgba(0,0,0,0.85)",
  caption: "rgba(255,255,255,0.92)",
  meta: "rgba(255,255,255,0.55)",
  link: "rgba(255,255,255,0.95)",
  likeActive: "#FF453A",
  saveActive: "#ffffff",
  overlayTop: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)",
  overlayBottom: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
  sheetBg: "var(--immersive-sheet-bg, #121212)",
  sheetText: "var(--immersive-sheet-text, #ffffff)",
} as const;

export function fmtMediaCount(n: number = 0): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function ImmersiveActionIcon({
  icon: Icon,
  count,
  active,
  activeColor = IMMERSIVE.likeActive,
  onClick,
  size = 28,
  testId,
}: {
  icon: LucideIcon;
  count?: number;
  active?: boolean;
  activeColor?: string;
  onClick?: (e: MouseEvent) => void;
  size?: number;
  testId?: string;
}) {
  const color = active ? activeColor : IMMERSIVE.icon;
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "2px 4px",
        minWidth: 44,
      }}
      aria-label={Icon.displayName}
    >
      <Icon
        size={size}
        color={color}
        fill={active ? activeColor : "none"}
        strokeWidth={active ? 1.5 : 2}
        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.75))" }}
      />
      {count !== undefined && count > 0 && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: IMMERSIVE.count,
            textShadow: IMMERSIVE.countShadow,
          }}
        >
          {fmtMediaCount(count)}
        </span>
      )}
    </button>
  );
}

const CAPTION_COLLAPSE_CHARS = 96;

export function ImmersiveCaption({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsMore = text.length > CAPTION_COLLAPSE_CHARS;

  if (!text.trim()) return null;

  return (
    <p
      style={{
        fontSize: 13,
        color: IMMERSIVE.caption,
        lineHeight: 1.45,
        margin: 0,
        textShadow: "0 1px 4px rgba(0,0,0,0.6)",
      }}
    >
      {expanded || !needsMore ? text : `${text.slice(0, CAPTION_COLLAPSE_CHARS).trim()}… `}
      {needsMore && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            color: IMMERSIVE.meta,
          }}
        >
          {expanded ? "less" : "more"}
        </button>
      )}
    </p>
  );
}

/** One contextual deep-link under the caption (event / team / coach). */
export function PrimaryEntityLink({ video }: { video: EntityVideo }) {
  const [, setLocation] = useLocation();
  const links = resolveContentLinks({
    entityKind: video.entityType,
    entityId: video.entityId,
    postType: video.entityType,
  });

  let label: string | null = null;
  let path: string | undefined = links.primary;

  if (video.entityType === "event" || video.eventName) {
    label = video.eventName ? `View ${video.eventName}` : "View event";
    path = path || (video.entityId ? entityPath("event", video.entityId) : undefined);
  } else if (video.entityType === "team") {
    label = "View team";
    path = path || (video.entityId ? entityPath("team", video.entityId) : undefined);
  } else if (video.entityType === "coach" || video.role === "coach") {
    label = "View coach";
    path = path || (video.entityId ? entityPath("coach", video.entityId) : undefined);
  }

  if (!label || !path) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setLocation(path!);
      }}
      style={{
        display: "block",
        marginTop: 6,
        marginBottom: 4,
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 600,
        color: IMMERSIVE.link,
        textShadow: "0 1px 3px rgba(0,0,0,0.5)",
        textAlign: "left",
      }}
    >
      {label}
    </button>
  );
}
