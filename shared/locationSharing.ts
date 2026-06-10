/** Who can see your live map location (Snapchat-style audiences). */

export const LOCATION_AUDIENCES = [
  "ghost",
  "friends",
  "family",
  "followers",
  "public",
] as const;

export type LocationAudience = (typeof LOCATION_AUDIENCES)[number];

/** Stored in app prefs + sent to `person_presence.visibility`. */
export type PresenceVisibility =
  | "ghost"
  | "friends"
  | "family"
  | "followers"
  | "public"
  | "team_only";

export function isLocationAudience(value: string): value is LocationAudience {
  return (LOCATION_AUDIENCES as readonly string[]).includes(value);
}

export function shareLocationToVisibility(
  shareLocation: boolean,
  audience: LocationAudience,
): PresenceVisibility {
  if (!shareLocation) return "ghost";
  return audience;
}

export function visibilityToAudience(visibility: string | null | undefined): LocationAudience {
  if (visibility === "ghost" || !visibility) return "ghost";
  if (visibility === "family") return "family";
  if (visibility === "public") return "public";
  if (visibility === "followers") return "followers";
  return "friends";
}

export const LOCATION_AUDIENCE_LABELS: Record<
  LocationAudience,
  { title: string; description: string }
> = {
  ghost: {
    title: "Only me",
    description: "Ghost mode — nobody sees you on the map",
  },
  friends: {
    title: "My friends",
    description: "Mutual friends on SURNA can see where you are",
  },
  family: {
    title: "Family",
    description: "Only people in your family list",
  },
  followers: {
    title: "Followers",
    description: "Anyone who follows you",
  },
  public: {
    title: "Everyone",
    description: "Anyone using the map nearby",
  },
};
