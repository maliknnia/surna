import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  loading?: boolean;
}

export function StatCard({ title, value, change, changeLabel, icon, loading }: StatCardProps) {
  if (loading) {
    return (
      <Card data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}-loading`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
        </CardHeader>
        <CardContent>
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
          {changeLabel && <div className="mt-2 h-4 w-32 bg-muted animate-pulse rounded" />}
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    if (change === undefined || change === null) return null;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500 dark:text-red-400" />;
    return <Minus className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === null) return "";
    if (change > 0) return "text-green-600 dark:text-green-400";
    if (change < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  return (
    <Card data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid={`stat-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </div>
        {(change !== undefined || changeLabel) && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {getTrendIcon()}
            {change !== undefined && (
              <span className={getTrendColor()} data-testid={`stat-change-${title.toLowerCase().replace(/\s+/g, '-')}`}>
                {change > 0 ? "+" : ""}{change}%
              </span>
            )}
            {changeLabel && (
              <span className="text-muted-foreground">{changeLabel}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
