import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import SurnaLogo from "@/components/SurnaLogo";
import { useAuth } from "@/hooks/useAuth";
import { normalizeCartPayload } from "@/lib/marketplaceApi";

const stripePk = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined;
const stripePromise = stripePk ? loadStripe(stripePk) : null;

type CheckoutTotals = {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
};

function formatMoney(cents: number, currency = "usd") {
  const symbol = currency.toUpperCase() === "USD" ? "$" : "€";
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

function CheckoutForm({
  totals,
  onSuccess,
}: {
  totals: CheckoutTotals;
  onSuccess: (paymentIntentId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Payment failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        const fulfillRes = await apiRequest("POST", "/api/orders/create-from-payment", {
          paymentIntentId: paymentIntent.id,
        });
        if (!fulfillRes.ok) {
          const text = await fulfillRes.text();
          throw new Error(text || "Order fulfillment failed");
        }
        onSuccess(paymentIntent.id);
        return;
      }

      toast({
        title: "Payment incomplete",
        description: "Please try again or use another payment method.",
        variant: "destructive",
      });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred during payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || isProcessing}
        data-testid="submit-payment"
      >
        {isProcessing ? "Processing…" : `Pay ${formatMoney(totals.totalCents, totals.currency)}`}
      </Button>
    </form>
  );
}

export default function MarketplaceCheckout() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [clientSecret, setClientSecret] = useState("");
  const [checkoutTotals, setCheckoutTotals] = useState<CheckoutTotals | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const { data: cartData, isLoading: cartLoading } = useQuery({
    queryKey: ["/api/marketplace/cart"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch("/api/marketplace/cart", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load cart");
      const raw = await res.json();
      const normalized = normalizeCartPayload(raw);
      return {
        cartId: normalized.cartId,
        items: normalized.items.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          product: {
            id: item.product.id,
            name: item.product.name,
            price: item.product.price,
          },
        })),
      };
    },
  });

  const items = cartData?.items || [];

  useEffect(() => {
    if (!isAuthenticated || items.length === 0 || clientSecret) return;
    if (!stripePromise) {
      setInitError("Stripe is not configured (VITE_STRIPE_PUBLIC_KEY).");
      return;
    }

    void (async () => {
      try {
        const res = await apiRequest("POST", "/api/marketplace/create-payment-intent", {});
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to initialize payment");
        }
        const data = (await res.json()) as CheckoutTotals & { clientSecret?: string };
        if (!data.clientSecret) throw new Error("No client secret returned");
        setClientSecret(data.clientSecret);
        setCheckoutTotals({
          subtotalCents: data.subtotalCents,
          taxCents: data.taxCents,
          totalCents: data.totalCents,
          currency: data.currency,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to initialize payment";
        setInitError(message);
        toast({
          title: "Checkout unavailable",
          description: message,
          variant: "destructive",
        });
      }
    })();
  }, [isAuthenticated, items.length, clientSecret, toast]);

  const handlePaymentSuccess = (paymentIntentId: string) => {
    void queryClient.invalidateQueries({ queryKey: ["/api/marketplace/cart"] });
    setLocation(`/payment-success?payment_intent=${encodeURIComponent(paymentIntentId)}`);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-12 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Login required</h2>
            <p className="text-muted-foreground mb-6">Please log in to checkout</p>
            <Link href="/">
              <Button>Back to home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (cartLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-12 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Add some products before checking out</p>
            <Link href="/marketplace">
              <Button>Browse marketplace</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stripePromise || initError) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-bold">Online checkout unavailable</h2>
            <p className="text-sm text-muted-foreground">
              {initError ?? "Stripe is not configured for this environment."}
            </p>
            <Link href="/marketplace/cart">
              <Button variant="outline">Back to cart</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayTotals = checkoutTotals ?? {
    subtotalCents: 0,
    taxCents: 0,
    totalCents: 0,
    currency: "usd",
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 bg-background border-b border-border z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/marketplace/cart">
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 rounded-full hover:bg-muted/40 border border-border"
                data-testid="back-to-cart"
              >
                <ArrowLeft className="w-4 h-4 text-token-text" />
              </Button>
            </Link>
            <SurnaLogo className="h-8 w-auto" showText={true} />
          </div>
          <h1 className="text-lg font-bold">Secure checkout</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-6">Payment</h2>
            {!clientSecret || !checkoutTotals ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-muted-foreground">Initializing secure payment…</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm totals={checkoutTotals} onSuccess={handlePaymentSuccess} />
                  </Elements>
                </CardContent>
              </Card>
            )}

            <div className="mt-4 p-4 bg-muted/40 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">
                Your payment is encrypted. Orders are confirmed immediately after payment succeeds.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6">Order summary</h2>
            <Card>
              <CardHeader>
                <CardTitle>Items ({items.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">
                        {formatMoney(Math.round(item.product.price * item.quantity * 100), displayTotals.currency)}
                      </p>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatMoney(displayTotals.subtotalCents, displayTotals.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatMoney(displayTotals.taxCents, displayTotals.currency)}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatMoney(displayTotals.totalCents, displayTotals.currency)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
