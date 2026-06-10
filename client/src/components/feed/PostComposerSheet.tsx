import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSurnaCamera } from "@/features/camera";
import { createTextPost, invalidateFeedQueries } from "@/lib/postActions";
import { PostComposeFields } from "./PostComposeFields";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PostComposerSheet({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { openCamera } = useSurnaCamera();

  const [content, setContent] = useState("");
  const [sport, setSport] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (open) {
      setContent("");
      setSport("");
      setLocation("");
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () =>
      createTextPost({
        content,
        sport: sport || undefined,
        location: location || undefined,
      }),
    onSuccess: () => {
      toast({ title: "Posted to feed" });
      invalidateFeedQueries(queryClient);
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Couldn't post",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
    },
  });

  const openMediaCamera = () => {
    onOpenChange(false);
    openCamera({
      source: "feed",
      mode: "photo",
      onFeedPosted: () => invalidateFeedQueries(queryClient),
      onStoryPosted: () => queryClient.invalidateQueries({ queryKey: ["/api/stories"] }),
    });
  };

  const canPost = content.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-[var(--surna-border)] max-h-[88vh] overflow-y-auto"
        style={{ background: "var(--surna-elevated)" }}
        data-testid="post-composer-sheet"
      >
        <SheetHeader>
          <SheetTitle style={{ color: "var(--surna-text)" }}>New post</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4 pb-4">
          <PostComposeFields
            content={content}
            sport={sport}
            location={location}
            onContentChange={setContent}
            onSportChange={setSport}
            onLocationChange={setLocation}
          />

          <Button
            type="button"
            variant="outline"
            className="w-full rounded-2xl gap-2"
            onClick={openMediaCamera}
          >
            <Camera className="h-4 w-4" />
            Add photo or video
          </Button>

          <Button
            type="button"
            className="w-full rounded-2xl"
            disabled={!canPost || mutation.isPending}
            onClick={() => mutation.mutate()}
            data-testid="post-composer-submit"
          >
            {mutation.isPending ? "Posting…" : "Post to feed"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
