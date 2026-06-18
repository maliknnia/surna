import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  LayoutGrid,
  Image as ImageIcon,
  MapPin,
  UserPlus,
  CheckCircle2,
  Share2,
  Play,
  Film,
  MessageCircle,
  Star,
  Plus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LazyImage } from "@/components/ui/lazy-image";
import { deriveLqipPlaceholder, deriveModernSources } from "@/lib/imageSources";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { ROUTES } from "@/navigation";
import type { UserHighlight } from "@shared/userProfile";
import { cn } from "@/lib/utils";
import { mergeProfilePhotos, type DemoProfilePhoto } from "@/lib/demoProfileMedia";
import type { ProfileExtras } from "@/hooks/useProfileExtras";
import { ProfileSportsSection } from "@/components/profile/ProfileSportsSection";
import { ProfileQuickStats } from "@/components/profile/ProfileQuickStats";
import { ProfilePhotoLightbox, type LightboxPhoto } from "@/components/profile/ProfilePhotoLightbox";
import { capturePhoto } from "@/lib/capacitor/camera";
import { useToast } from "@/hooks/use-toast";

type ProfileTab = "posts" | "reels" | "photos";

type UserPhoto = {
  id: string;
  imageUrl: string;
  caption?: string | null;
  sport?: string;
};

type ProfilePost = {
  id: string;
  content?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  likesCount?: number;
  sport?: string | null;
};

export type ProfileInstagramUser = {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  bio?: string;
  location?: string;
  profileImageUrl?: string;
  verified?: boolean;
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  profile?: {
    tagline?: string;
    sports?: string[];
    highlights?: UserHighlight[];
  };
};

