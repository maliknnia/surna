import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { StatCard } from "@/components/analytics/StatCard";
import { FiltersBar, Period } from "@/components/analytics/FiltersBar";
import { LineChart } from "@/components/analytics/LineChart";
import { BarChart } from "@/components/analytics/BarChart";
import { LeaderboardTable } from "@/components/analytics/LeaderboardTable";
import { Users, Award, Calendar, MessageCircle, Heart, Activity } from "lucide-react";

interface TeamRollup {
  teamId: string;
  period: Period;
  periodStart: Date;
  members: number;
  posts: number;
  likes: number;
  comments: number;
  profileViews: number;
  eventsCreated: number;
  eventsAttended: number;
  matchesPlayed: number;
  matchesWon: number;
  winRate: number;
  engagementRate: number;
}

export default function TeamAnalytics() {
  const params = useParams();
  const teamId = params.id || "";
  const [period, setPeriod] = useState<Period>("week");

  const { data: rollup, isLoading, refetch } = useQuery<TeamRollup>({
    queryKey: ['/api/analytics/team', teamId, period],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/team/${teamId}?period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch team analytics');
      return response.json();
    },
    enabled: !!teamId,
  });

  const mockTimeSeriesData = [
    { date: "Mon", posts: 5, likes: 28, comments: 12, members: 18 },
    { date: "Tue", posts: 7, likes: 35, comments: 18, members: 19 },
    { date: "Wed", posts: 4, likes: 31, comments: 14, members: 19 },
    { date: "Thu", posts: 8, likes: 42, comments: 22, members: 21 },
    { date: "Fri", posts: 6, likes: 38, comments: 16, members: 21 },
    { date: "Sat", posts: 9, likes: 51, comments: 28, members: 23 },
    { date: "Sun", posts: 7, likes: 45, comments: 20, members: 23 },
  ];

  const topMembers = [
    { rank: 1, id: "1", name: "Alex Johnson", value: 145, subtitle: "Most Active", imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" },
    { rank: 2, id: "2", name: "Sarah Williams", value: 128, subtitle: "Top Contributor", imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" },
    { rank: 3, id: "3", name: "Mike Chen", value: 112, subtitle: "Rising Star", imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike" },
    { rank: 4, id: "4", name: "Emma Davis", value: 98, subtitle: "Consistent", imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma" },
    { rank: 5, id: "5", name: "James Wilson", value: 87, subtitle: "Engaged", imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=James" },
  ];

  const performanceData = [
    { metric: "Matches Won", value: rollup?.matchesWon || 0 },
    { metric: "Matches Played", value: rollup?.matchesPlayed || 0 },
    { metric: "Events Created", value: rollup?.eventsCreated || 0 },
    { metric: "Events Attended", value: rollup?.eventsAttended || 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#000000] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Team Analytics</h1>
          <p className="text-muted-foreground mt-2">Track team performance and member engagement</p>
        </div>

        <FiltersBar
          period={period}
          onPeriodChange={setPeriod}
          onRefresh={() => refetch()}
          loading={isLoading}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Members"
            value={rollup?.members || 0}
            icon={<Users />}
            loading={isLoading}
            data-testid="stat-members"
          />
          <StatCard
            title="Posts"
            value={rollup?.posts || 0}
            icon={<Activity />}
            loading={isLoading}
            data-testid="stat-posts"
          />
          <StatCard
            title="Engagement Rate"
            value={`${rollup?.engagementRate || 0}%`}
            icon={<Heart />}
            loading={isLoading}
            data-testid="stat-engagement"
          />
          <StatCard
            title="Win Rate"
            value={`${rollup?.winRate || 0}%`}
            icon={<Award />}
            loading={isLoading}
            data-testid="stat-win-rate"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Matches Won"
            value={rollup?.matchesWon || 0}
            icon={<Award />}
            loading={isLoading}
          />
          <StatCard
            title="Matches Played"
            value={rollup?.matchesPlayed || 0}
            icon={<Calendar />}
            loading={isLoading}
          />
          <StatCard
            title="Events Created"
            value={rollup?.eventsCreated || 0}
            icon={<Calendar />}
            loading={isLoading}
          />
          <StatCard
            title="Total Likes"
            value={rollup?.likes || 0}
            icon={<Heart />}
            loading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LineChart
            title="Team Growth & Engagement"
            data={mockTimeSeriesData}
            xKey="date"
            lines={[
              { key: "members", label: "Members", color: "#000000" },
              { key: "posts", label: "Posts", color: "#3b82f6" },
              { key: "likes", label: "Likes", color: "#ec4899" },
            ]}
            loading={isLoading}
          />

          <BarChart
            title="Team Performance"
            data={performanceData}
            xKey="metric"
            bars={[
              { key: "value", label: "Count", color: "#000000" },
            ]}
            loading={isLoading}
          />
        </div>

        <LeaderboardTable
          title="Top Contributors"
          entries={topMembers}
          valueLabel="Points"
          loading={isLoading}
        />
      </div>
    </div>
  );
}
