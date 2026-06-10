// Referral Dashboard Component - Track and manage referrals
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Share2, Users, Gift, Trophy, Copy, Mail, MessageSquare, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { SocialShareButtons } from './SocialShareButtons';
import { useAuth } from '@/hooks/useAuth';

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalRewards: number;
}

interface Referral {
  id: string;
  inviteeEmail: string;
  referralCode: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  referralLink: string;
  inviteeName?: string;
}

interface TopReferrer {
  userId: string;
  userName: string;
  conversions: number;
  totalRewards: number;
  conversionRate: number;
}

export function ReferralDashboard() {
  const [inviteEmail, setInviteEmail] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const personalReferralLink =
    user && (user as any).id
      ? `${window.location.origin}/join?ref=${encodeURIComponent((user as any).id)}`
      : "";

  // Get referral stats
  const { data: stats } = useQuery<ReferralStats>({
    queryKey: ['/api/referrals/stats'],
  });

  // Get referral history
  const { data: referrals = [] } = useQuery<Referral[]>({
    queryKey: ['/api/referrals/history'],
  });

  // Get top referrers leaderboard
  const { data: topReferrers = [] } = useQuery<TopReferrer[]>({
    queryKey: ['/api/referrals/leaderboard'],
  });

  // Create referral mutation
  const createReferralMutation = useMutation({
    mutationFn: async (email: string) => {
      return apiRequest('POST', '/api/referrals/create', { inviteeEmail: email });
    },
    onSuccess: () => {
      toast({
        title: 'Referral Created',
        description: 'Invitation sent successfully! Your friend will receive an email invitation.',
      });
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['/api/referrals'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to send invitation. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSendInvite = () => {
    if (!inviteEmail) {
      toast({
        title: 'Email Required',
        description: 'Please enter your friend\'s email address.',
        variant: 'destructive',
      });
      return;
    }

    createReferralMutation.mutate(inviteEmail);
  };

  const copyReferralLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link Copied',
      description: 'Referral link copied to clipboard!',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-transparent border border-border text-token-text';
      case 'pending':
        return 'bg-transparent border border-border text-token-text';
      case 'expired':
        return 'bg-transparent border border-border text-token-text';
      default:
        return 'bg-transparent border border-border text-token-text';
    }
  };

  return (
    <div className="container mx-auto p-6" data-testid="referral-dashboard">
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-3 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Home
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Referral Program</h1>
        <p className="text-token-text">
          Invite friends to SURNA and earn rewards when they join!
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="total-referrals">
              {stats?.totalReferrals || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-token-text" data-testid="completed-referrals">
              {stats?.completedReferrals || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-token-text" data-testid="pending-referrals">
              {stats?.pendingReferrals || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points Earned</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-token-text" data-testid="total-rewards">
              {stats?.totalRewards || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invite" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invite">Send Invites</TabsTrigger>
          <TabsTrigger value="history">My Referrals</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        {/* Send Invites Tab */}
        <TabsContent value="invite" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invite Friends via Email</CardTitle>
              <CardDescription>
                Send a personal invitation to your friends. They'll get 50 bonus points when they join!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {personalReferralLink && (
                <div className="flex gap-2">
                  <Input value={personalReferralLink} readOnly data-testid="input-personal-ref-link" />
                  <Button variant="outline" onClick={() => copyReferralLink(personalReferralLink)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="friend@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  data-testid="input-invite-email"
                />
                <Button 
                  onClick={handleSendInvite}
                  disabled={createReferralMutation.isPending}
                  data-testid="button-send-invite"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {createReferralMutation.isPending ? 'Sending...' : 'Send Invite'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Share on Social Media */}
          {referrals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Share on Social Media</CardTitle>
                <CardDescription>
                  Share your referral link on social platforms to reach more friends!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SocialShareButtons
                  shareData={{
                    title: 'Join me on SURNA - Sports Social Network',
                    description: 'Connect with athletes, join teams, discover events and coaches. Use my referral code to get bonus points!',
                    url: referrals[0]?.referralLink || '',
                    hashtags: ['SURNA', 'Sports', 'SocialNetwork']
                  }}
                  utmParams={{
                    source: 'referral',
                    medium: 'social',
                    campaign: 'user_referral'
                  }}
                  onShare={(platform: string) => {
                    toast({
                      title: 'Shared Successfully',
                      description: `Your referral link was shared on ${platform}!`,
                    });
                  }}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Referral History Tab */}
        <TabsContent value="history" className="space-y-4">
          {referrals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-token-text" />
                <h3 className="text-lg font-medium mb-2">No referrals yet</h3>
                <p className="text-token-text mb-4">
                  Start inviting friends to begin earning rewards!
                </p>
                <Button onClick={() => window.location.hash = '#invite'}>
                  Send Your First Invite
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {referrals.map((referral) => (
                <Card key={referral.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium">
                          {referral.inviteeName || referral.inviteeEmail}
                        </span>
                        <Badge className={getStatusColor(referral.status)}>
                          {referral.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-token-text">
                        Invited: {formatDate(referral.createdAt)}
                        {referral.completedAt && (
                          <span className="ml-4">
                            Joined: {formatDate(referral.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyReferralLink(referral.referralLink)}
                        data-testid={`button-copy-link-${referral.id}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Open share modal for this specific referral
                        }}
                        data-testid={`button-share-${referral.id}`}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Referrers</CardTitle>
              <CardDescription>
                See who's leading the referral program this month!
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topReferrers.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 mx-auto mb-4 text-token-text" />
                  <p className="text-token-text">No referrers yet. Be the first!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topReferrers.map((referrer, index: number) => (
                    <div
                      key={referrer.userId}
                      className="flex items-center justify-between p-4 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-transparent border border-border text-token-text font-bold">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{referrer.userName}</div>
                          <div className="text-sm text-token-text">
                            {referrer.conversions} successful referrals
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-token-text">
                          {referrer.totalRewards} points
                        </div>
                        <div className="text-sm text-token-text">
                          {referrer.conversionRate}% conversion
                        </div>
                      </div>
                    </div>
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