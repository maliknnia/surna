import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaUploader } from "@/components/MediaUploader";
import { Trophy } from "lucide-react";
import type { CompetitiveMatch } from "@shared/schema";
import { useChallengesTheme } from "./challengesTheme";

interface ScoreReporterProps {
  match: CompetitiveMatch;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Match backend validation schema
const reportResultSchema = z.object({
  hostScore: z.number().optional(),
  guestScore: z.number().optional(),
  outcome: z.enum(['hostWin', 'guestWin', 'draw', 'forfeit']),
  notes: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

type ReportResultForm = z.infer<typeof reportResultSchema>;

export default function ScoreReporter({ match, open, onOpenChange }: ScoreReporterProps) {
  const { toast } = useToast();

  const form = useForm<ReportResultForm>({
    resolver: zodResolver(reportResultSchema),
    defaultValues: {
      outcome: "hostWin",
      notes: "",
      attachments: [],
    },
  });

  const reportMutation = useMutation({
    mutationFn: (data: ReportResultForm) => {
      return apiRequest('POST', `/api/competitive-challenges/${match.id}/report`, data);
    },
    onSuccess: async (_, values) => {
      if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
      let winningUserId: string | undefined;
      if (values.outcome === "hostWin" && match.creatorType === "user") {
        winningUserId = match.creatorId;
      }
      if (values.outcome === "guestWin" && match.opponentType === "user") {
        winningUserId = match.opponentId || undefined;
      }

      if (winningUserId) {
        try {
          await apiRequest("POST", "/api/gamification/award-points", {
            userId: winningUserId,
            actionType: "challenge_win",
            matchId: match.id,
          });
        } catch {
          // Non-blocking: keep result reporting successful even if XP call fails.
        }
      }

      try {
        const resultText =
          values.outcome === "draw"
            ? `Challenge "${match.title}" ended in a draw.`
            : `Challenge "${match.title}" result submitted: ${values.outcome}.`;
        await apiRequest("POST", "/api/posts", {
          content: resultText,
          challengeId: match.id,
          sport: match.sport,
        });
      } catch {
        // Non-blocking feed post creation.
      }

      queryClient.invalidateQueries({ queryKey: ['challenge-detail', match.id] });
      queryClient.invalidateQueries({ queryKey: ['challenges-list'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      toast({
        title: "Result Reported!",
        description: "Waiting for opponent confirmation",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to report result",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ReportResultForm) => {
    reportMutation.mutate(data);
  };

  const handleMediaUpload = (files: Array<{ url: string }>) => {
    const currentAttachments = form.getValues("attachments") || [];
    form.setValue("attachments", [...currentAttachments, ...files.map(f => f.url)]);
  };

  const t = useChallengesTheme();
  const fieldStyle = { background: t.inputBg, borderRadius: 14, color: t.textPrimary };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto border-0" style={{ background: t.cardBg, borderRadius: 20, border: `1px solid ${t.cardBorder}` }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: t.textPrimary }}>
            <Trophy className="h-5 w-5" style={{ color: t.iconAccent }} />
            Report Result
          </DialogTitle>
          <DialogDescription style={{ color: t.textMuted }}>
            Enter scores and outcome. Your opponent will confirm.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Score Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hostScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Your Score</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        data-testid="input-host-score"
                        type="number"
                        min="0"
                        placeholder="0"
                        className="border-0 text-foreground"
                        style={fieldStyle}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="guestScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Opponent Score</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        data-testid="input-guest-score"
                        type="number"
                        min="0"
                        placeholder="0"
                        className="border-0 text-foreground"
                        style={fieldStyle}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Outcome Selector */}
            <FormField
              control={form.control}
              name="outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Outcome *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger
                        data-testid="select-outcome"
                        className="border-0 text-foreground"
                        style={fieldStyle}
                      >
                        <SelectValue placeholder="Select outcome" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="hostWin">I Won</SelectItem>
                      <SelectItem value="guestWin">Opponent Won</SelectItem>
                      <SelectItem value="draw">Draw</SelectItem>
                      <SelectItem value="forfeit">Forfeit</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      data-testid="input-notes"
                      placeholder="Any additional comments..."
                      className="border-0 text-foreground placeholder:text-muted-foreground/60"
                      style={fieldStyle}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Media Upload */}
            <div>
              <FormLabel className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Evidence (Optional)</FormLabel>
              <MediaUploader
                maxFiles={5}
                accept="image/*,video/*"
                onUploadComplete={handleMediaUpload}
                className="mt-2"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={reportMutation.isPending}
                data-testid="button-cancel"
                className="flex-1 py-3 rounded-2xl text-[13px] font-bold transition-all active:scale-[0.97]"
                style={{ background: t.secondaryBtnBg, color: t.secondaryBtnText }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reportMutation.isPending}
                data-testid="button-submit-result"
                className="flex-1 py-3 rounded-2xl text-[13px] font-bold transition-all active:scale-[0.97] disabled:opacity-40"
                style={{ background: t.ctaBg, color: t.ctaText }}
              >
                {reportMutation.isPending ? "Reporting..." : "Submit Result"}
              </button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
