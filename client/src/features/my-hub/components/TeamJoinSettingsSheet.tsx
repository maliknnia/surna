import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { fetchTeamJoinTemplate } from "@/lib/teamJoin";
import type { MyHubTeam } from "./MyHubTeamCard";
import type { TeamJoinDocument, TeamJoinPolicy, TeamJoinQuestion } from "@shared/teamJoin";

interface Props {
  team: MyHubTeam | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function newQuestion(): TeamJoinQuestion {
  return {
    id: crypto.randomUUID(),
    type: "text",
    label: "",
    required: true,
  };
}

function newDocument(): TeamJoinDocument {
  return {
    id: crypto.randomUUID(),
    title: "",
    body: "",
    required: true,
  };
}

export function TeamJoinSettingsSheet({ team, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [joinPolicy, setJoinPolicy] = useState<TeamJoinPolicy>("open");
  const [isPublic, setIsPublic] = useState(true);
  const [feeEuros, setFeeEuros] = useState("");
  const [feeNote, setFeeNote] = useState("");
  const [questions, setQuestions] = useState<TeamJoinQuestion[]>([]);
  const [documents, setDocuments] = useState<TeamJoinDocument[]>([]);

  const { data: template, isLoading } = useQuery({
    queryKey: ["/api/teams", team?.id, "join-template"],
    queryFn: () => fetchTeamJoinTemplate(team!.id),
    enabled: open && !!team?.id,
  });

  useEffect(() => {
    if (template) {
      setJoinPolicy(template.joinPolicy);
      setIsPublic(template.isPublic);
      setFeeEuros(template.joinFeeCents > 0 ? String(template.joinFeeCents / 100) : "");
      setFeeNote(template.joinFeeNote ?? "");
      setQuestions(template.requirements.questions);
      setDocuments(template.requirements.documents);
    }
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!team) throw new Error("No team");
      const cents = feeEuros.trim() ? Math.round(parseFloat(feeEuros) * 100) : 0;
      if (Number.isNaN(cents) || cents < 0) throw new Error("Invalid fee amount");

      const cleanedQuestions = questions
        .filter((q) => q.label.trim())
        .map((q) => ({ ...q, label: q.label.trim() }));
      const cleanedDocs = documents
        .filter((d) => d.title.trim() && d.body.trim())
        .map((d) => ({ ...d, title: d.title.trim(), body: d.body.trim() }));

      const res = await apiRequest("PUT", `/api/teams/${team.id}/join-template`, {
        joinPolicy,
        isPublic,
        joinFeeCents: cents,
        joinFeeNote: feeNote.trim() || null,
        requirements: { questions: cleanedQuestions, documents: cleanedDocs },
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Join settings saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", team?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", team?.id, "join-template"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/me/managed"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't save",
        description: err.message ?? "Please try again",
        variant: "destructive",
      });
    },
  });

  const policyOptions: { id: TeamJoinPolicy; label: string; hint: string }[] = [
    { id: "open", label: "Open", hint: "Auto-join when requirements are met" },
    { id: "approval", label: "Approval", hint: "Captain reviews every application" },
    { id: "invite_only", label: "Invite only", hint: "No public join button" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-[var(--surna-border)] max-h-[92vh] overflow-y-auto"
        style={{ background: "var(--surna-elevated)" }}
        data-testid="team-join-settings-sheet"
      >
        <SheetHeader>
          <SheetTitle style={{ color: "var(--surna-text)" }}>
            Join requirements
            {team ? ` · ${team.name}` : ""}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--surna-text-muted)" }} />
          </div>
        ) : (
          <div className="space-y-5 mt-4 pb-6">
            <div className="space-y-2">
              <Label style={{ color: "var(--surna-text)" }}>Who can join?</Label>
              <div className="grid grid-cols-1 gap-2">
                {policyOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setJoinPolicy(opt.id)}
                    className="rounded-xl p-3 text-left border transition-colors"
                    style={{
                      borderColor: joinPolicy === opt.id ? "var(--surna-border)" : "var(--surna-border)",
                      background: joinPolicy === opt.id ? "var(--surna-bg-highlight)" : "transparent",
                    }}
                  >
                    <p className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
                      {opt.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--surna-text-secondary)" }}>
                      {opt.hint}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 py-1">
              <span className="text-[13px] font-medium" style={{ color: "var(--surna-text)" }}>
                Listed in public discovery
              </span>
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label style={{ color: "var(--surna-text)" }}>Join fee (optional)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0"
                  value={feeEuros}
                  onChange={(e) => setFeeEuros(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label style={{ color: "var(--surna-text)" }}>Fee note</Label>
                <Input
                  placeholder="e.g. Pay at first training"
                  value={feeNote}
                  onChange={(e) => setFeeNote(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label style={{ color: "var(--surna-text)" }}>Pre-join questions</Label>
                <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => setQuestions((q) => [...q, newQuestion()])}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              </div>
              {questions.length === 0 && (
                <p className="text-xs" style={{ color: "var(--surna-text-muted)" }}>
                  No questions yet — applicants join without extra fields.
                </p>
              )}
              {questions.map((q, i) => (
                <div key={q.id} className="rounded-xl p-3 space-y-2" style={{ border: "1px solid var(--surna-border)" }}>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Question label"
                      value={q.label}
                      onChange={(e) => {
                        const next = [...questions];
                        next[i] = { ...q, label: e.target.value };
                        setQuestions(next);
                      }}
                      className="rounded-lg flex-1"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setQuestions((prev) => prev.filter((x) => x.id !== q.id))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label style={{ color: "var(--surna-text)" }}>Agreements</Label>
                <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => setDocuments((d) => [...d, newDocument()])}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              </div>
              {documents.map((d, i) => (
                <div key={d.id} className="rounded-xl p-3 space-y-2" style={{ border: "1px solid var(--surna-border)" }}>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Title (e.g. Code of conduct)"
                      value={d.title}
                      onChange={(e) => {
                        const next = [...documents];
                        next[i] = { ...d, title: e.target.value };
                        setDocuments(next);
                      }}
                      className="rounded-lg flex-1"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setDocuments((prev) => prev.filter((x) => x.id !== d.id))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Textarea
                    rows={3}
                    placeholder="Agreement text members must accept"
                    value={d.body}
                    onChange={(e) => {
                      const next = [...documents];
                      next[i] = { ...d, body: e.target.value };
                      setDocuments(next);
                    }}
                    className="rounded-lg"
                  />
                </div>
              ))}
            </div>

            <Button
              className="w-full rounded-2xl"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Saving…" : "Save join settings"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
