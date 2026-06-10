import { useEffect } from "react";
import { useLocation } from "wouter";
import { proRouteForFeature } from "@/lib/proFeatures";

/** Redirects /pro?feature=… to the matching Pro module route. */
export function ProDeepLinkRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const feature = params.get("feature");
    if (!feature) return;

    const target = proRouteForFeature(feature);
    if (target !== "/pro") {
      const from = params.get("from");
      const qs = from ? `?from=${encodeURIComponent(from)}` : "";
      setLocation(`${target}${qs}`);
    }
  }, [setLocation]);

  return null;
}
