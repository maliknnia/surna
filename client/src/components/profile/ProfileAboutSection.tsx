import { Link } from "wouter";
import {
  MapPin,
  Calendar,
  Trophy,
  Target,
  Users,
  Clock,
  Search,
  ChevronRight,
} from "lucide-react";
import type { ProfileExtras } from "@/hooks/useProfileExtras";
import type { UserHighlight } from "@shared/userProfile";
import { ProfileSectionCard } from "@/components/profile/ProfileSectionCard";
import { ProfileSportsSection } from "@/components/profile/ProfileSportsSection";
import { ROUTES } from "@/navigation";

type ProfileAboutSectionProps = {
  bio?: string;
  location?: string;
  primarySport?: string | null;
  position?: string | null;
  skillLevel?: string | null;
  availability?: string | null;
  lookingFor?: string | null;
  createdAt?: string | Date | null;
  highlights?: UserHighlight[];
  profileExtras: ProfileExtras;
  isOwnProfile: boolean;
  selectedSport: string | null;
  onSportSelect: (sport: string | null) => void;
  onWinRateClick?: () => void;
  onLevelClick?: () => void;
};

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--surna-text-secondary)" }} />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--surna-text-secondary)" }}>
          {label}
        </div>
        <div className="text-[14px] font-medium mt-0.5" style={{ color: "var(--surna-text)" }}>
          {value}
        </div>
      </div>
    </div>
  );
}

