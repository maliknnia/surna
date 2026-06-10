import { Trophy, Star, Zap, Clock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "./ProgressBar";

interface Achievement {
  id: string;
  title: string;
  description: string;
  points: number;
  category: string;
  progress?: {
    current: number;
    target: number;
    percentage: number;
  };
  isCompleted?: boolean;
  unlockedAt?: Date;
  rarity?: "common" | "rare" | "epic" | "legendary";
}

interface AchievementCardProps {
  achievement: Achievement;
  size?: "compact" | "default" | "detailed";
  showProgress?: boolean;
  className?: string;
}

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case "milestone":
      return Trophy;
    case "social":
      return Star;
    case "engagement":
      return Zap;
    case "streak":
      return Clock;
    default:
      return Trophy;
  }
};

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case "common":
      return "text-token-text bg-transparent border border-border";
    case "rare":
      return "text-token-accent bg-token-accent/10";
    case "epic":
      return "text-token-accent bg-token-accent/10";
    case "legendary":
      return "text-token-accent bg-token-accent/10";
    default:
      return "text-token-text bg-transparent border border-border";
  }
};

export function AchievementCard({
  achievement,
  size = "default",
  showProgress = true,
  className,
}: AchievementCardProps) {
  const Icon = getCategoryIcon(achievement.category);
  const isCompleted = achievement.isCompleted || !!achievement.unlockedAt;
  const rarityColor = getRarityColor(achievement.rarity || "common");

  if (size === "compact") {
    return (
      <div 
        className={cn(
          "flex items-center space-x-3 p-3 rounded-lg transition-all duration-200",
          isCompleted 
            ? "bg-transparent border border-border /20" 
            : "bg-background /20 hover:shadow-md",
          className
        )}
        data-testid="achievement-card-compact"
      >
        <div className={cn(
          "p-2 rounded-full",
          isCompleted ? "bg-transparent border border-border" : rarityColor
        )}>
          {isCompleted ? (
            <Check className="w-4 h-4 text-token-text" />
          ) : (
            <Icon className="w-4 h-4" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-token-text truncate">
            {achievement.title}
          </h4>
          <p className="text-xs text-token-text truncate">
            {achievement.points} points
          </p>
        </div>
        
        {isCompleted && (
          <div className="text-token-text">
            <Check className="w-5 h-5" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "rounded-lg p-6 transition-all duration-200 hover:shadow-lg",
        isCompleted 
          ? "bg-transparent border border-border /20" 
          : "bg-background /20 hover:/30",
        className
      )}
      data-testid="achievement-card"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "p-3 rounded-full",
            isCompleted ? "bg-transparent border border-border" : rarityColor
          )}>
            {isCompleted ? (
              <Check className="w-6 h-6 text-token-text" />
            ) : (
              <Icon className="w-6 h-6" />
            )}
          </div>
          
          <div>
            <h3 className="font-semibold text-lg text-token-text">
              {achievement.title}
            </h3>
            <p className="text-sm text-token-text">
              {achievement.category} • {achievement.points} points
            </p>
          </div>
        </div>
        
        {achievement.rarity && (
          <div className={cn(
            "px-2 py-1 rounded-full text-xs font-medium",
            rarityColor
          )}>
            {achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-token-text mb-4">
        {achievement.description}
      </p>

      {/* Progress */}
      {showProgress && achievement.progress && !isCompleted && (
        <div className="mb-4">
          <ProgressBar
            current={achievement.progress.current}
            goal={achievement.progress.target}
            label="Progress"
            color="blue"
            size="sm"
          />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t /20">
        {isCompleted ? (
          <div className="flex items-center space-x-2 text-token-text">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">Completed</span>
            {achievement.unlockedAt && (
              <span className="text-xs text-token-text">
                {new Date(achievement.unlockedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        ) : achievement.progress ? (
          <div className="text-sm text-token-text">
            {achievement.progress.current} / {achievement.progress.target} 
            <span className="ml-1">({Math.round(achievement.progress.percentage)}%)</span>
          </div>
        ) : (
          <div className="text-sm text-token-text">
            Not started
          </div>
        )}
        
        <div className="flex items-center space-x-1 text-token-text">
          <Star className="w-4 h-4 fill-current" />
          <span className="text-sm font-medium">{achievement.points}</span>
        </div>
      </div>
    </div>
  );
}

interface AchievementListProps {
  achievements: Achievement[];
  title?: string;
  filter?: "all" | "completed" | "in-progress" | "locked";
  showProgress?: boolean;
  className?: string;
}

export function AchievementList({
  achievements,
  title = "Achievements",
  filter = "all",
  showProgress = true,
  className,
}: AchievementListProps) {
  const filteredAchievements = achievements.filter(achievement => {
    switch (filter) {
      case "completed":
        return achievement.isCompleted || !!achievement.unlockedAt;
      case "in-progress":
        return !achievement.isCompleted && achievement.progress && achievement.progress.current > 0;
      case "locked":
        return !achievement.isCompleted && (!achievement.progress || achievement.progress.current === 0);
      default:
        return true;
    }
  });

  const completedCount = achievements.filter(a => a.isCompleted || !!a.unlockedAt).length;

  return (
    <div className={cn("space-y-6", className)} data-testid="achievement-list">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-token-text">
            {title}
          </h2>
          <p className="text-sm text-token-text">
            {completedCount} of {achievements.length} completed
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="w-24 bg-transparent border border-border rounded-full h-2">
            <div 
              className="bg-token-text h-2 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / achievements.length) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-token-text">
            {Math.round((completedCount / achievements.length) * 100)}%
          </span>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAchievements.map((achievement) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            showProgress={showProgress}
          />
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-token-text mx-auto mb-4" />
          <h3 className="text-lg font-medium text-token-text mb-2">
            No achievements found
          </h3>
          <p className="text-token-text">
            {filter === "completed" && "You haven't completed any achievements yet."}
            {filter === "in-progress" && "No achievements in progress."}
            {filter === "locked" && "No locked achievements."}
            {filter === "all" && "No achievements available."}
          </p>
        </div>
      )}
    </div>
  );
}