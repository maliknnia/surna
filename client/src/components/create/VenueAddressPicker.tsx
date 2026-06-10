import { useCallback, useState } from "react";
import { MapPin, Navigation, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  EMPTY_VENUE_ADDRESS,
  formatEircode,
  formatVenueAddressShort,
  isVenueAddressComplete,
  venueAddressFieldErrors,
  type VenueAddress,
} from "@shared/venueAddress";
import { CreateFieldGroup, createInputClass } from "./CreateSection";
import { cn } from "@/lib/utils";

const IRISH_COUNTIES = [
  "Carlow", "Cavan", "Clare", "Cork", "Donegal", "Dublin", "Galway", "Kerry",
  "Kildare", "Kilkenny", "Laois", "Leitrim", "Limerick", "Longford", "Louth",
  "Mayo", "Meath", "Monaghan", "Offaly", "Roscommon", "Sligo", "Tipperary",
  "Waterford", "Westmeath", "Wexford", "Wicklow",
];

export type VenueGeocode = {
  lat: number;
  lng: number;
  formattedAddress: string;
};

type VenueAddressPickerProps = {
  value: VenueAddress;
  onChange: (next: VenueAddress) => void;
  geocode: VenueGeocode | null;
  onGeocode: (hit: VenueGeocode | null) => void;
};

