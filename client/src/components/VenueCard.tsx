import { useState, useEffect } from "react";
import { Star, MapPin, Clock, Users, Phone } from "lucide-react";
import CardMenu from "./CardMenu";
import { extractDominantColor, getCachedColor } from "@/lib/extractColor";
import { useTheme } from "@/contexts/ThemeContext";
import { deriveModernSources } from "@/lib/imageSources";
import { venueCardBg } from "@/lib/sportColors";

interface VenueCardProps {
  place: {
    id: string;
    name: string;
    category?: string;
    kind?: "gym" | "field" | "court" | string;
    coords?: { lat: number; lng: number };
    sports?: string[];
    rating?: number;
    averageRating?: string;
    reviewsCount?: number;
    priceRange?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    openNow?: boolean;
    distanceKm?: number;
    imageUrl?: string;
    coverImageUrl?: string;
    profileImageUrl?: string;
    followersCount?: number;
    amenities?: string[];
    hours?: Record<string, string>;
    bio?: string;
    description?: string;
    pricing?: Record<string, string> | null;
  };
  onPreview?: (place?: VenueCardProps["place"]) => void;
  onNavigate?: (place?: VenueCardProps["place"]) => void;
  onSave?: (place?: VenueCardProps["place"]) => void;
  style?: React.CSSProperties;
}

const categoryEmoji: Record<string, string> = {
  gym: "🏋️",
  field: "⚽",
  court: "🏀",
  pool: "🏊",
  track: "🏃",
  studio: "🧘",
  arena: "🏟️",
  rink: "🏒",
  other: "📍",
};

const amenityIcons: Record<string, string> = {
  parking: "🅿️",
  showers: "🚿",
  equipment: "🏋️",
  wifi: "📶",
  lockers: "🔒",
  cafe: "☕",
  sauna: "♨️",
  "air conditioning": "❄️",
};

function getTodayHours(hours?: Record<string, string>): string | null {
  if (!hours) return null;
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const today = days[new Date().getDay()];
  return hours[today] || null;
}

