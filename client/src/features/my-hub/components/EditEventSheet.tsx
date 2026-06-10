import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { MyHubEvent } from "./MyHubEventCard";

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

interface Props {
  event: MyHubEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEventSheet({ event, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (event) {
      setTitle(event.title ?? "");
      setDescription(event.description ?? "");
      setStartsAt(toLocalInput(event.starts_at));
      setEndsAt(toLocalInput(event.ends_at));
      setLocation(event.location ?? "");
    }
  }, [event]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!event) throw new Error("No event");
      const body: Record<string, unknown> = {};
      if (title.trim() && title !== event.title) body.title = title.trim();
      if (description !== (event.description ?? "")) body.description = description;
      if (startsAt && new Date(startsAt).toISOString() !== event.starts_at) {
        body.startsAt = new Date(startsAt).toISOString();
      }
      if (endsAt && (!event.ends_at || new Date(endsAt).toISOString() !== event.ends_at)) {
        body.endsAt = new Date(endsAt).toISOString();
      }
      if (location !== (event.location ?? "")) body.location = location;
      const res = await apiRequest("PATCH", `/api/events/${event.id}`, body);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Event updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/events/me/organized"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-hub/summary"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't update event",
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
        data-testid="edit-event-sheet"
      >
        <SheetHeader>
          <SheetTitle style={{ color: "var(--surna-text)" }}>
            Edit event basics
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4 pb-4">
          <div className="space-y-1.5">
            <Label htmlFor="ev-title" style={{ color: "var(--surna-text)" }}>Title</Label>
            <Input
              id="ev-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="edit-event-title"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-starts" style={{ color: "var(--surna-text)" }}>Starts</Label>
            <Input
              id="ev-starts"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              data-testid="edit-event-starts"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-ends" style={{ color: "var(--surna-text)" }}>Ends</Label>
            <Input
              id="ev-ends"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              data-testid="edit-event-ends"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-location" style={{ color: "var(--surna-text)" }}>Location</Label>
            <Input
              id="ev-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              data-testid="edit-event-location"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-desc" style={{ color: "var(--surna-text)" }}>Description</Label>
            <Textarea
              id="ev-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="edit-event-desc"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
              data-testid="edit-event-cancel"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !title.trim()}
              data-testid="edit-event-save"
            >
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
