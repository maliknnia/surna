import { useMemo } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { QrCodeImage } from "@/components/shared/QrCodeImage";

export type EventTicketView = {
  code: string;
  scanToken: string;
  status: "valid" | "used";
  redeemedAt?: string | null;
};

function ticketQrPayload(scanToken: string): string {
  return `SURNA-TKT:v1:${scanToken}`;
}

export function EventTicketCard({
  ticket,
  eventTitle,
  accentColor,
  cardBg,
  textPrimary,
  textSecondary,
  textTertiary,
}: {
  ticket: EventTicketView;
  eventTitle?: string;
  accentColor: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
}) {
  const qrValue = useMemo(() => ticketQrPayload(ticket.scanToken), [ticket.scanToken]);
  const isValid = ticket.status === "valid";

  return (
    <div className="p-5 rounded-2xl space-y-4" style={{ background: cardBg }}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: textTertiary }}>
          Your ticket
        </h3>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide"
          style={{
            background: isValid ? `${accentColor}22` : "rgba(239,68,68,0.15)",
            color: isValid ? accentColor : "#ef4444",
            border: `1px solid ${isValid ? `${accentColor}55` : "rgba(239,68,68,0.35)"}`,
          }}
        >
          {isValid ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
          {isValid ? "Valid · one scan" : "Used"}
        </div>
      </div>

      <div className="flex flex-col items-center text-center gap-3">
        <div
          className="rounded-2xl p-3 bg-white shadow-sm"
          style={{ boxShadow: isValid ? `0 12px 40px ${accentColor}33` : undefined }}
        >
          <QrCodeImage value={qrValue} size={168} alt="Ticket QR code" />
        </div>
        <div>
          <p className="text-xl font-black tracking-wider" style={{ color: textPrimary }}>
            {ticket.code}
          </p>
          {eventTitle ? (
            <p className="text-[13px] mt-1 font-medium" style={{ color: textSecondary }}>
              {eventTitle}
            </p>
          ) : null}
          <p className="text-[12px] mt-2" style={{ color: textTertiary }}>
            {isValid ? "Show this QR at the door — it works once" : "This ticket was already scanned"}
          </p>
          {!isValid && ticket.redeemedAt ? (
            <p className="text-[11px] mt-1" style={{ color: textTertiary }}>
              Checked in {new Date(ticket.redeemedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
