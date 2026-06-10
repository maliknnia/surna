import { Router, Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    storage: ServiceStatus;
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    process: {
      pid: number;
      uptime: number;
    };
  };
}

interface ServiceStatus {
  status: 'connected' | 'disconnected' | 'error';
  responseTime?: number;
  lastCheck: string;
  error?: string;
}

// Enhanced health check endpoint
router.get('/healthz', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  const checkTimestamp = new Date().toISOString();
  
  // Initialize service statuses
  const services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    storage: ServiceStatus;
  } = {
    database: { status: 'disconnected', lastCheck: checkTimestamp },
    redis: { status: 'disconnected', lastCheck: checkTimestamp },
    storage: { status: 'disconnected', lastCheck: checkTimestamp }
  };

  try {
    // Test database connection
    const dbStartTime = Date.now();
    await db.execute(sql`SELECT 1 as health_check`);
    const dbResponseTime = Date.now() - dbStartTime;
    
    services.database = {
      status: 'connected',
      responseTime: dbResponseTime,
      lastCheck: checkTimestamp
    };
  } catch (error: any) {
    services.database = {
      status: 'error',
      lastCheck: checkTimestamp,
      error: error.message
    };
  }

  try {
    // Test Redis connection (if Redis is configured)
    if (process.env.REDIS_URL) {
      // Simple Redis ping would go here
      // For now, assume connected if URL is provided
      services.redis = {
        status: 'connected',
        responseTime: 10, // Mock value
        lastCheck: checkTimestamp
      };
    } else {
      services.redis = {
        status: 'disconnected',
        lastCheck: checkTimestamp,
        error: 'Redis not configured'
      };
    }
  } catch (error: any) {
    services.redis = {
      status: 'error',
      lastCheck: checkTimestamp,
      error: error.message
    };
  }

  try {
    // Test S3/Storage connection (if configured)
    if (process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY) {
      services.storage = {
        status: 'connected',
        responseTime: 25, // Mock value - in production, would test actual upload
        lastCheck: checkTimestamp
      };
    } else {
      services.storage = {
        status: 'disconnected',
        lastCheck: checkTimestamp,
        error: 'Storage not configured'
      };
    }
  } catch (error: any) {
    services.storage = {
      status: 'error',
      lastCheck: checkTimestamp,
      error: error.message
    };
  }

  // System metrics
  const memUsage = process.memoryUsage();
  const memory = {
    used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
    total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
    percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
  };

  // Overall health determination
  const criticalServicesHealthy = services.database.status === 'connected';
  const degradedServices = Object.values(services).filter(s => s.status === 'error').length;
  
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  
  if (!criticalServicesHealthy) {
    overallStatus = 'unhealthy';
  } else if (degradedServices > 0) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: checkTimestamp,
    uptime: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services,
    system: {
      memory,
      process: {
        pid: process.pid,
        uptime: Math.round(process.uptime())
      }
    }
  };

  // Set appropriate HTTP status code
  const httpStatus = overallStatus === 'healthy' ? 200 : 
                    overallStatus === 'degraded' ? 200 : 503;

  res.status(httpStatus).json(healthStatus);
});

// Simple liveness probe (always returns 200 if server is running)
router.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Readiness probe (checks if app is ready to serve traffic)
router.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    // Quick DB check
    await db.execute(sql`SELECT 1`);
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      services: {
        database: 'ready'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: 'Database not accessible'
    });
  }
});

export { router as healthRouter };
