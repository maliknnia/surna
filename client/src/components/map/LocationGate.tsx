import { useState, useEffect } from "react";
import { MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentLocation, parseCoordinates, type LocationResult, type Coordinates } from "@/lib/geo";

interface LocationGateProps {
  onLocationSet: (coords: Coordinates) => void;
  children: (coords: Coordinates) => React.ReactNode;
}

export default function LocationGate({ onLocationSet, children }: LocationGateProps) {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [manualInput, setManualInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => {
    // Try to get location automatically on mount
    requestLocation();
  }, []);

  const requestLocation = async () => {
    setIsLoading(true);
    setError("");
    
    const result: LocationResult = await getCurrentLocation();
    
    if (result.source === 'gps' && result.coords.lat !== 0 && result.coords.lng !== 0) {
      setLocation(result.coords);
      onLocationSet(result.coords);
    } else {
      setError(result.error || "Unable to get your location");
      setShowManualInput(true);
    }
    
    setIsLoading(false);
  };

  const handleManualSubmit = () => {
    const coords = parseCoordinates(manualInput);
    if (coords) {
      setLocation(coords);
      onLocationSet(coords);
      setError("");
    } else {
      setError("Invalid coordinates. Use format: 40.7128, -74.0060");
    }
  };

  if (location) {
    return <>{children(location)}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-background rounded-lg">
      <MapPin size={48} className="text-token-text mb-4" />
      
      <h3 className="text-lg font-semibold text-token-text mb-2">
        Location Required
      </h3>
      
      <p className="text-sm text-token-text text-center mb-6 max-w-md">
        We need your location to show nearby sports events and places. 
        Your location is only used for this session.
      </p>

      {error && (
        <div className="flex items-center gap-2 text-sm text-token-text mb-4">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {!showManualInput ? (
        <div className="flex flex-col gap-3">
          <Button 
            onClick={requestLocation}
            disabled={isLoading}
            className="min-w-[200px]"
            data-testid="button-location-permission"
          >
            {isLoading ? "Getting Location..." : "Allow Location Access"}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowManualInput(true)}
            data-testid="button-manual-location"
          >
            Enter Location Manually
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full max-w-md">
          <div className="flex gap-2">
            <Input
              placeholder="Latitude, Longitude (e.g., 40.7128, -74.0060)"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="flex-1"
              data-testid="input-manual-coordinates"
            />
            <Button 
              onClick={handleManualSubmit}
              disabled={!manualInput.trim()}
              data-testid="button-submit-coordinates"
            >
              Use
            </Button>
          </div>
          
          <Button
            variant="ghost"
            onClick={requestLocation}
            size="sm"
            data-testid="button-retry-gps"
          >
            Try GPS Again
          </Button>
          
          <p className="text-xs text-token-text text-center">
            You can find coordinates by searching your location on Google Maps
          </p>
        </div>
      )}
    </div>
  );
}