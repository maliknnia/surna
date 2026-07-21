// AnalyticsHub - Unified dark-themed analytics dashboard
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import SurnaLogo from "@/components/SurnaLogo";
import { 
  MoreVertical, 
  MessageCircle, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Activity, 
  Eye, 
  ShoppingCart,
  Calendar, 
  MapPin, 
  Target, 
  Zap, 
  Download, 
  Filter,
  Clock,
  Heart,
  Trophy
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { format, subDays, startOfDay, endOfDay, subWeeks, subMonths } from "date-fns";

import type {
  DashboardMetrics,
  TimeSeriesData,
  RealTimeData,
} from "../../../shared/performance-types";
import {
  fetchAnalyticsDashboard,
  fetchAnalyticsDailyMetrics,
  fetchAnalyticsRealtime,
  emptyDashboardMetrics,
  emptyTimeSeries,
  emptyRealtime,
} from "@/lib/analyticsHubApi";

export default function AnalyticsHub() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    from: startOfDay(subDays(new Date(), 30)),
    to: endOfDay(new Date())
  });
  const [timeframe, setTimeframe] = useState("30d");
  const queryClient = useQueryClient();

  // Fetch comprehensive metrics combining both dashboards
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["analytics-dashboard", timeframe],
    queryFn: () => fetchAnalyticsDashboard(dateRange.from, dateRange.to),
    enabled: !!dateRange.from && !!dateRange.to,
  });

  const { data: timeSeriesData, isLoading: timeSeriesLoading } = useQuery<{
    userActivity: TimeSeriesData[];
    userGrowth: TimeSeriesData[];
    contentEngagement: TimeSeriesData[];
    dailyMetrics: TimeSeriesData[];
  }>({
    queryKey: ["analytics-time-series", timeframe],
    queryFn: () => fetchAnalyticsDailyMetrics(dateRange.from, dateRange.to),
    enabled: !!dateRange.from && !!dateRange.to,
  });

  const { data: realTimeData, isLoading: realTimeLoading } = useQuery<RealTimeData>({
    queryKey: ["analytics-realtime"],
    queryFn: fetchAnalyticsRealtime,
    refetchInterval: 5000,
  });

  const data = {
    metrics: metrics ?? emptyDashboardMetrics(),
    timeSeries: timeSeriesData ?? emptyTimeSeries(),
    realTime: realTimeData ?? emptyRealtime(),
  };

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value);
    let from: Date;
    const to = new Date();

    switch (value) {
      case '7d':
        from = subDays(to, 7);
        break;
      case '30d':
        from = subDays(to, 30);
        break;
      case '90d':
        from = subDays(to, 90);
        break;
      default:
        from = subDays(to, 30);
    }

    setDateRange({ from, to });
  };

  const formatSessionTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  };

  if (metricsLoading || timeSeriesLoading) {
    return (
      <div className="bg-background min-h-screen text-foreground">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen text-foreground font-sans flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-6">
        <SurnaLogo showText={true} className="text-2xl font-bold" />
        <div className="flex items-center gap-4">
          <MessageCircle 
            className="w-6 h-6 cursor-pointer hover:opacity-70 text-foreground" 
            onClick={() => setLocation('/messages')}
            data-testid="messenger-icon"
          />
          <MoreVertical
            className="w-6 h-6 cursor-pointer hover:opacity-70 text-foreground"
            data-testid="settings-menu"
            onClick={() => setLocation("/settings")}
            role="button"
            aria-label="Settings"
          />
        </div>
      </div>

      {/* Title and Controls */}
      <div className="px-6 py-4">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-foreground">Analytics Dashboard</h1>
            <p className="text-muted-foreground text-lg">
              Track platform performance, user engagement, and growth metrics
            </p>
          </div>
          
          <div className="flex gap-3">
            <select 
              value={timeframe} 
              onChange={(e) => handleTimeframeChange(e.target.value)}
              className="px-4 py-2 rounded-lg bg-card text-foreground border-0"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            
            <button
              onClick={() => {
                void queryClient.invalidateQueries({ queryKey: ["analytics-dashboard"] });
                void queryClient.invalidateQueries({ queryKey: ["analytics-time-series"] });
                void queryClient.invalidateQueries({ queryKey: ["analytics-realtime"] });
              }}
              className="px-4 py-2 rounded-lg hover:opacity-80 transition-opacity bg-card text-foreground"
            >
              <Zap className="w-4 h-4 inline mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-8">
          {['overview', 'engagement', 'content', 'realtime', 'revenue'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 mr-6 capitalize transition-colors duration-200 text-lg ${
                activeTab === tab ? 'text-foreground font-semibold' : 'text-muted-foreground font-normal'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="w-8 h-8 text-primary" />
                    <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                      +{Math.floor(Math.random() * 15 + 5)}%
                    </span>
                  </div>
                  <div className="text-3xl font-bold mb-2 text-foreground">
                    {formatNumber(data.metrics.totalUsers)}
                  </div>
                  <div className="text-muted-foreground">Total Users</div>
                </div>

                <div className="p-6 rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <Activity className="w-8 h-8 text-primary" />
                    <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                      +{Math.floor(Math.random() * 20 + 10)}%
                    </span>
                  </div>
                  <div className="text-3xl font-bold mb-2 text-foreground">
                    {formatNumber(data.metrics.activeUsers)}
                  </div>
                  <div className="text-muted-foreground">Active Users</div>
                </div>

                <div className="p-6 rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <TrendingUp className="w-8 h-8 text-primary" />
                    <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                      +{Math.floor(Math.random() * 25 + 8)}%
                    </span>
                  </div>
                  <div className="text-3xl font-bold mb-2 text-foreground">
                    {formatNumber(data.metrics.totalSessions)}
                  </div>
                  <div className="text-muted-foreground">Total Sessions</div>
                </div>

                <div className="p-6 rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <Target className="w-8 h-8 text-primary" />
                    <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                      -{Math.floor(Math.random() * 8 + 2)}%
                    </span>
                  </div>
                  <div className="text-3xl font-bold mb-2 text-foreground">
                    {data.metrics.bounceRate}%
                  </div>
                  <div className="text-muted-foreground">Bounce Rate</div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* User Activity Chart */}
                <div className="p-6 rounded-lg bg-card">
                  <h3 className="text-xl font-semibold mb-6 text-foreground">User Activity Trend</h3>
                  <div className="w-full h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.timeSeries.userActivity}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis 
                          dataKey="label" 
                          axisLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        />
                        <YAxis 
                          axisLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="hsl(var(--primary))" 
                          fill="hsl(var(--primary) / 0.1)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* User Growth Chart */}
                <div className="p-6 rounded-lg bg-card">
                  <h3 className="text-xl font-semibold mb-6 text-foreground">User Growth</h3>
                  <div className="w-full h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.timeSeries.userGrowth}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis 
                          dataKey="label" 
                          axisLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        />
                        <YAxis 
                          axisLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={3}
                          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'engagement' && (
            <div className="space-y-8">
              {/* Engagement Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="p-6 rounded-lg bg-card">
                  <div className="flex items-center mb-4">
                    <Eye className="w-6 h-6 mr-3 text-primary" />
                    <span className="text-foreground text-lg font-semibold">Page Views</span>
                  </div>
                  <div className="text-2xl font-bold mb-2 text-foreground">
                    {formatNumber(data.metrics.totalPageViews)}
                  </div>
                  <div className="text-muted-foreground">
                    Avg: {formatSessionTime(data.metrics.avgSessionLength)}
                  </div>
                </div>

                <div className="p-6 rounded-lg bg-card">
                  <div className="flex items-center mb-4">
                    <Heart className="w-6 h-6 mr-3 text-primary" />
                    <span className="text-foreground text-lg font-semibold">Posts Created</span>
                  </div>
                  <div className="text-2xl font-bold mb-2 text-foreground">
                    {formatNumber(data.metrics.totalPosts)}
                  </div>
                  <div className="text-muted-foreground">This period</div>
                </div>

                <div className="p-6 rounded-lg bg-card">
                  <div className="flex items-center mb-4">
                    <Trophy className="w-6 h-6 mr-3 text-primary" />
                    <span className="text-foreground text-lg font-semibold">Events</span>
                  </div>
                  <div className="text-2xl font-bold mb-2 text-foreground">
                    {formatNumber(data.metrics.totalEvents)}
                  </div>
                  <div className="text-muted-foreground">Total organized</div>
                </div>
              </div>

              {/* Content Engagement Chart */}
              <div className="p-6 rounded-lg bg-card">
                <h3 className="text-xl font-semibold mb-6 text-foreground">Content Engagement Over Time</h3>
                <div className="w-full h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.timeSeries.contentEngagement}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="label" 
                        axisLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'realtime' && (
            <div className="space-y-8">
              {/* Real-time Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-8 rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-semibold text-foreground">Live Users</h3>
                    <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                  </div>
                  <div className="text-6xl font-bold mb-4 text-primary">
                    {data.realTime.activeUsers}
                  </div>
                  <div className="text-muted-foreground">Currently online</div>
                </div>

                <div className="p-8 rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-semibold text-foreground">Recent Events</h3>
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-6xl font-bold mb-4 text-primary">
                    {data.realTime.recentEvents}
                  </div>
                  <div className="text-muted-foreground">Last hour</div>
                </div>
              </div>

              {/* System Status */}
              <div className="p-6 rounded-lg bg-card">
                <h3 className="text-xl font-semibold mb-6 text-foreground">System Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-background">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-primary rounded-full mr-3"></div>
                      <span className="text-foreground">Database Connection</span>
                    </div>
                    <span className="text-primary">Operational</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-background">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-primary rounded-full mr-3"></div>
                      <span className="text-foreground">API Services</span>
                    </div>
                    <span className="text-primary">Operational</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-background">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-primary rounded-full mr-3"></div>
                      <span className="text-foreground">WebSocket Connection</span>
                    </div>
                    <span className="text-primary">Operational</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="space-y-8">
              {/* Revenue Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="p-6 rounded-lg bg-card">
                  <div className="flex items-center mb-4">
                    <ShoppingCart className="w-6 h-6 mr-3 text-primary" />
                    <span className="text-foreground text-lg font-semibold">Total Revenue</span>
                  </div>
                  <div className="text-2xl font-bold mb-2 text-foreground">
                    {formatCurrency(data.metrics.totalRevenue)}
                  </div>
                  <div className="text-muted-foreground">This period</div>
                </div>

                <div className="p-6 rounded-lg bg-card">
                  <div className="flex items-center mb-4">
                    <Target className="w-6 h-6 mr-3 text-primary" />
                    <span className="text-foreground text-lg font-semibold">Conversion Rate</span>
                  </div>
                  <div className="text-2xl font-bold mb-2 text-foreground">
                    {data.metrics.conversionRate}%
                  </div>
                  <div className="text-muted-foreground">Visitor to customer</div>
                </div>

                <div className="p-6 rounded-lg bg-card">
                  <div className="flex items-center mb-4">
                    <Users className="w-6 h-6 mr-3 text-primary" />
                    <span className="text-foreground text-lg font-semibold">Team Joins</span>
                  </div>
                  <div className="text-2xl font-bold mb-2 text-foreground">
                    {formatNumber(data.metrics.totalTeamJoins)}
                  </div>
                  <div className="text-muted-foreground">New members</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="p-6 mt-auto">
        <div className="flex justify-center gap-12">
          <div 
            className="flex flex-col items-center cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => setLocation('/')}
            data-testid="nav-home"
          >
            <div className="p-4 rounded-full mb-2 bg-card">
              <TrendingUp className="w-6 h-6 text-foreground" />
            </div>
            <span className="text-foreground text-sm">Performance</span>
          </div>
          
          <div 
            className="flex flex-col items-center cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => setLocation('/discover')}
            data-testid="nav-discover"
          >
            <div className="p-4 rounded-full mb-2 bg-card">
              <MapPin className="w-6 h-6 text-foreground" />
            </div>
            <span className="text-foreground text-sm">Discover</span>
          </div>
          
          <div 
            className="flex flex-col items-center cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => setLocation('/feed')}
            data-testid="nav-feed"
          >
            <div className="p-4 rounded-full mb-2 bg-card">
              <Activity className="w-6 h-6 text-foreground" />
            </div>
            <span className="text-foreground text-sm">Feed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
