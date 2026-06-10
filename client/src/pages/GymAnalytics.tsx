import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { StatCard } from "@/components/analytics/StatCard";
import { FiltersBar, Period } from "@/components/analytics/FiltersBar";
import { LineChart } from "@/components/analytics/LineChart";
import { BarChart } from "@/components/analytics/BarChart";
import { RadialProgress } from "@/components/analytics/RadialProgress";
import { Users, Calendar, DollarSign, Star, TrendingUp, Target } from "lucide-react";

interface GymRollup {
  gymId: string;
  period: Period;
  periodStart: Date;
  members: number;
  bookings: number;
  revenue: number;
  avgBookingValue: number;
  checkIns: number;
  eventsHosted: number;
  reviews: number;
  avgRating: number;
  profileViews: number;
  peakHourUtilization: number;
}

export default function GymAnalytics() {
  const params = useParams();
  const gymId = params.id || "";
  const [period, setPeriod] = useState<Period>("week");

  const { data: rollup, isLoading, refetch } = useQuery<GymRollup>({
    queryKey: ['/api/analytics/gym', gymId, period],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/gym/${gymId}?period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch gym analytics');
      return response.json();
    },
    enabled: !!gymId,
  });

  const mockTimeSeriesData = [
    { date: "Mon", bookings: 12, checkIns: 48, revenue: 840 },
    { date: "Tue", bookings: 15, checkIns: 56, revenue: 1050 },
    { date: "Wed", bookings: 18, checkIns: 62, revenue: 1260 },
    { date: "Thu", bookings: 14, checkIns: 51, revenue: 980 },
    { date: "Fri", bookings: 22, checkIns: 73, revenue: 1540 },
    { date: "Sat", bookings: 28, checkIns: 91, revenue: 1960 },
    { date: "Sun", bookings: 24, checkIns: 81, revenue: 1680 },
  ];

  const utilizationData = [
    { hour: "6AM", utilization: 45 },
    { hour: "9AM", utilization: 68 },
    { hour: "12PM", utilization: 52 },
    { hour: "3PM", utilization: 38 },
    { hour: "6PM", utilization: 85 },
    { hour: "9PM", utilization: 42 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#000000] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Gym Analytics</h1>
          <p className="text-muted-foreground mt-2">Track facility performance and member engagement</p>
        </div>

        <FiltersBar
          period={period}
          onPeriodChange={setPeriod}
          onRefresh={() => refetch()}
          loading={isLoading}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Members"
            value={rollup?.members || 0}
            icon={<Users />}
            loading={isLoading}
            data-testid="stat-members"
          />
          <StatCard
            title="Total Bookings"
            value={rollup?.bookings || 0}
            icon={<Calendar />}
            loading={isLoading}
            data-testid="stat-bookings"
          />
          <StatCard
            title="Revenue"
            value={`€${rollup?.revenue || 0}`}
            icon={<DollarSign />}
            loading={isLoading}
            data-testid="stat-revenue"
          />
          <StatCard
            title="Average Rating"
            value={rollup?.avgRating ? `${rollup.avgRating}/5` : "N/A"}
            icon={<Star />}
            loading={isLoading}
            data-testid="stat-rating"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Check-Ins"
            value={rollup?.checkIns || 0}
            icon={<TrendingUp />}
            loading={isLoading}
          />
          <StatCard
            title="Events Hosted"
            value={rollup?.eventsHosted || 0}
            icon={<Calendar />}
            loading={isLoading}
          />
          <StatCard
            title="Profile Views"
            value={rollup?.profileViews || 0}
            icon={<Users />}
            loading={isLoading}
          />
          <StatCard
            title="Avg Booking Value"
            value={`€${rollup?.avgBookingValue || 0}`}
            icon={<DollarSign />}
            loading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RadialProgress
            title="Peak Hour Utilization"
            value={rollup?.peakHourUtilization || 0}
            max={100}
            label="Capacity"
            color="#10b981"
            loading={isLoading}
          />

          <BarChart
            title="Hourly Utilization"
            data={utilizationData}
            xKey="hour"
            bars={[
              { key: "utilization", label: "Utilization %", color: "#10b981" },
            ]}
            loading={isLoading}
          />
        </div>

        <LineChart
          title="Gym Performance Trends"
          data={mockTimeSeriesData}
          xKey="date"
          lines={[
            { key: "bookings", label: "Bookings", color: "#000000" },
            { key: "checkIns", label: "Check-Ins", color: "#3b82f6" },
            { key: "revenue", label: "Revenue (€)", color: "#10b981" },
          ]}
          loading={isLoading}
          height={350}
        />
      </div>
    </div>
  );
}
