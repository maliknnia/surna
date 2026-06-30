// Hook for real-time analytics WebSocket connection
import { useState, useEffect, useRef, useCallback } from 'react';

interface LiveMetrics {
  activeUsers: number;
  onlineUsers: number;
  newPosts: number;
  activeEvents: number;
  newRegistrations: number;
  messagesSent: number;
  topSports: Array<{ sport: string; count: number }>;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  timestamp: number;
}

interface AnalyticsEvent {
  type: string;
  userId?: string;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

export function useRealTimeAnalytics() {
  const [isConnected, setIsConnected] = useState(false);
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/analytics`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        
        // Subscribe to metrics and events
        wsRef.current?.send(JSON.stringify({
          type: 'subscribe',
          channels: ['metrics', 'live_events', 'alerts']
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        
        // Reconnect after 3 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError('Failed to connect to analytics service');
    }
  }, []);

  const handleMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'metrics_update':
        setMetrics(message.data);
        break;
        
      case 'live_event':
        setEvents(prev => [message.event, ...prev.slice(0, 49)]); // Keep last 50 events
        break;
        
      case 'welcome':
        break;
        
      default:
        break;
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const requestMetrics = useCallback(() => {
    sendMessage({ type: 'request_metrics' });
  }, [sendMessage]);

  const requestChartData = useCallback((chartType: string, timeRange: string = '24h') => {
    sendMessage({
      type: 'request_chart_data',
      chartType,
      timeRange
    });
  }, [sendMessage]);

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected,
    metrics,
    events,
    error,
    requestMetrics,
    requestChartData,
    sendMessage
  };
}