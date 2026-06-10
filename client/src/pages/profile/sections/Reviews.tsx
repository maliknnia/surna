import { useState } from 'react';
import { Star, MessageSquare, Trash2 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient, getQueryFn } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

interface UserReview {
  id: string;
  subjectId: string;
  authorId: string;
  rating: number;
  text?: string | null;
  context?: string | null;
  createdAt: string;
  authorName?: string;
  authorUsername?: string;
  authorAvatar?: string;
}

interface ReviewsProps {
  userId: string;
  isOwnProfile?: boolean;
}

export default function Reviews({ userId, isOwnProfile = false }: ReviewsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const currentUserId = (user as any)?.id;
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState('');
  const [context, setContext] = useState('');

  const { data: reviews = [], isLoading } = useQuery<UserReview[]>({
    queryKey: ['/api/users', userId, 'reviews'],
    queryFn: getQueryFn({ on401: 'returnNull' }) as any,
    enabled: !!userId,
  });

  const addReview = useMutation({
    mutationFn: async (payload: { rating: number; text?: string; context?: string }) =>
      apiRequest('POST', `/api/users/${userId}/reviews`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'reviews'] });
      setRating(0); setText(''); setContext('');
      toast({ title: 'Review posted' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e?.message || 'Could not post', variant: 'destructive' }),
  });

  const deleteReview = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/users/reviews/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'reviews'] });
      toast({ title: 'Review deleted' });
    },
  });

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const canReview = !!currentUserId && currentUserId !== userId;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/40">
        <div className="text-4xl font-bold text-foreground">{avgRating}</div>
        <div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={18}
                className={i < Math.round(Number(avgRating)) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      </div>

      {/* Compose */}
      {canReview && (
        <div className="p-4 rounded-2xl border border-border space-y-3">
          <p className="text-sm font-semibold text-foreground">Leave a review</p>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => {
              const value = i + 1;
              const filled = (hoverRating || rating) >= value;
              return (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setHoverRating(value)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(value)}
                  data-testid={`button-star-${value}`}
                >
                  <Star size={28} className={filled ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'} />
                </button>
              );
            })}
          </div>
          <input
            type="text"
            placeholder="Context (e.g. teammate, coach, opponent)"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm"
            data-testid="input-review-context"
          />
          <Textarea
            placeholder="Share your experience…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            data-testid="input-review-text"
          />
          <Button
            onClick={() => addReview.mutate({ rating, text: text || undefined, context: context || undefined })}
            disabled={!rating || addReview.isPending}
            data-testid="button-submit-review"
          >
            {addReview.isPending ? 'Posting…' : 'Post review'}
          </Button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted/40 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No reviews yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="p-4 rounded-2xl border border-border" data-testid={`review-${r.id}`}>
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={r.authorAvatar} />
                  <AvatarFallback>{(r.authorName || '?')[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{r.authorName || r.authorUsername || 'User'}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.createdAt ? formatDistanceToNow(new Date(r.createdAt), { addSuffix: true }) : ''}
                        {r.context ? ` · ${r.context}` : ''}
                      </p>
                    </div>
                    {r.authorId === currentUserId && (
                      <button
                        onClick={() => { if (confirm('Delete this review?')) deleteReview.mutate(r.id); }}
                        className="text-muted-foreground hover:text-red-500"
                        data-testid={`button-delete-review-${r.id}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'}
                      />
                    ))}
                  </div>
                  {r.text && <p className="text-sm text-foreground/90 mt-2 leading-relaxed">{r.text}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
