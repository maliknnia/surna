import { useState, useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { useLocation } from "wouter";
import { Plus } from "lucide-react";
import { FeatureFilterChips } from "@/components/panels/FeatureFilterBar";
import {
  PanelFilterSheet,
  PanelHeaderToolButtons,
  panelToolsStyle,
  usePanelToolToggles,
  usePanelToolsLifecycle,
} from "@/components/panels/PanelSideTools";
import { PanelBackButton } from "@/components/panels/PanelBackButton";
import { markNavReturn, mobilePanelReturnPath, useSmartBack } from "@/lib/navigation";
import { getPanelTheme } from "@/lib/panelTheme";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/contexts/ThemeContext";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { createHubPath } from "@/lib/createHub";
import TeamCard from "@/components/TeamCard";
import { YourTeamsStrip } from "@/components/teams/YourTeamsStrip";
import { joinTeamUnified } from "@/lib/teamJoin";
import DiscoveryCircleStrip from "@/components/cards/DiscoveryCircleStrip";
import { DiscoverySectionHeading, DISCOVERY_SECTION_LABELS } from "@/components/cards/DiscoverySectionHeading";
import { teamLogoUrl } from "@/lib/teamLogo";
import { getSportConfig } from "@/components/TeamCard";
import type { Team } from "@shared/schema";
import { mergeWithDemoTeams } from "@/lib/demoTeams";

const SPORT_CHIPS = [
  { key: "All", emoji: "🏆" },
  { key: "Basketball", emoji: "🏀" },
  { key: "Soccer", emoji: "⚽" },
  { key: "Football", emoji: "🏈" },
  { key: "Rugby", emoji: "🏉" },
  { key: "Cricket", emoji: "🏏" },
  { key: "GAA", emoji: "🏐" },
  { key: "Hurling", emoji: "🥎" },
  { key: "Tennis", emoji: "🎾" },
  { key: "Baseball", emoji: "⚾" },
  { key: "Swimming", emoji: "🏊" },
  { key: "Running", emoji: "🏃" },
  { key: "MMA", emoji: "🥋" },
  { key: "Boxing", emoji: "🥊" },
  { key: "CrossFit", emoji: "🏋️" },
  { key: "Yoga", emoji: "🧘" },
  { key: "Cycling", emoji: "🚴" },
];

export default function Teams({
  embedded = false,
  onPanelBack,
  panelActive = true,
}: {
  embedded?: boolean;
  onPanelBack?: () => void;
  panelActive?: boolean;
}) {
  const [sportFilter, setSportFilter] = useState("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [, setLocation] = useLocation();
  const goBack = useSmartBack({
    onPanelBack: embedded ? onPanelBack : undefined,
    fallback: "/",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const teamIdForPostRef = useRef<string | null>(null);

  const {
    items: teams,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    refetch
  } = usePaginatedQuery<Team>({
    queryKey: ['/api/teams', sportFilter],
    queryFn: async (cursor) => {
      const offset = cursor ? parseInt(cursor, 10) : 0;
      const limit = 20;
      const sport =
        sportFilter !== "All"
          ? `&sport=${encodeURIComponent(sportFilter)}`
          : "";
      const response = await fetch(
        `/api/teams?limit=${limit}&offset=${offset}${sport}`,
        { credentials: 'include' },
      );
      if (!response.ok) throw new Error('Failed to fetch teams');
      const data = await response.json();
      const page = Array.isArray(data) ? data : (data.items || []);
      const hasMore = page.length >= limit;
      return {
        data: page,
        hasNextPage: hasMore,
        nextCursor: hasMore ? String(offset + limit) : undefined,
      };
    }
  });

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.5,
    rootMargin: '50px'
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      loadMore();
    }
  }, [inView, hasNextPage, isFetchingNextPage, loadMore]);

  const joinTeamMutation = useMutation({
    mutationFn: async (teamId: string) => joinTeamUnified(teamId),
    onMutate: async (teamId: string) => {
      await queryClient.cancelQueries({ queryKey: ["/api/teams"] });
      return { teamId };
    },
    onSuccess: (result, teamId) => {
      if (result.status === "joined") {
        queryClient.setQueryData(["/api/teams"], (old: any) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: page.data.map((team: any) =>
                team.id === teamId
                  ? { ...team, currentMembers: (team.currentMembers || 0) + 1, hasJoined: true }
                  : team,
              ),
            })),
          };
        });
      }
      if (navigator.vibrate) navigator.vibrate(10);
      if (result.status === "pending") {
        toast({ title: "Request sent", description: "The captain will review your join request." });
        queryClient.invalidateQueries({ queryKey: ["/api/teams/my-teams"] });
        return;
      }
      localStorage.setItem("surna_meaningful_action_done", "1");
      try {
        const joinedTeam = (teams || []).find((t: any) => t.id === teamIdForPostRef.current);
        if (joinedTeam) {
          apiRequest("POST", "/api/posts", {
            content: `Joined team ${joinedTeam.name}${joinedTeam.sport ? ` (${joinedTeam.sport})` : ""}.`,
            teamId: joinedTeam.id,
            sport: joinedTeam.sport,
          }).catch(() => {});
        }
      } catch {}
      toast({ title: "Joined Team!", description: "You've successfully joined the team." });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my-teams"] });
    },
    onError: (error) => {
      toast({
        title: "Couldn't join team",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
  });

  const handleJoinTeam = (teamId: string) => {
    teamIdForPostRef.current = teamId;
    joinTeamMutation.mutate(teamId);
  };

  const handleRefresh = async () => {
    await refetch();
  };
  const { isRefreshing, pullDistance, touchHandlers } = usePullToRefresh(handleRefresh);

  const t = getPanelTheme();
  const pageBg = t.pageBg;
  const headerBg = t.headerBg;
  const textPrimary = t.textPrimary;
  const textSecondary = t.textSecondary;
  const inputBg = t.inputBg;
  const borderColor = t.border;
  const chipActiveBg = t.chipActiveBg;
  const chipActiveText = t.chipActiveText;
  const chipBg = t.chipBg;
  const chipText = t.chipText;

  const mergedTeams = mergeWithDemoTeams(teams || [], {
    mixDemos: true,
    sport: sportFilter !== "All" ? sportFilter : undefined,
  });

  const filteredTeams = mergedTeams.filter((team: any) => {
    return sportFilter === "All" || (team.sport && team.sport.toLowerCase().includes(sportFilter.toLowerCase()));
  });

  const teamCircleItems = filteredTeams
    .slice()
    .sort((a, b) => {
      const aLogo = !!teamLogoUrl(a);
      const bLogo = !!teamLogoUrl(b);
      if (aLogo !== bLogo) return aLogo ? -1 : 1;
      return (b.currentMembers || 0) - (a.currentMembers || 0);
    })
    .slice(0, 18)
    .map((team) => ({
      id: team.id,
      name: team.name,
      imageUrl: teamLogoUrl(team),
      emoji: getSportConfig(team.sport).emoji,
      sport: team.sport,
      verified: team.verified ?? false,
    }));

  const teamSportChips = SPORT_CHIPS.map((c) => ({
    key: c.key,
    label: c.key,
    emoji: c.emoji,
  }));

  const toolsStyle = panelToolsStyle(isDark);
  const { onToggleFilter } = usePanelToolToggles(
    () => {},
    setFilterOpen,
    false,
    filterOpen,
  );
  usePanelToolsLifecycle(panelActive, () => {}, setFilterOpen);
  const hasActiveFilter = sportFilter !== "All";

  return (
    <div className={embedded ? "min-h-full pb-4" : "min-h-screen pb-24"} style={{ background: pageBg, color: textPrimary }} {...touchHandlers}>
      {panelActive && (
        <PanelFilterSheet
          style={toolsStyle}
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          title="Sport"
        >
          <FeatureFilterChips
            isDark={isDark}
            chips={teamSportChips}
            chipValue={sportFilter}
            onChipChange={setSportFilter}
          />
        </PanelFilterSheet>
      )}
      {pullDistance > 0 && (
        <div className="flex justify-center pt-2">
          <span className="text-xs" style={{ color: textSecondary }}>{isRefreshing ? "Refreshing..." : "Pull to refresh"}</span>
        </div>
      )}
      <div
        className={embedded ? undefined : "sticky top-0 z-50 backdrop-blur-xl"}
        style={
          embedded
            ? { background: pageBg }
            : { background: headerBg, borderBottom: `1px solid ${borderColor}` }
        }
      >
        <div className={embedded ? "px-4 pt-1 pb-1" : "px-4 pt-3 pb-3"}>
          <div className={`flex items-center gap-3 ${embedded ? "justify-end" : ""}`}>
            {!embedded ? (
              <PanelBackButton onClick={goBack} background={inputBg} color={textPrimary} />
            ) : null}
            {!embedded ? (
              <h1 className="text-[18px] font-bold flex-1" style={{ color: textPrimary }}>Teams</h1>
            ) : null}
            <button
              onClick={() => setLocation(createHubPath("team"))}
              className="h-8 px-4 rounded-full text-[12px] font-semibold flex items-center gap-1.5 active:scale-[0.96] transition-transform"
              style={{ background: chipActiveBg, color: chipActiveText }}
            >
              <Plus size={14} />
              Create
            </button>
            {panelActive && (
              <PanelHeaderToolButtons
                style={toolsStyle}
                searchOpen={false}
                filterOpen={filterOpen}
                filterActive={hasActiveFilter}
                showSearch={false}
                onToggleSearch={() => {}}
                onToggleFilter={onToggleFilter}
              />
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-3">
        <YourTeamsStrip
          onTeamClick={(teamId) => {
            markNavReturn(embedded ? mobilePanelReturnPath("teams") : "/teams");
            setLocation(`/teams/${teamId}`);
          }}
        />
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-[28px] animate-pulse" style={{ background: chipBg, height: '148px' }} />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-16 px-6">
            <p className="text-[15px] font-semibold mb-2" style={{ color: textPrimary }}>Couldn&apos;t load teams</p>
            <p className="text-[13px] mb-4" style={{ color: textSecondary }}>Check your connection and try again.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="px-6 py-2.5 rounded-full text-[13px] font-bold"
              style={{ background: chipActiveBg, color: chipActiveText }}
            >
              Retry
            </button>
          </div>
        ) : filteredTeams.length > 0 ? (
          <>
            {(() => {
              const labels = DISCOVERY_SECTION_LABELS.teams;
              const elements: React.ReactNode[] = [];
              let labelIdx = 0;
              let circlesInserted = false;
              filteredTeams.forEach((team, i) => {
                if (i === 0 || (i > 0 && i % 3 === 0 && labelIdx < labels.length)) {
                  elements.push(
                    <DiscoverySectionHeading key={`label-${labelIdx}`}>
                      {labels[labelIdx] || labels[labels.length - 1]}
                    </DiscoverySectionHeading>
                  );
                  labelIdx++;
                }
                elements.push(
                  <TeamCard
                    key={team.id}
                    team={team}
                    onViewDetails={(teamId) => {
                      markNavReturn(embedded ? mobilePanelReturnPath("teams") : "/teams");
                      setLocation(`/teams/${teamId}`);
                    }}
                    onJoinTeam={handleJoinTeam}
                  />
                );
                if (i === 1 && !circlesInserted) {
                  elements.push(
                    <DiscoveryCircleStrip
                      key="teams-circles"
                      items={teamCircleItems}
                      onItemClick={(teamId) => {
                        markNavReturn(embedded ? mobilePanelReturnPath("teams") : "/teams");
                        setLocation(`/teams/${teamId}`);
                      }}
                      onCreate={() => setLocation(createHubPath("team"))}
                    />
                  );
                  circlesInserted = true;
                }
              });
              return <div className="discovery-card-list">{elements}</div>;
            })()}

            {hasNextPage && (
              <div ref={loadMoreRef} className="flex justify-center py-4">
                <span className="text-[12px]" style={{ color: textSecondary }}>
                  {isFetchingNextPage ? "Loading more teams..." : "Scroll for more"}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🏆</div>
            <h3 className="text-[15px] font-semibold mb-1" style={{ color: textPrimary }}>
              {(teams?.length ?? 0) > 0 ? "No teams match your filters" : "No teams found"}
            </h3>
            <p className="text-[13px] mb-6" style={{ color: textSecondary }}>
              {(teams?.length ?? 0) > 0
                ? "Try a different sport filter."
                : sportFilter !== "All"
                  ? `No ${sportFilter} teams yet. Be the first!`
                  : "Be the first to create a team and build your sports community!"}
            </p>
            {(teams?.length ?? 0) > 0 ? (
              <button
                type="button"
                onClick={() => setSportFilter("All")}
                className="px-6 py-2.5 rounded-full text-[13px] font-bold active:scale-95 transition-all"
                style={{ background: chipBg, color: chipText, border: `1px solid ${borderColor}` }}
              >
                Clear filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setLocation(createHubPath("team"))}
                className="px-6 py-2.5 rounded-full text-[13px] font-bold active:scale-95 transition-all"
                style={{ background: chipActiveBg, color: chipActiveText }}
              >
                Create First Team
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
