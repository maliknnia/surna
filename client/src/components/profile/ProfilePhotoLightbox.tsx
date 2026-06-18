import { Share2, Trash2, X } from "lucide-react";
import { deriveModernSources } from "@/lib/imageSources";

export type LightboxPhoto = {
  id: string;
  imageUrl: string;
  caption?: string | null;
};

type ProfilePhotoLightboxProps = {
  photo: LightboxPhoto;
  isOwnProfile?: boolean;
  onClose: () => void;
  onDelete?: (photoId: string) => void;
};

export function ProfilePhotoLightbox({ photo, isOwnProfile, onClose, onDelete }: ProfilePhotoLightboxProps) {
  const handleShare = async () => {
    const url = photo.imageUrl.startsWith("http")
      ? photo.imageUrl
      : `${window.location.origin}${photo.imageUrl}`;
    if (navigator.share) {
      await navigator.share({ title: photo.caption || "Photo", url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const modern = deriveModernSources(photo.imageUrl);
  const img = (
    <img
      src={photo.imageUrl}
      alt={photo.caption || "photo"}
      className="max-h-[85vh] max-w-[95vw] object-contain"
      onClick={(e) => e.stopPropagation()}
    />
  );

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/92 flex flex-col items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4 safe-area-top">
        <button
          type="button"
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
          onClick={(e) => {
            e.stopPropagation();
            void handleShare();
          }}
          aria-label="Share photo"
        >
          <Share2 size={18} />
        </button>
        <button
          type="button"
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      {isOwnProfile && onDelete && !photo.id.startsWith("demo-photo-") && (
        <button
          type="button"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/90 text-white text-sm font-medium"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Delete this photo?")) onDelete(photo.id);
          }}
        >
          <Trash2 size={16} />
          Delete
        </button>
      )}

      <div onClick={(e) => e.stopPropagation()}>
        {modern ? (
          <picture>
            {modern.avif && <source type="image/avif" srcSet={modern.avif} />}
            {modern.webp && <source type="image/webp" srcSet={modern.webp} />}
            {img}
          </picture>
        ) : (
          img
        )}
      </div>

      {photo.caption ? (
        <p className="mt-4 text-center text-sm text-white/80 max-w-md px-4">{photo.caption}</p>
      ) : null}
    </div>
  );
}
