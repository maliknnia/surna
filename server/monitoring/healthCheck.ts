// Stage 2 Health monitoring and metrics
import { Request, Response } from 'express';
import { db } from '../db';
import { getCacheStats } from '../cache/redisWrapper';

interface HealthMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  database: {
    status: 'connected' | 'disconnected';
    responseTime: number;
  };
  cache: any;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  requests: {
    total: number;
    errors: number;
    errorRate: number;
  };
}

// Metrics tracking
let requestCount = 0;
let errorCount = 0;

export function incrementRequestCount() {
  requestCount++;
}

export function incrementErrorCount() {
  errorCount++;
}

// Health check endpoint
export async function healthCheck(req: Request, res: Response) {
  const startTime = Date.now();
  
  try {
    // Test database connection
    await db.execute('SELECT 1');
    const dbResponseTime = Date.now() - startTime;
    
    // Get cache stats
    const cacheStats = await getCacheStats();
    
    // Memory usage
    const memUsage = process.memoryUsage();
    const memoryUsed = memUsage.heapUsed / 1024 / 1024; // MB
    const memoryTotal = memUsage.heapTotal / 1024 / 1024; // MB
    
    // Calculate error rate
    const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
    
    const metrics: HealthMetrics = {
      status: errorRate > 5 ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: 'connected',
        responseTime: dbResponseTime
      },
      cache: cacheStats,
      memory: {
        used: Math.round(memoryUsed),
        total: Math.round(memoryTotal),
        percentage: Math.round((memoryUsed / memoryTotal) * 100)
      },
      requests: {
        total: requestCount,
        errors: errorCount,
        errorRate: Math.round(errorRate * 100) / 100
      }
    };
    
    // Set HTTP status based on health
    const statusCode = metrics.status === 'healthy' ? 200 : 
                      metrics.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(metrics);
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: {
        status: 'disconnected',
        responseTime: -1
      }
    });
  }
}

// Simple metrics endpoint
export function metricsEndpoint(req: Request, res: Response) {
  const metrics = {
    requests_total: requestCount,
    errors_total: errorCount,
    error_rate: requestCount > 0 ? (errorCount / requestCount) : 0,
    uptime_seconds: process.uptime(),
    memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    timestamp: Date.now()
  };
  
  res.json(metrics);
}
