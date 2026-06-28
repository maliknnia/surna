import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft, Loader2, Crown, Package, MapPin } from "lucide-react";
import { Link } from "wouter";
import { activateProSubscription, invalidateProEntitlement } from "@/hooks/useProEntitlement";

type Status =
  | "idle"
  | "activating"
  | "pro_active"
  | "membership_active"
  | "membership_pending"
  | "payment_only"
  | "marketplace"
  | "error";

type OrderConfirmation = {
  id: string;
  total_amount: string | number;
  currency?: string;
  status?: string;
  items?: Array<{ title?: string; qty?: number; price?: string }>;
};

export default function PaymentSuccess() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderConfirmation | null>(null);
  const [membershipPlaceId, setMembershipPlaceId] = useState<string | null>(null);

  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const piFromUrl = params?.get("payment_intent");

  const { data: orderData, isLoading: orderLoading } = useQuery({
    queryKey: ["/api/marketplace/orders/confirmation", piFromUrl],
    enabled: !!piFromUrl && status === "payment_only",
    queryFn: async () => {
      const res = await fetch(
        `/api/marketplace/orders/confirmation?payment_intent=${encodeURIComponent(piFromUrl!)}`,
        { credentials: "include" },
      );
      if (!res.ok) return null;
      const json = await res.json();
      return json.order as OrderConfirmation | null;
    },
  });

  useEffect(() => {
    if (orderData) {
      setOrder(orderData);
      setStatus("marketplace");
    }
  }, [orderData]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const sessionId = searchParams.get("session_id");
    const bookingId = searchParams.get("booking_id");
    const placeId = searchParams.get("place_id");
    const pi = searchParams.get("payment_intent");
    if (pi) setPaymentIntent(pi);

    if (sessionId && bookingId) {
      setStatus("activating");
      fetch("/api/places/membership-checkout/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId, bookingId }),
      })
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json.message ?? "Activation failed");
          return json as { confirmed: boolean; placeId?: string };
        })
        .then((result) => {
          if (result.placeId || placeId) setMembershipPlaceId(result.placeId ?? placeId);
          setStatus(result.confirmed ? "membership_active" : "membership_pending");
          if (!result.confirmed) {
            setErrorMessage("Payment received — your membership is still processing. Check back shortly.");
          }
        })
        .catch((err: Error) => {
          setStatus("error");
          setErrorMessage(err.message);
        });
      return;
    }

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
  const isMembership = status === "membership_active" || status === "membership_pending";
  const isMarketplace = status === "marketplace";
  const loading =
    status === "idle" ||
    status === "activating" ||
    (status === "payment_only" && orderLoading && !!piFromUrl);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-transparent border border-border rounded-full flex items-center justify-center mb-4">
            {loading ? (
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            ) : isPro ? (
              <Crown className="w-8 h-8 text-primary" />
            ) : isMembership ? (
              <MapPin className="w-8 h-8 text-primary" />
            ) : isMarketplace ? (
              <Package className="w-8 h-8 text-primary" />
            ) : (
              <CheckCircle className="w-8 h-8 text-token-text" />
            )}
          </div>
          <CardTitle className="text-token-text">
            {loading
              ? "Confirming your order…"
              : isPro
                ? "Welcome to SURNA Pro"
                : isMembership
                  ? status === "membership_active"
                    ? "Membership confirmed"
                    : "Membership processing"
                  : isMarketplace
                  ? "Order confirmed"
                  : "Payment successful"}
          </CardTitle>
          <CardDescription>
            {loading
              ? "Finalizing your purchase."
              : isPro
                ? "Your Pro tools are live in the main app and the Pro dashboard."
                : isMembership
                  ? status === "membership_active"
                    ? "You're all set — the venue has your paid membership on file."
                    : "Your payment went through; confirmation may take a moment."
                  : isMarketplace
                  ? "Your marketplace order has been fulfilled. The seller has been notified."
                  : "Your payment has been processed."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          {isMarketplace && order && (
            <div className="text-left rounded-lg border border-border p-4 space-y-2">
              <p className="text-sm font-semibold">Order #{String(order.id).slice(0, 8)}</p>
              <p className="text-sm text-muted-foreground capitalize">Status: {order.status ?? "fulfilled"}</p>
              <p className="text-lg font-bold">
                Total: {order.currency === "USD" ? "$" : "€"}
                {Number(order.total_amount).toFixed(2)}
              </p>
              {Array.isArray(order.items) && order.items.length > 0 && (
                <ul className="text-sm space-y-1 pt-2 border-t border-border">
                  {order.items.map((item, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate">{item.title ?? "Item"} × {item.qty ?? 1}</span>
                      <span className="shrink-0">{item.price != null ? `€${item.price}` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {paymentIntent && !isMarketplace && (
            <div className="bg-transparent border border-border p-4 rounded-lg">
              <p className="text-sm text-token-text-secondary">
                Payment ID: <span className="font-mono text-xs">{paymentIntent}</span>
              </p>
            </div>
          )}
          <div className="space-y-2">
            {isMembership && membershipPlaceId && (
              <Link href={`/places/${membershipPlaceId}`}>
                <Button className="w-full gap-2">
                  <MapPin className="h-4 w-4" />
                  Back to venue
                </Button>
              </Link>
            )}
            {isPro && (
              <Link href="/pro">
                <Button className="w-full gap-2" data-testid="button-open-pro">
                  <Crown className="h-4 w-4" />
                  Open Pro dashboard
                </Button>
              </Link>
            )}
            {isMarketplace && (
              <Link href="/payment-history">
                <Button variant="outline" className="w-full">
                  View payment history
                </Button>
              </Link>
            )}
            <Link href="/billing">
              <Button variant="outline" className="w-full" data-testid="button-billing">
                Billing & subscription
              </Button>
            </Link>
            {!isPro && !isMembership && (
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
