import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { markNavReturn } from "@/lib/navigation";
import { getQueryFn } from "@/lib/queryClient";
import { fetchCoaches } from "@/lib/coachesApi";
import { mergeWithDemoEvents } from "@/lib/demoEvents";
import { mergeWithDemoTeams } from "@/lib/demoTeams";
import { ROUTES } from "@/navigation";
import { formatEventWhenShort, getEventCoverUrl } from "@/lib/eventCover";
import {
  HOME_QUERY_KEYS,
  HOME_STALE_TIME_MS,
  computeHomeNewIndicators,
  countActiveInstantGames,
  type HomeNewIndicators,
} from "@/features/home/homeFeedDynamics";
import { HOME_TEXT_SUBTITLE } from "@/features/home/homeCardColors";
import {
  HomeCoachCircleCard,
  HomePortraitCard,
} from "@/features/home/components/HomeCardSurface";
import { HomeFeedPostsSection } from "@/features/home/components/HomeFeedPostsSection";
import type { CoachWithProfile } from "@shared/schema";

const PURPLE_NEW = "#803FE1";
const HOME_ROW_MAX = 2;

function takeHomeRows<T>(items: T[]): T[] {
  return (Array.isArray(items) ? items : []).slice(0, HOME_ROW_MAX);
}

function sortByDesc<T>(items: T[], score: (item: T) => number): T[] {
  return [...items].sort((a, b) => score(b) - score(a));
}

const homeQueryOptions = {
  staleTime: HOME_STALE_TIME_MS,
  refetchOnWindowFocus: true as const,
};

function interFont(style?: CSSProperties): CSSProperties {
  return { fontFamily: "Inter, sans-serif", ...style };
}

function ts(item: { updatedAt?: string; createdAt?: string; starts_at?: string; startTime?: string }) {
  const raw =
    item.updatedAt ||
    item.createdAt ||
    item.starts_at ||
    item.startTime ||
    "";
  const n = Date.parse(raw);
  return Number.isFinite(n) ? n : 0;
}

function SectionTitle({ children, showNew }: { children: ReactNode; showNew?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <h2
        className="text-base font-bold text-left leading-tight"
        style={interFont({ color: "var(--surna-text)" })}
      >
        {children}
      </h2>
      {showNew && (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: PURPLE_NEW }}
          aria-label="New since your last visit"
        />
      )}
    </div>
  );
}

function LiveInstantCounter({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <p className="text-[13px]" style={interFont({ fontWeight: 400, color: HOME_TEXT_SUBTITLE })}>
        {count} game{count === 1 ? "" : "s"} near you now
      </p>
    </div>
  );
}

