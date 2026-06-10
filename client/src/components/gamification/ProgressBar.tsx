import { cn } from "@/lib/utils";

interface ProgressBarProps {
  current: number;
  goal: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  showPercentage?: boolean;
  showNumbers?: boolean;
  color?: "blue" | "green" | "purple" | "orange" | "red";
  className?: string;
}

export function ProgressBar({
  current,
  goal,
  label,
  size = "md",
  showPercentage = true,
  showNumbers = false,
  color = "blue",
  className,
}: ProgressBarProps) {
  const percentage = Math.min(goal > 0 ? (current / goal) * 100 : 0, 100);
  const isComplete = current >= goal;

  const sizeClasses = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  };

  const colorClasses = {
    blue: "bg-token-text",
    green: "bg-token-text",
    purple: "bg-token-text",
    orange: "bg-token-text",
    red: "bg-token-text",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("w-full space-y-2", className)} data-testid="progress-bar">
      {label && (
        <div className="flex items-center justify-between">
          <span className={cn("font-medium text-token-text", textSizeClasses[size])}>
            {label}
          </span>
          {showPercentage && (
            <span className={cn("text-token-text", textSizeClasses[size])}>
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      
      <div className="relative">
        {/* Background track */}
        <div className={cn(
          "w-full bg-transparent border border-border rounded-full",
          sizeClasses[size]
        )}>
          {/* Progress fill */}
          <div
            className={cn(
              "rounded-full transition-all duration-500 ease-out",
              colorClasses[color],
              sizeClasses[size],
              isComplete && "animate-pulse"
            )}
            style={{ width: `${percentage}%` }}
            data-testid="progress-fill"
          />
        </div>
        
        {/* Completion indicator */}
        {isComplete && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-foreground text-xs font-bold">✓</span>
          </div>
        )}
      </div>

      {showNumbers && (
        <div className={cn("flex justify-between text-token-text", textSizeClasses[size])}>
          <span>Current: {current}</span>
          <span>Goal: {goal}</span>
        </div>
      )}
    </div>
  );
}