import { useGLTF } from "@react-three/drei";
import type { MapPin } from "./InteractiveMap";

/** Paths match files in client/public/models/ (lowercase, hyphenated). */
export const venueModelMap: Record<string, string> = {
  football: "/models/ballpark.glb",
  soccer: "/models/ballpark.glb",
  futsal: "/models/ballpark.glb",
  gym: "/models/gym.glb",
  fitness: "/models/gym.glb",
  crossfit: "/models/gym.glb",
  yoga: "/models/gym.glb",
  pilates: "/models/gym.glb",
  boxing: "/models/boxing-ring.glb",
  mma: "/models/boxing-ring.glb",
  martial_arts: "/models/boxing-ring.glb",
  events: "/models/concert-stage.glb",
  event: "/models/concert-stage.glb",
  concert: "/models/concert-stage.glb",
  stage: "/models/concert-stage.glb",
  cricket: "/models/ballpark.glb",
  baseball: "/models/ballpark.glb",
  softball: "/models/ballpark.glb",
  american_football: "/models/american-football.glb",
  nfl: "/models/american-football.glb",
  challenge: "/models/fitness-character.glb",
  trophy: "/models/fitness-character.glb",
  basketball: "/models/gym.glb",
  court: "/models/gym.glb",
  tennis: "/models/gym.glb",
  volleyball: "/models/gym.glb",
  swimming: "/models/gym.glb",
  pool: "/models/gym.glb",
  studio: "/models/gym.glb",
  field: "/models/ballpark.glb",
  arena: "/models/concert-stage.glb",
  rink: "/models/gym.glb",
  track: "/models/gym.glb",
};

const DEFAULT_MODEL = "/models/gym.glb";

function normalizeType(type: string): string {
  return type.toLowerCase().replace(/[\s\-\.]/g, "_");
}

export function getVenueModel(type: string): string {
  const key = normalizeType(type || "");
  if (venueModelMap[key]) return venueModelMap[key];
  for (const [mapKey, path] of Object.entries(venueModelMap)) {
    if (key.includes(mapKey) || mapKey.includes(key)) return path;
  }
  return DEFAULT_MODEL;
}

export function getVenueModelTypeFromPin(pin: MapPin): string {
  const d = pin.data || {};
  const raw =
    pin.sport ||
    (Array.isArray(d.sports) ? d.sports[0] : undefined) ||
    d.sport ||
    d.category ||
    d.kind ||
    "gym";
  return String(raw);
}

export function preloadVenueModels() {
  const unique = new Set(Object.values(venueModelMap));
  unique.add(DEFAULT_MODEL);
  unique.forEach((path) => {
    useGLTF.preload(path);
  });
}
