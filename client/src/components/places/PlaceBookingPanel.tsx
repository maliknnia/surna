import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, Clock, Phone } from "lucide-react";
import type { PlaceAvailabilitySlot, PlaceBookingMode } from "@shared/placeBooking";
import type { PlaceBooking, PlaceMembershipPlan } from "@shared/schema";
import { formatMembershipPrice } from "@shared/placeMembership";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  onMembershipSuccess?: (booking: PlaceBooking) => void;
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
  onMembershipSuccess,
}: PlaceBookingPanelProps) {
  const { toast } = useToast();
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

  const { data: membershipData, isLoading: plansLoading } = useQuery<{ plans: PlaceMembershipPlan[] }>({
    queryKey: ["/api/places", placeId, "membership-plans"],
    queryFn: async () => {
      const res = await fetch(`/api/places/${placeId}/membership-plans`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load plans");
      return res.json();
    },
    enabled: mode === "membership" && !!placeId && !isDemo,
  });

  const membershipPlans = membershipData?.plans ?? [];
  const [enquiringPlanId, setEnquiringPlanId] = useState<string | null>(null);
  const [checkingOutPlanId, setCheckingOutPlanId] = useState<string | null>(null);

  const { data: checkoutStatus } = useQuery<{ available: boolean }>({
    queryKey: ["/api/places/membership-checkout/status"],
    queryFn: async () => {
      const res = await fetch("/api/places/membership-checkout/status", { credentials: "include" });
      if (!res.ok) return { available: false };
      return res.json();
    },
    enabled: mode === "membership" && !isDemo,
    staleTime: 60_000,
  });
  const checkoutAvailable = checkoutStatus?.available ?? false;

  const enquireMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await apiRequest(
        "POST",
        `/api/places/${placeId}/membership-plans/${planId}/enquire`,
        {},
      );
      return res.json() as Promise<PlaceBooking>;
    },
    onSuccess: (booking) => {
      setEnquiringPlanId(null);
      onMembershipSuccess?.(booking);
    },
    onError: (err: Error) => {
      setEnquiringPlanId(null);
      toast({ title: "Enquiry failed", description: err.message, variant: "destructive" });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await apiRequest(
        "POST",
        `/api/places/${placeId}/membership-plans/${planId}/checkout`,
        { cancelUrl: `${window.location.origin}/places/${placeId}` },
      );
      return res.json() as Promise<{ url: string }>;
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (err: Error) => {
      setCheckingOutPlanId(null);
      toast({ title: "Checkout unavailable", description: err.message, variant: "destructive" });
    },
  });

  const demoPlans = useMemo((): PlaceMembershipPlan[] => {
    if (!isDemo || mode !== "membership") return [];
    return [
      {
        id: "demo-plan-monthly",
        placeId: placeId ?? "",
        name: "Monthly unlimited",
        description: "Full gym floor + classes",
        price: "49.00",
        billingInterval: "monthly",
        features: ["24/7 access", "Group classes", "Locker room"],
        isActive: true,
        displayOrder: 0,
        stripePriceId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "demo-plan-day",
        placeId: placeId ?? "",
        name: "Day pass",
        description: "Single visit",
        price: "15.00",
        billingInterval: "once",
        features: ["Gym floor", "Same-day only"],
        isActive: true,
        displayOrder: 1,
        stripePriceId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }, [isDemo, mode, placeId]);

  const visiblePlans = isDemo ? demoPlans : membershipPlans;

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
          <h3 className="text-[16px] font-bold mb-1" style={{ color: textPrimary }}>Membership plans</h3>
          <p className="text-[13px] mb-4" style={{ color: textTertiary }}>
            {checkoutAvailable
              ? `Pay online or send an enquiry — ${placeName} will get your details either way.`
              : `Choose a plan — ${placeName} will confirm your enquiry.`}
          </p>

          {plansLoading && !isDemo ? (
            <p className="text-[13px] py-4 text-center" style={{ color: textTertiary }}>Loading plans…</p>
          ) : visiblePlans.length > 0 ? (
            <div className="space-y-3">
              {visiblePlans.map((plan) => (
                <div
                  key={plan.id}
                  className="p-4 rounded-xl"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-bold" style={{ color: textPrimary }}>{plan.name}</p>
                      <p className="text-[13px] font-semibold mt-0.5" style={{ color: accentColor }}>
                        {formatMembershipPrice(plan.price ?? "0", plan.billingInterval ?? "monthly")}
                      </p>
                      {plan.description ? (
                        <p className="text-[12px] mt-1" style={{ color: textSecondary }}>{plan.description}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {checkoutAvailable && parseFloat(String(plan.price ?? "0")) > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCheckingOutPlanId(plan.id);
                            checkoutMutation.mutate(plan.id);
                          }}
                          disabled={checkingOutPlanId === plan.id && checkoutMutation.isPending}
                          className="px-4 h-9 rounded-full text-[12px] font-bold transition-all active:scale-[0.96] disabled:opacity-60"
                          style={{ background: accentColor, color: "#fff" }}
                        >
                          {checkingOutPlanId === plan.id && checkoutMutation.isPending ? "Redirecting…" : "Pay now"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          if (isDemo) {
                            onBook({
                              bookingType: "membership",
                              title: `${placeName} — ${plan.name}`,
                              startTime: new Date().toISOString(),
                              endTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                              price: plan.price != null ? String(plan.price) : undefined,
                            });
                            return;
                          }
                          setEnquiringPlanId(plan.id);
                          enquireMutation.mutate(plan.id);
                        }}
                        disabled={enquiringPlanId === plan.id && enquireMutation.isPending}
                        className="px-4 h-9 rounded-full text-[12px] font-semibold transition-all active:scale-[0.96] disabled:opacity-60 border"
                        style={{
                          background: checkoutAvailable ? "transparent" : accentColor,
                          color: checkoutAvailable ? textSecondary : "#fff",
                          borderColor: borderColor,
                        }}
                      >
                        {enquiringPlanId === plan.id && enquireMutation.isPending ? "Sending…" : "Enquire"}
                      </button>
                    </div>
                  </div>
                  {(plan.features ?? []).length > 0 ? (
                    <ul className="mt-2 space-y-0.5 text-[11px] list-disc pl-4" style={{ color: textTertiary }}>
                      {plan.features!.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <>
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
            </>
          )}
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
