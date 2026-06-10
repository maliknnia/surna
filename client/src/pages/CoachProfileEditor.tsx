import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPanelTheme } from "@/lib/panelTheme";
import { ROUTES } from "@/navigation";
import { updateCoachProfile } from "@/lib/coachesApi";
import type { CoachProfileExtras, CoachPricingPlan, CoachAchievement, CoachMediaItem } from "@shared/coachProfile";
import { DEFAULT_SESSION_DURATIONS } from "@shared/coachProfile";

type MeResponse = {
  coach: { id: string; bio?: string; hourlyRate?: string };
  profile: CoachProfileExtras;
};

export default function CoachProfileEditor() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const t = getPanelTheme();

  const { data, isLoading, error } = useQuery<MeResponse>({
    queryKey: ["/api/coaches/me/profile"],
    queryFn: async () => {
      const r = await fetch("/api/coaches/me/profile", { credentials: "include" });
      if (r.status === 404) throw new Error("NOT_COACH");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    retry: false,
  });

  const [bio, setBio] = useState("");
  const [tagline, setTagline] = useState("");
  const [philosophy, setPhilosophy] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [bookingMode, setBookingMode] = useState<CoachProfileExtras["bookingMode"]>("hourly_slots");
  const [sessionDurations, setSessionDurations] = useState<number[]>(DEFAULT_SESSION_DURATIONS);
  const [plans, setPlans] = useState<CoachPricingPlan[]>([]);
  const [achievements, setAchievements] = useState<CoachAchievement[]>([]);
  const [media, setMedia] = useState<CoachMediaItem[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");

  useEffect(() => {
    if (!data) return;
    setBio(data.coach.bio || "");
    setTagline(data.profile.tagline || "");
    setPhilosophy(data.profile.teachingPhilosophy || "");
    setHourlyRate(data.coach.hourlyRate ? parseFloat(data.coach.hourlyRate).toString() : "");
    setBookingMode(data.profile.bookingMode || "hourly_slots");
    setSessionDurations(data.profile.sessionDurations || DEFAULT_SESSION_DURATIONS);
    setPlans(data.profile.pricingPlans || []);
    setAchievements(data.profile.achievements || []);
    setMedia(data.profile.media || []);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateCoachProfile({
        bio,
        tagline,
        teachingPhilosophy: philosophy,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : 0,
        bookingMode,
        sessionDurations,
        pricingPlans: plans,
        achievements,
        media,
      }),
    onSuccess: () => {
      toast({ title: "Profile saved", description: "Your public coach page is updated." });
      qc.invalidateQueries({ queryKey: ["/api/coaches/me/profile"] });
      if (data?.coach.id) qc.invalidateQueries({ queryKey: ["coach-detail", data.coach.id] });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const inputStyle = {
    padding: "10px 12px",
    borderRadius: 10,
    width: "100%",
    fontFamily: "inherit",
    fontSize: 14,
    background: t.inputBg,
    color: t.textPrimary,
    border: `1px solid ${t.border}`,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: t.pageBg }}>
        <div className="animate-pulse text-[13px]" style={{ color: t.textSecondary }}>Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: t.pageBg }}>
        <p className="text-[14px] font-bold mb-2" style={{ color: t.textPrimary }}>Coach profile not found</p>
        <p className="text-[13px] mb-4 text-center" style={{ color: t.textSecondary }}>
          Apply to become a coach first, then customize your page here.
        </p>
        <button
          type="button"
          onClick={() => setLocation("/monetization/coach-signup")}
          className="px-5 py-2.5 rounded-full text-[13px] font-bold"
          style={{ background: t.chipActiveBg, color: t.chipActiveText }}
        >
          Apply to coach
        </button>
      </div>
    );
  }

  const addPlan = () => {
    setPlans((p) => [
      ...p,
      {
        id: `plan-${Date.now()}`,
        label: "New plan",
        description: "",
        priceEur: hourlyRate ? parseFloat(hourlyRate) : 50,
        period: "session",
        durationMinutes: 60,
      },
    ]);
  };

  const addAchievement = () => {
    setAchievements((a) => [
      ...a,
      { id: `ach-${Date.now()}`, title: "New achievement", year: new Date().getFullYear().toString() },
    ]);
  };

  const addVideo = () => {
    if (!videoUrl.trim()) return;
    setMedia((m) => [
      ...m,
      { id: `vid-${Date.now()}`, type: "video", url: videoUrl.trim(), title: videoTitle.trim() || "Demo video" },
    ]);
    setVideoUrl("");
    setVideoTitle("");
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: t.pageBg }}>
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${t.border}`, background: t.headerBg }}>
        <button type="button" onClick={() => setLocation(ROUTES.coachSchedule)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: t.inputBg }}>
          <ArrowLeft size={18} style={{ color: t.textPrimary }} />
        </button>
        <h1 className="text-[16px] font-bold flex-1" style={{ color: t.textPrimary }}>Profile & booking</h1>
        <button
          type="button"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          className="px-4 py-2 rounded-full text-[12px] font-bold flex items-center gap-1"
          style={{ background: t.chipActiveBg, color: t.chipActiveText }}
        >
          <Save size={14} /> Save
        </button>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-6">
        <section>
          <h2 className="text-[13px] font-bold uppercase tracking-wide mb-3" style={{ color: t.textPrimary }}>Public story</h2>
          <label className="block mb-3">
            <span className="text-[12px] font-semibold mb-1 block" style={{ color: t.textSecondary }}>Tagline</span>
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Elite tennis · youth development" style={inputStyle} />
          </label>
          <label className="block mb-3">
            <span className="text-[12px] font-semibold mb-1 block" style={{ color: t.textSecondary }}>About</span>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} style={inputStyle} />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold mb-1 block" style={{ color: t.textSecondary }}>Coaching philosophy</span>
            <textarea value={philosophy} onChange={(e) => setPhilosophy(e.target.value)} rows={3} placeholder="How you train, what athletes can expect…" style={inputStyle} />
          </label>
        </section>

        <section>
          <h2 className="text-[13px] font-bold uppercase tracking-wide mb-3" style={{ color: t.textPrimary }}>Booking style</h2>
          <label className="block mb-3">
            <span className="text-[12px] font-semibold mb-1 block" style={{ color: t.textSecondary }}>How athletes book you</span>
            <select
              value={bookingMode}
              onChange={(e) => setBookingMode(e.target.value as CoachProfileExtras["bookingMode"])}
              style={inputStyle}
            >
              <option value="hourly_slots">Live slots — hourly calendar booking</option>
              <option value="plans_only">Plans only — show pricing, message to start</option>
              <option value="message_first">Message first — discuss before booking</option>
            </select>
          </label>
          <label className="block mb-3">
            <span className="text-[12px] font-semibold mb-1 block" style={{ color: t.textSecondary }}>Base hourly rate (€)</span>
            <input type="number" min={0} value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} style={inputStyle} />
          </label>
          <p className="text-[11px] mb-2" style={{ color: t.textSecondary }}>Session lengths offered (minutes)</p>
          <div className="flex flex-wrap gap-2">
            {[30, 45, 60, 90, 120].map((d) => {
              const on = sessionDurations.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    setSessionDurations((prev) =>
                      on ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b),
                    )
                  }
                  className="px-3 py-1.5 rounded-full text-[12px] font-bold"
                  style={{
                    background: on ? t.chipActiveBg : t.chipBg,
                    color: on ? t.chipActiveText : t.chipText,
                  }}
                >
                  {d}m
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-bold uppercase tracking-wide" style={{ color: t.textPrimary }}>Pricing plans</h2>
            <button type="button" onClick={addPlan} className="text-[12px] font-bold flex items-center gap-1" style={{ color: t.chipActiveText }}>
              <Plus size={14} /> Add
            </button>
          </div>
          <p className="text-[11px] mb-3" style={{ color: t.textSecondary }}>
            You control how booking looks — monthly programs, single sessions, or contact-only plans.
          </p>
          {plans.map((plan, i) => (
            <div key={plan.id} className="p-3 rounded-xl mb-3 space-y-2" style={{ background: t.chipBg, border: `1px solid ${t.border}` }}>
              <div className="flex gap-2">
                <input
                  value={plan.label}
                  onChange={(e) => setPlans((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  placeholder="Plan name"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button type="button" onClick={() => setPlans((p) => p.filter((_, j) => j !== i))} className="p-2">
                  <Trash2 size={16} style={{ color: t.textSecondary }} />
                </button>
              </div>
              <textarea
                value={plan.description || ""}
                onChange={(e) => setPlans((p) => p.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                placeholder="What's included"
                rows={2}
                style={inputStyle}
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={plan.priceEur ?? ""}
                  onChange={(e) => setPlans((p) => p.map((x, j) => (j === i ? { ...x, priceEur: parseFloat(e.target.value) || 0 } : x)))}
                  placeholder="Price €"
                  style={{ ...inputStyle, width: 100 }}
                />
                <select
                  value={plan.period}
                  onChange={(e) => setPlans((p) => p.map((x, j) => (j === i ? { ...x, period: e.target.value as CoachPricingPlan["period"] } : x)))}
                  style={{ ...inputStyle, flex: 1 }}
                >
                  <option value="hour">Per hour</option>
                  <option value="session">Per session</option>
                  <option value="month">Monthly</option>
                  <option value="package">Package</option>
                  <option value="contact">Contact for price</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-[12px]" style={{ color: t.textSecondary }}>
                <input
                  type="checkbox"
                  checked={!!plan.highlighted}
                  onChange={(e) => setPlans((p) => p.map((x, j) => (j === i ? { ...x, highlighted: e.target.checked } : x)))}
                />
                Highlight as popular
              </label>
            </div>
          ))}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-bold uppercase tracking-wide" style={{ color: t.textPrimary }}>Achievements</h2>
            <button type="button" onClick={addAchievement} className="text-[12px] font-bold flex items-center gap-1" style={{ color: t.chipActiveText }}>
              <Plus size={14} /> Add
            </button>
          </div>
          {achievements.map((a, i) => (
            <div key={a.id} className="p-3 rounded-xl mb-2 space-y-2" style={{ background: t.chipBg, border: `1px solid ${t.border}` }}>
              <div className="flex gap-2">
                <input
                  value={a.title}
                  onChange={(e) => setAchievements((arr) => arr.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button type="button" onClick={() => setAchievements((arr) => arr.filter((_, j) => j !== i))}>
                  <Trash2 size={16} style={{ color: t.textSecondary }} />
                </button>
              </div>
              <input
                value={a.year || ""}
                onChange={(e) => setAchievements((arr) => arr.map((x, j) => (j === i ? { ...x, year: e.target.value } : x)))}
                placeholder="Year"
                style={inputStyle}
              />
              <textarea
                value={a.description || ""}
                onChange={(e) => setAchievements((arr) => arr.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                placeholder="Details"
                rows={2}
                style={inputStyle}
              />
            </div>
          ))}
        </section>

        <section>
          <h2 className="text-[13px] font-bold uppercase tracking-wide mb-3" style={{ color: t.textPrimary }}>Videos & media</h2>
          <div className="flex flex-col gap-2 mb-3">
            <input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Video title" style={inputStyle} />
            <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="YouTube or video URL" style={inputStyle} />
            <button type="button" onClick={addVideo} className="py-2.5 rounded-full text-[13px] font-bold" style={{ background: t.chipBg, color: t.textPrimary }}>
              Add video
            </button>
          </div>
          {media.map((m, i) => (
            <div key={m.id} className="flex items-center justify-between py-2 text-[12px]" style={{ color: t.textSecondary }}>
              <span className="truncate flex-1">{m.title || m.url}</span>
              <button type="button" onClick={() => setMedia((arr) => arr.filter((_, j) => j !== i))}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </section>

        <button
          type="button"
          onClick={() => data?.coach.id && setLocation(ROUTES.coach(data.coach.id))}
          className="w-full py-3 rounded-full text-[14px] font-bold"
          style={{ background: t.chipBg, color: t.textPrimary, border: `1px solid ${t.border}` }}
        >
          Preview public profile
        </button>
      </div>
    </div>
  );
}
