import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { MyHubPlace } from "./MyHubPlaceCard";

type HighlightPost = { id: string; content?: string | null; videoUrl?: string | null };

interface Props {
  place: MyHubPlace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManagePlaceHighlightsSheet({ place, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);

  const { data, isLoading } = useQuery<{ highlights?: HighlightPost[] }>({
    queryKey: ["/api/places", place?.id, "highlights"],
    enabled: open && !!place?.id,
  });

  const { data: placeDetail } = useQuery<{ featuredHighlightIds?: string[] }>({
    queryKey: ["/api/places", place?.id],
    enabled: open && !!place?.id,
  });

  useEffect(() => {
    if (place && open) {
      const ids =
        (place as { featuredHighlightIds?: string[] }).featuredHighlightIds ??
        placeDetail?.featuredHighlightIds ??
        [];
      setSelected(ids);
    }
  }, [place, open, placeDetail]);

  const save = useMutation({
    mutationFn: async () => {
      if (!place) throw new Error("No place");
      const res = await apiRequest("PATCH", `/api/places/${place.id}/highlights`, {
        featuredHighlightIds: selected.slice(0, 12),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Highlights updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/places/me/owned"] });
      if (place?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/places", place.id, "highlights"] });
        queryClient.invalidateQueries({ queryKey: ["/api/places", place.id] });
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
          <SheetTitle>Curate venue highlights</SheetTitle>
        </SheetHeader>
        <p className="text-[13px] text-muted-foreground mt-2 mb-4">
          Pick up to 12 clips to show first on your venue page. Other video updates still appear after these.
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading videos…</p>
        ) : pool.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Post video updates from your venue feed first.
          </p>
        ) : (
          <div className="space-y-2">
            {pool.map((post) => {
              const on = selected.includes(post.id);
              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => toggle(post.id)}
                  className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 ${on ? "border-foreground bg-muted/30" : "border-border"}`}
                >
                  <div className="w-12 h-16 rounded-lg overflow-hidden bg-muted/40 shrink-0">
                    {post.videoUrl ? (
                      <video src={post.videoUrl} className="w-full h-full object-cover" muted playsInline />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium line-clamp-2">{post.content || "Highlight clip"}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{on ? "Featured" : "Tap to feature"}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <div className="flex gap-2 mt-4 pb-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save highlights"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
