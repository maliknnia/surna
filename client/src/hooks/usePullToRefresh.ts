import { useRef, useState } from "react";

type PullToRefreshOptions = {
  threshold?: number;
  /** Defaults to window.scrollY — pass ref scrollTop for nested scroll containers */
  getScrollTop?: () => number;
};

export function usePullToRefresh(
  onRefresh: () => Promise<void> | void,
  options: PullToRefreshOptions = {},
) {
  const threshold = options.threshold ?? 70;
  const getScrollTop = options.getScrollTop ?? (() => window.scrollY);
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (getScrollTop() > 0 || isRefreshing) return;
    startYRef.current = e.touches[0].clientY;
    pullingRef.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!pullingRef.current || startYRef.current === null || isRefreshing) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }
    setPullDistance(Math.min(120, delta * 0.55));
  };

  const onTouchEnd = async () => {
    if (!pullingRef.current || isRefreshing) return;
    pullingRef.current = false;
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    startYRef.current = null;
  };

  return {
    isRefreshing,
    pullDistance,
    touchHandlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
