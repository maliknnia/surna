import { Geolocation, type PositionOptions, type WatchPositionCallback } from "@capacitor/geolocation";
import { isNativePlatform } from "./platform";

export type GeoCoords = {
  lat: number;
  lng: number;
  accuracy?: number;
};

const defaultOptions: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 300000,
};

/** Get current position — Capacitor Geolocation on native, browser API on web */
export async function getCurrentPosition(
  options?: PositionOptions,
): Promise<{ coords: GeoCoords; error?: string }> {
  const opts = { ...defaultOptions, ...options };

  if (isNativePlatform()) {
    try {
      const perm = await Geolocation.requestPermissions();
      if (perm.location === "denied") {
        return { coords: { lat: 0, lng: 0 }, error: "Location access denied" };
      }
      const pos = await Geolocation.getCurrentPosition(opts);
      return {
        coords: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        },
      };
    } catch (e) {
      return {
        coords: { lat: 0, lng: 0 },
        error: e instanceof Error ? e.message : "Location unavailable",
      };
    }
  }

  if (!navigator.geolocation) {
    return { coords: { lat: 0, lng: 0 }, error: "Geolocation not supported" };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        }),
      (error) =>
        resolve({
          coords: { lat: 0, lng: 0 },
          error: error.message,
        }),
      opts,
    );
  });
}

/** Watch position — Capacitor on native, browser watchPosition on web */
export async function watchPosition(
  callback: (coords: GeoCoords) => void,
  options?: PositionOptions,
): Promise<string | number> {
  const opts = { ...defaultOptions, ...options };

  if (isNativePlatform()) {
    await Geolocation.requestPermissions();
    return Geolocation.watchPosition(opts, (pos, err) => {
      if (err || !pos) return;
      callback({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
    });
  }

  if (!navigator.geolocation) return -1;
  return navigator.geolocation.watchPosition(
    (position) =>
      callback({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
    () => {},
    opts,
  );
}

export function clearWatch(watchId: string | number): void {
  if (isNativePlatform() && typeof watchId === "string") {
    void Geolocation.clearWatch({ id: watchId });
    return;
  }
  if (typeof watchId === "number" && watchId >= 0) {
    navigator.geolocation.clearWatch(watchId);
  }
}
