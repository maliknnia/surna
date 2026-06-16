import { useState, useEffect } from "react";
import { CardAttendeeStrip } from "@/components/people/CardAttendeeStrip";
import type { Team } from "@shared/schema";
import CardMenu from "./CardMenu";
import { calculateDistance } from "@/lib/geo";
import { demoPeopleForEntity } from "@/lib/activityPeople";
import { ActivityPeopleSheet } from "@/components/people/ActivityPeopleSheet";
import SpotifyPlaylistCard from "@/components/cards/SpotifyPlaylistCard";
import { useDiscoveryCardBg } from "@/hooks/useDiscoveryCardBg";
import { isLightHex } from "@/lib/colorUtils";
import { teamLogoUrl } from "@/lib/teamLogo";

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

export default function TeamCard({
  team,
  onViewDetails,
  onJoinTeam,
  showJoinButton = true,
  compact = false,
}: TeamCardProps) {
  const [peopleOpen, setPeopleOpen] = useState(false);
  const config = getSportConfig(team.sport);
  const teamPhoto = teamLogoUrl(team);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
    );
  }, []);

  const teamCoords = (() => {
    const t: any = team;
    const lat = Number(t.lat ?? t.latitude ?? t.locationLat);
    const lng = Number(t.lng ?? t.longitude ?? t.locationLng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  })();

  const distanceLabel =
    userCoords && teamCoords
      ? `${calculateDistance(userCoords, teamCoords).toFixed(1)} km away`
      : null;

  const memberCount = team.currentMembers || 0;
  const memberPreview = demoPeopleForEntity(
    team.id,
    memberCount > 0 ? memberCount : undefined,
  );

  const cardBg = useDiscoveryCardBg(teamPhoto, team.sport);
  const lightCard = isLightHex(cardBg);
  const surfaceLight = lightCard ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.12)";

  if (compact) {
    return (
      <>
        <div
          className="card-spotify relative overflow-hidden cursor-pointer active:scale-[0.97] transition-transform duration-200"
          style={{ height: "140px", minWidth: "140px", padding: 0, background: cardBg }}
          onClick={() => onViewDetails(team.id)}
        >
          <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: surfaceLight }}>
            {config.emoji}
          </div>
          {teamPhoto ? (
            <div className="absolute top-3 left-3 w-12 h-12 rounded-lg overflow-hidden">
              <img src={teamPhoto} alt="" className="w-full h-full object-cover" />
            </div>
          ) : null}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-xs font-bold truncate" style={{ color: lightCard ? "#121212" : "#fff" }}>{team.name}</p>
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

  const metaParts = [
    distanceLabel,
    memberCount > 0 ? `${memberCount} members` : null,
    team.description ? team.description : null,
  ].filter(Boolean);

  return (
    <>
      <SpotifyPlaylistCard
        title={team.name}
        subtitle={team.sport || undefined}
        meta={metaParts.slice(0, 2).join(" · ")}
        imageUrl={teamPhoto || null}
        fallbackIcon={config.emoji}
        backgroundColor={cardBg}
        thumbSize="large"
        onCardClick={() => onViewDetails(team.id)}
        menu={<CardMenu inline />}
        extraContent={
          <CardAttendeeStrip
            entityType="team"
            entityId={String(team.id)}
            fallbackCount={memberCount > 0 ? memberCount : undefined}
          />
        }
        primaryAction={
          showJoinButton
            ? {
                label: "Join team",
                onClick: (e) => {
                  e.stopPropagation();
                  onJoinTeam(team.id);
                },
              }
            : undefined
        }
      />

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
