import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { deriveModernSources, deriveLqipPlaceholder } from "@/lib/imageSources";
import { LazyImage } from "@/components/ui/lazy-image";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Calendar, Edit2, Trash2, MoreVertical, Bookmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import type { PostWithAuthorEnhanced } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommentsSheet } from "@/components/comments/CommentsSheet";

interface PostCardProps {
  post: PostWithAuthorEnhanced;
  onShare?: (postId: string) => void;
}

interface Comment {
  id: string;
  content: string;
  authorId: string;
  postId: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profileImageUrl: string | null;
  };
}

function CommentItem({ comment, currentUserId, onReply, onEdit, onDelete, onProfileClick }: {
  comment: Comment;
  currentUserId: string;
  onReply: (commentId: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onProfileClick: (userId: string) => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);

  const { data: replies = [] } = useQuery<Comment[]>({
    queryKey: ["/api/comments", comment.id, "replies"],
    enabled: showReplies,
  });

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== comment.content) {
      onEdit(comment.id, editText.trim());
    }
    setIsEditing(false);
  };

  const isOwnComment = comment.authorId === currentUserId;

  return (
    <div className="space-y-2" data-testid={`comment-${comment.id}`}>
      <div className="flex items-start space-x-2">
        <Avatar 
          className="w-6 h-6 cursor-pointer hover:ring-2 hover:ring-token-text transition-all flex-shrink-0"
          onClick={() => onProfileClick(comment.author.id)}
          data-testid={`comment-avatar-${comment.id}`}
        >
          <AvatarImage src={comment.author.profileImageUrl || undefined} />
          <AvatarFallback className="bg-transparent border border-border text-token-text text-xs">
            {comment.author.firstName?.[0] || comment.author.email?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-transparent border border-border rounded-lg p-2">
            <div className="flex items-center justify-between">
              <span 
                className="font-medium text-xs text-token-text cursor-pointer hover:text-token-accent"
                onClick={() => onProfileClick(comment.author.id)}
                data-testid={`comment-author-${comment.id}`}
              >
                {comment.author.firstName && comment.author.lastName
                  ? `${comment.author.firstName} ${comment.author.lastName}`
                  : comment.author.email}
              </span>
              {isOwnComment && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      data-testid={`comment-menu-${comment.id}`}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border-token-text/10">
                    <DropdownMenuItem
                      onClick={() => setIsEditing(true)}
                      className="text-token-text cursor-pointer"
                      data-testid={`edit-comment-${comment.id}`}
                    >
                      <Edit2 className="h-3 w-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(comment.id)}
                      className="text-red-400 cursor-pointer"
                      data-testid={`delete-comment-${comment.id}`}
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {isEditing ? (
              <div className="mt-1 space-y-2">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-transparent border border-border rounded text-token-text focus:outline-none focus:ring-1 focus:ring-token-accent"
                  data-testid={`edit-comment-input-${comment.id}`}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="surna"
                    onClick={handleSaveEdit}
                    className="h-6 text-xs"
                    data-testid={`save-edit-${comment.id}`}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsEditing(false);
                      setEditText(comment.content);
                    }}
                    className="h-6 text-xs"
                    data-testid={`cancel-edit-${comment.id}`}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-token-text mt-1">{comment.content}</p>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 ml-2">
            <button
              onClick={() => onReply(comment.id)}
              className="text-xs text-token-text-muted hover:text-token-text"
              data-testid={`reply-button-${comment.id}`}
            >
              Reply
            </button>
            {replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-xs text-token-text-muted hover:text-token-text"
                data-testid={`toggle-replies-${comment.id}`}
              >
                {showReplies ? "Hide" : "View"} {replies.length} {replies.length === 1 ? "reply" : "replies"}
              </button>
            )}
          </div>
          {showReplies && replies.length > 0 && (
            <div className="ml-4 mt-2 space-y-2 border-l-2 border-token-text/10 pl-2">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onProfileClick={onProfileClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PostCard({ post, onShare }: PostCardProps) {
  const [showCommentsSheet, setShowCommentsSheet] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/posts/${post.id}/like`, {});
      return response.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/posts"] });
      const previousPosts = queryClient.getQueryData(["/api/posts"]);
      queryClient.setQueryData(["/api/posts"], (old: any) => {
        if (!old) return old;
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: page.data.map((p: any) => 
                p.id === post.id
                  ? { 
                      ...p, 
                      likedByMe: !p.likedByMe,
                      likesCount: p.likedByMe ? p.likesCount - 1 : p.likesCount + 1
                    }
                  : p
              )
            }))
          };
        }
        if (Array.isArray(old)) {
          return old.map((p: any) => 
            p.id === post.id
              ? { 
                  ...p, 
                  likedByMe: !p.likedByMe,
                  likesCount: p.likedByMe ? p.likesCount - 1 : p.likesCount + 1
                }
              : p
          );
        }
        return old;
      });
      return { previousPosts };
    },
    onError: (error, variables, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(["/api/posts"], context.previousPosts);
      }
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  const { data: isSaved = false } = useQuery<boolean>({
    queryKey: ["/api/posts", post.id, "saved"],
    queryFn: async () => {
      if (!user) return false;
      const savedPosts = await fetch("/api/posts/saved").then(res => res.json());
      return savedPosts.some((p: any) => p.post.id === post.id);
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (save: boolean) => {
      if (save) {
        const response = await apiRequest("POST", `/api/posts/${post.id}/save`, {});
        return response.json();
      } else {
        const response = await apiRequest("DELETE", `/api/posts/${post.id}/save`, {});
        return response.json();
      }
    },
    onSuccess: (_, save) => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", post.id, "saved"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/saved"] });
      toast({
        title: "Success",
        description: save ? "Post saved successfully!" : "Post unsaved successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update saved status.",
        variant: "destructive",
      });
    },
  });

  const handleLike = () => {
    if (navigator.vibrate) navigator.vibrate(10);
    likeMutation.mutate();
  };
  const handleProfileClick = (userId?: string) => { setLocation(`/profile/${userId || post.author.id}`); };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d`;
    }
  };

  const contentText: string = String(post.content || '');
  const renderContentWithHashtags = (content: string) => {
    const parts = content.split(/(#[a-zA-Z0-9_]+)/g);
    return parts.map((part, idx) => {
      if (!part.startsWith("#")) return <span key={`txt-${idx}`}>{part}</span>;
      const tag = part.slice(1);
      return (
        <button
          key={`tag-${idx}`}
          onClick={() => setLocation(`/search?hashtag=${encodeURIComponent(tag)}`)}
          className="text-token-accent hover:underline"
          style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
        >
          {part}
        </button>
      );
    });
  };

  return (
    <article className="bg-transparent border-b border-token-text/5 w-full" data-testid={`post-card-${post.id}`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <Avatar 
            className="w-10 h-10 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-white/20 transition-all"
            onClick={() => handleProfileClick()}
            data-testid={`avatar-${post.author.id}`}
          >
            <AvatarImage src={post.author.profileImageUrl || undefined} alt={post.author.firstName || "User"} />
            <AvatarFallback className="bg-background border border-token-text/10 text-token-text text-sm">
              {post.author.firstName?.[0] || post.author.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 
              className="font-semibold text-token-text text-base truncate cursor-pointer hover:text-foreground/90 transition-colors"
              onClick={() => handleProfileClick()}
              data-testid={`author-name-${post.author.id}`}
            >
              {post.author.firstName && post.author.lastName 
                ? `${post.author.firstName} ${post.author.lastName}`
                : post.author.email
              }
            </h3>
            <span className="text-xs text-token-text-muted">
              {formatTimeAgo(post.createdAt!)}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm text-token-text leading-relaxed break-words whitespace-pre-wrap">{renderContentWithHashtags(contentText)}</p>
      </div>
        
      {/* Image — LazyImage defers offscreen network requests, fades in via
          opacity transition, and (when sources are present) wraps in <picture>
          so AVIF/WebP-capable browsers fetch the smaller modern variant. */}
      {(((post as any).thumbUrl) || post.imageUrl) && (() => {
        // Feed cards are a list/grid surface, so they request the worker's
        // small `_thumb` variant when available. Falls back to the raw
        // `imageUrl` for legacy posts that pre-date the resize worker.
        const base = ((post as any).thumbUrl as string | undefined) || post.imageUrl!;
        const explicitWebp = (post as any).thumbWebpUrl as string | undefined;
        const explicitAvif = (post as any).thumbAvifUrl as string | undefined;
        const sources = explicitWebp || explicitAvif
          ? { webp: explicitWebp, avif: explicitAvif }
          : deriveModernSources(base);
        return (
          <div className="px-0">
            <LazyImage
              src={base}
              alt="Post content"
              sources={sources}
              placeholder={deriveLqipPlaceholder(base)}
              wrapperClassName="block w-full"
              className="w-full object-cover max-h-96"
              data-testid={`post-image-${post.id}`}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        );
      })()}

        {post.postType === "event" && post.eventData && (
          <div className="mt-3 p-3 sm:p-4 border border-border rounded-lg bg-card w-full">
            <div className="flex items-start space-x-2 sm:space-x-3 min-w-0">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="h-4 w-4 sm:h-6 sm:w-6 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-token-text text-sm sm:text-base truncate">
                  {String((post.eventData as any)?.title || "Event")}
                </h4>
                <p className="text-xs sm:text-sm text-token-text-muted truncate">
                  {String((post.eventData as any)?.date || "Date TBD")}
                </p>
                <p className="text-xs sm:text-sm text-token-text-muted truncate">
                  {String((post.eventData as any)?.location || "Location TBD")}
                </p>
              </div>
            </div>
            <Button 
              variant="surna"
              className="w-full mt-3 text-sm"
              onClick={() => {
                const eventId = (post.eventData as { id?: string })?.id;
                if (eventId) setLocation(`/events/${eventId}`);
                else toast({
                  title: "Event unavailable",
                  description: "This event link is missing an ID.",
                  variant: "destructive",
                });
              }}
            >
              Join Event
            </Button>
          </div>
        )}
      
      {/* Action Buttons */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={handleLike}
              disabled={likeMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-token-text/5 transition-all"
              data-testid={`like-button-${post.id}`}
            >
              <Heart 
                className={`h-5 w-5 ${post.isLiked ? 'fill-token-accent text-token-accent' : 'text-token-text-muted'} transition-colors`} 
              />
              <span className={`text-sm font-medium ${post.isLiked ? 'text-token-accent' : 'text-token-text-muted'}`}>
                {post.likesCount || 0}
              </span>
            </button>
            
            <button
              onClick={() => setShowCommentsSheet(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-token-text/5 transition-all"
              data-testid={`comment-button-${post.id}`}
            >
              <MessageCircle className="h-5 w-5 text-token-text-muted" />
              <span className="text-sm font-medium text-token-text-muted">
                {post.commentsCount || 0}
              </span>
            </button>
            
            <button
              onClick={() => onShare?.(post.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-token-text/5 transition-all"
              data-testid={`share-button-${post.id}`}
            >
              <Share2 className="h-5 w-5 text-token-text-muted" />
              {(post.sharesCount || 0) > 0 && (
                <span className="text-sm font-medium text-token-text-muted">
                  {post.sharesCount || 0}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => saveMutation.mutate(!isSaved)}
            disabled={saveMutation.isPending}
            className="p-2 rounded-lg hover:bg-token-text/5 transition-all"
            data-testid={`bookmark-button-${post.id}`}
          >
            <Bookmark 
              className={`h-5 w-5 ${isSaved ? 'fill-token-accent text-token-accent' : 'text-token-text-muted'} transition-colors`} 
            />
          </button>
        </div>

      </div>

      <CommentsSheet
        isOpen={showCommentsSheet}
        onClose={() => setShowCommentsSheet(false)}
        postId={post.id}
      />
    </article>
  );
}
