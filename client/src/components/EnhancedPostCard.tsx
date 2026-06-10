import { useState } from "react";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Play, Send } from "lucide-react";
import { deriveModernSources, deriveLqipPlaceholder } from "@/lib/imageSources";
import { LazyImage } from "@/components/ui/lazy-image";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PostWithAuthor } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface EnhancedPostCardProps {
  post: PostWithAuthor;
  enableSwipeGestures?: boolean;
  compactMode?: boolean;
}

interface ReactionButtonProps {
  icon: React.ReactNode;
  count: number;
  isActive: boolean;
  onClick: () => void;
  activeColor: string;
}

function ReactionButton({ icon, count, isActive, onClick, activeColor }: ReactionButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`flex items-center gap-1 h-8 px-2 transition-all duration-200 hover:scale-105 ${
        isActive ? "bg-background" : "hover:bg-transparent border border-border"
      }`}
    >
      {icon}
      <span className="text-xs font-medium text-token-text">{count > 0 ? count : ""}</span>
    </Button>
  );
}

export default function EnhancedPostCard({ 
  post, 
  enableSwipeGestures = false, 
  compactMode = false 
}: EnhancedPostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const likeMutation = useMutation({
    mutationFn: async () => {
      const endpoint = isLiked ? `/api/posts/${post.id}/unlike` : `/api/posts/${post.id}/like`;
      return apiRequest("POST", endpoint);
    },
    // Optimistic UI: flip the local toggle immediately so the heart fills
    // before the network call resolves; revert on error. Cache rollback
    // mirrors PostCard's pattern so the feed query stays consistent.
    onMutate: async () => {
      const wasLiked = isLiked;
      setIsLiked(!wasLiked);
      await queryClient.cancelQueries({ queryKey: ["/api/posts"] });
      const previousPosts = queryClient.getQueryData(["/api/posts"]);
      queryClient.setQueryData(["/api/posts"], (old: any) => {
        if (!old) return old;
        const flip = (p: any) => p.id === post.id
          ? { ...p, likedByMe: !wasLiked, likesCount: (p.likesCount || 0) + (wasLiked ? -1 : 1) }
          : p;
        if (old.pages) {
          return { ...old, pages: old.pages.map((page: any) => ({ ...page, data: (page.data || []).map(flip) })) };
        }
        if (Array.isArray(old)) return old.map(flip);
        return old;
      });
      return { previousPosts, wasLiked };
    },
    onError: (_err, _vars, context) => {
      // Roll back the local toggle and the cache snapshot.
      if (context) setIsLiked(context.wasLiked);
      if (context?.previousPosts) {
        queryClient.setQueryData(["/api/posts"], context.previousPosts);
      }
      toast({
        title: "Error",
        description: "Failed to update like status. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/posts/${post.id}/share`, {
        shareType: "repost"
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post shared successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to share post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLike = () => {
    likeMutation.mutate();
  };

  const handleShare = () => {
    shareMutation.mutate();
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast({
      title: isSaved ? "Removed from saved" : "Saved",
      description: isSaved ? "Post removed from your saved items." : "Post saved for later.",
    });
  };

  const handleSwipeGesture = (direction: 'left' | 'right') => {
    if (!enableSwipeGestures) return;
    
    setSwipeDirection(direction);
    setTimeout(() => setSwipeDirection(null), 300);

    if (direction === 'left') {
      handleLike();
    } else if (direction === 'right') {
      handleShare();
    }
  };

  const cardClasses = `
    transition-all duration-300 ease-out
    ${swipeDirection === 'left' ? 'transform -translate-x-2 scale-[0.98]' : ''}
    ${swipeDirection === 'right' ? 'transform translate-x-2 scale-[0.98]' : ''}
    ${compactMode ? 'mb-2' : 'mb-4'}
    hover:shadow-md cursor-pointer
  `;

  return (
    <Card className={cardClasses}>
      <CardHeader className={`${compactMode ? 'pb-2' : 'pb-3'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className={compactMode ? "h-6 w-6" : "h-8 w-8"}>
              <AvatarImage src={post.author.profileImageUrl || ""} />
              <AvatarFallback className="text-xs font-medium bg-background text-token-text">
                {post.author.firstName?.[0]}{post.author.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className={`font-semibold text-token-text ${compactMode ? 'text-sm' : 'text-base'}`}>
                  {post.author.displayName || `${post.author.firstName} ${post.author.lastName}`}
                </p>
                {post.author.username && (
                  <p className={`text-token-text ${compactMode ? 'text-xs' : 'text-sm'}`}>
                    {post.author.username}
                  </p>
                )}
              </div>
              <p className="text-xs text-token-text">
                {formatDistanceToNow(new Date(post.createdAt!), { addSuffix: true })}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className={compactMode ? "pt-0 pb-3" : "pt-0 pb-4"}>
        {/* Post Content */}
        <div className={compactMode ? "mb-3" : "mb-4"}>
          <p className={`text-token-text leading-relaxed ${compactMode ? 'text-sm' : 'text-base'}`}>
            {post.content}
          </p>

          {/* Post Media */}
          {(post.thumbUrl || post.imageUrl) && (() => {
            // List/grid surface — request the small `_thumb` variant from the
            // serializer when present, falling back to the raw `imageUrl`.
            const base = post.thumbUrl || post.imageUrl!;
            const sources = post.thumbWebpUrl || post.thumbAvifUrl
              ? { webp: post.thumbWebpUrl, avif: post.thumbAvifUrl }
              : deriveModernSources(base);
            return (
              <div className="mt-3 relative rounded-lg overflow-hidden">
                <LazyImage
                  src={base}
                  alt="Post content"
                  sources={sources}
                  placeholder={deriveLqipPlaceholder(base)}
                  wrapperClassName="block w-full"
                  className="w-full h-auto max-h-96 object-cover"
                />
              </div>
            );
          })()}

          {(post as any).videoUrl && (
            <div className="mt-3 relative rounded-lg overflow-hidden bg-background">
              <div className="aspect-video flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-token-text hover:bg-transparent border border-border/20 transition-colors"
                >
                  <Play className="h-12 w-12" />
                </Button>
              </div>
            </div>
          )}

          {/* Event Data */}
          {post.eventData && (
            <div className="mt-3 p-3 bg-transparent border border-border rounded-lg bg-transparent border border-border">
              <Badge variant="secondary" className="mb-2">Event</Badge>
              <p className="text-sm text-token-text">
                {JSON.stringify(post.eventData)}
              </p>
            </div>
          )}
        </div>

        {/* Reaction Buttons */}
        <div className="flex items-center justify-between pt-3 ">
          <div className="flex items-center gap-1">
            <ReactionButton
              icon={<Heart className={`h-4 w-4 ${isLiked ? 'fill-current text-gradient-blush' : 'text-gradient-blush/80'}`} />}
              count={post.likesCount || 0}
              isActive={isLiked}
              onClick={handleLike}
              activeColor="bg-background hover:bg-transparent border border-border"
            />
            
            <ReactionButton
              icon={<MessageCircle className="h-4 w-4 text-gradient-blushy" />}
              count={post.commentsCount || 0}
              isActive={showComments}
              onClick={() => setShowComments(!showComments)}
              activeColor="bg-background hover:bg-transparent border border-border"
            />
            
            <ReactionButton
              icon={<Share2 className="h-4 w-4 text-gradient-blush" />}
              count={(post as any).sharesCount || 0}
              isActive={false}
              onClick={handleShare}
              activeColor="bg-background hover:bg-transparent border border-border"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className={`p-2 h-8 w-8 transition-colors ${
              isSaved ? "text-gradient-blushy bg-transparent border border-border" : "text-gradient-blushy/60 hover:text-gradient-blushy hover:bg-transparent border border-border"
            }`}
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
          </Button>
        </div>

        {/* Swipe Gesture Indicators */}
        {enableSwipeGestures && swipeDirection && (
          <div className="mt-2 flex justify-center">
            <Badge 
              variant="secondary" 
              className="bg-background text-token-text"
            >
              {swipeDirection === 'left' ? '❤️ Liked!' : '🔄 Shared!'}
            </Badge>
          </div>
        )}

        {/* Comments Section */}
        {showComments && <CommentsThread postId={post.id} />}
      </CardContent>
    </Card>
  );
}

interface PostComment {
  id: string;
  content: string;
  authorId: string;
  authorName?: string;
  authorUsername?: string;
  authorAvatar?: string;
  createdAt: string;
}

function CommentsThread({ postId }: { postId: string }) {
  const [text, setText] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: comments = [], isLoading } = useQuery<PostComment[]>({
    queryKey: ['/api/posts', postId, 'comments'],
    queryFn: getQueryFn({ on401: 'returnNull' }) as any,
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => apiRequest('POST', `/api/posts/${postId}/comment`, { content }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ['/api/posts', postId, 'comments'] });
      qc.invalidateQueries({ queryKey: ['/api/posts'] });
    },
    onError: () => toast({ title: 'Failed to post', variant: 'destructive' }),
  });

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addComment.mutate(trimmed);
  };

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="Add a comment…"
          className="flex-1 px-3 py-2 text-sm rounded-full bg-muted/40 border border-border text-foreground placeholder:text-muted-foreground"
          data-testid={`input-comment-${postId}`}
        />
        <Button
          size="sm"
          onClick={submit}
          disabled={!text.trim() || addComment.isPending}
          data-testid={`button-send-comment-${postId}`}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">Be the first to comment</p>
      ) : (
        <div className="space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2" data-testid={`comment-${c.id}`}>
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={c.authorAvatar} />
                <AvatarFallback className="text-[10px]">{(c.authorName || '?')[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-muted/40 rounded-2xl px-3 py-2">
                <p className="text-xs font-semibold text-foreground">
                  {c.authorName || c.authorUsername || 'User'}
                </p>
                <p className="text-sm text-foreground/90">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}