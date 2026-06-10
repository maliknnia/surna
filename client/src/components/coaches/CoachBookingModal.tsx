import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getPanelTheme } from "@/lib/panelTheme";
import type { CoachPricingPlan } from "@shared/coachProfile";

const stripePk = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined;
const stripePromise = stripePk ? loadStripe(stripePk) : null;

type AvailResponse = {
  weekly: Record<string, { enabled: boolean; ranges: { start: string; end: string }[] }>;
  slots: string[];
  hourlyRate: string | null;
  sessionDurations?: number[];
  bookingMode?: string;
};

function groupSlots(slots: string[]): { label: string; items: { iso: string; time: string }[] }[] {
  const map = new Map<string, { iso: string; time: string }[]>();
  for (const iso of slots) {
    const d = new Date(iso);
    const label = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    const arr = map.get(label) || [];
    arr.push({ iso, time });
    map.set(label, arr);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function CoachPayForm({
  bookingId,
  amount,
  onSuccess,
  payBg,
  payText,
}: {
  bookingId: string;
  amount: number;
  onSuccess: () => void;
  payBg: string;
  payText: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (error) {
        toast({ title: "Payment failed", description: error.message, variant: "destructive" });
        return;
      }
      if (paymentIntent?.status === "succeeded") {
        await apiRequest("POST", `/api/coaches/bookings/${bookingId}/confirm`, {
          paymentIntentId: paymentIntent.id,
        });
        toast({ title: "Session booked", description: "Check Messages for confirmation." });
        onSuccess();
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Could not complete booking",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || busy}
        className="w-full py-3 rounded-2xl text-[14px] font-bold"
        style={{ background: payBg, color: payText, opacity: !stripe || busy ? 0.5 : 1 }}
      >
        {busy ? "Processing…" : `Pay €${amount.toFixed(2)}`}
      </button>
    </form>
  );
}

export default function CoachBookingModal({
  open,
  onClose,
  coachId,
  hourlyRate,
  selectedPlan,
}: {
  open: boolean;
  onClose: () => void;
  coachId: string;
  hourlyRate: number;
  selectedPlan?: CoachPricingPlan | null;
}) {
  const { toast } = useToast();
  const t = getPanelTheme();
  const [duration, setDuration] = useState(60);
  const [step, setStep] = useState<"pick" | "pay">("pick");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("pick");
    setSelectedSlot(null);
    setClientSecret(null);
    setBookingId(null);
    setAmount(0);
    setCheckoutLoading(false);
    setDuration(selectedPlan?.durationMinutes ?? 60);
  }, [open, selectedPlan?.durationMinutes]);

  const panelBg = t.pageBg;
  const border = t.border;
  const text = t.textPrimary;
  const muted = t.textSecondary;
  const chip = t.chipBg;
  const accent = t.chipActiveBg;
  const accentText = t.chipActiveText;

  const { data, isLoading, error } = useQuery<AvailResponse>({
    queryKey: ["/api/coaches", coachId, "availability"],
    queryFn: async () => {
      const r = await fetch(`/api/coaches/${coachId}/availability`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load availability");
      return r.json();
    },
    enabled: open && !!coachId,
  });

  const resetAndClose = () => {
    setStep("pick");
    setSelectedSlot(null);
    setClientSecret(null);
    setBookingId(null);
    setAmount(0);
    onClose();
  };

  const startCheckout = async () => {
    if (!selectedSlot) {
      toast({ title: "Pick a time", description: "Choose a session slot to continue.", variant: "destructive" });
      return;
    }
    if (!stripePromise) {
      toast({
        title: "Payments unavailable",
        description: "Stripe is not configured (VITE_STRIPE_PUBLIC_KEY).",
        variant: "destructive",
      });
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await apiRequest("POST", `/api/coaches/${coachId}/bookings/checkout`, {
        sessionStart: selectedSlot,
        durationMinutes: duration,
      });
      const j = await res.json();
      setClientSecret(j.clientSecret);
      setBookingId(j.bookingId);
      setAmount(Number(j.amount));
      setStep("pay");
    } catch (e: any) {
      toast({
        title: "Checkout failed",
        description: e?.message || "Could not start payment",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (!open) return null;

  const durations = data?.sessionDurations?.length ? data.sessionDurations : [60, 90, 120];
  const estPrice =
    hourlyRate > 0 ? Math.round(hourlyRate * (duration / 60) * 100) / 100 : 0;
  const groups = data?.slots?.length ? groupSlots(data.slots) : [];
  const planLabel = selectedPlan?.label;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={resetAndClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-4 pb-8"
        style={{ background: panelBg, border: `1px solid ${border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-bold" style={{ color: text }}>
            Book session
          </h2>
          <button type="button" onClick={resetAndClose} className="p-2 rounded-full" style={{ background: chip }}>
            <X size={18} style={{ color: text }} />
          </button>
        </div>

        {step === "pick" && (
          <>
            <p className="text-[12px] mb-3" style={{ color: muted }}>
              {planLabel ? `${planLabel} · ` : ""}€{hourlyRate.toFixed(0)}/hr · pick a start time.
            </p>

            <div className="flex gap-2 mb-3 flex-wrap">
              {durations.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                  style={{
                    background: duration === d ? accent : chip,
                    color: duration === d ? accentText : text,
                  }}
                >
                  {d} min
                </button>
              ))}
            </div>

            <div
              className="rounded-2xl px-3 py-2 mb-4 text-[13px] font-bold"
              style={{ background: chip, color: text }}
            >
              Estimated: €{estPrice.toFixed(2)}
            </div>

            {isLoading && <p style={{ color: muted }}>Loading slots…</p>}
            {error && <p style={{ color: "#ff453a" }}>Could not load availability.</p>}
            {!isLoading && !error && groups.length === 0 && (
              <p style={{ color: muted }}>No open slots in the next two weeks.</p>
            )}

            <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
              {groups.map((g) => (
                <div key={g.label}>
                  <div className="text-[11px] font-bold mb-1.5" style={{ color: muted }}>
                    {g.label}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map(({ iso, time }) => (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => setSelectedSlot(iso)}
                        className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                        style={{
                          background: selectedSlot === iso ? accent : chip,
                          color: selectedSlot === iso ? accentText : text,
                        }}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={startCheckout}
              disabled={checkoutLoading || !selectedSlot}
              className="w-full mt-4 py-3 rounded-2xl text-[14px] font-bold"
              style={{
                background: accent,
                color: accentText,
                opacity: checkoutLoading || !selectedSlot ? 0.45 : 1,
              }}
            >
              {checkoutLoading ? "Starting checkout…" : "Continue to payment"}
            </button>
          </>
        )}

        {step === "pay" && clientSecret && bookingId && stripePromise && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CoachPayForm
              bookingId={bookingId}
              amount={amount}
              payBg={accent}
              payText={accentText}
              onSuccess={resetAndClose}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}
