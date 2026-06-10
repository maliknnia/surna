import { Request, Response, NextFunction } from 'express';

// Enhanced error tracking and logging
export interface ErrorContext {
  user?: { id: string; email: string };
  request?: {
    method: string;
    url: string;
    headers: Record<string, any>;
    body?: any;
  };
  timestamp: string;
  environment: string;
}

// Sentry-ready error tracking
export function trackError(error: Error, context: ErrorContext) {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    context,
    severity: getSeverity(error),
  };

  // Log to console (in production, this would go to Sentry)
  console.error('🚨 Error Tracked:', JSON.stringify(errorLog, null, 2));

  // Future: Send to Sentry
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, {
  //     user: context.user,
  //     extra: context.request,
  //     tags: {
  //       environment: context.environment
  //     }
  //   });
  // }
}

function getSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
  const message = error.message.toLowerCase();
  
  // Critical: Authentication, authorization, data corruption
  if (message.includes('unauthorized') || message.includes('forbidden') || 
      message.includes('corrupt') || message.includes('sql injection')) {
    return 'critical';
  }
  
  // High: Database errors, external service failures
  if (message.includes('database') || message.includes('connection') ||
      message.includes('timeout') || message.includes('network')) {
    return 'high';
  }
  
  // Medium: Validation errors, business logic issues
  if (message.includes('validation') || message.includes('invalid') ||
      message.includes('not found')) {
    return 'medium';
  }
  
  return 'low';
}

// Express error tracking middleware
export function errorTrackingMiddleware() {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {
    // Extract user context if available
    const user = (req as any).jwtUser ? {
      id: (req as any).jwtUser.id,
      email: (req as any).jwtUser.email
    } : undefined;

    // Build context
    const context: ErrorContext = {
      user,
      request: {
        method: req.method,
        url: req.originalUrl,
        headers: filterSensitiveHeaders(req.headers),
        body: filterSensitiveData(req.body)
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };

    // Track the error
    trackError(error, context);

    // Continue with normal error handling
    next(error);
  };
}

// Filter out sensitive information from headers
function filterSensitiveHeaders(headers: Record<string, any>): Record<string, any> {
  const filtered = { ...headers };
  delete filtered.authorization;
  delete filtered.cookie;
  delete filtered['x-api-key'];
  return filtered;
}

// Filter out sensitive information from request body
function filterSensitiveData(body: any): any {
  if (!body || typeof body !== 'object') return body;
  
  const filtered = { ...body };
  delete filtered.password;
  delete filtered.token;
  delete filtered.secret;
  delete filtered.apiKey;
  
  return filtered;
}