// Stage 3: Media utility functions
export interface MediaFile {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type: 'image' | 'video';
  size: number;
  filename: string;
  uploadedAt: string;
  status: 'processing' | 'completed' | 'failed';
}

export interface ProcessingJob {
  id: string;
  filename: string;
  type: 'image' | 'video';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'bg-[#2a2535] text-[#efe7e9]';
    case 'failed': return 'bg-[#2a2535] text-[#efe7e9]';
    case 'processing': return 'bg-[#2a2535] text-[#efe7e9]';
    default: return 'bg-[#2a2535] text-[#efe7e9]';
  }
}

export function validateMediaFile(file: File): { valid: boolean; error?: string } {
  const maxImageSize = 5 * 1024 * 1024; // 5MB
  const maxVideoSize = 200 * 1024 * 1024; // 200MB
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/mov', 'video/avi'];
  
  const isImage = allowedImageTypes.includes(file.type);
  const isVideo = allowedVideoTypes.includes(file.type);
  
  if (!isImage && !isVideo) {
    return { 
      valid: false, 
      error: `Unsupported file type: ${file.type}` 
    };
  }
  
  const maxSize = isImage ? maxImageSize : maxVideoSize;
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File too large: ${formatFileSize(file.size)}. Max: ${formatFileSize(maxSize)}` 
    };
  }
  
  return { valid: true };
}