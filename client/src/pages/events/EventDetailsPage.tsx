import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { useEvent, useRSVP } from "@/hooks/useEvents";
import { useSmartBack } from "@/lib/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  Flag,
  Image as ImageIcon,
  MapPin,
  Share2,
  Users,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import { getSportConfig } from "@/components/TeamCard";
import { demoPeopleForEntity } from "@/lib/activityPeople";
import { AvatarStack } from "@/components/people/AvatarStack";
import { AddToCalendarSheet } from "@/components/calendar/AddToCalendarSheet";
import { calendarInputFromApiEvent } from "@/lib/eventCalendar";
import { mapPath } from "@/lib/mapNavigation";
import { extractDominantColor, getCachedColor } from "@/lib/extractColor";
import EventHeader, { eventAccentColor } from "./components/EventHeader";

type TabType = "about" | "people" | "location" | "photos" | "ticket";

function formatShortWhen(dateStr: string, endStr?: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  let line = `${date} · ${time}`;
  if (endStr) {
    const end = new Date(endStr);
    if (!isNaN(end.getTime())) {
      line += ` – ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
    }
  }
  return line;
}

function getCountdownLabel(dateStr: string): string | null {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  if (diff < -1000 * 60 * 60 * 3) return null;
  if (diff < 0) return "Happening now";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `Starts in ${days}d ${hours}h`;
  if (hours > 0) return `Starts in ${hours}h ${mins}m`;
  return `Starts in ${mins}m`;
}

function getPriceLabel(ev: any): string | null {
  const desc = (ev.description || "").toLowerCase();
  const priceMatch = desc.match(/\$(\d+)/);
  if (priceMatch) return `€${priceMatch[1]}`;
  if (desc.includes("free entry") || desc.includes("free event") || desc.includes("no fee")) return "Free";
  return null;
}

const fallbackImages: Record<string, string> = {
  basketball: "/images/events/basketball-tournament.jpg",
  running: "/images/events/running-race.jpg",
  mma: "/images/events/mma-fight.jpg",
  tennis: "/images/events/tennis-social.jpg",
  crossfit: "/images/events/crossfit.jpg",
  swim: "/images/events/swimming.jpg",
  soccer: "/images/events/soccer.jpg",
  volleyball: "/images/events/volleyball.jpg",
  yoga: "/images/events/yoga.jpg",
};

function getFallbackImage(ev: any): string | null {
  const t = (ev.title || "").toLowerCase();
  for (const [kw, url] of Object.entries(fallbackImages)) {
    if (t.includes(kw)) return url;
  }
  return null;
}

function getEventMedia(ev: any, coverUrl: string | null): { url: string; type: "image" | "video" }[] {
  const seen = new Set<string>();
  const out: { url: string; type: "image" | "video" }[] = [];

  const add = (url: string | null | undefined, type: "image" | "video" = "image") => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push({ url, type });
  };

  add(coverUrl);
  const raw = ev.media ?? ev.gallery ?? ev.photos;
  if (Array.isArray(raw)) {
    raw.forEach((m: any) => {
      const url = typeof m === "string" ? m : m?.url || m?.imageUrl || m?.videoUrl;
      const type = m?.type === "video" || (url && /\.(mp4|webm|mov)/i.test(url)) ? "video" : "image";
      add(url, type);
    });
  }

  if (out.length === 0) {
    const t = (ev.title || "").toLowerCase();
    for (const [kw, url] of Object.entries(fallbackImages)) {
      if (t.includes(kw)) {
        add(url);
        break;
      }
    }
  }

  return out.slice(0, 12);
}

function QRCodeSVG({ code }: { code: string }) {
  const size = 120;
  const grid = 15;
  const cellSize = size / grid;
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = (hash << 5) - hash + code.charCodeAt(i);

  const cells: { x: number; y: number }[] = [];
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      const idx = r * grid + c;
      const borderArea = (r < 3 && c < 3) || (r < 3 && c >= grid - 3) || (r >= grid - 3 && c < 3);
      const borderOutline = (r < 3 && (c < 3 || c >= grid - 3)) || (r >= grid - 3 && c < 3);
      if (borderOutline || ((hash + idx * 7) % 3 === 0 && !borderArea)) {
        cells.push({ x: c * cellSize, y: r * cellSize });
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="white" rx={4} />
      {cells.map((cell, i) => (
        <rect key={i} x={cell.x + 0.5} y={cell.y + 0.5} width={cellSize - 1} height={cellSize - 1} fill="#111" rx={1} />
      ))}
    </svg>
  );
}

export default function EventDetailsPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const goBack = useSmartBack({ fallback: "/?panel=events" });
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const id = params.id;
  const { data: evData, isLoading: loading } = useEvent(id);
  const ev = evData as any;
  const rsvpMutation = useRSVP(id || "");
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showCalendarSheet, setShowCalendarSheet] = useState(false);
  const [eventQrUrl, setEventQrUrl] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("about");
  const { toast } = useToast();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const y = scrollRef.current.scrollTop;
    setScrollY(y);
    setHeaderCollapsed(y > 250);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const coverUrl =
    ev?.cover_url || ev?.cover_medium_url || ev?.imageUrl || (ev ? getFallbackImage(ev) : null);

  const [extractedColor, setExtractedColor] = useState<string | null>(
    coverUrl ? getCachedColor(coverUrl) : null,
  );

  useEffect(() => {
    if (!coverUrl) return;
    extractDominantColor(coverUrl).then(setExtractedColor);
  }, [coverUrl]);

  useEffect(() => {
    if (!showQrModal || !ev?.id) return;
    const url = `${window.location.origin}/events/${ev.id}`;
    QRCode.toDataURL(url, { width: 280, margin: 1 })
      .then(setEventQrUrl)
      .catch(() => setEventQrUrl(""));
  }, [showQrModal, ev?.id]);

  const pageBg = isDark ? "#000000" : "#ffffff";
  const textPrimary = isDark ? "#ffffff" : "#111111";
  const textSecondary = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";
  const textTertiary = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)";
  const cardBg = isDark ? "#121212" : "rgba(0,0,0,0.045)";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)";
  const headerBarBg = isDark ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.92)";
  const navBg = isDark ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.88)";
  const btnBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";
  const btnIcon = isDark ? "#ffffff" : "#111111";

  const handleShare = async () => {
    if (!ev) return;
    const url = `${window.location.origin}/events/${ev.id}`;
    const text = `${ev.title}${ev.location ? ` · ${ev.location}` : ""}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: ev.title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Share this link with friends." });
    } catch {
      toast({ title: "Could not share", variant: "destructive" });
    }
  };

  const handleRsvp = (status: "going" | "interested" | "waitlist", issueTicket = false) => {
    if (navigator.vibrate) navigator.vibrate(10);
    localStorage.setItem("surna_meaningful_action_done", "1");
    rsvpMutation.mutate(
      { status, issueTicket: issueTicket || status === "going" },
      {
        onSuccess: (data: any) => {
          setRsvpStatus(status);
          if (data?.ticket?.code) setTicketCode(data.ticket.code);
          if (status === "going") {
            fetch("/api/posts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                content: `Attending ${ev.title}${ev.location ? ` at ${ev.location}` : ""}.`,
                eventId: ev.id,
                sport: ev.sport,
              }),
            }).catch(() => {});
          }
        },
      },
    );
  };

  const openExternalMaps = () => {
    if (!ev?.location) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location)}`, "_blank");
  };

  const openSurnaMap = () => {
    if (!id) return;
    setLocation(mapPath({ type: "event", id }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: pageBg }}>
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{
            borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
            borderTopColor: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
          }}
        />
      </div>
    );
  }

  if (!ev) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: pageBg }}>
        <Flag size={40} className="mb-3 opacity-40" style={{ color: textSecondary }} />
        <p style={{ color: textSecondary }}>Event not found</p>
        <button
          type="button"
          onClick={() => setLocation("/events")}
          className="mt-4 px-5 py-2.5 rounded-full text-[13px] font-bold"
          style={{ background: btnBg, color: textPrimary }}
        >
          Browse events
        </button>
      </div>
    );
  }

  const startDate = ev.starts_at || ev.startDate;
  const endDate = ev.ends_at || ev.endDate;
  const whenLine = startDate ? formatShortWhen(startDate, endDate) : null;
  const countdownLabel = startDate ? getCountdownLabel(startDate) : null;
  const goingCount = ev.going_count || 0;
  const interestedCount = ev.interested_count || 0;
  const capacity = ev.capacity || 0;
  const spotsLeft = capacity > 0 ? Math.max(0, capacity - goingCount) : null;
  const isFull = spotsLeft === 0;
  const fillPercent = capacity > 0 ? Math.min((goingCount / capacity) * 100, 100) : 0;
  const priceLabel = getPriceLabel(ev);
  const needsTicket = priceLabel && priceLabel !== "Free";
  const sport = ev.sport || null;
  const sportConfig = getSportConfig(sport);
  const accentColor = eventAccentColor(extractedColor, sport);
  const creatorName = ev.creator_first_name || ev.creator_username || "Organizer";
  const attendeePreview = demoPeopleForEntity(String(ev.id), goingCount > 0 ? goingCount : undefined);
  const mediaItems = getEventMedia(ev, coverUrl);
  const rsvpLoading = rsvpMutation.isPending;
  const bgOpacity = Math.max(0, 1 - scrollY / 400);
  const hasTicket = rsvpStatus === "going" && !!ticketCode;

  const primaryCta = (() => {
    if (rsvpLoading) return "...";
    if (rsvpStatus === "going") return "Going";
    if (rsvpStatus === "waitlist") return "On waitlist";
    if (isFull) return "Join waitlist";
    if (needsTicket) return `Buy tickets · ${priceLabel}`;
    return "I'm going";
  })();

  const onPrimaryClick = () => {
    if (needsTicket && rsvpStatus !== "going") {
      handleRsvp(isFull ? "waitlist" : "going", true);
      return;
    }
    handleRsvp(isFull ? "waitlist" : "going", false);
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: "about", label: "About" },
    { id: "people", label: `People (${goingCount})` },
    { id: "location", label: "Location" },
    { id: "photos", label: "Photos" },
    ...(hasTicket ? [{ id: "ticket" as TabType, label: "Ticket" }] : []),
  ];

  return (
    <div className="place-profile-page" style={{ position: "fixed", inset: 0, background: pageBg }}>
      <div className="absolute inset-0 z-0" style={{ opacity: bgOpacity }}>
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="w-full h-[60%] object-cover"
            style={{ filter: "blur(40px) saturate(1.5)", transform: "scale(1.3)" }}
          />
        ) : (
          <div
            className="w-full h-[60%]"
            style={{
              background: `linear-gradient(135deg, ${sportConfig.colors[0]}88, ${sportConfig.colors[1]}88)`,
              filter: "blur(20px)",
              transform: "scale(1.2)",
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? `linear-gradient(180deg, ${accentColor}88 0%, #000000 70%)`
              : `linear-gradient(180deg, ${accentColor}44 0%, #ffffff 100%)`,
          }}
        />
      </div>

      <div
        className="absolute top-0 left-0 right-0 z-30 flex items-center px-4 h-14"
        style={{
          background: headerCollapsed ? headerBarBg : "transparent",
          backdropFilter: headerCollapsed ? "blur(20px)" : "none",
          transition: "all 0.3s ease",
        }}
      >
        <button
          type="button"
          onClick={goBack}
          className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm"
          style={{ background: btnBg }}
        >
          <ArrowLeft size={18} color={btnIcon} />
        </button>
        {headerCollapsed && (
          <h2 className="text-[15px] font-bold truncate flex-1 ml-3" style={{ color: textPrimary }}>
            {ev.title}
          </h2>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={handleShare}
            className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm"
            style={{ background: btnBg }}
            aria-label="Share"
          >
            <Share2 size={16} color={btnIcon} />
          </button>
          <button
            type="button"
            onClick={() => setSaved(!saved)}
            className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm"
            style={{ background: btnBg }}
            aria-label="Save"
          >
            <Bookmark size={16} color={btnIcon} fill={saved ? btnIcon : "none"} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="absolute inset-0 z-10 overflow-y-auto"
        style={{ paddingTop: "56px" }}
      >
        <EventHeader
          title={ev.title}
          sport={sport}
          sportEmoji={sportConfig.emoji}
          accentColor={accentColor}
          coverUrl={coverUrl}
          whenLine={whenLine}
          countdownLabel={countdownLabel}
          priceLabel={priceLabel}
          location={ev.location}
          goingCount={goingCount}
          interestedCount={interestedCount}
          capacity={capacity}
          spotsLeft={spotsLeft}
          isFull={isFull}
          fillPercent={fillPercent}
          attendeePreview={attendeePreview}
          rsvpStatus={rsvpStatus}
          rsvpLoading={rsvpLoading}
          needsTicket={!!needsTicket}
          primaryCta={primaryCta}
          onPrimaryRsvp={onPrimaryClick}
          onInterested={() => handleRsvp("interested")}
          onShare={handleShare}
          onCalendar={() => setShowCalendarSheet(true)}
          onMap={openSurnaMap}
          onQr={() => setShowQrModal(true)}
        />

        <nav
          className="sticky top-0 z-20 backdrop-blur-xl"
          style={{ background: navBg, borderBottom: `1px solid ${borderColor}` }}
        >
          <div className="flex gap-1 overflow-x-auto scrollbar-hide px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-3 text-[13px] font-semibold whitespace-nowrap transition-all duration-200 relative"
                style={{ color: activeTab === tab.id ? textPrimary : textTertiary }}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full"
                    style={{ background: accentColor }}
                  />
                )}
              </button>
            ))}
          </div>
        </nav>

        <div className="px-4 py-5 pb-32 space-y-5">
          {activeTab === "about" && (
            <>
              {ev.description && (
                <div className="p-4 rounded-2xl" style={{ background: cardBg }}>
                  <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-2" style={{ color: textTertiary }}>
                    About
                  </h3>
                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: textSecondary }}>
                    {ev.description}
                  </p>
                </div>
              )}

              {whenLine && (
                <div className="p-4 rounded-2xl" style={{ background: cardBg }}>
                  <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-3" style={{ color: textTertiary }}>
                    <Calendar size={13} className="inline mr-1.5" />
                    Date & time
                  </h3>
                  <p className="text-[14px] font-medium" style={{ color: textPrimary }}>
                    {whenLine}
                  </p>
                  {countdownLabel && (
                    <p className="text-[13px] mt-2" style={{ color: accentColor }}>
                      {countdownLabel}
                    </p>
                  )}
                </div>
              )}

              <div className="p-4 rounded-2xl flex items-center justify-between gap-3" style={{ background: cardBg }}>
                <div>
                  <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-1" style={{ color: textTertiary }}>
                    Organizer
                  </h3>
                  <p className="text-[15px] font-semibold" style={{ color: textPrimary }}>
                    {creatorName}
                  </p>
                </div>
                {ev.creator_id && (
                  <button
                    type="button"
                    className="text-[13px] font-semibold px-3 py-1.5 rounded-full shrink-0"
                    style={{ background: btnBg, color: textSecondary }}
                    onClick={() => setLocation(`/person/${ev.creator_id}`)}
                  >
                    Profile
                  </button>
                )}
              </div>

              {ev.place_id && (
                <button
                  type="button"
                  onClick={() => setLocation(`/places/${ev.place_id}`)}
                  className="w-full p-4 rounded-2xl text-left transition-all active:scale-[0.99]"
                  style={{ background: cardBg }}
                >
                  <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-1" style={{ color: textTertiary }}>
                    Venue
                  </h3>
                  <p className="text-[14px] font-semibold" style={{ color: accentColor }}>
                    View venue details →
                  </p>
                </button>
              )}
            </>
          )}

          {activeTab === "people" && (
            <div className="p-4 rounded-2xl" style={{ background: cardBg }}>
              <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-4" style={{ color: textTertiary }}>
                <Users size={13} className="inline mr-1.5" />
                Who&apos;s going
              </h3>
              <div className="flex flex-col items-center gap-4 py-2">
                <AvatarStack people={attendeePreview} max={8} size={40} overlap={12} />
                <div className="text-center">
                  <p className="text-[17px] font-bold" style={{ color: textPrimary }}>
                    {goingCount} going
                    {interestedCount > 0 && (
                      <span className="text-[15px] font-medium" style={{ color: textSecondary }}>
                        {" "}
                        · {interestedCount} interested
                      </span>
                    )}
                  </p>
                  {capacity > 0 && (
                    <>
                      <p className="text-[13px] mt-1" style={{ color: textTertiary }}>
                        {capacity} max capacity
                      </p>
                      <div
                        className="w-full max-w-xs h-2 rounded-full overflow-hidden mt-3 mx-auto"
                        style={{ background: borderColor }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${fillPercent}%`, background: accentColor }}
                        />
                      </div>
                      {spotsLeft !== null && (
                        <p className="text-[12px] mt-2" style={{ color: textSecondary }}>
                          {isFull ? "Full — join the waitlist" : `${spotsLeft} spots left`}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "location" && (
            <>
              {ev.location ? (
                <div className="p-4 rounded-2xl" style={{ background: cardBg }}>
                  <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-3" style={{ color: textTertiary }}>
                    <MapPin size={13} className="inline mr-1.5" />
                    Location
                  </h3>
                  <p className="text-[14px] leading-relaxed mb-4" style={{ color: textSecondary }}>
                    {ev.location}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={openSurnaMap}
                      className="text-[13px] font-bold px-4 py-2.5 rounded-full transition-all active:scale-[0.96]"
                      style={{ background: accentColor, color: "#fff" }}
                    >
                      On SURNA Map
                    </button>
                    <button
                      type="button"
                      onClick={openExternalMaps}
                      className="text-[13px] font-semibold px-4 py-2.5 rounded-full transition-all active:scale-[0.96]"
                      style={{ background: btnBg, color: textSecondary, border: `1px solid ${borderColor}` }}
                    >
                      Directions
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <MapPin size={32} className="mx-auto mb-3" style={{ color: textTertiary }} />
                  <p className="text-[14px]" style={{ color: textTertiary }}>
                    No location listed
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === "photos" && (
            <>
              {mediaItems.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon size={32} className="mx-auto mb-3" style={{ color: textTertiary }} />
                  <p className="text-[14px]" style={{ color: textTertiary }}>
                    No photos yet
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {mediaItems.map((item, i) => (
                    <div
                      key={`${item.url}-${i}`}
                      className="relative aspect-square rounded-2xl overflow-hidden"
                      style={{ background: cardBg }}
                    >
                      {item.type === "video" ? (
                        <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                      ) : (
                        <img src={item.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      )}
                      {item.type === "video" && (
                        <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-white">
                          Video
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "ticket" && hasTicket && (
            <div className="p-5 rounded-2xl" style={{ background: cardBg }}>
              <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-4" style={{ color: textTertiary }}>
                Your ticket
              </h3>
              <div className="flex items-center gap-4">
                <div className="rounded-xl shrink-0 bg-white p-1.5">
                  <QRCodeSVG code={ticketCode!} />
                </div>
                <div>
                  <p className="text-xl font-black tracking-wider" style={{ color: textPrimary }}>
                    {ticketCode}
                  </p>
                  <p className="text-[13px] mt-1" style={{ color: textSecondary }}>
                    Scan at the door
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AddToCalendarSheet
        open={showCalendarSheet}
        onClose={() => setShowCalendarSheet(false)}
        event={calendarInputFromApiEvent(ev)}
      />

      {showQrModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/65"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 border"
            style={{ background: pageBg, borderColor }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: textPrimary }}>
                Share event
              </h3>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: btnBg }}
              >
                <X size={16} color={btnIcon} />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: textSecondary }}>
              Scan to open this event on SURNA
            </p>
            {eventQrUrl ? (
              <img src={eventQrUrl} alt="Event QR code" className="w-full max-w-[280px] mx-auto rounded-xl" />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-sm" style={{ color: textTertiary }}>
                Loading QR…
              </div>
            )}
            <p className="text-center text-[13px] mt-4 truncate" style={{ color: textSecondary }}>
              {ev.title}
            </p>
            <button
              type="button"
              onClick={handleShare}
              className="w-full mt-4 h-11 rounded-full font-semibold"
              style={{ background: accentColor, color: "#fff" }}
            >
              Copy link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
