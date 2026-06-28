import type { GearProfileSummary } from "./gearProfile";
import type { ProductVariant, ProductVariantType } from "./marketplaceVariants";

export type TeamBulkLineStatus = "ready" | "missing_size" | "no_variant" | "out_of_stock";

export type TeamBulkLine = {
  userId: string;
  memberId: string;
  name: string;
  status: TeamBulkLineStatus;
  sizeLabel?: string;
  variantId?: string;
  variantLabel?: string;
  jerseyNumber?: number;
  stock?: number;
  selected?: boolean;
};

export type TeamBulkPreview = {
  productId: string;
  productTitle: string;
  teamId: string;
  teamName: string;
  variantType: ProductVariantType;
  lines: TeamBulkLine[];
  readyCount: number;
  totalCount: number;
};

export function gearSizeForVariantType(
  gear: GearProfileSummary | null | undefined,
  variantType: ProductVariantType,
): string | null {
  if (!gear) return null;
  if (variantType === "shoe") return gear.shoeSizeEu?.trim() ?? null;
  return gear.shirtSize?.trim() ?? null;
}

export function matchVariantBySizeLabel(
  sizeLabel: string | null | undefined,
  variants: ProductVariant[],
): ProductVariant | null {
  if (!sizeLabel?.trim() || !variants.length) return null;
  const normalized = sizeLabel.trim().toUpperCase();
  const exact = variants.find((v) => v.label.toUpperCase() === normalized);
  if (exact) return exact;
  if (normalized.startsWith("Y")) {
    const adult = normalized.slice(1);
    const youthFallback = variants.find((v) => v.label.toUpperCase() === adult);
    if (youthFallback) return youthFallback;
  }
  return null;
}

export function buildTeamBulkLine(params: {
  userId: string;
  memberId: string;
  name: string;
  gear: GearProfileSummary | null;
  variants: ProductVariant[];
  variantType: ProductVariantType;
}): TeamBulkLine {
  const { userId, memberId, name, gear, variants, variantType } = params;
  const sizeLabel = gearSizeForVariantType(gear, variantType);
  const jerseyNumber = gear?.preferredJerseyNumber;

  if (!sizeLabel) {
    return { userId, memberId, name, status: "missing_size", jerseyNumber };
  }

  const variant = matchVariantBySizeLabel(sizeLabel, variants);
  if (!variant) {
    return { userId, memberId, name, status: "no_variant", sizeLabel, jerseyNumber };
  }

  if (variant.stock < 1) {
    return {
      userId,
      memberId,
      name,
      status: "out_of_stock",
      sizeLabel,
      variantId: variant.id,
      variantLabel: variant.label,
      jerseyNumber,
      stock: variant.stock,
    };
  }

  return {
    userId,
    memberId,
    name,
    status: "ready",
    sizeLabel,
    variantId: variant.id,
    variantLabel: variant.label,
    jerseyNumber,
    stock: variant.stock,
    selected: true,
  };
}

export function formatTeamBulkCartLabel(line: Pick<TeamBulkLine, "name" | "variantLabel" | "sizeLabel" | "jerseyNumber">): string {
  const size = line.variantLabel ?? line.sizeLabel ?? "?";
  const num = line.jerseyNumber != null ? ` #${line.jerseyNumber}` : "";
  return `${size} · ${line.name}${num}`;
}

export function teamBulkVariantKey(variantId: string, userId: string): string {
  return `${variantId}:${userId}`;
}
