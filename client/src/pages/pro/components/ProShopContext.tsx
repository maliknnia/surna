import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "surna.pro.shopId";

export type ProShopSummary = {
  id: string;
  name: string;
  businessType?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  location?: string | null;
  city?: string | null;
  followersCount?: number;
  productsCount?: number;
  isVerified?: boolean;
  isActive?: boolean;
};

export type ProShopStats = {
  activeProducts: number;
  totalProducts: number;
  pendingOrders: number;
  completedOrders: number;
  totalOrders: number;
};

type Ctx = {
  shopId: string | null;
  setShopId: (id: string) => void;
  shops: ProShopSummary[];
  shopsLoading: boolean;
  activeShop: ProShopSummary | null;
  stats: ProShopStats | null;
};

const ProShopContext = createContext<Ctx | null>(null);

export function ProShopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();

  const { data, isLoading: shopsLoading } = useQuery<{ shop: ProShopSummary; stats: ProShopStats }>({
    queryKey: ["/api/marketplace/seller/shop"],
    enabled: !!user?.id,
    staleTime: 60_000,
    retry: false,
  });

  const shops = useMemo(() => (data?.shop ? [data.shop] : []), [data?.shop]);
  const stats = data?.stats ?? null;

  const [shopId, setShopIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const setShopId = useCallback((id: string) => {
    setShopIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (shops.length === 0) return;
    const fromUrl = new URLSearchParams(window.location.search).get("shop");
    if (fromUrl && shops.some((s) => s.id === fromUrl)) {
      setShopIdState(fromUrl);
      try {
        localStorage.setItem(STORAGE_KEY, fromUrl);
      } catch {
        /* ignore */
      }
      return;
    }
    const valid = shopId && shops.some((s) => s.id === shopId);
    if (valid) return;
    const next = shops[0].id;
    setShopIdState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, [shopId, shops, location]);

  const activeShop = useMemo(() => {
    if (shops.length === 0) return null;
    if (shopId) {
      const found = shops.find((s) => s.id === shopId);
      if (found) return found;
    }
    return shops[0];
  }, [shopId, shops]);

  const value = useMemo(
    () => ({
      shopId,
      setShopId,
      shops,
      shopsLoading,
      activeShop,
      stats,
    }),
    [shopId, shops, shopsLoading, activeShop, stats, setShopId],
  );

  return <ProShopContext.Provider value={value}>{children}</ProShopContext.Provider>;
}

export function useProShop(): Ctx {
  const ctx = useContext(ProShopContext);
  if (!ctx) {
    return {
      shopId: null,
      setShopId: () => {},
      shops: [],
      shopsLoading: false,
      activeShop: null,
      stats: null,
    };
  }
  return ctx;
}