export default function VenueCard({ place, onPreview, onNavigate, onSave, style }: VenueCardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const photo = place.coverImageUrl || place.imageUrl || place.profileImageUrl;
  const [dominantColor, setDominantColor] = useState<string | null>(
    photo ? getCachedColor(photo) : null,
  );

  useEffect(() => {
    if (!photo) return;
    extractDominantColor(photo).then(setDominantColor);
  }, [photo]);

  const hasPhoto = !!photo;
  const fallbackBg = venueCardBg(place, theme as "light" | "dark");
  const cardBg = hasPhoto && dominantColor ? dominantColor : fallbackBg;

  const cardIsDark = isDark || hasPhoto;
  const textPrimary = cardIsDark ? "#ffffff" : "#111111";
  const textSecondary = cardIsDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)";
  const textTertiary = cardIsDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)";
  const surfaceLight = cardIsDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)";
  const surfaceFaint = cardIsDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
  const overlayColor = hasPhoto && dominantColor
    ? `${dominantColor}55`
    : "rgba(0,0,0,0.35)";

  const rating = place.rating || (place.averageRating ? parseFloat(place.averageRating) : 0);
  const emoji = categoryEmoji[(place.category || place.kind || "other").toLowerCase()] || "📍";
  const todayHours = getTodayHours(place.hours as Record<string, string> | undefined);
  const location = place.address || [place.city, place.state].filter(Boolean).join(", ");

  return (
    <div
      className="place-card-v2 relative overflow-hidden cursor-pointer active:scale-[0.97] transition-transform duration-200"
      style={{ ...style, background: cardBg }}
      onClick={() => onPreview?.(place)}
    >
      {hasPhoto && (
        <>
          {(() => {
            const modern = deriveModernSources(photo);
            const img = (
              <img
                src={photo}
                alt={place.name}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: "blur(2px) saturate(1.1)", transform: "scale(1.05)" }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            );
            return modern ? (
              <picture>
                {modern.avif && <source type="image/avif" srcSet={modern.avif} />}
                {modern.webp && <source type="image/webp" srcSet={modern.webp} />}
                {img}
              </picture>
            ) : (
              img
            );
          })()}
          <div className="absolute inset-0" style={{ background: overlayColor }} />
        </>
      )}

      <CardMenu onSave={() => onSave?.(place)} />

      <div className="relative z-[2] p-5">
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shrink-0 overflow-hidden"
            style={{
              background: surfaceLight,
              backdropFilter: "blur(8px)",
            }}
          >
            {place.profileImageUrl ? (
              (() => {
                const modern = deriveModernSources(place.profileImageUrl);
                const img = (
                  <img
                    src={place.profileImageUrl}
                    alt={place.name}
                    className="w-full h-full object-cover"
                  />
                );
                return modern ? (
                  <picture>
                    {modern.avif && <source type="image/avif" srcSet={modern.avif} />}
                    {modern.webp && <source type="image/webp" srcSet={modern.webp} />}
                    {img}
                  </picture>
                ) : (
                  img
                );
              })()
            ) : (
              emoji
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-[16px] font-bold truncate" style={{ color: textPrimary }}>
                {place.name}
              </h3>
            </div>

            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm"
                style={{ background: surfaceLight, color: textSecondary }}
              >
                {place.category || place.kind || "Venue"}
              </span>
              {rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  <span className="text-[12px] font-bold" style={{ color: textPrimary }}>
                    {rating.toFixed(1)}
                  </span>
                  {place.reviewsCount ? (
                    <span className="text-[11px]" style={{ color: textTertiary }}>
                      ({place.reviewsCount})
                    </span>
                  ) : null}
                </span>
              )}
              {place.openNow !== undefined && (
                <span
                  className={`text-[11px] font-semibold ${place.openNow ? "text-emerald-500" : "text-red-500"}`}
                >
                  {place.openNow ? "Open" : "Closed"}
                </span>
              )}
            </div>

            {location && (
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin size={11} className="shrink-0" style={{ color: textTertiary }} />
                <span className="text-[12px] truncate" style={{ color: textSecondary }}>
                  {location}
                </span>
                {place.distanceKm !== undefined && (
                  <span className="text-[11px] shrink-0" style={{ color: textTertiary }}>
                    {place.distanceKm < 1
                      ? `${Math.round(place.distanceKm * 1000)}m`
                      : `${place.distanceKm.toFixed(1)}km`}
                  </span>
                )}
              </div>
            )}

            {place.phone && (
              <div className="flex items-center gap-1.5">
                <Phone size={11} className="shrink-0" style={{ color: textTertiary }} />
                <span className="text-[12px]" style={{ color: textSecondary }}>
                  {place.phone}
                </span>
              </div>
            )}
          </div>
        </div>

        {todayHours && (
          <div
            className="flex items-center gap-1.5 mt-3 px-3 py-2 rounded-xl backdrop-blur-sm"
            style={{ background: surfaceLight }}
          >
            <Clock size={12} style={{ color: textSecondary }} />
            <span className="text-[11px]" style={{ color: textSecondary }}>
              Today:
            </span>
            <span className="text-[12px] font-medium" style={{ color: textPrimary }}>
              {todayHours}
            </span>
          </div>
        )}

        {place.pricing && typeof place.pricing === "object" && Object.keys(place.pricing).length > 0 && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {Object.entries(place.pricing)
              .slice(0, 2)
              .map(([key, val]) => (
                <span
                  key={key}
                  className="px-2.5 py-1 rounded-full text-[10px] font-semibold backdrop-blur-sm"
                  style={{ background: surfaceLight, color: textSecondary }}
                >
                  {key}: {String(val)}
                </span>
              ))}
          </div>
        )}

        {place.sports && place.sports.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {place.sports.slice(0, 4).map((s, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold backdrop-blur-sm"
                style={{ background: surfaceLight, color: textSecondary }}
              >
                {s}
              </span>
            ))}
            {place.sports.length > 4 && (
              <span className="text-[10px]" style={{ color: textTertiary }}>
                +{place.sports.length - 4}
              </span>
            )}
          </div>
        )}

        {place.amenities && place.amenities.length > 0 && (
          <div className="flex items-center gap-1 mt-2">
            {place.amenities.slice(0, 5).map((a, i) => (
              <span key={i} className="text-[13px]" title={a}>
                {amenityIcons[a.toLowerCase()] || "✓"}
              </span>
            ))}
            {place.amenities.length > 5 && (
              <span className="text-[10px] ml-1" style={{ color: textTertiary }}>
                +{place.amenities.length - 5}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mt-4">
          <button
            className="flex-1 h-9 rounded-full text-[13px] font-bold transition-all duration-200 active:scale-[0.96] border-none"
            style={{
              background: cardIsDark ? "#ffffff" : "#111111",
              color: cardIsDark ? "#000000" : "#ffffff",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onPreview?.(place);
            }}
          >
            View Details
          </button>
          {place.followersCount !== undefined && (
            <div
              className="flex items-center gap-1 px-3 h-9 rounded-full backdrop-blur-sm"
              style={{ background: surfaceLight }}
            >
              <Users size={12} style={{ color: textSecondary }} />
              <span className="text-[12px] font-medium" style={{ color: textSecondary }}>
                {place.followersCount}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
