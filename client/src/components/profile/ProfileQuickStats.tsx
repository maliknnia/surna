import { Shield, Target, Trophy, type LucideIcon } from "lucide-react";
import { EntityQuickStats, type EntityQuickStatItem } from "@/components/entity";

type ProfileQuickStatsProps = {
  winRate: number;
  level: number;
  gamesCount?: number;
  onWinRateClick?: () => void;
  onLevelClick?: () => void;
};

export function ProfileQuickStats({
  winRate,
  level,
  gamesCount = 0,
  onWinRateClick,
  onLevelClick,
}: ProfileQuickStatsProps) {
  const items: EntityQuickStatItem[] = [
    {
      icon: Target,
      value: `${winRate}%`,
      label: "Win Rate",
      tone: "win",
      onClick: onWinRateClick,
      testId: "profile-quick-win-rate",
    },
    {
      icon: Shield,
      value: level,
      label: "Level",
      gold: true,
      tone: "gold",
      onClick: onLevelClick,
      testId: "profile-quick-level",
    },
  ];

  if (gamesCount > 0) {
    items.push({
      icon: Trophy,
      value: gamesCount,
      label: "Games",
      tone: "accent",
      testId: "profile-quick-games",
    });
  }

  return <EntityQuickStats items={items} />;
}
