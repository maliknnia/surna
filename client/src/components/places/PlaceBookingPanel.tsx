import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Phone } from "lucide-react";
import type { PlaceAvailabilitySlot, PlaceBookingMode } from "@shared/placeBooking";

export interface PlaceBookingTheme {
  accentColor: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  borderColor: string;
  isDark: boolean;
}

export interface PlaceBookingPayload {
  bookingType: string;
  title: string;
  startTime: string;
  endTime: string;
  price?: string;
}

interface PlaceBookingPanelProps {
  placeId: string;
  placeName: string;
  bookingMode: PlaceBookingMode | string;
  slotDurationMinutes?: number | null;
  slotPrice?: string | null;
  hours?: Record<string, string> | null;
  phone?: string | null;
  pricing?: Record<string, unknown> | null;
  isDemo?: boolean;
  isBooking?: boolean;
  theme: PlaceBookingTheme;
  onBook: (payload: PlaceBookingPayload) => void;
  onRequestModal?: () => void;
}

function formatDateChip(iso: string): { weekday: string; day: string; month: string } {
  const d = new Date(`${iso}T12:00:00`);
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
    day: d.getDate().toString(),
    month: d.toLocaleDateString(undefined, { month: "short" }),
  };
}

function nextDates(count: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function PlaceBookingPanel({
  placeId,
  placeName,
  bookingMode,
  slotDurationMinutes,
  slotPrice,
  hours,
  phone,
  pricing,
  isDemo,
  isBooking,
  theme,
  onBook,
  onRequestModal,
}: PlaceBookingPanelProps) {
  const mode = (bookingMode || "request") as PlaceBookingMode;
  const dates = useMemo(() => nextDates(14), []);
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [selectedSlot, setSelectedSlot] = useState<PlaceAvailabilitySlot | null>(null);

  const { accentColor, cardBg, textPrimary, textSecondary, textTertiary, borderColor, isDark } = theme;

  const { data: availability, isLoading: slotsLoading } = useQuery<{ slots: PlaceAvailabilitySlot[]; bookingMode: string }>({
    queryKey: ["/api/places", placeId, "availability", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/places/${placeId}/availability?date=${selectedDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load availability");
      return res.json();
    },
    enabled: mode === "slots" && !!placeId && !isDemo,
  });

  const demoSlots = useMemo((): PlaceAvailabilitySlot[] => {
    if (!isDemo || mode !== "slots") return [];
    const duration = slotDurationMinutes ?? 60;
    const base = new Date(`${selectedDate}T09:00:00`);
    const price = slotPrice != null ? parseFloat(String(slotPrice)) : 25;
    return [0, 1, 2, 3].map((i) => {
      const start = new Date(base.getTime() + i * duration * 60_000);
      const end = new Date(start.getTime() + duration * 60_000);
      return {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        label: start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
        price,
        available: true,
      };
    });
  }, [isDemo, mode, selectedDate, slotDurationMinutes, slotPrice]);

  const slots = isDemo ? demoSlots : (availability?.slots ?? []);
  const openSlots = slots.filter((s) => s.available);

  const pricingEntries =
    pricing && typeof pricing === "object"
      ? Object.entries(pricing).filter(([, v]) => v != null && String(v).trim() !== "")
      : [];

  const handleSlotBook = () => {
    if (!selectedSlot) return;
    const price =
      selectedSlot.price != null
        ? String(selectedSlot.price)
        : slotPrice != null
          ? String(slotPrice)
          : undefined;
    onBook({
      bookingType: "slot",
      title: `${placeName} — ${selectedSlot.label}`,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      price,
    });
  };

  if (mode === "none") {
    return (
      <div className="space-y-4">
        <div className="p-5 rounded-2xl text-center" style={{ background: cardBg }}>
          <Clock size={32} className="mx-auto mb-3" style={{ color: accentColor }} />
          <h3 className="text-[16px] font-bold mb-1" style={{ color: textPrimary }}>Walk-in welcome</h3>
          <p className="text-[13px]" style={{ color: textTertiary }}>
            {placeName} doesn&apos;t take online bookings — check hours below or drop in.
          </p>
        </div>
        {hoursBlock(hours, cardBg, textPrimary, textSecondary, textTertiary, accentColor, isDark)}
        {phoneBlock(phone, cardBg, textTertiary, accentColor, isDark)}
      </div>
    );
  }

  if (mode === "membership") {
    return (
      <div className="space-y-4">
        <div className="p-5 rounded-2xl" style={{ background: cardBg }}>
          <h3 className="text-[16px] font-bold mb-1" style={{ color: textPrimary }}>Membership</h3>
          <p className="text-[13px] mb-4" style={{ color: textTertiary }}>
            Enquire about plans and join {placeName}.
          </p>
          {pricingEntries.length > 0 && (
            <div className="space-y-1.5 mb-4">
              {pricingEntries.map(([key, val]) => (
                <div key={key} className="flex justify-between text-[13px] py-1">
                  <span style={{ color: textSecondary }}>{key}</span>
                  <span className="font-medium" style={{ color: textPrimary }}>{String(val)}</span>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={onRequestModal}
            className="w-full h-11 rounded-full text-[14px] font-bold transition-all active:scale-[0.96]"
            style={{ background: accentColor, color: "#fff" }}
          >
            Enquire to join
          </button>
        </div>
        {hoursBlock(hours, cardBg, textPrimary, textSecondary, textTertiary, accentColor, isDark)}
        {phoneBlock(phone, cardBg, textTertiary, accentColor, isDark)}
      </div>
    );
  }

  if (mode === "slots") {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl" style={{ background: cardBg }}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} style={{ color: accentColor }} />
            <h3 className="text-[14px] font-bold" style={{ color: textPrimary }}>Pick a date</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {dates.map((iso) => {
              const chip = formatDateChip(iso);
              const active = iso === selectedDate;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    setSelectedDate(iso);
                    setSelectedSlot(null);
                  }}
                  className="shrink-0 w-[52px] py-2 rounded-xl text-center transition-all"
                  style={{
                    background: active ? accentColor : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                    color: active ? "#fff" : textSecondary,
                    border: active ? "none" : `1px solid ${borderColor}`,
                  }}
                >
                  <div className="text-[10px] font-medium opacity-80">{chip.weekday}</div>
                  <div className="text-[15px] font-bold leading-tight">{chip.day}</div>
                  <div className="text-[10px] opacity-70">{chip.month}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 rounded-2xl" style={{ background: cardBg }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-bold" style={{ color: textPrimary }}>Available times</h3>
            {slotDurationMinutes ? (
              <span className="text-[11px]" style={{ color: textTertiary }}>
                {slotDurationMinutes} min slots
              </span>
            ) : null}
          </div>

          {slotsLoading && !isDemo ? (
            <p className="text-[13px] py-4 text-center" style={{ color: textTertiary }}>Loading slots…</p>
          ) : openSlots.length === 0 ? (
            <p className="text-[13px] py-4 text-center" style={{ color: textTertiary }}>
              No open slots this day — try another date.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {openSlots.map((slot) => {
                const active =
                  selectedSlot?.startTime === slot.startTime && selectedSlot?.endTime === slot.endTime;
                return (
                  <button
                    key={slot.startTime}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className="py-2.5 px-2 rounded-xl text-[12px] font-semibold transition-all"
                    style={{
                      background: active ? accentColor : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                      color: active ? "#fff" : textPrimary,
                      border: active ? "none" : `1px solid ${borderColor}`,
                    }}
                  >
                    <div>{slot.label}</div>
                    {slot.price != null ? (
                      <div className="text-[10px] font-normal opacity-80">€{slot.price}</div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={handleSlotBook}
            disabled={!selectedSlot || isBooking}
            className="w-full h-11 rounded-full text-[14px] font-bold mt-4 transition-all active:scale-[0.96] disabled:opacity-50"
            style={{ background: accentColor, color: "#fff" }}
          >
            {isBooking ? "Booking…" : selectedSlot ? "Confirm slot" : "Select a time"}
          </button>
        </div>
      </div>
    );
  }

  // request mode
  return (
    <div className="space-y-4">
      <div className="p-5 rounded-2xl text-center" style={{ background: cardBg }}>
        <Calendar size={32} className="mx-auto mb-3" style={{ color: accentColor }} />
        <h3 className="text-[16px] font-bold mb-1" style={{ color: textPrimary }}>Request a booking</h3>
        <p className="text-[13px] mb-4" style={{ color: textTertiary }}>
          Send a request — {placeName} will confirm your slot.
        </p>
        <button
          type="button"
          onClick={onRequestModal}
          className="w-full h-11 rounded-full text-[14px] font-bold transition-all active:scale-[0.96]"
          style={{ background: accentColor, color: "#fff" }}
        >
          Request booking
        </button>
      </div>
      {pricingEntries.length > 0 && (
        <div className="p-4 rounded-2xl" style={{ background: cardBg }}>
          <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-3" style={{ color: textTertiary }}>
            Pricing
          </h3>
          {pricingEntries.map(([key, val]) => (
            <div key={key} className="flex justify-between text-[13px] py-1.5">
              <span style={{ color: textSecondary }}>{key}</span>
              <span className="font-medium" style={{ color: textPrimary }}>{String(val)}</span>
            </div>
          ))}
        </div>
      )}
      {hoursBlock(hours, cardBg, textPrimary, textSecondary, textTertiary, accentColor, isDark)}
      {phoneBlock(phone, cardBg, textTertiary, accentColor, isDark)}
    </div>
  );
}

function hoursBlock(
  hours: Record<string, string> | null | undefined,
  cardBg: string,
  textPrimary: string,
  textSecondary: string,
  textTertiary: string,
  accentColor: string,
  isDark: boolean,
) {
  if (!hours || Object.keys(hours).length === 0) return null;
  return (
    <div className="p-4 rounded-2xl" style={{ background: cardBg }}>
      <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-3" style={{ color: textTertiary }}>
        <Clock size={13} className="inline mr-1.5" />
        Hours
      </h3>
      <div className="space-y-1">
        {Object.entries(hours).map(([day, h]) => {
          const isToday =
            ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()] ===
            day.toLowerCase();
          return (
            <div
              key={day}
              className="flex justify-between text-[13px] px-3 py-1.5 rounded-lg"
              style={{
                background: isToday ? (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)") : "transparent",
              }}
            >
              <span
                className="capitalize"
                style={{ color: isToday ? textPrimary : textTertiary, fontWeight: isToday ? 600 : 400 }}
              >
                {isToday ? `${day} (today)` : day}
              </span>
              <span style={{ color: isToday ? accentColor : textSecondary, fontWeight: isToday ? 600 : 500 }}>
                {h}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function phoneBlock(
  phone: string | null | undefined,
  cardBg: string,
  textTertiary: string,
  accentColor: string,
  isDark: boolean,
) {
  if (!phone) return null;
  return (
    <div className="p-4 rounded-2xl" style={{ background: cardBg }}>
      <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-3" style={{ color: textTertiary }}>
        Contact
      </h3>
      <a
        href={`tel:${phone}`}
        className="flex items-center gap-3 px-3 py-2 rounded-xl"
        style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}
      >
        <Phone size={16} style={{ color: accentColor }} />
        <span className="text-[13px] font-medium" style={{ color: accentColor }}>
          {phone}
        </span>
      </a>
    </div>
  );
}
