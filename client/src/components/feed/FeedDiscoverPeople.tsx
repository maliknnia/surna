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

/** Onboarding strip — follow athletes to fill the feed. */
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
    <section
      className="mx-3 mb-3 rounded-2xl px-3 py-3.5"
      style={{
        background: "var(--surna-surface)",
        border: "1px solid var(--surna-border)",
      }}
      data-testid="feed-discover-people"
    >
      <div className="flex items-center justify-between gap-3 mb-3 px-0.5">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold leading-tight" style={{ color: "var(--surna-text)" }}>
            Suggested for you
          </p>
          <p className="text-[12px] mt-0.5 leading-snug" style={{ color: "var(--surna-text-secondary)" }}>
            Follow athletes to personalize your feed
          </p>
        </div>
        <Link
          href={discoverPeoplePath("discover")}
          className="text-[12px] font-semibold shrink-0 active:opacity-70"
          style={{ color: "var(--surna-text-secondary)" }}
        >
          See all
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-0.5 -mx-0.5 px-0.5">
        {picks.map((u) => {
          const name = u.displayName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Athlete";
          const handle = u.username?.replace(/^@+/, "");
          const following = followingIds.has(u.id);

          return (
            <div key={u.id} className="shrink-0 w-[92px] flex flex-col items-center text-center">
              <button
                type="button"
                onClick={() => onUserClick(u.id)}
                className="flex flex-col items-center active:opacity-80"
              >
                <Avatar className="h-[72px] w-[72px] mb-2 ring-1 ring-[var(--surna-border)]">
                  <AvatarImage src={u.profileImageUrl || undefined} alt={name} className="object-cover" />
                  <AvatarFallback
                    className="text-base font-semibold"
                    style={{ background: "var(--surna-elevated)", color: "var(--surna-text)" }}
                  >
                    {name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <p
                  className="text-[12px] font-semibold truncate w-full max-w-[92px] leading-tight"
                  style={{ color: "var(--surna-text)" }}
                >
                  {name.split(" ")[0]}
                </p>
                {handle ? (
                  <p
                    className="text-[10px] truncate w-full max-w-[92px] mt-0.5"
                    style={{ color: "var(--surna-text-muted)" }}
                  >
                    @{handle}
                  </p>
                ) : null}
              </button>
              <button
                type="button"
                disabled={following}
                onClick={() => onFollowUser(u.id)}
                className="mt-2 h-7 w-full max-w-[88px] rounded-md text-[11px] font-semibold inline-flex items-center justify-center gap-1 active:opacity-80 disabled:opacity-50"
                style={{
                  background: following ? "transparent" : "var(--surna-bg-press)",
                  color: following ? "var(--surna-text-muted)" : "var(--surna-text)",
                  border: "1px solid var(--surna-border)",
                }}
              >
                {!following && <UserPlus className="h-3 w-3" strokeWidth={2.25} />}
                {following ? "Following" : "Follow"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
