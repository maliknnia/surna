/** Structured venue address (Ireland-first, Eircode-ready for map geocoding). */

export type VenueAddress = {
  venueName: string;
  addressLine1: string;
  addressLine2: string;
  townCity: string;
  county: string;
  eircode: string;
  country: string;
};

export const EMPTY_VENUE_ADDRESS: VenueAddress = {
  venueName: "",
  addressLine1: "",
  addressLine2: "",
  townCity: "",
  county: "",
  eircode: "",
  country: "Ireland",
};

/** Normalise Eircode: uppercase, single space before last 4 chars. */
export function formatEircode(raw: string): string {
  const compact = raw.replace(/\s+/g, "").toUpperCase();
  if (compact.length <= 3) return compact;
  return `${compact.slice(0, 3)} ${compact.slice(3, 7)}`.trim();
}

/** Irish Eircode: routing key (3) + unique id (4), optional space. */
export function isValidEircode(raw: string): boolean {
  const c = raw.replace(/\s+/g, "").toUpperCase();
  return /^[AC-FHKNPRTV-Y][0-9]{2}[AC-FHKNPRTV-Y0-9]{4}$/.test(c);
}

export function formatVenueAddress(a: VenueAddress): string {
  const parts = [
    a.venueName.trim(),
    a.addressLine1.trim(),
    a.addressLine2.trim(),
    a.townCity.trim(),
    a.county.trim(),
    formatEircode(a.eircode),
    a.country.trim() || "Ireland",
  ].filter(Boolean);
  return parts.join(", ");
}

export function formatVenueAddressShort(a: VenueAddress): string {
  const name = a.venueName.trim();
  const place = [a.townCity, a.county].filter(Boolean).join(", ");
  if (name && place) return `${name} · ${place}`;
  return name || place || formatEircode(a.eircode);
}

export function venueAddressFieldErrors(a: VenueAddress): Partial<Record<keyof VenueAddress, string>> {
  const err: Partial<Record<keyof VenueAddress, string>> = {};
  if (!a.venueName.trim()) err.venueName = "Venue or place name is required";
  if (!a.addressLine1.trim()) err.addressLine1 = "Street address is required";
  if (!a.townCity.trim()) err.townCity = "Town or city is required";
  if (!a.county.trim()) err.county = "County is required";
  if (!a.eircode.trim()) err.eircode = "Eircode is required";
  else if (!isValidEircode(a.eircode)) err.eircode = "Enter a valid Eircode (e.g. T12 AB34)";
  return err;
}

export function isVenueAddressComplete(a: VenueAddress): boolean {
  return Object.keys(venueAddressFieldErrors(a)).length === 0;
}