export function ProfileAboutSection({
  bio,
  location,
  primarySport,
  position,
  skillLevel,
  availability,
  lookingFor,
  createdAt,
  highlights = [],
  profileExtras,
  isOwnProfile,
  selectedSport,
  onSportSelect,
  onWinRateClick,
  onLevelClick,
}: ProfileAboutSectionProps) {
  const aboutBio = bio ?? "";
  const aboutLocation = location ?? "";
  const aboutPrimary = primarySport ?? "";
  const aboutPosition = position ?? "";
  const aboutSkill = skillLevel ?? "";
  const aboutAvailability = availability ?? "";
  const aboutLooking = lookingFor ?? "";

  const joinedLabel = createdAt
    ? new Date(createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;

  return (
    <div className="space-y-4 pb-2">
      {aboutBio ? (
        <ProfileSectionCard title="About">
          <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--surna-text-secondary)" }}>
            {aboutBio}
          </p>
        </ProfileSectionCard>
      ) : null}

      <ProfileSectionCard title="Player Details">
        <div className="divide-y" style={{ borderColor: "var(--surna-border)" }}>
          {aboutPrimary ? <DetailRow icon={Trophy} label="Primary sport" value={aboutPrimary} /> : null}
          {aboutPosition ? <DetailRow icon={Target} label="Position" value={aboutPosition} /> : null}
          {aboutSkill ? <DetailRow icon={Trophy} label="Skill level" value={aboutSkill} /> : null}
          {aboutAvailability ? <DetailRow icon={Clock} label="Availability" value={aboutAvailability} /> : null}
          {aboutLooking ? <DetailRow icon={Search} label="Looking for" value={aboutLooking} /> : null}
          {aboutLocation ? <DetailRow icon={MapPin} label="Location" value={aboutLocation} /> : null}
          {joinedLabel ? <DetailRow icon={Calendar} label="Joined" value={joinedLabel} /> : null}
        </div>
        {isOwnProfile ? (
          <Link href={ROUTES.profileEdit}>
            <button
              type="button"
              className="mt-3 w-full h-10 rounded-xl text-[13px] font-semibold active:opacity-80"
              style={{ background: "var(--surna-text)", color: "var(--surna-base)" }}
            >
              Edit details
            </button>
          </Link>
        ) : null}
      </ProfileSectionCard>

      <ProfileSectionCard title="Sports">
        <ProfileSportsSection sports={profileExtras.sports} selectedSport={selectedSport} onSelect={onSportSelect} hideTitle />
        <p className="text-[12px] mt-2" style={{ color: "var(--surna-text-secondary)" }}>
          Tap a sport to filter Posts & Photos below.
        </p>
      </ProfileSectionCard>

      <ProfileSectionCard title="Performance Snapshot">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onWinRateClick}
            className="rounded-xl p-3 text-left active:opacity-80"
            style={{ background: "var(--surna-base)", border: "1px solid var(--surna-border)" }}
          >
            <div className="text-[22px] font-bold tabular-nums" style={{ color: "var(--surna-text)" }}>
              {profileExtras.winRate}%
            </div>
            <div className="text-[12px]" style={{ color: "var(--surna-text-secondary)" }}>
              Win rate
            </div>
          </button>
          <button
            type="button"
            onClick={onLevelClick}
            className="rounded-xl p-3 text-left active:opacity-80"
            style={{ background: "var(--surna-base)", border: "1px solid var(--surna-border)" }}
          >
            <div
              className="text-[22px] font-bold tabular-nums"
              style={{ color: "var(--surna-gold, #f5c518)" }}
            >
              {profileExtras.level}
            </div>
            <div className="text-[12px]" style={{ color: "var(--surna-text-secondary)" }}>
              Level
            </div>
          </button>
          <div
            className="rounded-xl p-3"
            style={{ background: "var(--surna-base)", border: "1px solid var(--surna-border)" }}
          >
            <div className="text-[22px] font-bold tabular-nums" style={{ color: "var(--surna-text)" }}>
              {profileExtras.gamesCount}
            </div>
            <div className="text-[12px]" style={{ color: "var(--surna-text-secondary)" }}>
              Games played
            </div>
          </div>
          <div
            className="rounded-xl p-3"
            style={{ background: "var(--surna-base)", border: "1px solid var(--surna-border)" }}
          >
            <div className="text-[22px] font-bold tabular-nums" style={{ color: "var(--surna-text)" }}>
              {profileExtras.rating.toFixed(1)}
            </div>
            <div className="text-[12px]" style={{ color: "var(--surna-text-secondary)" }}>
              Rating
            </div>
          </div>
        </div>
        <Link href={ROUTES.performance}>
          <button
            type="button"
            className="mt-3 w-full flex items-center justify-center gap-1 h-10 rounded-xl text-[13px] font-semibold active:opacity-80"
            style={{ border: "1px solid var(--surna-border)", color: "var(--surna-text)" }}
          >
            View full stats
            <ChevronRight className="w-4 h-4" />
          </button>
        </Link>
      </ProfileSectionCard>

      {highlights.length > 0 ? (
        <ProfileSectionCard title="Highlights">
          <div className="space-y-3">
            {highlights.map((h) => (
              <div key={h.id} className="flex items-start gap-3">
                <span className="text-xl shrink-0">{h.emoji || "🏆"}</span>
                <div>
                  <div className="text-[14px] font-semibold" style={{ color: "var(--surna-text)" }}>
                    {h.title}
                  </div>
                  {h.description ? (
                    <p className="text-[13px] mt-0.5" style={{ color: "var(--surna-text-secondary)" }}>
                      {h.description}
                    </p>
                  ) : null}
                  {h.year ? (
                    <span className="text-[11px]" style={{ color: "var(--surna-text-secondary)" }}>
                      {h.year}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </ProfileSectionCard>
      ) : null}

      {isOwnProfile ? (
        <ProfileSectionCard title="Quick links">
          <div className="space-y-2">
            {[
              { label: "My teams", href: ROUTES.myHubTeams, icon: Users },
              { label: "My events", href: ROUTES.myHubEvents, icon: Calendar },
              { label: "Challenges", href: ROUTES.challenges, icon: Trophy },
            ].map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href}>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl active:opacity-80"
                  style={{ background: "var(--surna-base)", border: "1px solid var(--surna-border)" }}
                >
                  <span className="flex items-center gap-2 text-[14px] font-medium" style={{ color: "var(--surna-text)" }}>
                    <Icon className="w-4 h-4" style={{ color: "var(--surna-text-secondary)" }} />
                    {label}
                  </span>
                  <ChevronRight className="w-4 h-4" style={{ color: "var(--surna-text-secondary)" }} />
                </button>
              </Link>
            ))}
          </div>
        </ProfileSectionCard>
      ) : null}
    </div>
  );
}
