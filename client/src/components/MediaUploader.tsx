// Stage 3: Advanced Media Upload Component
import { useState, useCallback, useRef } from 'react';
import { Upload, Image, Video, FileText, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { uploadCreateFile } from '@/lib/uploadCreateMedia';

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

    const newJobs: UploadJob[] = fileArray.map((file, index) => ({
      id: `job-${Date.now()}-${index}`,
      filename: file.name,
      status: 'processing' as const,
      progress: 10,
      type: file.type.startsWith('image/') ? 'image' : 'video',
    }));
    setJobs(newJobs);
    
    try {
      const completed: Array<{ url: string; thumbnailUrl?: string; type: string }> = [];

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const jobId = newJobs[i].id;
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, progress: 40 } : j)),
        );

        const uploaded = await uploadCreateFile(file);
        const type = file.type.startsWith('video/') ? 'video' : 'image';
        completed.push({
          url: uploaded.publicUrl,
          thumbnailUrl: type === 'image' ? uploaded.publicUrl : undefined,
          type,
        });

        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? { ...j, status: 'completed', progress: 100, url: uploaded.publicUrl }
              : j,
          ),
        );
      }

      onUploadComplete?.(completed);
      toast({ title: 'Upload complete', description: `${completed.length} file(s) ready.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setJobs((prev) =>
        prev.map((j) =>
          j.status === 'processing' || j.status === 'pending'
            ? { ...j, status: 'failed', error: message }
            : j,
        ),
      );
      toast({ title: 'Upload failed', description: message, variant: 'destructive' });
    } finally {
      setUploading(false);
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

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const removeJob = (jobId: string) => {
    setJobs(prev => prev.filter(job => job.id !== jobId));
  };

  return (
    <div className={className}>
      {/* Drop Zone */}
      <Card 
        className={`border-2 border-dashed transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upload Media</h3>
          <p className="text-muted-foreground mb-4">
            Drag and drop files here, or click to browse
          </p>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mb-2"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Choose Files'
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Supports images and videos up to {process.env.UPLOAD_MAX_MB || 15}MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={maxFiles > 1}
            className="hidden"
            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          />
        </CardContent>
      </Card>

      {/* Upload Jobs */}
      {jobs.length > 0 && (
        <div className="mt-4 space-y-3">
          <h4 className="font-medium">Upload Progress</h4>
          {jobs.map((job) => (
            <Card key={job.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {job.type === 'image' ? (
                    <Image className="h-4 w-4" />
                  ) : job.type === 'video' ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium truncate max-w-[200px]">
                    {job.filename}
                  </span>
                  <Badge variant={
                    job.status === 'completed' ? 'default' :
                    job.status === 'failed' ? 'destructive' :
                    'secondary'
                  }>
                    {job.status}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeJob(job.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {job.status === 'processing' && (
                <Progress value={job.progress} className="mb-2" />
              )}
              
              {job.error && (
                <p className="text-sm text-destructive">{job.error}</p>
              )}
              
              {job.url && job.status === 'completed' && (
                <div className="mt-2">
                  {job.type === 'image' ? (
                    <img 
                      src={job.url} 
                      alt={job.filename}
                      className="h-20 w-20 object-cover rounded"
                    />
                  ) : (
                    <video 
                      src={job.url}
                      className="h-20 w-32 object-cover rounded"
                      controls
                    />
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
