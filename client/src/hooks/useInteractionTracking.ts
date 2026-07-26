import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useCallback } from "react";
import { INTERACTION_WEIGHTS } from "@shared/personRanking";

interface TrackInteractionParams {
  /** Canonical schema fields */
  targetType?: string;
  targetId?: string;
  /** Legacy aliases — mapped to targetType / targetId */
  contentType?: string;
  contentId?: string;
  interactionType: string;
  weight?: number;
  duration?: number;
  context?: Record<string, unknown>;
}

/**
 * Track behavior for the person-ranking / hybrid recommender learning loop.
 *
 * Sends targetType + targetId (schema). Legacy contentType/contentId still accepted.
 */
export function useInteractionTracking() {
  const trackMutation = useMutation({
    mutationFn: async (data: TrackInteractionParams) => {
      const targetType = data.targetType || data.contentType;
      const targetId = data.targetId || data.contentId;
      if (!targetType || !targetId || !data.interactionType) return;

      await apiRequest("POST", "/api/interactions", {
        targetType,
        targetId,
        interactionType: data.interactionType,
        weight: String(
          data.weight ?? INTERACTION_WEIGHTS[data.interactionType] ?? 1,
        ),
        metadata: {
          duration: data.duration,
          ...data.context,
          clientTs: new Date().toISOString(),
        },
      });
    },
    onError: (error) => {
      console.warn("Failed to track interaction:", error);
    },
  });

  const trackInteraction = useCallback(
    (params: TrackInteractionParams) => {
      trackMutation.mutate(params);
    },
    [trackMutation],
  );

  const trackView = useCallback(
    (targetType: string, targetId: string, duration?: number) => {
      trackInteraction({
        targetType,
        targetId,
        interactionType: "view",
        duration: duration || 3,
        weight: INTERACTION_WEIGHTS.view,
      });
    },
    [trackInteraction],
  );

  const trackLike = useCallback(
    (targetType: string, targetId: string) => {
      trackInteraction({
        targetType,
        targetId,
        interactionType: "like",
        weight: INTERACTION_WEIGHTS.like,
      });
    },
    [trackInteraction],
  );

  const trackShare = useCallback(
    (targetType: string, targetId: string, shareMethod?: string) => {
      trackInteraction({
        targetType,
        targetId,
        interactionType: "share",
        weight: INTERACTION_WEIGHTS.share,
        context: { shareMethod },
      });
    },
    [trackInteraction],
  );

  const trackComment = useCallback(
    (targetType: string, targetId: string, commentLength?: number) => {
      trackInteraction({
        targetType,
        targetId,
        interactionType: "comment",
        weight: INTERACTION_WEIGHTS.comment,
        context: { commentLength },
      });
    },
    [trackInteraction],
  );

  const trackJoin = useCallback(
    (targetType: string, targetId: string) => {
      trackInteraction({
        targetType,
        targetId,
        interactionType: "join",
        weight: INTERACTION_WEIGHTS.join,
      });
    },
    [trackInteraction],
  );

  const trackSkip = useCallback(
    (targetType: string, targetId: string, reason?: string) => {
      trackInteraction({
        targetType,
        targetId,
        interactionType: "skip",
        weight: INTERACTION_WEIGHTS.skip,
        context: { reason },
      });
    },
    [trackInteraction],
  );

  const trackSearch = useCallback(
    (query: string, resultCount: number, clickedResult?: string) => {
      trackInteraction({
        targetType: "search",
        targetId: query.slice(0, 200) || "empty",
        interactionType: "search",
        weight: INTERACTION_WEIGHTS.search,
        context: { resultCount, clickedResult, queryLength: query.length },
      });
    },
    [trackInteraction],
  );

  const trackPageView = useCallback(
    (pageName: string, timeSpent?: number) => {
      trackInteraction({
        targetType: "page",
        targetId: pageName,
        interactionType: "view",
        duration: timeSpent,
        weight: INTERACTION_WEIGHTS.view,
        context: { page: pageName, referrer: document.referrer },
      });
    },
    [trackInteraction],
  );

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
    isTracking: trackMutation.isPending,
  };
}
