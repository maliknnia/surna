import {
  Settings,
  Users,
  Calendar,
  MessageCircle,
  MapPin,
  ChevronRight,
  User,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ROUTES } from "@/navigation";
import { mapPath } from "@/lib/mapNavigation";
import { getQueryFn } from "@/lib/queryClient";

type FeedProfilePanelProps = {
  user: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    username?: string | null;
    email?: string | null;
    profileImageUrl?: string | null;
  } | null;
  onNavigate: (path: string) => void;
};

type QuickLink = {
  id: string;
  label: string;
  icon: typeof Settings;
  path: string;
};

const QUICK_LINKS: QuickLink[] = [
  { id: "profile", label: "Edit profile", icon: User, path: ROUTES.profile },
  { id: "settings", label: "Settings", icon: Settings, path: ROUTES.settings },
  { id: "teams", label: "Teams", icon: Users, path: ROUTES.teams },
  { id: "events", label: "Events", icon: Calendar, path: ROUTES.events },
  { id: "messages", label: "Messages", icon: MessageCircle, path: ROUTES.messages },
  { id: "map", label: "Map", icon: MapPin, path: mapPath() },
];

export function FeedProfilePanel({ user, onNavigate }: FeedProfilePanelProps) {
  const userId = user?.id;

  const { data: userStats } = useQuery<{
    postsCount?: number;
    followersCount?: number;
    followingCount?: number;
    primarySport?: string;
    sport?: string;
    bio?: string;
  }>({
    queryKey: [`/api/users/${userId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!userId,
    staleTime: 60_000,
  });

  const displayName =
    user?.displayName ||
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    user?.email ||
    "Your profile";

  const handle = user?.username || user?.email?.split("@")[0] || "user";
  const sport = userStats?.primarySport || userStats?.sport;

  const stats = [
    { label: "Posts", value: userStats?.postsCount ?? 0 },
    { label: "Followers", value: userStats?.followersCount ?? 0 },
    { label: "Following", value: userStats?.followingCount ?? 0 },
  ];

  return (
    <div className="pb-6">
      <div
        className="rounded-2xl overflow-hidden mb-4"
        style={{ background: "var(--surna-bg-elevated)", border: "1px solid var(--surna-border)" }}
      >
        <div className="px-4 pt-5 pb-4 text-center">
          <Avatar className="h-16 w-16 mx-auto mb-3" style={{ border: "2px solid var(--surna-border)" }}>
            <AvatarImage src={user?.profileImageUrl || undefined} alt={displayName} />
            <AvatarFallback className="text-lg font-bold" style={{ background: "var(--surna-bg-highlight)", color: "var(--surna-text)" }}>
              {user?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <h3 className="text-lg font-bold leading-tight" style={{ color: "var(--surna-text)" }}>
            {displayName}
          </h3>
          <p className="text-sm mt-0.5" style={{ color: "var(--surna-text-secondary)" }}>
            @{handle}
          </p>
          {sport && (
            <span
              className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide"
              style={{ background: "var(--surna-bg-highlight)", color: "var(--surna-text-secondary)" }}
            >
              {sport}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 border-t" style={{ borderColor: "var(--surna-border)" }}>
          {stats.map((stat) => (
            <div key={stat.label} className="py-3 text-center">
              <div className="text-lg font-bold tabular-nums" style={{ color: "var(--surna-text)" }}>
                {stat.value}
              </div>
              <div className="text-[11px] font-medium" style={{ color: "var(--surna-text-muted)" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => onNavigate(link.path)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-left active:scale-[0.98] transition-transform"
              style={{ background: "var(--surna-bg-highlight)" }}
            >
              <Icon size={16} style={{ color: "var(--surna-text-secondary)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
                {link.label}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onNavigate(ROUTES.profile)}
        className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 active:scale-[0.98] transition-transform"
        style={{ background: "var(--surna-text)", color: "var(--surna-base)" }}
      >
        <span className="text-sm font-bold">Open full profile</span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
