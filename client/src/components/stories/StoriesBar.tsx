import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { StoryWithUser } from "@shared/schema";

interface StoryGroup {
  user: any;
  stories: StoryWithUser[];
  hasUnviewed: boolean;
  isLive: boolean;
}

interface StoriesBarProps {
  onStoryClick: (userId: string, storyIndex: number) => void;
  onAddStory: () => void;
}

/** Border for story avatars — same red ring in dark + light (not --surna-accent, which is black in light). */
function storyAvatarFrame(opts: {
  hasStories: boolean;
  hasUnviewed: boolean;
  isLive: boolean;
}): { border: string; boxShadow?: string } {
  const { hasStories, hasUnviewed, isLive } = opts;

  if (!hasStories) {
    return { border: "1.5px dashed var(--surna-story-empty-dash)" };
  }
  if (isLive) {
    return {
      border: "2px solid var(--surna-story-ring)",
      boxShadow: "0 0 12px var(--surna-story-ring-glow)",
    };
  }
  if (hasUnviewed) {
    return {
      border: "2px solid var(--surna-story-ring)",
      boxShadow: "0 0 10px var(--surna-story-ring-glow)",
    };
  }
  return { border: "2px solid transparent" };
}

function StoryAvatar({
  hasUnviewed,
  isLive,
  hasStories,
  size = 72,
  children,
}: {
  hasUnviewed: boolean;
  isLive: boolean;
  hasStories: boolean;
  size?: number;
  children: ReactNode;
}) {
  const frame = storyAvatarFrame({ hasUnviewed, isLive, hasStories });

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: frame.border,
        boxShadow: frame.boxShadow,
        padding: hasStories && (hasUnviewed || isLive) ? 2 : 0,
        boxSizing: "border-box",
        flexShrink: 0,
        overflow: "hidden",
        background: "var(--surna-story-avatar-bg)",
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

function LiveBadge() {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2"
      style={{
        bottom: -3,
        background: "var(--surna-story-ring)",
        borderRadius: 9,
        height: 18,
        paddingLeft: 7,
        paddingRight: 7,
        display: "flex",
        alignItems: "center",
        border: "1.5px solid var(--surna-story-avatar-bg)",
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>LIVE</span>
    </div>
  );
}

export function StoriesBar({ onStoryClick, onAddStory }: StoriesBarProps) {
  const { user } = useAuth();
  const [pressedId, setPressedId] = useState<string | null>(null);

  const { data: stories = [], isLoading } = useQuery<StoryWithUser[]>({
    queryKey: ["/api/stories"],
    enabled: !!user,
  });

  const storiesByUser = stories.reduce((acc, story) => {
    const uid = story.userId;
    if (!acc[uid]) {
      acc[uid] = { user: story.user, stories: [], hasUnviewed: false, isLive: false };
    }
    acc[uid].stories.push(story);
    if (!story.viewedByCurrentUser) acc[uid].hasUnviewed = true;
    return acc;
  }, {} as Record<string, StoryGroup>);

  const allGroups = Object.values(storiesByUser);
  const ownGroup = allGroups.find((g) => g.user.id === user?.id);
  const hasOwnStory = !!ownGroup?.stories.length;
  const otherGroups = allGroups
    .filter((g) => g.user.id !== user?.id)
    .sort((a, b) => {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      if (a.hasUnviewed !== b.hasUnviewed) return a.hasUnviewed ? -1 : 1;
      return 0;
    });

  const press = (id: string) => setPressedId(id);
  const release = () => setPressedId(null);
  const scale = (id: string) => (pressedId === id ? "scale(0.97)" : "scale(1)");
  const transition = "transform 140ms ease-out";

  if (isLoading) {
    return (
      <div className="flex overflow-x-auto no-scrollbar" style={{ padding: "8px 16px", gap: 12 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-shrink-0 flex flex-col items-center" style={{ gap: 6 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "var(--surna-story-skeleton)",
                animation: "pulse 1.4s ease-in-out infinite",
              }}
            />
            <div
              style={{
                width: 44,
                height: 10,
                borderRadius: 5,
                background: "var(--surna-story-skeleton)",
                animation: "pulse 1.4s ease-in-out infinite",
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        borderBottom: "1px solid var(--surna-story-divider)",
        paddingBottom: 4,
      }}
    >
      <div
        className="flex overflow-x-auto no-scrollbar"
        style={{
          padding: "10px 16px 8px",
          gap: 14,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <button
          onPointerDown={() => press("own")}
          onPointerUp={release}
          onPointerLeave={release}
          onClick={hasOwnStory ? () => onStoryClick(user!.id, 0) : onAddStory}
          className="flex-shrink-0 flex flex-col items-center"
          style={{ gap: 6, transform: scale("own"), transition }}
        >
          <div className="relative">
            <StoryAvatar hasUnviewed={hasOwnStory} isLive={false} hasStories={hasOwnStory}>
              <img
                src={
                  user?.profileImageUrl ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`
                }
                alt="Your story"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </StoryAvatar>

            {!hasOwnStory && (
              <div
                className="absolute bottom-0 right-0 flex items-center justify-center"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "var(--surna-story-ring)",
                  border: "2.5px solid var(--surna-story-avatar-bg)",
                }}
              >
                <Plus size={11} color="#ffffff" strokeWidth={3} />
              </div>
            )}
          </div>

          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--surna-story-label)",
              maxWidth: 72,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: "1.2",
            }}
          >
            Your story
          </span>
        </button>

        {otherGroups.map((group) => {
          const isSeen = !group.hasUnviewed && group.stories.length > 0;
          const hasStories = group.stories.length > 0;
          const name =
            group.user.displayName ||
            group.user.username ||
            group.user.firstName ||
            "User";

          return (
            <button
              key={group.user.id}
              onPointerDown={() => press(group.user.id)}
              onPointerUp={release}
              onPointerLeave={release}
              onClick={() => onStoryClick(group.user.id, 0)}
              className="flex-shrink-0 flex flex-col items-center"
              style={{
                gap: 6,
                transform: scale(group.user.id),
                transition,
                opacity: isSeen ? 0.78 : 1,
              }}
            >
              <div className="relative">
                <StoryAvatar
                  hasUnviewed={group.hasUnviewed}
                  isLive={group.isLive}
                  hasStories={hasStories}
                >
                  <img
                    src={
                      group.user.profileImageUrl ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${group.user.id}`
                    }
                    alt={name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    loading="lazy"
                  />
                </StoryAvatar>
                {group.isLive && <LiveBadge />}
              </div>

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: isSeen ? "var(--surna-story-label-seen)" : "var(--surna-story-label)",
                  maxWidth: 72,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: "1.2",
                }}
              >
                {name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
