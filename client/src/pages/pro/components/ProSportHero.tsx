import { memo } from "react";
import { Link } from "wouter";
import { Clock, Users, Shield, ChevronRight } from "lucide-react";
import type { SportProfile } from "../lib/proSport";
import { Tag } from "./primitives";

type QuickLink = { label: string; href: string };

type Props = {
  profile: SportProfile;
  teamName?: string;
  links?: QuickLink[];
  compact?: boolean;
};

function ProSportHero({ profile, teamName, links, compact }: Props) {
  const familyLabel = profile.family.replace(/_/g, " ");

  return (
    <div className={`pro-sport-hero${compact ? " pro-sport-hero--compact" : ""}`}>
      <div className="pro-sport-hero__main">
        <div className="pro-sport-hero__badge">{profile.displaySport.charAt(0)}</div>
        <div className="pro-sport-hero__copy">
          <div className="pro-sport-hero__title-row">
            <h2 className="pro-sport-hero__title">{profile.displaySport}</h2>
            <Tag tone="active">{familyLabel}</Tag>
          </div>
          <p className="pro-sport-hero__sub">
            {profile.governingBody}
            {teamName ? ` · ${teamName}` : ""}
          </p>
        </div>
      </div>

      {!compact && (
        <div className="pro-sport-hero__stats">
          {profile.playersOnField > 0 && (
            <div className="pro-sport-hero__stat">
              <Users size={14} />
              <span>{profile.playersOnField} on field</span>
            </div>
          )}
          <div className="pro-sport-hero__stat">
            <Clock size={14} />
            <span>{profile.matchDuration}</span>
          </div>
          <div className="pro-sport-hero__stat">
            <Shield size={14} />
            <span>Squad {profile.squadMin}–{profile.squadMax}</span>
          </div>
        </div>
      )}

      {links && links.length > 0 && (
        <div className="pro-sport-hero__links">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              <span className="pro-sport-hero__link">
                {l.label}
                <ChevronRight size={13} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(ProSportHero);
