import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2 } from "lucide-react";
import type { MyHubPlace } from "./MyHubPlaceCard";
import { capturePhoto } from "@/lib/capacitor/camera";

interface Props {
  place: MyHubPlace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InitResponse {
  mediaId: string | null;
  uploadUrl?: string;
  publicUrl?: string;
  cacheControl?: string;
  uploadMode?: "multipart" | "presigned";
  uploadEndpoint?: string;
}

export function UpdatePlacePhotoSheet({ place, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  useEffect(() => {
    if (!open) {
      setFile(null);
      setCaption("");
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handlePick = (f: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!place) throw new Error("No place");
      if (!file) throw new Error("Pick a photo first");

      // Push the file through the existing media pipeline:
      //   POST /api/media/init      → presigned S3 upload + pending row
      //   PUT  <uploadUrl>          → upload to S3 with required Cache-Control
      //   POST /api/media/complete  → enqueues the background resize worker
      //                                (AVIF/WebP variants)
      // Then attach the resulting publicUrl to the place photo gallery.
      // Images: Sharp compress on server, then S3 (no raw presigned PUT).
      const initRes = await apiRequest("POST", "/api/media/init", {
        kind: "image",
        filename: file.name,
        contentType: file.type || "image/jpeg",
        sizeBytes: file.size,
      });
      const init = (await initRes.json()) as InitResponse;

      if (init.uploadMode === "multipart" && init.uploadEndpoint) {
        const form = new FormData();
        form.append("file", file);
        const uploadRes = await fetch(init.uploadEndpoint, {
          method: "POST",
          body: form,
          credentials: "include",
        });
        if (!uploadRes.ok) throw new Error("Upload to storage failed");
        const uploaded = (await uploadRes.json()) as { publicUrl: string };
        const r = await apiRequest("POST", `/api/places/${place.id}/photos`, {
          imageUrl: uploaded.publicUrl,
          caption: caption.trim() || undefined,
        });
        return r.json();
      }

      const putHeaders: Record<string, string> = {
        "Content-Type": file.type || "image/jpeg",
      };
      if (init.cacheControl) putHeaders["Cache-Control"] = init.cacheControl;

      const putRes = await fetch(init.uploadUrl!, {
        method: "PUT",
        headers: putHeaders,
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload to storage failed");

      await apiRequest("POST", "/api/media/complete", { mediaId: init.mediaId! });

      const r = await apiRequest("POST", `/api/places/${place.id}/photos`, {
        imageUrl: init.publicUrl!,
        caption: caption.trim() || undefined,
      });
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Photo added" });
      queryClient.invalidateQueries({ queryKey: ["/api/places/me/owned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/places", place?.id, "photos"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't add photo",
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
        data-testid="update-place-photo-sheet"
      >
        <SheetHeader>
          <SheetTitle style={{ color: "var(--surna-text)" }}>
            Add a photo
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4 pb-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
            data-testid="place-photo-file-input"
          />
          {!previewUrl ? (
            <button
              type="button"
              onClick={() => void capturePhoto({ source: "gallery" }).then((f) => handlePick(f))}
              className="w-full rounded-2xl flex flex-col items-center justify-center gap-2 py-10"
              style={{
                background: "var(--surna-bg-highlight)",
                border: "1px dashed var(--surna-border)",
                color: "var(--surna-text-secondary)",
              }}
              data-testid="place-photo-pick"
            >
              <ImagePlus className="w-6 h-6" />
              <span className="text-[13px] font-semibold">Choose a photo</span>
              <span className="text-[11px]" style={{ color: "var(--surna-text-muted)" }}>
                JPG, PNG or WebP
              </span>
            </button>
          ) : (
            <div className="space-y-2">
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid var(--surna-border)" }}
              >
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full max-h-72 object-cover"
                  data-testid="place-photo-preview"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void capturePhoto({ source: "gallery" }).then((f) => handlePick(f))}
                disabled={mutation.isPending}
                data-testid="place-photo-replace"
              >
                Replace photo
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="place-photo-caption" style={{ color: "var(--surna-text)" }}>
              Caption (optional)
            </Label>
            <Textarea
              id="place-photo-caption"
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Say something about this photo…"
              data-testid="place-photo-caption"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
              data-testid="place-photo-cancel"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => mutation.mutate()}
              disabled={!file || mutation.isPending}
              data-testid="place-photo-upload"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Uploading…
                </>
              ) : (
                "Add photo"
              )}
            </Button>
          </div>
          <p className="text-[11px]" style={{ color: "var(--surna-text-muted)" }}>
            Photos run through the same media pipeline as the rest of the app
            so they get optimized variants automatically.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
