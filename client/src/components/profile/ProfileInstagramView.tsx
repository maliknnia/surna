import { useRef, useState, Suspense } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  LayoutGrid,
  Image as ImageIcon,
  UserPlus,
  Share2,
  Play,
  Film,
  MessageCircle,
  Plus,
  Loader2,
} from "lucide-react";
import { LazyImage } from "@/components/ui/lazy-image";
import { deriveLqipPlaceholder, deriveModernSources } from "@/lib/imageSources";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { ROUTES } from "@/navigation";
import type { UserHighlight } from "@shared/userProfile";
import { cn } from "@/lib/utils";
import type { ProfileExtras } from "@/hooks/useProfileExtras";
import { ProfileQuickStats } from "@/components/profile/ProfileQuickStats";
import { ProfilePhotoLightbox, type LightboxPhoto } from "@/components/profile/ProfilePhotoLightbox";
import { capturePhoto } from "@/lib/capacitor/camera";
import { useToast } from "@/hooks/use-toast";
import { uploadGalleryPhoto } from "@/lib/uploadCreateMedia";
import {
  EntityHero,
  EntityStatRow,
  EntitySectionTabs,
  EntityGridSkeleton,
  EntityEmptyState,
  entityBtnClass,
  entityBtnSurface,
} from "@/components/entity";

import { ProfileAboutSection } from "@/components/profile/ProfileAboutSection";
import { ProfileTeamsPanel } from "@/components/profile/ProfileTeamsPanel";
import { ProfileEventsPanel } from "@/components/profile/ProfileEventsPanel";
import {
  ProfileStatsPanel,
  ProfileGamesPanel,
} from "@/components/profile/ProfileSectionPanels";

type ProfileSection = "about" | "posts" | "photos" | "stats" | "teams" | "events" | "games";
type PostsSubview = "posts" | "reels";

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
    primarySport?: string;
    position?: string;
    skillLevel?: string;
    availability?: string;
    lookingFor?: string;
  };
  primarySport?: string;
  position?: string;
  skillLevel?: string;
  availability?: string;
  lookingFor?: string;
  createdAt?: string | Date | null;
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

function matchesSport(text: string | null | undefined, sport: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(sport.toLowerCase());
}

