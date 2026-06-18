import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Swords, Users, Zap } from "lucide-react";
import { ROUTES } from "@/navigation";
import { markNavReturn } from "@/lib/navigation";
import { getQueryFn } from "@/lib/queryClient";
import { fetchCoaches } from "@/lib/coachesApi";
import { fetchChallengesList } from "@/lib/challengesApi";
import { mergeWithDemoChallenges } from "@/lib/demoChallenges";
import { mergeWithDemoTeams } from "@/lib/demoTeams";
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
  HomeCompactRow,
  HomeFeaturedCard,
  HomePortraitCard,
} from "@/features/home/components/HomeCardSurface";
import { HomeFeedPostsSection } from "@/features/home/components/HomeFeedPostsSection";
import { GlowCard } from "@/components/ui/GlowCard";
import type { CoachWithProfile } from "@shared/schema";

const PURPLE_NEW = "#803FE1";
const HAPPENING_ROW_MAX = 4;
const COACHES_MAX = 8;

const DEMO_MARKETPLACE_PRODUCTS = [
  {
    id: "demo-boots",
    title: "Pro Strike Boots",
    meta: "€89.99 · Football",
    sport: "Football",
  },
  {
    id: "demo-sliotar",
    title: "GAA Sliotar Pack",
    meta: "€24.50 · GAA",
    sport: "GAA",
  },
  {
    id: "demo-helmet",
    title: "Carbon Road Helmet",
    meta: "€129.00 · Cycling",
    sport: "Cycling",
  },
  {
    id: "demo-rugby-ball",
    title: "Match Rugby Ball",
    meta: "€34.99 · Rugby",
    sport: "Rugby",
  },
  {
    id: "demo-hoops",
    title: "Elite Indoor Ball",
    meta: "€54.00 · Basketball",
    sport: "Basketball",
  },
] as const;

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  let s = seed >>> 0;
  const rng = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0xffffffff;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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
    queryFn: () => fetchCoaches({ limit: 16 }),
    ...homeQueryOptions,
  });
  const challengesQuery = useQuery({
    queryKey: [...HOME_QUERY_KEYS.challenges],
    queryFn: async () => {
      try {
        return await fetchChallengesList({ status: "pending", limit: 12 });
      } catch {
        return { matches: [] as any[] };
      }
    },
    ...homeQueryOptions,
  });

  const events = useMemo(
    () => (Array.isArray(eventsQuery.data) ? eventsQuery.data : eventsQuery.data?.items || []),
    [eventsQuery.data],
  );
  const teams = useMemo(
    () => mergeWithDemoTeams(teamsQuery.data || [], { mixDemos: true }),
    [teamsQuery.data],
  );
  const instantGames = instantQuery.data || [];
  const coaches = coachesQuery.data || [];
  const challenges = useMemo(
    () => mergeWithDemoChallenges(challengesQuery.data?.matches || [], { mixDemos: true }),
    [challengesQuery.data],
  );

  const loading =
    eventsQuery.isLoading ||
    teamsQuery.isLoading ||
    instantQuery.isLoading ||
    coachesQuery.isLoading ||
    challengesQuery.isLoading;

  return { events, teams, instantGames, coaches, challenges, loading };
}

export { useHomeData };

type MixedPick =
  | {
      kind: "hero";
      id: string;
      title: string;
      subtitle?: string;
      meta?: string;
      sport?: string;
      cardKind: "event" | "team" | "challenge" | "instantJoin";
      route: string;
      imageUrl?: string | null;
      cta?: string;
      captionBelow?: string;
      attendeeEntity?: { type: "event" | "team" | "challenge" | "instant"; id: string; count?: number };
    }
  | {
      kind: "compact";
      id: string;
      title: string;
      subtitle?: string;
      captionBelow?: string;
      cta?: string;
      route: string;
      icon: "team" | "event" | "challenge" | "instant";
      imageUrl?: string | null;
      sport?: string;
      cardKind?: "event" | "team" | "challenge" | "instantJoin";
      attendeeEntity?: { type: "event" | "team" | "challenge" | "instant"; id: string; count?: number };
    };

