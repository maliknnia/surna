import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QrCode, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BOOKING_QR_PREFIX, parseLegacyBookingQr } from "@shared/placeBookingQr";

type VerifyResult = {
  result: "checked_in" | "already_used";
  booking: {
    id: string;
    title: string;
    attendeeName: string;
    profileImageUrl?: string | null;
    startTime: string;
    checkedInAt?: string;
  };
};

type CheckInItem = {
  id: string;
  title: string;
  attendeeName: string;
  startTime: string;
  status: "waiting" | "checked_in";
  checkedInAt?: string | null;
};

export function PlaceBookingScanner({
  placeId,
  placeName,
  open,
  onClose,
  accentColor,
  pageBg,
  borderColor,
  textPrimary,
  textSecondary,
}: {
  placeId: string;
  placeName?: string;
  open: boolean;
  onClose: () => void;
  accentColor: string;
  pageBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [lastResult, setLastResult] = useState<VerifyResult | null>(null);

  const { data: checkInsData } = useQuery<{ items?: CheckInItem[] }>({
    queryKey: ["/api/places", placeId, "booking-check-ins"],
    enabled: open && !!placeId,
  });

  const verify = useMutation({
    mutationFn: async (raw: string) => {
      const trimmed = raw.trim();
      const body: {
        placeId: string;
        token?: string;
        bookingId?: string;
        raw?: string;
      } = { placeId };

      const tokenMatch = trimmed.match(/SURNA-BKG:v1:(.+)/);
      if (tokenMatch?.[1]) {
        body.token = tokenMatch[1];
      } else {
        const legacy = parseLegacyBookingQr(trimmed);
        if (legacy) {
          body.bookingId = legacy.bookingId;
        } else if (trimmed.startsWith(BOOKING_QR_PREFIX)) {
          body.token = trimmed.slice(BOOKING_QR_PREFIX.length);
        } else {
          body.raw = trimmed;
        }
      }

      const res = await apiRequest("POST", "/api/places/bookings/verify", body);
      return res.json() as Promise<VerifyResult>;
    },
    onSuccess: (data) => {
      setLastResult(data);
      setInput("");
      void queryClient.invalidateQueries({
        queryKey: ["/api/places", placeId, "booking-check-ins"],
      });
      if (data.result === "checked_in") {
        toast({ title: "Checked in", description: data.booking.attendeeName });
      } else {
        toast({
          title: "Already checked in",
          description: `${data.booking.attendeeName} was scanned before`,
          variant: "destructive",
        });
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Scan failed",
        description: err?.message ?? "Invalid or unknown booking",
        variant: "destructive",
      });
    },
  });

  if (!open) return null;

  const checkIns = checkInsData?.items ?? [];
  const checkedCount = checkIns.filter((i) => i.status === "checked_in").length;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col" style={{ background: pageBg }}>
      <div
        className="flex items-center justify-between px-4 h-14 border-b shrink-0"
        style={{ borderColor }}
      >
        <div>
          <h2 className="text-[16px] font-bold" style={{ color: textPrimary }}>
            Scan bookings
          </h2>
          {placeName ? (
            <p className="text-[12px] truncate max-w-[240px]" style={{ color: textSecondary }}>
              {placeName}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(128,128,128,0.15)" }}
          aria-label="Close scanner"
        >
          <X size={18} style={{ color: textPrimary }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 pb-10">
        <div className="p-4 rounded-2xl border" style={{ borderColor }}>
          <div className="flex items-center gap-2 mb-3">
            <QrCode size={18} style={{ color: accentColor }} />
            <p className="text-[14px] font-semibold" style={{ color: textPrimary }}>
              Scan or paste booking QR
            </p>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste QR payload from guest check-in…"
            rows={3}
            className="w-full rounded-xl px-3 py-2.5 text-[14px] resize-none border bg-transparent"
            style={{ borderColor, color: textPrimary }}
          />
          <button
            type="button"
            disabled={!input.trim() || verify.isPending}
            onClick={() => verify.mutate(input)}
            className="w-full mt-3 h-11 rounded-full font-semibold text-white disabled:opacity-50"
            style={{ background: accentColor }}
          >
            {verify.isPending ? "Verifying…" : "Verify booking"}
          </button>
        </div>

        {lastResult ? (
          <div
            className="p-4 rounded-2xl flex items-start gap-3"
            style={{
              background:
                lastResult.result === "checked_in"
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(239,68,68,0.12)",
            }}
          >
            {lastResult.result === "checked_in" ? (
              <CheckCircle2 size={22} className="text-green-500 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={22} className="text-red-500 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold" style={{ color: textPrimary }}>
                {lastResult.booking.attendeeName}
              </p>
              <p className="text-[13px] mt-0.5" style={{ color: textSecondary }}>
                {lastResult.booking.title} ·{" "}
                {lastResult.result === "checked_in" ? "Checked in now" : "Already scanned"}
              </p>
            </div>
          </div>
        ) : null}

        <div>
          <p
            className="text-[12px] font-bold uppercase tracking-wider mb-2"
            style={{ color: textSecondary }}
          >
            Expected arrivals · {checkedCount}/{checkIns.length}
          </p>
          {checkIns.length === 0 ? (
            <p className="text-[13px]" style={{ color: textSecondary }}>
              No confirmed bookings in the next two weeks.
            </p>
          ) : (
            <div className="space-y-2">
              {checkIns.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl border"
                  style={{ borderColor }}
                >
                  <div>
                    <p className="text-[14px] font-medium" style={{ color: textPrimary }}>
                      {item.attendeeName}
                    </p>
                    <p className="text-[12px]" style={{ color: textSecondary }}>
                      {item.title} · {new Date(item.startTime).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className="text-[11px] font-bold uppercase px-2 py-1 rounded-full"
                    style={{
                      background:
                        item.status === "checked_in"
                          ? "rgba(34,197,94,0.15)"
                          : "rgba(128,128,128,0.15)",
                      color: item.status === "checked_in" ? "#22c55e" : textSecondary,
                    }}
                  >
                    {item.status === "checked_in" ? "In" : "Waiting"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
