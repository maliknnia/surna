import { useAuth } from "@/hooks/useAuth";
import { RewardsSystem } from "@/components/gamification/RewardsSystem";
import { Leaderboard } from "@/components/gamification/Leaderboard";
import PerformanceCard from "@/components/PerformanceCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Gift, RefreshCw, ArrowLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { useSmartBack } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export default function Gamification() {
  const { user } = useAuth();
  const goBack = useSmartBack({ fallback: "/" });
  const [leaderboardTimeframe, setLeaderboardTimeframe] = useState<
    "daily" | "weekly" | "monthly" | "all-time"
  >("all-time");
  const [leaderboardSport, setLeaderboardSport] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: userGamification, refetch: refetchGamification } = useQuery({
    queryKey: ["/api/gamification/user"],
    enabled: !!user,
  });

  const {
    data: leaderboardData,
    isLoading: leaderboardLoading,
    refetch: refetchLeaderboard,
  } = useQuery<unknown[]>({
    queryKey: ["/api/gamification/leaderboard", leaderboardTimeframe, leaderboardSport],
    queryFn: async () => {
      const params = new URLSearchParams({ type: "points", limit: "50" });
      if (leaderboardSport && leaderboardSport !== "all") {
        params.set("sport", leaderboardSport);
      }
      const res = await fetch(`/api/gamification/leaderboard?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load leaderboard");
      return res.json();
    },
    enabled: !!user,
  });

  const leaderboardEntries = ((leaderboardData as unknown[]) || []).map((entry: any, idx) => ({
    rank: Number(entry.rank || idx + 1),
    userId: String(entry.userId || entry.user_id || entry.id || `user-${idx}`),
    username: String(entry.username || entry.displayName || entry.name || `player${idx + 1}`),
    firstName: entry.firstName || entry.first_name,
    lastName: entry.lastName || entry.last_name,
    profileImageUrl: entry.profileImageUrl || entry.profile_image_url,
    score: Number(entry.value ?? entry.score ?? entry.points ?? 0),
    change: typeof entry.change === "number" ? entry.change : undefined,
  }));

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchGamification(), refetchLeaderboard()]);
    setIsRefreshing(false);
  };

  const points = (userGamification as { totalPoints?: number })?.totalPoints ?? 0;
  const level = (userGamification as { level?: number })?.level ?? 1;

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--surna-base)", color: "var(--surna-text)" }}
      data-testid="gamification-page"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-6">
        <header className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goBack}
              aria-label="Go back"
              className="rounded-full border-[var(--surna-border)] bg-[var(--surna-elevated)]"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Link
              href="/"
              className="text-sm text-[var(--surna-text-secondary)] hover:text-[var(--surna-text)]"
            >
              Home
            </Link>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                <Trophy className="h-7 w-7 text-[var(--surna-text)]" />
                Progress
              </h1>
              <p className="text-sm text-[var(--surna-text-secondary)] mt-1">
                Points, ranks, and rewards
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              className="rounded-full border-[var(--surna-border)] bg-[var(--surna-elevated)] flex-shrink-0"
              aria-label="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[var(--surna-border)] bg-[var(--surna-elevated)] p-4">
              <p className="text-xs font-medium text-[var(--surna-text-muted)] uppercase tracking-wide">
                Points
              </p>
              <p className="text-2xl font-bold mt-1 tabular-nums">{points.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-[var(--surna-border)] bg-[var(--surna-elevated)] p-4">
              <p className="text-xs font-medium text-[var(--surna-text-muted)] uppercase tracking-wide">
                Level
              </p>
              <p className="text-2xl font-bold mt-1 tabular-nums">{level}</p>
            </div>
          </div>
        </header>

        <Tabs defaultValue="leaderboard" className="space-y-4">
          <TabsList className="w-full h-auto p-1 rounded-full bg-[var(--surna-elevated)] border border-[var(--surna-border)] grid grid-cols-3">
            <TabsTrigger
              value="progress"
              className="rounded-full text-xs sm:text-sm data-[state=active]:bg-[var(--surna-bg-highlight)]"
              data-testid="tab-dashboard"
            >
              <BarChart3 className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Stats
            </TabsTrigger>
            <TabsTrigger
              value="leaderboard"
              className="rounded-full text-xs sm:text-sm data-[state=active]:bg-[var(--surna-bg-highlight)]"
            >
              <Trophy className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Ranks
            </TabsTrigger>
            <TabsTrigger
              value="rewards"
              className="rounded-full text-xs sm:text-sm data-[state=active]:bg-[var(--surna-bg-highlight)]"
              data-testid="tab-rewards"
            >
              <Gift className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Rewards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="mt-0 focus-visible:outline-none">
            <PerformanceCard />
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-0 focus-visible:outline-none">
            <Leaderboard
              entries={leaderboardEntries}
              currentUserId={(user as { id?: string })?.id}
              isLoading={leaderboardLoading}
              timeframe={leaderboardTimeframe}
              sport={leaderboardSport}
              onTimeframeChange={(v) => setLeaderboardTimeframe(v as typeof leaderboardTimeframe)}
              onSportChange={setLeaderboardSport}
            />
          </TabsContent>

          <TabsContent value="rewards" className="mt-0 focus-visible:outline-none">
            <RewardsSystem userPoints={points} userLevel={level} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
