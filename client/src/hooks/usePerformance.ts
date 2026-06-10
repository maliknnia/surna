// Frontend performance hooks and utilities
import { useEffect, useRef, useState, useCallback } from 'react';
import { PerformanceMonitor } from '@/lib/performance';

// Hook for measuring component render performance
export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(0);

  useEffect(() => {
    renderCount.current++;
    const now = performance.now();
    
    if (lastRenderTime.current > 0) {
      const timeSinceLastRender = now - lastRenderTime.current;
      
      // Log slow re-renders in development
      if (process.env.NODE_ENV === 'development' && timeSinceLastRender > 16) {
        console.warn(`🐌 Slow re-render: ${componentName} took ${timeSinceLastRender.toFixed(2)}ms`);
      }
    }
    
    lastRenderTime.current = now;
  });

  return {
    renderCount: renderCount.current,
    componentName
  };
}

// Hook for measuring page load performance
export function usePagePerformance(pageName: string) {
  const [metrics, setMetrics] = useState<{
    fcp?: number;
    lcp?: number;
    fid?: number;
    cls?: number;
    ttfb?: number;
  }>({});

  useEffect(() => {
    const startTime = performance.now();
    PerformanceMonitor.mark(`${pageName}-start`);

    // Measure page load metrics
    const measureMetrics = () => {
      // First Contentful Paint
      const fcpEntries = performance.getEntriesByName('first-contentful-paint');
      const fcp = fcpEntries.length > 0 ? fcpEntries[0].startTime : undefined;

      // Navigation timing
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const navEntry = navEntries[0];
      
      const newMetrics = {
        fcp,
        ttfb: navEntry ? navEntry.responseStart - navEntry.requestStart : undefined
      };

      setMetrics(newMetrics);

      // Send metrics to server for monitoring
      if (typeof window !== 'undefined') {
        fetch('/api/vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            route: pageName,
            ...newMetrics,
            timestamp: Date.now()
          })
        }).catch(() => {
          // Silently fail - don't block user experience
        });
      }
    };

    // Measure after page is fully loaded
    if (document.readyState === 'complete') {
      measureMetrics();
    } else {
      window.addEventListener('load', measureMetrics);
    }

    return () => {
      PerformanceMonitor.measure(`${pageName}-load`, `${pageName}-start`);
      window.removeEventListener('load', measureMetrics);
    };
  }, [pageName]);

  return metrics;
}

// Hook for monitoring component memory usage
export function useMemoryMonitoring(componentName: string, enabled: boolean = false) {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  }>({});

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // @ts-ignore - performance.memory is not standard but widely supported
    const memory = (performance as any).memory;
    if (!memory) return;

    const updateMemoryInfo = () => {
      setMemoryInfo({
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      });
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [enabled, componentName]);

  return memoryInfo;
}

// Hook for monitoring long tasks that block the main thread
export function useLongTaskMonitoring() {
  const [longTasks, setLongTasks] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const tasks = list.getEntries().filter(entry => entry.duration > 50); // Tasks longer than 50ms
      
      if (tasks.length > 0) {
        setLongTasks(prev => prev + tasks.length);
        console.warn(`🚨 Long tasks detected: ${tasks.length} tasks blocking main thread`);
      }
    });

    try {
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      console.log('Long task monitoring not supported');
    }

    return () => observer.disconnect();
  }, []);

  return longTasks;
}

// Hook for FPS monitoring
export function useFPSMonitoring() {
  const [fps, setFps] = useState<number>(60);
  const frameRef = useRef<number>();
  const lastTimeRef = useRef<number>(performance.now());
  const framesRef = useRef<number>(0);

  useEffect(() => {
    const measureFPS = () => {
      const now = performance.now();
      framesRef.current++;

      if (now >= lastTimeRef.current + 1000) {
        const currentFPS = Math.round((framesRef.current * 1000) / (now - lastTimeRef.current));
        setFps(currentFPS);
        
        // Warn about low FPS
        if (currentFPS < 30) {
          console.warn(`🚨 Low FPS detected: ${currentFPS}fps`);
        }
        
        framesRef.current = 0;
        lastTimeRef.current = now;
      }

      frameRef.current = requestAnimationFrame(measureFPS);
    };

    frameRef.current = requestAnimationFrame(measureFPS);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return fps;
}

// Hook for bundle size monitoring
export function useBundleMonitoring() {
  const [bundleInfo, setBundleInfo] = useState<{
    loadTime?: number;
    resourceCount?: number;
    totalSize?: number;
  }>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const measureBundle = () => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const jsResources = resources.filter(r => r.name.includes('.js'));
      const cssResources = resources.filter(r => r.name.includes('.css'));
      
      const totalSize = [...jsResources, ...cssResources].reduce((size, resource) => {
        return size + (resource.transferSize || 0);
      }, 0);

      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const loadTime = navEntries[0]?.loadEventEnd - navEntries[0]?.startTime;

      setBundleInfo({
        loadTime,
        resourceCount: jsResources.length + cssResources.length,
        totalSize
      });
    };

    if (document.readyState === 'complete') {
      measureBundle();
    } else {
      window.addEventListener('load', measureBundle);
    }

    return () => window.removeEventListener('load', measureBundle);
  }, []);

  return bundleInfo;
}

// Performance optimization recommendations
export function usePerformanceRecommendations() {
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    const newRecommendations: string[] = [];

    // Check connection type
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
        newRecommendations.push('Consider reducing image quality for slow connection');
      }
    }

    // Check device memory
    if ('deviceMemory' in navigator) {
      const memory = (navigator as any).deviceMemory;
      if (memory < 4) {
        newRecommendations.push('Consider enabling reduced animation mode for low-memory device');
      }
    }

    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      newRecommendations.push('User prefers reduced motion - animations should be minimal');
    }

    setRecommendations(newRecommendations);
  }, []);

  return recommendations;
}