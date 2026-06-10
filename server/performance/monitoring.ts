// Performance monitoring and profiling tools
import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

interface PerformanceMetric {
  timestamp: number;
  route: string;
  method: string;
  duration: number;
  statusCode: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

interface ResourceMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    heap: NodeJS.MemoryUsage;
  };
  activeConnections: number;
  timestamp: number;
}

export interface RouteStat {
  count: number;
  averageTime: number;
  slowCount: number;
  errorCount: number;
}

export interface WindowStats {
  windowMs: number;
  totalRequests: number;
  averageResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  slowRequests: number;
  errorRate: number;
  serverErrorRate: number;
  routeStats: Record<string, RouteStat>;
}

export interface MonotonicCounters {
  totalRequests: number;
  totalErrors: number;
  totalServerErrors: number;
  totalDurationMs: number;
}

export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static resourceMetrics: ResourceMetrics[] = [];
  private static maxMetrics = 5000;
  private static startTime = Date.now();

  // Monotonic counters â€” never decrease, safe for Prometheus `rate()`.
  private static counters: MonotonicCounters = {
    totalRequests: 0,
    totalErrors: 0,
    totalServerErrors: 0,
    totalDurationMs: 0,
  };

  static getCounters(): MonotonicCounters {
    return { ...this.counters };
  }

  static getWindowStats(windowMs: number): WindowStats {
    const cutoff = Date.now() - windowMs;
    const recent = this.metrics.filter(m => m.timestamp > cutoff);
    const total = recent.length;

    if (total === 0) {
      return {
        windowMs,
        totalRequests: 0,
        averageResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        slowRequests: 0,
        errorRate: 0,
        serverErrorRate: 0,
        routeStats: {},
      };
    }

    const sorted = recent.map(m => m.duration).sort((a, b) => a - b);
    const pickPercentile = (p: number): number => {
      const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
      return sorted[idx];
    };

    const errors = recent.filter(m => m.statusCode >= 400).length;
    const serverErrors = recent.filter(m => m.statusCode >= 500).length;
    const slow = recent.filter(m => m.duration > 1000).length;
    const sumDuration = recent.reduce((acc, m) => acc + m.duration, 0);

    const routeStats: Record<string, RouteStat> = {};
    for (const metric of recent) {
      const key = `${metric.method} ${metric.route}`;
      const existing = routeStats[key] ?? { count: 0, averageTime: 0, slowCount: 0, errorCount: 0 };
      existing.count++;
      existing.averageTime += metric.duration;
      if (metric.duration > 1000) existing.slowCount++;
      if (metric.statusCode >= 400) existing.errorCount++;
      routeStats[key] = existing;
    }
    for (const key of Object.keys(routeStats)) {
      routeStats[key].averageTime /= routeStats[key].count;
    }

    return {
      windowMs,
      totalRequests: total,
      averageResponseTime: sumDuration / total,
      p50ResponseTime: pickPercentile(50),
      p95ResponseTime: pickPercentile(95),
      p99ResponseTime: pickPercentile(99),
      slowRequests: slow,
      errorRate: (errors / total) * 100,
      serverErrorRate: (serverErrors / total) * 100,
      routeStats,
    };
  }

  // Request performance middleware
  static requestMonitoring() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();
      const startCpuUsage = process.cpuUsage();
      const startMemory = process.memoryUsage();

      res.on('finish', () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        const endCpuUsage = process.cpuUsage(startCpuUsage);
        const endMemory = process.memoryUsage();

        const metric: PerformanceMetric = {
          timestamp: Date.now(),
          route: req.route?.path || req.path,
          method: req.method,
          duration,
          statusCode: res.statusCode,
          memoryUsage: endMemory,
          cpuUsage: endCpuUsage
        };

        this.recordMetric(metric);

        // Log slow requests
        if (duration > 1000) {
          console.warn(`ðŸŒ Slow request: ${req.method} ${req.path} - ${duration.toFixed(2)}ms`);
        }

        // Add performance headers if not already sent
        if (!res.headersSent) {
          res.set({
            'X-Response-Time': `${duration.toFixed(2)}ms`,
            'X-Memory-Usage': `${(endMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`
          });
        }
      });

      next();
    };
  }

  private static recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);

    // Bump monotonic counters (used by Prometheus rate()).
    this.counters.totalRequests++;
    this.counters.totalDurationMs += metric.duration;
    if (metric.statusCode >= 400) this.counters.totalErrors++;
    if (metric.statusCode >= 500) this.counters.totalServerErrors++;

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  // Resource monitoring
  static startResourceMonitoring(intervalMs: number = 30000) {
    setInterval(async () => {
      const cpuUsage = process.cpuUsage();
      const memoryUsage = process.memoryUsage();
      const os = await import('os');
      const loadAverage = os.loadavg();

      const metric: ResourceMetrics = {
        cpu: {
          usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
          loadAverage
        },
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
          heap: memoryUsage
        },
        activeConnections: 0, // Would need to track this separately
        timestamp: Date.now()
      };

      this.resourceMetrics.push(metric);
      
      // Keep only recent metrics
      if (this.resourceMetrics.length > 100) {
        this.resourceMetrics = this.resourceMetrics.slice(-100);
      }

      // Alert on high resource usage
      if (metric.memory.percentage > 90) {
        console.warn(`âš ï¸ High memory usage: ${metric.memory.percentage.toFixed(2)}%`);
      }

    }, intervalMs);
  }

  // Get performance statistics
  static getStats() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > last24h);

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowRequests: 0,
        errorRate: 0,
        routeStats: {},
        uptime: (now - this.startTime) / 1000
      };
    }

    const totalRequests = recentMetrics.length;
    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
    const slowRequests = recentMetrics.filter(m => m.duration > 1000).length;
    const errorRequests = recentMetrics.filter(m => m.statusCode >= 400).length;
    const serverErrorRequests = recentMetrics.filter(m => m.statusCode >= 500).length;
    const errorRate = (errorRequests / totalRequests) * 100;
    const serverErrorRate = (serverErrorRequests / totalRequests) * 100;

    // p95 / p99 over the recent window â€” used by /metrics + the dashboard.
    const sortedDurations = recentMetrics
      .map(m => m.duration)
      .sort((a, b) => a - b);
    const pickPercentile = (p: number) => {
      if (sortedDurations.length === 0) return 0;
      const idx = Math.min(
        sortedDurations.length - 1,
        Math.floor((p / 100) * sortedDurations.length),
      );
      return sortedDurations[idx];
    };
    const p95ResponseTime = pickPercentile(95);
    const p99ResponseTime = pickPercentile(99);

    // Route-specific statistics
    const routeStats: Record<string, {
      count: number;
      averageTime: number;
      slowCount: number;
      errorCount: number;
    }> = {};

    recentMetrics.forEach(metric => {
      const key = `${metric.method} ${metric.route}`;
      if (!routeStats[key]) {
        routeStats[key] = { count: 0, averageTime: 0, slowCount: 0, errorCount: 0 };
      }
      
      routeStats[key].count++;
      routeStats[key].averageTime += metric.duration;
      if (metric.duration > 1000) routeStats[key].slowCount++;
      if (metric.statusCode >= 400) routeStats[key].errorCount++;
    });

    // Calculate averages
    Object.values(routeStats).forEach(stats => {
      stats.averageTime /= stats.count;
    });

    return {
      totalRequests,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      slowRequests,
      errorRate,
      serverErrorRate,
      routeStats,
      uptime: (now - this.startTime) / 1000,
      resourceMetrics: this.resourceMetrics.slice(-10) // Last 10 resource snapshots
    };
  }

  // Health check endpoint data
  static getHealthMetrics() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    const cpuUsage = process.cpuUsage();

    return {
      status: 'healthy',
      uptime: uptime,
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      env: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform
    };
  }

  // Export metrics for external monitoring
  static exportMetrics() {
    return {
      performance: this.metrics,
      resources: this.resourceMetrics,
      stats: this.getStats()
    };
  }

  // Clear old metrics
  static clearMetrics() {
    this.metrics = [];
    this.resourceMetrics = [];
  }
}

