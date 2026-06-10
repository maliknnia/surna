// Growth Analytics Dashboard - Track marketing performance and user acquisition
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  TrendingUp, 
  Share2, 
  Gift, 
  Target,
  BarChart3,
  Calendar,
  Award
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

interface GrowthMetrics {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  activeReferrers: number;
  totalReferrals: number;
  conversionRate: number;
  topAcquisitionChannels: ChannelMetrics[];
  socialShareMetrics: ShareMetrics[];
}

interface ChannelMetrics {
  source: string;
  users: number;
  percentage: number;
}

interface ShareMetrics {
  platform: string;
  shares: number;
  contentType: string;
}

interface GrowthTrend {
  date: string;
  users: number;
}

interface TopReferrer {
  userId: string;
  userName: string;
  referrals: number;
  conversions: number;
  conversionRate: number;
}

export function GrowthAnalyticsDashboard() {
  // Get growth metrics
  const { data: metrics } = useQuery<GrowthMetrics>({
    queryKey: ['/api/growth/metrics'],
  });

  // Get growth trends
  const { data: trends = [] } = useQuery<GrowthTrend[]>({
    queryKey: ['/api/growth/trends'],
  });

  // Get top referrers
  const { data: topReferrers = [] } = useQuery<TopReferrer[]>({
    queryKey: ['/api/growth/top-referrers'],
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const colors = ['#efe7e9', '#2a2535', '#1a1625'];

  return (
    <div className="container mx-auto p-6" data-testid="growth-analytics-dashboard">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Growth Analytics</h1>
        <p className="text-token-text">
          Track user acquisition, referral performance, and marketing campaign effectiveness.
        </p>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-users">
              {metrics?.totalUsers?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              +{metrics?.newUsersThisMonth || 0} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Referrers</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-token-text" data-testid="metric-active-referrers">
              {metrics?.activeReferrers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.totalReferrals || 0} total referrals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-token-text" data-testid="metric-conversion-rate">
              {metrics?.conversionRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Referral success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Users Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-token-text" data-testid="metric-new-users-today">
              {metrics?.newUsersToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              +{metrics?.newUsersThisWeek || 0} this week
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="acquisition">Acquisition</TabsTrigger>
          <TabsTrigger value="social">Social Sharing</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Growth Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  User Growth Trend
                </CardTitle>
                <CardDescription>Daily new user signups over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label) => formatDate(label)}
                      formatter={(value) => [`${value} users`, 'New Users']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="users" 
                      stroke="#efe7e9" 
                      strokeWidth={2}
                      dot={{ fill: '#efe7e9' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Acquisition Channels */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Acquisition Channels
                </CardTitle>
                <CardDescription>Where new users come from</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics?.topAcquisitionChannels || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ source, percentage }) => `${source} (${percentage.toFixed(1)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="users"
                    >
                      {(metrics?.topAcquisitionChannels || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} users`, 'Users']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Top Referrers
              </CardTitle>
              <CardDescription>Users who are driving the most referrals</CardDescription>
            </CardHeader>
            <CardContent>
              {topReferrers.length === 0 ? (
                <div className="text-center py-8">
                  <Gift className="h-12 w-12 mx-auto mb-4 text-token-text" />
                  <p className="text-token-text">No referral data yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topReferrers.map((referrer, index) => (
                    <div
                      key={referrer.userId}
                      className="flex items-center justify-between p-4 rounded-lg"
                      data-testid={`top-referrer-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-transparent border border-border text-token-text font-bold">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{referrer.userName}</div>
                          <div className="text-sm text-token-text">
                            {referrer.referrals} total referrals
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-token-text">
                          {referrer.conversions} conversions
                        </div>
                        <Badge variant="secondary">
                          {referrer.conversionRate}% rate
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Acquisition Tab */}
        <TabsContent value="acquisition" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily New Users</CardTitle>
                <CardDescription>User acquisition over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label) => formatDate(label)}
                      formatter={(value) => [`${value} users`, 'New Users']}
                    />
                    <Bar 
                      dataKey="users" 
                      fill="#2a2535"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
                <CardDescription>User acquisition by channel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(metrics?.topAcquisitionChannels || []).map((channel, index) => (
                    <div key={channel.source} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: colors[index % colors.length] }}
                        />
                        <span className="font-medium capitalize">{channel.source}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{channel.users} users</div>
                        <div className="text-sm text-token-text">{channel.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Social Sharing Tab */}
        <TabsContent value="social" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Social Share Performance
              </CardTitle>
              <CardDescription>How content is being shared across platforms</CardDescription>
            </CardHeader>
            <CardContent>
              {(metrics?.socialShareMetrics || []).length === 0 ? (
                <div className="text-center py-8">
                  <Share2 className="h-12 w-12 mx-auto mb-4 text-token-text" />
                  <p className="text-token-text">No social sharing data yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {metrics?.socialShareMetrics.map((share, index) => (
                    <Card key={`${share.platform}-${share.contentType}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium capitalize">{share.platform}</h4>
                          <Badge variant="outline">{share.contentType}</Badge>
                        </div>
                        <div className="text-2xl font-bold text-token-text">
                          {share.shares}
                        </div>
                        <div className="text-sm text-token-text">shares</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}