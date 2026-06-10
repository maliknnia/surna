// usePerformanceMonitoring Hook - Web Vitals and Performance Tracking
import { useEffect, useCallback } from 'react';
import { onCLS, onFCP, onLCP, onTTFB } from 'web-vitals';

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface UsePerformanceMonitoringOptions {
  reportUrl?: string;
  enableLogging?: boolean;
  onMetric?: (metric: PerformanceMetric) => void;
}

export function usePerformanceMonitoring(options: UsePerformanceMonitoringOptions = {}) {
  const { reportUrl, enableLogging = true, onMetric } = options;

  const handleMetric = useCallback((metric: any) => {
    const performanceMetric: PerformanceMetric = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      timestamp: Date.now()
    };

    if (enableLogging) {
      console.log(`Performance metric: ${metric.name}`, {
        value: metric.value,
        rating: metric.rating,
        id: metric.id
      });
    }

    // Call custom handler if provided
    if (onMetric) {
      onMetric(performanceMetric);
    }

    // Send to analytics endpoint if provided
    if (reportUrl) {
      fetch(reportUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metric: performanceMetric,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: performanceMetric.timestamp
        })
      }).catch(error => {
        console.error('Failed to report performance metric:', error);
      });
    }
  }, [reportUrl, enableLogging, onMetric]);

  useEffect(() => {
    // Core Web Vitals
    onCLS(handleMetric); // Cumulative Layout Shift
    onFCP(handleMetric); // First Contentful Paint
    onLCP(handleMetric); // Largest Contentful Paint
    onTTFB(handleMetric); // Time to First Byte

    // Additional performance observations
    if ('PerformanceObserver' in window) {
      // Long Task Observer
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (entry.duration > 50) { // Tasks longer than 50ms
              handleMetric({
                name: 'long-task',
                value: entry.duration,
                rating: entry.duration > 100 ? 'poor' : 'needs-improvement'
              });
            }
          });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Long task observer not supported:', error);
      }

      // Navigation Timing
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            handleMetric({
              name: 'navigation-timing',
              value: entry.loadEventEnd - entry.navigationStart,
              rating: entry.loadEventEnd - entry.navigationStart > 3000 ? 'poor' : 
                     entry.loadEventEnd - entry.navigationStart > 1500 ? 'needs-improvement' : 'good'
            });
          });
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
      } catch (error) {
        console.warn('Navigation observer not supported:', error);
      }

      // Resource Timing
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            // Track slow resources
            if (entry.duration > 1000) {
              handleMetric({
                name: 'slow-resource',
                value: entry.duration,
                rating: entry.duration > 3000 ? 'poor' : 'needs-improvement'
              });
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('Resource observer not supported:', error);
      }
    }
  }, [handleMetric]);

  // Manual performance tracking utilities
  const trackCustomMetric = useCallback((name: string, value: number, rating?: 'good' | 'needs-improvement' | 'poor') => {
    handleMetric({
      name: `custom-${name}`,
      value,
      rating: rating || (value < 100 ? 'good' : value < 300 ? 'needs-improvement' : 'poor')
    });
  }, [handleMetric]);

  const measureAsyncOperation = useCallback(async <T>(name: string, operation: () => Promise<T>): Promise<T> => {
    const startTime = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      trackCustomMetric(`async-${name}`, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      trackCustomMetric(`async-${name}-error`, duration);
      throw error;
    }
  }, [trackCustomMetric]);

  const measureRender = useCallback((name: string, renderFn: () => void) => {
    const startTime = performance.now();
    renderFn();
    const duration = performance.now() - startTime;
    trackCustomMetric(`render-${name}`, duration);
  }, [trackCustomMetric]);

  return {
    trackCustomMetric,
    measureAsyncOperation,
    measureRender
  };
}