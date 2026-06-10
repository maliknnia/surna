import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Users, MessageCircle, Send, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StreamSession } from '@shared/schema';

interface StreamViewerProps {
  stream: StreamSession;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
}

export default function StreamViewer({ stream, onClose }: StreamViewerProps) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [viewerCount, setViewerCount] = useState(stream.viewerCount || 0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        console.log('WebSocket connected for stream:', stream.id);
        setConnected(true);
        setWs(socket);
        
        socket.send(JSON.stringify({
          type: 'joinStream',
          streamId: stream.id
        }));
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'streamMessage') {
            const newMessage: ChatMessage = {
              id: `${Date.now()}-${Math.random()}`,
              userId: message.data.userId || 'unknown',
              username: message.data.username || 'Anonymous',
              content: message.data.content,
              timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev.slice(-99), newMessage]);
          } else if (message.type === 'viewerCount') {
            setViewerCount(message.data.count);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        setWs(null);
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      setWs(socket);

      return () => {
        socket.close();
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [stream.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!ws || !connected || !messageInput.trim()) return;

    const message = {
      type: 'sendStreamMessage',
      data: {
        streamId: stream.id,
        content: messageInput.trim()
      }
    };

    ws.send(JSON.stringify(message));
    setMessageInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-foreground/80 z-50 flex items-center justify-center p-4"
      data-testid="stream-viewer-overlay"
    >
      <div className="w-full max-w-6xl h-[90vh] flex flex-col md:flex-row gap-4">
        {/* Video Player Section */}
        <div className="flex-1 flex flex-col gap-3">
          <Card 
            className="flex-1 bg-[#1F1525] border-2 border-token-accent"
            data-testid="stream-video-container"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-[#FFF4E6] text-xl mb-2" data-testid="stream-title">
                    {stream.title}
                  </CardTitle>
                  {stream.description && (
                    <p className="text-[#FFF4E6]/70 text-sm" data-testid="stream-description">
                      {stream.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-[#FFF4E6] hover:bg-[#FFF4E6]/10"
                  data-testid="button-close-stream"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <Badge 
                  className="bg-red-500 text-foreground"
                  data-testid="badge-live"
                >
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-current rounded-full animate-pulse"></span>
                    LIVE
                  </span>
                </Badge>
                <div className="flex items-center gap-1 text-[#FFF4E6]/80" data-testid="viewer-count">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">{viewerCount} viewers</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              {stream.streamUrl ? (
                <iframe
                  src={stream.streamUrl}
                  className="w-full h-full rounded-b-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  data-testid="stream-iframe"
                />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center bg-[#1F1525]/50 rounded-b-lg"
                  data-testid="stream-placeholder"
                >
                  <p className="text-[#FFF4E6]/50">Stream starting soon...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat Section */}
        <div className="w-full md:w-96 flex flex-col">
          <Card 
            className="flex-1 bg-[#1F1525] border-2 border-token-accent flex flex-col"
            data-testid="stream-chat-container"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-[#FFF4E6] flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Live Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-3 py-2" data-testid="chat-messages">
                  {messages.length === 0 ? (
                    <p className="text-[#FFF4E6]/50 text-sm text-center py-8">
                      No messages yet. Be the first to chat!
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className="space-y-1"
                        data-testid={`chat-message-${msg.id}`}
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="text-token-accent font-medium text-sm">
                            {msg.username}
                          </span>
                          <span className="text-[#FFF4E6]/40 text-xs">
                            {new Date(msg.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <p className="text-[#FFF4E6] text-sm break-words">
                          {msg.content}
                        </p>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              <div className="p-4 border-t border-[#FFF4E6]/10">
                <div className="flex gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={connected ? "Type a message..." : "Connecting..."}
                    disabled={!connected}
                    className="flex-1 bg-[#FFF4E6]/5 border-[#FFF4E6]/20 text-[#FFF4E6] placeholder:text-[#FFF4E6]/40"
                    data-testid="input-chat-message"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!connected || !messageInput.trim()}
                    className="bg-token-accent text-foreground hover:opacity-90"
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {!connected && (
                  <p className="text-[#FFF4E6]/50 text-xs mt-2">
                    Connecting to chat...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