const igBtn = entityBtnClass;

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
  const [section, setSection] = useState<ProfileSection>("about");
  const [postsView, setPostsView] = useState<PostsSubview>("posts");
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

  const sectionTabs: { id: ProfileSection; label: string }[] = [
    { id: "about", label: "About" },
    { id: "posts", label: "Posts" },
    { id: "photos", label: "Photos" },
    { id: "stats", label: "Stats" },
    { id: "teams", label: "Teams" },
    { id: "events", label: "Events" },
    { id: "games", label: "Games" },
  ];

  const { data: apiPhotos = [], isLoading: photosLoading } = useQuery<UserPhoto[]>({
    queryKey: ["/api/users", userId, "photos"],
    queryFn: getQueryFn({ on401: "returnNull" }) as () => Promise<UserPhoto[]>,
    enabled: !!userId,
  });

  const photos = apiPhotos;

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
      const { publicUrl, width, height } = await uploadGalleryPhoto(file);
      await addPhoto.mutateAsync({ imageUrl: publicUrl, width, height });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
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

  const btnSurface = entityBtnSurface;

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
      <EntityHero
        coverUrl={showCover ? coverPhotoUrl : null}
        avatarUrl={avatarUrl}
        avatarFallback={initials}
        title={displayName}
        subtitle={`@${username}`}
        verified={user.verified}
        badge={{ label: String(profileExtras.level) }}
        rating={profileExtras.rating > 0 ? profileExtras.rating : undefined}
        onRatingClick={onRatingClick}
        bio={bioText || undefined}
        location={user.location}
      />

      <EntityStatRow
        stats={stats.map((s) => ({ value: s.value, label: s.label }))}
        onStatClick={onStatClick}
      />

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
              className={cn(
                entityBtnClass,
                "flex-1",
                !user.isFollowing && "border-0",
              )}
              style={
                user.isFollowing
                  ? entityBtnSurface
                  : { background: "var(--surna-text)", color: "var(--surna-base)" }
              }
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
            <button
              type="button"
              onClick={onMessage}
              className={cn(entityBtnClass, "flex-1 gap-1.5")}
              style={entityBtnSurface}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={2} />
              Message
            </button>
          </>
        )}
      </div>

      {headerExtra}

      <ProfileQuickStats
        winRate={profileExtras.winRate}
        level={profileExtras.level}
        gamesCount={profileExtras.gamesCount}
        onWinRateClick={onWinRateClick}
        onLevelClick={onLevelClick}
      />

      <EntitySectionTabs
        tabs={sectionTabs}
        activeId={section}
        onChange={(id) => setSection(id as ProfileSection)}
        testIdPrefix="profile-section"
      />

      {section === "about" ? (
        <ProfileAboutSection
          bio={bioText}
          location={user.location}
          primarySport={user.primarySport ?? user.profile?.primarySport}
          position={user.position ?? user.profile?.position}
          skillLevel={user.skillLevel ?? user.profile?.skillLevel}
          availability={user.availability ?? user.profile?.availability}
          lookingFor={user.lookingFor ?? user.profile?.lookingFor}
          createdAt={user.createdAt}
          highlights={highlightsList}
          profileExtras={profileExtras}
          isOwnProfile={isOwnProfile}
          selectedSport={selectedSport}
          onSportSelect={setSelectedSport}
          onWinRateClick={onWinRateClick}
          onLevelClick={onLevelClick}
        />
      ) : null}

      {section === "stats" ? (
        <Suspense
          fallback={
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--surna-text-secondary)" }} />
            </div>
          }
        >
          <ProfileStatsPanel userId={userId} profileExtras={profileExtras} />
        </Suspense>
      ) : null}

      {section === "teams" ? <ProfileTeamsPanel userId={userId} isOwnProfile={isOwnProfile} /> : null}

      {section === "events" ? <ProfileEventsPanel userId={userId} isOwnProfile={isOwnProfile} /> : null}

      {section === "games" ? (
        <Suspense
          fallback={
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--surna-text-secondary)" }} />
            </div>
          }
        >
          <ProfileGamesPanel userId={userId} isOwnProfile={isOwnProfile} />
        </Suspense>
      ) : null}

      {section === "posts" ? (
        <>
          <div className="flex gap-2 mb-3">
            {(
              [
                { id: "posts" as const, label: "Posts", icon: LayoutGrid },
                { id: "reels" as const, label: "Reels", icon: Film },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPostsView(id)}
                className="flex-1 h-9 rounded-lg text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 active:opacity-80"
                style={{
                  background: postsView === id ? "var(--surna-text)" : "var(--surna-elevated)",
                  color: postsView === id ? "var(--surna-base)" : "var(--surna-text)",
                  border: postsView === id ? "none" : "1px solid var(--surna-border)",
                }}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          {selectedSport ? (
            <p className="text-[12px] mb-2" style={{ color: "var(--surna-text-secondary)" }}>
              Filtered by {selectedSport} ·{" "}
              <button type="button" className="underline" onClick={() => setSelectedSport(null)}>
                Clear
              </button>
            </p>
          ) : null}
        </>
      ) : null}

      {section === "photos" && isOwnProfile ? (
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

      {section === "photos" && selectedSport ? (
        <p className="text-[12px] mb-2 px-1" style={{ color: "var(--surna-text-secondary)" }}>
          Filtered by {selectedSport} ·{" "}
          <button type="button" className="underline" onClick={() => setSelectedSport(null)}>
            Clear
          </button>
        </p>
      ) : null}

      {/* Grid — posts & photos sections */}
      {(section === "posts" || section === "photos") ? (
      <div className={section === "photos" ? "-mx-4 mt-0" : "-mx-4"}>
        {section === "posts" && postsView === "posts" ? (
          postsLoading ? (
            <EntityGridSkeleton cells={9} />
          ) : imagePosts.length === 0 ? (
            <EntityEmptyState
              icon={LayoutGrid}
              title={selectedSport ? `No ${selectedSport} posts yet` : "No posts yet"}
              description={
                isOwnProfile && !selectedSport
                  ? "Share photos and updates from the feed — they'll show up here."
                  : undefined
              }
              actionLabel={isOwnProfile && !selectedSport ? "Go to feed" : undefined}
              actionHref={isOwnProfile && !selectedSport ? ROUTES.feed : undefined}
            />
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

        {section === "posts" && postsView === "reels" ? (
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

        {section === "photos" ? (
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
      ) : null}

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
