import { memo } from "react";
import { Link } from "wouter";
import { Dumbbell, Swords, BarChart3, Trophy, Calendar, Package } from "lucide-react";
import type { SportProfile } from "../lib/proSport";

const ALL_LINKS = [
  { key: "training", label: "Training", sub: "Drills & sessions", href: "/pro/training", icon: Dumbbell },
  { key: "match", label: "Match Day", sub: "Lineup & prep", href: "/pro/match-day", icon: Swords },
  { key: "stats", label: "Performance", sub: "Sport metrics", href: "/pro/stats", icon: BarChart3 },
  { key: "tournament", label: "Tournaments", sub: "Competitions", href: "/pro/tournament", icon: Trophy },
  { key: "schedule", label: "Schedule", sub: "Fixtures", href: "/pro/schedule", icon: Calendar },
  { key: "inventory", label: "Inventory", sub: "Kit & gear", href: "/pro/inventory", icon: Package },
] as const;

function ProSportShortcuts({ profile }: { profile: SportProfile }) {
  const matchLabel = profile.matchDayLabel.replace(" day", "").replace("Day", " day");

  const links = ALL_LINKS.map((l) =>
    l.key === "match" ? { ...l, label: matchLabel.charAt(0).toUpperCase() + matchLabel.slice(1) } : l,
  );

  return (
    <div className="pro-shortcuts-row">
      {links.map(({ href, label, sub, icon: Icon }) => (
        <Link key={href} href={href} className="pro-shortcut-tile">
          <span className="pro-shortcut-tile__icon"><Icon size={18} /></span>
          <span className="pro-shortcut-tile__label">{label}</span>
          <span className="pro-shortcut-tile__sub">{sub}</span>
        </Link>
      ))}
    </div>
  );
}

export default memo(ProSportShortcuts);
