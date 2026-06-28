import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { useEvent, useRSVP, useMyRSVPs } from "@/hooks/useEvents";
import { useSmartBack } from "@/lib/navigation";
import { useToast } from "@/hooks/use-toast";
import { isRouteSport } from "@/lib/eventRoutes";
import { isDemoEventId } from "@/lib/demoEvents";
import { fetchEventPeople, type ActivityPerson } from "@/lib/activityPeople";
import { ROUTES } from "@/navigation";
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  Flag,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  QrCode as QrCodeIcon,
  Share2,
  Users,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import { getSportConfig } from "@/components/TeamCard";
import { AvatarStack } from "@/components/people/AvatarStack";
import { EntityShareSheet } from "@/components/teams/EntityShareSheet";
import { EventHighlights } from "@/components/events/EventHighlights";
import { EventTicketCard, type EventTicketView } from "@/components/events/EventTicketCard";
import { EventTicketScanner } from "@/components/events/EventTicketScanner";
import { EventFeedSection } from "@/components/events/EventFeedSection";
import { AddToCalendarSheet } from "@/components/calendar/AddToCalendarSheet";
import { calendarInputFromApiEvent } from "@/lib/eventCalendar";
import { mapPath } from "@/lib/mapNavigation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { EntityEmptyState, EntitySectionTabs } from "@/components/entity";
import { extractDominantColor, getCachedColor } from "@/lib/extractColor";
import { useAuth } from "@/hooks/useAuth";
import EventHeader, { eventAccentColor } from "./components/EventHeader";
import EventFormatHero from "@/components/events/EventFormatHero";
import EventFormatBadge from "@/components/events/EventFormatBadge";
import {
  normalizeEventFormat,
  resolveEventLineupFromRow,
} from "@shared/eventFormats";

type TabType = "about" | "people" | "location" | "photos" | "feed" | "ticket";

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

