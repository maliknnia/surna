import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Users, Heart, Send, Smile } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  endStreamSession,
  fetchStreamSession,
  fetchStreamViewerCount,
  startStreamSession,
} from "@/lib/streamingApi";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";

interface LiveStreamViewerProps {
  streamId: string;
  onClose: () => void;
  isStreamer?: boolean;
}

interface StreamComment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    profileImageUrl: string | null;
  };
}

interface StreamReaction {
  id: string;
  userId: string;
  reactionType: string;
  createdAt: string;
}

export function LiveStreamViewer({ streamId, onClose, isStreamer = false }: LiveStreamViewerProps) {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<StreamComment[]>([]);
  const [reactions, setReactions] = useState<StreamReaction[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stream } = useQuery({
    queryKey: ["stream", streamId],
    queryFn: () => fetchStreamSession(streamId),
    refetchInterval: 5000,
  });

  const { data: viewersData } = useQuery({
    queryKey: ["stream-viewers", streamId],
    queryFn: () => fetchStreamViewerCount(streamId),
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (viewersData) {
      setViewerCount(viewersData.count || 0);
    }
  }, [viewersData]);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.emit("stream:join", { streamId });

    newSocket.on("stream:viewerJoined", (data: { streamId: string; viewerCount: number }) => {
      if (data.streamId === streamId) {
        setViewerCount(data.viewerCount);
      }
    });

    newSocket.on("stream:viewerLeft", (data: { streamId: string; viewerCount: number }) => {
      if (data.streamId === streamId) {
        setViewerCount(data.viewerCount);
      }
    });

    newSocket.on("stream:newComment", (data: { streamId: string; comment: StreamComment }) => {
      if (data.streamId === streamId) {
        setComments((prev) => [...prev, data.comment]);
      }
    });

    newSocket.on("stream:newReaction", (data: { streamId: string; reaction: StreamReaction }) => {
      if (data.streamId === streamId) {
        setReactions((prev) => [...prev, data.reaction]);
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== data.reaction.id));
        }, 3000);
      }
    });

    newSocket.on("stream:ended", (data: { streamId: string }) => {
      if (data.streamId === streamId) {
        toast({
          title: "Stream ended",
          description: "The stream has ended",
        });
        onClose();
      }
    });

    return () => {
      newSocket.emit("stream:leave", { streamId });
      newSocket.disconnect();
    };
  }, [streamId, onClose, toast]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const startStreamMutation = useMutation({
    mutationFn: () => startStreamSession(streamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stream", streamId] });
      toast({
        title: "Stream started",
        description: "You are now live!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start stream",
        variant: "destructive",
      });
    },
  });

  const endStreamMutation = useMutation({
    mutationFn: () => endStreamSession(streamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/streaming/active"] });
      toast({
        title: "Stream ended",
        description: "Your stream has ended",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to end stream",
        variant: "destructive",
      });
    },
  });

  const handleSendComment = () => {
    if (!comment.trim() || !socket) return;
    
    socket.emit("stream:comment", {
      streamId,
      content: comment.trim(),
    });
    
    setComment("");
  };

  const handleReaction = (reactionType: string) => {
    if (!socket) return;
    
    socket.emit("stream:reaction", {
      streamId,
      reactionType,
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] p-0" data-testid="dialog-livestream">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="font-semibold text-sm">LIVE</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span data-testid="text-viewer-count">{viewerCount}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-stream"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 flex">
            <div className="flex-1 relative" style={{ background: 'var(--surna-void)' }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center" style={{ color: 'var(--surna-text)' }}>
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg font-semibold">{stream?.title || "Live Stream"}</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {isStreamer ? "Broadcasting to your audience" : "Watching live"}
                  </p>
                </div>
              </div>

              {reactions.map((reaction) => (
                <div
                  key={reaction.id}
                  className="absolute bottom-20 right-4 text-4xl animate-bounce"
                  style={{
                    animation: "float 3s ease-out forwards",
                  }}
                >
                  {reaction.reactionType === "heart" && "❤️"}
                  {reaction.reactionType === "fire" && "🔥"}
                  {reaction.reactionType === "clap" && "👏"}
                </div>
              ))}
            </div>

            <div className="w-80 border-l flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-2" data-testid={`comment-${c.id}`}>
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={c.user.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {c.user.displayName?.[0] || c.user.username?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {c.user.displayName || c.user.username}
                        </p>
                        <p className="text-sm break-words">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={commentsEndRef} />
                </div>
              </ScrollArea>

              <div className="p-3 border-t space-y-2">
                <div className="flex gap-2 justify-around">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReaction("heart")}
                    data-testid="button-reaction-heart"
                  >
                    ❤️
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReaction("fire")}
                    data-testid="button-reaction-fire"
                  >
                    🔥
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReaction("clap")}
                    data-testid="button-reaction-clap"
                  >
                    👏
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                    data-testid="input-comment"
                  />
                  <Button
                    size="icon"
                    onClick={handleSendComment}
                    disabled={!comment.trim()}
                    data-testid="button-send-comment"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {isStreamer && (
            <div className="p-4 border-t flex gap-2">
              {stream?.status === "scheduled" && (
                <Button
                  onClick={() => startStreamMutation.mutate()}
                  disabled={startStreamMutation.isPending}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  data-testid="button-start-stream"
                >
                  {startStreamMutation.isPending ? "Starting..." : "Start Stream"}
                </Button>
              )}
              {stream?.status === "live" && (
                <Button
                  onClick={() => endStreamMutation.mutate()}
                  disabled={endStreamMutation.isPending}
                  variant="destructive"
                  className="flex-1"
                  data-testid="button-end-stream"
                >
                  {endStreamMutation.isPending ? "Ending..." : "End Stream"}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
