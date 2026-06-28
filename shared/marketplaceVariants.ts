/** Marketplace product variant helpers (apparel / footwear sizing). */

export type ProductVariantType = "size" | "shoe" | "color";

export type ProductVariant = {
  id: string;
  productId: string;
  label: string;
  variantType: ProductVariantType;
  sku?: string | null;
  stock: number;
  priceCents?: number | null;
  sortOrder?: number;
};

export const SHIRT_VARIANT_LABELS = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export const SHOE_VARIANT_LABELS = ["39", "40", "41", "42", "43", "44", "45", "46"] as const;

const SHIRT_CATEGORIES = new Set([
  "apparel",
  "cycling-gear",
  "team-kit",
  "rugby-equipment",
]);

const FOOTWEAR_CATEGORIES = new Set([
  "running-shoes",
  "football-boots",
]);

export function categoryUsesShirtSizes(category?: string | null): boolean {
  if (!category) return false;
  const c = category.toLowerCase();
  if (SHIRT_CATEGORIES.has(c)) return true;
  return c.includes("jersey") || c.includes("shirt") || c.includes("apparel");
}

export function categoryUsesShoeSizes(category?: string | null): boolean {
  if (!category) return false;
  const c = category.toLowerCase();
  if (FOOTWEAR_CATEGORIES.has(c)) return true;
  return c.includes("shoe") || c.includes("boot");
}

export function variantLabelsForCategory(category?: string | null): {
  variantType: ProductVariantType;
  labels: readonly string[];
} | null {
  if (categoryUsesShoeSizes(category)) {
    return { variantType: "shoe", labels: SHOE_VARIANT_LABELS };
  }
  if (categoryUsesShirtSizes(category)) {
    return { variantType: "size", labels: SHIRT_VARIANT_LABELS };
  }
  return null;
}

export function productRequiresVariant(params: {
  hasVariants?: boolean;
  variants?: ProductVariant[];
}): boolean {
  if (params.hasVariants) return true;
  return (params.variants?.length ?? 0) > 0;
}

export function totalVariantStock(variants?: ProductVariant[]): number {
  if (!variants?.length) return 0;
  return variants.reduce((sum, v) => sum + Math.max(0, v.stock ?? 0), 0);
}
