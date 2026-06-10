// Response compression and optimization middleware
import compression from 'compression';
import { Request, Response, NextFunction } from 'express';

// Enhanced compression middleware with performance optimizations
export function createCompressionMiddleware() {
  return compression({
    // Only compress responses that are 1KB or larger
    threshold: 1024,
    
    // Compression level (1-9, higher = better compression but slower)
    level: 6,
    
    // Memory level (1-9, higher = more memory but faster)
    memLevel: 8,
    
    // Custom filter function
    filter: (req: Request, res: Response) => {
      // Don't compress responses with this request header
      if (req.headers['x-no-compression']) {
        return false;
      }

      // Don't compress if response is already compressed
      if (res.getHeader('content-encoding')) {
        return false;
      }

      // Don't compress images, videos, and other binary content
      const contentType = res.getHeader('content-type') as string;
      if (contentType) {
        if (contentType.startsWith('image/') || 
            contentType.startsWith('video/') || 
            contentType.startsWith('audio/') ||
            contentType.includes('application/octet-stream')) {
          return false;
        }
      }

      // Use default compression filter for everything else
      return compression.filter(req, res);
    }
  });
}

// Response optimization middleware
export function responseOptimization() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set optimal caching headers
    if (req.path.includes('/api/')) {
      // API responses - short cache for dynamic content
      res.set({
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        'Vary': 'Accept-Encoding, Authorization'
      });
    } else if (req.path.includes('/static/') || req.path.includes('/assets/')) {
      // Static assets - long cache
      res.set({
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
        'Vary': 'Accept-Encoding'
      });
    }

    // Security headers for performance
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });

    // Enable HTTP/2 Server Push hints (if supported by proxy)
    if (req.path === '/' || req.path === '/index.html') {
      res.set('Link', [
        '</static/css/main.css>; rel=preload; as=style',
        '</static/js/main.js>; rel=preload; as=script',
        '</api/auth/user>; rel=prefetch'
      ].join(', '));
    }

    next();
  };
}

// JSON response optimization
export function optimizeJsonResponse() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    res.json = function(obj: any) {
      // Remove undefined values and null fields to reduce payload size
      const optimizedObj = removeUndefinedAndNull(obj);
      
      // Set appropriate content type
      res.type('application/json; charset=utf-8');
      
      // Call original json method
      return originalJson.call(this, optimizedObj);
    };

    next();
  };
}

// Remove undefined and null values from objects
function removeUndefinedAndNull(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedAndNull).filter(item => item !== undefined);
  }

  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = removeUndefinedAndNull(value);
      if (cleanedValue !== undefined && cleanedValue !== null) {
        cleaned[key] = cleanedValue;
      }
    }
    return cleaned;
  }

  return obj;
}

// Response streaming for large datasets
export class StreamingResponse {
  static jsonStream(res: Response, data: any[], chunkSize: number = 100) {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked'
    });

    res.write('[');
    
    let sentItems = 0;
    const sendChunk = () => {
      const chunk = data.slice(sentItems, sentItems + chunkSize);
      
      if (chunk.length === 0) {
        res.write(']');
        res.end();
        return;
      }

      const chunkJson = chunk.map(item => JSON.stringify(item)).join(',');
      const prefix = sentItems > 0 ? ',' : '';
      
      res.write(prefix + chunkJson);
      sentItems += chunk.length;

      // Use setImmediate to avoid blocking the event loop
      setImmediate(sendChunk);
    };

    sendChunk();
  }

  static csvStream(res: Response, data: any[], headers: string[]) {
    res.writeHead(200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="export.csv"',
      'Transfer-Encoding': 'chunked'
    });

    // Write headers
    res.write(headers.join(',') + '\n');

    // Stream data in chunks
    let index = 0;
    const writeChunk = () => {
      const endIndex = Math.min(index + 1000, data.length); // 1000 rows per chunk
      
      for (let i = index; i < endIndex; i++) {
        const row = headers.map(header => {
          const value = data[i][header] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',');
        res.write(row + '\n');
      }

      index = endIndex;

      if (index < data.length) {
        setImmediate(writeChunk);
      } else {
        res.end();
      }
    };

    writeChunk();
  }
}

// Performance monitoring for responses
export function responseTimeMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      // Log slow requests
      if (duration > 1000) { // More than 1 second
        console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
      }

      // Add response time header
      res.set('X-Response-Time', `${duration}ms`);
    });

    next();
  };
}
