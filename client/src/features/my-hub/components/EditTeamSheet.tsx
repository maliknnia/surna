import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { MyHubTeam } from "./MyHubTeamCard";

interface Props {
  team: MyHubTeam | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTeamSheet({ team, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (team) {
      setName(team.name ?? "");
      setSport(team.sport ?? "");
      setCity(team.city ?? team.location ?? "");
      setDescription(team.description ?? "");
    }
  }, [team]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!team) throw new Error("No team");
      const body: Record<string, unknown> = {};
      if (name.trim() && name !== team.name) body.name = name.trim();
      if (sport !== (team.sport ?? "")) body.sport = sport;
      if (city !== (team.city ?? team.location ?? "")) body.city = city;
      if (description !== (team.description ?? "")) body.description = description;
      const res = await apiRequest("PATCH", `/api/teams/${team.id}`, body);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Team updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/me/managed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-hub/summary"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't update team",
        description: err?.message ?? "Please try again",
        variant: "destructive",
      });
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-[var(--surna-border)] max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--surna-elevated)" }}
        data-testid="edit-team-sheet"
      >
        <SheetHeader>
          <SheetTitle style={{ color: "var(--surna-text)" }}>
            Edit team basics
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4 pb-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-name" style={{ color: "var(--surna-text)" }}>Name</Label>
            <Input
              id="t-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="edit-team-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-sport" style={{ color: "var(--surna-text)" }}>Sport</Label>
            <Input
              id="t-sport"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              data-testid="edit-team-sport"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-city" style={{ color: "var(--surna-text)" }}>City / Location</Label>
            <Input
              id="t-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              data-testid="edit-team-city"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-desc" style={{ color: "var(--surna-text)" }}>Description</Label>
            <Textarea
              id="t-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="edit-team-desc"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
              data-testid="edit-team-cancel"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !name.trim()}
              data-testid="edit-team-save"
            >
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
