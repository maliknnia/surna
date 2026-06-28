import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { apiRequest } from "@/lib/queryClient";
import { deriveModernSources } from "@/lib/imageSources";
import { PlacePhotoCarousel } from "@/components/places/PlacePhotoCarousel";
import { PlaceBookingPanel, type PlaceBookingPayload } from "@/components/places/PlaceBookingPanel";
import { useAdaptivePhotoTheme } from "@/hooks/useAdaptivePhotoTheme";
import QRCode from "qrcode";
import {
  ArrowLeft, Heart, Share2, Star, MapPin, Phone, Mail, Globe, Clock, Calendar,
  ThumbsUp, CheckCircle2, Download, X,
} from "lucide-react";
import type { PlaceBookingMode } from "@shared/placeBooking";
import type { Place, PlaceReview, PlacePhoto, PlaceBooking } from "@shared/schema";
import { usePlace } from "@/hooks/usePlaces";
import { isDemoPlaceId, normalizeDemoPlaceId } from "@/lib/demoPlaces";
import { PlaceFeedSection } from "@/components/places/PlaceFeedSection";
import { mapPath } from "@/lib/mapNavigation";
import { EntityEmptyState, EntitySectionTabs, EntityStatRow } from "@/components/entity";
import { EntityShareSheet } from "@/components/teams/EntityShareSheet";
import { ROUTES } from "@/navigation";

import { useSmartBack } from "@/lib/navigation";

type TabType = 'feed' | 'about' | 'reviews' | 'photos' | 'book';

