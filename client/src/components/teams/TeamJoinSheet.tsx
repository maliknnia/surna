import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Users, ChevronRight, CheckCircle2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { teamLogoUrl } from "@/lib/teamLogo";
import type { Team } from "@shared/schema";
import {
  fetchTeamJoinTemplate,
  submitTeamJoinApplication,
  formatJoinFee,
  declineTeamInvite,
  type TeamJoinTemplate,
} from "@/lib/teamJoin";
import type { TeamJoinQuestion } from "@shared/teamJoin";

type Props = {
  teamId: string;
  teamName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined?: (currentMembers?: number) => void;
  onPending?: () => void;
};

export function TeamJoinSheet({
  teamId,
  teamName,
  open,
  onOpenChange,
  onJoined,
  onPending,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [agreedDocs, setAgreedDocs] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [feeAcknowledged, setFeeAcknowledged] = useState(false);

  const { data: template, isLoading, isError } = useQuery<TeamJoinTemplate>({
    queryKey: ["/api/teams", teamId, "join-template"],
    queryFn: () => fetchTeamJoinTemplate(teamId),
    enabled: open && !!teamId,
  });

  useEffect(() => {
    if (!open) {
      setAnswers({});
      setAgreedDocs(new Set());
      setMessage("");
      setFeeAcknowledged(false);
    }
  }, [open]);

  const submitMutation = useMutation({
    mutationFn: () =>
      submitTeamJoinApplication(teamId, {
        message: message.trim() || undefined,
        answers,
        agreedDocumentIds: [...agreedDocs],
        feeAcknowledged: (template?.joinFeeCents ?? 0) > 0 ? feeAcknowledged : undefined,
        inviteId: template?.pendingInvite?.id,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my-teams"] });
      if (result.status === "joined") {
        toast({
          title: "You're on the team!",
          description: template?.teamName ?? teamName ?? "Welcome aboard",
        });
        onJoined?.(result.currentMembers);
        onOpenChange(false);
      } else {
        toast({
          title: "Request sent",
          description: "The captain will review your application",
        });
        onPending?.();
        onOpenChange(false);
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't submit",
        description: err.message ?? "Please try again",
        variant: "destructive",
      });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      const id = template?.pendingInvite?.id;
      if (!id) throw new Error("No invite to decline");
      await declineTeamInvite(id);
    },
    onSuccess: () => {
      toast({ title: "Invite declined" });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't decline",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const displayName = template?.teamName ?? teamName ?? "Team";
  const needsApproval = template?.joinPolicy === "approval" && !template?.pendingInvite;
  const feeLabel = template ? formatJoinFee(template.joinFeeCents) : "";
  const isInvite = Boolean(template?.pendingInvite);

  const setAnswer = (q: TeamJoinQuestion, value: string | boolean) => {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
  };

  const toggleDoc = (docId: string, checked: boolean) => {
    setAgreedDocs((prev) => {
      const next = new Set(prev);
      if (checked) next.add(docId);
      else next.delete(docId);
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-[var(--surna-border)] max-h-[92vh] overflow-y-auto"
        style={{ background: "var(--surna-elevated)" }}
        data-testid="team-join-sheet"
      >
        <SheetHeader>
          <SheetTitle style={{ color: "var(--surna-text)" }}>Join {displayName}</SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--surna-text-muted)" }} />
          </div>
        )}

        {isError && (
          <p className="text-sm text-center py-8" style={{ color: "var(--surna-text-secondary)" }}>
            Couldn't load join requirements.
          </p>
        )}

        {template && !isLoading && (
          <div className="space-y-5 mt-4 pb-6">
            {isInvite && (
              <div
                className="rounded-2xl p-3 text-sm"
                style={{
                  background: "var(--surna-bg-highlight)",
                  border: "1px solid var(--surna-border)",
                  color: "var(--surna-text)",
                }}
              >
                You were invited to join this team.
                {template.pendingInvite?.message ? (
                  <p className="text-xs mt-1" style={{ color: "var(--surna-text-secondary)" }}>
                    {template.pendingInvite.message}
                  </p>
                ) : null}
              </div>
            )}
            {/* Team preview */}
            <div
              className="flex items-center gap-3 rounded-2xl p-3"
              style={{
                background: "var(--surna-bg-highlight)",
                border: "1px solid var(--surna-border)",
              }}
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-muted/40 flex items-center justify-center">
                {teamLogoUrl({ logo: template.logo ?? undefined } as Team) ? (
                  <img
                    src={teamLogoUrl({ logo: template.logo ?? undefined } as Team)!}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg">🏆</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate" style={{ color: "var(--surna-text)" }}>
                  {template.teamName}
                </p>
                <p className="text-xs" style={{ color: "var(--surna-text-secondary)" }}>
                  {template.sport}
                  {needsApproval ? " · Captain approval required" : " · Open join"}
                </p>
              </div>
              <Users className="w-4 h-4 flex-shrink-0" style={{ color: "var(--surna-text-muted)" }} />
            </div>

            {/* Pre-questions */}
            {template.requirements.questions.map((q) => (
              <div key={q.id} className="space-y-1.5">
                <Label style={{ color: "var(--surna-text)" }}>
                  {q.label}
                  {q.required ? " *" : ""}
                </Label>
                {q.type === "yesno" ? (
                  <div className="flex gap-2">
                    {(["Yes", "No"] as const).map((label) => {
                      const val = label === "Yes";
                      const selected = answers[q.id] === val;
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setAnswer(q, val)}
                          className="flex-1 h-10 rounded-xl text-sm font-semibold border transition-colors"
                          style={{
                            borderColor: selected ? "var(--surna-accent, hsl(var(--primary)))" : "var(--surna-border)",
                            background: selected ? "var(--surna-bg-highlight)" : "transparent",
                            color: "var(--surna-text)",
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                ) : q.type === "select" && q.options?.length ? (
                  <Select
                    value={typeof answers[q.id] === "string" ? (answers[q.id] as string) : ""}
                    onValueChange={(v) => setAnswer(q, v)}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Choose one" />
                    </SelectTrigger>
                    <SelectContent>
                      {q.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={typeof answers[q.id] === "string" ? (answers[q.id] as string) : ""}
                    onChange={(e) => setAnswer(q, e.target.value)}
                    placeholder="Your answer"
                    className="rounded-xl"
                  />
                )}
              </div>
            ))}

            {/* Documents */}
            {template.requirements.documents.map((doc) => (
              <div
                key={doc.id}
                className="rounded-2xl p-3 space-y-2"
                style={{
                  background: "var(--surna-bg-highlight)",
                  border: "1px solid var(--surna-border)",
                }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
                  {doc.title}
                  {doc.required ? " *" : ""}
                </p>
                <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--surna-text-secondary)" }}>
                  {doc.body}
                </p>
                <label className="flex items-start gap-2 cursor-pointer pt-1">
                  <Checkbox
                    checked={agreedDocs.has(doc.id)}
                    onCheckedChange={(c) => toggleDoc(doc.id, c === true)}
                  />
                  <span className="text-xs leading-snug" style={{ color: "var(--surna-text)" }}>
                    I have read and agree
                  </span>
                </label>
              </div>
            ))}

            {/* Join fee */}
            {template.joinFeeCents > 0 && (
              <div
                className="rounded-2xl p-3 space-y-2"
                style={{
                  background: "var(--surna-bg-highlight)",
                  border: "1px solid var(--surna-border)",
                }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
                  Join fee: {feeLabel}
                </p>
                {template.joinFeeNote && (
                  <p className="text-xs" style={{ color: "var(--surna-text-secondary)" }}>
                    {template.joinFeeNote}
                  </p>
                )}
                <label className="flex items-start gap-2 cursor-pointer">
                  <Checkbox
                    checked={feeAcknowledged}
                    onCheckedChange={(c) => setFeeAcknowledged(c === true)}
                  />
                  <span className="text-xs" style={{ color: "var(--surna-text)" }}>
                    I understand the fee and will arrange payment with the team
                  </span>
                </label>
              </div>
            )}

            {/* Optional message to captain */}
            {needsApproval && (
              <div className="space-y-1.5">
                <Label style={{ color: "var(--surna-text)" }}>Message to captain (optional)</Label>
                <Textarea
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Why do you want to join?"
                  className="rounded-xl"
                />
              </div>
            )}

            <Button
              className="w-full rounded-2xl gap-2"
              disabled={submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
              data-testid="team-join-submit"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  {isInvite ? "Accept & join" : needsApproval ? "Submit request" : "Join team"}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>

            {isInvite && (
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-2xl"
                disabled={declineMutation.isPending}
                onClick={() => declineMutation.mutate()}
              >
                Decline invite
              </Button>
            )}

            {!needsApproval && !isInvite && (
              <p
                className="text-[11px] text-center flex items-center justify-center gap-1"
                style={{ color: "var(--surna-text-muted)" }}
              >
                <CheckCircle2 className="w-3 h-3" />
                You'll be added immediately once requirements are met
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
