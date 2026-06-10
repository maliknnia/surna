import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Heart, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TeamFeedProps {
  teamId: string;
}

export default function TeamFeed({ teamId }: TeamFeedProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/teams', teamId, 'feed'],
  });

  const posts = (data as any)?.posts || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-muted/40 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-muted/40 rounded w-28 mb-1.5" />
                <div className="h-3 bg-muted/40 rounded w-20" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3.5 bg-muted/40 rounded" />
              <div className="h-3.5 bg-muted/40 rounded w-4/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="glass-card text-center py-8">
        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-[14px]">No posts yet</p>
        <p className="text-muted-foreground text-[12px] mt-1">Be the first to share something!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post: any) => (
        <div key={post.id} className="glass-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-muted/40 rounded-full flex items-center justify-center">
              <MessageSquare size={16} className="text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-semibold text-foreground">{post.authorName}</div>
              <div className="text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </div>
            </div>
          </div>

          <p className="text-[14px] text-foreground/70 leading-relaxed mb-4">{post.content}</p>

          <div className="flex items-center gap-5 pt-3 border-t border-border">
            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground/70 transition-colors">
              <Heart size={16} />
              <span className="text-[12px]">{post.likesCount || 0}</span>
            </button>
            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground/70 transition-colors">
              <MessageSquare size={16} />
              <span className="text-[12px]">{post.commentsCount || 0}</span>
            </button>
            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground/70 transition-colors">
              <Share2 size={16} />
              <span className="text-[12px]">Share</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
