import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Plus, Save, Trash2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPanelTheme } from "@/lib/panelTheme";
import { ROUTES } from "@/navigation";
import { fetchMyProfile, updateMyProfile } from "@/lib/userProfileApi";
import type { UserHighlight } from "@shared/userProfile";
import { profileCompletionSections } from "@shared/userProfile";
import { SPORTS_CATEGORIES, POPULAR_SPORTS } from "@shared/sportsData";

const INTEREST_SUGGESTIONS = [
  "Fitness", "Nutrition", "Travel", "Music", "Photography", "Gaming",
  "Outdoor adventures", "Wellness", "Fashion", "Film",
];

const ACTIVITY_SUGGESTIONS = [
  "Pickup games", "Leagues", "Training partners", "Coaching others",
  "Watching live sports", "Gym sessions", "Running clubs", "Tournaments",
];

const LOOKING_FOR_OPTIONS = [
  "Fun & casual", "Competitive play", "Training partners", "New friends",
  "Local events", "Coaching", "Team tryouts",
];

type Section = "about" | "sports" | "interests" | "highlights" | "goals";

export default function ProfileEditor() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const t = getPanelTheme();
  const [section, setSection] = useState<Section>("about");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/users/me/profile"],
    queryFn: fetchMyProfile,
  });

  const [bio, setBio] = useState("");
  const [tagline, setTagline] = useState("");
  const [locationText, setLocationText] = useState("");
  const [sports, setSports] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<UserHighlight[]>([]);
  const [customInterest, setCustomInterest] = useState("");

  useEffect(() => {
    if (!data) return;
    setBio(data.bio || "");
    setTagline(data.profile.tagline || "");
    setLocationText(data.location || "");
    setSports(data.profile.sports || []);
    setInterests(data.profile.interests || []);
    setActivities(data.profile.activities || []);
    setLookingFor(data.profile.lookingFor || []);
    setHighlights(data.profile.highlights || []);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateMyProfile>[0]) => updateMyProfile(patch),
    onSuccess: () => {
      toast({ title: "Saved", description: "Your profile was updated." });
      qc.invalidateQueries({ queryKey: ["/api/users/me/profile"] });
      qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
      if (data?.id) qc.invalidateQueries({ queryKey: ["/api/users", data.id] });
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

  const toggle = (list: string[], item: string, setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const sections: { id: Section; label: string }[] = [
    { id: "about", label: "About" },
    { id: "sports", label: "Sports" },
    { id: "interests", label: "Interests" },
    { id: "highlights", label: "Highlights" },
    { id: "goals", label: "Goals" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surna-void)" }}>
        <div className="w-8 h-8 border-2 border-border border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const completion = data
    ? profileCompletionSections(data, data.profile).filter((s) => !s.complete).map((s) => s.label)
    : [];

  return (
    <div className="min-h-screen pb-28" style={{ background: "var(--surna-void)" }}>
      <div className="sticky top-0 z-40 glass-effect border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => navigate(ROUTES.profile)} className="p-2 rounded-xl hover:bg-muted/40">
            <ArrowLeft className="w-5 h-5" style={{ color: "var(--surna-text)" }} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold" style={{ color: "var(--surna-text)" }}>Build your profile</h1>
            <p className="text-[11px]" style={{ color: "var(--surna-text-muted)" }}>
              {data?.profileCompletion ?? 0}% complete · finish anytime
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(ROUTES.profile)}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-full"
            style={{ background: "var(--surna-elevated)", color: "var(--surna-text-secondary)" }}
          >
            Done
          </button>
        </div>
        <div className="max-w-md mx-auto px-4 pb-2">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surna-elevated)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${data?.profileCompletion ?? 0}%`, background: "var(--surna-gold)" }}
            />
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold"
              style={{
                background: section === s.id ? "var(--surna-gold)" : "var(--surna-elevated)",
                color: section === s.id ? "#000" : "var(--surna-text-secondary)",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {completion.length > 0 && (
          <div className="rounded-2xl p-4 text-[12px]" style={{ background: "var(--surna-elevated)", color: "var(--surna-text-secondary)" }}>
            <Sparkles className="w-4 h-4 inline mr-1" style={{ color: "var(--surna-gold)" }} />
            Still to add: {completion.join(", ")}
          </div>
        )}

        {section === "about" && (
          <div className="space-y-3">
            <label className="text-[12px] font-semibold" style={{ color: "var(--surna-text-muted)" }}>Short tagline</label>
            <input style={inputStyle} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Weekend hooper · always down for pickup" maxLength={200} />
            <label className="text-[12px] font-semibold" style={{ color: "var(--surna-text-muted)" }}>Bio</label>
            <textarea style={{ ...inputStyle, minHeight: 100 }} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What you love, how you play, what you're about…" maxLength={4000} />
            <label className="text-[12px] font-semibold" style={{ color: "var(--surna-text-muted)" }}>Location</label>
            <input style={inputStyle} value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="City, region" />
            <SaveButton loading={saveMutation.isPending} onClick={() => saveMutation.mutate({ tagline, bio, location: locationText })} />
          </div>
        )}

        {section === "sports" && (
          <div className="space-y-3">
            <p className="text-[12px]" style={{ color: "var(--surna-text-muted)" }}>Sports you play or follow</p>
            <div className="flex flex-wrap gap-2">
              {SPORTS_CATEGORIES.filter((s) => POPULAR_SPORTS.includes(s.name)).map((sport) => (
                <Chip key={sport.name} active={sports.includes(sport.name)} onClick={() => toggle(sports, sport.name, setSports)}>
                  {sport.icon} {sport.name}
                </Chip>
              ))}
            </div>
            <SaveButton loading={saveMutation.isPending} onClick={() => saveMutation.mutate({ sports, primarySport: sports[0] })} />
          </div>
        )}

        {section === "interests" && (
          <div className="space-y-3">
            <p className="text-[12px]" style={{ color: "var(--surna-text-muted)" }}>Interests & hobbies</p>
            <div className="flex flex-wrap gap-2">
              {INTEREST_SUGGESTIONS.map((item) => (
                <Chip key={item} active={interests.includes(item)} onClick={() => toggle(interests, item, setInterests)}>{item}</Chip>
              ))}
            </div>
            <div className="flex gap-2">
              <input style={inputStyle} value={customInterest} onChange={(e) => setCustomInterest(e.target.value)} placeholder="Add your own" />
              <button
                type="button"
                className="shrink-0 px-3 rounded-lg font-bold text-sm"
                style={{ background: "var(--surna-gold)", color: "#000" }}
                onClick={() => {
                  if (customInterest.trim()) {
                    setInterests((p) => [...p, customInterest.trim()]);
                    setCustomInterest("");
                  }
                }}
              >
                <Plus size={16} />
              </button>
            </div>
            <p className="text-[12px] font-semibold pt-2" style={{ color: "var(--surna-text-muted)" }}>What you do on SURNA</p>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_SUGGESTIONS.map((item) => (
                <Chip key={item} active={activities.includes(item)} onClick={() => toggle(activities, item, setActivities)}>{item}</Chip>
              ))}
            </div>
            <SaveButton loading={saveMutation.isPending} onClick={() => saveMutation.mutate({ interests, activities })} />
          </div>
        )}

        {section === "highlights" && (
          <div className="space-y-3">
            <p className="text-[12px]" style={{ color: "var(--surna-text-muted)" }}>Moments, awards, or wins you're proud of</p>
            {highlights.map((h, i) => (
              <div key={h.id} className="rounded-xl p-3 space-y-2" style={{ background: "var(--surna-elevated)", border: "0.5px solid var(--surna-border)" }}>
                <div className="flex justify-between">
                  <span className="text-[11px] font-bold" style={{ color: "var(--surna-text-muted)" }}>Highlight {i + 1}</span>
                  <button type="button" onClick={() => setHighlights((p) => p.filter((x) => x.id !== h.id))}>
                    <Trash2 size={14} style={{ color: "var(--surna-text-muted)" }} />
                  </button>
                </div>
                <input style={inputStyle} value={h.title} onChange={(e) => setHighlights((p) => p.map((x) => (x.id === h.id ? { ...x, title: e.target.value } : x)))} placeholder="Title" />
                <input style={inputStyle} value={h.description || ""} onChange={(e) => setHighlights((p) => p.map((x) => (x.id === h.id ? { ...x, description: e.target.value } : x)))} placeholder="Description (optional)" />
              </div>
            ))}
            <button
              type="button"
              className="w-full py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2"
              style={{ border: "1px dashed var(--surna-border)", color: "var(--surna-text-secondary)" }}
              onClick={() =>
                setHighlights((p) => [...p, { id: `hl-${Date.now()}`, title: "", description: "" }])
              }
            >
              <Plus size={16} /> Add highlight
            </button>
            <SaveButton loading={saveMutation.isPending} onClick={() => saveMutation.mutate({ highlights })} />
          </div>
        )}

        {section === "goals" && (
          <div className="space-y-3">
            <p className="text-[12px]" style={{ color: "var(--surna-text-muted)" }}>What are you looking for?</p>
            <div className="flex flex-wrap gap-2">
              {LOOKING_FOR_OPTIONS.map((item) => (
                <Chip key={item} active={lookingFor.includes(item)} onClick={() => toggle(lookingFor, item, setLookingFor)}>{item}</Chip>
              ))}
            </div>
            <SaveButton
              loading={saveMutation.isPending}
              onClick={() =>
                saveMutation.mutate({
                  lookingForTags: lookingFor,
                  markSetupComplete: (data?.profileCompletion ?? 0) >= 50,
                })
              }
            />
          </div>
        )}

        <p className="text-center text-[11px] pt-4" style={{ color: "var(--surna-text-muted)" }}>
          <Link href={ROUTES.settings} className="underline">Photo & account settings</Link>
        </p>
      </div>
    </div>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-transform active:scale-95"
      style={{
        background: active ? "var(--surna-gold)" : "var(--surna-elevated)",
        color: active ? "#000" : "var(--surna-text-secondary)",
        border: active ? "none" : "0.5px solid var(--surna-border)",
      }}
    >
      {children}
    </button>
  );
}

function SaveButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full mt-2 py-3 rounded-full text-[14px] font-bold flex items-center justify-center gap-2"
      style={{ background: "var(--surna-gold)", color: "#000" }}
    >
      <Save size={16} />
      {loading ? "Saving…" : "Save section"}
    </button>
  );
}
