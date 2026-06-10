import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { StatCard } from "@/components/analytics/StatCard";
import { FiltersBar, Period } from "@/components/analytics/FiltersBar";
import { LineChart } from "@/components/analytics/LineChart";
import { BarChart } from "@/components/analytics/BarChart";
import { RadialProgress } from "@/components/analytics/RadialProgress";
import { Users, Heart, MessageCircle, ShoppingBag, Activity, Target } from "lucide-react";

interface UserRollup {
  userId: string;
  period: Period;
  periodStart: Date;
  posts: number;
  likes: number;
  comments: number;
  messages: number;
  profileViews: number;
  engagementRate: number;
  purchases: number;
  revenue: number;
  avgOrderValue: number;
  eventsAttended: number;
  teamsJoined: number;
}

export default function UserAnalytics() {
  const params = useParams();
  const userId = params.id || "";
  const [period, setPeriod] = useState<Period>("week");

  const { data: rollup, isLoading, refetch } = useQuery<UserRollup>({
    queryKey: ['/api/analytics/user', userId, period],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/user/${userId}?period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch user analytics');
      return response.json();
    },
    enabled: !!userId,
  });

  const mockTimeSeriesData = [
    { date: "Mon", posts: 2, likes: 15, comments: 8, profileViews: 45 },
    { date: "Tue", posts: 3, likes: 22, comments: 12, profileViews: 62 },
    { date: "Wed", posts: 1, likes: 18, comments: 6, profileViews: 38 },
    { date: "Thu", posts: 4, likes: 31, comments: 15, profileViews: 73 },
    { date: "Fri", posts: 2, likes: 19, comments: 9, profileViews: 51 },
    { date: "Sat", posts: 5, likes: 38, comments: 21, profileViews: 89 },
    { date: "Sun", posts: 3, likes: 25, comments: 14, profileViews: 67 },
  ];

  const activityData = [
    { category: "Posts", count: rollup?.posts || 0 },
    { category: "Comments", count: rollup?.comments || 0 },
    { category: "Messages", count: rollup?.messages || 0 },
    { category: "Likes", count: rollup?.likes || 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#000000] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">User Analytics</h1>
          <p className="text-muted-foreground mt-2">Track your activity and engagement</p>
        </div>

        <FiltersBar
          period={period}
          onPeriodChange={setPeriod}
          onRefresh={() => refetch()}
          loading={isLoading}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Posts"
            value={rollup?.posts || 0}
            icon={<Activity />}
            loading={isLoading}
            data-testid="stat-posts"
          />
          <StatCard
            title="Likes Received"
            value={rollup?.likes || 0}
            icon={<Heart />}
            loading={isLoading}
            data-testid="stat-likes"
          />
          <StatCard
            title="Comments"
            value={rollup?.comments || 0}
            icon={<MessageCircle />}
            loading={isLoading}
            data-testid="stat-comments"
          />
          <StatCard
            title="Profile Views"
            value={rollup?.profileViews || 0}
            icon={<Users />}
            loading={isLoading}
            data-testid="stat-profile-views"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RadialProgress
            title="Engagement Rate"
            value={rollup?.engagementRate || 0}
            max={100}
            label="Engagement"
            color="#000000"
            loading={isLoading}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Events Attended"
              value={rollup?.eventsAttended || 0}
              icon={<Target />}
              loading={isLoading}
            />
            <StatCard
              title="Teams Joined"
              value={rollup?.teamsJoined || 0}
              icon={<Users />}
              loading={isLoading}
            />
            <StatCard
              title="Purchases"
              value={rollup?.purchases || 0}
              icon={<ShoppingBag />}
              loading={isLoading}
            />
            <StatCard
              title="Avg Order Value"
              value={`€${rollup?.avgOrderValue || 0}`}
              icon={<ShoppingBag />}
              loading={isLoading}
            />
          </div>
        </div>

        <LineChart
          title="Activity Over Time"
          data={mockTimeSeriesData}
          xKey="date"
          lines={[
            { key: "posts", label: "Posts", color: "#000000" },
            { key: "likes", label: "Likes", color: "#ec4899" },
            { key: "comments", label: "Comments", color: "#3b82f6" },
            { key: "profileViews", label: "Profile Views", color: "#10b981" },
          ]}
          loading={isLoading}
        />

        <BarChart
          title="Activity Breakdown"
          data={activityData}
          xKey="category"
          bars={[
            { key: "count", label: "Count", color: "#000000" },
          ]}
          loading={isLoading}
        />
      </div>
    </div>
  );
}
