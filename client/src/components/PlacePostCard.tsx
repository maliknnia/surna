import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2, CheckCircle, MapPin } from "lucide-react";
import { LazyImage } from "@/components/ui/lazy-image";
import { deriveModernSources, deriveLqipPlaceholder } from "@/lib/imageSources";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface PlacePost {
  id: string;
  placeId: string;
  authorId: string;
  content: string;
  imageUrl: string | null;
  // Variant URLs attached by the feed serializer; cards prefer `thumbUrl`.
  thumbUrl?: string;
  mediumUrl?: string;
  thumbWebpUrl?: string;
  thumbAvifUrl?: string;
  videoUrl: string | null;
  mediaType: string;
  postType: string;
  eventData: any;
  visibility: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  place: {
    id: string;
    name: string;
    profileImageUrl: string | null;
    isVerified: boolean;
    category: string;
  };
  likedByMe?: boolean;
}

interface PlacePostCardProps {
  post: PlacePost;
  onShare?: (postId: string) => void;
}

export default function PlacePostCard({ post, onShare }: PlacePostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/place-posts/${post.id}/like`, {});
      return response.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/posts/feed-keyset"] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts/feed-keyset"] });
      queryClient.invalidateQueries({ queryKey: ["/api/place-posts"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/place-posts/${post.id}/comment`, { content });
      return response.json();
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["/api/posts/feed-keyset"] });
      queryClient.invalidateQueries({ queryKey: ["/api/place-posts"] });
      toast({
        title: "Success",
        description: "Comment added successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleComment = () => {
    if (commentText.trim()) {
      commentMutation.mutate(commentText);
    }
  };

  const handleShare = async () => {
    if (onShare) {
      onShare(post.id);
      return;
    }
    const url = `${window.location.origin}/places/${post.placeId || post.place?.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Check out this venue on SURNA", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Venue link copied to clipboard." });
    } catch {
      /* user cancelled */
    }
  };

  const getPostTypeBadge = (type: string) => {
    const types: Record<string, { label: string; className: string }> = {
      update: { label: "Update", className: "bg-primary/20 text-primary border-primary/30" },
      event: { label: "Event", className: "bg-foreground/10 text-foreground border-foreground/20" },
      promotion: { label: "Promotion", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
      announcement: { label: "Announcement", className: "bg-green-500/20 text-green-400 border-green-500/30" },
    };
    
    const typeInfo = types[type] || types.update;
    return (
      <Badge className={typeInfo.className} data-testid={`post-type-${type}`}>
        {typeInfo.label}
      </Badge>
    );
  };

  return (
    <article
      className="border-b pb-4"
      style={{ borderColor: "var(--surna-border)" }}
      data-testid={`place-post-${post.id}`}
    >
      <div className="flex items-start gap-3 px-3 pt-3 pb-2">
        {/* Place Avatar */}
        <Avatar
          className="w-9 h-9 cursor-pointer active:opacity-80"
          onClick={() => setLocation(`/places/${post.place.id}`)}
          data-testid={`place-avatar-${post.id}`}
        >
          <AvatarImage src={post.place.profileImageUrl || undefined} />
          <AvatarFallback className="text-xs font-semibold" style={{ background: "var(--surna-elevated)", color: "var(--surna-text)" }}>
            {post.place.name.charAt(0)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Header - Place Name and Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <span
                className="font-semibold text-[14px] cursor-pointer active:opacity-80"
                style={{ color: "var(--surna-text)" }}
                onClick={() => setLocation(`/places/${post.place.id}`)}
                data-testid={`place-name-${post.id}`}
              >
                {post.place.name}
              </span>
              {post.place.isVerified && (
                <CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--surna-gold, #f5c518)" }} data-testid={`verified-${post.id}`} />
              )}
            </div>
            <Badge variant="secondary" className="text-[10px] h-5" data-testid={`place-category-${post.id}`}>
              {post.place.category}
            </Badge>
            {getPostTypeBadge(post.postType)}
          </div>
        </div>
      </div>

      {/* Post Content + media — full bleed */}
      <div className="space-y-0">
        {post.content?.trim() ? (
          <p className="text-[14px] whitespace-pre-wrap px-3 pb-2 leading-snug" style={{ color: "var(--surna-text)" }} data-testid={`post-content-${post.id}`}>
            {post.content}
          </p>
        ) : null}

        {(post.thumbUrl || post.imageUrl) && (() => {
          const base = post.thumbUrl || post.imageUrl!;
          const explicitWebp = post.thumbWebpUrl;
          const explicitAvif = post.thumbAvifUrl;
          const sources = explicitWebp || explicitAvif
            ? { webp: explicitWebp, avif: explicitAvif }
            : deriveModernSources(base);
          return (
            <LazyImage
              src={base}
              alt="Post"
              sources={sources}
              placeholder={deriveLqipPlaceholder(base)}
              wrapperClassName="block w-full overflow-hidden"
              className="w-full max-h-[480px] object-cover"
              data-testid={`post-image-${post.id}`}
            />
          );
        })()}

        {post.videoUrl && (
          <video
            src={post.videoUrl}
            controls
            className="w-full max-h-[480px] bg-black"
            data-testid={`post-video-${post.id}`}
          />
        )}

        {/* Stats and Actions */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`h-9 px-2 ${post.likedByMe ? "text-red-400" : ""}`}
              style={{ color: post.likedByMe ? undefined : "var(--surna-text)" }}
              onClick={() => likeMutation.mutate()}
              disabled={likeMutation.isPending}
              data-testid={`like-button-${post.id}`}
            >
              <Heart className={`w-[22px] h-[22px] ${post.likedByMe ? "fill-current" : ""}`} strokeWidth={1.75} />
              {(post.likesCount ?? 0) > 0 && (
                <span className="text-[13px] font-semibold ml-1 tabular-nums">{post.likesCount}</span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2"
              style={{ color: "var(--surna-text)" }}
              onClick={() => setShowComments(!showComments)}
              data-testid={`comment-button-${post.id}`}
            >
              <MessageCircle className="w-[22px] h-[22px]" strokeWidth={1.75} />
              {(post.commentsCount ?? 0) > 0 && (
                <span className="text-[13px] font-semibold ml-1 tabular-nums">{post.commentsCount}</span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2"
              style={{ color: "var(--surna-text)" }}
              onClick={handleShare}
              data-testid={`share-button-${post.id}`}
            >
              <Share2 className="w-[22px] h-[22px]" strokeWidth={1.75} />
            </Button>
          </div>

          <span className="text-[11px]" style={{ color: "var(--surna-text-muted)" }} data-testid={`post-time-${post.id}`}>
            {new Date(post.createdAt).toLocaleDateString()}
          </span>
        </div>

        {showComments && (
          <div className="px-3 pb-3 pt-1 border-t space-y-3" style={{ borderColor: "var(--surna-border)" }}>
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs" style={{ background: "var(--surna-elevated)", color: "var(--surna-text)" }}>
                  {user?.firstName?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleComment()}
                className="flex-1 px-3 py-2 rounded-full text-sm focus:outline-none"
                style={{
                  background: "var(--surna-elevated)",
                  border: "1px solid var(--surna-border)",
                  color: "var(--surna-text)",
                }}
                data-testid={`comment-input-${post.id}`}
              />
              <Button
                size="sm"
                onClick={handleComment}
                disabled={!commentText.trim() || commentMutation.isPending}
                className="rounded-full px-4"
                data-testid={`submit-comment-${post.id}`}
              >
                Post
              </Button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
