import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type Channel = { id: string; name: string; channelType?: string | null };
type ChannelMessage = {
  id: string;
  content: string;
  createdAt?: string;
  senderId?: string;
  senderName?: string;
};

interface TeamChatProps {
  teamId: string;
  isMember?: boolean;
}

export default function TeamChat({ teamId, isMember }: TeamChatProps) {
  const { toast } = useToast();
  const { user } = useAuth() as { user?: { id?: string } };
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const { data: channels = [], isLoading: channelsLoading } = useQuery<Channel[]>({
    queryKey: ["/api/teams", teamId, "channels"],
    enabled: !!teamId && !!isMember,
  });

  const generalChannel = channels.find((c) => c.channelType === "general") ?? channels[0];

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChannelMessage[]>({
    queryKey: ["/api/teams", teamId, "channels", generalChannel?.id, "messages"],
    queryFn: async () => {
      if (!generalChannel?.id) return [];
      const res = await fetch(
        `/api/teams/${teamId}/channels/${generalChannel.id}/messages?limit=50`,
        { credentials: "include" },
      );
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data.messages ?? data.items ?? [];
    },
    enabled: !!generalChannel?.id && !!isMember,
    refetchInterval: 15_000,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!generalChannel?.id) throw new Error("No channel");
      const res = await apiRequest("POST", `/api/teams/${teamId}/channels/${generalChannel.id}/messages`, {
        content,
        messageType: "text",
      });
      return res.json();
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({
        queryKey: ["/api/teams", teamId, "channels", generalChannel?.id, "messages"],
      });
    },
    onError: () => toast({ title: "Couldn't send message", variant: "destructive" }),
  });

  if (!isMember) {
    return (
      <div className="glass-card text-center py-10 px-4">
        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-[14px] text-muted-foreground">Join the team to access team chat</p>
      </div>
    );
  }

  if (channelsLoading || messagesLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={listRef}
        className="glass-card max-h-[420px] overflow-y-auto space-y-3 p-3"
      >
        {messages.length === 0 ? (
          <p className="text-center text-[13px] text-muted-foreground py-8">No messages yet — say hi to the squad</p>
        ) : (
          messages.map((msg) => {
            const mine = msg.senderId === user?.id;
            return (
              <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                    mine ? "bg-primary text-primary-foreground" : "bg-muted/40 text-foreground"
                  }`}
                >
                  {!mine && msg.senderName ? (
                    <p className="text-[10px] font-semibold opacity-70 mb-0.5">{msg.senderName}</p>
                  ) : null}
                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  {msg.createdAt ? (
                    <p className="text-[10px] opacity-60 mt-1">
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const text = draft.trim();
          if (!text || sendMessage.isPending) return;
          sendMessage.mutate(text);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message the team…"
          className="flex-1 h-11 rounded-full px-4 text-[14px] bg-muted/40 border border-border outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sendMessage.isPending}
          className="w-11 h-11 rounded-full flex items-center justify-center bg-foreground text-background disabled:opacity-40"
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
