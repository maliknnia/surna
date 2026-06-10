import { useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loadAppPreferences,
  preferencesToPresenceVisibility,
  saveAppPreferences,
  type AppPreferences,
} from "@/lib/userPreferences";
import { loadMapSettingsLocal } from "@/lib/mapSettings";
import { mapAudienceToPresenceVisibility } from "@shared/mapSettings";
import type { LocationAudience } from "@shared/locationSharing";
import { visibilityToAudience } from "@shared/locationSharing";
import { apiRequest } from "@/lib/queryClient";

type Coordinates = { lat: number; lng: number };

type PresenceMe = {
  visibility?: string;
  status?: string;
  blurRadiusM?: number;
  familyCount?: number;
};

/** Sync map presence + settings with Snapchat-style location audiences. */
export function useLocationSharing(location: Coordinates | null, enabled = true) {
  const queryClient = useQueryClient();
  const prefsRef = useRef(loadAppPreferences());
  prefsRef.current = loadAppPreferences();

  const { data: presenceMe } = useQuery<PresenceMe>({
    queryKey: ["/api/presence/me"],
    enabled,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!enabled || !presenceMe?.visibility) return;
    const audience = visibilityToAudience(presenceMe.visibility);
    const current = loadAppPreferences();
    const shareLocation = presenceMe.visibility !== "ghost";
    if (
      current.locationAudience !== audience ||
      current.shareLocation !== shareLocation
    ) {
      saveAppPreferences({ locationAudience: audience, shareLocation });
    }
  }, [enabled, presenceMe?.visibility]);

  const pushPresence = useCallback(async (coords: Coordinates) => {
    const mapPrefs = loadMapSettingsLocal();
    const shareOn = !mapPrefs.ghostMode && mapPrefs.locationAudience !== "nobody";
    if (!shareOn) return;
    const visibility = mapAudienceToPresenceVisibility(
      mapPrefs.locationAudience,
      mapPrefs.ghostMode,
    );
    const blurRadiusM = mapPrefs.blurLocation ? 500 : 0;
    try {
      await apiRequest("POST", "/api/presence/update", {
        lat: coords.lat,
        lng: coords.lng,
        status: mapPrefs.showActiveStatus ? "active" : "idle",
        visibility,
        blurRadiusM,
      });
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    if (!enabled || !location) return;
    const mapPrefs = loadMapSettingsLocal();
    if (mapPrefs.ghostMode || mapPrefs.locationAudience === "nobody") return;

    void pushPresence(location);
    const interval = setInterval(() => {
      void apiRequest("POST", "/api/presence/heartbeat").catch(() => {});
    }, 45_000);
    return () => clearInterval(interval);
  }, [enabled, location?.lat, location?.lng, pushPresence]);

  const updatePreferences = useCallback(
    async (patch: Partial<AppPreferences>) => {
      const next = saveAppPreferences(patch);
      queryClient.setQueryData(["/api/presence/me"], (prev: PresenceMe | undefined) => ({
        ...prev,
        visibility: preferencesToPresenceVisibility(next),
        familyCount: prev?.familyCount,
      }));

      if (location && next.shareLocation) {
        await pushPresence(location);
      } else if (!next.shareLocation && location) {
        try {
          await apiRequest("POST", "/api/presence/update", {
            lat: location.lat,
            lng: location.lng,
            status: "active",
            visibility: "ghost",
            blurRadiusM: 0,
          });
        } catch {
          /* ignore */
        }
      }
      return next;
    },
    [location, pushPresence, queryClient],
  );

  return {
    presenceMe,
    updatePreferences,
    currentVisibility: preferencesToPresenceVisibility(loadAppPreferences()),
  };
}

export type { LocationAudience };
