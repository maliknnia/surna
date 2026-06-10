// Performance optimization utilities and hooks
import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

// Debounce hook for performance optimization
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook for performance optimization
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  options?: IntersectionObserverInit
): [React.RefCallback<Element>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [element, setElement] = useState<Element | null>(null);

  const ref = useCallback((node: Element | null) => {
    setElement(node);
  }, []);

  useEffect(() => {
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      options
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [element, options]);

  return [ref, isIntersecting];
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static marks: Map<string, number> = new Map();
  private static measures: Map<string, number> = new Map();

  static mark(name: string): void {
    this.marks.set(name, performance.now());
    if (performance.mark) {
      performance.mark(name);
    }
  }

  static measure(name: string, startMark: string, endMark?: string): number {
    const startTime = this.marks.get(startMark);
    if (!startTime) {
      console.warn(`Start mark "${startMark}" not found`);
      return 0;
    }

    const endTime = endMark ? this.marks.get(endMark) : performance.now();
    if (endMark && !endTime) {
      console.warn(`End mark "${endMark}" not found`);
      return 0;
    }

    const duration = (endTime as number) - startTime;
    this.measures.set(name, duration);

    if (performance.measure && endMark) {
      performance.measure(name, startMark, endMark);
    }

    return duration;
  }

  static getMetrics(): { marks: Map<string, number>; measures: Map<string, number> } {
    return {
      marks: new Map(this.marks),
      measures: new Map(this.measures)
    };
  }

  static clearMetrics(): void {
    this.marks.clear();
    this.measures.clear();
    if (performance.clearMarks) {
      performance.clearMarks();
    }
    if (performance.clearMeasures) {
      performance.clearMeasures();
    }
  }
}

// Image optimization utilities
export function getOptimizedImageUrl(
  originalUrl: string,
  width?: number,
  height?: number,
  quality: number = 80
): string {
  if (!originalUrl) return originalUrl;

  // For Unsplash images, add optimization parameters
  if (originalUrl.includes('unsplash.com')) {
    const url = new URL(originalUrl);
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    url.searchParams.set('q', quality.toString());
    url.searchParams.set('auto', 'format');
    return url.toString();
  }

  // For other images, return as-is (would implement CDN optimization in production)
  return originalUrl;
}

// Memory usage optimization
export function useMemoryOptimization() {
  const cleanupFunctions = useRef<(() => void)[]>([]);

  const addCleanup = useCallback((cleanup: () => void) => {
    cleanupFunctions.current.push(cleanup);
  }, []);

  useEffect(() => {
    return () => {
      // Run all cleanup functions on unmount
      cleanupFunctions.current.forEach(cleanup => cleanup());
      cleanupFunctions.current = [];
    };
  }, []);

  return { addCleanup };
}

// Bundle size analysis utility
export function logBundleInfo() {
  if (import.meta.env.DEV) {
    console.group('📦 Bundle Performance Info');
    console.log('Build mode:', import.meta.env.MODE);
    console.log('Environment:', import.meta.env.MODE);
    
    // Log performance entries if available
    if (typeof window !== 'undefined' && performance.getEntriesByType) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0];
        console.log('Page Load Time:', `${nav.loadEventEnd - nav.startTime}ms`);
        console.log('DOM Content Loaded:', `${nav.domContentLoadedEventEnd - nav.startTime}ms`);
        console.log('First Paint:', `${nav.responseStart - nav.startTime}ms`);
      }
    }
    console.groupEnd();
  }
}

// Enhanced performance utilities for Feed-like experience
export const PERFORMANCE_CONSTANTS = {
  CACHE_TIME: 1000 * 60 * 10, // 10 minutes
  STALE_TIME: 1000 * 60 * 2,  // 2 minutes
  PAGE_SIZE: 20,
  INTERSECTION_THRESHOLD: 0.5,
  INTERSECTION_ROOT_MARGIN: '100px'
} as const;

// Optimized infinite query hook (like Feed)
export function useOptimizedInfiniteQuery<T>({
  queryKey,
  endpoint,
  pageSize = PERFORMANCE_CONSTANTS.PAGE_SIZE,
  enabled = true
}: {
  queryKey: string[];
  endpoint: string;
  pageSize?: number;
  enabled?: boolean;
}) {
  const { useInfiniteQuery } = require('@tanstack/react-query');
  const { apiRequest } = require('@/lib/queryClient');
  
  return useInfiniteQuery({
    queryKey: [...queryKey, pageSize],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      const url = pageParam 
        ? `${endpoint}?cursor=${pageParam}&limit=${pageSize}`
        : `${endpoint}?limit=${pageSize}`;
      
      const response = await apiRequest('GET', url);
      return response.json();
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: any) => lastPage.nextCursor,
    staleTime: PERFORMANCE_CONSTANTS.STALE_TIME,
    gcTime: PERFORMANCE_CONSTANTS.CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled
  });
}

// Optimistic update utilities
export function useOptimisticUpdate() {
  const { useQueryClient } = require('@tanstack/react-query');
  const queryClient = useQueryClient();
  
  const updateOptimistically = useCallback(
    (queryKey: string[], updater: (oldData: any) => any) => {
      queryClient.setQueryData(queryKey, updater);
    },
    [queryClient]
  );
  
  return { updateOptimistically, queryClient };
}

// Critical resource preloader
export function preloadCriticalResources() {
  const resources = [
    '/api/auth/user', // Critical auth check
    // Add other critical API endpoints
  ];

  resources.forEach(url => {
    if (typeof window !== 'undefined') {
      // Preload using link prefetch
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    }
  });
}

// Virtual scrolling utilities
export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useVirtualScroll<T>(
  items: T[],
  options: VirtualScrollOptions
) {
  const [scrollTop, setScrollTop] = useState(0);
  const { itemHeight, containerHeight, overscan = 5 } = options;

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
    items.length - 1
  );

  const visibleItems = useMemo(() => {
    return items.slice(Math.max(0, startIndex - overscan), endIndex + 1);
  }, [items, startIndex, endIndex, overscan]);

  const totalHeight = items.length * itemHeight;
  const offsetY = Math.max(0, startIndex - overscan) * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex: Math.max(0, startIndex - overscan),
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };
}