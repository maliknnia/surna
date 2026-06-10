import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Star, Award, Crown, ChevronRight, Zap } from "lucide-react";
import { Link } from "wouter";

interface CompactGamificationData {
  totalPoints: number;
  currentLevel: number;
  levelProgress: number;
  badgeCount: number;
  rank: number;
  recentBadge?: {
    title: string;
    iconEmoji: string;
    earnedAt: string;
  };
  currentStreak: number;
  pointsToday: number;
}

export function GamificationWidget() {
  const mockData: CompactGamificationData = {
    totalPoints: 2450,
    currentLevel: 7,
    levelProgress: 65,
    badgeCount: 12,
    rank: 42,
    recentBadge: {
      title: "Social Butterfly",
      iconEmoji: "🦋",
      earnedAt: "2024-02-10",
    },
    currentStreak: 5,
    pointsToday: 85,
  };

  const gamificationData = mockData;
  const isLoading = false;

  if (isLoading) {
    return (
      <Card className="w-full border-[var(--surna-border)] bg-[var(--surna-elevated)] shadow-none">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 rounded-lg bg-[var(--surna-bg-highlight)] w-3/4" />
            <div className="h-2 rounded-full bg-[var(--surna-bg-highlight)]" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-10 rounded-xl bg-[var(--surna-bg-highlight)]" />
              <div className="h-10 rounded-xl bg-[var(--surna-bg-highlight)]" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="w-full border-[var(--surna-border)] bg-[var(--surna-elevated)] shadow-none hover:border-[var(--surna-text-muted)]/30 transition-colors"
      data-testid="gamification-widget"
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--surna-bg-highlight)] flex items-center justify-center">
              <Star className="h-4 w-4 text-[var(--surna-text)]" />
            </div>
            <span className="font-semibold text-sm text-[var(--surna-text)]">Your progress</span>
          </div>
          <Link href="/gamification">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full text-[var(--surna-text-muted)]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-[var(--surna-bg-highlight)] p-3 text-center">
            <p className="text-lg font-bold text-[var(--surna-text)] tabular-nums">
              {gamificationData.totalPoints.toLocaleString()}
            </p>
            <p className="text-[11px] text-[var(--surna-text-muted)]">Points</p>
            {gamificationData.pointsToday > 0 && (
              <p className="text-[10px] text-emerald-400 mt-0.5">+{gamificationData.pointsToday} today</p>
            )}
          </div>
          <div className="rounded-xl bg-[var(--surna-bg-highlight)] p-3 text-center">
            <p className="text-lg font-bold text-[var(--surna-text)] tabular-nums">
              {gamificationData.currentLevel}
            </p>
            <p className="text-[11px] text-[var(--surna-text-muted)]">Level</p>
            <Progress value={gamificationData.levelProgress} className="h-1 mt-2" />
          </div>
        </div>

        <div className="flex justify-between items-center text-sm mb-3 px-1">
          <div className="flex items-center gap-1.5 text-[var(--surna-text-secondary)]">
            <Award className="h-3.5 w-3.5" />
            <span className="font-medium text-[var(--surna-text)]">{gamificationData.badgeCount}</span>
            <span className="text-xs">badges</span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--surna-text-secondary)]">
            <Crown className="h-3.5 w-3.5" />
            <span className="font-medium text-[var(--surna-text)]">#{gamificationData.rank}</span>
            <span className="text-xs">rank</span>
          </div>
        </div>

        {gamificationData.currentStreak > 0 && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-[var(--surna-bg-highlight)] border border-[var(--surna-border)]">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium text-[var(--surna-text)]">
              {gamificationData.currentStreak} day streak
            </span>
          </div>
        )}

        {gamificationData.recentBadge && (
          <div className="flex items-center gap-2 pt-3 border-t border-[var(--surna-border)]">
            <span className="text-xl">{gamificationData.recentBadge.iconEmoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--surna-text)] truncate">
                {gamificationData.recentBadge.title}
              </p>
              <p className="text-[11px] text-[var(--surna-text-muted)]">Latest badge</p>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              New
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function GamificationMiniWidget() {
  const mockData = { totalPoints: 2450, currentLevel: 7, pointsToday: 85 };

  return (
    <div
      className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--surna-border)] bg-[var(--surna-elevated)]"
      data-testid="gamification-mini-widget"
    >
      <div className="flex items-center gap-1.5 text-sm">
        <Star className="h-3.5 w-3.5 text-[var(--surna-text-muted)]" />
        <span className="font-semibold tabular-nums">{mockData.totalPoints.toLocaleString()}</span>
      </div>
      <span className="text-[var(--surna-border)]">·</span>
      <span className="text-sm font-medium text-[var(--surna-text-secondary)]">L{mockData.currentLevel}</span>
      {mockData.pointsToday > 0 && (
        <Badge variant="secondary" className="text-[10px] px-1.5">
          +{mockData.pointsToday}
        </Badge>
      )}
      <Link href="/gamification" className="ml-auto">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full">
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );
}
