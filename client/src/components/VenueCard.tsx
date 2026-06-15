import { MapPin, Star } from "lucide-react";
import CardMenu from "./CardMenu";
import SpotifyPlaylistCard from "@/components/cards/SpotifyPlaylistCard";
import { useDiscoveryCardBg } from "@/hooks/useDiscoveryCardBg";

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

function getTodayHours(hours?: Record<string, string>): string | null {
  if (!hours) return null;
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const today = days[new Date().getDay()];
  return hours[today] || null;
}

export default function VenueCard({ place, onPreview, onNavigate, onSave, style }: VenueCardProps) {
  const photo = place.coverImageUrl || place.imageUrl || place.profileImageUrl;
  const thumb = place.profileImageUrl || photo;
  const primarySport = place.sports?.[0] || null;
  const cardBg = useDiscoveryCardBg(thumb || photo, primarySport);

  const rating = place.rating || (place.averageRating ? parseFloat(place.averageRating) : 0);
  const emoji = categoryEmoji[(place.category || place.kind || "other").toLowerCase()] || "📍";
  const todayHours = getTodayHours(place.hours as Record<string, string> | undefined);
  const location = place.address || [place.city, place.state].filter(Boolean).join(", ");
  const distanceLabel =
    place.distanceKm !== undefined
      ? place.distanceKm < 1
        ? `${Math.round(place.distanceKm * 1000)}m away`
        : `${place.distanceKm.toFixed(1)} km away`
      : null;

  const metaParts = [
    location,
    distanceLabel,
    rating > 0 ? `${rating.toFixed(1)}★${place.reviewsCount ? ` (${place.reviewsCount})` : ""}` : null,
    todayHours ? `Today ${todayHours}` : null,
    place.openNow !== undefined ? (place.openNow ? "Open now" : "Closed") : null,
    place.sports && place.sports.length > 0 ? place.sports.slice(0, 3).join(" · ") : null,
  ].filter(Boolean);

  return (
    <div style={style}>
      <SpotifyPlaylistCard
        title={place.name}
        subtitle={place.category || place.kind || "Venue"}
        meta={metaParts.join(" · ")}
        imageUrl={thumb || null}
        fallbackIcon={emoji}
        backgroundColor={cardBg}
        onCardClick={() => onPreview?.(place)}
        menu={<CardMenu inline onSave={() => onSave?.(place)} />}
        primaryAction={{
          label: "View venue",
          onClick: (e) => {
            e.stopPropagation();
            onPreview?.(place);
          },
        }}
        secondaryActions={
          onNavigate
            ? [
                {
                  icon: <MapPin size={15} />,
                  label: "Directions",
                  ariaLabel: "Get directions",
                  onClick: (e) => {
                    e.stopPropagation();
                    onNavigate(place);
                  },
                },
              ]
            : location
              ? [
                  {
                    icon: <Star size={15} />,
                    label: rating > 0 ? `${rating.toFixed(1)} stars` : "Venue",
                    ariaLabel: "Rating",
                    onClick: (e) => {
                      e.stopPropagation();
                      onPreview?.(place);
                    },
                  },
                ]
              : []
        }
      />
    </div>
  );
}
