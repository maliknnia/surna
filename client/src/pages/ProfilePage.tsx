import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useRoute, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Settings,
  MapPin,
  Trophy,
  Target,
  Flame,
  Award,
  Zap,
  TrendingUp,
  Star,
  UserPlus,
  UserMinus,
  MessageCircle,
  ChevronRight,
  CheckCircle2,
  Shield,
  LayoutGrid,
  Pencil,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import { OWNER_PROFILE_AVATAR } from "@/lib/ownerAvatar";
import { ROUTES } from "@/navigation";
import type { UserWithProfile } from "@/lib/userProfileApi";

const DEMO_ACTIVITY = [
  { text: "Joined Lakers Pickup", time: "2h ago" },
  { text: "Won 5v5 match — 32 pts", time: "5h ago" },
  { text: "Hit 10-game win streak 🔥", time: "1d ago" },
  { text: "Earned MVP badge", time: "3d ago" },
];

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  const [_, params] = useRoute("/profile/:userId?");
  const viewingUserId = params?.userId || (user as any)?.id;
  const isOwnProfile = !params?.userId || viewingUserId === (user as any)?.id;
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
  const { data: ordersData } = useQuery<{ orders: any[] }>({
    queryKey: ["/api/orders/mine"],
    enabled: isOwnProfile,
  });

  useEffect(() => {
    if (userStats && !isOwnProfile) {
      setIsFollowing(userStats.isFollowing || false);
    }
  }, [userStats, isOwnProfile]);

  const handleFollowToggle = async () => {
    setSocialLoading(true);
    try {
      const response = await fetch(`/api/users/${viewingUserId}/follow`, {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.following);
        await queryClient.invalidateQueries({ queryKey: ["/api/users", viewingUserId] });
        toast({
          title: data.following ? "Following!" : "Unfollowed",
          description: data.following
            ? "You're now following this athlete"
            : "You unfollowed this athlete",
        });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update follow status", variant: "destructive" });
    } finally {
      setSocialLoading(false);
    }
  };

  const handleSendMessage = () => {
    setLocation(`/messages?userId=${encodeURIComponent(viewingUserId)}`);
  };

  const handleStatClick = (label: string) => {
    if (label === "Posts") {
      setLocation("/feed");
      return;
    }
    if (label === "Followers" || label === "Following") {
      setLocation("/discover/people");
      return;
    }
    if (label === "Games") {
      setLocation("/challenges");
    }
  };

  const userData = (userStats || user) as any;
  const profile = userStats?.profile;
  const displayName =
    userData?.displayName ||
    `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() ||
    "Athlete";
  const username = userData?.username || userData?.email?.split("@")[0] || "user";
  const avatarUrl = isOwnProfile
    ? (userData?.profileImageUrl || OWNER_PROFILE_AVATAR)
    : userData?.profileImageUrl || "";
  const initials = `${(userData?.firstName || "U")[0]}${(userData?.lastName || "")[0] || ""}`;
  const sportsList = profile?.sports?.length
    ? profile.sports
    : userData?.sport
      ? [userData.sport]
      : [];
  const interestsList = profile?.interests ?? [];
  const activitiesList = profile?.activities ?? [];
  const highlightsList = profile?.highlights ?? [];
  const bioText = userData?.bio || profile?.tagline || "";
  const profileCompletion = userStats?.profileCompletion ?? 0;

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

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--surna-void)" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 glass-effect"
        style={{
          background: "var(--glass-bg)",
          borderBottom: "0.5px solid var(--surna-border)",
        }}
      >
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/">
            <button className="p-2 rounded-xl transition-all duration-200 hover:bg-muted/40 active:scale-95">
              <ArrowLeft className="w-5 h-5" style={{ color: "var(--surna-text)" }} />
            </button>
          </Link>
          <h1 className="text-lg font-semibold" style={{ color: "var(--surna-text)" }}>
            Profile
          </h1>
          <div className="flex items-center gap-1">
            <Link href="/my-hub">
              <button
                className="p-2 rounded-xl transition-all duration-200 hover:bg-muted/40 active:scale-95"
                aria-label="Open My Hub"
                data-testid="profile-myhub-link"
              >
                <LayoutGrid className="w-5 h-5" style={{ color: "var(--surna-text)" }} />
              </button>
            </Link>
            {isOwnProfile && (
            <Link href={ROUTES.profileEdit}>
              <button className="p-2 rounded-xl transition-all duration-200 hover:bg-muted/40 active:scale-95" aria-label="Edit profile">
                <Pencil className="w-5 h-5" style={{ color: "var(--surna-text)" }} />
              </button>
            </Link>
            )}
            <Link href="/settings">
              <button className="p-2 rounded-xl transition-all duration-200 hover:bg-muted/40 active:scale-95">
                <Settings className="w-5 h-5" style={{ color: "var(--surna-text)" }} />
              </button>
            </Link>
            <Link href="/seller/dashboard">
              <button className="p-2 rounded-xl transition-all duration-200 hover:bg-muted/40 active:scale-95">
                <Trophy className="w-5 h-5" style={{ color: "var(--surna-text)" }} />
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        {/* Profile Card */}
        <div className="flex flex-col items-center text-center animate-fade-in">
          <Avatar className="w-20 h-20 ring-2 ring-white/10 shadow-lg">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback
              className="text-xl font-semibold"
              style={{ background: "var(--surna-elevated)", color: "var(--surna-text)" }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2 mt-4">
            <h2 className="text-xl font-bold" style={{ color: "var(--surna-text)" }}>
              {displayName}
            </h2>
            {userData?.verified ? <CheckCircle2 className="w-5 h-5" style={{ color: "var(--surna-gold)" }} /> : null}
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: "var(--surna-gold-dark)", color: "#000" }}
            >
              112
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--surna-text-secondary)" }}>
            @{username.replace(/^@+/, "")}
          </p>
          <div className="flex items-center gap-0.5 mt-2">
            {[1, 2, 3, 4].map((s) => (
              <Star key={s} className="w-3.5 h-3.5 fill-current" style={{ color: "var(--surna-gold)" }} />
            ))}
            <Star className="w-3.5 h-3.5" style={{ color: "var(--surna-gold)", opacity: 0.4 }} />
            <span className="text-xs font-semibold ml-1" style={{ color: "var(--surna-gold)" }}>4.8</span>
          </div>
          {bioText ? (
            <p className="text-sm mt-2 max-w-[280px]" style={{ color: "var(--surna-text-secondary)" }}>
              {bioText}
            </p>
          ) : isOwnProfile ? (
            <p className="text-sm mt-2 max-w-[280px]" style={{ color: "var(--surna-text-muted)" }}>
              Add a bio so people know what you're about
            </p>
          ) : null}
          {userData?.location ? (
            <div className="flex items-center gap-1 mt-2">
              <MapPin className="w-3.5 h-3.5" style={{ color: "var(--surna-text-muted)" }} />
              <span className="text-xs" style={{ color: "var(--surna-text-muted)" }}>
                {userData.location}
              </span>
            </div>
          ) : null}
        </div>

        {isOwnProfile && profileCompletion < 100 && (
          <Link href={ROUTES.profileEdit}>
            <div
              className="w-full rounded-2xl p-4 cursor-pointer active:scale-[0.99] transition-transform"
              style={{ background: "var(--surna-elevated)", border: "0.5px solid var(--surna-border)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--surna-text)" }}>
                  <Sparkles className="w-4 h-4" style={{ color: "var(--surna-gold)" }} />
                  Complete your profile
                </span>
                <span className="text-xs font-bold" style={{ color: "var(--surna-gold)" }}>{profileCompletion}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "var(--surna-void)" }}>
                <div className="h-full rounded-full" style={{ width: `${profileCompletion}%`, background: "var(--surna-gold)" }} />
              </div>
              <p className="text-[11px]" style={{ color: "var(--surna-text-muted)" }}>
                Add interests, sports & highlights anytime — no rush.
              </p>
            </div>
          </Link>
        )}

        {/* Stats Row */}
        <div
          className="grid grid-cols-4 rounded-2xl p-1 animate-fade-in stagger-1"
          style={{ background: "var(--surna-elevated)" }}
        >
          {[
            { value: userStats?.postsCount ?? 24, label: "Posts" },
            { value: userStats?.followersCount ?? 1283, label: "Followers" },
            { value: userStats?.followingCount ?? 412, label: "Following" },
            { value: 87, label: "Games" },
          ].map((stat) => (
            <button
              key={stat.label}
              type="button"
              onClick={() => handleStatClick(stat.label)}
              className="flex flex-col items-center py-3 rounded-xl transition-all duration-200 hover:bg-muted/40 active:scale-95"
            >
              <span className="text-lg font-bold" style={{ color: "var(--surna-text)" }}>
                {typeof stat.value === "number" && stat.value >= 1000
                  ? `${(stat.value / 1000).toFixed(1)}k`
                  : stat.value}
              </span>
              <span className="text-[11px] mt-0.5" style={{ color: "var(--surna-text-secondary)" }}>
                {stat.label}
              </span>
            </button>
          ))}
        </div>

        {/* Action Buttons (other profile only) */}
        {!isOwnProfile && (
          <div className="flex gap-3 animate-fade-in stagger-2">
            <Button
              onClick={handleFollowToggle}
              disabled={socialLoading}
              className={`flex-1 rounded-full h-11 font-semibold text-sm transition-all duration-300 ${
                isFollowing
                  ? "bg-transparent border border-border hover:border-border"
                  : "bg-background text-foreground hover:bg-muted/40"
              }`}
              style={isFollowing ? { color: "var(--surna-text)" } : {}}
            >
              {socialLoading ? (
                <div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin" />
              ) : isFollowing ? (
                <>
                  <UserMinus className="w-4 h-4 mr-2" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Follow
                </>
              )}
            </Button>
            <Button
              onClick={handleSendMessage}
              variant="outline"
              className="flex-1 rounded-full h-11 font-semibold text-sm border-border hover:border-border transition-all duration-300"
              style={{ color: "var(--surna-text)", background: "transparent" }}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </Button>
          </div>
        )}

        {/* Sports Tags */}
        {(sportsList.length > 0 || isOwnProfile) && (
        <div className="animate-fade-in stagger-2">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--surna-text)" }}>
            Sports
          </h3>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {sportsList.length > 0 ? sportsList.map((sport) => (
              <Badge
                key={sport}
                variant="outline"
                className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border-border"
                style={{ color: "var(--surna-text-secondary)", background: "var(--surna-elevated)" }}
              >
                {sport}
              </Badge>
            )) : (
              <Link href={ROUTES.profileEdit} className="text-xs underline" style={{ color: "var(--surna-text-muted)" }}>
                Add sports you play →
              </Link>
            )}
          </div>
        </div>
        )}

        {/* Interests & activities */}
        {(interestsList.length > 0 || activitiesList.length > 0) && (
          <div className="animate-fade-in stagger-2 space-y-3">
            {interestsList.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--surna-text)" }}>Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {interestsList.map((item) => (
                    <Badge key={item} variant="outline" className="rounded-full px-3 py-1 text-xs" style={{ background: "var(--surna-elevated)", color: "var(--surna-text-secondary)" }}>
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {activitiesList.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--surna-text)" }}>What I do</h3>
                <div className="flex flex-wrap gap-2">
                  {activitiesList.map((item) => (
                    <Badge key={item} variant="outline" className="rounded-full px-3 py-1 text-xs" style={{ background: "var(--surna-elevated)", color: "var(--surna-text-secondary)" }}>
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Stats Cards */}
        <div className="animate-fade-in stagger-3">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--surna-text)" }}>
            Quick Stats
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Target, label: "Win Rate", value: "72%", color: "var(--surna-text)", iconColor: "var(--surna-text-secondary)" },
              { icon: Shield, label: "Level", value: "112", color: "var(--surna-gold)", iconColor: "var(--surna-gold-dark)" },
              { icon: Flame, label: "Streak", value: "7 🔥", color: "var(--surna-text)", iconColor: "var(--surna-text-secondary)" },
              { icon: Zap, label: "Total Points", value: "4,820", color: "var(--surna-text)", iconColor: "var(--surna-text-secondary)" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl p-4 transition-all duration-300 hover:scale-105 cursor-default"
                style={{
                  background: "var(--surna-elevated)",
                  border: "0.5px solid var(--surna-border)",
                }}
              >
                <stat.icon className="w-5 h-5 mb-2" style={{ color: stat.iconColor }} />
                <p className="text-xl font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--surna-text-secondary)" }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Highlights */}
        <div className="animate-fade-in stagger-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--surna-text)" }}>
            Highlights
          </h3>
          {highlightsList.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {highlightsList.map((ach) => (
              <div
                key={ach.id}
                className="shrink-0 flex flex-col items-center w-[100px] rounded-2xl p-3"
                style={{
                  background: "var(--surna-elevated)",
                  border: "0.5px solid var(--surna-border)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-2 text-lg"
                  style={{ background: "rgba(255, 215, 0, 0.1)" }}
                >
                  {ach.emoji || "🏆"}
                </div>
                <span className="text-[11px] font-semibold text-center leading-tight" style={{ color: "var(--surna-text)" }}>
                  {ach.title}
                </span>
                {ach.description ? (
                  <span className="text-[10px] text-center mt-0.5 leading-tight line-clamp-2" style={{ color: "var(--surna-text-muted)" }}>
                    {ach.description}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          ) : isOwnProfile ? (
            <Link href={ROUTES.profileEdit} className="text-xs underline" style={{ color: "var(--surna-text-muted)" }}>
              Share your proudest moments →
            </Link>
          ) : (
            <p className="text-xs" style={{ color: "var(--surna-text-muted)" }}>No highlights yet</p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="animate-fade-in stagger-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--surna-text)" }}>
            Recent Activity
          </h3>
          <div
            className="rounded-2xl overflow-hidden divide-y"
            style={{
              background: "var(--surna-elevated)",
              borderColor: "var(--surna-border)",
            }}
          >
            {DEMO_ACTIVITY.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3.5 transition-all duration-200 hover:bg-background/[0.03] cursor-default"
                style={{ borderColor: "var(--surna-border)" }}
              >
                <span className="text-sm" style={{ color: "var(--surna-text)" }}>
                  {item.text}
                </span>
                <div className="flex items-center gap-1 shrink-0 ml-3">
                  <span className="text-[11px]" style={{ color: "var(--surna-text-muted)" }}>
                    {item.time}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--surna-text-muted)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Orders */}
        {isOwnProfile && (
          <div className="animate-fade-in stagger-5">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--surna-text)" }}>
              Orders
            </h3>
            <div className="space-y-2">
              {(ordersData?.orders || []).slice(0, 6).map((order: any) => (
                <div key={order.id} className="rounded-xl p-3" style={{ background: "var(--surna-elevated)", border: "0.5px solid var(--surna-border)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: "var(--surna-text)" }}>Order {String(order.id).slice(0, 8)}</span>
                    <span className="text-xs" style={{ color: "var(--surna-gold)" }}>{order.status}</span>
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: "var(--surna-text-muted)" }}>
                    Timeline: pending → confirmed → dispatched → delivered
                  </p>
                </div>
              ))}
              {(ordersData?.orders || []).length === 0 && (
                <div className="rounded-xl p-3 text-xs" style={{ background: "var(--surna-elevated)", color: "var(--surna-text-secondary)" }}>
                  No orders yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
