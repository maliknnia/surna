import { useRef, useState } from "react";

type PullToRefreshOptions = {
  threshold?: number;
  /** Defaults to window.scrollY — pass ref scrollTop for nested scroll containers */
  getScrollTop?: () => number;
  /** When false, handlers are no-ops (e.g. embedded panels inside a parent scroller). */
  enabled?: boolean;
};

export function usePullToRefresh(
  onRefresh: () => Promise<void> | void,
  options: PullToRefreshOptions = {},
) {
  const threshold = options.threshold ?? 70;
  const getScrollTop = options.getScrollTop ?? (() => window.scrollY);
  const enabled = options.enabled !== false;
  const startYRef = useRef<number | null>(null);
  const startXRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const axisLockedRef = useRef<"v" | "h" | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (!enabled || getScrollTop() > 0 || isRefreshing) return;
    startYRef.current = e.touches[0].clientY;
    startXRef.current = e.touches[0].clientX;
    axisLockedRef.current = null;
    pullingRef.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!enabled || !pullingRef.current || startYRef.current === null || startXRef.current === null || isRefreshing) {
      return;
    }
    const dy = e.touches[0].clientY - startYRef.current;
    const dx = e.touches[0].clientX - startXRef.current;

    if (!axisLockedRef.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      axisLockedRef.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }

    if (axisLockedRef.current === "h") {
      setPullDistance(0);
      pullingRef.current = false;
      return;
    }

    if (dy <= 0) {
      setPullDistance(0);
      return;
    }
    setPullDistance(Math.min(120, dy * 0.55));
  };

  const onTouchEnd = async () => {
    if (!enabled || !pullingRef.current || isRefreshing) {
      pullingRef.current = false;
      startYRef.current = null;
      startXRef.current = null;
      axisLockedRef.current = null;
      setPullDistance(0);
      return;
    }
    pullingRef.current = false;
    if (pullDistance >= threshold && axisLockedRef.current === "v") {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    startYRef.current = null;
    startXRef.current = null;
    axisLockedRef.current = null;
  };

  return {
    isRefreshing,
    pullDistance,
    touchHandlers: enabled
      ? { onTouchStart, onTouchMove, onTouchEnd }
      : {},
  };
}
