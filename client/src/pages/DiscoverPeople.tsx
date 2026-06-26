import { useMemo, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Search, X, UserPlus, UserMinus, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  fetchFollowers,
  fetchFollowing,
  fetchSuggestedPeople,
  searchPeople,
  followUser,
  unfollowUser,
  personDisplayName,
  personUsername,
  personInitials,
  type SocialPerson,
} from "@/lib/socialPeopleApi";

type PeopleTab = "followers" | "following" | "discover";

function usePeopleTabParams(): { tab: PeopleTab; userId: string | undefined } {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  const user = params.get("user") || undefined;
  if (tab === "followers" || tab === "following" || tab === "discover") {
    return { tab, userId: user };
  }
  return { tab: "discover", userId: user };
}

function PersonRow({
  person,
  isFollowing,
  onToggleFollow,
  onMessage,
  showFollow,
  followLoading,
}: {
  person: SocialPerson;
  isFollowing?: boolean;
  onToggleFollow?: () => void;
  onMessage?: () => void;
  showFollow?: boolean;
  followLoading?: boolean;
}) {
  const name = personDisplayName(person);
  const handle = personUsername(person);

  return (
    <div
      className="flex items-center gap-3 py-3"
      style={{ borderBottom: "0.5px solid var(--surna-border)" }}
    >
      <Link href={`/person/${person.id}`}>
        <Avatar className="w-12 h-12 shrink-0">
          <AvatarImage src={person.profileImageUrl || undefined} alt={name} />
          <AvatarFallback
            className="text-sm font-semibold"
            style={{ background: "var(--surna-elevated)", color: "var(--surna-text)" }}
          >
            {personInitials(person)}
          </AvatarFallback>
        </Avatar>
      </Link>

      <Link href={`/person/${person.id}`} className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: "var(--surna-text)" }}>
          {name}
        </p>
        <p className="text-xs truncate" style={{ color: "var(--surna-text-secondary)" }}>
          @{handle}
          {person.sport ? ` · ${person.sport}` : ""}
        </p>
        {person.location ? (
          <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--surna-text-muted)" }}>
            {person.location}
          </p>
        ) : null}
      </Link>

      <div className="flex items-center gap-2 shrink-0">
        {onMessage ? (
          <button
            type="button"
            onClick={onMessage}
            className="p-2 rounded-full active:scale-95 transition-transform"
            style={{ background: "var(--surna-elevated)" }}
            aria-label="Message"
          >
            <MessageCircle className="w-4 h-4" style={{ color: "var(--surna-text)" }} />
          </button>
        ) : null}
        {showFollow && onToggleFollow ? (
          <button
            type="button"
            disabled={followLoading}
            onClick={onToggleFollow}
            className={cn(
              "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-95 transition-transform",
              isFollowing ? "border" : "text-white",
            )}
            style={
              isFollowing
                ? {
                    background: "var(--surna-elevated)",
                    color: "var(--surna-text-secondary)",
                    borderColor: "var(--surna-border)",
                  }
                : { background: "#000" }
            }
          >
            {followLoading ? (
              <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : isFollowing ? (
              <>
                <UserMinus className="w-3.5 h-3.5" />
                Following
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                Follow
              </>
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function DiscoverPeople() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { tab: initialTab, userId: paramUserId } = usePeopleTabParams();

  const [tab, setTab] = useState<PeopleTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const currentUserId = (user as { id?: string })?.id;
  const listUserId = paramUserId || currentUserId;
  const isOwnLists = !paramUserId || paramUserId === currentUserId;

  const { data: followers = [], isLoading: loadingFollowers } = useQuery({
    queryKey: ["/api/users", listUserId, "followers"],
    queryFn: () => fetchFollowers(listUserId!),
    enabled: !!listUserId && tab === "followers",
  });

  const { data: following = [], isLoading: loadingFollowing } = useQuery({
    queryKey: ["/api/users", listUserId, "following"],
    queryFn: () => fetchFollowing(listUserId!),
    enabled: !!listUserId && tab === "following",
  });

  const { data: suggested = [], isLoading: loadingSuggested } = useQuery({
    queryKey: ["/api/users/suggested"],
    queryFn: () => fetchSuggestedPeople(32),
    enabled: tab === "discover" && searchQuery.trim().length < 2,
  });

  const { data: searchResults = [], isLoading: loadingSearch } = useQuery({
    queryKey: ["/api/search/users", searchQuery],
    queryFn: () => searchPeople(searchQuery, 32),
    enabled: tab === "discover" && searchQuery.trim().length >= 2,
  });

  const { data: myFollowingSeed = [] } = useQuery({
    queryKey: ["/api/users", currentUserId, "following-seed"],
    queryFn: () => fetchFollowing(currentUserId!),
    enabled: !!currentUserId && tab === "discover",
  });

  const discoverList = searchQuery.trim().length >= 2 ? searchResults : suggested;
  const discoverLoading = searchQuery.trim().length >= 2 ? loadingSearch : loadingSuggested;

  const followingIdSet = useMemo(() => {
    const ids = new Set(followingIds);
    for (const p of following) ids.add(p.id);
    for (const p of myFollowingSeed) ids.add(p.id);
    return ids;
  }, [following, followingIds, myFollowingSeed]);

  const toggleFollow = useMutation({
    mutationFn: async ({ personId, currentlyFollowing }: { personId: string; currentlyFollowing: boolean }) => {
      setFollowBusyId(personId);
      if (currentlyFollowing) {
        await unfollowUser(personId);
      } else {
        await followUser(personId);
      }
    },
    onSuccess: (_data, { personId, currentlyFollowing }) => {
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (currentlyFollowing) next.delete(personId);
        else next.add(personId);
        return next;
      });
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId] });
        queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId, "following"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/users/suggested"] });
    },
    onError: () => {
      toast({ title: "Couldn't update follow", variant: "destructive" });
    },
    onSettled: () => setFollowBusyId(null),
  });

  const setTabAndUrl = (next: PeopleTab) => {
    setTab(next);
    const params = new URLSearchParams({ tab: next });
    if (paramUserId) params.set("user", paramUserId);
    navigate(`/discover/people?${params.toString()}`);
  };

  const listTitle =
    tab === "followers"
      ? isOwnLists ? "Followers" : "Their followers"
      : tab === "following"
        ? isOwnLists ? "Following" : "Following"
        : "Discover";

  const listLoading =
    tab === "followers" ? loadingFollowers : tab === "following" ? loadingFollowing : discoverLoading;

  const listPeople: SocialPerson[] =
    tab === "followers" ? followers : tab === "following" ? following : discoverList;

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--surna-void)" }}>
      <header
        className="sticky top-0 z-40 glass-effect border-b"
        style={{ borderColor: "var(--surna-border)" }}
      >
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? window.history.back() : navigate("/"))}
            className="p-2 rounded-xl hover:bg-muted/40 active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: "var(--surna-text)" }} />
          </button>
          <h1 className="flex-1 text-base font-semibold" style={{ color: "var(--surna-text)" }}>
            {listTitle}
          </h1>
        </div>

        <div className="max-w-md mx-auto px-4 pb-2 flex gap-1">
          {(
            [
              { id: "following" as const, label: "Following" },
              { id: "followers" as const, label: "Followers" },
              { id: "discover" as const, label: "Discover" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTabAndUrl(t.id)}
              className={cn(
                "flex-1 py-2 text-xs font-semibold rounded-lg transition-colors",
                tab === t.id ? "text-white" : "",
              )}
              style={
                tab === t.id
                  ? { background: "#000" }
                  : { color: "var(--surna-text-secondary)", background: "var(--surna-elevated)" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "discover" ? (
          <div className="max-w-md mx-auto px-4 pb-3">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "var(--surna-elevated)", border: "0.5px solid var(--surna-border)" }}
            >
              <Search className="w-4 h-4 shrink-0" style={{ color: "var(--surna-text-muted)" }} />
              <input
                type="search"
                placeholder="Search athletes by name…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm"
                style={{ color: "var(--surna-text)" }}
              />
              {searchQuery ? (
                <button type="button" onClick={() => setSearchQuery("")} className="p-1">
                  <X className="w-4 h-4" style={{ color: "var(--surna-text-muted)" }} />
                </button>
              ) : null}
            </div>
        </div>
        ) : null}
      </header>

      <div className="max-w-md mx-auto px-4">
        {listLoading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" />
                    </div>
        ) : listPeople.length === 0 ? (
          <div className="py-16 text-center px-4">
            <p className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
              {tab === "followers"
                ? "No followers yet"
                : tab === "following"
                  ? "Not following anyone yet"
                  : searchQuery
                    ? "No one matched your search"
                    : "No suggestions right now"}
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--surna-text-secondary)" }}>
              {tab === "discover"
                ? "Try searching by name or check back later."
                : "When people follow you, they'll show up here."}
            </p>
            {tab !== "discover" ? (
              <button
                type="button"
                onClick={() => setTabAndUrl("discover")}
                className="mt-4 text-xs font-semibold underline"
                style={{ color: "var(--surna-text-secondary)" }}
              >
                Find people to follow
              </button>
            ) : null}
          </div>
        ) : (
          <div>
            {listPeople.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                showFollow={tab === "discover" && person.id !== currentUserId}
                isFollowing={followingIdSet.has(person.id)}
                followLoading={followBusyId === person.id}
                onToggleFollow={() =>
                  toggleFollow.mutate({
                    personId: person.id,
                    currentlyFollowing: followingIdSet.has(person.id),
                  })
                }
                onMessage={
                  person.id !== currentUserId
                    ? () => navigate(`/messages?userId=${encodeURIComponent(person.id)}`)
                    : undefined
                }
              />
            ))}
          </div>
                  )}
                </div>
    </div>
  );
}
