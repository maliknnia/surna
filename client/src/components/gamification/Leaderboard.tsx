import { useState } from "react";
import { Trophy, Medal, Award, Crown, Users, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  score: number;
  change?: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  title?: string;
  metric?: string;
  timeframe?: "daily" | "weekly" | "monthly" | "all-time";
  sport?: string;
  currentUserId?: string;
  isLoading?: boolean;
  className?: string;
  onTimeframeChange?: (timeframe: string) => void;
  onSportChange?: (sport: string) => void;
}

const MEDAL = {
  1: { icon: Crown, color: "#FFD700", bar: "h-24" },
  2: { icon: Medal, color: "#C0C0C0", bar: "h-[4.5rem]" },
  3: { icon: Award, color: "#CD7F32", bar: "h-16" },
} as const;

function displayName(entry: LeaderboardEntry) {
  if (entry.firstName && entry.lastName) return `${entry.firstName} ${entry.lastName}`;
  return entry.username;
}

function formatScore(score: number, metric?: string) {
  if (metric === "points") return score.toLocaleString();
  return score.toString();
}

function Avatar({
  entry,
  size = "md",
}: {
  entry: LeaderboardEntry;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "w-9 h-9", md: "w-11 h-11", lg: "w-14 h-14" };
  const label = displayName(entry);
  return (
    <div
      className={cn(
        sizes[size],
        "rounded-full overflow-hidden flex-shrink-0 bg-[var(--surna-bg-highlight)] flex items-center justify-center",
      )}
    >
      {entry.profileImageUrl ? (
        <img src={entry.profileImageUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-sm font-semibold text-[var(--surna-text-secondary)]">
          {label.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function ChangeIndicator({ change }: { change?: number }) {
  if (change === undefined || change === 0) {
    return (
      <span className="inline-flex items-center text-xs text-[var(--surna-text-muted)]">
        <Minus className="w-3 h-3 mr-0.5" />
        —
      </span>
    );
  }
  const up = change > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-medium",
        up ? "text-emerald-400" : "text-red-400",
      )}
    >
      {up ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
      {up ? "+" : ""}
      {change}
    </span>
  );
}

function Podium({ topThree }: { topThree: LeaderboardEntry[] }) {
  if (topThree.length === 0) return null;

  const order: (1 | 2 | 3)[] = [2, 1, 3];
  const byRank = (r: number) => topThree.find((e) => e.rank === r);

  return (
    <div className="grid grid-cols-3 gap-2 items-end pt-2 pb-6 px-1">
      {order.map((rank) => {
        const entry = byRank(rank);
        const meta = MEDAL[rank];
        if (!entry) {
          return <div key={rank} className="min-h-[7rem]" />;
        }
        const Icon = meta.icon;
        const isFirst = rank === 1;
        return (
          <div
            key={entry.userId}
            className={cn(
              "flex flex-col items-center text-center",
              isFirst && "-mt-2",
            )}
          >
            <div
              className={cn(
                "relative mb-2",
                isFirst && "ring-2 ring-[#FFD700]/40 rounded-full",
              )}
            >
              <Avatar entry={entry} size={isFirst ? "lg" : "md"} />
              <span
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border border-[var(--surna-border)]"
                style={{ background: "var(--surna-elevated)" }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
              </span>
            </div>
            <p className="text-xs font-semibold text-[var(--surna-text)] truncate max-w-[5.5rem]">
              {entry.username}
            </p>
            <p className="text-[11px] text-[var(--surna-text-muted)] mt-0.5 tabular-nums">
              {formatScore(entry.score, "points")}
            </p>
            <div
              className={cn(
                "w-full mt-3 rounded-t-lg",
                meta.bar,
                "bg-[var(--surna-bg-highlight)] border border-b-0 border-[var(--surna-border)]",
              )}
            />
          </div>
        );
      })}
    </div>
  );
}

function LeaderboardRow({
  entry,
  isYou,
  metric,
}: {
  entry: LeaderboardEntry;
  isYou: boolean;
  metric?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
        isYou
          ? "bg-[var(--surna-bg-highlight)] border border-[var(--surna-border)]"
          : "hover:bg-[var(--surna-bg-highlight)]/60",
      )}
      data-testid={`leaderboard-entry-${entry.rank}`}
    >
      <span
        className={cn(
          "w-7 text-center text-sm font-semibold tabular-nums flex-shrink-0",
          entry.rank <= 3 ? "text-[var(--surna-text)]" : "text-[var(--surna-text-muted)]",
        )}
      >
        {entry.rank}
      </span>
      <Avatar entry={entry} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--surna-text)] truncate">
          {displayName(entry)}
          {isYou && (
            <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--surna-text-muted)]">
              You
            </span>
          )}
        </p>
        <p className="text-xs text-[var(--surna-text-muted)] truncate">@{entry.username}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-[var(--surna-text)] tabular-nums">
          {formatScore(entry.score, metric)}
        </p>
        <ChangeIndicator change={entry.change} />
      </div>
    </div>
  );
}

