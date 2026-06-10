import type { IconName } from "@/components/Icon";
import type { MobilePanelId } from "@/lib/navigation";

export type MobileShellPanel = {
  id: MobilePanelId;
  label: string;
  title: string;
  icon: IconName;
};

export const MOBILE_SHELL_PANELS: MobileShellPanel[] = [
  { id: "home", label: "Home", title: "SURNA", icon: "house" },
  { id: "teams", label: "Teams", title: "Teams", icon: "users" },
  { id: "map", label: "Map", title: "Map", icon: "map-pin" },
  { id: "venues", label: "Venues", title: "Venues", icon: "buildings" },
  { id: "events", label: "Events", title: "Events", icon: "ticket" },
];

export function mobileShellPanelByIndex(index: number): MobileShellPanel {
  return MOBILE_SHELL_PANELS[index] ?? MOBILE_SHELL_PANELS[0];
}
