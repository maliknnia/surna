import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { MyHubPlace } from "./MyHubPlaceCard";

interface Props {
  place: MyHubPlace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX = 600;

export function UpdatePlaceDescriptionSheet({ place, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (open) setBio(place?.bio ?? "");
  }, [open, place]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!place) throw new Error("No place");
      const r = await apiRequest("PUT", `/api/places/${place.id}`, {
        bio: bio.trim(),
      });
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Description updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/places/me/owned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/places", place?.id] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't update description",
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
        data-testid="update-place-description-sheet"
      >
        <SheetHeader>
          <SheetTitle style={{ color: "var(--surna-text)" }}>
            Update description
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4 pb-4">
          <div className="space-y-1.5">
            <Label htmlFor="place-bio" style={{ color: "var(--surna-text)" }}>
              About this place
            </Label>
            <Textarea
              id="place-bio"
              rows={6}
              maxLength={MAX}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people what makes this place great…"
              data-testid="place-bio-input"
            />
            <div
              className="text-[11px] text-right"
              style={{ color: "var(--surna-text-muted)" }}
            >
              {bio.length}/{MAX}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
              data-testid="place-bio-cancel"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              data-testid="place-bio-save"
            >
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
