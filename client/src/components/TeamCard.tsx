import { useState, useEffect } from "react";
import { CardAttendeeStrip } from "@/components/people/CardAttendeeStrip";
import type { Team } from "@shared/schema";
import CardMenu from "./CardMenu";
import { sportCardBg } from "@/lib/sportColors";
import { useTheme } from "@/contexts/ThemeContext";
import { extractDominantColor, getCachedColor } from "@/lib/extractColor";
import { calculateDistance } from "@/lib/geo";
import { demoPeopleForEntity } from "@/lib/activityPeople";
import { ActivityPeopleSheet } from "@/components/people/ActivityPeopleSheet";

interface TeamCardProps {
  team: Team;
  onViewDetails: (teamId: string) => void;
  onJoinTeam: (teamId: string) => void;
  showJoinButton?: boolean;
  compact?: boolean;
}

const sportConfig: Record<string, { emoji: string; colors: [string, string]; ringColor: string }> = {
  boxing: { emoji: "🥊", colors: ["#FF6B4B", "#FF6B4B"], ringColor: "#FF6B4B" },
  mma: { emoji: "🥋", colors: ["#FF6B4B", "#FF6B4B"], ringColor: "#FF6B4B" },
  baseball: { emoji: "⚾", colors: ["#4A90D9", "#4A90D9"], ringColor: "#4A90D9" },
  volleyball: { emoji: "🏐", colors: ["#F8E71C", "#F8E71C"], ringColor: "#F8E71C" },
  tennis: { emoji: "🎾", colors: ["#B8E986", "#B8E986"], ringColor: "#B8E986" },
  football: { emoji: "⚽", colors: ["#7ED321", "#7ED321"], ringColor: "#7ED321" },
  soccer: { emoji: "⚽", colors: ["#7ED321", "#7ED321"], ringColor: "#7ED321" },
  basketball: { emoji: "🏀", colors: ["#F5A623", "#F5A623"], ringColor: "#F5A623" },
  swimming: { emoji: "🏊", colors: ["#50E3C2", "#50E3C2"], ringColor: "#50E3C2" },
  rugby: { emoji: "🏉", colors: ["#8D6E63", "#8D6E63"], ringColor: "#8D6E63" },
  cricket: { emoji: "🏏", colors: ["#7ED321", "#7ED321"], ringColor: "#7ED321" },
  hockey: { emoji: "🏒", colors: ["#78909C", "#78909C"], ringColor: "#78909C" },
  golf: { emoji: "⛳", colors: ["#7ED321", "#7ED321"], ringColor: "#7ED321" },
  running: { emoji: "🏃", colors: ["#FF6B4B", "#FF6B4B"], ringColor: "#FF6B4B" },
  cycling: { emoji: "🚴", colors: ["#000000", "#000000"], ringColor: "#000000" },
  wrestling: { emoji: "🤼", colors: ["#F5A623", "#F5A623"], ringColor: "#F5A623" },
  gaa: { emoji: "🏐", colors: ["#169B62", "#169B62"], ringColor: "#169B62" },
  hurling: { emoji: "🏑", colors: ["#FF7900", "#169B62"], ringColor: "#FF7900" },
  fitness: { emoji: "💪", colors: ["#FF6B4B", "#FF6B4B"], ringColor: "#FF6B4B" },
  crossfit: { emoji: "🏋️", colors: ["#FF6B4B", "#FF6B4B"], ringColor: "#FF6B4B" },
  yoga: { emoji: "🧘", colors: ["#000000", "#000000"], ringColor: "#000000" },
  martial_arts: { emoji: "🥋", colors: ["#FF6B4B", "#FF6B4B"], ringColor: "#FF6B4B" },
};

const defaultConfig = { emoji: "🏆", colors: ["#607D8B", "#607D8B"] as [string, string], ringColor: "#607D8B" };

export function getSportConfig(sport: string | null | undefined) {
  if (!sport) return defaultConfig;
  const key = sport.toLowerCase().replace(/[\s-]/g, "_");
  return sportConfig[key] || defaultConfig;
}