type ProfileInstagramViewProps = {
  user: ProfileInstagramUser;
  avatarUrl: string;
  coverPhotoUrl?: string | null;
  showCover?: boolean;
  isOwnProfile: boolean;
  profileExtras: ProfileExtras;
  socialLoading?: boolean;
  onFollowToggle?: () => void;
  onMessage?: () => void;
  onStatClick?: (label: string) => void;
  onPostClick?: (postId: string) => void;
  onWinRateClick?: () => void;
  onLevelClick?: () => void;
  onRatingClick?: () => void;
  headerExtra?: React.ReactNode;
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function matchesSport(text: string | null | undefined, sport: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(sport.toLowerCase());
}

function renderStars(rating: number) {
  const stars = [];
  for (let i = 0; i < 5; i++) {
    const filled = rating >= i + 1;
    const half = !filled && rating >= i + 0.5;
    stars.push(
      <Star
        key={i}
        className="w-3.5 h-3.5"
        style={{ color: "var(--surna-gold, #f5c518)" }}
        fill={filled || half ? "currentColor" : "none"}
        strokeWidth={1.5}
      />,
    );
  }
  return stars;
}

const igBtn =
  "flex-1 h-[34px] rounded-lg text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 active:opacity-70 transition-opacity";

export function ProfileInstagramView({
  user,
  avatarUrl,
  coverPhotoUrl,
  showCover = false,
  isOwnProfile,
  profileExtras,
  socialLoading,
  onFollowToggle,
  onMessage,
  onStatClick,
  onPostClick,
  onWinRateClick,
  onLevelClick,
  onRatingClick,
  headerExtra,
}: ProfileInstagramViewProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<ProfileTab>("posts");
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<LightboxPhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = user.id;

  const displayName =
    user.displayName ||
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    "Athlete";
  const username = (user.username || user.email?.split("@")[0] || "user").replace(/^@+/, "");
  const initials = `${(user.firstName || displayName[0] || "U")[0]}${(user.lastName || "")[0] || ""}`;
  const bioText = user.bio || user.profile?.tagline || "";
  const highlightsList = user.profile?.highlights ?? [];

  const { data: apiPhotos = [], isLoading: photosLoading } = useQuery<UserPhoto[]>({
    queryKey: ["/api/users", userId, "photos"],
    queryFn: getQueryFn({ on401: "returnNull" }) as () => Promise<UserPhoto[]>,
    enabled: !!userId,
  });

  const photos = mergeProfilePhotos(apiPhotos, isOwnProfile) as (UserPhoto | DemoProfilePhoto)[];

  const addPhoto = useMutation({
    mutationFn: async (payload: { imageUrl: string; caption?: string; width?: number; height?: number }) =>
      apiRequest("POST", `/api/users/${userId}/photos`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "photos"] });
      toast({ title: "Photo added" });
    },
    onError: () => toast({ title: "Upload failed", variant: "destructive" }),
  });

  const deletePhoto = useMutation({
    mutationFn: async (photoId: string) => apiRequest("DELETE", `/api/users/photos/${photoId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "photos"] });
      setLightboxPhoto(null);
      toast({ title: "Photo deleted" });
    },
  });

  const processPhotoFile = async (file: File) => {
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const img = new Image();
        img.onload = () => {
          addPhoto.mutate({ imageUrl: dataUrl, width: img.width, height: img.height });
          setUploading(false);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const handleAddPhoto = async () => {
    const file = await capturePhoto({ source: "gallery" });
    if (file) await processPhotoFile(file);
    else fileInputRef.current?.click();
  };

  const { data: feedData, isLoading: postsLoading } = useQuery<{ posts: ProfilePost[] }>({
    queryKey: ["/api/profile", userId, "feed"],
    enabled: !!userId,
  });

  const posts = feedData?.posts ?? [];
  const filterBySport = <T extends { content?: string | null; caption?: string | null; sport?: string | null }>(
    items: T[],
  ) => {
    if (!selectedSport) return items;
    return items.filter(
      (item) =>
        item.sport === selectedSport ||
        matchesSport(item.content, selectedSport) ||
        matchesSport(item.caption, selectedSport),
    );
  };

  const imagePosts = filterBySport(posts.filter((p) => !p.videoUrl));
  const reelPosts = filterBySport(posts.filter((p) => p.videoUrl));
  const filteredPhotos = filterBySport(photos);

  const stats = [
    { value: user.postsCount ?? posts.length, label: "posts" },
    { value: user.followersCount ?? 0, label: "followers" },
    { value: user.followingCount ?? 0, label: "following" },
    { value: profileExtras.gamesCount, label: "games" },
  ];

  const btnSurface = {
    background: "var(--ig-profile-btn-bg)",
    color: "var(--surna-text)",
  };

  const handleShareProfile = () => {
    const url = `${window.location.origin}/profile/${userId}`;
    if (navigator.share) {
      void navigator.share({ title: displayName, url }).catch(() => {});
    } else {
      void navigator.clipboard.writeText(url);
    }
  };

  return (
    <div className="pb-2">
      {showCover && coverPhotoUrl ? (
        <div
          className="-mx-4 mb-4 h-28 sm:h-32 overflow-hidden"
          style={{ borderBottom: "1px solid var(--surna-border)" }}
        >
          <img src={coverPhotoUrl} alt="" className="h-full w-full object-cover object-top" />
        </div>
      ) : null}

      {/* Centered avatar */}
      <div className="flex flex-col items-center mb-3">
        <Avatar className="w-[96px] h-[96px] shrink-0 mb-3">
          <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
          <AvatarFallback
            className="text-xl font-semibold"
            style={{ background: "var(--surna-elevated)", color: "var(--surna-text)" }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex items-center gap-2 mb-0.5">
          <h2 className="text-[18px] font-bold leading-tight" style={{ color: "var(--surna-text)" }}>
            {displayName}
          </h2>
          {user.verified ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "var(--surna-gold, #f5c518)" }} fill="currentColor" />
          ) : null}
          <span
            className="px-2 py-0.5 rounded-full text-[12px] font-bold tabular-nums"
            style={{ background: "var(--surna-gold, #f5c518)", color: "#111" }}
          >
            {profileExtras.level}
          </span>
        </div>

        <p className="text-[14px] mb-1" style={{ color: "var(--surna-text-secondary)" }}>
          @{username}
        </p>

        {profileExtras.rating > 0 ? (
          <button
            type="button"
            onClick={onRatingClick}
            className="flex items-center gap-1.5 mb-2 active:opacity-70"
          >
            <span className="flex items-center gap-0.5">{renderStars(profileExtras.rating)}</span>
            <span className="text-[14px] font-semibold tabular-nums" style={{ color: "var(--surna-gold, #f5c518)" }}>
              {profileExtras.rating.toFixed(1)}
            </span>
          </button>
        ) : null}

        {bioText ? (
          <p
            className="text-[14px] text-center leading-snug whitespace-pre-wrap max-w-sm px-2"
            style={{ color: "var(--surna-text)" }}
          >
            {bioText}
          </p>
        ) : null}

        {user.location ? (
          <div className="flex items-center gap-1 mt-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--surna-text-secondary)" }} />
            <span className="text-[13px]" style={{ color: "var(--surna-text-secondary)" }}>
              {user.location}
            </span>
          </div>
        ) : null}
      </div>

      {/* 4-stat row */}
      <div className="flex justify-around text-center mb-4 px-1">
        {stats.map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={() => onStatClick?.(stat.label)}
            className="min-w-0 flex-1 px-1 active:opacity-60 transition-opacity"
            data-testid={`profile-stat-${stat.label}`}
          >
            <span className="block text-[17px] font-semibold leading-none tabular-nums" style={{ color: "var(--surna-text)" }}>
              {formatCount(typeof stat.value === "number" ? stat.value : 0)}
            </span>
            <span
              className="block text-[12px] mt-1 capitalize"
              style={{ color: "var(--surna-text-secondary)" }}
            >
              {stat.label}
            </span>
          </button>
        ))}
      </div>

      {/* Action row */}
      <div className="flex gap-1.5 mb-4">
        {isOwnProfile ? (
          <>
            <Link href={ROUTES.profileEdit} className="flex-1">
              <button type="button" className={cn(igBtn, "w-full")} style={btnSurface}>
                Edit profile
              </button>
            </Link>
            <button
              type="button"
              onClick={handleShareProfile}
              className={cn(igBtn, "w-[34px] flex-none px-0")}
              style={btnSurface}
              aria-label="Share profile"
            >
              <Share2 className="w-[15px] h-[15px]" strokeWidth={2} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onFollowToggle}
              disabled={socialLoading}
              className={cn(igBtn, user.isFollowing ? "" : "bg-primary text-primary-foreground")}
              style={user.isFollowing ? { ...btnSurface, border: "none" } : undefined}
            >
              {socialLoading ? (
                <div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin" />
              ) : user.isFollowing ? (
                "Following"
              ) : (
                <>
                  <UserPlus className="w-4 h-4" strokeWidth={2} />
                  Follow
                </>
              )}
            </button>
            <button type="button" onClick={onMessage} className={cn(igBtn, "gap-1.5")} style={btnSurface}>
              <MessageCircle className="w-4 h-4" strokeWidth={2} style={{ color: "var(--surna-text)" }} />
              Message
            </button>
          </>
        )}
      </div>

      {headerExtra}

      <ProfileSportsSection
        sports={profileExtras.sports}
        selectedSport={selectedSport}
        onSelect={setSelectedSport}
      />

      <ProfileQuickStats
        winRate={profileExtras.winRate}
        level={profileExtras.level}
        onWinRateClick={onWinRateClick}
        onLevelClick={onLevelClick}
      />

      {/* Highlights */}
      {highlightsList.length > 0 ? (
        <div className="overflow-x-auto no-scrollbar mb-4 -mx-1 px-1">
          <div className="flex gap-4">
            {highlightsList.map((h) => (
              <div key={h.id} className="shrink-0 flex flex-col items-center w-[64px]">
                <div
                  className="w-[64px] h-[64px] rounded-full p-[2px]"
                  style={{
                    background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                  }}
                >
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center text-xl"
                    style={{ background: "var(--surna-base)", border: "2px solid var(--surna-base)" }}
                  >
                    {h.emoji || "🏆"}
                  </div>
                </div>
                <span
                  className="text-[11px] mt-1.5 text-center leading-tight line-clamp-1 w-full"
                  style={{ color: "var(--surna-text)" }}
                >
                  {h.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Tab bar */}
      <div className="flex border-t border-b" style={{ borderColor: "var(--surna-border)" }}>
        {(
          [
            { id: "posts" as const, icon: LayoutGrid },
            { id: "reels" as const, icon: Film },
            { id: "photos" as const, icon: ImageIcon },
          ] as const
        ).map(({ id, icon: TabIcon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 flex items-center justify-center py-3 border-b-[1.5px] -mb-px transition-opacity",
              tab === id ? "border-[var(--surna-text)] opacity-100" : "border-transparent opacity-50",
            )}
            aria-label={id}
            data-testid={`profile-tab-${id}`}
          >
            <TabIcon className="w-6 h-6" strokeWidth={tab === id ? 2 : 1.5} style={{ color: "var(--surna-text)" }} />
          </button>
        ))}
      </div>

      {isOwnProfile && tab === "photos" ? (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void processPhotoFile(file);
            }}
          />
          <div className="flex justify-end py-2 px-1">
            <button
              type="button"
              onClick={() => void handleAddPhoto()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold active:opacity-70"
              style={{ color: "var(--surna-text)" }}
              data-testid="button-add-profile-photo"
            >
              <Plus className="w-4 h-4" />
              {uploading ? "Uploading…" : "Add photo"}
            </button>
          </div>
        </>
      ) : null}

      {/* Grid */}
      <div className="-mx-4 mt-0">
        {tab === "posts" ? (
          postsLoading ? (
            <div className="grid grid-cols-3 gap-[1px]">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse" style={{ background: "var(--surna-elevated)" }} />
              ))}
            </div>
          ) : imagePosts.length === 0 ? (
            <div className="py-16 text-center px-6">
              <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-25" style={{ color: "var(--surna-text)" }} />
              <p className="text-base font-semibold" style={{ color: "var(--surna-text)" }}>
                {selectedSport ? `No ${selectedSport} posts yet` : "No posts yet"}
              </p>
              {isOwnProfile && !selectedSport ? (
                <Link href="/feed">
                  <p className="text-sm mt-2" style={{ color: "var(--surna-text-secondary)" }}>
                    When you share photos, they will appear here.
                  </p>
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-[1px]">
              {imagePosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  className="aspect-square relative overflow-hidden active:opacity-90"
                  style={{ background: "var(--surna-elevated)" }}
                  onClick={() => onPostClick?.(post.id)}
                  data-testid={`profile-post-${post.id}`}
                >
                  {post.imageUrl ? (
                    <LazyImage
                      src={post.imageUrl}
                      alt=""
                      sources={deriveModernSources(post.imageUrl)}
                      placeholder={deriveLqipPlaceholder(post.imageUrl)}
                      wrapperClassName="block w-full h-full"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full p-2 flex items-center justify-center text-center text-[10px] leading-tight line-clamp-4"
                      style={{ color: "var(--surna-text-secondary)" }}
                    >
                      {post.content?.slice(0, 80) || "Post"}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )
        ) : null}

        {tab === "reels" ? (
          postsLoading ? (
            <div className="grid grid-cols-3 gap-[1px]">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-[9/16] animate-pulse" style={{ background: "var(--surna-elevated)" }} />
              ))}
            </div>
          ) : reelPosts.length === 0 ? (
            <div className="py-16 text-center px-6">
              <Film className="w-12 h-12 mx-auto mb-3 opacity-25" style={{ color: "var(--surna-text)" }} />
              <p className="text-base font-semibold" style={{ color: "var(--surna-text)" }}>
                {selectedSport ? `No ${selectedSport} reels yet` : "No reels yet"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-[1px]">
              {reelPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  className="aspect-[9/16] relative overflow-hidden active:opacity-90 bg-black"
                  onClick={() => onPostClick?.(post.id)}
                  data-testid={`profile-reel-${post.id}`}
                >
                  {post.imageUrl ? (
                    <LazyImage
                      src={post.imageUrl}
                      alt=""
                      sources={deriveModernSources(post.imageUrl)}
                      placeholder={deriveLqipPlaceholder(post.imageUrl)}
                      wrapperClassName="block w-full h-full"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full" style={{ background: "var(--surna-elevated)" }} />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Play className="w-7 h-7 text-white/90 drop-shadow-md" fill="currentColor" strokeWidth={0} />
                  </div>
                </button>
              ))}
            </div>
          )
        ) : null}

        {tab === "photos" ? (
          photosLoading ? (
            <div className="grid grid-cols-3 gap-[1px]">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse" style={{ background: "var(--surna-elevated)" }} />
              ))}
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="py-16 text-center px-6">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-25" style={{ color: "var(--surna-text)" }} />
              <p className="text-base font-semibold" style={{ color: "var(--surna-text)" }}>
                {selectedSport ? `No ${selectedSport} photos yet` : "No photos yet"}
              </p>
              {isOwnProfile ? (
                <button
                  type="button"
                  onClick={() => void handleAddPhoto()}
                  className="text-sm mt-3 font-medium underline-offset-2 hover:underline"
                  style={{ color: "var(--surna-text-secondary)" }}
                >
                  Add your first photo
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-[1px]">
              {filteredPhotos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="aspect-square overflow-hidden active:opacity-90"
                  onClick={() => setLightboxPhoto(p)}
                  data-testid={`profile-photo-${p.id}`}
                >
                  <LazyImage
                    src={p.imageUrl}
                    alt={p.caption || "photo"}
                    sources={deriveModernSources(p.imageUrl)}
                    placeholder={deriveLqipPlaceholder(p.imageUrl)}
                    wrapperClassName="block w-full h-full"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )
        ) : null}
      </div>

      {lightboxPhoto ? (
        <ProfilePhotoLightbox
          photo={lightboxPhoto}
          isOwnProfile={isOwnProfile}
          onClose={() => setLightboxPhoto(null)}
          onDelete={(id) => deletePhoto.mutate(id)}
        />
      ) : null}
    </div>
  );
}
