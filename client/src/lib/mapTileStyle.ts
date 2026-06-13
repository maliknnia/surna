export type MapTileStyle = "dark" | "light" | "satellite";

export const MAP_TILE_STYLE_KEY = "surna-map-tile-style";
export const MAP_TILE_STYLE_CHANGE_EVENT = "surna-map-tile-style-change";
export const MAP_TILE_STYLE_MENU_EVENT = "surna-map-style-menu-toggle";

export function readMapTileStyle(): MapTileStyle | null {
  try {
    const value = localStorage.getItem(MAP_TILE_STYLE_KEY);
    if (value === "dark" || value === "light" || value === "satellite") return value;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeMapTileStyle(mode: MapTileStyle): void {
  try {
    localStorage.setItem(MAP_TILE_STYLE_KEY, mode);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent<MapTileStyle>(MAP_TILE_STYLE_CHANGE_EVENT, { detail: mode }));
}

export function toggleMapTileStyleMenu(): void {
  window.dispatchEvent(new CustomEvent(MAP_TILE_STYLE_MENU_EVENT));
}
