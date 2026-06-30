import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "surna.pro.placeId";

export type ProPlaceSummary = {
  id: string;
  name: string;
  category?: string | null;
  city?: string | null;
  state?: string | null;
  pendingBookingsCount?: number;
  upcomingBookingsCount?: number;
  bookingsCount?: number;
  followersCount?: number;
  viewsCount?: number;
  isActive?: boolean | null;
};

type Ctx = {
  placeId: string | null;
  setPlaceId: (id: string) => void;
  places: ProPlaceSummary[];
  placesLoading: boolean;
  activePlace: ProPlaceSummary | null;
};

const ProPlaceContext = createContext<Ctx | null>(null);

export function ProPlaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();

  const { data: rawPlaces, isLoading: placesLoading } = useQuery<{ items: ProPlaceSummary[] }>({
    queryKey: ["/api/places/me/owned"],
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const places = useMemo(() => rawPlaces?.items ?? [], [rawPlaces?.items]);

  const [placeId, setPlaceIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const setPlaceId = useCallback((id: string) => {
    setPlaceIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (places.length === 0) return;
    const fromUrl = new URLSearchParams(window.location.search).get("place");
    if (fromUrl && places.some((p) => p.id === fromUrl)) {
      setPlaceIdState(fromUrl);
      try {
        localStorage.setItem(STORAGE_KEY, fromUrl);
      } catch {
        /* ignore */
      }
      return;
    }
    const valid = placeId && places.some((p) => p.id === placeId);
    if (valid) return;
    const next = places[0].id;
    setPlaceIdState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, [placeId, places, location]);

  const activePlace = useMemo(() => {
    if (places.length === 0) return null;
    if (placeId) {
      const found = places.find((p) => p.id === placeId);
      if (found) return found;
    }
    return places[0];
  }, [placeId, places]);

  const value = useMemo(
    () => ({
      placeId,
      setPlaceId,
      places,
      placesLoading,
      activePlace,
    }),
    [placeId, places, placesLoading, activePlace, setPlaceId],
  );

  return <ProPlaceContext.Provider value={value}>{children}</ProPlaceContext.Provider>;
}

export function useProPlace(): Ctx {
  const ctx = useContext(ProPlaceContext);
  if (!ctx) {
    return {
      placeId: null,
      setPlaceId: () => {},
      places: [],
      placesLoading: false,
      activePlace: null,
    };
  }
  return ctx;
}

