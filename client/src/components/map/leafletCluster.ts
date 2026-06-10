import L from "leaflet";
import "leaflet.markercluster/dist/leaflet.markercluster-src.js";

type ClusterGroup = L.LayerGroup & {
  clearLayers?: () => void;
  eachLayer?: (fn: (layer: L.Layer) => void) => void;
  addLayer?: (layer: L.Layer) => void;
};

type MarkerClusterOptions = Record<string, unknown>;

/** Marker cluster group with fallback if the plugin failed to attach to Leaflet. */
export function createMarkerClusterGroup(options: MarkerClusterOptions): ClusterGroup {
  const LExt = L as typeof L & {
    markerClusterGroup?: (opts: MarkerClusterOptions) => ClusterGroup;
    MarkerClusterGroup?: new (opts: MarkerClusterOptions) => ClusterGroup;
  };

  if (typeof LExt.markerClusterGroup === "function") {
    return LExt.markerClusterGroup(options);
  }
  if (typeof LExt.MarkerClusterGroup === "function") {
    return new LExt.MarkerClusterGroup(options);
  }

  console.warn("[map] leaflet.markercluster not available — pins will not cluster");
  return L.layerGroup() as ClusterGroup;
}