function getPriceLabel(ev: Record<string, unknown>): string | null {
  const ticketPrice = ev.ticket_price ?? ev.ticketPrice ?? ev.price;
  if (ticketPrice != null && Number(ticketPrice) === 0) return "Free";
  if (ticketPrice != null && !Number.isNaN(Number(ticketPrice))) {
    return `€${Number(ticketPrice).toFixed(Number(ticketPrice) % 1 === 0 ? 0 : 2)}`;
  }
  const desc = String(ev.description || "").toLowerCase();
  const priceMatch = desc.match(/€(\d+(?:\.\d+)?)/) || desc.match(/\$(\d+(?:\.\d+)?)/);
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

export default function EventDetailsPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const goBack = useSmartBack({ fallback: "/?panel=events" });
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const id = params.id;
  const { data: evData, isLoading: loading } = useEvent(id);
  const ev = evData as any;
  const { user } = useAuth();
  const rsvpMutation = useRSVP(id || "");
  const { data: myRsvpsData } = useMyRSVPs();
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [ticket, setTicket] = useState<EventTicketView | null>(null);
  const [saved, setSaved] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showTicketScanner, setShowTicketScanner] = useState(false);
  const [showCalendarSheet, setShowCalendarSheet] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [eventQrUrl, setEventQrUrl] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("about");
  const [demoAttendees, setDemoAttendees] = useState<ActivityPerson[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!id || !isDemoEventId(id)) {
      setDemoAttendees([]);
      return;
    }
    let cancelled = false;
    void fetchEventPeople(id).then((list) => {
      if (!cancelled) setDemoAttendees(list);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

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
    if (!ev?.sport || !id) return;
    const fmt = normalizeEventFormat(ev.event_format ?? ev.eventFormat);
    if (fmt === "route" || isRouteSport(String(ev.sport))) {
      setLocation(ROUTES.eventRoute(id), { replace: true });
    }
  }, [ev?.sport, ev?.event_format, ev?.eventFormat, id, setLocation]);

  useEffect(() => {
    if (!coverUrl) return;
    extractDominantColor(coverUrl).then(setExtractedColor);
  }, [coverUrl]);

  useEffect(() => {
    if (!id || !myRsvpsData?.items) return;
    const mine = myRsvpsData.items.find((r: { event_id?: string }) => r.event_id === id);
    if (mine?.status) setRsvpStatus(mine.status);
  }, [id, myRsvpsData]);

  useEffect(() => {
    if (window.location.hash === "#attendees") setActiveTab("people");
    if (window.location.hash === "#scan") setShowTicketScanner(true);
  }, []);

  const isOrganizer =
    !!user?.id &&
    !!ev?.creator_id &&
    String(user.id) === String(ev.creator_id);

  const { data: myTicketData } = useQuery<{ ticket?: EventTicketView }>({
    queryKey: ["/api/events", id, "tickets", "mine"],
    enabled: !!id && !isDemoEventId(id) && rsvpStatus === "going" && !!user?.id,
  });

  useEffect(() => {
    if (myTicketData?.ticket) setTicket(myTicketData.ticket);
  }, [myTicketData]);

  const { data: eventPhotos = [] } = useQuery<Array<{ id: string; image_url: string; caption?: string | null }>>({
    queryKey: ["/api/events", id, "photos"],
    enabled: !!id && !isDemoEventId(id),
  });

  const realAttendees: ActivityPerson[] = useMemo(() => {
    const list = (ev?.attendees ?? []) as Array<{
      user_id?: string;
      status?: string;
      username?: string;
      first_name?: string;
      last_name?: string;
      profile_image_url?: string;
    }>;
    const fromApi = list
      .filter((a) => a.status === "going" || a.status === "interested")
      .map((a) => ({
        id: String(a.user_id ?? a.username ?? Math.random()),
        name: `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || a.username || "Athlete",
        username: a.username,
        avatarUrl: a.profile_image_url || undefined,
      }));
    return fromApi.length > 0 ? fromApi : demoAttendees;
  }, [ev?.attendees, demoAttendees]);

  const galleryPhotos = useMemo(() => {
    if (!ev) return [];
    const fromApi = eventPhotos.map((p) => ({ url: p.image_url, type: "image" as const }));
    if (fromApi.length > 0) return fromApi;
    return getEventMedia(ev, coverUrl);
  }, [eventPhotos, ev, coverUrl]);

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

  const handleShare = () => setShowShareSheet(true);

  const openEventChat = async () => {
    const chatGroupId = ev?.chat_group_id || ev?.chatGroupId;
    if (chatGroupId) {
      setLocation(`/messages?groupId=${encodeURIComponent(chatGroupId)}`);
      return;
    }
    if (!ev?.id || isDemoEventId(String(ev.id))) {
      toast({ title: "Chat unavailable", description: "Demo events don't have a live chat.", variant: "destructive" });
      return;
    }
    try {
      const group = (await apiRequest("POST", "/api/messenger/groups", {
        name: ev.title || "Event chat",
        description: `Event chat · ${ev.id}`,
        eventId: ev.id,
      })) as { id?: string };
      const gid = group?.id;
      if (gid) {
        await queryClient.invalidateQueries({ queryKey: ["/api/events", id] });
        setLocation(`/messages?groupId=${encodeURIComponent(gid)}`);
        return;
      }
    } catch {
      /* fall through */
    }
    toast({ title: "Chat not ready", description: "Try again in a moment after RSVPing.", variant: "destructive" });
  };

  const handleRsvp = (status: "going" | "interested" | "waitlist", issueTicket = false) => {
    if (navigator.vibrate) navigator.vibrate(10);
    localStorage.setItem("surna_meaningful_action_done", "1");
    rsvpMutation.mutate(
      { status, issueTicket: issueTicket || status === "going" },
      {
        onSuccess: (data: any) => {
          setRsvpStatus(status);
          if (data?.ticket?.code && data?.ticket?.scanToken) {
            setTicket({
              code: data.ticket.code,
              scanToken: data.ticket.scanToken,
              status: "valid",
            });
          }
          void queryClient.invalidateQueries({ queryKey: ["/api/events", id] });
          void queryClient.invalidateQueries({ queryKey: ["/api/events", id, "tickets", "mine"] });
          if (status === "going" && ev?.id && !isDemoEventId(String(ev.id))) {
            apiRequest("POST", "/api/posts", {
              content: `Attending ${ev.title}${ev.location ? ` at ${ev.location}` : ""}.`,
              eventId: ev.id,
              sport: ev.sport,
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
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: pageBg }}>
        <EntityEmptyState
          icon={Flag}
          title="Event not found"
          description="This event may have been removed or the link is invalid."
          actionLabel="Browse events"
          actionHref={ROUTES.events}
        />
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
  const eventFormat = normalizeEventFormat(ev.event_format ?? ev.eventFormat);
  const eventLineup = resolveEventLineupFromRow(ev);
  const sportConfig = getSportConfig(sport);
  const accentColor = eventAccentColor(extractedColor, sport);
  const creatorName = ev?.creator_first_name || ev?.creator_username || "Organizer";
  const attendeePreview = realAttendees.slice(0, 8);
  const rsvpLoading = rsvpMutation.isPending;
  const bgOpacity = Math.max(0, 1 - scrollY / 400);
  const hasTicket = rsvpStatus === "going" && !!ticket?.code && !!ticket.scanToken;

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
    { id: "feed", label: "Moments" },
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
            onClick={openEventChat}
            className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm"
            style={{ background: btnBg }}
            aria-label="Event chat"
          >
            <MessageCircle size={16} color={btnIcon} />
          </button>
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
        <EventFormatHero
          format={eventFormat}
          lineup={eventLineup}
          title={ev.title}
          accentColor={accentColor}
        />
        <EventHeader
          title={ev.title}
          sport={sport}
          eventFormat={eventFormat}
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

        <EventHighlights eventId={ev.id} eventTitle={ev.title} />

        <EntitySectionTabs
          tabs={tabs}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as TabType)}
          stickyTop="top-0"
          testIdPrefix="event-section"
        />

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

              {isOrganizer && !isDemoEventId(String(ev.id)) && (
                <button
                  type="button"
                  onClick={() => setShowTicketScanner(true)}
                  className="w-full p-4 rounded-2xl flex items-center justify-between gap-3 transition-all active:scale-[0.99]"
                  style={{ background: cardBg }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: `${accentColor}22` }}
                    >
                      <QrCodeIcon size={18} style={{ color: accentColor }} />
                    </div>
                    <div className="text-left">
                      <p className="text-[14px] font-semibold" style={{ color: textPrimary }}>
                        Scan tickets at door
                      </p>
                      <p className="text-[12px]" style={{ color: textSecondary }}>
                        One-time check-in · see who arrived
                      </p>
                    </div>
                  </div>
                  <span className="text-[13px] font-semibold" style={{ color: accentColor }}>
                    Open →
                  </span>
                </button>
              )}

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
            <div className="p-4 rounded-2xl" style={{ background: cardBg }} id="attendees">
              <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-4" style={{ color: textTertiary }}>
                <Users size={13} className="inline mr-1.5" />
                Who&apos;s going
              </h3>
              <div className="flex flex-col items-center gap-4 py-2">
                {attendeePreview.length > 0 ? (
                  <AvatarStack people={attendeePreview} max={8} size={40} overlap={12} />
                ) : null}
                <div className="text-center w-full">
                  <p className="text-[17px] font-bold" style={{ color: textPrimary }}>
                    {goingCount} going
                    {interestedCount > 0 && (
                      <span className="text-[15px] font-medium" style={{ color: textSecondary }}>
                        {" "}
                        · {interestedCount} interested
                      </span>
                    )}
                  </p>
                  {realAttendees.length > 0 && (
                    <div className="mt-4 space-y-2 text-left max-w-sm mx-auto">
                      {realAttendees.map((person) => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => setLocation(`/person/${person.id}`)}
                          className="w-full flex items-center gap-3 p-2 rounded-xl active:opacity-80"
                          style={{ background: btnBg }}
                        >
                          {person.avatarUrl ? (
                            <img src={person.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-muted/40" />
                          )}
                          <span className="text-[14px] font-medium" style={{ color: textPrimary }}>
                            {person.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
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

          {activeTab === "feed" && id ? <EventFeedSection eventId={id} /> : null}

          {activeTab === "photos" && (
            <>
              {galleryPhotos.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon size={32} className="mx-auto mb-3" style={{ color: textTertiary }} />
                  <p className="text-[14px]" style={{ color: textTertiary }}>
                    No photos yet
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-[2px]">
                  {galleryPhotos.map((item, i) => (
                    <div
                      key={`${item.url}-${i}`}
                      className="relative aspect-[4/5] overflow-hidden"
                      style={{ background: cardBg }}
                    >
                      {item.type === "video" ? (
                        <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                      ) : (
                        <img src={item.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "ticket" && hasTicket && ticket && (
            <EventTicketCard
              ticket={ticket}
              eventTitle={ev.title}
              accentColor={accentColor}
              cardBg={cardBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textTertiary={textTertiary}
            />
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
      <EntityShareSheet
        open={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        title={ev.title}
        path={`/events/${ev.id}`}
        shareText={`${ev.title}${ev.location ? ` · ${ev.location}` : ""}`}
      />

      <EventTicketScanner
        eventId={ev.id}
        eventTitle={ev.title}
        open={showTicketScanner}
        onClose={() => setShowTicketScanner(false)}
        accentColor={accentColor}
        pageBg={pageBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
      />
    </div>
  );
}
