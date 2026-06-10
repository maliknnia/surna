import { useLocation } from 'wouter';
import { ThumbsUp, MessageSquare } from 'lucide-react';
import { ROUTES } from '@/navigation';

interface FeedPost {
  id: number;
  author: string;
  activity: string;
  content: string;
  respects: number;
  comments: number;
}

interface FeedPreviewProps {
  posts: FeedPost[];
}

export function FeedPreview({ posts }: FeedPreviewProps) {
  const [, setLocation] = useLocation();
  
  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-bold" style={{ color: 'var(--surna-text)' }}>Recent Activity</h2>
        <button 
          onClick={() => setLocation(ROUTES.feed)} 
          className="text-xs font-bold hover:text-foreground transition-colors uppercase tracking-wide"
          style={{ color: 'var(--surna-text-secondary)' }}
        >
          See all
        </button>
      </div>

      {posts.map((post) => (
        <div 
          key={post.id} 
          className="rounded-lg p-4 cursor-pointer transition-all duration-200" 
          style={{ background: 'var(--surna-surface)' }}
          onClick={() => setLocation(ROUTES.feed)}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: 'var(--surna-elevated)', color: 'var(--surna-text)' }}>
              {post.author.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-sm" style={{ color: 'var(--surna-text)' }}>{post.author}</span>
              <p className="text-xs mt-0.5" style={{ color: 'var(--surna-text-secondary)' }}>
                Just finished a {post.activity}
              </p>
            </div>
            <div className="w-12 h-12 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surna-elevated)' }}>
              <span className="text-xl">🏃</span>
            </div>
          </div>

          <p className="text-sm mt-3" style={{ color: 'var(--surna-text-secondary)' }}>{post.content}</p>

          <div className="flex items-center gap-4 mt-3">
            <button className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: 'var(--surna-text-muted)' }}>
              <ThumbsUp size={14} strokeWidth={1.5} />
              <span>{post.respects}</span>
            </button>
            <button className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: 'var(--surna-text-muted)' }}>
              <MessageSquare size={14} strokeWidth={1.5} />
              <span>{post.comments}</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