function HappeningNearYouRow({
  events,
  instantGames,
  loading,
  contentSeed,
  showNew,
}: {
  events: any[];
  instantGames: any[];
  loading: boolean;
  contentSeed: number;
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
        title: g.name,
        subtitle: g.locationName || "Near you",
        meta: [g.sport, formatEventWhenShort(g.startTime)].filter(Boolean).join(" · "),
        imageUrl: getEventCoverUrl({ sport: g.sport, title: g.name }),
        route: ROUTES.instantJoin,
        sport: g.sport as string | undefined,
        cardKind: "instantJoin" as const,
        attendeeEntity: {
          type: "instant" as const,
          id: String(g.id),
          count: g.playersJoined,
        },
      })),
    ];
    return shuffleWithSeed(merged, contentSeed + 21).slice(0, HAPPENING_ROW_MAX);
  }, [events, instantGames, contentSeed]);

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

function HomeMixedStack({
  events,
  teams,
  challenges,
  instantGames,
  contentSeed,
  loading,
}: {
  events: any[];
  teams: any[];
  challenges: any[];
  instantGames: any[];
  contentSeed: number;
  loading: boolean;
}) {
  const [, setLocation] = useLocation();

  const picks = useMemo((): MixedPick[] => {
    const rows: MixedPick[] = [];

    const recruiting = teams
      .map((team) => {
        const memberCount = team.memberCount || team.members?.length || 0;
        const max = team.maxMembers || 15;
        const spotsLeft = Math.max(0, max - memberCount);
        return { team, spotsLeft, memberCount };
      })
      .filter(({ spotsLeft }) => spotsLeft > 0);

    for (const ch of challenges.slice(0, 2)) {
      rows.push({
        kind: "hero",
        id: `ch-${ch.id}`,
        title: ch.title,
        subtitle: ch.sport || "Challenge",
        meta: ch.type || "Open match",
        sport: ch.sport,
        cardKind: "challenge",
        route: ROUTES.challenges,
        imageUrl: getEventCoverUrl({ sport: ch.sport, title: ch.title }),
        cta: "Join",
        captionBelow: ch.sport ? `${ch.sport} · open now` : undefined,
        attendeeEntity: { type: "challenge", id: String(ch.id), count: ch.participantCount },
      });
    }

    for (const { team, spotsLeft, memberCount } of recruiting.slice(0, 2)) {
      rows.push({
        kind: "compact",
        id: `team-${team.id}`,
        title: `${team.name} — ${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} open`,
        subtitle: team.sport || "Recruiting players",
        captionBelow: `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left · ${team.sport || "Team"}`,
        cta: "Join",
        route: `/teams/${team.id}`,
        icon: "team",
        cardKind: "team",
        imageUrl: team.cover || team.logo || team.logoUrl || getEventCoverUrl({ sport: team.sport, title: team.name }),
        sport: team.sport,
        attendeeEntity: { type: "team", id: String(team.id), count: memberCount },
      });
      if (memberCount > 0) {
        rows.push({
          kind: "hero",
          id: `team-hero-${team.id}`,
          title: team.name,
          subtitle: `${spotsLeft} spots open`,
          meta: team.sport || "Team",
          sport: team.sport,
          cardKind: "team",
          route: `/teams/${team.id}`,
          imageUrl: team.cover || team.logo || team.logoUrl || getEventCoverUrl({ sport: team.sport, title: team.name }),
          cta: undefined,
          attendeeEntity: { type: "team", id: String(team.id), count: memberCount },
        });
      }
    }

    for (const ev of events.slice(0, 2)) {
      rows.push({
        kind: "compact",
        id: `ev-c-${ev.id}`,
        title: ev.title,
        subtitle: [ev.location, formatEventWhenShort(ev.starts_at || ev.startDate), ev.sport].filter(Boolean).join(" · "),
        cta: "Go",
        route: `/events/${ev.id}`,
        icon: "event",
        cardKind: "event",
        imageUrl: getEventCoverUrl(ev),
        sport: ev.sport,
        attendeeEntity: {
          type: "event",
          id: String(ev.id),
          count: ev.going_count || ev.goingCount,
        },
      });
    }

    if (instantGames[0]) {
      const g = instantGames[0];
      rows.push({
        kind: "compact",
        id: `in-c-${g.id}`,
        title: g.name,
        subtitle: [g.locationName, g.sport].filter(Boolean).join(" · "),
        cta: "Join",
        route: ROUTES.instantJoin,
        icon: "instant",
        cardKind: "instantJoin",
        imageUrl: getEventCoverUrl({ sport: g.sport, title: g.name }),
        sport: g.sport,
        attendeeEntity: { type: "instant", id: String(g.id), count: g.playersJoined },
      });
    }

    return shuffleWithSeed(rows, contentSeed + 61).slice(0, 5);
  }, [events, teams, challenges, instantGames, contentSeed]);

  if (loading) {
    return (
      <section className="space-y-3">
        <SectionTitle>More for you</SectionTitle>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--surna-surface)" }} />
          ))}
        </div>
      </section>
    );
  }
  if (!picks.length) return null;

  const iconFor = (kind: "team" | "event" | "challenge" | "instant") => {
    switch (kind) {
      case "team":
        return <Users size={18} />;
      case "challenge":
        return <Swords size={18} />;
      case "instant":
        return <Zap size={18} />;
      default:
        return <Calendar size={18} />;
    }
  };

  return (
    <section className="space-y-3">
      <SectionTitle>More for you</SectionTitle>
      <div className="space-y-3">
        {picks.map((pick) => {
          if (pick.kind === "hero") {
            return (
              <HomeFeaturedCard
                key={pick.id}
                imageUrl={pick.imageUrl}
                title={pick.title}
                subtitle={pick.subtitle}
                meta={pick.meta}
                sport={pick.sport}
                cardKind={pick.cardKind}
                cta={pick.cta}
                captionBelow={
                  pick.captionBelow && pick.captionBelow !== pick.meta ? pick.captionBelow : undefined
                }
                attendeeEntity={pick.attendeeEntity}
                onClick={() => {
                  markNavReturn("/");
                  setLocation(pick.route);
                }}
              />
            );
          }
          return (
            <HomeCompactRow
              key={pick.id}
              title={pick.title}
              subtitle={pick.subtitle}
              captionBelow={pick.captionBelow}
              cta={pick.cta}
              icon={iconFor(pick.icon)}
              imageUrl={pick.imageUrl}
              sport={pick.sport}
              cardKind={pick.cardKind}
              attendeeEntity={pick.attendeeEntity}
              onClick={() => {
                markNavReturn("/");
                setLocation(pick.route);
              }}
            />
          );
        })}
      </div>
    </section>
  );
}

