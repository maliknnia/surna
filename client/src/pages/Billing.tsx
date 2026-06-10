import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Calendar, DollarSign, Download, Eye } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface Payment {
  id: string;
  amount: string;
  currency: string;
  status: string;
  paymentType: string;
  description: string;
  createdAt: string;
}

export default function Billing() {
  const [limit] = useState(20);
  const proPriceLabel = "€9.99/month";

  const { data: payments, isLoading } = useQuery({
    queryKey: ['/api/payments', limit],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/payments?limit=${limit}`);
      return response.json() as Promise<Payment[]>;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'bg-transparent border border-border text-token-text';
      case 'pending':
        return 'bg-transparent border border-border text-token-text';
      case 'failed':
        return 'bg-transparent border border-border text-token-text';
      default:
        return 'bg-transparent border border-border text-token-text';
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'one_time':
        return 'One-time Payment';
      case 'subscription':
        return 'Subscription';
      case 'coach_session':
        return 'Coach Session';
      case 'event_registration':
        return 'Event Registration';
      case 'team_membership':
        return 'Team Membership';
      default:
        return 'Payment';
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/">
              <Button variant="ghost" size="sm" className="mb-2 -ml-2">
                ← Home
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-token-text">Billing & Payments</h1>
            <p className="text-token-text-secondary mt-1">Manage your subscription and payment history</p>
          </div>
          <Link href="/subscribe">
            <Button data-testid="button-upgrade-plan">
              <CreditCard className="mr-2 h-4 w-4" />
              Upgrade Plan
            </Button>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/subscribe">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-transparent border border-border rounded-lg">
                    <CreditCard className="h-5 w-5 text-token-text" />
                  </div>
                  <div>
                    <h3 className="font-medium">Manage Subscription</h3>
                    <p className="text-sm text-token-text-secondary">Update your plan</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/subscribe">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-transparent border border-border rounded-lg">
                    <DollarSign className="h-5 w-5 text-token-text" />
                  </div>
                  <div>
                    <h3 className="font-medium">Payment Methods</h3>
                    <p className="text-sm text-token-text-secondary">Manage cards</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-transparent border border-border rounded-lg">
                  <Download className="h-5 w-5 text-token-text" />
                </div>
                <div>
                  <h3 className="font-medium">Download Receipts</h3>
                  <p className="text-sm text-token-text-secondary">Get invoices</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>SURNA Pro</CardTitle>
            <CardDescription>{proPriceLabel} · Subscription plan</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-token-text-secondary">
            Includes advanced event management, team analytics, tournament creation, and professional tools.
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Payment History
            </CardTitle>
            <CardDescription>
              Your recent transactions and payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-transparent border border-border rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-transparent border border-border rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : payments && payments.length > 0 ? (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h4 className="font-medium">{payment.description || getPaymentTypeLabel(payment.paymentType)}</h4>
                          <p className="text-sm text-token-text-secondary">
                            {format(new Date(payment.createdAt), 'MMM dd, yyyy • h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="font-medium">
                          €{parseFloat(payment.amount).toFixed(2)} {payment.currency.toUpperCase()}
                        </p>
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" data-testid={`button-view-${payment.id}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="text-center">
                  <Button variant="outline" data-testid="button-load-more">
                    Load More
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-token-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-token-text mb-2">No payments yet</h3>
                <p className="text-token-text-secondary mb-4">
                  When you make payments, they'll appear here.
                </p>
                <Link href="/subscribe">
                  <Button data-testid="button-get-started">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}