import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { apiRequest } from "@/lib/queryClient";
import { extractDominantColor, getCachedColor } from "@/lib/extractColor";
import { deriveModernSources } from "@/lib/imageSources";
import QRCode from "qrcode";
import {
  ArrowLeft, Heart, Share2, Star, MapPin, Phone, Mail, Globe, Clock, Calendar,
  ThumbsUp, CheckCircle2, Download, X,
} from "lucide-react";
import type { Place, PlaceReview, PlacePhoto, PlaceBooking } from "@shared/schema";
import { useSmartBack } from "@/lib/navigation";

type TabType = 'about' | 'reviews' | 'photos' | 'book';

export default function PlaceProfile() {
  const [, params] = useRoute("/places/:id");
  const [, setLocation] = useLocation();
  const goBack = useSmartBack({ fallback: "/?panel=venues" });
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const placeId = params?.id;

  const [activeTab, setActiveTab] = useState<TabType>("about");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, content: "" });
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<PlaceBooking | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState({ bookingType: "session", title: "", startTime: "", endTime: "" });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const y = scrollRef.current.scrollTop;
      setScrollY(y);
      setHeaderCollapsed(y > 250);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll, { passive: true });
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const { data: place, isLoading } = useQuery<Place>({
    queryKey: ["/api/places", placeId],
    enabled: !!placeId,
  });

  const { data: reviews = [] } = useQuery<PlaceReview[]>({
    queryKey: ["/api/places", placeId, "reviews"],
    enabled: !!placeId && activeTab === "reviews",
  });

  const { data: photos = [] } = useQuery<PlacePhoto[]>({
    queryKey: ["/api/places", placeId, "photos"],
    enabled: !!placeId && activeTab === "photos",
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
  const coverModernSources = placeAny?.coverImageMediumWebpUrl || placeAny?.coverImageMediumAvifUrl
    ? { webp: placeAny.coverImageMediumWebpUrl,
        avif: placeAny.coverImageMediumAvifUrl }
    : undefined;
  const [extractedColor, setExtractedColor] = useState<string | null>(
    coverPhoto ? getCachedColor(coverPhoto) : null
  );

  useEffect(() => {
    if (!coverPhoto) return;
    extractDominantColor(coverPhoto).then(setExtractedColor);
  }, [coverPhoto]);

  const accentColor = extractedColor || "#8b2635";

  const pageBg = isDark ? "#000000" : "#ffffff";
  const textPrimary = isDark ? "#ffffff" : "#111111";
  const textSecondary = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";
  const textTertiary = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)";
  const cardBg = isDark ? "#121212" : "rgba(0,0,0,0.045)";
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
      const response = await apiRequest("POST", `/api/places/${placeId}/follow`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/places", placeId] });
      toast({ title: "Updated!", description: "Follow status updated" });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (data: any) => {
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
      toast({ title: "Booking requested!", description: "The owner will review your request" });
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
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2" style={{ color: textPrimary }}>Place Not Found</h2>
          <p className="text-sm" style={{ color: textSecondary }}>The place you're looking for doesn't exist.</p>
          <button onClick={goBack} className="mt-4 px-6 py-2 rounded-full text-sm font-semibold"
            style={{ background: chipBg, color: textPrimary }}>
            Back to Places
          </button>
        </div>
      </div>
    );
  }

  const rating = parseFloat(place.averageRating || "0");
  const hours = place.hours as Record<string, string> | null;
  const bgOpacity = Math.max(0, 1 - scrollY / 400);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'about', label: 'About' },
    { id: 'reviews', label: `Reviews (${place.reviewsCount || 0})` },
    { id: 'photos', label: 'Photos' },
    { id: 'book', label: 'Book' },
  ];

  return (
    <div className="place-profile-page" style={{ position: 'fixed', inset: 0, background: pageBg }}>
      <div className="absolute inset-0 z-0" style={{ opacity: bgOpacity }}>
        {coverPhoto && (() => {
          // Detail surface — use the explicit `_medium` modern variants from
          // the serializer when available, otherwise derive from the cover URL.
          const modern = coverModernSources ?? deriveModernSources(coverPhoto);
          const img = (
            <img src={coverPhoto} alt="" className="w-full h-[60%] object-cover"
              style={{ filter: "blur(40px) saturate(1.5)", transform: "scale(1.3)" }} />
          );
          return modern ? (
            <picture>
              {modern.avif && <source type="image/avif" srcSet={modern.avif} />}
              {modern.webp && <source type="image/webp" srcSet={modern.webp} />}
              {img}
            </picture>
          ) : img;
        })()}
        <div className="absolute inset-0" style={{
          background: isDark
            ? `linear-gradient(180deg, ${accentColor}88 0%, #000000 70%)`
            : `linear-gradient(180deg, ${accentColor}44 0%, #ffffff 100%)`
        }} />
      </div>

      <div className="absolute top-0 left-0 right-0 z-30 flex items-center px-4 h-14"
        style={{
          background: headerCollapsed ? headerBarBg : 'transparent',
          backdropFilter: headerCollapsed ? 'blur(20px)' : 'none',
          transition: 'all 0.3s ease',
        }}>
        <button onClick={goBack}
          className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm"
          style={{ background: btnBg }}>
          <ArrowLeft size={18} color={btnIcon} />
        </button>
        {headerCollapsed && (
          <h2 className="text-[15px] font-bold truncate flex-1 ml-3" style={{ color: textPrimary }}>{place.name}</h2>
        )}
        <button className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm ml-auto"
          style={{ background: btnBg }}>
          <Share2 size={16} color={btnIcon} />
        </button>
      </div>

      <div className="absolute inset-0 z-10 overflow-y-auto" ref={scrollRef} onScroll={handleScroll}
        style={{ paddingTop: '56px' }}>

        <div className="flex flex-col items-center text-center px-6 pt-8 pb-6">
          <div className="w-28 h-28 rounded-3xl overflow-hidden mb-5 shadow-2xl"
            style={{ boxShadow: `0 16px 48px ${accentColor}44` }}>
            {profilePhoto ? (() => {
              const modern = (placeAny.profileImageMediumWebpUrl || placeAny.profileImageMediumAvifUrl)
                ? { webp: placeAny.profileImageMediumWebpUrl as string | undefined,
                    avif: placeAny.profileImageMediumAvifUrl as string | undefined }
                : deriveModernSources(profilePhoto);
              const img = <img src={profilePhoto} alt={place.name} className="w-full h-full object-cover" />;
              return modern ? (
                <picture>
                  {modern.avif && <source type="image/avif" srcSet={modern.avif} />}
                  {modern.webp && <source type="image/webp" srcSet={modern.webp} />}
                  {img}
                </picture>
              ) : img;
            })() : coverPhoto ? (() => {
              const modern = deriveModernSources(coverPhoto);
              const img = <img src={coverPhoto} alt={place.name} className="w-full h-full object-cover" />;
              return modern ? (
                <picture>
                  {modern.avif && <source type="image/avif" srcSet={modern.avif} />}
                  {modern.webp && <source type="image/webp" srcSet={modern.webp} />}
                  {img}
                </picture>
              ) : img;
            })() : (
              <div className="w-full h-full flex items-center justify-center text-4xl" style={{ background: accentColor }}>
                <MapPin size={40} style={{ color: '#ffffff', opacity: 0.8 }} />
              </div>
            )}
          </div>

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

          <div className="flex items-center gap-6 mb-5 px-6 py-3 rounded-2xl backdrop-blur-sm"
            style={{ background: cardBg }}>
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                <p className="text-[17px] font-bold" style={{ color: textPrimary }}>{rating > 0 ? rating.toFixed(1) : '—'}</p>
              </div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: textTertiary }}>Rating</p>
            </div>
            <div className="w-px h-8" style={{ background: borderColor }} />
            <div className="text-center">
              <p className="text-[17px] font-bold" style={{ color: textPrimary }}>{place.followersCount || 0}</p>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: textTertiary }}>Followers</p>
            </div>
            <div className="w-px h-8" style={{ background: borderColor }} />
            <div className="text-center">
              <p className="text-[17px] font-bold" style={{ color: textPrimary }}>{place.reviewsCount || 0}</p>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: textTertiary }}>Reviews</p>
            </div>
            <div className="w-px h-8" style={{ background: borderColor }} />
            <div className="text-center">
              <p className="text-[17px] font-bold" style={{ color: textPrimary }}>{place.bookingsCount || 0}</p>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: textTertiary }}>Bookings</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full max-w-sm">
            <button onClick={() => setShowBookingModal(true)}
              className="flex-1 h-12 rounded-full text-[14px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.96]"
              style={{
                background: accentColor, color: '#fff',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                boxShadow: `0 8px 24px ${accentColor}44`,
              }}>
              <Calendar size={16} /> Book Now
            </button>
            <button onClick={() => followMutation.mutate()}
              className="h-12 px-5 rounded-full text-[13px] font-semibold flex items-center gap-2 transition-all active:scale-[0.96]"
              style={{
                background: chipBg, backdropFilter: 'blur(12px)',
                color: textSecondary, border: `1px solid ${borderColor}`,
              }}>
              <Heart size={15} /> Follow
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

        <nav className="sticky top-0 z-20 backdrop-blur-xl" style={{ background: navBg, borderBottom: `1px solid ${borderColor}` }}>
          <div className="flex gap-1 overflow-x-auto scrollbar-hide px-4">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="px-4 py-3 text-[13px] font-semibold whitespace-nowrap transition-all duration-200 relative"
                style={{ color: activeTab === tab.id ? textPrimary : textTertiary }}>
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full"
                    style={{ background: accentColor }} />
                )}
              </button>
            ))}
          </div>
        </nav>

        <div className="px-4 py-5 pb-32 space-y-5">
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
                      onClick={() => setSelectedPhoto(photo.imageUrl)}>
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
            <div className="space-y-4">
              <div className="p-5 rounded-2xl text-center" style={{ background: cardBg }}>
                <Calendar size={32} className="mx-auto mb-3" style={{ color: accentColor }} />
                <h3 className="text-[16px] font-bold mb-1" style={{ color: textPrimary }}>Book a Session</h3>
                <p className="text-[13px] mb-4" style={{ color: textTertiary }}>Reserve your spot at {place.name}</p>
                <button onClick={() => setShowBookingModal(true)}
                  className="w-full h-11 rounded-full text-[14px] font-bold transition-all active:scale-[0.96]"
                  style={{ background: accentColor, color: '#fff' }}>
                  Request Booking
                </button>
              </div>

              {(() => {
                const p = place.pricing as Record<string, string> | null;
                if (!p || typeof p !== 'object') return null;
                const entries = Object.entries(p);
                if (entries.length === 0) return null;
                return (
                  <div className="p-4 rounded-2xl" style={{ background: cardBg }}>
                    <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-3" style={{ color: textTertiary }}>Pricing</h3>
                    {entries.map(([key, val]) => (
                      <div key={key} className="flex justify-between text-[13px] py-1.5">
                        <span style={{ color: textSecondary }}>{key}</span>
                        <span className="font-medium" style={{ color: textPrimary }}>{String(val)}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {hours && Object.keys(hours).length > 0 && (
                <div className="p-4 rounded-2xl" style={{ background: cardBg }}>
                  <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-3" style={{ color: textTertiary }}>
                    <Clock size={13} className="inline mr-1.5" />Available Times
                  </h3>
                  <div className="space-y-1">
                    {Object.entries(hours).map(([day, h]) => {
                      const isToday = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()] === day.toLowerCase();
                      return (
                        <div key={day} className="flex justify-between text-[13px] px-3 py-1.5 rounded-lg"
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

              {place.phone && (
                <div className="p-4 rounded-2xl" style={{ background: cardBg }}>
                  <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-3" style={{ color: textTertiary }}>Contact to Book</h3>
                  <a href={`tel:${place.phone}`} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                    style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                    <Phone size={16} style={{ color: accentColor }} />
                    <span className="text-[13px] font-medium" style={{ color: accentColor }}>{place.phone}</span>
                  </a>
                </div>
              )}
            </div>
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
            <DialogTitle style={{ color: textPrimary }}>Request Booking</DialogTitle>
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
            <button onClick={() => bookingMutation.mutate(bookingData)} disabled={bookingMutation.isPending}
              className="w-full h-11 rounded-full text-[14px] font-bold" style={{ background: accentColor, color: '#fff' }}>
              {bookingMutation.isPending ? "Requesting..." : "Request Booking"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmationModal} onOpenChange={setShowConfirmationModal}>
        <DialogContent style={{ background: modalBg, borderColor: modalBorder }}>
          <DialogHeader>
            <DialogTitle style={{ color: textPrimary }}>Booking Confirmed!</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <CheckCircle2 size={48} style={{ color: accentColor }} className="mx-auto" />
            <p className="text-[14px]" style={{ color: textSecondary }}>Your booking request has been submitted</p>
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
    </div>
  );
}
