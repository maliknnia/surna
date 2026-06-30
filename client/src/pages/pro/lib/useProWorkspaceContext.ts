import { useMemo } from "react";
import { useProWorkspaceMode, type ProWorkspaceMode } from "./proWorkspaceMode";
import { useProTeam } from "../components/ProTeamContext";
import { useProPlace } from "../components/ProPlaceContext";
import { useProShop } from "../components/ProShopContext";
import { withWorkspaceQuery, type WorkspaceQuery } from "./proWorkspaceNav";

export function useProWorkspaceContext() {
  const { mode, isTeamMode, isPlaceMode, isShopMode, basePath } = useProWorkspaceMode();
  const { teamId, activeTeam } = useProTeam();
  const { placeId, activePlace } = useProPlace();
  const { shopId, activeShop, stats: shopStats } = useProShop();

  const entityName = useMemo(() => {
    if (isShopMode) return activeShop?.name ?? "Your shop";
    if (isPlaceMode) return activePlace?.name ?? "Your venue";
    return activeTeam?.name ?? "Your team";
  }, [isShopMode, isPlaceMode, activeShop?.name, activePlace?.name, activeTeam?.name]);

  const workspaceQuery: WorkspaceQuery = useMemo(
    () => (isShopMode ? { shopId } : isPlaceMode ? { placeId } : { teamId }),
    [isShopMode, isPlaceMode, shopId, placeId, teamId],
  );

  const withQuery = (path: string) => withWorkspaceQuery(path, workspaceQuery);

  const pageSubtitle = (topic: string) => {
    if (isShopMode) return `${entityName} · ${topic}`;
    if (isPlaceMode) return `${entityName} · ${topic}`;
    return `${entityName} · ${topic}`;
  };

  return {
    mode,
    isTeamMode,
    isPlaceMode,
    isShopMode,
    basePath,
    teamId,
    placeId,
    shopId,
    activeTeam,
    activePlace,
    activeShop,
    shopStats,
    entityName,
    workspaceQuery,
    withQuery,
    pageSubtitle,
  };
}

export function useProWorkspaceGate(required: ProWorkspaceMode | ProWorkspaceMode[]) {
  const { mode } = useProWorkspaceContext();
  const requiredModes = Array.isArray(required) ? required : [required];
  const blocked = !requiredModes.includes(mode);
  return { blocked, mode, requiredModes };
}
