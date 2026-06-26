import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { logTeamGame, type TeamGameResult } from "@/lib/teamGames";
import { getSportLabels } from "@/lib/sportLabels";
import type { MyHubTeam } from "./MyHubTeamCard";

interface Props {
  team: MyHubTeam | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type MemberRow = {
  userId: string;
  user?: { id?: string; firstName?: string | null; lastName?: string | null; displayName?: string | null };
};

function memberName(m: MemberRow) {
  const u = m.user;
  if (u?.displayName?.trim()) return u.displayName.trim();
  const full = `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim();
  return full || "Player";
}

const RESULT_OPTIONS: { id: TeamGameResult; label: string }[] = [
  { id: "win", label: "Win" },
  { id: "loss", label: "Loss" },
  { id: "draw", label: "Draw" },
];

export function LogTeamGameSheet({ team, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const labels = getSportLabels(team?.sport);
  const [opponentName, setOpponentName] = useState("");
  const [result, setResult] = useState<TeamGameResult>("win");
  const [ourScore, setOurScore] = useState("");
  const [theirScore, setTheirScore] = useState("");
  const [playedAt, setPlayedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["/api/teams", team?.id, "members", "log-game"],
    enabled: open && !!team?.id,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/teams/${team!.id}/members`);
      const json = await res.json();
      const rows = (json.members ?? []) as Array<{ userId: string; user?: MemberRow["user"] }>;
      return rows.map((r) => ({
        userId: r.userId,
        user: r.user,
      }));
    },
  });

  useEffect(() => {
    if (open) {
      setOpponentName("");
      setResult("win");
      setOurScore("");
      setTheirScore("");
      setNotes("");
      setPlayedAt(new Date().toISOString().slice(0, 10));
      setSelected(new Set());
    }
  }, [open, team?.id]);

  const togglePlayer = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(members.map((m) => m.userId).filter(Boolean)));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!team) throw new Error("No team");
      const parseScore = (v: string) => {
        if (!v.trim()) return undefined;
        const n = parseInt(v, 10);
        if (Number.isNaN(n) || n < 0) throw new Error("Scores must be whole numbers");
        return n;
      };
      await logTeamGame(team.id, {
        opponentName: opponentName.trim(),
        result,
        ourScore: parseScore(ourScore),
        theirScore: parseScore(theirScore),
        playerIds: [...selected],
        playedAt: playedAt ? new Date(playedAt).toISOString() : undefined,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast({ title: `${labels.activityNoun.charAt(0).toUpperCase()}${labels.activityNoun.slice(1)} logged` });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", team?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", team?.id, "games"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/me/managed"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't log game",
        description: err.message ?? "Please try again",
        variant: "destructive",
      });
    },
  });

  const canSubmit = useMemo(
    () => opponentName.trim().length > 0 && selected.size > 0 && !mutation.isPending,
    [opponentName, selected.size, mutation.isPending],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-[var(--surna-border)] max-h-[92vh] overflow-y-auto"
        style={{ background: "var(--surna-elevated)" }}
        data-testid="log-team-game-sheet"
      >
        <SheetHeader>
          <SheetTitle style={{ color: "var(--surna-text)" }}>{labels.logActivityTitle}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4 pb-6">
          <div className="space-y-1.5">
            <Label htmlFor="game-opponent" style={{ color: "var(--surna-text)" }}>
              {labels.opponentLabel}
            </Label>
            <Input
              id="game-opponent"
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              placeholder={labels.opponentPlaceholder}
              data-testid="log-game-opponent"
            />
          </div>

          <div className="space-y-1.5">
            <Label style={{ color: "var(--surna-text)" }}>Result</Label>
            <div className="flex gap-2">
              {RESULT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setResult(opt.id)}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
                  style={{
                    background: result === opt.id ? "var(--surna-accent)" : "var(--surna-void)",
                    color: result === opt.id ? "#000" : "var(--surna-text-secondary)",
                    border: "1px solid var(--surna-border)",
                  }}
                  data-testid={`log-game-result-${opt.id}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="game-our-score" style={{ color: "var(--surna-text)" }}>
                Our score
              </Label>
              <Input
                id="game-our-score"
                inputMode="numeric"
                value={ourScore}
                onChange={(e) => setOurScore(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="game-their-score" style={{ color: "var(--surna-text)" }}>
                Their score
              </Label>
              <Input
                id="game-their-score"
                inputMode="numeric"
                value={theirScore}
                onChange={(e) => setTheirScore(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="game-date" style={{ color: "var(--surna-text)" }}>
              Date played
            </Label>
            <Input
              id="game-date"
              type="date"
              value={playedAt}
              onChange={(e) => setPlayedAt(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label style={{ color: "var(--surna-text)" }}>{labels.whoParticipated}</Label>
              <button
                type="button"
                className="text-[12px] font-semibold"
                style={{ color: "var(--surna-accent)" }}
                onClick={selectAll}
              >
                Select all
              </button>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--surna-text-muted)" }} />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const active = selected.has(m.userId);
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => togglePlayer(m.userId)}
                      className="px-3 py-1.5 rounded-full text-[12px] font-medium"
                      style={{
                        background: active ? "var(--surna-accent)" : "var(--surna-void)",
                        color: active ? "#000" : "var(--surna-text-secondary)",
                        border: "1px solid var(--surna-border)",
                      }}
                    >
                      {memberName(m)}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[11px]" style={{ color: "var(--surna-text-muted)" }}>
              Selected {labels.memberNoun.toLowerCase()} get a profile {labels.activityNoun} record (visible by default).
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="game-notes" style={{ color: "var(--surna-text)" }}>
              Notes
            </Label>
            <Textarea
              id="game-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional match notes"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button className="flex-1" disabled={!canSubmit} onClick={() => mutation.mutate()} data-testid="log-game-submit">
              {mutation.isPending ? "Saving…" : `Save ${labels.activityNoun}`}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
