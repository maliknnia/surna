import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import { SPORTS_CATEGORIES, POPULAR_SPORTS } from "@shared/sportsData";
import {
  SurnaEmbeddedBody,
  SurnaEmbeddedHeader,
  SurnaEmbeddedPanel,
  SurnaFullscreenOverlay,
} from "@/components/ui/SurnaEmbeddedCard";

type Props = {
  user: User;
  onComplete: () => void;
};

function sportKey(name: string): string {
  return name.toLowerCase();
}

const fieldSelectClass =
  "w-full mt-1 rounded-md px-3 py-2 text-sm bg-[var(--surna-surface)] border border-[var(--surna-border)] text-[var(--surna-text)]";

export default function ProfessionalProfileSetup({ user, onComplete }: Props) {
  const primarySport =
    user.primarySport || user.sport || (user as User & { profile?: { sports?: string[] } }).profile?.sports?.[0] || "";
  const [sport, setSport] = useState(primarySport || "Football");
  const [position, setPosition] = useState(user.position || "");
  const [preferredFoot, setPreferredFoot] = useState("");
  const [clubHistory, setClubHistory] = useState("");
  const [gaaCode, setGaaCode] = useState("");
  const [gaaCounty, setGaaCounty] = useState("");
  const [gaaClub, setGaaClub] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightClass, setWeightClass] = useState(user.weightClass || "");
  const [wins, setWins] = useState(String(user.fightRecordWins ?? ""));
  const [losses, setLosses] = useState(String(user.fightRecordLosses ?? ""));
  const [draws, setDraws] = useState(String(user.fightRecordDraws ?? ""));
  const [kos, setKos] = useState(String(user.fightRecordKos ?? ""));
  const [stance, setStance] = useState(user.stance || "");
  const [amateurOrPro, setAmateurOrPro] = useState(user.amateurOrPro || "");
  const [iabaNumber, setIabaNumber] = useState(user.iabaNumber || "");
  const [medicalExpiry, setMedicalExpiry] = useState("");
  const [gymAffiliation, setGymAffiliation] = useState(user.gymAffiliation || "");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sk = useMemo(() => sportKey(sport), [sport]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        primarySport: sport,
        position: position || undefined,
      };
      if (sk.includes("football") || sk.includes("soccer")) {
        body.preferredFoot = preferredFoot || undefined;
        body.clubHistory = clubHistory || undefined;
      }
      if (sk.includes("gaa") || sk.includes("hurling") || sk.includes("gaelic")) {
        body.gaaCode = gaaCode || undefined;
        body.gaaCounty = gaaCounty || undefined;
        body.gaaClub = gaaClub || undefined;
      }
      if (sk.includes("box")) {
        body.weightClass = weightClass || undefined;
        body.fightRecordWins = wins ? Number(wins) : undefined;
        body.fightRecordLosses = losses ? Number(losses) : undefined;
        body.fightRecordDraws = draws ? Number(draws) : undefined;
        body.fightRecordKos = kos ? Number(kos) : undefined;
        body.stance = stance || undefined;
        body.amateurOrPro = amateurOrPro || undefined;
        body.iabaNumber = iabaNumber || undefined;
        body.medicalClearanceExpiry = medicalExpiry || undefined;
        body.gymAffiliation = gymAffiliation || undefined;
      }
      if (sk.includes("basketball") || sk.includes("volleyball")) {
        body.heightCm = heightCm ? Number(heightCm) : undefined;
      }

      const res = await fetch("/api/profile/sport-identity", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to save profile");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Professional profile saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onComplete();
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const popularSports = SPORTS_CATEGORIES.filter((s) => POPULAR_SPORTS.includes(s.name));

  return (
    <SurnaFullscreenOverlay scrollable>
      <SurnaEmbeddedPanel maxWidth="max-w-xl">
        <SurnaEmbeddedHeader
          title="Professional profile"
          subtitle={`Sport-specific details for ${user.email}`}
        />
        <SurnaEmbeddedBody className="space-y-4">
          <div>
            <Label style={{ color: "var(--surna-text)" }}>Sport</Label>
            <select className={fieldSelectClass} value={sport} onChange={(e) => setSport(e.target.value)}>
              {popularSports.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.icon} {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label style={{ color: "var(--surna-text)" }}>Position</Label>
            <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Your position" />
          </div>

          {(sk.includes("football") || sk.includes("soccer")) && (
            <>
              <div>
                <Label style={{ color: "var(--surna-text)" }}>Preferred foot</Label>
                <Input value={preferredFoot} onChange={(e) => setPreferredFoot(e.target.value)} placeholder="Left / Right / Both" />
              </div>
              <div>
                <Label style={{ color: "var(--surna-text)" }}>Club history</Label>
                <Input value={clubHistory} onChange={(e) => setClubHistory(e.target.value)} placeholder="Previous clubs" />
              </div>
            </>
          )}

          {(sk.includes("gaa") || sk.includes("hurling") || sk.includes("gaelic")) && (
            <>
              <div>
                <Label style={{ color: "var(--surna-text)" }}>Code</Label>
                <Input value={gaaCode} onChange={(e) => setGaaCode(e.target.value)} placeholder="Football / Hurling / Camogie" />
              </div>
              <div>
                <Label style={{ color: "var(--surna-text)" }}>County</Label>
                <Input value={gaaCounty} onChange={(e) => setGaaCounty(e.target.value)} />
              </div>
              <div>
                <Label style={{ color: "var(--surna-text)" }}>Club</Label>
                <Input value={gaaClub} onChange={(e) => setGaaClub(e.target.value)} />
              </div>
            </>
          )}

          {sk.includes("box") && (
            <>
              <div>
                <Label style={{ color: "var(--surna-text)" }}>Weight class</Label>
                <Input value={weightClass} onChange={(e) => setWeightClass(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label style={{ color: "var(--surna-text)" }}>Wins</Label>
                  <Input type="number" value={wins} onChange={(e) => setWins(e.target.value)} />
                </div>
                <div>
                  <Label style={{ color: "var(--surna-text)" }}>Losses</Label>
                  <Input type="number" value={losses} onChange={(e) => setLosses(e.target.value)} />
                </div>
                <div>
                  <Label style={{ color: "var(--surna-text)" }}>Draws</Label>
                  <Input type="number" value={draws} onChange={(e) => setDraws(e.target.value)} />
                </div>
                <div>
                  <Label style={{ color: "var(--surna-text)" }}>KOs</Label>
                  <Input type="number" value={kos} onChange={(e) => setKos(e.target.value)} />
                </div>
              </div>
              <div>
                <Label style={{ color: "var(--surna-text)" }}>Stance</Label>
                <Input value={stance} onChange={(e) => setStance(e.target.value)} placeholder="Orthodox / Southpaw" />
              </div>
              <div>
                <Label style={{ color: "var(--surna-text)" }}>Amateur or pro</Label>
                <Input value={amateurOrPro} onChange={(e) => setAmateurOrPro(e.target.value)} />
              </div>
              <div>
                <Label style={{ color: "var(--surna-text)" }}>IABA number</Label>
                <Input value={iabaNumber} onChange={(e) => setIabaNumber(e.target.value)} />
              </div>
              <div>
                <Label style={{ color: "var(--surna-text)" }}>Medical clearance expiry</Label>
                <Input type="date" value={medicalExpiry} onChange={(e) => setMedicalExpiry(e.target.value)} />
              </div>
              <div>
                <Label style={{ color: "var(--surna-text)" }}>Gym affiliation</Label>
                <Input value={gymAffiliation} onChange={(e) => setGymAffiliation(e.target.value)} />
              </div>
            </>
          )}

          {(sk.includes("basketball") || sk.includes("volleyball")) && (
            <div>
              <Label style={{ color: "var(--surna-text)" }}>Height (cm)</Label>
              <Input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="e.g. 185" />
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" onClick={onComplete} className="text-[var(--surna-text-secondary)]">
              Skip for now
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="rounded-full font-bold"
              style={{ background: "var(--surna-text)", color: "var(--surna-bg)" }}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & continue"}
            </Button>
          </div>
        </SurnaEmbeddedBody>
      </SurnaEmbeddedPanel>
    </SurnaFullscreenOverlay>
  );
}
