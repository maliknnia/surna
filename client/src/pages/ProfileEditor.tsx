import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPanelTheme } from "@/lib/panelTheme";
import { ROUTES } from "@/navigation";
import { fetchMyProfile, updateMyProfile } from "@/lib/userProfileApi";
import type { UserHighlight } from "@shared/userProfile";
import { SPORTS_CATEGORIES, POPULAR_SPORTS } from "@shared/sportsData";
import {
  GEAR_VISIBILITY_LABELS,
  SHIRT_SIZES,
  SHOE_SIZES_EU,
  type GearProfile,
  type GearProfileVisibility,
} from "@shared/gearProfile";

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

type Section = "about" | "sports" | "gear" | "interests" | "highlights" | "goals";

const EMPTY_GEAR: GearProfile = { visibility: "team_managers" };

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
  const [gear, setGear] = useState<GearProfile>(EMPTY_GEAR);
  const [shortsSameAsShirt, setShortsSameAsShirt] = useState(false);

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
    const g = data.profile.gearProfile ?? EMPTY_GEAR;
    setGear(g);
    setShortsSameAsShirt(!!g.shirtSize && g.shortsSize === g.shirtSize);
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
    { id: "gear", label: "Kit & sizing" },
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

  return (
    <div className="min-h-screen pb-28" style={{ background: "var(--surna-void)" }}>
      <div className="sticky top-0 z-40 glass-effect border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => navigate(ROUTES.profile)} className="p-2 rounded-xl hover:bg-muted/40">
            <ArrowLeft className="w-5 h-5" style={{ color: "var(--surna-text)" }} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold" style={{ color: "var(--surna-text)" }}>Edit profile</h1>
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

        {section === "gear" && (
          <div className="space-y-3">
            <p className="text-[12px]" style={{ color: "var(--surna-text-muted)" }}>
              Used when your team orders kit or merch — captains see this on the sizing roster.
            </p>

            <label className="text-[12px] font-semibold" style={{ color: "var(--surna-text-muted)" }}>Height (cm)</label>
            <input
              style={inputStyle}
              type="number"
              min={100}
              max={250}
              value={gear.heightCm ?? ""}
              onChange={(e) =>
                setGear((g) => ({
                  ...g,
                  heightCm: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              placeholder="e.g. 178"
            />

            <label className="text-[12px] font-semibold" style={{ color: "var(--surna-text-muted)" }}>Shirt / jersey size</label>
            <select
              style={inputStyle}
              value={gear.shirtSize ?? ""}
              onChange={(e) => {
                const shirtSize = e.target.value || undefined;
                setGear((g) => ({
                  ...g,
                  shirtSize,
                  shortsSize: shortsSameAsShirt ? shirtSize : g.shortsSize,
                }));
              }}
            >
              <option value="">Select size</option>
              {SHIRT_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-[12px]" style={{ color: "var(--surna-text-muted)" }}>
              <input
                type="checkbox"
                checked={shortsSameAsShirt}
                onChange={(e) => {
                  setShortsSameAsShirt(e.target.checked);
                  if (e.target.checked && gear.shirtSize) {
                    setGear((g) => ({ ...g, shortsSize: g.shirtSize }));
                  }
                }}
              />
              Shorts same as shirt
            </label>

            {!shortsSameAsShirt ? (
              <>
                <label className="text-[12px] font-semibold" style={{ color: "var(--surna-text-muted)" }}>Shorts size</label>
                <select
                  style={inputStyle}
                  value={gear.shortsSize ?? ""}
                  onChange={(e) => setGear((g) => ({ ...g, shortsSize: e.target.value || undefined }))}
                >
                  <option value="">Select size</option>
                  {SHIRT_SIZES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </>
            ) : null}

            <label className="text-[12px] font-semibold" style={{ color: "var(--surna-text-muted)" }}>Shoe size (EU)</label>
            <select
              style={inputStyle}
              value={gear.shoeSizeEu ?? ""}
              onChange={(e) => setGear((g) => ({ ...g, shoeSizeEu: e.target.value || undefined }))}
            >
              <option value="">Select size</option>
              {SHOE_SIZES_EU.map((s) => (
                <option key={s} value={s}>EU {s}</option>
              ))}
            </select>

            <label className="text-[12px] font-semibold" style={{ color: "var(--surna-text-muted)" }}>Preferred jersey number</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              max={99}
              value={gear.preferredJerseyNumber ?? ""}
              onChange={(e) =>
                setGear((g) => ({
                  ...g,
                  preferredJerseyNumber: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              placeholder="e.g. 10"
            />

            <label className="text-[12px] font-semibold" style={{ color: "var(--surna-text-muted)" }}>Dominant side</label>
            <select
              style={inputStyle}
              value={gear.dominantSide ?? ""}
              onChange={(e) =>
                setGear((g) => ({
                  ...g,
                  dominantSide: (e.target.value || undefined) as GearProfile["dominantSide"],
                }))
              }
            >
              <option value="">Prefer not to say</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="ambidextrous">Ambidextrous</option>
            </select>

            <label className="text-[12px] font-semibold" style={{ color: "var(--surna-text-muted)" }}>Kit notes</label>
            <textarea
              style={{ ...inputStyle, minHeight: 72 }}
              value={gear.kitNotes ?? ""}
              onChange={(e) => setGear((g) => ({ ...g, kitNotes: e.target.value || undefined }))}
              placeholder="Tall fit, allergy, etc."
              maxLength={500}
            />

            <label className="text-[12px] font-semibold" style={{ color: "var(--surna-text-muted)" }}>Who can see my sizes</label>
            <select
              style={inputStyle}
              value={gear.visibility ?? "team_managers"}
              onChange={(e) =>
                setGear((g) => ({ ...g, visibility: e.target.value as GearProfileVisibility }))
              }
            >
              {(Object.entries(GEAR_VISIBILITY_LABELS) as [GearProfileVisibility, string][]).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>

            <SaveButton
              loading={saveMutation.isPending}
              onClick={() =>
                saveMutation.mutate({
                  gearProfile: {
                    ...gear,
                    shortsSize: shortsSameAsShirt ? gear.shirtSize : gear.shortsSize,
                  },
                })
              }
            />
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
                  markSetupComplete: true,
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
