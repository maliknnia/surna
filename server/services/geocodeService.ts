import { LocationService } from "./locationService";
import { formatVenueAddress, type VenueAddress } from "@shared/venueAddress";

export type GeocodeHit = {
  lat: number;
  lng: number;
  formattedAddress: string;
  provider: "google" | "nominatim";
};

/** OpenStreetMap Nominatim (no API key). Respect usage policy: low volume, User-Agent required. */
async function geocodeNominatim(query: string): Promise<GeocodeHit | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "ie");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "SurnaSportsApp/1.0 (contact@surna.app)",
    },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!data?.length) return null;

  const hit = data[0];
  return {
    lat: parseFloat(hit.lat),
    lng: parseFloat(hit.lon),
    formattedAddress: hit.display_name,
    provider: "nominatim",
  };
}

export async function geocodeQuery(query: string): Promise<GeocodeHit | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const google = await LocationService.geocodeAddress(trimmed);
  if (google?.location) {
    return {
      lat: google.location.lat,
      lng: google.location.lng,
      formattedAddress: google.formattedAddress || trimmed,
      provider: "google",
    };
  }

  return geocodeNominatim(trimmed);
}

export async function geocodeVenueAddress(address: VenueAddress): Promise<GeocodeHit | null> {
  return geocodeQuery(formatVenueAddress(address));
}

export async function reverseGeocodeQuery(lat: number, lng: number): Promise<string | null> {
  const google = await LocationService.reverseGeocode({ lat, lng });
  if (google) return google;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "json");

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "SurnaSportsApp/1.0 (contact@surna.app)",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}
