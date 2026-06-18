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

/** Horizontal follow strip — open layout, no card box. */
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
      className="py-4 border-b"
      style={{ borderColor: "var(--surna-border)" }}
      data-testid="feed-discover-people"
    >
      <div className="flex items-center justify-between gap-3 mb-3 px-4">
        <div className="min-w-0">
          <p className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--surna-text-secondary)" }}>
            Suggested for you
          </p>
          <p className="text-[12px] mt-0.5 leading-snug" style={{ color: "var(--surna-text-muted)" }}>
            Follow athletes to personalize your feed
          </p>
        </div>
        <Link
          href={discoverPeoplePath("discover")}
          className="text-[12px] font-semibold shrink-0 active:opacity-70"
          style={{ color: "var(--surna-text)" }}
        >
          See all
        </Link>
      </div>

      <div className="flex gap-5 overflow-x-auto no-scrollbar px-4 pb-1">
        {picks.map((u) => {
          const name = u.displayName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Athlete";
          const handle = u.username?.replace(/^@+/, "");
          const following = followingIds.has(u.id);

          return (
            <div key={u.id} className="shrink-0 w-[76px] flex flex-col items-center text-center">
              <button
                type="button"
                onClick={() => onUserClick(u.id)}
                className="flex flex-col items-center active:opacity-80"
              >
                <Avatar className="h-16 w-16 mb-2">
                  <AvatarImage src={u.profileImageUrl || undefined} alt={name} className="object-cover" />
                  <AvatarFallback
                    className="text-sm font-semibold"
                    style={{ background: "var(--surna-elevated)", color: "var(--surna-text)" }}
                  >
                    {name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <p
                  className="text-[12px] font-semibold truncate w-full max-w-[76px] leading-tight"
                  style={{ color: "var(--surna-text)" }}
                >
                  {name.split(" ")[0]}
                </p>
                {handle ? (
                  <p
                    className="text-[10px] truncate w-full max-w-[76px] mt-0.5"
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
                className="mt-2 text-[11px] font-bold active:opacity-70 disabled:opacity-40"
                style={{ color: following ? "var(--surna-text-muted)" : "var(--surna-text)" }}
              >
                {following ? (
                  "Following"
                ) : (
                  <span className="inline-flex items-center gap-0.5">
                    <UserPlus className="h-3 w-3" strokeWidth={2.5} />
                    Follow
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
