import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useParams } from "wouter";
import { StatCard } from "@/components/analytics/StatCard";
import { FiltersBar, Period } from "@/components/analytics/FiltersBar";
import { BarChart } from "@/components/analytics/BarChart";
import { RadialProgress } from "@/components/analytics/RadialProgress";
import { LeaderboardTable } from "@/components/analytics/LeaderboardTable";
import { Users, Ticket, DollarSign, Heart, MessageCircle, TrendingUp } from "lucide-react";

interface EventRollup {
  eventId: string;
  attendees: number;
  ticketsSold: number;
  revenue: number;
  avgTicketPrice: number;
  checkIns: number;
  checkInRate: number;
  shares: number;
  likes: number;
  comments: number;
  profileViews: number;
  waitlistSize: number;
}

export default function EventAnalytics() {
  const params = useParams();
  const eventId = params.id || "";
  const [period, setPeriod] = useState<Period>("all");

  const { data: rollup, isLoading, refetch } = useQuery<EventRollup>({
    queryKey: ['/api/analytics/event', eventId, period],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/event/${eventId}?period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch event analytics');
      return response.json();
    },
    enabled: !!eventId,
  });

  const attendeeTypes = [
    { type: "Checked In", count: rollup?.checkIns || 0 },
    { type: "Registered", count: (rollup?.attendees || 0) - (rollup?.checkIns || 0) },
    { type: "Waitlist", count: rollup?.waitlistSize || 0 },
  ];

  const topAttendeesData = [
    { rank: 1, id: "1", name: "Alex Johnson", value: "VIP", subtitle: "Early Bird", imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" },
    { rank: 2, id: "2", name: "Sarah Williams", value: "Premium", subtitle: "Attendee", imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" },
    { rank: 3, id: "3", name: "Mike Chen", value: "Standard", subtitle: "Attendee", imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike" },
    { rank: 4, id: "4", name: "Emma Davis", value: "Standard", subtitle: "Attendee", imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma" },
    { rank: 5, id: "5", name: "James Wilson", value: "Standard", subtitle: "Attendee", imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=James" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#000000] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Event Analytics</h1>
          <p className="text-muted-foreground mt-2">Track event performance and attendee engagement</p>
        </div>

        <FiltersBar
          period={period}
          onPeriodChange={setPeriod}
          onRefresh={() => refetch()}
          loading={isLoading}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Attendees"
            value={rollup?.attendees || 0}
            icon={<Users />}
            loading={isLoading}
            data-testid="stat-attendees"
          />
          <StatCard
            title="Tickets Sold"
            value={rollup?.ticketsSold || 0}
            icon={<Ticket />}
            loading={isLoading}
            data-testid="stat-tickets"
          />
          <StatCard
            title="Total Revenue"
            value={`€${rollup?.revenue || 0}`}
            icon={<DollarSign />}
            loading={isLoading}
            data-testid="stat-revenue"
          />
          <StatCard
            title="Check-In Rate"
            value={`${rollup?.checkInRate || 0}%`}
            icon={<TrendingUp />}
            loading={isLoading}
            data-testid="stat-checkin-rate"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Profile Views"
            value={rollup?.profileViews || 0}
            icon={<Users />}
            loading={isLoading}
          />
          <StatCard
            title="Likes"
            value={rollup?.likes || 0}
            icon={<Heart />}
            loading={isLoading}
          />
          <StatCard
            title="Comments"
            value={rollup?.comments || 0}
            icon={<MessageCircle />}
            loading={isLoading}
          />
          <StatCard
            title="Avg Ticket Price"
            value={`€${rollup?.avgTicketPrice || 0}`}
            icon={<DollarSign />}
            loading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RadialProgress
            title="Check-In Progress"
            value={rollup?.checkIns || 0}
            max={rollup?.attendees || 100}
            label="Checked In"
            color="#3b82f6"
            loading={isLoading}
          />

          <BarChart
            title="Attendee Status"
            data={attendeeTypes}
            xKey="type"
            bars={[
              { key: "count", label: "Count", color: "#000000" },
            ]}
            loading={isLoading}
          />
        </div>

        <LeaderboardTable
          title="Top Attendees"
          entries={topAttendeesData}
          valueLabel="Ticket Type"
          loading={isLoading}
        />
      </div>
    </div>
  );
}