export function Leaderboard({
  entries,
  title = "Leaderboard",
  metric = "points",
  timeframe = "all-time",
  sport,
  currentUserId,
  isLoading = false,
  className,
  onTimeframeChange,
  onSportChange,
}: LeaderboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [selectedSport, setSelectedSport] = useState(sport || "all");

  const handleTimeframeChange = (value: string) => {
    setSelectedTimeframe(value as typeof timeframe);
    onTimeframeChange?.(value);
  };

  const handleSportChange = (value: string) => {
    setSelectedSport(value);
    onSportChange?.(value);
  };

  const userEntry = entries.find((e) => e.userId === currentUserId);
  const topThree = entries.filter((e) => e.rank <= 3).sort((a, b) => a.rank - b.rank);
  const rest = entries.filter((e) => e.rank > 3);
  const showPinnedYou =
    userEntry && userEntry.rank > 10 && !rest.some((e) => e.userId === currentUserId);

  if (isLoading) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-[var(--surna-border)] bg-[var(--surna-elevated)] p-5",
          className,
        )}
        data-testid="leaderboard-loading"
      >
        <div className="h-6 w-40 rounded-lg bg-[var(--surna-bg-highlight)] animate-pulse mb-4" />
        <div className="h-28 rounded-xl bg-[var(--surna-bg-highlight)] animate-pulse mb-4" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-[var(--surna-bg-highlight)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--surna-border)] bg-[var(--surna-elevated)] overflow-hidden",
        className,
      )}
      data-testid="leaderboard"
    >
      <div className="p-5 border-b border-[var(--surna-border)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--surna-bg-highlight)] flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-[var(--surna-text)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--surna-text)] tracking-tight">{title}</h2>
              <p className="text-sm text-[var(--surna-text-muted)] capitalize mt-0.5">
                {selectedTimeframe.replace("-", " ")} · {metric}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedTimeframe} onValueChange={handleTimeframeChange}>
              <SelectTrigger className="h-9 w-[7.5rem] rounded-full border-[var(--surna-border)] bg-[var(--surna-bg-highlight)] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="all-time">All time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedSport} onValueChange={handleSportChange}>
              <SelectTrigger className="h-9 w-[7.5rem] rounded-full border-[var(--surna-border)] bg-[var(--surna-bg-highlight)] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sports</SelectItem>
                <SelectItem value="football">Football</SelectItem>
                <SelectItem value="basketball">Basketball</SelectItem>
                <SelectItem value="soccer">Soccer</SelectItem>
                <SelectItem value="tennis">Tennis</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="cycling">Cycling</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="py-16 px-6 text-center">
          <Users className="w-10 h-10 text-[var(--surna-text-muted)] mx-auto mb-3 opacity-60" />
          <p className="text-sm font-medium text-[var(--surna-text)]">No rankings yet</p>
          <p className="text-xs text-[var(--surna-text-muted)] mt-1 max-w-xs mx-auto">
            Play, join events, and earn points to appear on the board.
          </p>
        </div>
      ) : (
        <>
          {topThree.length >= 2 && (
            <div className="px-4 border-b border-[var(--surna-border)]">
              <Podium topThree={topThree} />
            </div>
          )}

          {showPinnedYou && userEntry && (
            <div className="px-4 pt-3">
              <LeaderboardRow entry={userEntry} isYou metric={metric} />
            </div>
          )}

          <div className="p-3 space-y-0.5 max-h-[min(24rem,50vh)] overflow-y-auto">
            {(topThree.length >= 2 ? rest : entries).map((entry) => (
              <LeaderboardRow
                key={entry.userId}
                entry={entry}
                isYou={entry.userId === currentUserId}
                metric={metric}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
