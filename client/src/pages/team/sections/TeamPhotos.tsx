import { useState, useRef } from 'react';
import { Image as ImageIcon, Plus, X, Trash2 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient, getQueryFn } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { capturePhoto } from '@/lib/capacitor/camera';

interface TeamPhoto {
  id: string;
  teamId: string;
  uploaderId: string;
  imageUrl: string;
  caption?: string | null;
  createdAt?: string;
}

interface TeamPhotosProps {
  teamId: string;
}

export default function TeamPhotos({ teamId }: TeamPhotosProps) {
  const { toast } = useToast();
  const { user } = useAuth() as any;
  const currentUserId: string | undefined = user?.id;
  const [lightbox, setLightbox] = useState<TeamPhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: photos = [], isLoading } = useQuery<TeamPhoto[]>({
    queryKey: ['/api/teams', teamId, 'photos'],
    queryFn: getQueryFn({ on401: 'returnNull' }) as any,
    enabled: !!teamId,
  });

  const addPhoto = useMutation({
    mutationFn: async (payload: { imageUrl: string; caption?: string; width?: number; height?: number }) => {
      return apiRequest('POST', `/api/teams/${teamId}/photos`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams', teamId, 'photos'] });
      toast({ title: 'Photo added' });
    },
    onError: () => toast({ title: 'Upload failed (must be team member)', variant: 'destructive' }),
  });

  const deletePhoto = useMutation({
    mutationFn: async (photoId: string) => apiRequest('DELETE', `/api/teams/photos/${photoId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams', teamId, 'photos'] });
      setLightbox(null);
      toast({ title: 'Photo deleted' });
    },
    onError: () => toast({ title: 'Not authorized', variant: 'destructive' }),
  });

  const processPhotoFile = async (file: File) => {
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        addPhoto.mutate({ imageUrl: dataUrl, width: img.width, height: img.height });
        setUploading(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processPhotoFile(file);
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
      {currentUserId && (
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            data-testid="input-team-photo-upload"
          />
          <Button
            onClick={() => void capturePhoto({ source: "gallery" }).then((f) => f && processPhotoFile(f))}
            disabled={uploading}
            className="gap-2"
            data-testid="button-add-team-photo"
          >
            <Plus size={18} />
            {uploading ? 'Uploading…' : 'Add photo'}
          </Button>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="text-center py-12">
          <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No team photos yet</p>
          <p className="text-muted-foreground/60 text-sm mt-2">Members can share match shots and team moments here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setLightbox(p)}
              className="aspect-square overflow-hidden bg-muted/40 hover:opacity-90 transition"
              data-testid={`button-team-photo-${p.id}`}
            >
              <img src={p.imageUrl} alt={p.caption || 'team photo'} className="w-full h-full object-cover" />
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
            data-testid="button-close-team-lightbox"
          >
            <X size={20} />
          </button>
          {currentUserId === lightbox.uploaderId && (
            <button
              className="absolute top-4 left-4 w-10 h-10 rounded-full bg-red-500/80 flex items-center justify-center text-white"
              onClick={(e) => { e.stopPropagation(); if (confirm('Delete this photo?')) deletePhoto.mutate(lightbox.id); }}
              data-testid="button-delete-team-photo"
            >
              <Trash2 size={18} />
            </button>
          )}
          <img
            src={lightbox.imageUrl}
            alt={lightbox.caption || 'team photo'}
            className="max-h-[90vh] max-w-[95vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
