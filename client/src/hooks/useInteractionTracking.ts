import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useCallback } from "react";

interface TrackInteractionParams {
  contentType: string;
  contentId: string;
  interactionType: string;
  weight?: number;
  duration?: number;
  context?: Record<string, any>;
}

/**
 * Hook for tracking user interactions for the recommendation system
 * 
 * Usage:
 * const { trackInteraction } = useInteractionTracking();
 * 
 * trackInteraction({
 *   contentType: 'post',
 *   contentId: '123',
 *   interactionType: 'like'
 * });
 */
export function useInteractionTracking() {
  const trackMutation = useMutation({
    mutationFn: async (data: TrackInteractionParams) => {
      await apiRequest("POST", "/api/interactions", data);
    },
    onError: (error) => {
      // Fail silently for user experience, but log for debugging
      console.warn('Failed to track interaction:', error);
    }
  });

  const trackInteraction = useCallback((params: TrackInteractionParams) => {
    // Add default weight and timestamp
    const enrichedParams = {
      weight: 1.0,
      ...params,
      context: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ...params.context
      }
    };

    trackMutation.mutate(enrichedParams);
  }, [trackMutation]);

  // Convenience methods for common interactions
  const trackView = useCallback((contentType: string, contentId: string, duration?: number) => {
    trackInteraction({
      contentType,
      contentId,
      interactionType: 'view',
      duration: duration || 3,
      weight: 0.1 // Views are low weight
    });
  }, [trackInteraction]);

  const trackLike = useCallback((contentType: string, contentId: string) => {
    trackInteraction({
      contentType,
      contentId,
      interactionType: 'like',
      weight: 0.8 // Likes are high value
    });
  }, [trackInteraction]);

  const trackShare = useCallback((contentType: string, contentId: string, shareMethod?: string) => {
    trackInteraction({
      contentType,
      contentId,
      interactionType: 'share',
      weight: 1.0, // Shares are highest value
      context: { shareMethod }
    });
  }, [trackInteraction]);

  const trackComment = useCallback((contentType: string, contentId: string, commentLength?: number) => {
    trackInteraction({
      contentType,
      contentId,
      interactionType: 'comment',
      weight: 0.9, // Comments are very high value
      context: { commentLength }
    });
  }, [trackInteraction]);

  const trackJoin = useCallback((contentType: string, contentId: string) => {
    trackInteraction({
      contentType,
      contentId,
      interactionType: 'join',
      weight: 1.0 // Joining is highest commitment
    });
  }, [trackInteraction]);

  const trackSkip = useCallback((contentType: string, contentId: string, reason?: string) => {
    trackInteraction({
      contentType,
      contentId,
      interactionType: 'skip',
      weight: -0.2, // Negative weight for content user doesn't want
      context: { reason }
    });
  }, [trackInteraction]);

  const trackSearch = useCallback((query: string, resultCount: number, clickedResult?: string) => {
    trackInteraction({
      contentType: 'search',
      contentId: query,
      interactionType: 'search',
      weight: 0.3,
      context: { 
        resultCount, 
        clickedResult,
        queryLength: query.length
      }
    });
  }, [trackInteraction]);

  const trackPageView = useCallback((pageName: string, timeSpent?: number) => {
    trackInteraction({
      contentType: 'page',
      contentId: pageName,
      interactionType: 'view',
      duration: timeSpent,
      weight: 0.1,
      context: { 
        page: pageName,
        referrer: document.referrer
      }
    });
  }, [trackInteraction]);

  return {
    trackInteraction,
    trackView,
    trackLike,
    trackShare,
    trackComment,
    trackJoin,
    trackSkip,
    trackSearch,
    trackPageView,
    isTracking: trackMutation.isPending
  };
}