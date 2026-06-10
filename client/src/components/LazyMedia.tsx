// Stage 3: Lazy Loading Media Component with Performance Optimization
import { useState, useRef, useEffect } from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { Play, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import 'react-lazy-load-image-component/src/effects/blur.css';

interface LazyMediaProps {
  src: string;
  thumbnailSrc?: string;
  type: 'image' | 'video';
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  controls?: boolean;
  muted?: boolean;
  onLoad?: () => void;
  onError?: (error: any) => void;
}

export function LazyMedia({
  src,
  thumbnailSrc,
  type,
  alt = '',
  className = '',
  width,
  height,
  autoPlay = false,
  controls = true,
  muted = true,
  onLoad,
  onError
}: LazyMediaProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleLoad = () => {
    setLoading(false);
    onLoad?.();
  };

  const handleError = (err: any) => {
    setLoading(false);
    setError('Failed to load media');
    onError?.(err);
  };

  const handleVideoPlay = () => {
    setShowVideo(true);
    setLoading(true);
  };

  const handleVideoLoaded = () => {
    setLoading(false);
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch(console.error);
    }
  };

  // Intersection Observer for video preloading
  useEffect(() => {
    if (type === 'video' && videoRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Preload video metadata when it comes into view
              const video = entry.target as HTMLVideoElement;
              if (video.readyState === 0) {
                video.load();
              }
            }
          });
        },
        { threshold: 0.1 }
      );

      observer.observe(videoRef.current);
      return () => observer.disconnect();
    }
  }, [type, showVideo]);

  if (type === 'image') {
    return (
      <div className={`relative ${className}`} data-testid="container-lazy-image">
        <LazyLoadImage
          src={src}
          alt={alt}
          width={width}
          height={height}
          effect="blur"
          className="w-full h-auto object-cover"
          onLoad={handleLoad}
          onError={handleError}
          placeholderSrc={thumbnailSrc}
          data-testid="img-lazy-load"
        />
        
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-transparent border border-border">
            <Loader2 className="w-6 h-6 animate-spin text-token-text" />
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-transparent border border-border">
            <div className="text-center" data-testid="container-image-error">
              <AlertCircle className="w-6 h-6 text-token-text mx-auto mb-2" />
              <p className="text-sm text-token-text">{error}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className={`relative ${className}`} data-testid="container-lazy-video">
        {!showVideo ? (
          // Video thumbnail with play button
          <Card className="relative overflow-hidden cursor-pointer" onClick={handleVideoPlay}>
            <div className="relative">
              <LazyLoadImage
                src={thumbnailSrc || src}
                alt={alt}
                width={width}
                height={height}
                effect="blur"
                className="w-full h-auto object-cover"
                data-testid="img-video-thumbnail"
              />
              
              <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                <Button
                  variant="secondary"
                  size="lg"
                  className="rounded-full bg-token-text opacity-90 hover:opacity-100"
                  data-testid="button-play-video"
                >
                  <Play className="w-6 h-6 text-foreground fill-current" />
                </Button>
              </div>
              
              <div className="absolute bottom-2 right-2">
                <span className="bg-background opacity-70 text-token-text px-2 py-1 rounded text-xs">
                  VIDEO
                </span>
              </div>
            </div>
          </Card>
        ) : (
          // Actual video element
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-transparent border border-border z-10">
                <Loader2 className="w-8 h-8 animate-spin text-token-text" />
              </div>
            )}
            
            <video
              ref={videoRef}
              width={width}
              height={height}
              controls={controls}
              muted={muted}
              className="w-full h-auto object-cover"
              onLoadedData={handleVideoLoaded}
              onError={handleError}
              preload="metadata"
              data-testid="video-player"
            >
              <source src={src} type="video/mp4" />
              <source src={src} type="video/webm" />
              Your browser does not support the video tag.
            </video>
            
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-transparent border border-border">
                <div className="text-center" data-testid="container-video-error">
                  <AlertCircle className="w-6 h-6 text-token-text mx-auto mb-2" />
                  <p className="text-sm text-token-text">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}

// Optimized media grid for displaying multiple media items
interface MediaGridProps {
  mediaItems: Array<{
    id: string;
    url: string;
    thumbnailUrl?: string;
    type: 'image' | 'video';
    alt?: string;
  }>;
  columns?: number;
  gap?: number;
  className?: string;
}

export function MediaGrid({ 
  mediaItems, 
  columns = 3, 
  gap = 4, 
  className = '' 
}: MediaGridProps) {
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: `${gap * 0.25}rem`
  };

  return (
    <div style={gridStyle} className={className} data-testid="container-media-grid">
      {mediaItems.map((item, index) => (
        <LazyMedia
          key={item.id}
          src={item.url}
          thumbnailSrc={item.thumbnailUrl}
          type={item.type}
          alt={item.alt || `Media ${index + 1}`}
          className="aspect-square"
          data-testid={`media-item-${item.id}`}
        />
      ))}
    </div>
  );
}

// Progressive enhancement for media loading
export function useMediaOptimization() {
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'fast'>('fast');
  
  useEffect(() => {
    // Check connection speed using Network Information API
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const updateConnectionSpeed = () => {
        const speed = connection.effectiveType;
        setConnectionSpeed(speed === 'slow-2g' || speed === '2g' ? 'slow' : 'fast');
      };
      
      updateConnectionSpeed();
      connection.addEventListener('change', updateConnectionSpeed);
      
      return () => {
        connection.removeEventListener('change', updateConnectionSpeed);
      };
    }
  }, []);
  
  return {
    connectionSpeed,
    // Optimize quality based on connection
    getOptimizedUrl: (url: string, type: 'image' | 'video') => {
      if (connectionSpeed === 'slow' && type === 'image') {
        // Return lower quality version for slow connections
        return url.includes('?') ? `${url}&q=60` : `${url}?q=60`;
      }
      return url;
    }
  };
}