import { useState } from "react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Crown } from "lucide-react";

const PRO_PRICE_ID = import.meta.env.VITE_STRIPE_PRO_PRICE_ID || "price_surna_pro_999_month";

const PRO_FEATURES = [
  "Full team rosters, roles, and join approvals",
  "Training blocks, match day, and formations",
  "Club comms tied to messenger",
  "Tournaments, stats, and recruitment tools",
  "Advanced My Hub workflows in the main app",
];

export default function Subscribe() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    setIsRedirecting(true);
    setError(null);
    try {
      const response = await apiRequest("POST", "/api/payments/create-checkout-session", {
        priceId: PRO_PRICE_ID,
        mode: "subscription",
        successUrl: `${window.location.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/billing`,
        metadata: { plan: "pro" },
      });
      const data = await response.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setError("Could not start checkout. Check Stripe configuration.");
    } catch (err) {
      console.error(err);
      setError("Checkout failed. Try again or contact support.");
    } finally {
      setIsRedirecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <Link href="/billing" className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            ← Back to billing
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Crown className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">SURNA Pro</h1>
          <p className="text-muted-foreground">
            One subscription unlocks Pro in the main app and the Pro dashboard.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-primary/20 p-6 mb-6">
          <div className="text-center mb-6">
            <p className="text-3xl font-bold text-foreground m-0">€9.99</p>
            <p className="text-sm text-muted-foreground mt-1">per month · cancel anytime</p>
          </div>

          <ul className="list-none p-0 m-0 mb-6 space-y-2.5">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                {feature}
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-sm text-destructive text-center mb-4">{error}</p>
          )}

          <Button
            onClick={startCheckout}
            disabled={isRedirecting}
            className="w-full h-12 text-base font-semibold"
            data-testid="button-subscribe-pro"
          >
            {isRedirecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting to secure checkout…
              </>
            ) : (
              "Subscribe to Pro"
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground leading-relaxed">
          Secure payment via Stripe. After checkout, Pro tools unlock automatically in My Hub, home, and `/pro`.
        </p>
      </div>
    </div>
  );
}
