import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CreditCard, ShoppingCart } from "lucide-react";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ amount, paymentType, description, coachDetails }: { amount: number; paymentType: string; description: string; coachDetails?: any }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/payment-success",
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Thank you for your purchase!",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-card rounded-2xl p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <ShoppingCart className="w-6 h-6 text-foreground" />
          <h2 className="text-2xl font-bold text-foreground">Complete Payment</h2>
        </div>
        <p className="text-base text-foreground/80">
          {description} - ${amount.toFixed(2)}
        </p>
      </div>

      {coachDetails && (
        <div className="bg-primary/10 rounded-xl p-4 mb-6 border border-primary/20">
          <h3 className="text-lg font-semibold text-foreground mb-2">Coach Session Details</h3>
          <p className="text-sm text-foreground">
            <strong>Coach:</strong> {coachDetails.name}
          </p>
          <p className="text-sm text-foreground">
            <strong>Specialty:</strong> {coachDetails.specialty}
          </p>
          {coachDetails.sessionType && (
            <p className="text-sm text-foreground">
              <strong>Session Type:</strong> {coachDetails.sessionType}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <PaymentElement />
        <Button 
          type="submit" 
          disabled={!stripe || isLoading} 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold border-0 py-3"
          data-testid="button-submit-payment"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay ${amount.toFixed(2)}
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const [paymentDetails, setPaymentDetails] = useState({
    amount: 0,
    paymentType: "one_time",
    description: "Purchase",
    coachDetails: null as any
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const amount = parseFloat(urlParams.get('amount') || '0');
    const paymentType = urlParams.get('type') || 'one_time';
    const description = urlParams.get('description') || 'Purchase';
    
    const coachName = urlParams.get('coachName');
    const coachSpecialty = urlParams.get('coachSpecialty');
    const sessionType = urlParams.get('sessionType');
    
    let coachDetails = null;
    if (coachName || description.toLowerCase().includes('coach')) {
      coachDetails = {
        name: coachName || 'Professional Coach',
        specialty: coachSpecialty || 'Sports Training',
        sessionType: sessionType || '1-on-1 Session'
      };
    }

    if (amount > 0) {
      setPaymentDetails({ amount, paymentType, description, coachDetails });

      apiRequest("POST", "/api/create-payment-intent", { 
        amount, 
        paymentType, 
        description 
      })
        .then((res) => res.json())
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch((error) => {
          console.error("Error creating payment intent:", error);
        });
    }
  }, []);

  if (!clientSecret || paymentDetails.amount === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-foreground mx-auto mb-4 animate-spin" />
          <p className="text-foreground/70">Loading payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CheckoutForm 
          amount={paymentDetails.amount}
          paymentType={paymentDetails.paymentType}
          description={paymentDetails.description}
          coachDetails={paymentDetails.coachDetails}
        />
      </Elements>
    </div>
  );
}
