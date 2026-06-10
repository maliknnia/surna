// Analytics Hook - Track user events and behavior
import { useCallback } from "react";
import { useAuth } from "./useAuth";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  customDimensions?: Record<string, string | number>;
}

interface PageViewData {
  page_path: string;
  page_title?: string;
  content_group1?: string;
  custom_map?: Record<string, any>;
}

export function useAnalytics() {
  const { user, isAuthenticated } = useAuth();

  // Track page views
  const trackPageView = useCallback((data: PageViewData) => {
    try {
      // Google Analytics 4
      if (window.gtag) {
        window.gtag('config', import.meta.env.VITE_GA_MEASUREMENT_ID, {
          page_path: data.page_path,
          page_title: data.page_title,
          content_group1: data.content_group1,
          custom_map: data.custom_map,
          user_id: isAuthenticated ? user?.id : undefined,
        });
      }

      // Send to our internal analytics
      fetch('/api/analytics/pageview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page: data.page_path,
          title: data.page_title,
          userId: isAuthenticated ? user?.id : undefined,
          timestamp: new Date().toISOString(),
        }),
      }).catch(console.error);
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  }, [user, isAuthenticated]);

  // Track custom events
  const trackEvent = useCallback((event: AnalyticsEvent) => {
    try {
      // Google Analytics 4
      if (window.gtag) {
        window.gtag('event', event.action, {
          event_category: event.category,
          event_label: event.label,
          value: event.value,
          ...event.customDimensions,
          user_id: isAuthenticated ? user?.id : undefined,
        });
      }

      // Send to our internal analytics
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: event.action,
          category: event.category,
          label: event.label,
          value: event.value,
          properties: event.customDimensions,
          userId: isAuthenticated ? user?.id : undefined,
          timestamp: new Date().toISOString(),
        }),
      }).catch(console.error);
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }, [user, isAuthenticated]);

  // Track user interactions
  const trackClick = useCallback((element: string, location?: string) => {
    trackEvent({
      action: 'click',
      category: 'engagement',
      label: element,
      customDimensions: location ? { location } : undefined,
    });
  }, [trackEvent]);

  const trackSearch = useCallback((query: string, resultsCount?: number) => {
    trackEvent({
      action: 'search',
      category: 'engagement',
      label: query,
      value: resultsCount,
    });
  }, [trackEvent]);

  const trackShare = useCallback((content: string, platform: string) => {
    trackEvent({
      action: 'share',
      category: 'social',
      label: content,
      customDimensions: { platform },
    });
  }, [trackEvent]);

  const trackPurchase = useCallback((transactionId: string, value: number, currency: string = 'USD') => {
    if (window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: transactionId,
        value: value,
        currency: currency,
        user_id: isAuthenticated ? user?.id : undefined,
      });
    }

    trackEvent({
      action: 'purchase',
      category: 'ecommerce',
      label: transactionId,
      value: value,
      customDimensions: { currency },
    });
  }, [trackEvent, user, isAuthenticated]);

  const trackSubscription = useCallback((planName: string, value: number) => {
    trackEvent({
      action: 'subscribe',
      category: 'ecommerce',
      label: planName,
      value: value,
    });
  }, [trackEvent]);

  const trackFormSubmission = useCallback((formName: string, success: boolean) => {
    trackEvent({
      action: success ? 'form_submit_success' : 'form_submit_error',
      category: 'forms',
      label: formName,
    });
  }, [trackEvent]);

  const trackVideoPlay = useCallback((videoId: string, duration?: number) => {
    trackEvent({
      action: 'video_play',
      category: 'media',
      label: videoId,
      value: duration,
    });
  }, [trackEvent]);

  const trackFileDownload = useCallback((fileName: string, fileType: string) => {
    trackEvent({
      action: 'file_download',
      category: 'downloads',
      label: fileName,
      customDimensions: { file_type: fileType },
    });
  }, [trackEvent]);

  // Track user journey/funnel events
  const trackFunnelStep = useCallback((funnelName: string, step: string, stepNumber: number) => {
    trackEvent({
      action: 'funnel_step',
      category: 'conversion',
      label: `${funnelName}_${step}`,
      value: stepNumber,
      customDimensions: { funnel: funnelName, step },
    });
  }, [trackEvent]);

  // Track errors
  const trackError = useCallback((errorMessage: string, errorLocation: string) => {
    trackEvent({
      action: 'javascript_error',
      category: 'errors',
      label: errorMessage,
      customDimensions: { location: errorLocation },
    });
  }, [trackEvent]);

  // Track performance metrics
  const trackPerformance = useCallback((metric: string, value: number, unit: string = 'ms') => {
    trackEvent({
      action: 'performance_metric',
      category: 'performance',
      label: metric,
      value: value,
      customDimensions: { unit },
    });
  }, [trackEvent]);

  // Track user engagement time
  const trackEngagementTime = useCallback((page: string, timeSpent: number) => {
    trackEvent({
      action: 'engagement_time',
      category: 'engagement',
      label: page,
      value: Math.round(timeSpent / 1000), // Convert to seconds
    });
  }, [trackEvent]);

  return {
    trackPageView,
    trackEvent,
    trackClick,
    trackSearch,
    trackShare,
    trackPurchase,
    trackSubscription,
    trackFormSubmission,
    trackVideoPlay,
    trackFileDownload,
    trackFunnelStep,
    trackError,
    trackPerformance,
    trackEngagementTime,
  };
}