export default function TeamCard({ team, onViewDetails, onJoinTeam, showJoinButton = true, compact = false }: TeamCardProps) {
  const [peopleOpen, setPeopleOpen] = useState(false);
  const config = getSportConfig(team.sport);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fallbackBg = sportCardBg(team.sport, theme as "light" | "dark");
  const teamPhoto = team.cover || (team as any).logo || (team as any).logoUrl;
  const [dominantColor, setDominantColor] = useState<string | null>(
    teamPhoto ? getCachedColor(teamPhoto) : null
  );
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!teamPhoto) return;
    extractDominantColor(teamPhoto).then(setDominantColor);
  }, [teamPhoto]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    );
  }, []);

  const teamCoords = (() => {
    const t: any = team;
    const lat = Number(t.lat ?? t.latitude ?? t.locationLat);
    const lng = Number(t.lng ?? t.longitude ?? t.locationLng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  })();
  const distanceLabel = userCoords && teamCoords
    ? `${calculateDistance(userCoords, teamCoords).toFixed(1)} km away`
    : null;

  const hasPhoto = !!teamPhoto;
  const cardBg = hasPhoto && dominantColor ? dominantColor : fallbackBg;
  const colorOverlay = hasPhoto && dominantColor
    ? `linear-gradient(180deg, ${dominantColor}cc 0%, ${dominantColor}ee 100%)`
    : undefined;

  const memberCount = team.currentMembers || 0;
  const memberPreview = demoPeopleForEntity(
    team.id,
    memberCount > 0 ? memberCount : undefined,
  );

  const cardIsDark = isDark || hasPhoto;

  const textPrimary = cardIsDark ? "#ffffff" : "#111111";
  const textSecondary = cardIsDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)";
  const textTertiary = cardIsDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)";
  const surfaceLight = cardIsDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)";
  const surfaceFaint = cardIsDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
  const viewBtnBorder = cardIsDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)";

  const openPeople = () => setPeopleOpen(true);

  if (compact) {
    return (
      <>
      <div
        className="card-spotify relative overflow-hidden cursor-pointer active:scale-[0.97] transition-transform duration-200"
        style={{ height: "140px", minWidth: "140px", padding: 0, background: cardBg }}
        onClick={() => onViewDetails(team.id)}
      >
        {hasPhoto && (
          <>
            <img
              src={teamPhoto}
              alt={team.name}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "blur(2px) saturate(1.1)", transform: "scale(1.05)" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="absolute inset-0" style={{ background: dominantColor ? `${dominantColor}55` : 'rgba(0,0,0,0.35)' }} />
          </>
        )}
        <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg flex items-center justify-center text-sm"
          style={{ background: surfaceLight }}>
          {config.emoji}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-xs font-bold truncate drop-shadow-sm" style={{ color: textPrimary }}>{team.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <CardAttendeeStrip
              entityType="team"
              entityId={String(team.id)}
              fallbackCount={memberCount > 0 ? memberCount : undefined}
              compact
            />
          </div>
        </div>
      </div>
      <ActivityPeopleSheet
        open={peopleOpen}
        onClose={() => setPeopleOpen(false)}
        kind="team"
        entityId={team.id}
        title={team.name}
        subtitle={team.sport || undefined}
        route={`/teams/${team.id}`}
        previewPeople={memberPreview}
      />
      </>
    );
  }

  return (
    <>
    <div
      className="card-spotify relative overflow-hidden cursor-pointer group active:scale-[0.97] transition-transform duration-200"
      style={{ padding: "20px", background: cardBg }}
      onClick={() => onViewDetails(team.id)}
    >
      {hasPhoto && (
        <>
          <img
            src={teamPhoto}
            alt={team.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "blur(2px) saturate(1.1)", transform: "scale(1.05)" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="absolute inset-0" style={{ background: dominantColor ? `${dominantColor}55` : 'rgba(0,0,0,0.35)' }} />
        </>
      )}

      <CardMenu />

      <div className="relative z-[2]">
        <div className="flex items-center justify-between mb-3">
          {team.sport && (
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm"
              style={{ background: surfaceLight, color: textSecondary }}>
              {team.sport}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold leading-tight mb-1 truncate drop-shadow-sm" style={{ color: textPrimary }}>{team.name}</h3>

        {team.description && (
          <p className="text-[13px] leading-snug mb-3 line-clamp-2" style={{ color: textSecondary }}>
            {team.description}
          </p>
        )}

        {distanceLabel && (
          <div className="mb-3 text-[12px]" style={{ color: textSecondary }}>
            {distanceLabel}
          </div>
        )}

        <div className="mb-3">
          <CardAttendeeStrip
            entityType="team"
            entityId={String(team.id)}
            fallbackCount={memberCount > 0 ? memberCount : undefined}
          />
        </div>

        <div className="flex items-center gap-2">
          {showJoinButton && (
            <button
              className="flex-1 h-9 rounded-full text-[13px] font-bold transition-all duration-200 active:scale-[0.96] border-none"
              style={{ background: cardIsDark ? '#ffffff' : '#111111', color: cardIsDark ? '#000000' : '#ffffff' }}
              onClick={(e) => { e.stopPropagation(); onJoinTeam(team.id); }}
            >
              Join Team
            </button>
          )}
        </div>
      </div>
    </div>
    <ActivityPeopleSheet
      open={peopleOpen}
      onClose={() => setPeopleOpen(false)}
      kind="team"
      entityId={team.id}
      title={team.name}
      subtitle={team.sport || undefined}
      route={`/teams/${team.id}`}
      previewPeople={memberPreview}
    />
    </>
  );
}
