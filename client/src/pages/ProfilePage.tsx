import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useRoute, useLocation, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Settings, Trophy } from "lucide-react";
import { OWNER_PROFILE_AVATAR } from "@/lib/ownerAvatar";
import type { UserWithProfile } from "@/lib/userProfileApi";
import { ProfileInstagramView } from "@/components/profile/ProfileInstagramView";
import { discoverPeoplePath } from "@/lib/socialPeopleApi";

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  const [_, params] = useRoute("/profile/:userId?");
  const viewingUserId = params?.userId || (user as { id?: string })?.id;
  const isOwnProfile = !params?.userId || viewingUserId === (user as { id?: string })?.id;
  const [, setLocation] = useLocation();

  const { data: userStats } = useQuery<UserWithProfile | null>({
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

  const handleStatClick = (label: string) => {
    if (label === "posts") {
      setLocation("/feed");
      return;
    }
    if (label === "followers") {
      setLocation(discoverPeoplePath("followers", viewingUserId));
      return;
    }
    if (label === "following") {
      setLocation(discoverPeoplePath("following", viewingUserId));
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
        <div className="w-8 h-8 border-2 border-border border-t-white rounded-full animate-spin" />
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

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--surna-void)" }}>
      <div
        className="sticky top-0 z-40 glass-effect"
        style={{
          background: "var(--glass-bg)",
          borderBottom: "0.5px solid var(--surna-border)",
        }}
      >
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/">
            <button type="button" className="p-2 rounded-xl transition-all hover:bg-muted/40 active:scale-95">
              <ArrowLeft className="w-5 h-5" style={{ color: "var(--surna-text)" }} />
            </button>
          </Link>
          <h1 className="text-base font-semibold" style={{ color: "var(--surna-text)" }}>
            @{username.replace(/^@+/, "")}
          </h1>
          <div className="flex items-center gap-0.5">
            {isOwnProfile ? (
              <>
                <Link href="/settings">
                  <button type="button" className="p-2 rounded-xl hover:bg-muted/40 active:scale-95" aria-label="Settings">
                    <Settings className="w-5 h-5" style={{ color: "var(--surna-text)" }} />
                  </button>
                </Link>
                <Link href="/seller/dashboard">
                  <button type="button" className="p-2 rounded-xl hover:bg-muted/40 active:scale-95" aria-label="Seller">
                    <Trophy className="w-5 h-5" style={{ color: "var(--surna-text)" }} />
                  </button>
                </Link>
              </>
            ) : (
              <div className="w-9" />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4">
        <ProfileInstagramView
          user={{
            ...userData,
            id: viewingUserId,
            isFollowing,
          }}
          avatarUrl={avatarUrl}
          isOwnProfile={isOwnProfile}
          socialLoading={socialLoading}
          onFollowToggle={handleFollowToggle}
          onMessage={handleSendMessage}
          onStatClick={handleStatClick}
        />
      </div>
    </div>
  );
}
