import type { CameraFilter } from "./constants";
import { CAMERA_FILTERS } from "./constants";

export function getFilterById(id: string): CameraFilter {
  return CAMERA_FILTERS.find((f) => f.id === id) ?? CAMERA_FILTERS[0];
}

export function getFiltersForCategory(category: string): CameraFilter[] {
  if (category === "all") return CAMERA_FILTERS;
  return CAMERA_FILTERS.filter((f) => f.category === category || f.id === "none");
}

export function filterCss(id: string): string {
  return getFilterById(id).cssFilter;
}
