import { useLocation } from "wouter";

export type ProWorkspaceMode = "team" | "place" | "shop";

export function useProWorkspaceMode() {
  const [location] = useLocation();
  const basePath = location.split("?")[0];
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const placeIdFromUrl = params.get("place");
  const teamIdFromUrl = params.get("team");
  const shopIdFromUrl = params.get("shop");

  const isShopHome = basePath === "/pro/shop";
  const isPlaceHome = basePath === "/pro/place";
  const isTeamHome = basePath === "/pro";

  const isShopMode = isShopHome || (!!shopIdFromUrl && !teamIdFromUrl && !placeIdFromUrl);
  const isPlaceMode = !isShopMode && (isPlaceHome || (!!placeIdFromUrl && !teamIdFromUrl));
  const isTeamMode =
    !isPlaceMode &&
    !isShopMode &&
    (isTeamHome || !!teamIdFromUrl || (basePath.startsWith("/pro/") && !isPlaceHome && !isShopHome));

  let mode: ProWorkspaceMode = "team";
  if (isShopMode) mode = "shop";
  else if (isPlaceMode) mode = "place";

  return {
    mode,
    isShopMode,
    isPlaceMode,
    isTeamMode,
    isShopHome,
    isPlaceHome,
    isTeamHome,
    basePath,
    placeIdFromUrl,
    teamIdFromUrl,
    shopIdFromUrl,
  };
}