function CoachesRow({
  coaches,
  loading,
  contentSeed,
}: {
  coaches: CoachWithProfile[];
  loading: boolean;
  contentSeed: number;
}) {
  const [, setLocation] = useLocation();
  const list = useMemo(() => shuffleWithSeed(coaches, contentSeed + 41).slice(0, COACHES_MAX), [coaches, contentSeed]);

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

function MarketplacePicksRow() {
  const [, setLocation] = useLocation();

  return (
    <section className="space-y-3">
      <SectionTitle>Marketplace picks</SectionTitle>
      <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-5 py-3">
        {DEMO_MARKETPLACE_PRODUCTS.map((product) => (
          <GlowCard
            key={product.id}
            glowColor="purple"
            intensity="subtle"
            bare
            customSize
            className="p-[3px]"
          >
            <HomePortraitCard
              imageUrl={getEventCoverUrl({ sport: product.sport, title: product.title })}
              title={product.title}
              meta={product.meta}
              sport={product.sport}
              cardKind="marketplace"
              cta="Shop"
              onClick={() => {
                markNavReturn("/");
                setLocation(ROUTES.marketplace);
              }}
            />
          </GlowCard>
        ))}
      </div>
    </section>
  );
}

function FeaturedHero({
  events,
  instantGames,
  loading,
  contentSeed,
}: {
  events: any[];
  instantGames: any[];
  loading: boolean;
  contentSeed: number;
}) {
  const [, setLocation] = useLocation();

  const featured = useMemo(() => {
    const eventRows = events.map((ev) => ({
      score: (ev.going_count || ev.goingCount || 0) * 2 + ts(ev) / 1e12,
      title: ev.title,
      subtitle: ev.location || "Near you",
      meta: [formatEventWhenShort(ev.starts_at || ev.startDate), ev.sport].filter(Boolean).join(" · "),
      imageUrl: getEventCoverUrl(ev),
      sport: ev.sport,
      cardKind: "event" as const,
      route: `/events/${ev.id}`,
      attendeeEntity: { type: "event" as const, id: String(ev.id), count: ev.going_count || ev.goingCount },
    }));
    const instantRows = instantGames.map((g) => ({
      score: (g.playersJoined || 1) * 3 + ts(g) / 1e12,
      title: g.name,
      subtitle: g.locationName || "Near you",
      meta: [g.sport, formatEventWhenShort(g.startTime)].filter(Boolean).join(" · "),
      imageUrl: getEventCoverUrl({ sport: g.sport, title: g.name }),
      sport: g.sport,
      cardKind: "instantJoin" as const,
      route: ROUTES.instantJoin,
      attendeeEntity: { type: "instant" as const, id: String(g.id), count: g.playersJoined },
    }));
    const ranked = [...eventRows, ...instantRows].sort((a, b) => b.score - a.score);
    return ranked[contentSeed % Math.max(1, ranked.length)] || ranked[0];
  }, [events, instantGames, contentSeed]);

  if (loading) {
    return <div className="w-full aspect-[2/1] rounded-xl animate-pulse" style={{ background: "var(--surna-surface)" }} />;
  }
  if (!featured) return null;

  return (
    <HomeFeaturedCard
      imageUrl={featured.imageUrl}
      title={featured.title}
      subtitle={featured.subtitle}
      meta={featured.meta}
      sport={featured.sport}
      cardKind={featured.cardKind}
      cta={undefined}
      attendeeEntity={featured.attendeeEntity}
      onClick={() => {
        markNavReturn("/");
        setLocation(featured.route);
      }}
    />
  );
}

/** Fixed home layout — one carousel row, stacked mixed cards, no repeated slide strips. */
export function SpotifyHomeFeed({
  contentSeed,
  lastVisitAt,
}: {
  contentSeed: number;
  lastVisitAt: number;
}) {
  const { events, teams, instantGames, coaches, challenges, loading } = useHomeData();

  const newIndicators: HomeNewIndicators = useMemo(
    () => computeHomeNewIndicators(lastVisitAt, { events, instantGames, teams }),
    [lastVisitAt, events, instantGames, teams],
  );

  return (
    <div className="space-y-6">
      <FeaturedHero events={events} instantGames={instantGames} loading={loading} contentSeed={contentSeed} />
      <HomeFeedPostsSection contentSeed={contentSeed} />
      <HappeningNearYouRow
        events={events}
        instantGames={instantGames}
        loading={loading}
        contentSeed={contentSeed}
        showNew={newIndicators.happeningNearYou}
      />
      <HomeMixedStack
        events={events}
        teams={teams}
        challenges={challenges}
        instantGames={instantGames}
        contentSeed={contentSeed}
        loading={loading}
      />
      <CoachesRow coaches={coaches} loading={loading} contentSeed={contentSeed} />
    </div>
  );
}
