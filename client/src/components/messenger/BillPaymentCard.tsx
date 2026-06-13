import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const stripePk = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined;
const stripePromise = stripePk ? loadStripe(stripePk) : null;

export type BillCardPayload = {
  type: "bill_card";
  billId: string;
  title: string;
  shareAmount: number;
  totalAmount?: number;
  splitCount?: number;
};

function BillPayForm({
  billId,
  onPaid,
  isDark,
}: {
  billId: string;
  onPaid: () => void;
  isDark: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (error) throw new Error(error.message);
      if (paymentIntent?.status === "succeeded") {
        await apiRequest("POST", `/api/bills/${billId}/pay`, {
          paymentIntentId: paymentIntent.id,
          confirm: true,
        });
        toast({ title: "Payment sent" });
        onPaid();
      }
    } catch (err: unknown) {
      toast({
        title: "Payment failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 mt-2">
      <PaymentElement />
      <button
        type="button"
        disabled={!stripe || busy}
        onClick={handlePay}
        className="w-full h-10 rounded-xl text-sm font-bold"
        style={{
          background: isDark ? "#fff" : "#121212",
          color: isDark ? "#121212" : "#fff",
          opacity: !stripe || busy ? 0.5 : 1,
        }}
      >
        {busy ? "Processing…" : "Confirm payment"}
      </button>
    </div>
  );
}

export function BillPaymentCard({
  payload,
  isFromMe,
  isDark,
}: {
  payload: BillCardPayload;
  isFromMe: boolean;
  isDark: boolean;
}) {
  const [paid, setPaid] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const startPay = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/bills/${payload.billId}/pay`, {});
      return res.json() as Promise<{ clientSecret?: string }>;
    },
    onSuccess: (data) => {
      if (data.clientSecret) setClientSecret(data.clientSecret);
    },
  });

  const cardBg = isFromMe
    ? isDark
      ? "rgba(29,185,84,0.15)"
      : "rgba(29,185,84,0.12)"
    : isDark
      ? "rgba(255,255,255,0.06)"
      : "rgba(0,0,0,0.04)";

  return (
    <div
      className="rounded-2xl p-4 max-w-[280px] border"
      style={{ background: cardBg, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }}
      data-testid="bill-payment-card"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-60 mb-1">Team bill</p>
      <p className="text-[15px] font-bold leading-snug">{payload.title}</p>
      <p className="text-[13px] mt-2 opacity-80">
        Your share: <span className="font-bold">€{payload.shareAmount.toFixed(2)}</span>
      </p>
      {payload.splitCount && payload.totalAmount ? (
        <p className="text-[11px] mt-1 opacity-50">
          €{payload.totalAmount.toFixed(2)} split {payload.splitCount} ways
        </p>
      ) : null}

      {!paid && !clientSecret && (
        <button
          type="button"
          disabled={startPay.isPending}
          onClick={() => startPay.mutate()}
          className="mt-3 w-full h-10 rounded-xl text-sm font-bold"
          style={{ background: "#1DB954", color: "#fff" }}
        >
          {startPay.isPending ? "Loading…" : "Pay now"}
        </button>
      )}

      {paid && (
        <p className="mt-3 text-[13px] font-semibold" style={{ color: "#1DB954" }}>
          Paid ✓
        </p>
      )}

      {clientSecret && stripePromise && !paid && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <BillPayForm billId={payload.billId} onPaid={() => setPaid(true)} isDark={isDark} />
        </Elements>
      )}
    </div>
  );
}

export function parseBillCardBody(body: string): BillCardPayload | null {
  try {
    const parsed = JSON.parse(body) as BillCardPayload;
    if (parsed?.type === "bill_card" && parsed.billId) return parsed;
  } catch {
    /* plain text message */
  }
  return null;
}
