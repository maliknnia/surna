import { useState, useRef } from 'react';
import { Image as ImageIcon, Plus, X, Trash2 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient, getQueryFn } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { LazyImage } from '@/components/ui/lazy-image';
import { deriveModernSources, deriveLqipPlaceholder } from '@/lib/imageSources';
import { capturePhoto } from '@/lib/capacitor/camera';

interface UserPhoto {
  id: string;
  userId: string;
  imageUrl: string;
  caption?: string | null;
  createdAt?: string;
}

interface GalleryProps {
  userId: string;
  isOwnProfile?: boolean;
}

export default function Gallery({ userId, isOwnProfile = false }: GalleryProps) {
  const { toast } = useToast();
  const [lightbox, setLightbox] = useState<UserPhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: photos = [], isLoading } = useQuery<UserPhoto[]>({
    queryKey: ['/api/users', userId, 'photos'],
    queryFn: getQueryFn({ on401: 'returnNull' }) as any,
    enabled: !!userId,
  });

  const addPhoto = useMutation({
    mutationFn: async (payload: { imageUrl: string; caption?: string; width?: number; height?: number }) => {
      return apiRequest('POST', `/api/users/${userId}/photos`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'photos'] });
      toast({ title: 'Photo added' });
    },
    onError: () => toast({ title: 'Upload failed', variant: 'destructive' }),
  });

  const deletePhoto = useMutation({
    mutationFn: async (photoId: string) => apiRequest('DELETE', `/api/users/photos/${photoId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'photos'] });
      setLightbox(null);
      toast({ title: 'Photo deleted' });
    },
  });

  const processPhotoFile = async (file: File) => {
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        const img = new Image();
        img.onload = () => {
          addPhoto.mutate({ imageUrl: dataUrl, width: img.width, height: img.height });
          setUploading(false);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
      toast({ title: 'Upload failed', variant: 'destructive' });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processPhotoFile(file);
  };

  const handleAddPhoto = async () => {
    const file = await capturePhoto({ source: 'gallery' });
    if (file) await processPhotoFile(file);
    else fileInputRef.current?.click();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="aspect-square bg-muted/40 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {isOwnProfile && (
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            data-testid="input-photo-upload"
          />
          <Button
            onClick={() => void handleAddPhoto()}
            disabled={uploading}
            className="gap-2"
            data-testid="button-add-photo"
          >
            <Plus size={18} />
            {uploading ? 'Uploading…' : 'Add photo'}
          </Button>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="text-center py-12">
          <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No photos yet</p>
          {isOwnProfile && (
            <p className="text-muted-foreground/60 text-sm mt-2">Tap "Add photo" to share your first shot.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setLightbox(p)}
              className="aspect-square overflow-hidden bg-muted/40 hover:opacity-90 transition"
              data-testid={`button-photo-${p.id}`}
            >
              <LazyImage
                src={p.imageUrl}
                alt={p.caption || 'photo'}
                sources={deriveModernSources(p.imageUrl)}
                placeholder={deriveLqipPlaceholder(p.imageUrl)}
                wrapperClassName="block w-full h-full"
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            data-testid="button-close-lightbox"
          >
            <X size={20} />
          </button>
          {isOwnProfile && (
            <button
              className="absolute top-4 left-4 w-10 h-10 rounded-full bg-red-500/80 flex items-center justify-center text-white"
              onClick={(e) => { e.stopPropagation(); if (confirm('Delete this photo?')) deletePhoto.mutate(lightbox.id); }}
              data-testid="button-delete-photo"
            >
              <Trash2 size={18} />
            </button>
          )}
          {(() => {
            const modern = deriveModernSources(lightbox.imageUrl);
            const img = (
              <img
                src={lightbox.imageUrl}
                alt={lightbox.caption || 'photo'}
                className="max-h-[90vh] max-w-[95vw] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            );
            return modern ? (
              <picture onClick={(e) => e.stopPropagation()}>
                {modern.avif && <source type="image/avif" srcSet={modern.avif} />}
                {modern.webp && <source type="image/webp" srcSet={modern.webp} />}
                {img}
              </picture>
            ) : img;
          })()}
        </div>
      )}
    </div>
  );
}
