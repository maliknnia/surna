import { useEffect } from "react";
import { useLocation } from "wouter";
import { proRouteForFeature } from "@/lib/proFeatures";

/** Redirects /pro?feature=… (and place/shop homes) to the matching Pro module route, preserving context. */
export function ProDeepLinkRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const feature = params.get("feature");
    if (!feature) return;

    const target = proRouteForFeature(feature);
    const basePath = window.location.pathname.split("?")[0];
    if (target !== "/pro" && target !== basePath) {
      const qs = new URLSearchParams();
      const team = params.get("team");
      const place = params.get("place");
      const shop = params.get("shop");
      const from = params.get("from");
      if (team) qs.set("team", team);
      if (place) qs.set("place", place);
      if (shop) qs.set("shop", shop);
      if (from) qs.set("from", from);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      setLocation(`${target}${suffix}`);
    }
  }, [setLocation]);

  return null;
}
