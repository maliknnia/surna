/** Fixed boxing weight classes for individual tournament brackets (v1). */

export const BOXING_WEIGHT_CLASSES = [
  "flyweight",
  "bantamweight",
  "featherweight",
  "lightweight",
  "welterweight",
  "middleweight",
  "light_heavyweight",
  "heavyweight",
] as const;

export type BoxingWeightClass = (typeof BOXING_WEIGHT_CLASSES)[number];

export function isBoxingWeightClass(value: string): value is BoxingWeightClass {
  return (BOXING_WEIGHT_CLASSES as readonly string[]).includes(value);
}

export function boxingWeightClassLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
