import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Video, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStreamSession } from "@/lib/streamingApi";
import { useToast } from "@/hooks/use-toast";

interface GoLiveModalProps {
  open: boolean;
  onClose: () => void;
  onStreamStarted: (streamId: string) => void;
}

export function GoLiveModal({ open, onClose, onStreamStarted }: GoLiveModalProps) {
  const [title, setTitle] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "friends">("public");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createStreamMutation = useMutation({
    mutationFn: async () =>
      createStreamSession({
        title: title.trim(),
        description: privacy === "friends" ? "Friends only" : null,
        streamType: "training",
      }),
    onSuccess: (stream: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/streaming/active"] });
      onStreamStarted(stream.id);
      onClose();
      setTitle("");
      setPrivacy("public");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create stream",
        variant: "destructive",
      });
    },
  });

  const handleGoLive = () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your stream",
        variant: "destructive",
      });
      return;
    }
    createStreamMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-golive">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-pink-500" />
            Go Live
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="stream-title">Stream Title</Label>
            <Input
              id="stream-title"
              data-testid="input-stream-title"
              placeholder="What's happening?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label>Privacy</Label>
            <RadioGroup value={privacy} onValueChange={(v) => setPrivacy(v as "public" | "friends")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" data-testid="radio-public" />
                <Label htmlFor="public" className="font-normal cursor-pointer">
                  Public - Anyone can watch
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="friends" id="friends" data-testid="radio-friends" />
                <Label htmlFor="friends" className="font-normal cursor-pointer">
                  Friends Only
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGoLive}
            disabled={createStreamMutation.isPending}
            className="flex-1 bg-gradient-to-r from-black to-neutral-700 hover:opacity-90"
            data-testid="button-golive"
          >
            {createStreamMutation.isPending ? "Starting..." : "Go Live"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
