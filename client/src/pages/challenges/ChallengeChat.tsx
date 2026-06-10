import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { apiRequest, queryClient, getQueryFn } from '@/lib/queryClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface ChallengeChatProps {
  challengeId: string;
  currentUserId?: string;
}

interface ChatMessage {
  id: string;
  challengeId: string;
  senderId: string;
  content: string;
  createdAt: string;
  senderName?: string | null;
  senderUsername?: string | null;
  senderAvatar?: string | null;
}

export default function ChallengeChat({ challengeId, currentUserId }: ChallengeChatProps) {
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/competitive-challenges', challengeId, 'chat'],
    queryFn: getQueryFn({ on401: 'returnNull' }) as any,
    enabled: !!challengeId,
    refetchInterval: 5000,
  });

  const send = useMutation({
    mutationFn: async (content: string) => {
      const r = await apiRequest('POST', `/api/competitive-challenges/${challengeId}/chat`, { content });
      return r.json();
    },
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: ['/api/competitive-challenges', challengeId, 'chat'] });
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const v = text.trim();
    if (!v || send.isPending) return;
    send.mutate(v);
  };

  return (
    <div className="rounded-2xl bg-card border border-border flex flex-col" style={{ height: 460 }}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted/40 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Coordinate with the other side here.</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUserId;
            const name = m.senderName || m.senderUsername || 'User';
            return (
              <div
                key={m.id}
                className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}
                data-testid={`challenge-msg-${m.id}`}
              >
                <Avatar className="h-7 w-7 mt-0.5">
                  <AvatarImage src={m.senderAvatar || undefined} />
                  <AvatarFallback className="text-[10px]">{name[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className={`max-w-[75%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!mine && (
                    <span className="text-[11px] text-muted-foreground mb-0.5 px-1">{name}</span>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                      mine ? 'bg-token-accent text-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'
                    }`}
                  >
                    {m.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                    {format(new Date(m.createdAt), 'p')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border p-2 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Message…"
          className="flex-1 h-10 px-3 rounded-full bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-token-accent"
          data-testid="input-challenge-chat"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || send.isPending}
          className="w-10 h-10 rounded-full bg-token-accent text-foreground flex items-center justify-center disabled:opacity-40"
          data-testid="button-send-challenge-chat"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