function useHomeData() {
  const eventsQuery = useQuery<any>({
    queryKey: [...HOME_QUERY_KEYS.events],
    queryFn: getQueryFn({ on401: "returnNull" }),
    ...homeQueryOptions,
  });
  const teamsQuery = useQuery<any[]>({
    queryKey: [...HOME_QUERY_KEYS.teams],
    queryFn: getQueryFn({ on401: "returnNull" }),
    ...homeQueryOptions,
  });
  const instantQuery = useQuery<any[]>({
    queryKey: [...HOME_QUERY_KEYS.instant],
    queryFn: async () => {
      const res = await fetch("/api/instant-teams", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    ...homeQueryOptions,
    refetchInterval: 30_000,
  });
  const coachesQuery = useQuery({
    queryKey: [...HOME_QUERY_KEYS.coaches],
    queryFn: () => fetchCoaches({ limit: HOME_ROW_MAX }),
    ...homeQueryOptions,
  });

  const events = useMemo(() => {
    const api = Array.isArray(eventsQuery.data) ? eventsQuery.data : eventsQuery.data?.items || [];
    return takeHomeRows(mergeWithDemoEvents(api, { skipDemo: false, fallback: true }));
  }, [eventsQuery.data]);
  const teams = useMemo(
    () => takeHomeRows(mergeWithDemoTeams(teamsQuery.data || [], { skipDemo: false, fallback: true })),
    [teamsQuery.data],
  );
  const instantGames = useMemo(() => takeHomeRows(instantQuery.data || []), [instantQuery.data]);
  const coaches = takeHomeRows(coachesQuery.data || []);

  const loading =
    eventsQuery.isLoading ||
    teamsQuery.isLoading ||
    instantQuery.isLoading ||
    coachesQuery.isLoading;

  return { events, teams, instantGames, coaches, loading };
}

export { useHomeData };

function HappeningNearYouRow({
  events,
  instantGames,
  loading,
  showNew,
}: {
  events: any[];
  instantGames: any[];
  loading: boolean;
  showNew?: boolean;
}) {
  const [, setLocation] = useLocation();
  const [liveCount, setLiveCount] = useState(() => countActiveInstantGames(instantGames));

  useEffect(() => {
    setLiveCount(countActiveInstantGames(instantGames));
    const id = window.setInterval(() => setLiveCount(countActiveInstantGames(instantGames)), 30_000);
    return () => window.clearInterval(id);
  }, [instantGames]);

  const items = useMemo(() => {
    const merged = [
      ...events.map((ev) => ({
        id: `ev-${ev.id}`,
        sortScore: (ev.going_count || ev.goingCount || 0) * 2 + ts(ev),
        title: ev.title,
        subtitle: ev.location || "Near you",
        meta: [formatEventWhenShort(ev.starts_at || ev.startDate), ev.sport].filter(Boolean).join(" · "),
        imageUrl: getEventCoverUrl(ev),
        route: `/events/${ev.id}`,
        sport: ev.sport as string | undefined,
        cardKind: "event" as const,
        attendeeEntity: {
          type: "event" as const,
          id: String(ev.id),
          count: ev.going_count || ev.goingCount,
        },
      })),
      ...instantGames.map((g) => ({
        id: `in-${g.id}`,
        sortScore: (g.playersJoined || 1) * 3 + ts(g),
        title: g.name,
        subtitle: g.locationName || "Near you",
        meta: [g.sport, formatEventWhenShort(g.startTime)].filter(Boolean).join(" · "),
        imageUrl: getEventCoverUrl({ sport: g.sport, title: g.name }),
        route: ROUTES.instantTeam(String(g.id)),
        sport: g.sport as string | undefined,
        cardKind: "instantJoin" as const,
        attendeeEntity: {
          type: "instant" as const,
          id: String(g.id),
          count: g.playersJoined,
        },
      })),
    ];
    return sortByDesc(merged, (item) => item.sortScore).slice(0, HOME_ROW_MAX);
  }, [events, instantGames]);

  if (loading) {
    return (
      <section className="space-y-3">
        <SectionTitle showNew={showNew}>Happening near you</SectionTitle>
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-[142px] h-[190px] rounded-xl animate-pulse shrink-0" style={{ background: "var(--surna-surface)" }} />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionTitle showNew={showNew}>Happening near you</SectionTitle>
      <LiveInstantCounter count={liveCount} />
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-0.5">
        {items.map((item) => (
          <HomePortraitCard
            key={item.id}
            imageUrl={item.imageUrl}
            title={item.title}
            subtitle={item.subtitle}
            meta={item.meta}
            sport={item.sport}
            cardKind={item.cardKind}
            cta={item.cardKind === "instantJoin" ? "Join" : "Go"}
            attendeeEntity={item.attendeeEntity}
            onClick={() => {
              markNavReturn("/");
              setLocation(item.route);
            }}
          />
        ))}
      </div>
    </section>
  );
}

function TeamsNearYouRow({
  teams,
  loading,
}: {
  teams: any[];
  loading: boolean;
}) {
  const [, setLocation] = useLocation();

  const items = useMemo(() => {
    return sortByDesc(teams, (team) =>
      Number(team.followersCount || team.currentMembers || team.memberCount || 0),
    )
      .slice(0, HOME_ROW_MAX)
      .map((team) => ({
        id: String(team.id),
        title: team.name,
        subtitle: team.city || team.location || "Near you",
        meta: [
          team.sport,
          team.currentMembers != null ? `${team.currentMembers} members` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        imageUrl:
          team.cover ||
          team.logo ||
          team.logoUrl ||
          getEventCoverUrl({ sport: team.sport, title: team.name }),
        sport: team.sport as string | undefined,
        route: `/teams/${team.id}`,
        attendeeEntity: {
          type: "team" as const,
          id: String(team.id),
          count: team.currentMembers || team.memberCount,
        },
      }));
  }, [teams]);

  if (loading) {
    return (
      <section className="space-y-3">
        <SectionTitle>Teams near you</SectionTitle>
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-[142px] h-[190px] rounded-xl animate-pulse shrink-0" style={{ background: "var(--surna-surface)" }} />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionTitle>Teams near you</SectionTitle>
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-0.5">
        {items.map((item) => (
          <HomePortraitCard
            key={item.id}
            imageUrl={item.imageUrl}
            title={item.title}
            subtitle={item.subtitle}
            meta={item.meta}
            sport={item.sport}
            cardKind="team"
            cta="View"
            attendeeEntity={item.attendeeEntity}
            onClick={() => {
              markNavReturn("/");
              setLocation(item.route);
            }}
          />
        ))}
      </div>
    </section>
  );
}

function CoachesRow({
  coaches,
  loading,
}: {
  coaches: CoachWithProfile[];
  loading: boolean;
}) {
  const [, setLocation] = useLocation();
  const list = useMemo(
    () => sortByDesc(coaches, (coach) => Number(coach.profile?.rating ?? 0)).slice(0, HOME_ROW_MAX),
    [coaches],
  );

  if (loading) {
    return (
      <section className="space-y-3">
        <SectionTitle>Coaches near you</SectionTitle>
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-[120px] h-[120px] rounded-full animate-pulse shrink-0" style={{ background: "var(--surna-surface)" }} />
          ))}
        </div>
      </section>
    );
  }
  if (!list.length) return null;

  return (
    <section className="space-y-3">
      <SectionTitle>Coaches near you</SectionTitle>
      <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-5 py-4">
        {list.map((coach) => {
          const photo = coach.profile?.coverImageUrl || coach.user.profileImageUrl;
          const initials = `${coach.user.firstName?.[0] ?? ""}${coach.user.lastName?.[0] ?? ""}`;
          const name = coach.user.firstName
            ? `${coach.user.firstName}${coach.user.lastName ? ` ${coach.user.lastName[0]}.` : ""}`
            : "Coach";
          const sportLabel = coach.specialties?.[0] || "Coach";
          return (
            <HomeCoachCircleCard
              key={coach.id}
              photo={photo}
              initials={initials || "C"}
              name={name}
              sport={sportLabel}
              glow
              onClick={() => {
                markNavReturn("/");
                setLocation(ROUTES.coach(coach.id));
              }}
            />
          );
        })}
      </div>
    </section>
  );
}

/** Fixed home layout — one carousel row per section, no duplicate hero cards. */
export function SpotifyHomeFeed({
  contentSeed,
  lastVisitAt,
}: {
  contentSeed: number;
  lastVisitAt: number;
}) {
  const { events, teams, instantGames, coaches, loading } = useHomeData();

  const newIndicators: HomeNewIndicators = useMemo(
    () => computeHomeNewIndicators(lastVisitAt, { events, instantGames, teams }),
    [lastVisitAt, events, instantGames, teams],
  );

  const hasHappening = events.length > 0 || instantGames.length > 0;

  return (
    <div className="space-y-5">
      {hasHappening ? (
        <HappeningNearYouRow
          events={events}
          instantGames={instantGames}
          loading={loading}
          showNew={newIndicators.happeningNearYou}
        />
      ) : null}
      {teams.length > 0 ? <TeamsNearYouRow teams={teams} loading={loading} /> : null}
      <HomeFeedPostsSection contentSeed={contentSeed} />
      {coaches.length > 0 ? <CoachesRow coaches={coaches} loading={loading} /> : null}
    </div>
  );
}
