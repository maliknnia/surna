// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { Request, Response, NextFunction } from "express";
import fileUpload from "express-fileupload";
import { createHash } from "crypto";
import path from "path";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const uploadsMw = fileUpload({
  limits: { fileSize: MAX_FILE_SIZE },
  abortOnLimit: true,
  responseOnLimit: "File size limit exceeded"
});

// MIME type validation
const ALLOWED_MIMES = {
  image: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif"
  ],
  video: [
    "video/mp4",
    "video/webm",
    "video/quicktime"
  ],
  audio: [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg"
  ],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ]
};

export function enforceMime(allowedTypes: (keyof typeof ALLOWED_MIMES)[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const files = (req as any).files;
    if (!files || !files.file) {
      return res.status(400).json({ error: "missing_file" });
    }
    
    const file = files.file;
    const allowedMimes = allowedTypes.flatMap(type => ALLOWED_MIMES[type]);
    
    if (!allowedMimes.includes(file.mimetype)) {
      return res.status(415).json({ 
        error: "unsupported_media_type",
        message: `Allowed types: ${allowedMimes.join(", ")}`
      });
    }
    
    next();
  };
}

// Magic bytes validation for common file types
const MAGIC_BYTES: Record<string, { bytes: number[]; offset: number }[]> = {
  "image/jpeg": [
    { bytes: [0xFF, 0xD8, 0xFF], offset: 0 }
  ],
  "image/png": [
    { bytes: [0x89, 0x50, 0x4E, 0x47], offset: 0 }
  ],
  "image/gif": [
    { bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 }
  ],
  "video/mp4": [
    { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 } // ftyp
  ],
  "application/pdf": [
    { bytes: [0x25, 0x50, 0x44, 0x46], offset: 0 } // %PDF
  ]
};

export function validateMagicBytes() {
  return (req: Request, res: Response, next: NextFunction) => {
    const files = (req as any).files;
    if (!files || !files.file) {
      return next();
    }
    
    const file = files.file;
    const expectedSignatures = MAGIC_BYTES[file.mimetype];
    
    if (!expectedSignatures) {
      // No magic bytes check for this type
      return next();
    }
    
    const buffer = file.data;
    const isValid = expectedSignatures.some(sig => {
      return sig.bytes.every((byte, i) => 
        buffer[sig.offset + i] === byte
      );
    });
    
    if (!isValid) {
      return res.status(400).json({
        error: "invalid_file",
        message: "File content does not match declared type"
      });
    }
    
    next();
  };
}

// Generate safe filename
export function generateSafeFilename(originalName: string, userId: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const random = createHash("sha256")
    .update(`${userId}${timestamp}${Math.random()}`)
    .digest("hex")
    .slice(0, 16);
  
  return `${userId}_${timestamp}_${random}${ext}`;
}

// EXIF stripping (basic - use sharp or exiftool in production)
export function shouldStripExif(mimetype: string): boolean {
  return mimetype.startsWith("image/");
}

// Virus scan placeholder
export async function virusScan(fileBuffer: Buffer): Promise<boolean> {
  // TODO: Integrate with ClamAV or cloud antivirus service
  // For now, just check file size as a basic heuristic
  if (fileBuffer.length === 0) {
    return false;
  }
  
  // In production, call antivirus service here
  // Example: await clamav.scanBuffer(fileBuffer);
  
  return true; // Assume clean for now
}

// Complete upload validation middleware
export function validateUpload(allowedTypes: (keyof typeof ALLOWED_MIMES)[], maxSize?: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const files = (req as any).files;
    if (!files || !files.file) {
      return res.status(400).json({ error: "missing_file" });
    }
    
    const file = files.file;
    
    // Size check
    const sizeLimit = maxSize || MAX_FILE_SIZE;
    if (file.size > sizeLimit) {
      return res.status(413).json({ 
        error: "file_too_large",
        message: `Maximum file size: ${sizeLimit / (1024 * 1024)}MB`
      });
    }
    
    // MIME type check
    const allowedMimes = allowedTypes.flatMap(type => ALLOWED_MIMES[type]);
    if (!allowedMimes.includes(file.mimetype)) {
      return res.status(415).json({ 
        error: "unsupported_media_type"
      });
    }
    
    // Magic bytes check
    const expectedSignatures = MAGIC_BYTES[file.mimetype];
    if (expectedSignatures) {
      const buffer = file.data;
      const isValid = expectedSignatures.some(sig => {
        return sig.bytes.every((byte, i) => 
          buffer[sig.offset + i] === byte
        );
      });
      
      if (!isValid) {
        return res.status(400).json({
          error: "invalid_file",
          message: "File content does not match declared type"
        });
      }
    }
    
    // Virus scan
    const isClean = await virusScan(file.data);
    if (!isClean) {
      return res.status(400).json({
        error: "malicious_file",
        message: "File failed security scan"
      });
    }
    
    next();
  };
}

// Generate signed URL for secure file access
export function generateSignedUrl(filePath: string, expiresIn: number = 3600): string {
  const expiry = Math.floor(Date.now() / 1000) + expiresIn;
  const signature = createHash("sha256")
    .update(`${filePath}${expiry}${process.env.SIGNED_URL_SECRET || "default-secret"}`)
    .digest("hex");
  
  return `${filePath}?expires=${expiry}&signature=${signature}`;
}

// Verify signed URL
export function verifySignedUrl(req: Request, res: Response, next: NextFunction) {
  const { expires, signature } = req.query;
  
  if (!expires || !signature) {
    return res.status(401).json({ error: "missing_signature" });
  }
  
  const now = Math.floor(Date.now() / 1000);
  if (parseInt(expires as string) < now) {
    return res.status(401).json({ error: "url_expired" });
  }
  
  const filePath = req.path;
  const expectedSig = createHash("sha256")
    .update(`${filePath}${expires}${process.env.SIGNED_URL_SECRET || "default-secret"}`)
    .digest("hex");
  
  if (signature !== expectedSig) {
    return res.status(401).json({ error: "invalid_signature" });
  }
  
  next();
}
