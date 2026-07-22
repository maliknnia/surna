import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { coachVerificationStatus } from "@/components/coaches/CoachVerificationBadge";
import {
  ArrowLeft,
  Award,
  Clock,
  GraduationCap,
  Globe,
  Link2,
  Loader2,
  Play,
  Settings,
  Share2,
  QrCode,
  X,
  Users,
} from "lucide-react";
import type { CoachWithProfile } from "@shared/schema";
import { formatPlanPrice, parseCoachProfile, type CoachPricingPlan } from "@shared/coachProfile";
import CoachBookingModal from "@/components/coaches/CoachBookingModal";
import { fetchCoach, startCoachChat } from "@/lib/coachesApi";
import { apiRequest } from "@/lib/queryClient";
import { getSportConfig } from "@/components/TeamCard";
import { ROUTES } from "@/navigation";
import { useSmartBack } from "@/lib/navigation";
import QRCode from "qrcode";
import Reviews from "@/pages/profile/sections/Reviews";
import CoachHeader from "./coach/components/CoachHeader";

type Tab = "about" | "achievements" | "media" | "reviews" | "book";

const weekOrder = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const weekShort: Record<(typeof weekOrder)[number], string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export default function CoachProfile() {
  const [, params] = useRoute("/coaches/:id");
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { user } = useAuth();
  const { toast } = useToast();
  const goBack = useSmartBack({ fallback: ROUTES.coaches });
  const coachId = params?.id;

  const tabParam = new URLSearchParams(search).get("tab");
  const initialTab: Tab =
    tabParam === "book" || tabParam === "reviews" || tabParam === "achievements" || tabParam === "media"
      ? tabParam
      : "about";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<CoachPricingPlan | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [isFollowingCoach, setIsFollowingCoach] = useState(false);

  const followCoachMutation = useMutation({
    mutationFn: async () => {
      if (!coach?.userId) throw new Error("No coach");
      if (isFollowingCoach) {
        await apiRequest("DELETE", `/api/users/${coach.userId}/unfollow?type=coach`);
        return false;
      }
      await apiRequest("POST", `/api/users/${coach.userId}/follow`, { followingType: "coach" });
      return true;
    },
    onSuccess: (following) => {
      setIsFollowingCoach(!!following);
      toast({ title: following ? "Following coach" : "Unfollowed coach" });
    },
    onError: () => toast({ title: "Couldn't update follow", variant: "destructive" }),
  });

  const blockCoach = async () => {
    if (!coach?.userId) return;
    try {
      await apiRequest("POST", `/api/users/${coach.userId}/block`);
      toast({ title: "Coach blocked" });
    } catch {
      toast({ title: "Couldn't block user", variant: "destructive" });
    }
  };

  const reportCoach = async () => {
    if (!coach?.userId) return;
    try {
      await apiRequest("POST", "/api/reports", {
        contentType: "user",
        contentId: coach.userId,
        reason: "other",
        description: `Reported coach profile ${coachId}`,
      });
      toast({ title: "Report submitted" });
    } catch {
      toast({ title: "Couldn't submit report", variant: "destructive" });
    }
  };

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const y = scrollRef.current.scrollTop;
    setScrollY(y);
    setHeaderCollapsed(y > 280);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (!showQrModal || !coachId) return;
    const coachUrl = `${window.location.origin}${ROUTES.coach(coachId)}`;
    QRCode.toDataURL(coachUrl, { width: 300, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [showQrModal, coachId]);

  const selectTab = (next: Tab) => {
    setTab(next);
    if (!coachId) return;
    const base = ROUTES.coach(coachId);
    const path = next === "about" ? base : `${base}?tab=${next}`;
    setLocation(path, { replace: true });
  };

  const { data: coach, isLoading, isError, refetch } = useQuery<CoachWithProfile>({
    queryKey: ["coach-detail", coachId],
    queryFn: () => fetchCoach(coachId!),
    enabled: !!coachId,
  });

  const profilePreview = coach
    ? coach.profile ?? parseCoachProfile(coach.profileJson, coach, coach.user)
    : null;
  const sport = coach?.specialties?.[0] || coach?.user.sport || "Coach";
  const sportConfig = getSportConfig(sport);
  const accentColor = sportConfig.ringColor;

  const { data: availData } = useQuery<{
    weekly: Record<string, { enabled: boolean; ranges: { start: string; end: string }[] }>;
    slots?: string[];
    bookingMode?: string;
    sessionDurations?: number[];
  }>({
    queryKey: ["/api/coaches", coachId, "availability"],
    queryFn: async () => {
      const res = await fetch(`/api/coaches/${coachId}/availability`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!coachId,
  });

  const startChatMutation = useMutation({
    mutationFn: async () => startCoachChat(coachId!),
    onSuccess: () => {
      const peerId = coach?.user?.id;
      if (peerId) setLocation(`${ROUTES.messages}?userId=${encodeURIComponent(peerId)}`);
      toast({ title: "Chat started", description: "Opening messages…" });
    },
    onError: () => toast({ title: "Could not start chat", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !coach) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center max-w-sm">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {isError ? "Couldn't load coach" : "Coach not found"}
          </h2>
          <button
            type="button"
            onClick={() => (isError ? void refetch() : setLocation(ROUTES.coaches))}
            className="mt-4 px-6 py-2.5 rounded-full text-sm font-semibold text-white"
            style={{ background: accentColor }}
          >
            {isError ? "Retry" : "Browse coaches"}
          </button>
        </div>
      </div>
    );
  }

  const profile = coach.profile ?? parseCoachProfile(coach.profileJson, coach, coach.user);
  const hourlyNum = coach.hourlyRate ? parseFloat(coach.hourlyRate) : 0;
  const isOwnCoach = user?.id === coach.userId;
  const verificationStatus = coachVerificationStatus(coach);
  const openSlots = availData?.slots?.length ?? 0;
  const bookingMode = profile.bookingMode ?? (hourlyNum > 0 ? "hourly_slots" : "message_first");
  const canBookSlots = bookingMode === "hourly_slots" && hourlyNum > 0;
  const plans = profile.pricingPlans ?? [];
  const achievements = profile.achievements ?? [];
  const media = profile.media ?? [];
  const reviewCount = profile.reviewCount ?? 0;

  const tabs: { id: Tab; label: string }[] = [
    { id: "about", label: "About" },
    { id: "achievements", label: "Achievements" },
    { id: "media", label: "Media" },
    { id: "reviews", label: "Reviews" },
    { id: "book", label: "Book" },
  ];

  const openBooking = (plan?: CoachPricingPlan) => {
    if (plan?.period === "contact" || plan?.period === "month") {
      startChatMutation.mutate();
      toast({ title: "Message sent", description: "Ask the coach about this plan in chat." });
      return;
    }
    setSelectedPlan(plan ?? null);
    setBookingOpen(true);
  };

  const bgOpacity = Math.max(0, 1 - scrollY / 400);
  const heroParallax = scrollY * 0.4;
  const topColor = sportConfig.colors[0];

  const handleShare = async () => {
    if (!coachId) return;
    const url = `${window.location.origin}${ROUTES.coach(coachId)}`;
    const name = `${coach.user.firstName} ${coach.user.lastName}`.trim();
    const text = profile.tagline || `${name} · ${sport} coach`;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Share this link with friends." });
    } catch {
      toast({ title: "Could not share", variant: "destructive" });
    }
  };

  return (
    <div className="spotify-team-page">
      <div className="spotify-bg-layer" style={{ opacity: bgOpacity }}>
        <div className="spotify-bg-color" style={{ backgroundColor: topColor }} />
        <div className="spotify-bg-gradient-dark" />
      </div>

      <div
        className="spotify-top-bar"
        style={{
          background: headerCollapsed
            ? "color-mix(in srgb, var(--background) 85%, transparent)"
            : "transparent",
          backdropFilter: headerCollapsed ? "blur(20px)" : "none",
        }}
      >
        <button
          type="button"
          onClick={goBack}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-background/40 backdrop-blur-sm"
        >
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        {headerCollapsed && (
          <h2 className="text-foreground text-[15px] font-bold truncate flex-1 ml-3">
            {coach.user.firstName} {coach.user.lastName}
          </h2>
        )}
        {isOwnCoach ? (
          <button
            type="button"
            onClick={() => setLocation("/coach/profile")}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-background/40 backdrop-blur-sm ml-auto"
            aria-label="Edit profile"
          >
            <Settings size={16} className="text-foreground" />
          </button>
        ) : (
          <div className="flex-1" />
        )}
        <button
          type="button"
          className="w-8 h-8 rounded-full flex items-center justify-center bg-background/40 backdrop-blur-sm"
          onClick={() => setShowQrModal(true)}
          aria-label="Show coach QR code"
        >
          <QrCode size={16} className="text-foreground" />
        </button>
        <button
          type="button"
          className="w-8 h-8 rounded-full flex items-center justify-center bg-background/40 backdrop-blur-sm ml-2"
          onClick={() => void handleShare()}
          aria-label="Share coach profile"
        >
          <Share2 size={16} className="text-foreground" />
        </button>
      </div>

      <div className="spotify-content-layer" ref={scrollRef} onScroll={handleScroll}>
        <div className="spotify-hero" style={{ transform: `translateY(-${heroParallax}px)` }}>
          <CoachHeader
            coach={coach}
            profile={profile}
            sportConfig={sportConfig}
            accentColor={accentColor}
            openSlots={openSlots}
            reviewCount={reviewCount}
            isOwnCoach={isOwnCoach}
            canBookSlots={canBookSlots}
            chatPending={startChatMutation.isPending}
            verificationPending={verificationStatus === "pending"}
            onMessage={() => startChatMutation.mutate()}
            onBook={() => (canBookSlots ? openBooking() : startChatMutation.mutate())}
            onEdit={() => setLocation("/coach/profile")}
            onReviews={() => selectTab("reviews")}
            onFollow={isOwnCoach ? undefined : () => followCoachMutation.mutate()}
            isFollowing={isFollowingCoach}
            followPending={followCoachMutation.isPending}
          />
          {!isOwnCoach && (
            <div className="flex justify-center gap-5 mt-3 px-4">
              <button type="button" onClick={blockCoach} className="text-[11px] text-muted-foreground/80">
                Block
              </button>
              <button type="button" onClick={reportCoach} className="text-[11px] text-muted-foreground/80">
                Report
              </button>
            </div>
          )}
        </div>

        <nav className="spotify-tab-bar">
          <div className="flex gap-1 surna-h-scroll no-scrollbar px-4">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTab(t.id)}
                className={`px-4 py-3 text-[13px] font-medium whitespace-nowrap transition-all duration-200 relative ${
                  tab === t.id ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {t.label}
                {tab === t.id && (
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full"
                    style={{ background: "var(--surna-text)" }}
                  />
                )}
              </button>
            ))}
          </div>
        </nav>

        <div className="spotify-sections">
          {tab === "about" && (
            <CoachAboutTab
              coach={coach}
              profile={profile}
              accentColor={accentColor}
              availData={availData}
            />
          )}
          {tab === "achievements" && (
            <CoachAchievementsTab achievements={achievements} accentColor={accentColor} />
          )}
          {tab === "media" && <CoachMediaTab media={media} accentColor={accentColor} />}
          {tab === "reviews" && (
            <div className="glass-card !p-0 overflow-hidden">
              <Reviews userId={coach.userId} isOwnProfile={isOwnCoach} />
            </div>
          )}
          {tab === "book" && (
            <CoachBookTab
              profile={profile}
              plans={plans}
              hourlyNum={hourlyNum}
              bookingMode={bookingMode}
              canBookSlots={canBookSlots}
              openSlots={openSlots}
              accentColor={accentColor}
              onBook={openBooking}
              onMessage={() => startChatMutation.mutate()}
            />
          )}
        </div>
      </div>

      {coachId && canBookSlots ? (
        <CoachBookingModal
          open={bookingOpen}
          onClose={() => {
            setBookingOpen(false);
            setSelectedPlan(null);
          }}
          coachId={coachId}
          hourlyRate={hourlyNum}
          selectedPlan={selectedPlan}
        />
      ) : null}

      {showQrModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.65)" }}
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 bg-background border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-foreground">Coach QR Code</h3>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/40"
                aria-label="Close QR modal"
              >
                <X size={16} className="text-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Scan to open this coach profile and book a session.
            </p>
            <div className="rounded-xl bg-white p-3 flex items-center justify-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Coach profile QR code" className="w-64 h-64 object-contain" />
              ) : (
                <Loader2 className="w-6 h-6 animate-spin text-black" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CoachAboutTab({
  coach,
  profile,
  accentColor,
  availData,
}: {
  coach: CoachWithProfile;
  profile: ReturnType<typeof parseCoachProfile>;
  accentColor: string;
  availData?: {
    weekly: Record<string, { enabled: boolean; ranges: { start: string; end: string }[] }>;
  };
}) {
  return (
    <div className="space-y-4">
      {coach.bio ? (
        <div className="glass-card">
          <h3 className="text-[15px] font-semibold text-foreground mb-3">About</h3>
          <p className="text-[14px] leading-relaxed text-muted-foreground">{coach.bio}</p>
        </div>
      ) : null}

      {profile.teachingPhilosophy ? (
        <div className="glass-card">
          <h3 className="text-[15px] font-semibold text-foreground mb-3">Coaching philosophy</h3>
          <p className="text-[14px] leading-relaxed italic text-muted-foreground">
            &ldquo;{profile.teachingPhilosophy}&rdquo;
          </p>
        </div>
      ) : null}

      {(profile.sessionTypes?.length ?? coach.specialties?.length) ? (
        <div className="glass-card">
          <h3 className="text-[15px] font-semibold text-foreground mb-3">Session types</h3>
          <div className="flex flex-wrap gap-2">
            {(profile.sessionTypes ?? coach.specialties ?? []).map((s) => (
              <Chip key={s} label={s} accent={accentColor} />
            ))}
          </div>
        </div>
      ) : null}

      {coach.certifications?.length ? (
        <div className="glass-card">
          <h3 className="text-[15px] font-semibold text-foreground mb-3">Certifications</h3>
          <ul className="space-y-2">
            {coach.certifications.map((c) => (
              <li key={c} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                <GraduationCap size={14} className="shrink-0 mt-0.5" style={{ color: accentColor }} />
                {c}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {profile.languages?.length ? (
        <div className="glass-card">
          <h3 className="text-[15px] font-semibold text-foreground mb-3">Languages</h3>
          <div className="flex flex-wrap gap-3">
            {profile.languages.map((l) => (
              <span key={l} className="flex items-center gap-1 text-[13px] text-muted-foreground">
                <Globe size={12} /> {l}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {profile.maxStudents ? (
        <div className="glass-card">
          <h3 className="text-[15px] font-semibold text-foreground mb-3">Capacity</h3>
          <p className="text-[13px] flex items-center gap-2 text-muted-foreground">
            <Users size={14} /> Up to {profile.maxStudents} athletes per program
          </p>
        </div>
      ) : null}

      {availData?.weekly ? (
        <div className="glass-card">
          <h3 className="text-[15px] font-semibold text-foreground mb-2">Weekly availability</h3>
          <p className="text-[11px] text-muted-foreground mb-3">Highlighted days have bookable windows</p>
          <div className="flex gap-1.5">
            {weekOrder.map((k) => {
              const w = availData.weekly[k];
              const on = !!(w?.enabled && w?.ranges?.length);
              return (
                <div
                  key={k}
                  className="flex-1 rounded-xl py-2.5 text-center text-[10px] font-bold border"
                  style={{
                    background: on ? `${accentColor}33` : "transparent",
                    color: on ? "var(--foreground)" : "var(--muted-foreground)",
                    borderColor: on ? `${accentColor}55` : "var(--border)",
                  }}
                >
                  {weekShort[k]}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {profile.socialLinks?.length ? (
        <div className="glass-card">
          <h3 className="text-[15px] font-semibold text-foreground mb-3">Links</h3>
          <div className="flex flex-wrap gap-2">
            {profile.socialLinks.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-muted/40 text-foreground border border-border"
              >
                {l.platform} <Link2 size={11} />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {!coach.bio && !profile.teachingPhilosophy && !coach.certifications?.length ? (
        <div className="glass-card text-center py-8">
          <p className="text-[14px] text-muted-foreground">This coach hasn&apos;t added a bio yet.</p>
        </div>
      ) : null}
    </div>
  );
}

function CoachAchievementsTab({
  achievements,
  accentColor,
}: {
  achievements: NonNullable<ReturnType<typeof parseCoachProfile>["achievements"]>;
  accentColor: string;
}) {
  if (!achievements.length) {
    return (
      <div className="glass-card text-center py-12">
        <Award size={28} className="mx-auto mb-3 text-muted-foreground opacity-40" />
        <p className="text-[13px] text-muted-foreground">Achievements and milestones will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {achievements.map((a) => (
        <div key={a.id} className="glass-card !mb-0">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${accentColor}22` }}
            >
              <Award size={18} style={{ color: accentColor }} />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">{a.title}</p>
              {a.year ? (
                <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--surna-text-secondary)" }}>
                  {a.year}
                </p>
              ) : null}
              {a.description ? (
                <p className="text-[13px] mt-1 leading-relaxed text-muted-foreground">{a.description}</p>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CoachMediaTab({
  media,
  accentColor,
}: {
  media: NonNullable<ReturnType<typeof parseCoachProfile>["media"]>;
  accentColor: string;
}) {
  if (!media.length) {
    return (
      <div className="glass-card text-center py-12">
        <Play size={28} className="mx-auto mb-3 text-muted-foreground opacity-40" />
        <p className="text-[13px] text-muted-foreground">Training clips and demo videos will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {media.map((m) => (
        <div key={m.id} className="glass-card !p-0 overflow-hidden !mb-0">
          {m.type === "video" ? (
            <div className="aspect-video bg-black/40 flex items-center justify-center">
              {m.url.includes("youtube") || m.url.includes("youtu.be") ? (
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 p-6"
                >
                  <Play size={40} style={{ color: accentColor }} />
                  <span className="text-[13px] font-bold text-foreground">{m.title || "Watch video"}</span>
                </a>
              ) : (
                <video src={m.url} controls className="w-full h-full object-cover" poster={m.thumbnailUrl} />
              )}
            </div>
          ) : (
            <img src={m.url} alt={m.title || ""} className="w-full aspect-video object-cover" />
          )}
          {m.title ? <p className="px-4 py-3 text-[13px] font-semibold text-foreground">{m.title}</p> : null}
        </div>
      ))}
    </div>
  );
}

function CoachBookTab({
  profile,
  plans,
  hourlyNum,
  bookingMode,
  canBookSlots,
  openSlots,
  accentColor,
  onBook,
  onMessage,
}: {
  profile: ReturnType<typeof parseCoachProfile>;
  plans: CoachPricingPlan[];
  hourlyNum: number;
  bookingMode: string;
  canBookSlots: boolean;
  openSlots: number;
  accentColor: string;
  onBook: (plan?: CoachPricingPlan) => void;
  onMessage: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="glass-card">
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          {bookingMode === "message_first"
            ? "This coach prefers to discuss goals before booking. Send a message or pick a plan below."
            : "Choose how you want to train — pricing and formats are set by the coach."}
        </p>
      </div>

      {plans.length > 0 ? (
        plans.map((plan) => (
          <div
            key={plan.id}
            className="glass-card !mb-0 relative overflow-hidden"
            style={
              plan.highlighted
                ? { borderColor: `${accentColor}55`, background: `${accentColor}12` }
                : undefined
            }
          >
            {plan.highlighted ? (
              <span
                className="absolute top-4 right-4 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white"
                style={{ background: accentColor }}
              >
                Popular
              </span>
            ) : null}
            <p className="text-[16px] font-bold text-foreground mb-1">{plan.label}</p>
            <p className="text-[22px] font-extrabold mb-2" style={{ color: accentColor }}>
              {formatPlanPrice(plan)}
            </p>
            {plan.description ? (
              <p className="text-[13px] mb-3 leading-relaxed text-muted-foreground">{plan.description}</p>
            ) : null}
            {plan.sessionsIncluded ? (
              <p className="text-[11px] mb-3 flex items-center gap-1 text-muted-foreground">
                <Clock size={11} /> {plan.sessionsIncluded} sessions included
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => onBook(plan)}
              className="w-full py-2.5 rounded-full text-[13px] font-bold text-white active:scale-[0.98] transition-transform"
              style={{ background: accentColor }}
            >
              {plan.period === "contact" || plan.period === "month" ? "Message coach" : "Book this plan"}
            </button>
          </div>
        ))
      ) : (
        <div className="glass-card text-center">
          <p className="text-[14px] font-bold text-foreground mb-2">
            {hourlyNum > 0 ? `€${hourlyNum.toFixed(0)}/hour sessions` : "Custom pricing"}
          </p>
          <button
            type="button"
            onClick={() => (canBookSlots ? onBook() : onMessage())}
            className="px-6 py-2.5 rounded-full text-[13px] font-bold text-white"
            style={{ background: accentColor }}
          >
            {canBookSlots ? "Pick a time slot" : "Message to book"}
          </button>
        </div>
      )}

      {canBookSlots && openSlots > 0 ? (
        <p className="text-[12px] text-center text-muted-foreground">{openSlots} open slots in the next 2 weeks</p>
      ) : null}
    </div>
  );
}

function Chip({ label, accent }: { label: string; accent: string }) {
  return (
    <span
      className="px-3 py-1.5 rounded-full text-[12px] font-medium"
      style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}33` }}
    >
      {label}
    </span>
  );
}
