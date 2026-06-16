import { useState } from "react";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { uploadCreateFile } from "@/lib/uploadCreateMedia";

interface AddStoryModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddStoryModal({ open, onClose }: AddStoryModalProps) {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const createStoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/stories", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      onClose();
      setSelectedFile(null);
      setPreview("");
      setCaption("");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      const mediaType = selectedFile.type.startsWith("video/") ? "video" : "image";
      const { publicUrl } = await uploadCreateFile(selectedFile);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      createStoryMutation.mutate({
        mediaUrl: publicUrl,
        mediaType,
        caption,
        visibility: "public",
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      console.error("Failed to upload story:", error);
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-foreground/80 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl p-6 max-w-lg w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Add to Your Story</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-accent/10"
            data-testid="button-close-add-story"
          >
            <X size={20} />
          </button>
        </div>

        {!selectedFile ? (
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
              id="story-file-input"
            />
            <label
              htmlFor="story-file-input"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <ImageIcon size={48} className="text-muted-foreground" />
              <p className="text-foreground font-semibold">Choose Photo or Video</p>
              <p className="text-sm text-muted-foreground">or drag and drop</p>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-video rounded-lg overflow-hidden" style={{ background: 'var(--surna-void)' }}>
              <img src={preview} alt="Preview" className="w-full h-full object-contain" />
            </div>

            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
              data-testid="input-story-caption"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreview("");
                }}
                className="flex-1 bg-accent text-accent-foreground rounded-lg py-2 font-semibold"
              >
                Change
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 font-semibold disabled:opacity-50"
                data-testid="button-upload-story"
              >
                {uploading ? "Uploading..." : "Share to Story"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
