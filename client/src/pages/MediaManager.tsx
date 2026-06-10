// Stage 3: Comprehensive Media Management Interface
import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { MediaUploader } from '@/components/MediaUploader';
import { LazyMedia, MediaGrid } from '@/components/LazyMedia';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { MediaFile, ProcessingJob, formatFileSize, getStatusColor } from '@/lib/mediaUtils';
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  Trash2, 
  Download, 
  Settings,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

export default function MediaManager() {
  const [selectedTab, setSelectedTab] = useState('upload');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch processing jobs
  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['/api/media/jobs'],
    queryFn: async () => {
      const res = await fetch('/api/media/jobs', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load processing jobs');
      return res.json();
    },
    refetchInterval: 2000, // Poll every 2 seconds
  });
  const jobs = (jobsData as { jobs?: ProcessingJob[] })?.jobs || [];

  // Fetch user's media files (mock for now)
  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ['/api/user/media'],
    queryFn: async () => {
      const res = await fetch('/api/user/media', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load media files');
      return res.json();
    },
  });
  const mediaFiles = (filesData as MediaFile[]) || [];

  // Delete media mutation
  const deleteMediaMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      const response = await apiRequest("DELETE", `/api/media/${mediaId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/media'] });
      toast({
        title: "Media Deleted",
        description: "Media file has been permanently deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete media file",
        variant: "destructive",
      });
    },
  });

  // Optimize media mutation
  const optimizeMediaMutation = useMutation({
    mutationFn: async ({ mediaUrl, width, height }: { 
      mediaUrl: string; 
      width: number; 
      height: number; 
    }) => {
      const response = await fetch('/api/media/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaUrl, width, height }),
      });
      if (!response.ok) throw new Error('Optimization failed');
      return response.json() as Promise<{ savings: string; optimized: string; original: string }>;
    },
    onSuccess: (data) => {
      toast({
        title: "Optimization Complete",
        description: `Media optimized with ${data.savings} savings`,
      });
    },
  });

  const handleUploadComplete = (files: Array<{ url: string; thumbnailUrl?: string; type: string }>) => {
    // Refresh jobs and media files
    queryClient.invalidateQueries({ queryKey: ['/api/media/jobs'] });
    queryClient.invalidateQueries({ queryKey: ['/api/user/media'] });
    
    setSelectedTab('library'); // Switch to library tab
  };


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-token-text" />;
      case 'failed': return <XCircle className="w-4 h-4 text-token-text" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-token-text animate-spin" />;
      default: return <Clock className="w-4 h-4 text-token-text-secondary" />;
    }
  };


  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Link href="/">
        <Button variant="ghost" size="sm" className="mb-2 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Home
        </Button>
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-token-text" data-testid="text-page-title">
            Media Manager
          </h1>
          <p className="text-token-text-secondary mt-2">
            Upload, manage, and optimize your media files
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="px-3 py-1">
            <BarChart3 className="w-4 h-4 mr-1" />
            Stage 3: Optimized
          </Badge>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload" data-testid="tab-upload">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="library" data-testid="tab-library">
            <ImageIcon className="w-4 h-4 mr-2" />
            Library
          </TabsTrigger>
          <TabsTrigger value="processing" data-testid="tab-processing">
            <Loader2 className="w-4 h-4 mr-2" />
            Processing ({jobs.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Upload Media Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MediaUploader
                maxFiles={5}
                onUploadComplete={handleUploadComplete}
                className="w-full"
              />
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex items-center">
                    <ImageIcon className="w-8 h-8 text-token-text mr-3" />
                    <div>
                      <h3 className="font-medium">Images</h3>
                      <p className="text-sm text-token-text-secondary">JPEG, PNG, WebP, GIF</p>
                      <p className="text-xs text-token-text-muted">Max 5MB each</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center">
                    <Video className="w-8 h-8 text-token-text mr-3" />
                    <div>
                      <h3 className="font-medium">Videos</h3>
                      <p className="text-sm text-token-text-secondary">MP4, WebM, MOV, AVI</p>
                      <p className="text-xs text-token-text-muted">Max 200MB each</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center">
                    <Settings className="w-8 h-8 text-token-text mr-3" />
                    <div>
                      <h3 className="font-medium">Auto-Optimization</h3>
                      <p className="text-sm text-token-text-secondary">Compression & Thumbnails</p>
                      <p className="text-xs text-token-text-muted">CDN Ready</p>
                    </div>
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="library" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Media Library</CardTitle>
            </CardHeader>
            <CardContent>
              {filesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-token-text-secondary" />
                </div>
              ) : mediaFiles.length === 0 ? (
                <div className="text-center py-8">
                  <ImageIcon className="w-12 h-12 text-token-text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-token-text mb-2">No media files</h3>
                  <p className="text-token-text-secondary">Upload some files to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <MediaGrid
                    mediaItems={mediaFiles.map((file: MediaFile) => ({
                      id: file.id,
                      url: file.url,
                      thumbnailUrl: file.thumbnailUrl,
                      type: file.type,
                      alt: file.filename
                    }))}
                    columns={4}
                    className="mb-6"
                  />
                  
                  <div className="grid gap-4">
                    {mediaFiles.map((file: MediaFile) => (
                      <Card key={file.id} className="p-4" data-testid={`card-media-file-${file.id}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 relative">
                              <LazyMedia
                                src={file.url}
                                thumbnailSrc={file.thumbnailUrl}
                                type={file.type}
                                className="w-full h-full rounded"
                              />
                            </div>
                            
                            <div>
                              <h3 className="font-medium" data-testid={`text-filename-${file.id}`}>
                                {file.filename}
                              </h3>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline">
                                  {file.type === 'image' ? <ImageIcon className="w-3 h-3 mr-1" /> : <Video className="w-3 h-3 mr-1" />}
                                  {file.type}
                                </Badge>
                                <span className="text-sm text-token-text-secondary">{formatFileSize(file.size)}</span>
                                <Badge className={getStatusColor(file.status)}>
                                  {getStatusIcon(file.status)}
                                  {file.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-token-text-muted mt-1">
                                Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => optimizeMediaMutation.mutate({
                                mediaUrl: file.url,
                                width: 800,
                                height: 600
                              })}
                              disabled={optimizeMediaMutation.isPending}
                              data-testid={`button-optimize-${file.id}`}
                            >
                              <Settings className="w-4 h-4 mr-1" />
                              Optimize
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(file.url, '_blank')}
                              data-testid={`button-download-${file.id}`}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                            
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteMediaMutation.mutate(file.id)}
                              disabled={deleteMediaMutation.isPending}
                              data-testid={`button-delete-${file.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Processing Queue</CardTitle>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-token-text-secondary" />
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-token-text mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-token-text mb-2">No active jobs</h3>
                  <p className="text-token-text-secondary">All uploads have been processed</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job: ProcessingJob) => (
                    <Card key={job.id} className="p-4" data-testid={`card-processing-job-${job.id}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(job.status)}
                          <div>
                            <h3 className="font-medium" data-testid={`text-job-filename-${job.id}`}>
                              {job.filename}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">
                                {job.type === 'image' ? <ImageIcon className="w-3 h-3 mr-1" /> : <Video className="w-3 h-3 mr-1" />}
                                {job.type}
                              </Badge>
                              <Badge className={getStatusColor(job.status)}>
                                {job.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm font-medium">{job.progress}%</div>
                          <div className="text-xs text-token-text-secondary">Complete</div>
                        </div>
                      </div>
                      
                      <Progress value={job.progress} className="w-full mb-2" />
                      
                      {job.error && (
                        <p className="text-sm text-token-text mt-2" data-testid={`text-job-error-${job.id}`}>
                          Error: {job.error}
                        </p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-token-text-secondary">Total Files</p>
                  <p className="text-2xl font-bold" data-testid="text-total-files">{mediaFiles.length}</p>
                </div>
                <ImageIcon className="w-8 h-8 text-token-text" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-token-text-secondary">Storage Used</p>
                  <p className="text-2xl font-bold" data-testid="text-storage-used">
                    {formatFileSize(mediaFiles.reduce((acc: number, file: MediaFile) => acc + file.size, 0))}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-token-text" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-token-text-secondary">Processing</p>
                  <p className="text-2xl font-bold" data-testid="text-processing-count">
                    {jobs.filter((job: ProcessingJob) => job.status === 'processing').length}
                  </p>
                </div>
                <Loader2 className="w-8 h-8 text-token-text" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-token-text-secondary">Success Rate</p>
                  <p className="text-2xl font-bold text-token-text" data-testid="text-success-rate">
                    {jobs.length > 0 ? Math.round((jobs.filter((job: ProcessingJob) => job.status === 'completed').length / jobs.length) * 100) : 100}%
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-token-text" />
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}