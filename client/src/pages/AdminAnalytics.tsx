import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/analytics/StatCard";
import { FiltersBar, Period } from "@/components/analytics/FiltersBar";
import { LineChart } from "@/components/analytics/LineChart";
import { BarChart } from "@/components/analytics/BarChart";
import { LeaderboardTable } from "@/components/analytics/LeaderboardTable";
import { RadialProgress } from "@/components/analytics/RadialProgress";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  ShoppingCart, 
  Calendar,
  MapPin,
  Award,
  Heart,
  MessageCircle 
} from "lucide-react";

interface GlobalRollup {
  period: Period;
  periodStart: Date;
  activeUsers: number;
  newUsers: number;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalMessages: number;
  totalTeams: number;
  totalEvents: number;
  totalPlaces: number;
  marketplaceRevenue: number;
  marketplacePurchases: number;
  avgOrderValue: number;
  totalProducts: number;
}

export default function AdminAnalytics() {
  const [period, setPeriod] = useState<Period>("week");

  const { data: rollup, isLoading, refetch } = useQuery<GlobalRollup>({
    queryKey: ['/api/analytics/global', period],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/global?period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch global analytics');
      return response.json();
    },
  });

  const mockTimeSeriesData = [
    { date: "Mon", users: 1240, posts: 328, revenue: 4580 },
    { date: "Tue", users: 1350, posts: 412, revenue: 5240 },
    { date: "Wed", users: 1280, posts: 385, revenue: 4920 },
    { date: "Thu", users: 1420, posts: 451, revenue: 5680 },
    { date: "Fri", users: 1560, posts: 498, revenue: 6320 },
    { date: "Sat", users: 1680, posts: 542, revenue: 7100 },
    { date: "Sun", users: 1520, posts: 487, revenue: 6550 },
  ];

  const moduleActivity = [
    { module: "Social", activity: rollup?.totalPosts || 0 },
    { module: "Teams", activity: rollup?.totalTeams || 0 },
    { module: "Events", activity: rollup?.totalEvents || 0 },
    { module: "Marketplace", activity: rollup?.marketplacePurchases || 0 },
    { module: "Places", activity: rollup?.totalPlaces || 0 },
  ];

  const topUsers = [
    { rank: 1, id: "1", name: "Alex Johnson", value: "2,450", subtitle: "Most Active" },
    { rank: 2, id: "2", name: "Sarah Williams", value: "2,180", subtitle: "Top Contributor" },
    { rank: 3, id: "3", name: "Mike Chen", value: "1,920", subtitle: "Rising Star" },
    { rank: 4, id: "4", name: "Emma Davis", value: "1,680", subtitle: "Consistent" },
    { rank: 5, id: "5", name: "James Wilson", value: "1,450", subtitle: "Engaged" },
  ];

  const topTeams = [
    { rank: 1, id: "1", name: "Champions United", value: "485", subtitle: "Most Members" },
    { rank: 2, id: "2", name: "Elite Athletes", value: "412", subtitle: "Top Performers" },
    { rank: 3, id: "3", name: "Pro League", value: "368", subtitle: "High Activity" },
    { rank: 4, id: "4", name: "Rising Stars", value: "294", subtitle: "Growing Fast" },
    { rank: 5, id: "5", name: "Veterans Club", value: "256", subtitle: "Established" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#000000] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Platform Analytics</h1>
          <p className="text-muted-foreground mt-2">Global KPIs and system health metrics</p>
        </div>

        <FiltersBar
          period={period}
          onPeriodChange={setPeriod}
          onRefresh={() => refetch()}
          loading={isLoading}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Users"
            value={rollup?.activeUsers || 0}
            icon={<Users />}
            loading={isLoading}
            data-testid="stat-active-users"
          />
          <StatCard
            title="New Users"
            value={rollup?.newUsers || 0}
            icon={<TrendingUp />}
            loading={isLoading}
            data-testid="stat-new-users"
          />
          <StatCard
            title="Total Posts"
            value={rollup?.totalPosts || 0}
            icon={<Activity />}
            loading={isLoading}
            data-testid="stat-posts"
          />
          <StatCard
            title="Marketplace Revenue"
            value={`€${rollup?.marketplaceRevenue || 0}`}
            icon={<DollarSign />}
            loading={isLoading}
            data-testid="stat-revenue"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Teams"
            value={rollup?.totalTeams || 0}
            icon={<Users />}
            loading={isLoading}
          />
          <StatCard
            title="Total Events"
            value={rollup?.totalEvents || 0}
            icon={<Calendar />}
            loading={isLoading}
          />
          <StatCard
            title="Total Places"
            value={rollup?.totalPlaces || 0}
            icon={<MapPin />}
            loading={isLoading}
          />
          <StatCard
            title="Marketplace Purchases"
            value={rollup?.marketplacePurchases || 0}
            icon={<ShoppingCart />}
            loading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Likes"
            value={rollup?.totalLikes || 0}
            icon={<Heart />}
            loading={isLoading}
          />
          <StatCard
            title="Total Comments"
            value={rollup?.totalComments || 0}
            icon={<MessageCircle />}
            loading={isLoading}
          />
          <StatCard
            title="Total Messages"
            value={rollup?.totalMessages || 0}
            icon={<MessageCircle />}
            loading={isLoading}
          />
          <StatCard
            title="Avg Order Value"
            value={`€${rollup?.avgOrderValue || 0}`}
            icon={<DollarSign />}
            loading={isLoading}
          />
        </div>

        <LineChart
          title="Platform Growth"
          data={mockTimeSeriesData}
          xKey="date"
          lines={[
            { key: "users", label: "Active Users", color: "#000000" },
            { key: "posts", label: "Posts", color: "#3b82f6" },
            { key: "revenue", label: "Revenue (€)", color: "#10b981" },
          ]}
          loading={isLoading}
          height={350}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChart
            title="Module Activity"
            data={moduleActivity}
            xKey="module"
            bars={[
              { key: "activity", label: "Activity Count", color: "#000000" },
            ]}
            loading={isLoading}
          />

          <RadialProgress
            title="User Engagement"
            value={rollup?.activeUsers || 0}
            max={(rollup?.activeUsers || 0) + (rollup?.newUsers || 1)}
            label="Active vs Total"
            color="#10b981"
            loading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LeaderboardTable
            title="Top Users"
            entries={topUsers}
            valueLabel="Activity Points"
            loading={isLoading}
          />

          <LeaderboardTable
            title="Top Teams"
            entries={topTeams}
            valueLabel="Members"
            loading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