// Web Vitals monitoring for client-side performance
export class WebVitalsMonitor {
  static recordVitals(req: Request, res: Response) {
    // Middleware to collect Web Vitals from client
    if (req.path === '/api/vitals' && req.method === 'POST') {
      const vitals = req.body;
      
      // Log or store vitals data
      console.log('ðŸ“Š Web Vitals:', {
        route: vitals.route,
        fcp: vitals.fcp, // First Contentful Paint
        lcp: vitals.lcp, // Largest Contentful Paint
        fid: vitals.fid, // First Input Delay
        cls: vitals.cls, // Cumulative Layout Shift
        ttfb: vitals.ttfb // Time to First Byte
      });

      res.json({ status: 'recorded' });
      return;
    }
  }
}

// Error tracking and performance correlation
export class ErrorMonitor {
  private static errors: Array<{
    timestamp: number;
    error: string;
    stack?: string;
    route: string;
    method: string;
    duration?: number;
  }> = [];

  static trackError(error: Error, req: Request, duration?: number) {
    this.errors.push({
      timestamp: Date.now(),
      error: error.message,
      stack: error.stack,
      route: req.route?.path || req.path,
      method: req.method,
      duration
    });

    // Keep only recent errors
    if (this.errors.length > 500) {
      this.errors = this.errors.slice(-500);
    }

    // Log critical errors
    console.error(`ðŸ’¥ Error in ${req.method} ${req.path}:`, error.message);
  }

  static getErrorStats() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const recentErrors = this.errors.filter(e => e.timestamp > last24h);

    const errorsByRoute: Record<string, number> = {};
    recentErrors.forEach(error => {
      const key = `${error.method} ${error.route}`;
      errorsByRoute[key] = (errorsByRoute[key] || 0) + 1;
    });

    return {
      totalErrors: recentErrors.length,
      errorsByRoute,
      recentErrors: recentErrors.slice(-10)
    };
  }
}

export default PerformanceMonitor;
