import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Video, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  uploadCreateFile,
  uploadCreateImage,
  type UploadedCreateMedia,
} from "@/lib/uploadCreateMedia";
import { cn } from "@/lib/utils";

export type CreateMediaValue = UploadedCreateMedia | null;

type CreateMediaSectionProps = {
  cover?: CreateMediaValue;
  onCoverChange: (value: CreateMediaValue) => void;
  logo?: CreateMediaValue;
  onLogoChange?: (value: CreateMediaValue) => void;
  gallery?: string[];
  onGalleryChange?: (urls: string[]) => void;
  maxGallery?: number;
  coverLabel?: string;
  coverHint?: string;
  /** Allow video as well as photo for the main media slot (team feed, etc.). */
  allowVideo?: boolean;
  className?: string;
};

export function CreateMediaSection({
  cover,
  onCoverChange,
  logo,
  onLogoChange,
  gallery = [],
  onGalleryChange,
  maxGallery = 4,
  coverLabel = "Cover photo",
  coverHint = "Tap to add a photo — shows on cards, map pins, and your profile.",
  allowVideo = false,
  className,
}: CreateMediaSectionProps) {
  const { toast } = useToast();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const pickAndUpload = async (
    file: File | undefined,
    onDone: (value: CreateMediaValue) => void,
    setBusy: (v: boolean) => void,
    asVideoCapable = false,
  ) => {
    if (!file) return;
    setBusy(true);
    try {
      const uploaded = asVideoCapable ? await uploadCreateFile(file) : await uploadCreateImage(file);
      onDone(uploaded);
    } catch (err) {
      toast({
        title: asVideoCapable ? "Upload failed" : "Photo upload failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const showLogo = Boolean(onLogoChange);
  const isVideo =
    cover?.kind === "video" || Boolean(cover?.publicUrl?.match(/\.(mp4|webm|mov)(\?|$)/i));

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
          {coverLabel}
        </p>
        {coverHint ? (
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--surna-text-secondary)" }}>
            {coverHint}
          </p>
        ) : null}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          disabled={uploadingCover}
          className="w-full aspect-[16/10] rounded-2xl overflow-hidden border-2 border-dashed transition-all active:scale-[0.99] relative"
          style={{
            borderColor: cover ? "var(--surna-separator)" : "var(--surna-text-muted, #888)",
            background: "var(--surna-elevated)",
          }}
          data-testid="create-cover-picker"
        >
          {cover?.publicUrl ? (
            <>
              {isVideo ? (
                <video
                  src={cover.publicUrl}
                  className="absolute inset-0 w-full h-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img src={cover.publicUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <span className="absolute bottom-3 left-3 text-xs font-semibold text-white flex items-center gap-1.5">
                {isVideo ? <Video size={14} /> : <Camera size={14} />}
                {isVideo ? "Change video" : "Change cover"}
              </span>
            </>
          ) : (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
              {uploadingCover ? (
                <Loader2 size={28} className="animate-spin" style={{ color: "var(--surna-text-secondary)" }} />
              ) : allowVideo ? (
                <Video size={32} strokeWidth={1.5} style={{ color: "var(--surna-text-secondary)" }} />
              ) : (
                <ImagePlus size={32} strokeWidth={1.5} style={{ color: "var(--surna-text-secondary)" }} />
              )}
              <span className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
                {uploadingCover
                  ? "Uploading…"
                  : allowVideo
                    ? "Add photo or video"
                    : "Add cover photo"}
              </span>
              <span className="text-xs text-center" style={{ color: "var(--surna-text-muted)" }}>
                Optional but recommended
              </span>
            </span>
          )}
        </button>

        {cover?.publicUrl ? (
          <button
            type="button"
            aria-label="Remove media"
            onClick={() => onCoverChange(null)}
            className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center bg-black/60 text-white"
          >
            <X size={16} />
          </button>
        ) : null}

        <input
          ref={coverInputRef}
          type="file"
          accept={allowVideo ? "image/*,video/*" : "image/*"}
          className="hidden"
          onChange={(e) => {
            void pickAndUpload(e.target.files?.[0], onCoverChange, setUploadingCover, allowVideo);
            e.target.value = "";
          }}
        />
      </div>

      {showLogo ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={uploadingLogo}
            className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-dashed shrink-0 flex items-center justify-center relative"
            style={{
              borderColor: logo ? "var(--surna-separator)" : "var(--surna-text-muted, #888)",
              background: "var(--surna-elevated)",
            }}
            data-testid="create-logo-picker"
          >
            {logo?.publicUrl ? (
              <img src={logo.publicUrl} alt="" className="w-full h-full object-cover" />
            ) : uploadingLogo ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Camera size={20} style={{ color: "var(--surna-text-secondary)" }} />
            )}
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
              Logo / badge
            </p>
            <p className="text-xs" style={{ color: "var(--surna-text-secondary)" }}>
              Square image for team avatar
            </p>
          </div>
          {logo?.publicUrl ? (
            <button
              type="button"
              onClick={() => onLogoChange?.(null)}
              className="ml-auto text-xs font-medium shrink-0"
              style={{ color: "var(--surna-text-secondary)" }}
            >
              Remove
            </button>
          ) : null}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void pickAndUpload(e.target.files?.[0], (v) => onLogoChange?.(v), setUploadingLogo);
              e.target.value = "";
            }}
          />
        </div>
      ) : null}

      {onGalleryChange ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold" style={{ color: "var(--surna-text-secondary)" }}>
            More photos ({gallery.length}/{maxGallery})
          </p>
          <div className="flex gap-2 flex-wrap">
            {gallery.map((url) => (
              <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => onGalleryChange(gallery.filter((u) => u !== url))}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {gallery.length < maxGallery ? (
              <button
                type="button"
                disabled={uploadingGallery}
                onClick={() => galleryInputRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center"
                style={{ borderColor: "var(--surna-separator)", background: "var(--surna-elevated)" }}
              >
                {uploadingGallery ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ImagePlus size={20} style={{ color: "var(--surna-text-secondary)" }} />
                )}
              </button>
            ) : null}
          </div>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploadingGallery(true);
              void uploadCreateImage(file)
                .then((uploaded) => onGalleryChange([...gallery, uploaded.publicUrl]))
                .catch((err) => {
                  toast({
                    title: "Photo upload failed",
                    description: err instanceof Error ? err.message : "Try again",
                    variant: "destructive",
                  });
                })
                .finally(() => {
                  setUploadingGallery(false);
                  e.target.value = "";
                });
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
