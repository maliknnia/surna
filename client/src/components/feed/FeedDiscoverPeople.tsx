import { Link } from "wouter";
import { UserPlus } from "lucide-react";
import type { User } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { discoverPeoplePath } from "@/lib/socialPeopleApi";

type FeedDiscoverPeopleProps = {
  suggestedUsers: User[];
  followingIds: Set<string>;
  onFollowUser: (userId: string) => void;
  onUserClick: (userId: string) => void;
  compact?: boolean;
};

/** Onboarding strip — follow athletes to fill the feed (IG-style discover). */
export function FeedDiscoverPeople({
  suggestedUsers,
  followingIds,
  onFollowUser,
  onUserClick,
  compact = false,
}: FeedDiscoverPeopleProps) {
  const picks = suggestedUsers.filter((u) => !followingIds.has(u.id)).slice(0, compact ? 8 : 12);
  if (picks.length === 0) return null;

  return (
    <div
      className={compact ? "px-3 py-3 mb-1" : "px-3 py-4 mb-2"}
      style={{ background: "var(--surna-base)" }}
      data-testid="feed-discover-people"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-[15px] font-semibold leading-tight" style={{ color: "var(--surna-text)" }}>
            Follow athletes to see their posts
          </p>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--surna-text-secondary)" }}>
            Your feed is personalized from who you follow and your sports.
          </p>
        </div>
        <Link
          href={discoverPeoplePath("discover")}
          className="text-[13px] font-semibold shrink-0 pt-0.5 active:opacity-70"
          style={{ color: "hsl(var(--primary))" }}
        >
          See all
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {picks.map((u) => {
          const name = u.displayName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Athlete";
          const following = followingIds.has(u.id);
          return (
            <div
              key={u.id}
              className="shrink-0 w-[140px] rounded-xl p-3 flex flex-col items-center text-center"
              style={{
                background: "var(--surna-elevated)",
                border: "1px solid var(--surna-border)",
              }}
            >
              <button type="button" onClick={() => onUserClick(u.id)} className="active:opacity-80">
                <Avatar className="h-16 w-16 mb-2">
                  <AvatarImage src={u.profileImageUrl || undefined} alt={name} />
                  <AvatarFallback className="text-sm font-semibold">{name.charAt(0)}</AvatarFallback>
                </Avatar>
                <p className="text-[13px] font-semibold truncate w-full max-w-[120px]" style={{ color: "var(--surna-text)" }}>
                  {name}
                </p>
                {u.username ? (
                  <p className="text-[11px] truncate w-full max-w-[120px]" style={{ color: "var(--surna-text-secondary)" }}>
                    @{u.username.replace(/^@+/, "")}
                  </p>
                ) : null}
              </button>
              <button
                type="button"
                disabled={following}
                onClick={() => onFollowUser(u.id)}
                className="mt-2 w-full h-8 rounded-lg text-[13px] font-semibold inline-flex items-center justify-center gap-1 active:opacity-80 disabled:opacity-60"
                style={
                  following
                    ? { background: "var(--ig-profile-btn-bg)", color: "var(--surna-text-secondary)" }
                    : { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
                }
              >
                {!following && <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />}
                {following ? "Following" : "Follow"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
