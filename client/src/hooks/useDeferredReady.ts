import { useEffect, useState } from "react";

/** Flip true after first paint so secondary work does not block initial render. */
export function useDeferredReady(delayMs = 0): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) setReady(true);
    };

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: Math.max(delayMs, 120) });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const t = window.setTimeout(run, delayMs || 50);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [delayMs]);

  return ready;
}
