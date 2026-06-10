// Stage 3: Advanced Media Upload Component
import { useState, useCallback, useRef } from 'react';
import { Upload, Image, Video, FileText, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface UploadJob {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  type: 'image' | 'video';
  url?: string;
  thumbnailUrl?: string;
  error?: string;
}

interface MediaUploaderProps {
  maxFiles?: number;
  accept?: string;
  onUploadComplete?: (files: Array<{ url: string; thumbnailUrl?: string; type: string }>) => void;
  className?: string;
}

export function MediaUploader({ 
  maxFiles = 5, 
  accept = 'image/*,video/*',
  onUploadComplete,
  className 
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback(async (files: FileList) => {
    if (files.length === 0) return;
    
    const fileArray = Array.from(files).slice(0, maxFiles);
    setUploading(true);
    
    try {
      const formData = new FormData();
      fileArray.forEach(file => {
        formData.append('files', file);
      });
      
      // Start upload
      const response = await fetch('/api/media/upload-multiple', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await response.json();
      
      // Initialize job tracking
      const newJobs: UploadJob[] = result.jobs.map((job: any, index: number) => ({
        id: job.jobId,
        filename: fileArray[index].name,
        status: job.status,
        progress: 0,
        type: fileArray[index].type.startsWith('image/') ? 'image' : 'video'
      }));
      
      setJobs(newJobs);
      
      // Poll for completion
      const polling = setInterval(async () => {
        const updates = await Promise.all(
          newJobs.map(async (job) => {
            try {
              const statusResponse = await fetch(`/api/media/status/${job.id}`);
              const statusData = await statusResponse.json();
              
              return {
                ...job,
                status: statusData.status,
                progress: statusData.status === 'completed' ? 100 : 
                         statusData.status === 'processing' ? 50 : 0,
                url: statusData.result?.originalUrl,
                thumbnailUrl: statusData.result?.thumbnailUrl,
                error: statusData.error
              };
            } catch {
              return { ...job, status: 'failed' as const, error: 'Status check failed' };
            }
          })
        );
        
        setJobs(updates);
        
        // Check if all completed
        const allCompleted = updates.every(job => 
          job.status === 'completed' || job.status === 'failed'
        );
        
        if (allCompleted) {
          clearInterval(polling);
          setUploading(false);
          
          const successfulUploads = updates
            .filter(job => job.status === 'completed' && job.url)
            .map(job => ({
              url: job.url!,
              thumbnailUrl: job.thumbnailUrl,
              type: job.type
            }));
          
          if (successfulUploads.length > 0) {
            onUploadComplete?.(successfulUploads);
            toast({
              title: "Upload Complete",
              description: `${successfulUploads.length} file(s) uploaded successfully`,
            });
          }
          
          const failedCount = updates.filter(job => job.status === 'failed').length;
          if (failedCount > 0) {
            toast({
              title: "Upload Issues",
              description: `${failedCount} file(s) failed to upload`,
              variant: "destructive",
            });
          }
        }
      }, 1000);
      
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploading(false);
      toast({
        title: "Upload Failed",
        description: error.message || 'Failed to upload files',
        variant: "destructive",
      });
    }
  }, [maxFiles, onUploadComplete, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const removeJob = (jobId: string) => {
    setJobs(prev => prev.filter(job => job.id !== jobId));
  };

  const getTypeIcon = (type: string) => {
    if (type === 'image') return <Image className="w-4 h-4" />;
    if (type === 'video') return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-transparent border border-border';
      case 'failed': return 'bg-transparent border border-border';
      case 'processing': return 'bg-transparent border border-border';
      default: return 'bg-transparent border border-border';
    }
  };

  return (
    <div className={className}>
      <Card
        className={`bg-transparent border border-border transition-colors ${
          dragOver ? ' bg-transparent border border-border' : ''
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-6">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-token-text mb-4" />
            <h3 className="text-lg font-medium text-token-text mb-2">
              Upload Media Files
            </h3>
            <p className="text-sm text-token-text mb-4">
              Drag and drop files here, or click to select
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mb-2"
              data-testid="button-select-files"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Select Files
            </Button>
            <p className="text-xs text-token-text">
              Maximum {maxFiles} files. Images and videos only.
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={accept}
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              className="hidden"
              data-testid="input-file-hidden"
            />
          </div>
        </CardContent>
      </Card>

      {jobs.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-token-text">Upload Progress</h4>
          {jobs.map((job) => (
            <Card key={job.id} className="p-3" data-testid={`card-upload-job-${job.id}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getTypeIcon(job.type)}
                  <span className="text-sm font-medium truncate" data-testid={`text-filename-${job.id}`}>
                    {job.filename}
                  </span>
                  <Badge 
                    variant="secondary" 
                    className={getStatusColor(job.status)}
                    data-testid={`badge-status-${job.id}`}
                  >
                    {job.status}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeJob(job.id)}
                  data-testid={`button-remove-job-${job.id}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {job.status === 'processing' && (
                <Progress value={job.progress} className="w-full" />
              )}
              
              {job.error && (
                <p className="text-xs text-token-text mt-1" data-testid={`text-error-${job.id}`}>
                  {job.error}
                </p>
              )}
              
              {job.status === 'completed' && job.url && (
                <div className="mt-2">
                  {job.type === 'image' ? (
                    <img 
                      src={job.thumbnailUrl || job.url} 
                      alt="Upload preview"
                      className="w-16 h-16 object-cover rounded"
                      data-testid={`img-preview-${job.id}`}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-transparent border border-border rounded flex items-center justify-center">
                      <Video className="w-6 h-6 text-token-text" />
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}