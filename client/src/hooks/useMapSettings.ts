import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  mapAudienceToPresenceVisibility,
  mergeMapSettings,
  type MapLocationAudience,
  type MapSettings,
} from "@shared/mapSettings";
import {
  loadMapSettingsLocal,
  resetMapSettingsLocal,
  saveMapSettingsLocal,
} from "@/lib/mapSettings";
import { apiRequest } from "@/lib/queryClient";
import { saveAppPreferences } from "@/lib/userPreferences";
import type { LocationAudience } from "@shared/locationSharing";

const QUERY_KEY = ["/api/user/map-preferences"];

function mapAudienceToAppAudience(audience: MapLocationAudience): LocationAudience {
  switch (audience) {
    case "everyone":
      return "public";
    case "teams":
      return "friends"; // legacy app prefs bucket; presence uses team_only
    case "friends":
      return "friends";
    case "nobody":
    default:
      return "ghost";
  }
}

export function useMapSettings(enabled = true) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<MapSettings>(() => loadMapSettingsLocal());
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: remoteSettings, isLoading } = useQuery<MapSettings>({
    queryKey: QUERY_KEY,
    enabled,
    queryFn: async () => {
      const res = await fetch("/api/user/map-preferences", { credentials: "include" });
      if (!res.ok) return loadMapSettingsLocal();
      const data = await res.json();
      const merged = mergeMapSettings(data);
      saveMapSettingsLocal(merged);
      return merged;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (remoteSettings) setSettings(remoteSettings);
  }, [remoteSettings]);

  const scheduleSync = useCallback(
    (next: MapSettings) => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => {
        void apiRequest("PATCH", "/api/user/map-preferences", next).catch(() => {});
        void apiRequest("PATCH", "/api/user/privacy", {
          ghostMode: next.ghostMode,
          mapLocationAudience: next.locationAudience,
          blurLocation: next.blurLocation,
          showActiveOnMap: next.showActiveStatus,
        }).catch(() => {});
        void apiRequest("PATCH", "/api/map/preferences", { layers: next.layers }).catch(() => {});
        queryClient.setQueryData(QUERY_KEY, next);
      }, 400);
    },
    [queryClient],
  );

  const applySettings = useCallback(
    (patch: Partial<MapSettings>) => {
      setSettings((prev) => {
        const next = mergeMapSettings({
          ...prev,
          ...patch,
          layers: patch.layers ? { ...prev.layers, ...patch.layers } : prev.layers,
        });
        saveMapSettingsLocal(next);

        const shareLocation = !next.ghostMode && next.locationAudience !== "nobody";
        saveAppPreferences({
          shareLocation,
          locationAudience: mapAudienceToAppAudience(next.locationAudience),
        });

        scheduleSync(next);
        return next;
      });
    },
    [scheduleSync],
  );

  const resetToDefaults = useCallback(() => {
    const defaults = resetMapSettingsLocal();
    setSettings(defaults);
    saveAppPreferences({ shareLocation: false, locationAudience: "ghost" });
    scheduleSync(defaults);
  }, [scheduleSync]);

  const presenceVisibility = mapAudienceToPresenceVisibility(
    settings.locationAudience,
    settings.ghostMode,
  );

  return {
    settings,
    isLoading,
    applySettings,
    resetToDefaults,
    presenceVisibility,
    blurRadiusM: settings.blurLocation ? 500 : 0,
    shareLocation: !settings.ghostMode && settings.locationAudience !== "nobody",
  };
}

export type { MapSettings, MapLocationAudience };