export function VenueAddressPicker({ value, onChange, geocode, onGeocode }: VenueAddressPickerProps) {
  const [errors, setErrors] = useState<Partial<Record<keyof VenueAddress, string>>>({});
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const patch = (key: keyof VenueAddress, raw: string) => {
    const next = { ...value, [key]: key === "eircode" ? formatEircode(raw) : raw };
    onChange(next);
    onGeocode(null);
    setGeoError(null);
    if (errors[key]) {
      const fresh = venueAddressFieldErrors(next);
      setErrors(fresh);
    }
  };

  const runGeocode = useCallback(async () => {
    const fieldErrs = venueAddressFieldErrors(value);
    setErrors(fieldErrs);
    if (Object.keys(fieldErrs).length > 0) {
      setGeoError("Complete all address fields including a valid Eircode.");
      return;
    }
    setGeocoding(true);
    setGeoError(null);
    try {
      const res = await apiRequest("POST", "/api/location/geocode-venue", value);
      const data = await res.json();
      onGeocode({
        lat: data.lat,
        lng: data.lng,
        formattedAddress: data.formattedAddress,
      });
    } catch {
      setGeoError("We couldn't place this address on the map. Check the Eircode and try again.");
      onGeocode(null);
    } finally {
      setGeocoding(false);
    }
  }, [value, onGeocode]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Location is not available on this device.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await apiRequest("POST", "/api/location/reverse-geocode", {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          const data = await res.json();
          onGeocode({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            formattedAddress: data.address || "Current location",
          });
        } catch {
          onGeocode({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            formattedAddress: "Current location",
          });
        } finally {
          setLocating(false);
        }
      },
      () => {
        setGeoError("Allow location access to use this.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const inputStyle = { color: "var(--surna-text)" } as const;

  return (
    <div className="space-y-4">
      <CreateFieldGroup
        label="Venue or place name"
        hint="Court, park, hall, or building name"
        required
        error={errors.venueName}
      >
        <input
          className={createInputClass(!!errors.venueName)}
          style={inputStyle}
          placeholder="e.g. Pairc Ui Chaoimh — Pitch 2"
          value={value.venueName}
          onChange={(e) => patch("venueName", e.target.value)}
          data-testid="venue-name"
        />
      </CreateFieldGroup>

      <CreateFieldGroup label="Address line 1" hint="Street number and name" required error={errors.addressLine1}>
        <input
          className={createInputClass(!!errors.addressLine1)}
          style={inputStyle}
          placeholder="e.g. Tramore Road"
          value={value.addressLine1}
          onChange={(e) => patch("addressLine1", e.target.value)}
          data-testid="venue-line1"
        />
      </CreateFieldGroup>

      <CreateFieldGroup label="Address line 2" hint="Unit, building, or extra detail (optional)">
        <input
          className={createInputClass()}
          style={inputStyle}
          placeholder="e.g. Sports complex, rear entrance"
          value={value.addressLine2}
          onChange={(e) => patch("addressLine2", e.target.value)}
          data-testid="venue-line2"
        />
      </CreateFieldGroup>

      <div className="grid grid-cols-2 gap-3">
        <CreateFieldGroup label="Town / city" required error={errors.townCity}>
          <input
            className={createInputClass(!!errors.townCity)}
            style={inputStyle}
            placeholder="Cork"
            value={value.townCity}
            onChange={(e) => patch("townCity", e.target.value)}
            data-testid="venue-city"
          />
        </CreateFieldGroup>
        <CreateFieldGroup label="County" required error={errors.county}>
          <select
            className={cn(createInputClass(!!errors.county), "appearance-none")}
            style={inputStyle}
            value={value.county}
            onChange={(e) => patch("county", e.target.value)}
            data-testid="venue-county"
          >
            <option value="">Select</option>
            {IRISH_COUNTIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </CreateFieldGroup>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <CreateFieldGroup
          label="Eircode"
          hint="Required for map pin"
          required
          error={errors.eircode}
        >
          <input
            className={createInputClass(!!errors.eircode)}
            style={inputStyle}
            placeholder="T12 AB34"
            value={value.eircode}
            onChange={(e) => patch("eircode", e.target.value)}
            onBlur={() => {
              if (value.eircode && isVenueAddressComplete(value)) void runGeocode();
            }}
            data-testid="venue-eircode"
            autoCapitalize="characters"
          />
        </CreateFieldGroup>
        <CreateFieldGroup label="Country">
          <input
            className={createInputClass()}
            style={inputStyle}
            value={value.country}
            onChange={(e) => patch("country", e.target.value)}
            data-testid="venue-country"
          />
        </CreateFieldGroup>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => void runGeocode()}
          disabled={geocoding}
          className="flex-1 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: "var(--surna-text)", color: "var(--surna-base)" }}
          data-testid="venue-geocode"
        >
          {geocoding ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
          {geocoding ? "Finding on map…" : "Place on map"}
        </button>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="h-12 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border transition-all active:scale-[0.98] disabled:opacity-60"
          style={{
            borderColor: "var(--surna-separator)",
            background: "var(--surna-elevated)",
            color: "var(--surna-text)",
          }}
        >
          {locating ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
          Use my location
        </button>
      </div>

      {geoError ? (
        <div className="flex items-start gap-2 p-3 rounded-xl text-sm" style={{ background: "rgba(255,59,48,0.08)", color: "var(--surna-ios-red)" }}>
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{geoError}</span>
        </div>
      ) : null}

      {geocode ? (
        <div
          className="rounded-2xl overflow-hidden border"
          style={{ borderColor: "var(--surna-separator)", background: "var(--surna-elevated)" }}
          data-testid="venue-map-preview"
        >
          <div
            className="h-32 bg-cover bg-center relative"
            style={{
              backgroundImage: `url(https://staticmap.openstreetmap.de/staticmap.php?center=${geocode.lat},${geocode.lng}&zoom=15&size=640x200&markers=${geocode.lat},${geocode.lng},red-pushpin)`,
            }}
          />
          <div className="p-3 flex items-start gap-2">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" style={{ color: "var(--surna-ios-green)" }} />
            <div className="min-w-0">
              <p className="text-sm font-bold" style={{ color: "var(--surna-text)" }}>
                {formatVenueAddressShort(value)}
              </p>
              <p className="text-xs mt-0.5 truncate" style={{ color: "var(--surna-text-secondary)" }}>
                {geocode.formattedAddress}
              </p>
              <p className="text-[10px] mt-1 tabular-nums" style={{ color: "var(--surna-text-muted)" }}>
                {geocode.lat.toFixed(5)}, {geocode.lng.toFixed(5)} · Ready for SURNA Map
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-center py-2" style={{ color: "var(--surna-text-muted)" }}>
          Fill in the address through Eircode, then tap Place on map so players can find you exactly.
        </p>
      )}
    </div>
  );
}

export { EMPTY_VENUE_ADDRESS };
