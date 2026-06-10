// Stage 4: Real-Time Features Dashboard
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useSmartBack } from '@/lib/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Wifi, 
  WifiOff, 
  Users, 
  MessageSquare, 
  Bell, 
  Activity,
  Send,
  BellRing,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react';

interface WebSocketMessage {
  id: string;
  type: string;
  data: any;
  timestamp: string;
}

interface ConnectionStats {
  totalConnections: number;
  uniqueUsers: number;
  messageSequence: number;
  redisConnected: boolean;
}

interface Notification {
  id: string;
  title?: string;
  body?: string;
  message?: string;
  type: string;
  read?: boolean;
  readAt?: string | null;
  createdAt: string;
}

function normalizeNotificationFeed(data: unknown): Notification[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as Notification[];
  const row = data as { items?: Notification[]; notifications?: Notification[] };
  if (Array.isArray(row.items)) return row.items;
  if (Array.isArray(row.notifications)) return row.notifications;
  return [];
}

function isUnread(n: Notification) {
  return !n.read && !n.readAt;
}

export default function Realtime() {
  const [, setLocation] = useLocation();
  const goBack = useSmartBack({ fallback: '/' });
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [eventId, setEventId] = useState('demo-event-1');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch connection stats
  const { data: stats, refetch: refetchStats } = useQuery<ConnectionStats>({
    queryKey: ['/api/realtime/stats'],
    queryFn: async () => {
      const res = await fetch('/api/realtime/stats', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load realtime stats');
      return res.json();
    },
    refetchInterval: 5000,
  });

  const { data: notificationsRaw } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load notifications');
      return res.json();
    },
    refetchInterval: 10000,
  });
  const notificationList = normalizeNotificationFeed(notificationsRaw);

  // Send test notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async (data: { title: string; body: string; type: string }) => {
      return apiRequest('POST', '/api/notifications/test', data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Test notification sent successfully',
      });
      setNotificationTitle('');
      setNotificationBody('');
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to send test notification',
        variant: 'destructive',
      });
    },
  });

  // Mark notification as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest('PATCH', `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  // Connect to WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const socket = new WebSocket(wsUrl);
      
      // Configure authentication
      socket.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        setWs(socket);
        
        // Join demo event room
        socket.send(JSON.stringify({
          type: 'joinEvent',
          eventId: eventId
        }));

        // Subscribe to live updates
        socket.send(JSON.stringify({
          type: 'subscribeLiveUpdates',
          filters: {
            eventIds: [eventId],
            teamIds: ['demo-team-1']
          }
        }));

        toast({
          title: 'Connected',
          description: 'Real-time connection established',
        });
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message:', message);
          
          const newMessage: WebSocketMessage = {
            id: `${Date.now()}-${Math.random()}`,
            type: message.type || 'unknown',
            data: message.data || message,
            timestamp: new Date().toISOString()
          };
          
          setMessages(prev => [...prev.slice(-49), newMessage]);
          
          // Show toast for important messages
          if (message.type === 'newMessage' || message.type === 'liveUpdate') {
            toast({
              title: `New ${message.type === 'newMessage' ? 'Message' : 'Update'}`,
              description: message.data?.content || 'Live update received',
            });
          }
          
          refetchStats();
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        setWs(null);
        toast({
          title: 'Disconnected',
          description: 'Real-time connection lost',
          variant: 'destructive',
        });
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: 'Connection Error',
          description: 'Failed to establish real-time connection',
          variant: 'destructive',
        });
      };

      setWs(socket);

      return () => {
        socket.close();
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      toast({
        title: 'Connection Failed',
        description: 'Could not create WebSocket connection',
        variant: 'destructive',
      });
    }
  }, [eventId, toast, refetchStats]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!ws || !connected || !messageInput.trim()) return;

    const message = {
      type: 'sendMessage',
      data: {
        type: 'event',
        eventId: eventId,
        content: messageInput.trim()
      }
    };

    ws.send(JSON.stringify(message));
    setMessageInput('');
  };

  const sendTestNotification = () => {
    if (!notificationTitle.trim() || !notificationBody.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter both title and body for the notification',
        variant: 'destructive',
      });
      return;
    }

    sendNotificationMutation.mutate({
      title: notificationTitle.trim(),
      body: notificationBody.trim(),
      type: 'general'
    });
  };

  const broadcastLiveUpdate = () => {
    const update = {
      type: 'score',
      eventId: eventId,
      data: {
        homeScore: Math.floor(Math.random() * 5),
        awayScore: Math.floor(Math.random() * 5),
        quarter: Math.floor(Math.random() * 4) + 1,
        timestamp: new Date().toISOString()
      }
    };

    if (ws && connected) {
      ws.send(JSON.stringify({
        type: 'broadcast',
        data: update
      }));
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-realtime">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" onClick={goBack} aria-label="Go back" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
          <h1 className="text-3xl font-bold">Real-Time Features Dashboard</h1>
          <p className="text-muted-foreground">
            Stage 4: WebSocket connections, live updates, and push notifications
          </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {connected ? (
            <>
              <Wifi className="h-5 w-5 text-token-text" />
              <Badge variant="default">Connected</Badge>
            </>
          ) : (
            <>
              <WifiOff className="h-5 w-5 text-token-text" />
              <Badge variant="destructive">Disconnected</Badge>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-connections">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="surna-stat text-2xl" data-testid="text-connection-count">
              {stats?.totalConnections || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.uniqueUsers || 0} unique users
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-messages">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Message Sequence</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="surna-stat text-2xl" data-testid="text-message-sequence">
              {stats?.messageSequence || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total messages processed
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-notifications">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-notification-count">
              {notificationList.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {notificationList.filter(isUnread).length} unread
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-redis">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Redis Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="surna-stat text-2xl" data-testid="text-redis-status">
              {stats?.redisConnected ? '✓' : '✗'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.redisConnected ? 'Connected' : 'Disconnected'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Messages */}
        <Card data-testid="card-chat">
          <CardHeader>
            <CardTitle>Real-time Chat</CardTitle>
            <CardDescription>
              Event ID: {eventId} • {messages.length} messages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Event ID"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="flex-1"
                data-testid="input-event-id"
              />
              <Button 
                onClick={broadcastLiveUpdate}
                variant="outline"
                disabled={!connected}
                data-testid="button-broadcast-update"
              >
                Broadcast Update
              </Button>
            </div>

            <ScrollArea className="h-64 w-full rounded-lg p-4">
              <div className="space-y-2">
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className="flex flex-col space-y-1 text-sm"
                    data-testid={`message-${message.id}`}
                  >
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{message.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="bg-muted rounded p-2">
                      <pre className="text-xs">
                        {JSON.stringify(message.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="flex space-x-2">
              <Input
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                disabled={!connected}
                className="flex-1"
                data-testid="input-message"
              />
              <Button 
                onClick={sendMessage}
                disabled={!connected || !messageInput.trim()}
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card data-testid="card-notifications-panel">
          <CardHeader>
            <CardTitle>Push Notifications</CardTitle>
            <CardDescription>
              Test and manage notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Notification title"
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
                data-testid="input-notification-title"
              />
              <Input
                placeholder="Notification body"
                value={notificationBody}
                onChange={(e) => setNotificationBody(e.target.value)}
                data-testid="input-notification-body"
              />
              <Button 
                onClick={sendTestNotification}
                disabled={sendNotificationMutation.isPending}
                className="w-full"
                data-testid="button-send-notification"
              >
                {sendNotificationMutation.isPending ? (
                  'Sending...'
                ) : (
                  <>
                    <BellRing className="h-4 w-4 mr-2" />
                    Send Test Notification
                  </>
                )}
              </Button>
            </div>

            <Separator />

            <ScrollArea className="h-64 w-full">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Recent Notifications</h4>
                  <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setLocation('/notifications')}>
                    View all
                  </Button>
                </div>
                {notificationList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                ) : (
                  notificationList.map((notification) => (
                    <div 
                      key={notification.id}
                      role="button"
                      tabIndex={0}
                      className="flex items-start justify-between space-x-2 p-3 rounded-lg cursor-pointer hover:bg-muted/50"
                      data-testid={`notification-${notification.id}`}
                      onClick={() => {
                        if (isUnread(notification)) markReadMutation.mutate(notification.id);
                        setLocation('/notifications');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (isUnread(notification)) markReadMutation.mutate(notification.id);
                          setLocation('/notifications');
                        }
                      }}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium">{notification.title || notification.type}</p>
                          {isUnread(notification) && (
                            <Badge variant="default" className="text-xs">New</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.body || notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {isUnread(notification) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); markReadMutation.mutate(notification.id); }}
                          data-testid={`button-mark-read-${notification.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}