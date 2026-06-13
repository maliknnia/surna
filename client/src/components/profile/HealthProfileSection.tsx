import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Flame, TrendingUp, Trophy } from "lucide-react";
import { Link } from "wouter";
import {
  SurnaEmbeddedInnerSection,
  SurnaEmbeddedSectionTitle,
  SurnaEmbeddedSurface,
} from "@/components/ui/SurnaEmbeddedCard";

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

  const sections: Array<{ key: string; node: ReactNode }> = [];

  if (data.weeklyTrainingLoad) {
    sections.push({
      key: "week",
      node: (
        <>
          <p className="text-[11px] uppercase mb-1" style={{ color: "var(--surna-text-secondary)" }}>
            This week
          </p>
          <div className="flex gap-4">
            <div>
              <p className="text-lg font-bold" style={{ color: "var(--surna-text)" }}>
                {data.weeklyTrainingLoad.sessions}
              </p>
              <p className="text-[11px]" style={{ color: "var(--surna-text-secondary)" }}>
                sessions
              </p>
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: "var(--surna-text)" }}>
                {data.weeklyTrainingLoad.distanceKm.toFixed(1)} km
              </p>
              <p className="text-[11px]" style={{ color: "var(--surna-text-secondary)" }}>
                distance
              </p>
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: "var(--surna-text)" }}>
                {data.weeklyTrainingLoad.durationMinutes}m
              </p>
              <p className="text-[11px]" style={{ color: "var(--surna-text-secondary)" }}>
                time
              </p>
            </div>
          </div>
        </>
      ),
    });
  }

  if (data.monthlyTrend && data.monthlyTrend.length > 0) {
    sections.push({
      key: "trend",
      node: (
        <>
          <p
            className="text-[11px] uppercase mb-2 flex items-center gap-1"
            style={{ color: "var(--surna-text-secondary)" }}
          >
            <TrendingUp size={12} /> Monthly trend
          </p>
          <div className="flex gap-2">
            {data.monthlyTrend.slice(-4).map((w, i) => (
              <div key={i} className="flex-1 text-center">
                <div
                  className="mx-auto rounded-sm"
                  style={{
                    height: `${Math.max(8, Math.min(40, w.sessions * 8))}px`,
                    width: "100%",
                    background: "var(--surna-bg-highlight)",
                  }}
                />
                <p className="text-[10px] mt-1" style={{ color: "var(--surna-text-muted)" }}>
                  {w.sessions}
                </p>
              </div>
            ))}
          </div>
        </>
      ),
    });
  }

  if (data.currentStreak != null) {
    sections.push({
      key: "streak",
      node: (
        <div className="flex items-center gap-3">
          <Flame size={20} style={{ color: "var(--surna-gold)" }} />
          <div>
            <p className="text-[15px] font-bold" style={{ color: "var(--surna-text)" }}>
              {data.currentStreak} day streak
            </p>
            {data.longestStreak != null && (
              <p className="text-[11px]" style={{ color: "var(--surna-text-secondary)" }}>
                Best: {data.longestStreak} days
              </p>
            )}
          </div>
        </div>
      ),
    });
  }

  if (data.personalBests && data.personalBests.length > 0) {
    sections.push({
      key: "bests",
      node: (
        <>
          <p
            className="text-[11px] uppercase mb-2 flex items-center gap-1"
            style={{ color: "var(--surna-text-secondary)" }}
          >
            <Trophy size={12} /> Personal bests
          </p>
          <ul className="space-y-2">
            {data.personalBests.map((pb) => (
              <li key={pb.metric} className="flex justify-between text-sm">
                <span style={{ color: "var(--surna-text-secondary)" }}>{metricLabel(String(pb.metric))}</span>
                <span className="font-bold tabular-nums" style={{ color: "var(--surna-text)" }}>
                  {formatMetric(String(pb.metric), pb.value)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ),
    });
  }

  return (
    <section className="mt-6 px-4">
      <SurnaEmbeddedSectionTitle
        icon={<Activity size={16} style={{ color: "var(--surna-text-secondary)" }} />}
        title="Health & activity"
        action={
          isOwnProfile ? (
            <Link
              href="/activity/track"
              className="text-[12px] font-semibold"
              style={{ color: "var(--surna-text)" }}
            >
              Track workout
            </Link>
          ) : undefined
        }
      />

      <SurnaEmbeddedSurface>
        {sections.map((section, index) => (
          <SurnaEmbeddedInnerSection key={section.key} last={index === sections.length - 1}>
            {section.node}
          </SurnaEmbeddedInnerSection>
        ))}
      </SurnaEmbeddedSurface>

      {isOwnProfile && (
        <p className="text-[11px] mt-2 px-1" style={{ color: "var(--surna-text-muted)" }}>
          Control visibility in{" "}
          <Link href="/privacy-settings" className="underline" style={{ color: "var(--surna-text-secondary)" }}>
            Privacy settings
          </Link>
        </p>
      )}
    </section>
  );
}
