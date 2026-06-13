import type { MapRoute } from "@/components/map/surnaMapRoutes";
import type { Coordinates } from "@/lib/geo";

/** Build a path from lat/lng offsets relative to map center. */
function pathFromOffsets(center: Coordinates, offsets: Array<[number, number]>): Coordinates[] {
  return offsets.map(([dLat, dLng]) => ({
    lat: center.lat + dLat,
    lng: center.lng + dLng,
  }));
}

/** Demo GPS tracks around the viewport — cycling, running, hiking. */
export function generateDemoRoutes(center: Coordinates): MapRoute[] {
  return [
    {
      id: "demo-route-cycling",
      title: "Harbour Loop Ride",
      sportType: "Cycling",
      coordinates: pathFromOffsets(center, [
        [0, 0],
        [0.004, 0.001],
        [0.008, 0.004],
        [0.011, 0.009],
        [0.009, 0.014],
        [0.004, 0.017],
        [-0.002, 0.016],
        [-0.007, 0.012],
        [-0.009, 0.006],
        [-0.006, 0.002],
        [0, 0],
      ]),
    },
    {
      id: "demo-ev-trail-run",
      title: "Sunday Trail Run 12km",
      sportType: "Running",
      coordinates: pathFromOffsets(center, [
        [-0.006, -0.012],
        [-0.003, -0.008],
        [0, -0.004],
        [0.003, 0],
        [0.006, 0.005],
        [0.009, 0.011],
        [0.012, 0.016],
        [0.014, 0.021],
      ]),
    },
    {
      id: "demo-route-hiking",
      title: "Ridge Trail Hike",
      sportType: "Hiking",
      coordinates: pathFromOffsets(center, [
        [0.005, -0.01],
        [0.007, -0.006],
        [0.009, -0.002],
        [0.01, 0.003],
        [0.009, 0.008],
        [0.007, 0.013],
        [0.004, 0.017],
        [0.001, 0.019],
      ]),
    },
  ];
}
