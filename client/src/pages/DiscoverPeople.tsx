import { useMemo, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Search, X, UserPlus, UserMinus, MessageCircle, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  EntityEmptyState,
  EntityListSkeleton,
  EntitySectionTabs,
} from "@/components/entity";
import { useSmartBack } from "@/lib/navigation";
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
                : { background: "var(--surna-gold)", color: "#000" }
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
  const goBack = useSmartBack({ fallback: "/" });
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

  const peopleTabs = [
    { id: "following", label: "Following" },
    { id: "followers", label: "Followers" },
    { id: "discover", label: "Discover" },
  ];

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto" style={{ background: "var(--surna-base)", color: "var(--surna-text)" }}>
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{
          background: "color-mix(in srgb, var(--surna-base) 92%, transparent)",
          borderColor: "var(--surna-border)",
        }}
      >
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-[0.96] transition-transform"
            style={{ background: "var(--surna-elevated)", border: "1px solid var(--surna-border)" }}
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-[16px] font-semibold truncate">{listTitle}</h1>
        </div>
      </header>

      <EntitySectionTabs
        tabs={peopleTabs}
        activeId={tab}
        onChange={(id) => setTabAndUrl(id as PeopleTab)}
        stickyTop="top-[52px]"
        testIdPrefix="people-section"
      />

      {tab === "discover" ? (
        <div className="px-4 pb-3">
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: "var(--surna-bg-highlight)", border: "1px solid var(--surna-border)" }}
          >
            <Search className="w-4 h-4 shrink-0" style={{ color: "var(--surna-text-secondary)" }} />
            <input
              type="search"
              placeholder="Search athletes by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-[14px]"
              style={{ color: "var(--surna-text)" }}
            />
            {searchQuery ? (
              <button type="button" onClick={() => setSearchQuery("")} className="p-1 active:opacity-70" aria-label="Clear search">
                <X className="w-4 h-4" style={{ color: "var(--surna-text-secondary)" }} />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="px-4">
        {listLoading ? (
          <div className="py-4">
            <EntityListSkeleton rows={8} rowHeight={72} />
          </div>
        ) : listPeople.length === 0 ? (
          <div className="py-4">
            {tab === "followers" ? (
              <EntityEmptyState
                icon={Users}
                title="No followers yet"
                description={isOwnLists ? "When people follow you, they'll show up here." : "This athlete doesn't have followers yet."}
                actionLabel="Find people to follow"
                onAction={() => setTabAndUrl("discover")}
              />
            ) : null}
            {tab === "following" ? (
              <EntityEmptyState
                icon={UserPlus}
                title={isOwnLists ? "Not following anyone yet" : "Not following anyone"}
                description="Discover athletes in your sports and build your feed."
                actionLabel="Discover people"
                onAction={() => setTabAndUrl("discover")}
              />
            ) : null}
            {tab === "discover" ? (
              <EntityEmptyState
                icon={Search}
                title={searchQuery.trim().length >= 2 ? "No one matched your search" : "No suggestions right now"}
                description={
                  searchQuery.trim().length >= 2
                    ? "Try a different name or spelling."
                    : "Check back later or search by name above."
                }
                actionLabel={searchQuery.trim().length >= 2 ? "Clear search" : undefined}
                onAction={searchQuery.trim().length >= 2 ? () => setSearchQuery("") : undefined}
              />
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
