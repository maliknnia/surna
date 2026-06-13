// Geolocation utilities with Capacitor + manual fallback
import { getCurrentPosition as capGetCurrentPosition } from "@/lib/capacitor/geolocation";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationResult {
  coords: Coordinates;
  accuracy?: number;
  source: 'gps' | 'manual' | 'error';
  error?: string;
}

/**
 * Request user's current location with permission handling
 */
export async function getCurrentLocation(): Promise<LocationResult> {
  const result = await capGetCurrentPosition();
  if (result.error) {
    return {
      coords: { lat: 0, lng: 0 },
      source: 'error',
      error: result.error,
    };
  }
  return {
    coords: { lat: result.coords.lat, lng: result.coords.lng },
    accuracy: result.coords.accuracy,
    source: 'gps',
  };
}

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  
  const lat1Rad = point1.lat * Math.PI / 180;
  const lat2Rad = point2.lat * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
           Math.cos(lat1Rad) * Math.cos(lat2Rad) *
           Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Generate Google Maps navigation URL
 */
export function getNavigationUrl(destination: Coordinates, origin?: Coordinates): string {
  const baseUrl = 'https://www.google.com/maps/dir/';
  
  if (origin) {
    return `${baseUrl}${origin.lat},${origin.lng}/${destination.lat},${destination.lng}`;
  }
  
  return `${baseUrl}?api=1&destination=${destination.lat},${destination.lng}`;
}

/**
 * Validate coordinate values
 */
export function isValidCoordinates(coords: Coordinates): boolean {
  return (
    typeof coords.lat === 'number' &&
    typeof coords.lng === 'number' &&
    coords.lat >= -90 && coords.lat <= 90 &&
    coords.lng >= -180 && coords.lng <= 180 &&
    !isNaN(coords.lat) && !isNaN(coords.lng)
  );
}

/**
 * Parse coordinates from string input
 */
export function parseCoordinates(input: string): Coordinates | null {
  const cleaned = input.trim().replace(/[^\d.,-]/g, '');
  const parts = cleaned.split(/[,\s]+/);
  
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    
    const coords = { lat, lng };
    return isValidCoordinates(coords) ? coords : null;
  }
  
  return null;
}
