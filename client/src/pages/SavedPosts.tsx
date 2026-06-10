import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useSmartBack } from "@/lib/navigation";
import { Bookmark, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PostCard from "@/components/PostCard";
import { ShareModal } from "@/components/ShareModal";
import { useState } from "react";

export default function SavedPosts() {
  const goBack = useSmartBack({ fallback: "/feed" });
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePostId, setSharePostId] = useState("");

  const { data: savedPosts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/posts/saved"],
  });

  const handleShare = (postId: string) => {
    setSharePostId(postId);
    setShowShareModal(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 bg-background z-50 border-b border-token-text/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="w-8 h-8 rounded-full hover:bg-accent/10 border border-border transition-colors"
              data-testid="back-button"
            >
              <ArrowLeft className="w-4 h-4 text-token-text" />
            </Button>
            <div className="flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-token-text" />
              <h1 className="text-lg font-semibold text-token-text">Saved Posts</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-16 pb-28 px-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-token-text mb-4" />
            <p className="text-token-text-muted">Loading saved posts...</p>
          </div>
        ) : savedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
            <div className="w-20 h-20 rounded-full bg-token-text/10 flex items-center justify-center mb-4">
              <Bookmark className="h-10 w-10 text-token-text-muted" />
            </div>
            <h2 className="text-xl font-semibold text-token-text mb-2">
              No Saved Posts Yet
            </h2>
            <p className="text-token-text-muted max-w-sm mb-4">
              Tap the bookmark icon on any post to save it here for later
            </p>
            <Link href="/feed">
              <Button variant="outline">Browse feed</Button>
            </Link>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4" data-testid="saved-posts-list">
            {savedPosts.map((savedPost: any) => (
              <PostCard
                key={savedPost.post.id}
                post={{
                  ...savedPost.post,
                  author: savedPost.author,
                  isLiked: savedPost.isLiked || false,
                }}
                onShare={handleShare}
              />
            ))}
          </div>
        )}
      </main>

      <ShareModal
        postId={sharePostId}
        open={showShareModal}
        onOpenChange={setShowShareModal}
      />
    </div>
  );
}
