import { MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { isDemoPlaceId } from "@/lib/demoPlaces";

type PlacePost = {
  id: string;
  content?: string | null;
  imageUrl?: string | null;
  createdAt?: string | Date;
};

export function PlaceFeedSection({ placeId }: { placeId: string }) {
  const { data, isLoading } = useQuery<PlacePost[] | { posts?: PlacePost[] }>({
    queryKey: ["/api/places", placeId, "posts"],
    enabled: !!placeId && !isDemoPlaceId(placeId),
  });

  const posts = Array.isArray(data) ? data : (data?.posts ?? []);

  if (isDemoPlaceId(placeId)) {
    return (
      <div
        className="text-center py-10 px-4 rounded-2xl"
        style={{ background: "var(--surna-elevated)", border: "1px solid var(--surna-border)" }}
      >
        <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" style={{ color: "var(--surna-text-muted)" }} />
        <p className="text-[14px]" style={{ color: "var(--surna-text-secondary)" }}>No updates yet</p>
        <p className="text-[12px] mt-1" style={{ color: "var(--surna-text-muted)" }}>
          Venue posts and announcements will show here
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl h-28 animate-pulse"
            style={{ background: "var(--surna-elevated)" }}
          />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div
        className="text-center py-10 px-4 rounded-2xl"
        style={{ background: "var(--surna-elevated)", border: "1px solid var(--surna-border)" }}
      >
        <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" style={{ color: "var(--surna-text-muted)" }} />
        <p className="text-[14px]" style={{ color: "var(--surna-text-secondary)" }}>No updates yet</p>
        <p className="text-[12px] mt-1" style={{ color: "var(--surna-text-muted)" }}>
          Venue posts and announcements will show here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <article
          key={post.id}
          className="rounded-2xl p-4"
          style={{ background: "var(--surna-elevated)", border: "1px solid var(--surna-border)" }}
        >
          {post.content ? (
            <p className="text-[14px] leading-snug mb-2" style={{ color: "var(--surna-text)" }}>
              {post.content}
            </p>
          ) : null}
          {post.imageUrl ? (
            <img src={post.imageUrl} alt="" className="rounded-xl w-full max-h-56 object-cover mb-2" />
          ) : null}
          {post.createdAt ? (
            <p className="text-[11px]" style={{ color: "var(--surna-text-muted)" }}>
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
