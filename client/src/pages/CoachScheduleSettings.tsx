import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getPanelTheme } from "@/lib/panelTheme";
import { ROUTES } from "@/navigation";

type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
type WeeklyAvailability = Partial<
  Record<DayKey, { enabled: boolean; ranges: { start: string; end: string }[] }>
>;

const DAY_DEFS: { key: DayKey; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

type MeResponse = {
  weeklyAvailability: WeeklyAvailability;
};

export default function CoachScheduleSettings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<WeeklyAvailability | null>(null);
  const t = getPanelTheme();

  const { data, isLoading, error, refetch } = useQuery<MeResponse>({
    queryKey: ["/api/coaches/me/profile"],
    queryFn: async () => {
      const r = await fetch("/api/coaches/me/profile", { credentials: "include" });
      if (r.status === 404) throw new Error("NOT_COACH");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (data?.weeklyAvailability) setDraft(data.weeklyAvailability);
  }, [data?.weeklyAvailability]);

  const saveMutation = useMutation({
    mutationFn: async (weeklyAvailability: WeeklyAvailability) => {
      const res = await apiRequest("PATCH", "/api/coaches/me/availability", { weeklyAvailability });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Your bookable hours are updated." });
      qc.invalidateQueries({ queryKey: ["/api/coaches/me/profile"] });
    },
    onError: () => {
      toast({ title: "Save failed", variant: "destructive" });
    },
  });

  const header = (
    <div
      className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: `1px solid ${t.border}`, background: t.headerBg }}
    >
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? window.history.back() : setLocation(ROUTES.coaches))}
        className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90"
        style={{ background: t.inputBg }}
      >
        <ArrowLeft size={18} style={{ color: t.textPrimary }} />
      </button>
      <h1 className="text-[16px] font-bold" style={{ color: t.textPrimary }}>
        Coach availability
      </h1>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen pb-24" style={{ background: t.pageBg }}>
        {header}
        <div className="px-4 pt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: t.chipBg }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "NOT_COACH") {
      return (
        <div className="min-h-screen pb-24" style={{ background: t.pageBg }}>
          {header}
          <div className="px-6 pt-12 text-center max-w-sm mx-auto">
            <GraduationCap size={40} className="mx-auto mb-4" style={{ color: t.textSecondary }} />
            <h2 className="text-[16px] font-bold mb-2" style={{ color: t.textPrimary }}>
              Coach account required
            </h2>
            <p className="text-[13px] mb-6" style={{ color: t.textSecondary }}>
              Apply to coach on SURNA first. Once approved, you can set weekly bookable hours here.
            </p>
            <button
              type="button"
              onClick={() => setLocation("/monetization/coach-signup")}
              className="w-full py-3 rounded-2xl text-[14px] font-bold mb-3"
              style={{ background: t.chipActiveBg, color: t.chipActiveText }}
            >
              Apply to coach
            </button>
            <button
              type="button"
              onClick={() => setLocation(ROUTES.coaches)}
              className="w-full py-3 rounded-2xl text-[14px] font-semibold"
              style={{ color: t.textSecondary }}
            >
              Browse coaches
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen pb-24" style={{ background: t.pageBg }}>
        {header}
        <div className="px-6 pt-12 text-center">
          <p className="text-[13px] mb-4" style={{ color: t.textSecondary }}>
            Could not load your coach profile.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="px-5 py-2.5 rounded-full text-[13px] font-bold"
            style={{ background: t.chipActiveBg, color: t.chipActiveText }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data?.weeklyAvailability) {
    return (
      <div className="min-h-screen pb-24" style={{ background: t.pageBg }}>
        {header}
        <p className="px-4 pt-6 text-[13px]" style={{ color: t.textSecondary }}>
          No availability data to edit.
        </p>
      </div>
    );
  }

  const effective = draft ?? data.weeklyAvailability;

  const updateDay = (key: DayKey, patch: Partial<{ enabled: boolean; start: string; end: string }>) => {
    setDraft((prev) => {
      const base = prev ?? data!.weeklyAvailability;
      const cur = base[key] || { enabled: false, ranges: [{ start: "09:00", end: "17:00" }] };
      const start = patch.start ?? cur.ranges[0]?.start ?? "09:00";
      const end = patch.end ?? cur.ranges[0]?.end ?? "17:00";
      const enabled = patch.enabled ?? cur.enabled;
      return {
        ...base,
        [key]: {
          enabled,
          ranges: enabled ? [{ start, end }] : [],
        },
      };
    });
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: t.pageBg }}>
      {header}

      <div className="px-4 pt-4 space-y-3">
        <button
          type="button"
          onClick={() => setLocation("/coach/profile")}
          className="w-full py-3 rounded-2xl text-[14px] font-bold"
          style={{ background: t.chipActiveBg, color: t.chipActiveText }}
        >
          Edit profile, plans & videos
        </button>
        <p className="text-[13px]" style={{ color: t.textSecondary }}>
          Athletes book sessions inside these windows. Set session lengths and pricing on your profile page.
        </p>

        {DAY_DEFS.map(({ key, label }) => {
          const row = effective[key] || { enabled: false, ranges: [{ start: "09:00", end: "17:00" }] };
          const start = row.ranges[0]?.start || "09:00";
          const end = row.ranges[0]?.end || "17:00";
          return (
            <div
              key={key}
              className="rounded-2xl p-3 space-y-2"
              style={{ background: t.chipBg, border: `1px solid ${t.border}` }}
            >
              <label className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: t.textPrimary }}>
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => updateDay(key, { enabled: e.target.checked })}
                />
                {label}
              </label>
              {row.enabled ? (
                <div className="flex gap-2 items-center">
                  <input
                    type="time"
                    value={start}
                    onChange={(e) => updateDay(key, { start: e.target.value })}
                    className="rounded-lg px-2 py-1 text-[13px] flex-1"
                    style={{ background: t.pageBg, color: t.textPrimary, border: `1px solid ${t.border}` }}
                  />
                  <span style={{ color: t.textSecondary }}>to</span>
                  <input
                    type="time"
                    value={end}
                    onChange={(e) => updateDay(key, { end: e.target.value })}
                    className="rounded-lg px-2 py-1 text-[13px] flex-1"
                    style={{ background: t.pageBg, color: t.textPrimary, border: `1px solid ${t.border}` }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => saveMutation.mutate(effective)}
          disabled={saveMutation.isPending}
          className="w-full py-3 rounded-2xl text-[14px] font-bold"
          style={{
            background: t.chipActiveBg,
            color: t.chipActiveText,
            opacity: saveMutation.isPending ? 0.6 : 1,
          }}
        >
          {saveMutation.isPending ? "Saving…" : "Save availability"}
        </button>
      </div>
    </div>
  );
}
