import { Trophy, Star, Award, Target, Flame, Users, Calendar, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Badge {
  id: string;
  name: string;
  description: string;
  iconEmoji?: string;
  category: string;
  rarity?: "common" | "rare" | "epic" | "legendary";
  earnedAt?: Date;
}

interface BadgeDisplayProps {
  badge: Badge;
  size?: "sm" | "md" | "lg" | "xl";
  earned?: boolean;
  showDetails?: boolean;
  className?: string;
}

const getBadgeIcon = (category: string, iconEmoji?: string) => {
  if (iconEmoji) return iconEmoji;
  
  switch (category.toLowerCase()) {
    case "achievement":
      return Trophy;
    case "social":
      return Users;
    case "engagement":
      return Star;
    case "milestone":
      return Target;
    case "streak":
      return Flame;
    case "event":
      return Calendar;
    case "communication":
      return MessageCircle;
    default:
      return Award;
  }
};

const getRarityColors = (rarity: string) => {
  switch (rarity) {
    case "common":
      return {
        bg: "bg-transparent border border-border",
        border: "border-gray-500/30",
        text: "text-token-text",
        glow: "shadow-lg",
      };
    case "rare":
      return {
        bg: "bg-token-accenty/10",
        border: "border-token-accent",
        text: "text-token-accent",
        glow: "shadow-token-accent/30",
      };
    case "epic":
      return {
        bg: "bg-token-accent/10",
        border: "border-token-accent",
        text: "text-token-accent",
        glow: "shadow-token-accent/30",
      };
    case "legendary":
      return {
        bg: "bg-gradient-to-br from-gradient-blushy/10 to-gradient-blush/10",
        border: "border-token-accent",
        text: "text-token-accent",
        glow: "shadow-gradient-blush/40",
      };
    default:
      return {
        bg: "bg-transparent border border-border",
        border: "",
        text: "text-token-text",
        glow: "shadow-lg",
      };
  }
};

export function BadgeDisplay({
  badge,
  size = "md",
  earned = false,
  showDetails = false,
  className,
}: BadgeDisplayProps) {
  const Icon = getBadgeIcon(badge.category, badge.iconEmoji);
  const colors = getRarityColors(badge.rarity || "common");
  
  const sizeClasses = {
    sm: {
      container: "w-12 h-12 p-2",
      icon: "w-6 h-6",
      text: "text-xs",
    },
    md: {
      container: "w-16 h-16 p-3",
      icon: "w-8 h-8", 
      text: "text-sm",
    },
    lg: {
      container: "w-20 h-20 p-4",
      icon: "w-10 h-10",
      text: "text-base",
    },
    xl: {
      container: "w-24 h-24 p-5",
      icon: "w-12 h-12",
      text: "text-lg",
    },
  };

  const isEarned = earned || !!badge.earnedAt;

  return (
    <div className={cn("flex flex-col items-center space-y-2", className)} data-testid="badge-display">
      {/* Badge Icon */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full border-2 transition-all duration-300",
          sizeClasses[size].container,
          isEarned ? colors.bg : "bg-transparent border border-border",
          isEarned ? colors.border : "",
          isEarned ? `shadow-lg ${colors.glow}` : "shadow-sm",
          !isEarned && "opacity-50 grayscale"
        )}
        data-testid="badge-icon"
      >
        {typeof Icon === "string" ? (
          <span className={cn("text-2xl", !isEarned && "opacity-50")}>
            {Icon}
          </span>
        ) : (
          <Icon 
            className={cn(
              sizeClasses[size].icon,
              isEarned ? colors.text : "text-token-text",
              "transition-colors duration-300"
            )}
          />
        )}
        
        {/* Earned indicator */}
        {isEarned && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-transparent border border-border rounded-full flex items-center justify-center">
            <span className="text-token-text text-xs font-bold">✓</span>
          </div>
        )}
        
        {/* Legendary sparkle effect */}
        {isEarned && badge.rarity === "legendary" && (
          <div className="absolute inset-0 rounded-full animate-pulse bg-transparent border border-border opacity-20" />
        )}
      </div>

      {/* Badge Info */}
      {showDetails && (
        <div className="text-center space-y-1">
          <h4 className={cn(
            "font-semibold",
            sizeClasses[size].text,
            isEarned ? "text-token-text" : "text-token-text"
          )}>
            {badge.name}
          </h4>
          
          <p className={cn(
            "text-token-text max-w-xs",
            size === "sm" ? "text-xs" : "text-sm"
          )}>
            {badge.description}
          </p>
          
          {badge.rarity && (
            <div className={cn(
              "inline-block px-2 py-1 rounded-full text-xs font-medium",
              colors.bg,
              colors.text,
              colors.border
            )}>
              {badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1)}
            </div>
          )}
          
          {badge.earnedAt && (
            <p className="text-xs text-token-text">
              Earned {new Date(badge.earnedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface BadgeGridProps {
  badges: Badge[];
  maxDisplay?: number;
  size?: "sm" | "md" | "lg" | "xl";
  showDetails?: boolean;
  className?: string;
}

export function BadgeGrid({
  badges,
  maxDisplay,
  size = "md",
  showDetails = false,
  className,
}: BadgeGridProps) {
  const displayBadges = maxDisplay ? badges.slice(0, maxDisplay) : badges;
  const remainingCount = maxDisplay ? Math.max(0, badges.length - maxDisplay) : 0;

  return (
    <div className={cn("space-y-4", className)} data-testid="badge-grid">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {displayBadges.map((badge) => (
          <BadgeDisplay
            key={badge.id}
            badge={badge}
            size={size}
            earned={!!badge.earnedAt}
            showDetails={showDetails}
          />
        ))}
      </div>
      
      {remainingCount > 0 && (
        <div className="text-center">
          <span className="text-sm text-token-text">
            +{remainingCount} more badge{remainingCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}