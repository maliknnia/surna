import { createRoot, type Root } from "react-dom/client";
import type { MapPin } from "./InteractiveMap";
import VenueModel3D from "./VenueModel3D";
import { getVenueModel, getVenueModelTypeFromPin } from "./venueModels";

const roots = new Map<string, Root>();

export function unmountVenueModelMarkers() {
  roots.forEach((root) => root.unmount());
  roots.clear();
}

/** Mount WebGL venue models into Leaflet marker slots (R3F needs a real DOM root, not renderToString). */
export function mountVenueModelMarkers(
  mapContainer: HTMLElement,
  pins: MapPin[],
  highlightedPinId?: string | null,
) {
  unmountVenueModelMarkers();

  const placePins = pins.filter((pin) => pin.type === "place");

  requestAnimationFrame(() => {
    placePins.forEach((pin) => {
      const slot = mapContainer.querySelector<HTMLElement>(
        `[data-venue-model="${CSS.escape(pin.id)}"]`,
      );
      if (!slot) return;

      const isFocused = highlightedPinId != null && pin.id === highlightedPinId;
      const modelPath = getVenueModel(getVenueModelTypeFromPin(pin));
      const root = createRoot(slot);
      root.render(<VenueModel3D modelPath={modelPath} size={isFocused ? 58 : 52} />);
      roots.set(pin.id, root);
    });
  });
}

export function shouldUseVenueModelPin(_pin: MapPin): boolean {
  return false;
}
