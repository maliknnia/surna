import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useRoute, useLocation, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Settings, UserPlus } from "lucide-react";
import { EntityEmptyState } from "@/components/entity";
import { OWNER_PROFILE_AVATAR, OWNER_COVER_URL } from "@/lib/ownerAvatar";
import type { UserWithProfile } from "@/lib/userProfileApi";
import { ProfileInstagramView, type ProfileInstagramUser } from "@/components/profile/ProfileInstagramView";
import { PostDetailSheet } from "@/components/feed/PostDetailSheet";
import { FeedVideoViewer } from "@/components/video/FeedVideoViewer";
import { useVideoViewer } from "@/hooks/useVideoViewer";
import type { PostWithAuthor } from "@shared/schema";
import { discoverPeoplePath } from "@/lib/socialPeopleApi";
import { useProfileExtras } from "@/hooks/useProfileExtras";
import { ROUTES } from "@/navigation";

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const { videoViewer, openFromPost, close: closeVideoViewer } = useVideoViewer();

  const [_, params] = useRoute("/profile/:userId?");
  const viewingUserId = params?.userId || (user as { id?: string })?.id;
  const isOwnProfile = !params?.userId || viewingUserId === (user as { id?: string })?.id;
  const [, setLocation] = useLocation();

  const { data: userStats, isLoading: statsLoading, isError: statsError } = useQuery<UserWithProfile | null>({
    queryKey: ["/api/users", viewingUserId],
    queryFn: async () => {
      if (!viewingUserId) return null;
      const response = await fetch(`/api/users/${viewingUserId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch user stats");
      return response.json();
    },
    enabled: !!viewingUserId,
  });

  useEffect(() => {
    if (userStats && !isOwnProfile) {
      setIsFollowing(userStats.isFollowing || false);
    }
  }, [userStats, isOwnProfile]);

  const handleFollowToggle = async () => {
    setSocialLoading(true);
    const wasFollowing = isFollowing;
    try {
      if (wasFollowing) {
        await apiRequest("DELETE", `/api/users/${viewingUserId}/unfollow`);
        setIsFollowing(false);
      } else {
        await apiRequest("POST", `/api/users/${viewingUserId}/follow`, { followingType: "user" });
        setIsFollowing(true);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/users", viewingUserId] });
      toast({
        title: wasFollowing ? "Unfollowed" : "Following!",
        description: wasFollowing ? undefined : "You're now following this athlete",
      });
    } catch {
      toast({ title: "Error", description: "Failed to update follow status", variant: "destructive" });
    } finally {
      setSocialLoading(false);
    }
  };

  const handleSendMessage = () => {
    setLocation(`/messages?userId=${encodeURIComponent(viewingUserId!)}`);
  };

  const { data: profileFeedData } = useQuery<{ posts: { id: string; videoUrl?: string | null }[] }>({
    queryKey: ["/api/profile", viewingUserId, "feed"],
    enabled: !!viewingUserId,
  });

  const handleProfileVideoClick = useCallback(
    (post: PostWithAuthor) => {
      openFromPost(post, profileFeedData?.posts?.length ? profileFeedData.posts : [post]);
    },
    [profileFeedData?.posts, openFromPost],
  );

  const profileExtras = useProfileExtras(viewingUserId, userStats || user, isOwnProfile);

  const handleStatClick = (label: string) => {
    if (label === "posts") return;
    if (label === "followers") {
      setLocation(discoverPeoplePath("followers", viewingUserId));
      return;
    }
    if (label === "following") {
      setLocation(discoverPeoplePath("following", viewingUserId));
      return;
    }
    if (label === "games") {
      setLocation(ROUTES.challenges);
    }
  };

  const userData = (userStats || user) as UserWithProfile & {
    firstName?: string;
    lastName?: string;
    email?: string;
    profileImageUrl?: string;
    verified?: boolean;
  };
  const username = userData?.username || userData?.email?.split("@")[0] || "user";
  const avatarUrl = isOwnProfile
    ? (userData?.profileImageUrl || OWNER_PROFILE_AVATAR)
    : userData?.profileImageUrl || "";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surna-void)" }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--surna-border)", borderTopColor: "var(--surna-text)" }} />
      </div>
    );
  }

  if (!isLoading && viewingUserId && !isOwnProfile && (statsError || (!statsLoading && !userStats))) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "var(--surna-base)" }}>
        <EntityEmptyState
          icon={UserPlus}
          title="Profile not found"
          description="This athlete may have deleted their account or the link is invalid."
          actionLabel="Discover people"
          actionHref={ROUTES.discoverPeople}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ background: "var(--surna-void)" }}>
        <p style={{ color: "var(--surna-text-secondary)" }}>Please log in to view your profile.</p>
        <Button onClick={() => (window.location.href = "/login")} className="bg-background text-foreground hover:bg-muted/40 rounded-full px-8">
          Log In
        </Button>
      </div>
    );
  }

  if (!viewingUserId) return null;

  const profileUser: ProfileInstagramUser = {
    ...(userData as ProfileInstagramUser),
    id: viewingUserId,
    isFollowing,
    lookingFor: Array.isArray(userData.lookingFor)
      ? userData.lookingFor.join(", ")
      : (userData.lookingFor as string | undefined),
    createdAt: (userData as { createdAt?: string | Date | null }).createdAt ?? null,
  };

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--surna-base)", color: "var(--surna-text)" }}>
      <header
        className="surna-header sticky top-0 z-40"
        style={{
          background: "var(--surna-base)",
          paddingTop: "max(8px, env(safe-area-inset-top))",
        }}
      >
        <div className="max-w-md mx-auto px-3 h-11 flex items-center justify-between">
          <Link href="/feed">
            <button type="button" className="p-2 -ml-1 active:opacity-60" aria-label="Back">
              <ArrowLeft className="w-6 h-6" strokeWidth={1.75} style={{ color: "var(--surna-text)" }} />
            </button>
          </Link>
          <h1 className="text-[16px] font-semibold truncate max-w-[50%]" style={{ color: "var(--surna-text)" }}>
            {isOwnProfile ? "Profile" : username.replace(/^@+/, "")}
          </h1>
          {isOwnProfile ? (
            <Link href="/settings">
              <button type="button" className="p-2 -mr-1 active:opacity-60" aria-label="Settings">
                <Settings className="w-6 h-6" strokeWidth={1.75} style={{ color: "var(--surna-text)" }} />
              </button>
            </Link>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-3">
        <ProfileInstagramView
          user={profileUser}
          avatarUrl={avatarUrl}
          coverPhotoUrl={isOwnProfile ? OWNER_COVER_URL : undefined}
          showCover={false}
          isOwnProfile={isOwnProfile}
          profileExtras={profileExtras}
          socialLoading={socialLoading}
          onFollowToggle={handleFollowToggle}
          onMessage={handleSendMessage}
          onStatClick={handleStatClick}
          onPostClick={setDetailPostId}
          onWinRateClick={() => setLocation(ROUTES.performance)}
          onLevelClick={() => setLocation("/gamification")}
          onRatingClick={() => setLocation(ROUTES.performance)}
        />
      </div>

      <PostDetailSheet
        postId={detailPostId}
        open={!!detailPostId}
        onClose={() => setDetailPostId(null)}
        onVideoClick={handleProfileVideoClick}
      />

      {videoViewer && (
        <FeedVideoViewer
          videos={videoViewer.videos}
          initialIndex={videoViewer.startIndex}
          contextLabel={videoViewer.label}
          mode={videoViewer.mode}
          onEngagementChange={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/posts/feed-keyset"] });
            queryClient.invalidateQueries({ queryKey: ["/api/profile", viewingUserId, "feed"] });
          }}
          onClose={closeVideoViewer}
        />
      )}
    </div>
  );
}
