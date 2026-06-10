import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, X, Send, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onRecorded: (audioBlob: Blob) => void;
  onCancel: () => void;
}

export default function VoiceRecorder({ onRecorded, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      cleanup();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      mediaRecorderRef.current.addEventListener('stop', () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      });

      mediaRecorderRef.current.start(100); // Collect data every 100ms
      
      // Start duration timer
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 0.1);
      }, 100);
      
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 0.1);
      }, 100);
    }
  };

  const playPreview = () => {
    if (!audioUrl) return;
    
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.addEventListener('ended', () => setIsPlaying(false));
      }
      
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      onRecorded(audioBlob);
    }
    cleanup();
  };

  const handleCancel = () => {
    cleanup();
    onCancel();
  };

  const cleanup = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-background bg-opacity-50 z-50 flex items-center justify-center p-4" data-testid="voice-recorder">
      <div className="bg-transparent border border-border rounded-2xl p-6 w-full max-w-sm mx-auto">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-token-text mb-2">
            {isRecording ? 'Recording Voice Message' : 'Voice Message'}
          </h3>
          <div className="text-2xl font-mono text-token-text">
            {formatDuration(duration)}
          </div>
        </div>

        {/* Waveform visualization */}
        <div className="flex items-center justify-center space-x-1 h-16 mb-6">
          {isRecording || isPaused ? (
            <div className="flex items-center space-x-1">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 bg-token-text rounded-full transition-all duration-100",
                    isRecording && !isPaused
                      ? `h-${Math.floor(Math.random() * 8) + 2} animate-pulse`
                      : "h-2 opacity-50"
                  )}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-4 bg-token-surface rounded-full"
                />
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4">
          {/* Cancel */}
          <Button
            variant="ghost"
            size="lg"
            onClick={handleCancel}
            className="rounded-full p-4 hover:bg-transparent border border-border /20"
            data-testid="button-cancel"
          >
            <X className="h-6 w-6 text-token-text" />
          </Button>

          {/* Record/Stop/Pause/Resume */}
          {isRecording ? (
            <Button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="rounded-full p-6 bg-transparent border border-border hover:bg-background text-token-text"
              data-testid="button-pause-resume"
            >
              {isPaused ? (
                <Mic className="h-8 w-8" />
              ) : (
                <Pause className="h-8 w-8" />
              )}
            </Button>
          ) : (
            <Button
              onClick={playPreview}
              className="rounded-full p-6 bg-transparent border border-border hover:bg-transparent border border-border text-token-text"
              data-testid="button-play-preview"
            >
              {isPlaying ? (
                <Pause className="h-8 w-8" />
              ) : (
                <Play className="h-8 w-8" />
              )}
            </Button>
          )}

          {/* Send/Stop */}
          {isRecording ? (
            <Button
              onClick={stopRecording}
              className="rounded-full p-4 bg-background hover:bg-transparent border border-border text-token-text"
              data-testid="button-stop"
            >
              <div className="w-6 h-6 bg-token-text rounded-sm" />
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!audioBlob}
              className="rounded-full p-4 bg-background hover:bg-transparent border border-border text-token-text disabled:opacity-50"
              data-testid="button-send"
            >
              <Send className="h-6 w-6" />
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="text-center mt-4">
          <p className="text-sm text-token-text">
            {isRecording 
              ? isPaused 
                ? 'Tap to resume recording'
                : 'Tap to pause recording'
              : 'Tap play to preview your message'
            }
          </p>
        </div>
      </div>
    </div>
  );
}