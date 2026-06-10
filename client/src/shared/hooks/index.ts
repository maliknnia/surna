/**
 * Shared Hooks
 * 
 * Re-export hooks that are used across multiple features.
 * Feature-specific hooks should stay in their respective feature folders.
 */

// Re-export existing hooks from the hooks directory
export { useAuth } from '@/hooks/useAuth';
export { useConnectivity } from '@/hooks/useConnectivity';
export { useDebounce } from '@/hooks/useDebounce';
export { useEvent } from '@/hooks/useEvents';
export { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
export { useIsMobile } from '@/hooks/use-mobile';
export { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
export { usePagePerformance } from '@/hooks/usePerformance';
export { useToast } from '@/hooks/use-toast';
