import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export type Period = 'day' | 'week' | 'month' | 'all';

interface FiltersBarProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
  onRefresh?: () => void;
  loading?: boolean;
  extraFilters?: React.ReactNode;
}

export function FiltersBar({ period, onPeriodChange, onRefresh, loading, extraFilters }: FiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-lg border border-border">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Period:</label>
        <Select value={period} onValueChange={(value) => onPeriodChange(value as Period)} data-testid="select-period">
          <SelectTrigger className="w-[140px] bg-card" data-testid="trigger-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day" data-testid="option-day">Today</SelectItem>
            <SelectItem value="week" data-testid="option-week">This Week</SelectItem>
            <SelectItem value="month" data-testid="option-month">This Month</SelectItem>
            <SelectItem value="all" data-testid="option-all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {extraFilters}

      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="ml-auto"
          data-testid="button-refresh"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      )}
    </div>
  );
}
