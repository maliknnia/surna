import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft, Loader2, Crown } from "lucide-react";
import { Link } from "wouter";
import { activateProSubscription, invalidateProEntitlement } from "@/hooks/useProEntitlement";

type Status = "idle" | "activating" | "pro_active" | "payment_only" | "error";

export default function PaymentSuccess() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const pi = params.get("payment_intent");
    if (pi) setPaymentIntent(pi);

    if (sessionId) {
      setStatus("activating");
      activateProSubscription(sessionId)
        .then((result) => {
          invalidateProEntitlement(queryClient);
          setStatus(result.active ? "pro_active" : "error");
          if (!result.active) {
            setErrorMessage("Payment received — Pro activation is still processing. Refresh in a moment.");
          }
        })
        .catch((err: Error) => {
          setStatus("error");
          setErrorMessage(err.message);
        });
      return;
    }

    if (pi) {
      setStatus("payment_only");
      fetch("/api/orders/create-from-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paymentIntentId: pi }),
      }).catch(() => {});
    } else {
      setStatus("payment_only");
    }
  }, [queryClient]);

  const isPro = status === "pro_active";
  const loading = status === "idle" || status === "activating";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-transparent border border-border rounded-full flex items-center justify-center mb-4">
            {loading ? (
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            ) : isPro ? (
              <Crown className="w-8 h-8 text-primary" />
            ) : (
              <CheckCircle className="w-8 h-8 text-token-text" />
            )}
          </div>
          <CardTitle className="text-token-text">
            {loading
              ? "Confirming your subscription…"
              : isPro
                ? "Welcome to SURNA Pro"
                : "Payment successful"}
          </CardTitle>
          <CardDescription>
            {loading
              ? "Unlocking Pro tools across the app."
              : isPro
                ? "Your Pro tools are live in the main app and the Pro dashboard."
                : "Your payment has been processed."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
          {paymentIntent && (
            <div className="bg-transparent border border-border p-4 rounded-lg">
              <p className="text-sm text-token-text-secondary">
                Payment ID:{" "}
                <span className="font-mono text-xs">{paymentIntent}</span>
              </p>
            </div>
          )}
          <div className="space-y-2">
            {isPro && (
              <Link href="/pro">
                <Button className="w-full gap-2" data-testid="button-open-pro">
                  <Crown className="h-4 w-4" />
                  Open Pro dashboard
                </Button>
              </Link>
            )}
            {isPro && (
              <Link href="/my-hub">
                <Button variant="outline" className="w-full" data-testid="button-my-hub">
                  Go to My Hub
                </Button>
              </Link>
            )}
            <Link href="/billing">
              <Button variant="outline" className="w-full" data-testid="button-billing">
                Billing & subscription
              </Button>
            </Link>
            {!isPro && (
              <Link href="/marketplace">
                <Button variant="outline" className="w-full" data-testid="button-marketplace">
                  Continue shopping
                </Button>
              </Link>
            )}
            <Link href="/">
              <Button variant="outline" className="w-full" data-testid="button-back-home">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
