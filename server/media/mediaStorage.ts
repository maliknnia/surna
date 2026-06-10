// Stage 3: Media Storage and Processing System
/// <reference types="multer" />
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import { promises as fs } from 'fs';
import { compressImageForStorage } from '../lib/imageCompression';

// File validation constants
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/mov', 'video/avi'];
const ALLOWED_AUDIO_TYPES = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/m4a'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB
const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB for voice notes

export interface MediaFile {
  originalUrl: string;
  thumbnailUrl?: string;
  compressedUrl?: string;
  type: 'image' | 'video' | 'audio';
  size: number;
  dimensions?: { width: number; height: number };
  duration?: number; // for videos and audio
  waveform?: number[]; // for audio visualization
}

export interface ProcessingJob {
  id: string;
  fileUrl: string;
  type: 'image' | 'video' | 'audio';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: MediaFile;
  error?: string;
}

// File validation
export function validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype);
  const isAudio = ALLOWED_AUDIO_TYPES.includes(file.mimetype);
  
  if (!isImage && !isVideo && !isAudio) {
    return { 
      valid: false, 
      error: `Unsupported file type: ${file.mimetype}. Allowed: ${[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_AUDIO_TYPES].join(', ')}` 
    };
  }
  
  const maxSize = isImage ? MAX_IMAGE_SIZE : isVideo ? MAX_VIDEO_SIZE : MAX_AUDIO_SIZE;
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File too large: ${Math.round(file.size / 1024 / 1024)}MB. Max: ${Math.round(maxSize / 1024 / 1024)}MB` 
    };
  }
  
  return { valid: true };
}

// Memory storage for multer (before processing)
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: Math.max(MAX_VIDEO_SIZE, MAX_AUDIO_SIZE), // Use max size
    files: 5 // Max 5 files per request
  },
  fileFilter: (req, file, cb) => {
    const validation = validateFile(file);
    if (validation.valid) {
      cb(null, true);
    } else {
      cb(new Error(validation.error ?? "Invalid file"));
    }
  }
});

// Image processing utilities
export async function processImage(buffer: Buffer): Promise<{
  compressed: Buffer;
  thumbnail: Buffer;
  dimensions: { width: number; height: number };
}> {
  try {
    const { buffer: compressed, width, height } = await compressImageForStorage(buffer);
    const dimensions = { width, height };

    const thumbnail = await sharp(compressed)
      .resize({ width: 300, height: 300, fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();

    return { compressed, thumbnail, dimensions };
  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error('Failed to process image');
  }
}

// Video thumbnail generation (extract first frame)
export async function generateVideoThumbnail(videoBuffer: Buffer): Promise<Buffer> {
  // For now, return a placeholder - in production use ffmpeg
  // This would require ffmpeg binary: ffmpeg -i input.mp4 -vframes 1 -f image2 output.jpg
  try {
    // Placeholder: create a simple thumbnail image
    return await sharp({
      create: {
        width: 300,
        height: 200,
        channels: 3,
        background: { r: 100, g: 100, b: 100 }
      }
    })
    .png()
    .toBuffer();
  } catch (error) {
    console.error('Video thumbnail generation error:', error);
    throw new Error('Failed to generate video thumbnail');
  }
}

// Local file storage (fallback when cloud storage isn't available)
class LocalMediaStorage {
  private basePath = './uploads';
  
  constructor() {
    this.ensureDirectories();
  }
  
  private async ensureDirectories() {
    const dirs = ['uploads', 'uploads/images', 'uploads/videos', 'uploads/audio', 'uploads/thumbnails'];
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
    }
  }
  
  async saveFile(buffer: Buffer, filename: string, type: 'image' | 'video' | 'audio' | 'thumbnail'): Promise<string> {
    const dir = `${this.basePath}/${type}s`;
    const filepath = path.join(dir, filename);
    await fs.writeFile(filepath, buffer);
    return `/uploads/${type}s/${filename}`;
  }
  
  async deleteFile(url: string): Promise<void> {
    try {
      const filepath = path.join('.', url);
      await fs.unlink(filepath);
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  }
}

export const localStorage = new LocalMediaStorage();

// Media processing service
export class MediaProcessor {
  private processingJobs = new Map<string, ProcessingJob>();
  
  async processMedia(file: Express.Multer.File): Promise<ProcessingJob> {
    const jobId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype);
    const isAudio = ALLOWED_AUDIO_TYPES.includes(file.mimetype);
    
    const job: ProcessingJob = {
      id: jobId,
      fileUrl: '',
      type: isImage ? 'image' : isVideo ? 'video' : 'audio',
      status: 'pending'
    };
    
    this.processingJobs.set(jobId, job);
    
    try {
      job.status = 'processing';
      
      if (isImage) {
        await this.processImageFile(job, file);
      } else if (isVideo) {
        await this.processVideoFile(job, file);
      } else if (isAudio) {
        await this.processAudioFile(job, file);
      }
      
      job.status = 'completed';
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      console.error('Media processing failed:', error);
    }
    
    return job;
  }
  
  private async processImageFile(job: ProcessingJob, file: Express.Multer.File) {
    const { compressed, thumbnail, dimensions } = await processImage(file.buffer);

    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);

    const compressedFilename = `${timestamp}_${basename}_compressed.jpg`;
    const thumbnailFilename = `${timestamp}_${basename}_thumb.jpg`;

    const compressedUrl = await localStorage.saveFile(compressed, compressedFilename, 'image');
    const thumbnailUrl = await localStorage.saveFile(thumbnail, thumbnailFilename, 'thumbnail');

    job.result = {
      originalUrl: compressedUrl,
      thumbnailUrl,
      compressedUrl,
      type: 'image',
      size: compressed.length,
      dimensions,
    };

    job.fileUrl = compressedUrl;
  }
  
  private async processVideoFile(job: ProcessingJob, file: Express.Multer.File) {
    // Save original video
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    
    const videoFilename = `${timestamp}_${basename}${ext}`;
    const thumbnailFilename = `${timestamp}_${basename}_thumb.png`;
    
    const videoUrl = await localStorage.saveFile(file.buffer, videoFilename, 'video');
    
    // Generate thumbnail
    const thumbnail = await generateVideoThumbnail(file.buffer);
    const thumbnailUrl = await localStorage.saveFile(thumbnail, thumbnailFilename, 'thumbnail');
    
    job.result = {
      originalUrl: videoUrl,
      thumbnailUrl,
      type: 'video',
      size: file.size
    };
    
    job.fileUrl = videoUrl;
  }

  private async processAudioFile(job: ProcessingJob, file: Express.Multer.File) {
    // Save original audio file
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    
    const audioFilename = `${timestamp}_${basename}${ext}`;
    const audioUrl = await localStorage.saveFile(file.buffer, audioFilename, 'audio');
    
    // For voice notes, we could generate waveform data in the future
    // For now, just store the basic audio file
    job.result = {
      originalUrl: audioUrl,
      type: 'audio',
      size: file.size,
      // duration: await extractAudioDuration(file.buffer), // Future enhancement
      // waveform: await generateWaveform(file.buffer), // Future enhancement
    };
    
    job.fileUrl = audioUrl;
  }
  
  getJob(jobId: string): ProcessingJob | undefined {
    return this.processingJobs.get(jobId);
  }
  
  getAllJobs(): ProcessingJob[] {
    return Array.from(this.processingJobs.values());
  }
}

export const mediaProcessor = new MediaProcessor();
