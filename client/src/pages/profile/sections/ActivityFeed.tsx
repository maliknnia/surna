import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Heart, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityFeedProps {
  userId: string;
}

export default function ActivityFeed({ userId }: ActivityFeedProps) {
  const { data, isLoading } = useQuery<{ posts: any[] }>({
    queryKey: ['/api/profile', userId, 'feed'],
  });

  const posts = data?.posts || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="py-6 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-token-surface rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-token-surface rounded w-32 mb-2" />
                <div className="h-3 bg-token-surface rounded w-24" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-token-surface rounded" />
              <div className="h-4 bg-token-surface rounded w-5/6" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <MessageSquare className="w-16 h-16 text-token-text-muted mx-auto mb-4" />
        <p className="text-token-text-secondary text-sm">No posts yet</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {posts.map((post: any) => (
        <div key={post.id} className="py-4">
          {/* Post Content */}
          <div className="text-token-text mb-3 leading-relaxed">
            {post.content}
          </div>

          <div className="text-xs text-token-text-muted mb-4">
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </div>

          {/* Post Actions - Clean Instagram style */}
          <div className="flex items-center gap-6 pt-2">
            <button className="flex items-center gap-2 text-token-text-secondary hover:text-token-accent transition-colors">
              <Heart size={20} />
              <span className="text-sm">{post.likesCount || 0}</span>
            </button>
            <button className="flex items-center gap-2 text-token-text-secondary hover:text-token-accent transition-colors">
              <MessageSquare size={20} />
              <span className="text-sm">{post.commentsCount || 0}</span>
            </button>
            <button className="flex items-center gap-2 text-token-text-secondary hover:text-token-accent transition-colors">
              <Share2 size={20} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