export default function PlaceProfile() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const goBack = useSmartBack({ fallback: "/?panel=venues" });
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const placeId = params?.id ? normalizeDemoPlaceId(params.id) : undefined;
  const isDemo = placeId ? isDemoPlaceId(placeId) : false;

  const [activeTab, setActiveTab] = useState<TabType>("feed");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, content: "" });
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<PlaceBooking | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState({ bookingType: "session", title: "", startTime: "", endTime: "" });
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const y = scrollRef.current.scrollTop;
      setScrollY(y);
      setHeaderCollapsed(y > 320);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll, { passive: true });
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const { data: place, isLoading } = usePlace(placeId);

  const { data: reviews = [] } = useQuery<PlaceReview[]>({
    queryKey: ["/api/places", placeId, "reviews"],
    enabled: !!placeId && !isDemo && activeTab === "reviews",
  });

  const { data: photos = [] } = useQuery<PlacePhoto[]>({
    queryKey: ["/api/places", placeId, "photos"],
    enabled: !!placeId && !isDemo,
  });

  // Place profile is a detail surface — prefer the larger `_medium` cover/
  // profile variants from the serializer when present so the hero header
  // crops sharply, falling back to the original URL for legacy places.
  // The serializer attaches these alongside the base `place` row; declared
  // here as an extension type since the DB schema doesn't model them.
  type PlaceVariants = Place & {
    coverImageMediumUrl?: string;
    coverImageMediumWebpUrl?: string;
    coverImageMediumAvifUrl?: string;
    profileImageMediumUrl?: string;
    profileImageMediumWebpUrl?: string;
    profileImageMediumAvifUrl?: string;
  };
  const placeAny = place as PlaceVariants | undefined;
  const coverPhoto = placeAny?.coverImageMediumUrl
    || placeAny?.coverImageUrl
    || placeAny?.profileImageMediumUrl
    || placeAny?.profileImageUrl;
  const profilePhoto = placeAny?.profileImageMediumUrl || placeAny?.profileImageUrl;

  const heroImages = useMemo(() => {
    const urls: string[] = [];
    const sorted = [...photos].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    for (const photo of sorted) {
      if (photo.imageUrl && !urls.includes(photo.imageUrl)) urls.push(photo.imageUrl);
    }
    if (coverPhoto && !urls.includes(coverPhoto)) urls.unshift(coverPhoto);
    if (profilePhoto && !urls.includes(profilePhoto)) urls.push(profilePhoto);
    return urls;
  }, [photos, coverPhoto, profilePhoto]);

  useEffect(() => {
    setPhotoIndex(0);
  }, [placeId]);

  useEffect(() => {
    if (photoIndex >= heroImages.length && heroImages.length > 0) {
      setPhotoIndex(0);
    }
  }, [heroImages.length, photoIndex]);

  const themePhoto = heroImages[photoIndex] ?? heroImages[0] ?? coverPhoto ?? profilePhoto ?? null;
  const { accentColor, pageBg, bleedBg } = useAdaptivePhotoTheme(themePhoto, isDark);
  const textPrimary = isDark ? "#ffffff" : "#111111";
  const textSecondary = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";
  const textTertiary = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)";
  const cardBg = isDark ? `${accentColor}14` : `${accentColor}0d`;
  const chipBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)";
  const headerBarBg = isDark ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.92)";
  const navBg = isDark ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.88)";
  const modalBg = isDark ? "#121212" : "#ffffff";
  const modalBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const inputBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.15)";
  const btnBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";
  const btnIcon = isDark ? "#ffffff" : "#111111";
  const verifiedColor = isDark ? "#60a5fa" : "#1d4ed8";

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isDemo) return { following: true };
      const response = await apiRequest("POST", `/api/places/${placeId}/follow`, {});
      return response.json();
    },
    onSuccess: () => {
      if (isDemo) {
        toast({ title: "Following!", description: "You'll see updates from this venue" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["place", placeId] });
      toast({ title: "Updated!", description: "Follow status updated" });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isDemo) return { ok: true };
      const response = await apiRequest("POST", `/api/places/${placeId}/reviews`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/places", placeId, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/places", placeId] });
      setShowReviewModal(false);
      setReviewData({ rating: 5, content: "" });
      toast({ title: "Review posted!", description: "Thank you for your feedback" });
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isDemo) {
        const isSlot = data.bookingType === "slot";
        return {
          id: "demo-booking",
          placeId,
          title: data.title || "Session",
          startTime: data.startTime,
          endTime: data.endTime,
          status: isSlot ? "confirmed" : "pending",
        } as PlaceBooking;
      }
      const response = await apiRequest("POST", `/api/places/${placeId}/bookings`, data);
      return response.json();
    },
    onSuccess: async (booking: PlaceBooking) => {
      setShowBookingModal(false);
      setConfirmedBooking(booking);
      try {
        const qrUrl = await QRCode.toDataURL(JSON.stringify({
          bookingId: booking.id, placeId: booking.placeId, title: booking.title, startTime: booking.startTime,
        }), { width: 300, margin: 2, color: { dark: "#000000", light: "#FFFFFF" } });
        setQrCodeUrl(qrUrl);
      } catch {}
      setShowConfirmationModal(true);
      setBookingData({ bookingType: "session", title: "", startTime: "", endTime: "" });
      const confirmed = booking.status === "confirmed";
      toast({
        title: confirmed ? "Slot booked!" : "Booking requested!",
        description: confirmed ? "You're confirmed for this time" : "The owner will review your request",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: pageBg }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)', borderTopColor: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }} />
      </div>
    );
  }

  if (!place) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: pageBg }}>
        <EntityEmptyState
          icon={MapPin}
          title="Venue not found"
          description="This venue may have been removed or the link is invalid."
          actionLabel="Browse venues"
          actionHref={ROUTES.places}
        />
      </div>
    );
  }

  const rating = parseFloat(place.averageRating || "0");
  const hours = place.hours as Record<string, string> | null;
  const bookingMode = ((place as Place & { bookingMode?: string }).bookingMode ?? "request") as PlaceBookingMode;
  const acceptsOnlineBooking = bookingMode !== "none";

  const bookingTheme = { accentColor, cardBg, textPrimary, textSecondary, textTertiary, borderColor, isDark };

  const handleBookPayload = (payload: PlaceBookingPayload) => {
    bookingMutation.mutate(payload);
  };

  const handleBookNow = () => {
    setActiveTab("book");
    if (bookingMode === "request" || bookingMode === "membership") {
      setShowBookingModal(true);
    }
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'feed', label: 'Updates' },
    { id: 'about', label: 'About' },
    { id: 'reviews', label: `Reviews (${place.reviewsCount || 0})` },
    { id: 'photos', label: 'Photos' },
    { id: 'book', label: 'Book' },
  ];

  const handleShare = () => setShowShareSheet(true);

  return (
    <div className="place-profile-page min-h-screen relative" style={{ background: pageBg }}>
      <div className="absolute inset-x-0 top-0 h-[70vh] pointer-events-none z-0" style={{ background: bleedBg }} />

      <div ref={scrollRef} className="min-h-screen overflow-y-auto pb-32" onScroll={handleScroll}>
        <div className="relative">
          <div className="absolute top-0 left-0 right-0 z-30 flex items-center px-4 h-14">
            <button onClick={goBack}
              className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm"
              style={{ background: btnBg }}>
              <ArrowLeft size={18} color={btnIcon} />
            </button>
            {headerCollapsed && (
              <h2 className="text-[15px] font-bold truncate flex-1 ml-3 drop-shadow-sm" style={{ color: "#fff" }}>{place.name}</h2>
            )}
            <button onClick={handleShare}
              className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm ml-auto"
              style={{ background: btnBg }}>
              <Share2 size={16} color={btnIcon} />
            </button>
          </div>

          {heroImages.length > 0 ? (
            <PlacePhotoCarousel
              images={heroImages}
              activeIndex={photoIndex}
              onActiveIndexChange={setPhotoIndex}
              alt={place.name}
            />
          ) : (
            <div
              className="w-full flex items-center justify-center"
              style={{ aspectRatio: "3 / 4", maxHeight: "62vh", background: accentColor }}
            >
              <MapPin size={48} style={{ color: "rgba(255,255,255,0.7)" }} />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center text-center px-6 pt-5 pb-6">
          <h1 className="text-[26px] font-extrabold leading-tight mb-1" style={{ color: textPrimary }}>{place.name}</h1>

          <div className="flex items-center gap-2 mb-4 flex-wrap justify-center">
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider"
              style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}40` }}>
              {place.category}
            </span>
            {place.city && (
              <span className="flex items-center gap-1 text-[12px]" style={{ color: textTertiary }}>
                <MapPin size={11} /> {place.city}{place.state ? `, ${place.state}` : ''}
              </span>
            )}
            {place.isVerified && (
              <CheckCircle2 size={16} style={{ color: verifiedColor }} />
            )}
          </div>

          <EntityStatRow
            stats={[
              { value: rating > 0 ? rating.toFixed(1) : "—", label: "rating" },
              { value: place.followersCount || 0, label: "followers" },
              { value: place.reviewsCount || 0, label: "reviews" },
              { value: place.bookingsCount || 0, label: "bookings" },
            ]}
            onStatClick={(label) => {
              if (label === "reviews") setActiveTab("reviews");
              if (label === "bookings") setActiveTab("book");
            }}
          />

          <div className="flex items-center gap-2.5 w-full max-w-sm">
            {acceptsOnlineBooking ? (
              <button onClick={handleBookNow}
                className="flex-1 h-12 rounded-full text-[14px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.96]"
                style={{
                  background: accentColor, color: '#fff',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  boxShadow: `0 8px 24px ${accentColor}44`,
                }}>
                <Calendar size={16} /> {bookingMode === "slots" ? "Book slot" : "Book now"}
              </button>
            ) : (
              <button onClick={() => setActiveTab("book")}
                className="flex-1 h-12 rounded-full text-[14px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.96]"
                style={{
                  background: accentColor, color: '#fff',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  boxShadow: `0 8px 24px ${accentColor}44`,
                }}>
                <Clock size={16} /> Hours
              </button>
            )}
            <button onClick={() => followMutation.mutate()}
              className="h-12 px-5 rounded-full text-[13px] font-semibold flex items-center gap-2 transition-all active:scale-[0.96]"
              style={{
                background: chipBg, backdropFilter: 'blur(12px)',
                color: textSecondary, border: `1px solid ${borderColor}`,
              }}>
              <Heart size={15} /> Follow
            </button>
            <button onClick={() => setLocation(mapPath({ type: "place", id: placeId! }))}
              className="h-12 w-12 rounded-full flex items-center justify-center transition-all active:scale-[0.96]"
              style={{ background: chipBg, border: `1px solid ${borderColor}` }}
              aria-label="View on map">
              <MapPin size={16} style={{ color: textSecondary }} />
            </button>
          </div>

          {place.sports && place.sports.length > 0 && (
            <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
              {place.sports.map((s, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-[11px] font-medium"
                  style={{ background: chipBg, color: textSecondary }}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        <EntitySectionTabs
          tabs={tabs}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as TabType)}
          stickyTop="top-0"
          testIdPrefix="place-section"
        />

        <div className="px-4 py-5 pb-32 space-y-5">
          {activeTab === 'feed' && placeId && (
            <PlaceFeedSection placeId={placeId} />
          )}

          {activeTab === 'about' && (
            <>
              {(place.bio || place.description) && (
                <div className="p-4 rounded-2xl" style={{ background: cardBg }}>
                  <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-2" style={{ color: textTertiary }}>About</h3>
                  <p className="text-[14px] leading-relaxed" style={{ color: textSecondary }}>{place.bio || place.description}</p>
                </div>
              )}

              {hours && Object.keys(hours).length > 0 && (
                <div className="p-4 rounded-2xl" style={{ background: cardBg }}>
                  <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-3" style={{ color: textTertiary }}>
                    <Clock size={13} className="inline mr-1.5" />Hours & Availability
                  </h3>
                  <div className="space-y-1">
                    {Object.entries(hours).map(([day, h]) => {
                      const isToday = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()] === day.toLowerCase();
                      return (
                        <div key={day} className="flex justify-between text-[13px] px-3 py-2 rounded-lg"
                          style={{ background: isToday ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') : 'transparent' }}>
                          <span className="capitalize" style={{
                            color: isToday ? textPrimary : textTertiary,
                            fontWeight: isToday ? 600 : 400
                          }}>
                            {isToday ? `📅 ${day} (Today)` : day}
                          </span>
                          <span style={{
                            color: isToday ? accentColor : textSecondary,
                            fontWeight: isToday ? 600 : 500
                          }}>{h}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {place.amenities && place.amenities.length > 0 && (
                <div className="p-4 rounded-2xl" style={{ background: cardBg }}>
                  <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-3" style={{ color: textTertiary }}>Amenities</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {place.amenities.map((a) => (
                      <div key={a} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                        style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                        <CheckCircle2 size={14} style={{ color: accentColor }} />
                        <span className="text-[13px] capitalize" style={{ color: textSecondary }}>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-2xl" style={{ background: cardBg }}>
                <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-3" style={{ color: textTertiary }}>Contact & Location</h3>
                <div className="space-y-3">
                  {place.address && (
                    <div className="flex items-start gap-3">
                      <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: textTertiary }} />
                      <span className="text-[13px]" style={{ color: textSecondary }}>
                        {place.address}{place.city ? `, ${place.city}` : ''}{place.state ? `, ${place.state}` : ''} {place.zipCode || ''}
                      </span>
                    </div>
                  )}
                  {place.phone && (
                    <a href={`tel:${place.phone}`} className="flex items-center gap-3">
                      <Phone size={16} className="shrink-0" style={{ color: textTertiary }} />
                      <span className="text-[13px]" style={{ color: accentColor }}>{place.phone}</span>
                    </a>
                  )}
                  {place.email && (
                    <a href={`mailto:${place.email}`} className="flex items-center gap-3">
                      <Mail size={16} className="shrink-0" style={{ color: textTertiary }} />
                      <span className="text-[13px]" style={{ color: accentColor }}>{place.email}</span>
                    </a>
                  )}
                  {place.website && (
                    <a href={place.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                      <Globe size={16} className="shrink-0" style={{ color: textTertiary }} />
                      <span className="text-[13px] underline" style={{ color: accentColor }}>
                        {place.website}
                      </span>
                    </a>
                  )}
                </div>
              </div>

              {(() => {
                const pricing = place.pricing as Record<string, string> | null;
                if (!pricing || typeof pricing !== 'object') return null;
                const entries = Object.entries(pricing);
                if (entries.length === 0) return null;
                return (
                  <div className="p-4 rounded-2xl" style={{ background: cardBg }}>
                    <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-3" style={{ color: textTertiary }}>Pricing</h3>
                    <div className="space-y-1">
                      {entries.map(([key, val]) => (
                        <div key={key} className="flex justify-between text-[13px] px-3 py-2 rounded-lg"
                          style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                          <span style={{ color: textSecondary }}>{key}</span>
                          <span className="font-semibold" style={{ color: textPrimary }}>{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {activeTab === 'reviews' && (
            <>
              <button onClick={() => setShowReviewModal(true)}
                className="w-full h-11 rounded-full text-[13px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.96]"
                style={{ background: accentColor, color: '#fff' }}>
                <Star size={15} /> Write a Review
              </button>
              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <Star size={32} className="mx-auto mb-3" style={{ color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }} />
                  <p className="text-[14px]" style={{ color: textTertiary }}>No reviews yet. Be the first!</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="p-4 rounded-2xl" style={{ background: cardBg }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} size={14} className={s <= review.rating ? "fill-amber-400 text-amber-400" : ""}
                            style={s > review.rating ? { color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' } : {}} />
                        ))}
                      </div>
                      <span className="text-[11px]" style={{ color: textTertiary }}>
                        {new Date(review.createdAt || "").toLocaleDateString()}
                      </span>
                    </div>
                    {review.content && <p className="text-[13px] leading-relaxed" style={{ color: textSecondary }}>{review.content}</p>}
                    <button className="flex items-center gap-1 mt-2 text-[11px]" style={{ color: textTertiary }}>
                      <ThumbsUp size={12} /> Helpful ({review.helpfulCount || 0})
                    </button>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'photos' && (
            photos.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[14px]" style={{ color: textTertiary }}>No photos yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {photos.map((photo) => {
                  const modern = deriveModernSources(photo.imageUrl);
                  const img = <img src={photo.imageUrl} alt={photo.caption || ""} className="w-full h-full object-cover" />;
                  return (
                    <div key={photo.id} className="aspect-square rounded-xl overflow-hidden cursor-pointer"
                      onClick={() => {
                        const idx = heroImages.indexOf(photo.imageUrl);
                        if (idx >= 0) setPhotoIndex(idx);
                        setSelectedPhoto(photo.imageUrl);
                      }}>
                      {modern ? (
                        <picture>
                          {modern.avif && <source type="image/avif" srcSet={modern.avif} />}
                          {modern.webp && <source type="image/webp" srcSet={modern.webp} />}
                          {img}
                        </picture>
                      ) : img}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {activeTab === 'book' && (
            <PlaceBookingPanel
              placeId={placeId!}
              placeName={place.name}
              bookingMode={bookingMode}
              slotDurationMinutes={place.slotDurationMinutes}
              slotPrice={place.slotPrice}
              hours={hours}
              phone={place.phone}
              pricing={place.pricing as Record<string, unknown> | null}
              isDemo={isDemo}
              isBooking={bookingMutation.isPending}
              theme={bookingTheme}
              onBook={handleBookPayload}
              onRequestModal={() => setShowBookingModal(true)}
            />
          )}
        </div>
      </div>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-lg p-1" style={{ background: modalBg, borderColor: modalBorder }}>
          {(() => {
            const modern = deriveModernSources(selectedPhoto);
            const img = <img src={selectedPhoto || ""} alt="" className="w-full h-auto rounded-lg" />;
            return modern ? (
              <picture>
                {modern.avif && <source type="image/avif" srcSet={modern.avif} />}
                {modern.webp && <source type="image/webp" srcSet={modern.webp} />}
                {img}
              </picture>
            ) : img;
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent style={{ background: modalBg, borderColor: modalBorder }}>
          <DialogHeader>
            <DialogTitle style={{ color: textPrimary }}>Write a Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label style={{ color: textSecondary }}>Rating</Label>
              <div className="flex gap-2 mt-2">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} size={28} className={`cursor-pointer ${s <= reviewData.rating ? "fill-amber-400 text-amber-400" : ""}`}
                    style={s > reviewData.rating ? { color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' } : {}}
                    onClick={() => setReviewData({ ...reviewData, rating: s })} />
                ))}
              </div>
            </div>
            <div>
              <Label style={{ color: textSecondary }}>Your Review</Label>
              <Textarea value={reviewData.content} onChange={(e) => setReviewData({ ...reviewData, content: e.target.value })}
                placeholder="Share your experience..." rows={4}
                className="mt-1" style={{ background: inputBg, borderColor: inputBorder, color: textPrimary }} />
            </div>
            <button onClick={() => reviewMutation.mutate(reviewData)} disabled={reviewMutation.isPending}
              className="w-full h-11 rounded-full text-[14px] font-bold" style={{ background: accentColor, color: '#fff' }}>
              {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent style={{ background: modalBg, borderColor: modalBorder }}>
          <DialogHeader>
            <DialogTitle style={{ color: textPrimary }}>
              {bookingMode === "membership" ? "Membership enquiry" : "Request booking"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label style={{ color: textSecondary }}>Type</Label>
              <Input value={bookingData.bookingType} onChange={(e) => setBookingData({ ...bookingData, bookingType: e.target.value })}
                placeholder="e.g. session, court, class"
                className="mt-1" style={{ background: inputBg, borderColor: inputBorder, color: textPrimary }} />
            </div>
            <div>
              <Label style={{ color: textSecondary }}>Title</Label>
              <Input value={bookingData.title} onChange={(e) => setBookingData({ ...bookingData, title: e.target.value })}
                placeholder="e.g. Tennis Court Booking"
                className="mt-1" style={{ background: inputBg, borderColor: inputBorder, color: textPrimary }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label style={{ color: textSecondary }}>Start</Label>
                <Input type="datetime-local" value={bookingData.startTime}
                  onChange={(e) => setBookingData({ ...bookingData, startTime: e.target.value })}
                  className="mt-1" style={{ background: inputBg, borderColor: inputBorder, color: textPrimary }} />
              </div>
              <div>
                <Label style={{ color: textSecondary }}>End</Label>
                <Input type="datetime-local" value={bookingData.endTime}
                  onChange={(e) => setBookingData({ ...bookingData, endTime: e.target.value })}
                  className="mt-1" style={{ background: inputBg, borderColor: inputBorder, color: textPrimary }} />
              </div>
            </div>
            <button onClick={() => bookingMutation.mutate({
              ...bookingData,
              bookingType: bookingMode === "membership" ? "membership" : bookingData.bookingType,
            })} disabled={bookingMutation.isPending}
              className="w-full h-11 rounded-full text-[14px] font-bold" style={{ background: accentColor, color: '#fff' }}>
              {bookingMutation.isPending ? "Sending…" : bookingMode === "membership" ? "Send enquiry" : "Request booking"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmationModal} onOpenChange={setShowConfirmationModal}>
        <DialogContent style={{ background: modalBg, borderColor: modalBorder }}>
          <DialogHeader>
            <DialogTitle style={{ color: textPrimary }}>
              {confirmedBooking?.status === "confirmed" ? "Booking confirmed!" : "Request sent!"}
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <CheckCircle2 size={48} style={{ color: accentColor }} className="mx-auto" />
            <p className="text-[14px]" style={{ color: textSecondary }}>
              {confirmedBooking?.status === "confirmed"
                ? "Your slot is confirmed — show the QR code at check-in."
                : "Your booking request has been submitted"}
            </p>
            {confirmedBooking && (
              <div className="p-3 rounded-xl text-left text-[13px] space-y-1" style={{ background: cardBg }}>
                <p className="font-medium" style={{ color: textPrimary }}>{confirmedBooking.title}</p>
                <p style={{ color: textTertiary }}>{new Date(confirmedBooking.startTime).toLocaleString()}</p>
              </div>
            )}
            {qrCodeUrl && (
              <div className="space-y-2">
                <img src={qrCodeUrl} alt="Booking QR" className="mx-auto w-40 h-40 rounded-xl" />
                <button onClick={() => {
                  const link = document.createElement("a");
                  link.href = qrCodeUrl;
                  link.download = `booking-${confirmedBooking?.id}-qr.png`;
                  link.click();
                }} className="flex items-center gap-2 mx-auto text-[12px]" style={{ color: textTertiary }}>
                  <Download size={14} /> Save QR Code
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <EntityShareSheet
        open={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        title={place.name}
        path={`/places/${placeId}`}
        shareText={`${place.name}${place.city ? ` · ${place.city}` : ""}`}
      />
    </div>
  );
}
