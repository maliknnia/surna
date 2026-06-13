import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Wallet, ShoppingBag, Users, Trophy, Calendar, Star } from "lucide-react";
import { useSmartBack } from "@/lib/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type PaymentRow = {
  id: string;
  type: string;
  title: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  metadata?: { reviewRating?: number | null; sessionDate?: string };
};

function typeIcon(type: string) {
  switch (type) {
    case "marketplace":
      return ShoppingBag;
    case "team_bill":
      return Users;
    case "tournament_entry":
      return Trophy;
    case "coach_booking":
      return Calendar;
    default:
      return Wallet;
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function CoachReviewInline({ bookingId, existingRating }: { bookingId: string; existingRating?: number | null }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [open, setOpen] = useState(false);

  const reviewMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/coaches/bookings/${bookingId}/review`, { rating });
    },
    onSuccess: () => {
      toast({ title: "Review submitted" });
      qc.invalidateQueries({ queryKey: ["/api/users/me/payments"] });
      setOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Could not submit review", description: err.message, variant: "destructive" });
    },
  });

  if (existingRating) {
    return (
      <p className="text-[11px] text-[#1DB954] mt-1 flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} size={12} fill={n <= existingRating ? "#1DB954" : "none"} style={{ color: "#1DB954" }} />
        ))}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] font-semibold text-[#1DB954] mt-1"
      >
        Leave a review
      </button>
    );
  }

  return (
    <div className="mt-2 pt-2 border-t border-white/10">
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
            <Star size={16} fill={n <= rating ? "#1DB954" : "none"} style={{ color: "#1DB954" }} />
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={rating < 1 || reviewMutation.isPending}
        onClick={() => reviewMutation.mutate()}
        className="text-[11px] font-bold px-3 py-1 rounded-lg"
        style={{ background: "#1DB954", color: "#fff", opacity: rating < 1 ? 0.5 : 1 }}
      >
        Submit
      </button>
    </div>
  );
}

export default function PaymentHistoryPage() {
  const goBack = useSmartBack({ fallback: "/privacy-settings" });
  const [, navigate] = useLocation();

  const { data, isLoading, isError } = useQuery<{ payments: PaymentRow[] }>({
    queryKey: ["/api/users/me/payments"],
    queryFn: async () => {
      const res = await fetch("/api/users/me/payments", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load payments");
      return res.json();
    },
  });

  const payments = data?.payments ?? [];

  return (
    <div className="min-h-screen pb-8" style={{ background: "#121212", color: "#fff" }}>
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-4 border-b border-white/10 bg-[#121212]">
        <button type="button" onClick={goBack} className="p-2 -ml-2 rounded-full active:opacity-70">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold">Payment history</h1>
      </header>

      <div className="px-4 pt-4">
        {isLoading && <p className="text-sm text-white/60 py-8 text-center">Loading transactions…</p>}
        {isError && (
          <p className="text-sm text-red-400 py-8 text-center">Couldn&apos;t load payment history.</p>
        )}
        {!isLoading && !isError && payments.length === 0 && (
          <p className="text-sm text-white/60 py-12 text-center">No payments yet.</p>
        )}

        <ul className="space-y-2">
          {payments.map((p) => {
            const Icon = typeIcon(p.type);
            return (
              <li
                key={`${p.type}-${p.id}`}
                className="flex items-center gap-3 p-4 rounded-2xl"
                style={{ background: "#1a1a1a" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(29,185,84,0.12)" }}
                >
                  <Icon size={18} style={{ color: "#1DB954" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold truncate">{p.title}</p>
                  <p className="text-[12px] text-white/50 capitalize">
                    {p.type.replace(/_/g, " ")} · {formatDate(p.createdAt)}
                  </p>
                  {p.type === "coach_booking" &&
                    (p.status === "confirmed" || p.status === "completed") && (
                      <CoachReviewInline
                        bookingId={p.id}
                        existingRating={p.metadata?.reviewRating ?? undefined}
                      />
                    )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[15px] font-bold tabular-nums">
                    {p.currency === "USD" ? "$" : "€"}
                    {p.amount.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-white/40 capitalize">{p.status}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="px-4 pt-6">
        <button
          type="button"
          onClick={() => navigate("/marketplace")}
          className="text-sm font-semibold text-[#1DB954]"
        >
          Browse marketplace
        </button>
      </div>
    </div>
  );
}
