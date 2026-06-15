import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Zap, MapPin, Clock, Users, Trophy, Eye, CheckCircle2 } from "lucide-react";
import { createHubPath } from "@/lib/createHub";
import { ROUTES } from "@/navigation";
import { invalidateMyHubQueries } from "@/lib/hubQueries";
import {
  CreateFlowShell,
  FlowFooterButton,
  type CreateFlowStep,
} from "@/components/create/CreateFlowShell";
import {
  CreateMediaSection,
  type CreateMediaValue,
} from "@/components/create/CreateMediaSection";
import { useHydrateCreateDraft } from "@/hooks/useHydrateCreateDraft";

const SPORTS = [
  "Football", "Basketball", "Tennis", "Volleyball", "Cricket", "Baseball",
  "Soccer", "Rugby", "GAA", "Hurling", "Hockey", "Badminton", "Table Tennis", "Swimming",
];
const SKILL_LEVELS = [
  { value: "any", label: "Any Level" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

const STEPS: CreateFlowStep[] = [
  { id: 1, label: "Photo & sport", icon: Trophy },
  { id: 2, label: "Players", icon: Users },
  { id: 3, label: "Go live", icon: CheckCircle2 },
];

function getTimeOptions() {
  const options = [];
  const now = new Date();
  options.push({ label: "Now", value: new Date(now.getTime() + 5 * 60000).toISOString() });
  options.push({ label: "In 30 min", value: new Date(now.getTime() + 30 * 60000).toISOString() });
  options.push({ label: "In 1 hour", value: new Date(now.getTime() + 60 * 60000).toISOString() });
  options.push({ label: "In 2 hours", value: new Date(now.getTime() + 120 * 60000).toISOString() });
  options.push({ label: "In 3 hours", value: new Date(now.getTime() + 180 * 60000).toISOString() });
  return options;
}

export default function CreateInstantTeam() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const timeOptions = getTimeOptions();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [playersNeeded, setPlayersNeeded] = useState(10);
  const [skillLevel, setSkillLevel] = useState("any");
  const [visibility, setVisibility] = useState("public");
  const [startTime, setStartTime] = useState(timeOptions[0].value);
  const [locationName, setLocationName] = useState("");
  const [description, setDescription] = useState("");
  const [lat] = useState(40.7128);
  const [lng] = useState(-74.006);
  const [coverMedia, setCoverMedia] = useState<CreateMediaValue>(null);

  useHydrateCreateDraft({
    onCover: setCoverMedia,
    onTitle: setName,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/instant-teams", {
        name: name || `${sport} Game`,
        sport,
        playersNeeded,
        skillLevel,
        visibility,
        startTime,
        locationName,
        description,
        lat: lat.toString(),
        lng: lng.toString(),
      });
      return res.json();
    },
    onSuccess: async () => {
      toast({
        title: "Game created!",
        description: "Players can join now. Manage it from pickup games in the hub.",
      });
      await invalidateMyHubQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["/api/instant-teams"] });
      navigate(ROUTES.instantJoin);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const canAdvance = step === 1 ? Boolean(sport) : step === 2 ? playersNeeded >= 2 : true;

  const footer =
    step < 3 ? (
      <FlowFooterButton
        label="Continue"
        onClick={() => {
          if (!canAdvance) {
            toast({ title: "Pick a sport", description: "Choose what you're playing.", variant: "destructive" });
            return;
          }
          setStep((s) => s + 1);
        }}
        disabled={!canAdvance}
      />
    ) : (
      <FlowFooterButton
        label={createMutation.isPending ? "Creating…" : "Create game"}
        onClick={() => {
          if (!sport) {
            toast({ title: "Pick a sport", variant: "destructive" });
            return;
          }
          if (!locationName.trim()) {
            toast({
              title: "Add a location",
              description: "Tell players where to meet before going live.",
              variant: "destructive",
            });
            return;
          }
          createMutation.mutate();
        }}
        loading={createMutation.isPending}
        disabled={!sport || playersNeeded < 2}
      />
    );

  return (
    <CreateFlowShell
      title="Pickup game"
      subtitle="Find players starting soon"
      steps={STEPS}
      currentStep={step}
      onBack={() => (step > 1 ? setStep(step - 1) : navigate(createHubPath("pickup")))}
      footer={footer}
    >
      {step === 1 ? (
        <div className="space-y-5">
          <CreateMediaSection
            cover={coverMedia}
            onCoverChange={setCoverMedia}
            coverLabel="Game cover"
            coverHint="Shows on pickup cards so players recognize your game."
          />

          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--surna-text)" }}>Sport & time</h2>
            <p className="text-sm mt-1" style={{ color: "var(--surna-text-secondary)" }}>
              What are you playing, and when?
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "var(--surna-text-secondary)" }}>
              <Trophy size={14} /> Sport *
            </label>
            <div className="flex flex-wrap gap-2">
              {SPORTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSport(s)}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: sport === s ? "#000" : "var(--surna-elevated)",
                    color: sport === s ? "#fff" : "var(--surna-text-secondary)",
                    border: sport === s ? "1px solid #000" : "1px solid var(--surna-separator)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: "var(--surna-text-secondary)" }}>Game name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={sport ? `${sport} Pickup Game` : "e.g. Sunday Football"}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--surna-elevated)", color: "var(--surna-text)", border: "1px solid var(--surna-separator)" }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "var(--surna-text-secondary)" }}>
              <Clock size={14} /> When
            </label>
            <div className="flex flex-wrap gap-2">
              {timeOptions.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setStartTime(t.value)}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: startTime === t.value ? "#000" : "var(--surna-elevated)",
                    color: startTime === t.value ? "#fff" : "var(--surna-text-secondary)",
                    border: startTime === t.value ? "1px solid #000" : "1px solid var(--surna-separator)",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--surna-text)" }}>Who can join?</h2>
            <p className="text-sm mt-1" style={{ color: "var(--surna-text-secondary)" }}>
              Set headcount and skill so the right players show up.
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "var(--surna-text-secondary)" }}>
              <Users size={14} /> Players needed
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setPlayersNeeded(Math.max(2, playersNeeded - 1))}
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                style={{ background: "var(--surna-elevated)", color: "var(--surna-text)", border: "1px solid var(--surna-separator)" }}
              >
                -
              </button>
              <span className="text-2xl font-bold min-w-[40px] text-center" style={{ color: "#000" }}>{playersNeeded}</span>
              <button
                type="button"
                onClick={() => setPlayersNeeded(Math.min(30, playersNeeded + 1))}
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                style={{ background: "var(--surna-elevated)", color: "var(--surna-text)", border: "1px solid var(--surna-separator)" }}
              >
                +
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "var(--surna-text-secondary)" }}>
              <Trophy size={14} /> Skill level
            </label>
            <div className="flex flex-wrap gap-2">
              {SKILL_LEVELS.map((sl) => (
                <button
                  key={sl.value}
                  type="button"
                  onClick={() => setSkillLevel(sl.value)}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: skillLevel === sl.value ? "#000" : "var(--surna-elevated)",
                    color: skillLevel === sl.value ? "#fff" : "var(--surna-text-secondary)",
                    border: skillLevel === sl.value ? "1px solid #000" : "1px solid var(--surna-separator)",
                  }}
                >
                  {sl.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "var(--surna-text-secondary)" }}>
              <Eye size={14} /> Visibility
            </label>
            <div className="flex gap-2">
              {[{ value: "public", label: "Public" }, { value: "invite-only", label: "Invite Only" }].map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setVisibility(v.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: visibility === v.value ? "#000" : "var(--surna-elevated)",
                    color: visibility === v.value ? "#fff" : "var(--surna-text-secondary)",
                    border: visibility === v.value ? "1px solid #000" : "1px solid var(--surna-separator)",
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--surna-text)" }}>Location & launch</h2>
            <p className="text-sm mt-1" style={{ color: "var(--surna-text-secondary)" }}>
              Add a spot so players know where to meet.
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "var(--surna-text-secondary)" }}>
              <MapPin size={14} /> Location
            </label>
            <input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Central Park, Field 3"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--surna-elevated)", color: "var(--surna-text)", border: "1px solid var(--surna-separator)" }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: "var(--surna-text-secondary)" }}>Details (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any extra info players should know…"
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ background: "var(--surna-elevated)", color: "var(--surna-text)", border: "1px solid var(--surna-separator)" }}
            />
          </div>
          <div
            className="rounded-2xl p-4 space-y-2 text-sm"
            style={{ background: "var(--surna-elevated)", border: "1px solid var(--surna-separator)" }}
          >
            <p className="font-bold flex items-center gap-2" style={{ color: "var(--surna-text)" }}>
              <Zap size={16} /> {name || (sport ? `${sport} Game` : "Your game")}
            </p>
            <p style={{ color: "var(--surna-text-secondary)" }}>{sport} · {playersNeeded} players · {skillLevel}</p>
            {locationName ? <p style={{ color: "var(--surna-text-secondary)" }}>{locationName}</p> : null}
            {coverMedia?.publicUrl ? (
              <img src={coverMedia.publicUrl} alt="" className="w-full h-28 rounded-xl object-cover mt-2" />
            ) : null}
          </div>
        </div>
      ) : null}
    </CreateFlowShell>
  );
}
