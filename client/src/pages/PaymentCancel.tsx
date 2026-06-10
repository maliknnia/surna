// Payment Cancel Page - Show when user cancels payment
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, CreditCard } from "lucide-react";

export default function PaymentCancel() {
  const [location, setLocation] = useLocation();

  const handleBackToHome = () => {
    setLocation('/');
  };

  const handleTryAgain = () => {
    setLocation('/cart');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="payment-cancel-page">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-transparent border border-border rounded-full flex items-center justify-center mb-4">
            <XCircle className="h-6 w-6 text-token-text" />
          </div>
          <CardTitle className="text-2xl text-token-text">Payment Cancelled</CardTitle>
          <CardDescription>
            Your payment was cancelled. No charges have been made to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-transparent border border-border p-4 rounded-lg">
            <h3 className="font-medium text-token-text mb-2">What happened?</h3>
            <p className="text-sm text-token-text-secondary">
              You chose to cancel the payment process. Your cart items are still saved and you can complete your purchase anytime.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button 
              onClick={handleTryAgain} 
              className="w-full"
              data-testid="button-try-again"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Return to Cart
            </Button>
            <Link href="/marketplace">
              <Button variant="outline" className="w-full" data-testid="button-marketplace">
                Browse Marketplace
              </Button>
            </Link>
            <Link href="/billing">
              <Button variant="outline" className="w-full" data-testid="button-billing">
                Billing & Subscription
              </Button>
            </Link>
            <Button 
              variant="outline" 
              onClick={handleBackToHome}
              className="w-full"
              data-testid="button-back-home"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}