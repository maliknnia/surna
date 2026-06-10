import type { SportTacticalLayoutId } from "@shared/sportTacticalLayouts";
import { getDefaultFormationKey } from "@shared/sportTacticalLayouts";
import {
  getProSportProfile,
  resolveTacticalLayout as sharedResolveTacticalLayout,
  sportsAlign as sharedSportsAlign,
  type ProSportProfile,
} from "@shared/proSportProfiles";

export type TacticalLayout = SportTacticalLayoutId;

export type SportProfile = ProSportProfile & {
  displaySport: string;
  /** Pitch/court board mode when supported */
  tacticalLayout: SportTacticalLayoutId | null;
  defaultFormation: string | null;
};

export function resolveTacticalLayout(teamSport: string): SportTacticalLayoutId | null {
  return sharedResolveTacticalLayout(teamSport);
}

/** @deprecated Use resolveTacticalLayout */
export function resolveTacticalSport(teamSport: string): SportTacticalLayoutId | null {
  return resolveTacticalLayout(teamSport);
}

export function defaultFormationForLayout(layout: SportTacticalLayoutId): string {
  return getDefaultFormationKey(layout);
}

export function getSportProfile(teamSport: string): SportProfile {
  const displaySport = teamSport?.trim() || "Sport";
  const pro = getProSportProfile(teamSport);
  const tacticalLayout = resolveTacticalLayout(teamSport);
  const supportsBoard = pro.supportsTacticalBoard && !!tacticalLayout;
  return {
    ...pro,
    displaySport,
    displayName: displaySport,
    tacticalLayout: supportsBoard ? tacticalLayout : null,
    defaultFormation: supportsBoard && tacticalLayout ? getDefaultFormationKey(tacticalLayout) : null,
    supportsTacticalBoard: supportsBoard,
    supportsMatchDay: true,
  };
}

export { resolveSportFamily } from "@shared/proSportProfiles";

export function sportsAlign(teamSport: string, eventSport: string | null | undefined): boolean {
  return sharedSportsAlign(teamSport, eventSport);
}
