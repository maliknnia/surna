// Interactive User Activity Heatmap Component
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, Clock, Users, TrendingUp, Calendar, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeatmapData {
  hour: number;
  day: string;
  value: number;
  activities: {
    posts: number;
    likes: number;
    comments: number;
    logins: number;
    events: number;
  };
}

interface ActivityHeatmapProps {
  timeframe?: string;
  activityType?: string;
  className?: string;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const ACTIVITY_TYPES = [
  { value: 'all', label: 'All Activities', icon: Activity },
  { value: 'posts', label: 'Posts', icon: TrendingUp },
  { value: 'likes', label: 'Likes', icon: Users },
  { value: 'comments', label: 'Comments', icon: Clock },
  { value: 'logins', label: 'Logins', icon: Users },
  { value: 'events', label: 'Events', icon: Calendar },
];

export function ActivityHeatmap({ timeframe = '7d', activityType = 'all', className }: ActivityHeatmapProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [selectedActivityType, setSelectedActivityType] = useState(activityType);
  const [hoveredCell, setHoveredCell] = useState<{ hour: number; day: string } | null>(null);

  // Fetch heatmap data
  const { data: heatmapData, isLoading } = useQuery<HeatmapData[]>({
    queryKey: ['/api/analytics/heatmap', selectedTimeframe, selectedActivityType],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Calculate intensity levels for color coding
  const getIntensityLevel = (value: number, maxValue: number): number => {
    if (maxValue === 0) return 0;
    const percentage = (value / maxValue) * 100;
    if (percentage === 0) return 0;
    if (percentage <= 25) return 1;
    if (percentage <= 50) return 2;
    if (percentage <= 75) return 3;
    return 4;
  };

  const getIntensityColor = (level: number): string => {
    const colors = [
      'bg-transparent border border-border', // 0 - no activity
      'bg-token-accent/20', // 1 - low
      'bg-token-accent/40', // 2 - medium
      'bg-token-accent/70', // 3 - high
      'bg-token-accent', // 4 - very high
    ];
    return colors[level] || colors[0];
  };

  const maxValue = heatmapData ? Math.max(...heatmapData.map(d => d.value)) : 0;

  const getDataForCell = (hour: number, day: string): HeatmapData | undefined => {
    return heatmapData?.find(d => d.hour === hour && d.day === day);
  };

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  const getTotalActivityForDay = (day: string): number => {
    return heatmapData?.filter(d => d.day === day).reduce((sum, d) => sum + d.value, 0) || 0;
  };

  const getTotalActivityForHour = (hour: number): number => {
    return heatmapData?.filter(d => d.hour === hour).reduce((sum, d) => sum + d.value, 0) || 0;
  };

  if (isLoading) {
    return (
      <Card className={className} data-testid="activity-heatmap-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            User Activity Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 rounded-full bg-gradient-to-r from-background to-token-accent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={className} data-testid="activity-heatmap">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                User Activity Heatmap
              </CardTitle>
              <CardDescription>
                Visual representation of user activity patterns by time and day
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={selectedActivityType} onValueChange={setSelectedActivityType}>
                <SelectTrigger className="w-40" data-testid="activity-type-selector">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger className="w-32" data-testid="timeframe-selector">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Legend */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map(level => (
                  <div
                    key={level}
                    className={cn("w-3 h-3 rounded-sm", getIntensityColor(level))}
                  />
                ))}
              </div>
              <span>More</span>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="outline">
                Max: {maxValue} activities
              </Badge>
              {hoveredCell && (
                <Badge variant="secondary">
                  {hoveredCell.day} {formatHour(hoveredCell.hour)}
                </Badge>
              )}
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="space-y-4" data-testid="heatmap-grid">
            {/* Time labels */}
            <div className="flex">
              <div className="w-20"></div>
              <div className="flex-1 grid grid-cols-24 gap-1">
                {HOURS.map(hour => (
                  <div
                    key={hour}
                    className="text-xs text-center text-muted-foreground py-1"
                    style={{ fontSize: '10px' }}
                  >
                    {hour % 6 === 0 ? formatHour(hour).split(' ')[0] : ''}
                  </div>
                ))}
              </div>
              <div className="w-16 text-xs text-center text-muted-foreground">Total</div>
            </div>

            {/* Heatmap rows */}
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="flex items-center">
                <div className="w-20 text-sm font-medium text-right pr-3">{day.slice(0, 3)}</div>
                <div className="flex-1 grid grid-cols-24 gap-1">
                  {HOURS.map(hour => {
                    const cellData = getDataForCell(hour, day);
                    const value = cellData?.value || 0;
                    const intensityLevel = getIntensityLevel(value, maxValue);
                    
                    return (
                      <Tooltip key={hour}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "h-4 w-4 rounded-sm cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-blue-400",
                              getIntensityColor(intensityLevel)
                            )}
                            onMouseEnter={() => setHoveredCell({ hour, day })}
                            onMouseLeave={() => setHoveredCell(null)}
                            data-testid={`heatmap-cell-${day}-${hour}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-2">
                            <div className="font-semibold">
                              {day}, {formatHour(hour)}
                            </div>
                            <div className="text-sm">
                              <div>Total Activities: {value}</div>
                              {cellData && selectedActivityType === 'all' && (
                                <div className="mt-2 space-y-1">
                                  <div>Posts: {cellData.activities.posts}</div>
                                  <div>Likes: {cellData.activities.likes}</div>
                                  <div>Comments: {cellData.activities.comments}</div>
                                  <div>Logins: {cellData.activities.logins}</div>
                                  <div>Events: {cellData.activities.events}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
                <div className="w-16 text-center text-sm font-medium">
                  {getTotalActivityForDay(day)}
                </div>
              </div>
            ))}

            {/* Hour totals */}
            <div className="flex items-center">
              <div className="w-20 text-sm font-medium text-right pr-3">Total</div>
              <div className="flex-1 grid grid-cols-24 gap-1">
                {HOURS.map(hour => (
                  <div key={hour} className="text-xs text-center font-medium py-1">
                    {getTotalActivityForHour(hour)}
                  </div>
                ))}
              </div>
              <div className="w-16 text-center text-sm font-bold">
                {heatmapData?.reduce((sum, d) => sum + d.value, 0) || 0}
              </div>
            </div>
          </div>

          {/* Activity Summary */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="activity-summary">
            <div className="text-center p-3 bg-transparent border border-border rounded-lg">
              <div className="text-2xl font-bold text-token-accent">
                {Math.max(...HOURS.map(getTotalActivityForHour))}
              </div>
              <div className="text-sm text-muted-foreground">Peak Hour Activity</div>
            </div>
            
            <div className="text-center p-3 bg-transparent border border-border rounded-lg">
              <div className="text-2xl font-bold text-token-accent">
                {Math.max(...DAYS_OF_WEEK.map(getTotalActivityForDay))}
              </div>
              <div className="text-sm text-muted-foreground">Peak Day Activity</div>
            </div>
            
            <div className="text-center p-3 bg-transparent border border-border rounded-lg">
              <div className="text-2xl font-bold text-token-accent">
                {HOURS.find(hour => getTotalActivityForHour(hour) === Math.max(...HOURS.map(getTotalActivityForHour))) || 0}:00
              </div>
              <div className="text-sm text-muted-foreground">Peak Hour</div>
            </div>
            
            <div className="text-center p-3 bg-transparent border border-border rounded-lg">
              <div className="text-2xl font-bold text-token-accent">
                {DAYS_OF_WEEK.find(day => getTotalActivityForDay(day) === Math.max(...DAYS_OF_WEEK.map(getTotalActivityForDay))) || 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">Peak Day</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}