import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Camera, 
  Image, 
  FileText, 
  Music, 
  Video, 
  X, 
  Upload,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { capturePhoto, pickMediaFromGallery } from '@/lib/capacitor/camera';

interface MediaPickerProps {
  onMediaSelected: (mediaId: string, mediaType: string) => void;
  onClose: () => void;
}

export default function MediaPicker({ onMediaSelected, onClose }: MediaPickerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCamera = async () => {
    const file = await capturePhoto({ source: 'camera' });
    if (file) handleFileSelect(file);
  };

  const openGallery = async (accept: string) => {
    const file = await pickMediaFromGallery(accept);
    if (file) handleFileSelect(file);
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: (data) => {
      onMediaSelected(data.mediaId || data.jobId, getMediaType(selectedFile!));
    },
  });

  const getMediaType = (file: File) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'file';
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const mediaTypes = [
    {
      id: 'camera',
      label: 'Camera',
      icon: Camera,
      accept: 'image/*',
      capture: 'environment' as const,
      color: 'bg-transparent border border-border hover:bg-background',
    },
    {
      id: 'photo',
      label: 'Photo',
      icon: Image,
      accept: 'image/*',
      color: 'bg-transparent border border-border hover:bg-background',
    },
    {
      id: 'video',
      label: 'Video',
      icon: Video,
      accept: 'video/*',
      color: 'bg-transparent border border-border hover:bg-background',
    },
    {
      id: 'audio',
      label: 'Audio',
      icon: Music,
      accept: 'audio/*',
      color: 'bg-transparent border border-border hover:bg-background',
    },
    {
      id: 'file',
      label: 'Document',
      icon: FileText,
      accept: '*/*',
      color: 'bg-transparent border border-border hover:bg-background',
    },
  ];

  return (
    <div className="fixed inset-0 bg-background bg-opacity-90 z-50 flex items-end justify-center md:items-center" data-testid="media-picker">
      <Card className="w-full max-w-md mx-4 mb-4 md:mb-0 bg-background rounded-t-2xl md:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 ">
          <h3 className="text-lg font-semibold text-token-text">Share Media</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2"
            data-testid="button-close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4">
          {/* Preview Section */}
          {selectedFile && (
            <div className="mb-4">
              <div className="relative bg-transparent border border-border rounded-lg p-4">
                {previewUrl && (
                  <div className="mb-3">
                    {selectedFile.type.startsWith('image/') ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    ) : selectedFile.type.startsWith('video/') ? (
                      <video
                        src={previewUrl}
                        className="w-full h-48 object-cover rounded-lg"
                        controls
                      />
                    ) : null}
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-token-text truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-token-text opacity-70">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="text-token-text opacity-70 hover:opacity-100"
                      data-testid="button-remove"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="w-full mt-3 bg-transparent border border-border text-token-text hover:bg-background"
                data-testid="button-upload"
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Send Media'}
              </Button>
            </div>
          )}

          {/* Media Type Selection */}
          {!selectedFile && (
            <>
              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {mediaTypes.slice(0, 3).map((type) => (
                  <Button
                    key={type.id}
                    onClick={() => {
                      if (type.id === 'camera') {
                        void openCamera();
                      } else if (type.id === 'photo') {
                        void openGallery('image/*');
                      } else {
                        fileInputRef.current?.click();
                      }
                    }}
                    className={cn(
                      "aspect-square flex flex-col items-center justify-center text-foreground text-xs font-medium",
                      type.color
                    )}
                    data-testid={`button-${type.id}`}
                  >
                    <type.icon className="h-6 w-6 mb-1" />
                    {type.label}
                  </Button>
                ))}
              </div>

              {/* All Media Types */}
              <div className="space-y-2 mb-4">
                {mediaTypes.map((type) => (
                  <Button
                    key={type.id}
                    variant="ghost"
                    onClick={() => {
                      if (type.id === 'camera') {
                        void openCamera();
                      } else if (type.id === 'photo') {
                        void openGallery('image/*');
                      } else {
                        fileInputRef.current?.click();
                      }
                    }}
                    className="w-full flex items-center justify-start space-x-3 p-3 hover:bg-transparent border border-border"
                    data-testid={`button-${type.id}-full`}
                  >
                    <div className={cn("p-2 rounded-full text-token-text", type.color)}>
                      <type.icon className="h-5 w-5" />
                    </div>
                    <span className="text-token-text">{type.label}</span>
                  </Button>
                ))}
              </div>

              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  "border-2 border-dashed  opacity-40 rounded-lg p-6 text-center transition-colors",
                  dragOver && " opacity-80 bg-transparent border border-border"
                )}
              >
                <Upload className="h-8 w-8 text-token-text opacity-60 mx-auto mb-2" />
                <p className="text-sm text-token-text opacity-80 mb-1">
                  Drop files here or click to browse
                </p>
                <p className="text-xs text-token-text opacity-60">
                  Max size: 10MB for images, 50MB for videos
                </p>
              </div>
            </>
          )}
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*"
          onChange={handleFileInput}
          className="hidden"
        />
      </Card>
    </div>
  );
}