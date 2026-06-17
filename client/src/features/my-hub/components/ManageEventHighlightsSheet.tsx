import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { MyHubEvent } from "@/features/my-hub/components/MyHubEventCard";

type HighlightPost = { id: string; content?: string | null; videoUrl?: string | null };

interface Props {
  event: MyHubEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageEventHighlightsSheet({ event, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);

  const { data, isLoading } = useQuery<{ highlights?: HighlightPost[] }>({
    queryKey: ["/api/events", event?.id, "highlights"],
    enabled: open && !!event?.id,
  });

  useEffect(() => {
    if (event && open) {
      const ids = (event as { featured_highlight_ids?: string[]; featuredHighlightIds?: string[] }).featured_highlight_ids
        ?? (event as { featuredHighlightIds?: string[] }).featuredHighlightIds
        ?? [];
      setSelected(ids.filter(Boolean));
    }
  }, [event, open, data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!event) throw new Error("No event");
      const res = await apiRequest("PATCH", `/api/events/${event.id}`, {
        featuredHighlightIds: selected.slice(0, 12),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Highlights updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/events/me/organized"] });
      if (event?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "highlights"] });
        queryClient.invalidateQueries({ queryKey: ["event", event.id] });
      }
      onOpenChange(false);
    },
    onError: () => toast({ title: "Couldn't save highlights", variant: "destructive" }),
  });

  const pool = data?.highlights ?? [];

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 12) return prev;
      return [...prev, id];
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Curate event highlight videos</SheetTitle>
        </SheetHeader>
        <p className="text-[13px] text-muted-foreground mt-2 mb-4">
          Pick up to 12 clips to show first on the event page.
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading videos…</p>
        ) : pool.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No highlight videos yet from attendees.</p>
        ) : (
          <div className="space-y-2">
            {pool.map((post) => {
              const on = selected.includes(post.id);
              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => toggle(post.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left active:opacity-80"
                  style={{
                    background: on ? "hsl(var(--primary) / 0.12)" : "var(--surna-elevated)",
                    border: on ? "1px solid hsl(var(--primary))" : "1px solid var(--surna-border)",
                  }}
                >
                  <div className="w-12 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    {post.videoUrl ? <video src={post.videoUrl} className="w-full h-full object-cover" muted playsInline /> : null}
                  </div>
                  <p className="text-[13px] line-clamp-2 flex-1">{post.content || "Video moment"}</p>
                </button>
              );
            })}
          </div>
        )}
        <Button className="w-full mt-4 rounded-full" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save highlights"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
