import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/analytics/StatCard";
import { FiltersBar, Period } from "@/components/analytics/FiltersBar";
import { LineChart } from "@/components/analytics/LineChart";
import { BarChart } from "@/components/analytics/BarChart";
import { LeaderboardTable } from "@/components/analytics/LeaderboardTable";
import { DollarSign, ShoppingCart, TrendingUp, Package, Users, Eye } from "lucide-react";

interface MarketplaceRollup {
  period: Period;
  periodStart: Date;
  sellerId?: string | null;
  productId?: string | null;
  views: number;
  purchases: number;
  revenue: number;
  avgOrderValue: number;
  conversionRate: number;
  uniqueBuyers: number;
  cartAdditions: number;
  wishlistAdditions: number;
}

export default function MarketplaceAnalytics() {
  const [period, setPeriod] = useState<Period>("week");
  const [sellerId, setSellerId] = useState<string | undefined>(undefined);

  const { data: rollup, isLoading, refetch } = useQuery<MarketplaceRollup>({
    queryKey: ['/api/analytics/marketplace', period, sellerId],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (sellerId) params.append('sellerId', sellerId);
      const response = await fetch(`/api/analytics/marketplace?${params}`);
      if (!response.ok) throw new Error('Failed to fetch marketplace analytics');
      return response.json();
    },
  });

  const mockTimeSeriesData = [
    { date: "Mon", views: 342, purchases: 12, revenue: 1580 },
    { date: "Tue", views: 428, purchases: 15, revenue: 2140 },
    { date: "Wed", views: 381, purchases: 18, revenue: 2650 },
    { date: "Thu", views: 456, purchases: 14, revenue: 1920 },
    { date: "Fri", views: 523, purchases: 22, revenue: 3100 },
    { date: "Sat", views: 612, purchases: 28, revenue: 3840 },
    { date: "Sun", views: 544, purchases: 24, revenue: 3320 },
  ];

  const topProducts = [
    { rank: 1, id: "1", name: "Premium Basketball", value: "€1,250", subtitle: "42 sold" },
    { rank: 2, id: "2", name: "Running Shoes Pro", value: "€980", subtitle: "35 sold" },
    { rank: 3, id: "3", name: "Yoga Mat Deluxe", value: "€750", subtitle: "28 sold" },
    { rank: 4, id: "4", name: "Protein Powder", value: "€620", subtitle: "24 sold" },
    { rank: 5, id: "5", name: "Resistance Bands", value: "€480", subtitle: "19 sold" },
  ];

  const funnelData = [
    { stage: "Views", count: rollup?.views || 0 },
    { stage: "Cart Adds", count: rollup?.cartAdditions || 0 },
    { stage: "Purchases", count: rollup?.purchases || 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#000000] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Marketplace Analytics</h1>
          <p className="text-muted-foreground mt-2">Track sales performance and customer engagement</p>
        </div>

        <FiltersBar
          period={period}
          onPeriodChange={setPeriod}
          onRefresh={() => refetch()}
          loading={isLoading}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Revenue"
            value={`€${rollup?.revenue || 0}`}
            icon={<DollarSign />}
            loading={isLoading}
            data-testid="stat-revenue"
          />
          <StatCard
            title="Total Purchases"
            value={rollup?.purchases || 0}
            icon={<ShoppingCart />}
            loading={isLoading}
            data-testid="stat-purchases"
          />
          <StatCard
            title="Avg Order Value"
            value={`€${rollup?.avgOrderValue || 0}`}
            icon={<TrendingUp />}
            loading={isLoading}
            data-testid="stat-aov"
          />
          <StatCard
            title="Conversion Rate"
            value={`${rollup?.conversionRate || 0}%`}
            icon={<TrendingUp />}
            loading={isLoading}
            data-testid="stat-conversion"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Product Views"
            value={rollup?.views || 0}
            icon={<Eye />}
            loading={isLoading}
          />
          <StatCard
            title="Cart Additions"
            value={rollup?.cartAdditions || 0}
            icon={<ShoppingCart />}
            loading={isLoading}
          />
          <StatCard
            title="Unique Buyers"
            value={rollup?.uniqueBuyers || 0}
            icon={<Users />}
            loading={isLoading}
          />
          <StatCard
            title="Wishlist Adds"
            value={rollup?.wishlistAdditions || 0}
            icon={<Package />}
            loading={isLoading}
          />
        </div>

        <LineChart
          title="Sales Performance Over Time"
          data={mockTimeSeriesData}
          xKey="date"
          lines={[
            { key: "revenue", label: "Revenue (€)", color: "#10b981" },
            { key: "purchases", label: "Purchases", color: "#000000" },
            { key: "views", label: "Views", color: "#3b82f6" },
          ]}
          loading={isLoading}
          height={350}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChart
            title="Sales Funnel"
            data={funnelData}
            xKey="stage"
            bars={[
              { key: "count", label: "Count", color: "#000000" },
            ]}
            loading={isLoading}
            horizontal={true}
          />

          <LeaderboardTable
            title="Top Products"
            entries={topProducts}
            valueLabel="Revenue"
            loading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
