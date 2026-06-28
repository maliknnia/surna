/** How a venue accepts reservations. */
export type PlaceBookingMode = "slots" | "membership" | "request" | "none";

export const PLACE_BOOKING_MODES: { value: PlaceBookingMode; label: string; description: string }[] = [
  {
    value: "slots",
    label: "Time slots",
    description: "Courts, pitches, studios — guests pick an open slot (Airbnb-style).",
  },
  {
    value: "membership",
    label: "Membership",
    description: "Gyms and clubs — pricing plans; guests enquire to join.",
  },
  {
    value: "request",
    label: "Request approval",
    description: "Clubs and private hire — owner confirms each booking.",
  },
  {
    value: "none",
    label: "Walk-in only",
    description: "Cafés and info-only listings — hours and contact, no online booking.",
  },
];

const SLOT_CATEGORIES = new Set([
  "court",
  "field",
  "gaa-pitch",
  "rugby-pitch",
  "cricket-pitch",
  "studio",
  "pool",
  "track",
]);

export function defaultBookingModeForCategory(category: string): PlaceBookingMode {
  const c = category.toLowerCase();
  if (c === "gym") return "membership";
  if (c === "club" || c === "nightlife" || c === "bar") return "request";
  if (c === "cafe" || c === "restaurant") return "none";
  if (SLOT_CATEGORIES.has(c)) return "slots";
  return "request";
}

export interface PlaceAvailabilitySlot {
  startTime: string;
  endTime: string;
  label: string;
  price: number | null;
  available: boolean;
}

export type PlaceSlotCalendarState = "available" | "booked" | "pending" | "blocked" | "past" | "closed";

export interface PlaceSlotCalendarEntry extends PlaceAvailabilitySlot {
  state: PlaceSlotCalendarState;
  bookingId?: string;
  bookingTitle?: string;
  bookingStatus?: string;
  blockId?: string;
  blockReason?: string;
}
