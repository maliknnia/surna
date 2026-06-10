import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { MyHubTeam } from "./MyHubTeamCard";

interface Props {
  team: MyHubTeam | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostTeamUpdateSheet({ team, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  useEffect(() => {
    if (open) setContent("");
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!team) throw new Error("No team");
      const res = await apiRequest("POST", `/api/teams/${team.id}/updates`, {
        content: content.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Update posted" });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/me/managed"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't post update",
        description: err?.message ?? "Please try again",
        variant: "destructive",
      });
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-[var(--surna-border)] max-h-[80vh] overflow-y-auto"
        style={{ background: "var(--surna-elevated)" }}
        data-testid="post-team-update-sheet"
      >
        <SheetHeader>
          <SheetTitle style={{ color: "var(--surna-text)" }}>
            Post a team update
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4 pb-4">
          <div className="space-y-1.5">
            <Label htmlFor="post-content" style={{ color: "var(--surna-text)" }}>
              Message
            </Label>
            <Textarea
              id="post-content"
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Share a quick update with ${team?.name ?? "the team"}…`}
              data-testid="post-team-update-content"
            />
            <p className="text-[11px]" style={{ color: "var(--surna-text-muted)" }}>
              Posts to your team's general channel. Scheduled posts and
              targeted recruiting are in Pro.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
              data-testid="post-team-update-cancel"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !content.trim()}
              data-testid="post-team-update-submit"
            >
              {mutation.isPending ? "Posting…" : "Post"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
