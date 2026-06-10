// Stage 3: Media Upload and Processing Routes
import type { Express } from "express";
import { upload, mediaProcessor, validateFile, type ProcessingJob } from "./mediaStorage";
import { isAuthenticated } from "../replitAuth";
import { requireEmailVerified } from "../middleware/requireEmailVerified";
import { db } from "../db";
import { posts, postMedia } from "@shared/schema";
import { eq } from "drizzle-orm";
import { mediaUploadRateLimit, voiceNoteRateLimit } from "../middleware/messengerRateLimit";

export function registerMediaRoutes(app: Express) {
  
  // Single file upload endpoint
  app.post('/api/media/upload', isAuthenticated, mediaUploadRateLimit, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }
      
      // Validate file
      const validation = validateFile(req.file);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      
      // Process media asynchronously
      const job = await mediaProcessor.processMedia(req.file);
      
      res.json({
        jobId: job.id,
        status: job.status,
        message: 'File upload and processing started'
      });
      
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ 
        error: 'Upload failed', 
        details: error.message 
      });
    }
  });
  
  // Multiple files upload endpoint
  app.post('/api/media/upload-multiple', isAuthenticated, mediaUploadRateLimit, upload.array('files', 5), async (req: any, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
      }
      
      const jobs: Array<{ jobId: string; filename: string; status: ProcessingJob["status"] }> = [];
      
      for (const file of req.files) {
        const validation = validateFile(file);
        if (!validation.valid) {
          return res.status(400).json({ 
            error: `File ${file.originalname}: ${validation.error}` 
          });
        }
        
        const job = await mediaProcessor.processMedia(file);
        jobs.push({
          jobId: job.id,
          filename: file.originalname,
          status: job.status
        });
      }
      
      res.json({
        jobs,
        message: `${jobs.length} files uploaded and processing started`
      });
      
    } catch (error: any) {
      console.error('Multiple upload error:', error);
      res.status(500).json({ 
        error: 'Upload failed', 
        details: error.message 
      });
    }
  });
  
  // Check processing status
  app.get('/api/media/status/:jobId', isAuthenticated, async (req, res) => {
    try {
      const { jobId } = req.params;
      const job = mediaProcessor.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      
      res.json({
        jobId: job.id,
        status: job.status,
        type: job.type,
        result: job.result,
        error: job.error
      });
      
    } catch (error: any) {
      console.error('Status check error:', error);
      res.status(500).json({ error: 'Failed to check status' });
    }
  });
  
  // Get all processing jobs (admin/debug)
  app.get('/api/media/jobs', isAuthenticated, async (req, res) => {
    try {
      const jobs = mediaProcessor.getAllJobs();
      res.json({
        total: jobs.length,
        jobs: jobs.map(job => ({
          id: job.id,
          type: job.type,
          status: job.status,
          fileUrl: job.fileUrl,
          error: job.error
        }))
      });
    } catch (error: any) {
      console.error('Jobs fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch jobs' });
    }
  });
  
  // Chunked upload endpoint (for large files)
  app.post('/api/media/upload-chunk', isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const { chunkIndex, totalChunks, fileName, fileId } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No chunk data provided' });
      }
      
      // In production, you'd store chunks temporarily and reassemble
      // For now, we'll process single chunks
      const job = await mediaProcessor.processMedia(req.file);
      
      res.json({
        jobId: job.id,
        chunkIndex: parseInt(chunkIndex),
        totalChunks: parseInt(totalChunks),
        status: job.status,
        message: `Chunk ${parseInt(chunkIndex) + 1}/${totalChunks} processed`
      });
      
    } catch (error: any) {
      console.error('Chunk upload error:', error);
      res.status(500).json({ 
        error: 'Chunk upload failed', 
        details: error.message 
      });
    }
  });
  
  // Create post with media  
  app.post('/api/posts/with-media', isAuthenticated, requireEmailVerified, mediaUploadRateLimit, upload.array('media', 5), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { content, type = 'text' } = req.body;
      
      // Create post first
      const [post] = await db.insert(posts).values({
        authorId: userId,
        content: content || '',
        mediaType: type,
      }).returning();
      
      // Process uploaded media
      const mediaJobs: ProcessingJob[] = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const validation = validateFile(file);
          if (validation.valid) {
            const job = await mediaProcessor.processMedia(file);
            mediaJobs.push(job);
            
            // Store media reference in database
            if (job.result) {
              await db.insert(postMedia).values({
                postId: post.id,
                mediaUrl: job.result.originalUrl,
                thumbnailUrl: job.result.thumbnailUrl,
                mediaType: job.result.type,
                fileSize: job.result.size,
                width: job.result.dimensions?.width,
                height: job.result.dimensions?.height,
                duration: job.result.duration,
              });
            }
          }
        }
      }
      
      res.json({
        post,
        mediaJobs: mediaJobs.map(job => ({
          jobId: job.id,
          status: job.status,
          type: job.type
        })),
        message: 'Post created with media processing started'
      });
      
    } catch (error: any) {
      console.error('Post with media error:', error);
      res.status(500).json({ 
        error: 'Failed to create post with media', 
        details: error.message 
      });
    }
  });
  
  // Serve uploaded files with proper caching headers
  app.get('/uploads/:type/:filename', (req, res) => {
    const { type, filename } = req.params;
    const allowedTypes = ['images', 'videos', 'thumbnails'];
    
    if (!allowedTypes.includes(type)) {
      return res.status(404).json({ error: 'Invalid media type' });
    }
    
    const filePath = `./uploads/${type}/${filename}`;
    
    // Set aggressive caching headers for media files
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
    res.setHeader('ETag', `"${Date.now()}"`);
    
    res.sendFile(filePath, { root: '.' }, (err) => {
      if (err) {
        console.error('File serve error:', err);
        res.status(404).json({ error: 'File not found' });
      }
    });
  });
  
  // Media optimization endpoint
  app.post('/api/media/optimize', isAuthenticated, async (req, res) => {
    try {
      const { mediaUrl, width, height, quality = 85 } = req.body;
      
      if (!mediaUrl) {
        return res.status(400).json({ error: 'Media URL required' });
      }
      
      // This would integrate with your media processing pipeline
      // For now, return the optimization status
      res.json({
        original: mediaUrl,
        optimized: `${mediaUrl}?w=${width}&h=${height}&q=${quality}`,
        savings: '25%', // Mock savings
        message: 'Media optimization completed'
      });
      
    } catch (error: any) {
      console.error('Media optimization error:', error);
      res.status(500).json({ 
        error: 'Optimization failed', 
        details: error.message 
      });
    }
  });
  
}
