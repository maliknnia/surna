import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  LayoutGrid,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  UserMinus,
  UserPlus,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LazyImage } from "@/components/ui/lazy-image";
import { deriveLqipPlaceholder, deriveModernSources } from "@/lib/imageSources";
import { getQueryFn } from "@/lib/queryClient";
import { ROUTES } from "@/navigation";
import type { UserHighlight } from "@shared/userProfile";
import { cn } from "@/lib/utils";

type ProfileTab = "posts" | "photos" | "stats";

type UserPhoto = {
  id: string;
  imageUrl: string;
  caption?: string | null;
};

type ProfilePost = {
  id: string;
  content?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  likesCount?: number;
};

type PerformanceSummary = {
  weeklyActivity?: number[];
  recentMatches?: Array<{ opponent: string; result?: string }>;
  monthlyGoals?: { completed?: number; total?: number };
  consistency?: string | number;
};

export type ProfileInstagramUser = {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  bio?: string;
  location?: string;
  profileImageUrl?: string;
  verified?: boolean;
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  profile?: {
    tagline?: string;
    sports?: string[];
    highlights?: UserHighlight[];
  };
};

type ProfileInstagramViewProps = {
  user: ProfileInstagramUser;
  avatarUrl: string;
  isOwnProfile: boolean;
  socialLoading?: boolean;
  onFollowToggle?: () => void;
  onMessage?: () => void;
  onStatClick?: (label: string) => void;
  onPostClick?: (postId: string) => void;
  headerExtra?: React.ReactNode;
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export function ProfileInstagramView({
  user,
  avatarUrl,
  isOwnProfile,
  socialLoading,
  onFollowToggle,
  onMessage,
  onStatClick,
  onPostClick,
  headerExtra,
}: ProfileInstagramViewProps) {
  const [tab, setTab] = useState<ProfileTab>("posts");
  const userId = user.id;

  const displayName =
    user.displayName ||
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    "Athlete";
  const username = (user.username || user.email?.split("@")[0] || "user").replace(/^@+/, "");
  const initials = `${(user.firstName || displayName[0] || "U")[0]}${(user.lastName || "")[0] || ""}`;
  const bioText = user.bio || user.profile?.tagline || "";
  const sportsList = user.profile?.sports ?? [];
  const highlightsList = user.profile?.highlights ?? [];

  const { data: photos = [], isLoading: photosLoading } = useQuery<UserPhoto[]>({
    queryKey: ["/api/users", userId, "photos"],
    queryFn: getQueryFn({ on401: "returnNull" }) as () => Promise<UserPhoto[]>,
    enabled: !!userId,
  });

  const { data: feedData, isLoading: postsLoading } = useQuery<{ posts: ProfilePost[] }>({
    queryKey: ["/api/profile", userId, "feed"],
    enabled: !!userId,
  });

  const { data: performance } = useQuery<PerformanceSummary>({
    queryKey: ["/api/profile", userId, "performance"],
    enabled: !!userId && tab === "stats",
  });

  const posts = feedData?.posts ?? [];
  const wins = performance?.recentMatches?.filter((m) => m.result === "win").length ?? 0;
  const activityTotal = performance?.weeklyActivity?.reduce((a, b) => a + b, 0) ?? 0;

  const stats = [
    { value: user.postsCount ?? posts.length, label: "posts" },
    { value: user.followersCount ?? 0, label: "followers" },
    { value: user.followingCount ?? 0, label: "following" },
  ];

  return (
    <div className="space-y-5 pb-2">
      {/* Top row: avatar + stats */}
      <div className="flex items-center gap-6 px-1">
        <Avatar className="w-[96px] h-[96px] shrink-0 ring-1 ring-white/10">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback
            className="text-2xl font-semibold"
            style={{ background: "var(--surna-elevated)", color: "var(--surna-text)" }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 grid grid-cols-3 text-center">
          {stats.map((stat) => (
            <button
              key={stat.label}
              type="button"
              onClick={() => onStatClick?.(stat.label)}
              className="py-1 active:opacity-70 transition-opacity"
            >
              <span className="block text-lg font-bold leading-tight" style={{ color: "var(--surna-text)" }}>
                {formatCount(typeof stat.value === "number" ? stat.value : 0)}
              </span>
              <span className="text-[12px]" style={{ color: "var(--surna-text-secondary)" }}>
                {stat.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Name & bio */}
      <div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <h2 className="text-[15px] font-bold" style={{ color: "var(--surna-text)" }}>
            {displayName}
          </h2>
          {user.verified ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "var(--surna-gold)" }} />
          ) : null}
        </div>
        {bioText ? (
          <p className="text-[14px] mt-1 leading-snug whitespace-pre-wrap" style={{ color: "var(--surna-text)" }}>
            {bioText}
          </p>
        ) : null}
        {user.location ? (
          <div className="flex items-center gap-1 mt-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--surna-text-muted)" }} />
            <span className="text-[13px]" style={{ color: "var(--surna-text-secondary)" }}>
              {user.location}
            </span>
          </div>
        ) : null}
        {sportsList.length > 0 ? (
          <p className="text-[13px] mt-1.5" style={{ color: "var(--surna-text-secondary)" }}>
            {sportsList.join(" · ")}
          </p>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-1">
        {isOwnProfile ? (
          <>
            <Link href={ROUTES.profileEdit} className="flex-1">
              <Button
                variant="outline"
                className="w-full rounded-lg h-10 text-[13px] font-semibold"
                style={{ background: "var(--surna-elevated)", color: "var(--surna-text)", borderColor: "var(--surna-border)" }}
              >
                Edit profile
              </Button>
            </Link>
            <Link href="/my-hub">
              <Button
                variant="outline"
                size="icon"
                className="rounded-lg h-10 w-10 shrink-0"
                style={{ background: "var(--surna-elevated)", borderColor: "var(--surna-border)" }}
                aria-label="My Hub"
              >
                <LayoutGrid className="w-4 h-4" style={{ color: "var(--surna-text)" }} />
              </Button>
            </Link>
          </>
        ) : (
          <>
            <Button
              onClick={onFollowToggle}
              disabled={socialLoading}
              className={cn(
                "flex-1 rounded-lg h-10 text-[13px] font-semibold",
                user.isFollowing ? "bg-transparent" : "bg-primary text-primary-foreground",
              )}
              style={user.isFollowing ? { border: "1px solid var(--surna-border)", color: "var(--surna-text)" } : undefined}
            >
              {socialLoading ? (
                <div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin mx-auto" />
              ) : user.isFollowing ? (
                <>
                  <UserMinus className="w-4 h-4 mr-1.5 inline" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-1.5 inline" />
                  Follow
                </>
              )}
            </Button>
            <Button
              onClick={onMessage}
              variant="outline"
              className="flex-1 rounded-lg h-10 text-[13px] font-semibold"
              style={{ background: "var(--surna-elevated)", color: "var(--surna-text)", borderColor: "var(--surna-border)" }}
            >
              <MessageCircle className="w-4 h-4 mr-1.5 inline" />
              Message
            </Button>
          </>
        )}
      </div>

      {headerExtra}

      {/* Highlights — Instagram story-style rings */}
      {highlightsList.length > 0 ? (
        <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
          <div className="flex gap-4 pb-1">
            {highlightsList.map((h) => (
              <div key={h.id} className="shrink-0 flex flex-col items-center w-[72px]">
                <div
                  className="w-[68px] h-[68px] rounded-full p-[2px]"
                  style={{
                    background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                  }}
                >
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center text-2xl border-2"
                    style={{
                      background: "var(--surna-void)",
                      borderColor: "var(--surna-void)",
                    }}
                  >
                    {h.emoji || "🏆"}
                  </div>
                </div>
                <span
                  className="text-[11px] font-medium mt-1.5 text-center leading-tight line-clamp-2 w-full"
                  style={{ color: "var(--surna-text)" }}
                >
                  {h.title}
                </span>
              </div>
            ))}
            {isOwnProfile ? (
              <Link href={ROUTES.profileEdit} className="shrink-0 flex flex-col items-center w-[72px]">
                <div
                  className="w-[68px] h-[68px] rounded-full border-2 border-dashed flex items-center justify-center"
                  style={{ borderColor: "var(--surna-border)" }}
                >
                  <span className="text-xl" style={{ color: "var(--surna-text-muted)" }}>+</span>
                </div>
                <span className="text-[11px] mt-1.5" style={{ color: "var(--surna-text-muted)" }}>
                  New
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      ) : isOwnProfile ? (
        <Link href={ROUTES.profileEdit}>
          <div
            className="rounded-xl px-4 py-3 text-[13px] text-center border border-dashed active:opacity-80"
            style={{ borderColor: "var(--surna-border)", color: "var(--surna-text-secondary)" }}
          >
            Add highlights — trophies, seasons, milestones
          </div>
        </Link>
      ) : null}

      {/* Tab bar */}
      <div
        className="flex border-t"
        style={{ borderColor: "var(--surna-border)" }}
      >
        {(
          [
            { id: "posts" as const, icon: LayoutGrid, label: "Posts" },
            { id: "photos" as const, icon: ImageIcon, label: "Photos" },
            { id: "stats" as const, icon: BarChart3, label: "Stats" },
          ] as const
        ).map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 flex items-center justify-center py-3 border-b-[2px] transition-colors",
              tab === id ? "border-[var(--surna-text)] opacity-100" : "border-transparent opacity-40",
            )}
          >
            <Icon className="w-5 h-5" style={{ color: "var(--surna-text)" }} />
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "posts" ? (
        postsLoading ? (
          <div className="grid grid-cols-3 gap-[2px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse" style={{ background: "var(--surna-elevated)" }} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center">
            <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: "var(--surna-text)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
              No posts yet
            </p>
            {isOwnProfile ? (
              <Link href="/feed">
                <p className="text-xs mt-1 underline" style={{ color: "var(--surna-text-secondary)" }}>
                  Share your first post
                </p>
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[2px]">
            {posts.map((post) => (
              <button
                key={post.id}
                type="button"
                className="aspect-square relative overflow-hidden bg-muted/20 active:opacity-90"
                onClick={() => onPostClick?.(post.id)}
                data-testid={`profile-post-${post.id}`}
              >
                {post.imageUrl ? (
                  <LazyImage
                    src={post.imageUrl}
                    alt=""
                    sources={deriveModernSources(post.imageUrl)}
                    placeholder={deriveLqipPlaceholder(post.imageUrl)}
                    wrapperClassName="block w-full h-full"
                    className="w-full h-full object-cover"
                  />
                ) : post.videoUrl ? (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--surna-elevated)", color: "var(--surna-text-muted)" }}>
                    ▶
                  </div>
                ) : (
                  <div
                    className="w-full h-full p-2 flex items-center justify-center text-center text-[10px] leading-tight line-clamp-4"
                    style={{ background: "var(--surna-elevated)", color: "var(--surna-text-secondary)" }}
                  >
                    {post.content?.slice(0, 80) || "Post"}
                  </div>
                )}
              </button>
            ))}
          </div>
        )
      ) : null}

      {tab === "photos" ? (
        photosLoading ? (
          <div className="grid grid-cols-3 gap-[2px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse" style={{ background: "var(--surna-elevated)" }} />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="py-16 text-center">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: "var(--surna-text)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
              No photos yet
            </p>
            {isOwnProfile ? (
              <Link href={`/person/${userId}#gallery`}>
                <p className="text-xs mt-1 underline" style={{ color: "var(--surna-text-secondary)" }}>
                  Add photos to your gallery
                </p>
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[2px]">
            {photos.map((p) => (
              <button
                key={p.id}
                type="button"
                className="aspect-square overflow-hidden"
                onClick={() => window.open(p.imageUrl, "_blank")}
              >
                <LazyImage
                  src={p.imageUrl}
                  alt={p.caption || "photo"}
                  sources={deriveModernSources(p.imageUrl)}
                  placeholder={deriveLqipPlaceholder(p.imageUrl)}
                  wrapperClassName="block w-full h-full"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )
      ) : null}

      {tab === "stats" ? (
        <div className="py-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Wins", value: wins || "—" },
              { label: "This week", value: activityTotal || "—" },
              {
                label: "Goals",
                value:
                  performance?.monthlyGoals?.total != null
                    ? `${performance.monthlyGoals.completed ?? 0}/${performance.monthlyGoals.total}`
                    : "—",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl py-4 text-center"
                style={{ background: "var(--surna-elevated)", border: "0.5px solid var(--surna-border)" }}
              >
                <p className="text-xl font-bold" style={{ color: "var(--surna-text)" }}>
                  {s.value}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--surna-text-secondary)" }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
          {performance?.consistency ? (
            <p className="text-[13px] text-center" style={{ color: "var(--surna-text-secondary)" }}>
              Activity: {performance.consistency}
            </p>
          ) : null}
          {!performance && (
            <p className="text-[13px] text-center py-8" style={{ color: "var(--surna-text-muted)" }}>
              Play games and join events to build your stats.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
