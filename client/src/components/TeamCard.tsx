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
import { teamCoverUrl, teamLogoUrl, teamPhotoUrl } from "@/lib/teamLogo";

interface TeamCardProps {
  team: Team;
  onViewDetails: (teamId: string) => void;
  onJoinTeam: (teamId: string) => void;
  showJoinButton?: boolean;
  compact?: boolean;
}

const sportConfig: Record<string, { emoji: string; colors: [string, string]; ringColor: string }> = {
  boxing: { emoji: "🥊", colors: ["#C62828", "#C62828"], ringColor: "#C62828" },
  mma: { emoji: "🥋", colors: ["#B71C1C", "#B71C1C"], ringColor: "#B71C1C" },
  baseball: { emoji: "⚾", colors: ["#E65100", "#E65100"], ringColor: "#E65100" },
  volleyball: { emoji: "🏐", colors: ["#F9A825", "#F9A825"], ringColor: "#F9A825" },
  tennis: { emoji: "🎾", colors: ["#EF6C00", "#EF6C00"], ringColor: "#EF6C00" },
  football: { emoji: "⚽", colors: ["#D84315", "#D84315"], ringColor: "#D84315" },
  soccer: { emoji: "⚽", colors: ["#D84315", "#D84315"], ringColor: "#D84315" },
  basketball: { emoji: "🏀", colors: ["#F57C00", "#F57C00"], ringColor: "#F57C00" },
  swimming: { emoji: "🏊", colors: ["#E53935", "#E53935"], ringColor: "#E53935" },
  rugby: { emoji: "🏉", colors: ["#C62828", "#C62828"], ringColor: "#C62828" },
  cricket: { emoji: "🏏", colors: ["#FF8F00", "#FF8F00"], ringColor: "#FF8F00" },
  hockey: { emoji: "🏒", colors: ["#E53935", "#E53935"], ringColor: "#E53935" },
  golf: { emoji: "⛳", colors: ["#EF6C00", "#EF6C00"], ringColor: "#EF6C00" },
  running: { emoji: "🏃", colors: ["#FF5722", "#FF5722"], ringColor: "#FF5722" },
  cycling: { emoji: "🚴", colors: ["#E53935", "#E53935"], ringColor: "#E53935" },
  wrestling: { emoji: "🤼", colors: ["#E64A19", "#E64A19"], ringColor: "#E64A19" },
  gaa: { emoji: "🏐", colors: ["#E53935", "#E53935"], ringColor: "#E53935" },
  hurling: { emoji: "🏑", colors: ["#FF7900", "#FF7900"], ringColor: "#FF7900" },
  fitness: { emoji: "💪", colors: ["#FF6B4B", "#FF6B4B"], ringColor: "#FF6B4B" },
  crossfit: { emoji: "🏋️", colors: ["#E53935", "#E53935"], ringColor: "#E53935" },
  yoga: { emoji: "🧘", colors: ["#FF7043", "#FF7043"], ringColor: "#FF7043" },
  martial_arts: { emoji: "🥋", colors: ["#C62828", "#C62828"], ringColor: "#C62828" },
};

const defaultConfig = { emoji: "🏆", colors: ["#C62828", "#C62828"] as [string, string], ringColor: "#C62828" };

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
  const logo = teamLogoUrl(team);
  const cover = teamCoverUrl(team);
  const teamPhoto = teamPhotoUrl(team);
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
  const hasAtmosphere = Boolean((cover || logo)?.trim());
  const lightCard = hasAtmosphere ? false : isLightHex(cardBg);
  const surfaceLight = lightCard ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.12)";

  if (compact) {
    return (
      <>
        <div
          className="card-spotify relative overflow-hidden cursor-pointer active:scale-[0.97] transition-transform duration-200"
          style={{ height: "140px", minWidth: "140px", padding: 0, background: cardBg }}
          onClick={() => onViewDetails(team.id)}
        >
          {hasAtmosphere ? (
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
              <img
                src={(cover || logo)!}
                alt=""
                className="absolute inset-[-12%] w-[124%] h-[124%] object-cover"
                style={{ filter: "blur(16px) saturate(1.08)", opacity: 0.55, transform: "scale(1.06)" }}
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(165deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)",
                }}
              />
            </div>
          ) : null}
          <div
            className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg flex items-center justify-center text-sm z-[1]"
            style={{ background: surfaceLight }}
          >
            {config.emoji}
          </div>
          {logo || cover ? (
            <div className="absolute top-3 left-3 w-12 h-12 rounded-lg overflow-hidden z-[1] shadow-md">
              <img src={(logo || cover)!} alt="" className="w-full h-full object-cover" />
            </div>
          ) : null}
          <div className="absolute bottom-0 left-0 right-0 p-3 z-[1]">
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
        imageUrl={logo || cover || null}
        blurImageUrl={cover || logo || null}
        fallbackIcon={config.emoji}
        backgroundColor={cardBg}
        backdrop="soft-blur"
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
