import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface VideoPlayerProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
}

export function VideoPlayer({ src, className = '', autoPlay = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = value[0];
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = value[0];
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume || 0.5;
      setVolume(volume || 0.5);
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!isFullscreen) {
        await container.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
      setShowControls(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative rounded-lg overflow-hidden group ${className}`}
      style={{ backgroundColor: '#1F1525' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      data-testid="video-player-container"
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        autoPlay={autoPlay}
        data-testid="video-element"
      />

      {/* Custom Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'linear-gradient(to top, rgba(31, 21, 37, 0.95), transparent)',
        }}
      >
        {/* Progress Bar */}
        <div className="px-4 pt-6 pb-2">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleProgressChange}
            className="cursor-pointer [&>span]:bg-token-accent"
            data-testid="video-progress-bar"
          />
          <div className="flex items-center justify-between mt-1 text-xs" style={{ color: '#FFF4E6' }}>
            <span data-testid="video-current-time">{formatTime(currentTime)}</span>
            <span data-testid="video-duration">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between px-4 pb-4">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlay}
              className="hover:bg-muted/40 transition-colors"
              style={{ color: '#FFF4E6' }}
              data-testid="video-play-pause-button"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" data-testid="video-pause-icon" />
              ) : (
                <Play className="h-5 w-5" data-testid="video-play-icon" />
              )}
            </Button>

            {/* Volume */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="hover:bg-muted/40 transition-colors"
              style={{ color: '#FFF4E6' }}
              data-testid="video-volume-button"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-5 w-5" data-testid="video-mute-icon" />
              ) : (
                <Volume2 className="h-5 w-5" data-testid="video-volume-icon" />
              )}
            </Button>

            {/* Volume Slider */}
            <div className="w-20 hidden sm:block">
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="cursor-pointer"
                data-testid="video-volume-slider"
              />
            </div>
          </div>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="hover:bg-muted/40 transition-colors"
            style={{ color: '#FFF4E6' }}
            data-testid="video-fullscreen-button"
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5" data-testid="video-minimize-icon" />
            ) : (
              <Maximize className="h-5 w-5" data-testid="video-maximize-icon" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
