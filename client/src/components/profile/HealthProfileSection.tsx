import { useQuery } from "@tanstack/react-query";
import { Activity, Flame, TrendingUp, Trophy } from "lucide-react";
import { Link } from "wouter";

type HealthSummary = {
  weeklyTrainingLoad: { distanceKm: number; durationMinutes: number; sessions: number } | null;
  monthlyTrend: Array<{ week: string; sessions: number; distanceKm: number }> | null;
  currentStreak: number | null;
  longestStreak: number | null;
  personalBests: Array<{ metric: string; value: number; updatedAt: string }> | null;
  isOwnProfile?: boolean;
};

function formatMetric(metric: string, value: number): string {
  if (metric === "fastest_5k") {
    const m = Math.floor(value / 60);
    const s = Math.round(value % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  if (metric === "longest_run" || metric === "longest_cycle") return `${value.toFixed(2)} km`;
  return String(value);
}

function metricLabel(metric: string): string {
  if (metric === "fastest_5k") return "Fastest 5K";
  if (metric === "longest_run") return "Longest run";
  if (metric === "longest_cycle") return "Longest cycle";
  return metric;
}

export function HealthProfileSection({ userId, isOwnProfile }: { userId: string; isOwnProfile: boolean }) {
  const { data, isLoading } = useQuery<HealthSummary>({
    queryKey: ["/api/users", userId, "health-summary"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/health-summary`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!userId,
  });

  if (isLoading) return null;
  if (!data) return null;

  const hasAny =
    data.weeklyTrainingLoad ||
    data.monthlyTrend?.length ||
    data.currentStreak != null ||
    data.personalBests?.length;
  if (!hasAny && !isOwnProfile) return null;

  return (
    <section className="mt-6 px-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-bold text-white flex items-center gap-2">
          <Activity size={16} className="text-[#1DB954]" />
          Health & activity
        </h2>
        {isOwnProfile && (
          <Link href="/activity/track" className="text-[12px] font-semibold text-[#1DB954]">
            Track workout
          </Link>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "#1a1a1a" }}>
        {data.weeklyTrainingLoad && (
          <div className="p-4 border-b border-white/6">
            <p className="text-[11px] text-white/50 uppercase mb-1">This week</p>
            <div className="flex gap-4">
              <div>
                <p className="text-lg font-bold">{data.weeklyTrainingLoad.sessions}</p>
                <p className="text-[11px] text-white/50">sessions</p>
              </div>
              <div>
                <p className="text-lg font-bold">{data.weeklyTrainingLoad.distanceKm.toFixed(1)} km</p>
                <p className="text-[11px] text-white/50">distance</p>
              </div>
              <div>
                <p className="text-lg font-bold">{data.weeklyTrainingLoad.durationMinutes}m</p>
                <p className="text-[11px] text-white/50">time</p>
              </div>
            </div>
          </div>
        )}

        {data.monthlyTrend && data.monthlyTrend.length > 0 && (
          <div className="p-4 border-b border-white/6">
            <p className="text-[11px] text-white/50 uppercase mb-2 flex items-center gap-1">
              <TrendingUp size={12} /> Monthly trend
            </p>
            <div className="flex gap-2">
              {data.monthlyTrend.slice(-4).map((w, i) => (
                <div key={i} className="flex-1 text-center">
                  <div
                    className="mx-auto rounded-sm bg-[#1DB954]/30"
                    style={{ height: `${Math.max(8, Math.min(40, w.sessions * 8))}px`, width: "100%" }}
                  />
                  <p className="text-[10px] text-white/40 mt-1">{w.sessions}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.currentStreak != null && (
          <div className="p-4 border-b border-white/6 flex items-center gap-3">
            <Flame size={20} className="text-orange-400" />
            <div>
              <p className="text-[15px] font-bold">{data.currentStreak} day streak</p>
              {data.longestStreak != null && (
                <p className="text-[11px] text-white/50">Best: {data.longestStreak} days</p>
              )}
            </div>
          </div>
        )}

        {data.personalBests && data.personalBests.length > 0 && (
          <div className="p-4">
            <p className="text-[11px] text-white/50 uppercase mb-2 flex items-center gap-1">
              <Trophy size={12} /> Personal bests
            </p>
            <ul className="space-y-2">
              {data.personalBests.map((pb) => (
                <li key={pb.metric} className="flex justify-between text-sm">
                  <span className="text-white/70">{metricLabel(String(pb.metric))}</span>
                  <span className="font-bold tabular-nums">{formatMetric(String(pb.metric), pb.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {isOwnProfile && (
        <p className="text-[11px] text-white/40 mt-2 px-1">
          Control visibility in{" "}
          <Link href="/privacy-settings" className="text-[#1DB954] underline">
            Privacy settings
          </Link>
        </p>
      )}
    </section>
  );
}
