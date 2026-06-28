/** Shared marketplace fetch helpers and API → UI normalizers. */

import type { ProductVariant } from "@shared/marketplaceVariants";
import { productRequiresVariant, totalVariantStock } from "@shared/marketplaceVariants";

export function marketplaceProductPath(id: string) {
  return `/marketplace/product/${id}`;
}

export function marketplaceShopPath(id: string) {
  return `/marketplace/shop/${id}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

export async function fetchMarketplaceProducts(params: { q?: string; limit?: number }) {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  search.set("limit", String(params.limit ?? 20));
  const data = await fetchJson<{ items: Record<string, unknown>[] }>(
    `/api/marketplace/products?${search}`,
  );
  return {
    items: (data.items || []).map(normalizeListProduct),
  };
}

export type MarketplaceShopListItem = {
  id: string;
  shop_name: string;
  shop_description?: string;
  shop_logo_url?: string;
  follower_count?: number;
};

export async function fetchMarketplaceShops(params: { q?: string; limit?: number }) {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  search.set("limit", String(params.limit ?? 20));
  const data = await fetchJson<{ shops: Record<string, unknown>[] }>(`/api/marketplace/shops?${search}`);
  return {
    shops: (data.shops || []).map(normalizeShopListItem),
  };
}

export function normalizeShopListItem(row: Record<string, unknown>): MarketplaceShopListItem {
  return {
    id: String(row.id ?? ""),
    shop_name: String(row.business_name ?? row.shop_name ?? "Shop"),
    shop_description: (row.description ?? row.shop_description) as string | undefined,
    shop_logo_url: (row.logo_url ?? row.shop_logo_url) as string | undefined,
    follower_count: Number(row.followers_count ?? row.follower_count ?? 0),
  };
}

export async function fetchMarketplaceProduct(id: string) {
  const row = await fetchJson<Record<string, unknown>>(`/api/marketplace/products/${id}`);
  return normalizeDetailProduct(row);
}

export async function fetchSellerOrders() {
  const data = await fetchJson<{ orders: Record<string, unknown>[] }>(
    "/api/marketplace/seller/orders",
  );
  return { orders: data.orders || [] };
}

export function normalizeListProduct(row: Record<string, unknown>) {
  const price =
    typeof row.price === "string" ? parseFloat(row.price) : Number(row.price ?? 0);
  const title = (row.title ?? row.name) as string;
  return {
    id: row.id as string,
    title,
    name: title,
    description: (row.description as string) ?? "",
    price,
    stock: Number(row.stock ?? 0),
    seller_id: row.seller_id as string,
    category: row.category as string | undefined,
    imageUrl: (row.imageUrl ?? row.image_url) as string | undefined,
    thumbUrl: row.thumbUrl as string | undefined,
    avgRating: Number(row.avgRating ?? row.avg_rating ?? 0),
    reviewCount: Number(row.reviewCount ?? row.review_count ?? 0),
    shop: row.shop as { id: string; name: string; logoUrl?: string } | undefined,
  };
}

export type MarketplaceListProduct = ReturnType<typeof normalizeListProduct>;

export function normalizeDetailProduct(row: Record<string, unknown>) {
  const base = normalizeListProduct(row);
  const variants = normalizeProductVariants(row.variants);
  const hasVariants = Boolean(row.hasVariants ?? row.has_variants) || variants.length > 0;
  const stock = hasVariants ? totalVariantStock(variants) : base.stock;
  return {
    ...base,
    name: base.title,
    brand: row.brand as string | undefined,
    mediumUrl: row.mediumUrl as string | undefined,
    mediumWebpUrl: row.mediumWebpUrl as string | undefined,
    mediumAvifUrl: row.mediumAvifUrl as string | undefined,
    thumbWebpUrl: row.thumbWebpUrl as string | undefined,
    thumbAvifUrl: row.thumbAvifUrl as string | undefined,
    currentStock: stock,
    hasVariants,
    variants,
    isVerifiedSeller: Boolean(row.is_verified_seller),
    pricing: row.pricing as Record<string, unknown> | undefined,
    relatedProducts: (row.relatedProducts as Record<string, unknown>[] | undefined)?.map(
      normalizeListProduct,
    ),
  };
}

export function normalizeProductVariants(raw: unknown): ProductVariant[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      productId: String(r.productId ?? r.product_id ?? ""),
      label: String(r.label ?? ""),
      variantType: (r.variantType ?? r.variant_type ?? "size") as ProductVariant["variantType"],
      sku: (r.sku as string | null | undefined) ?? null,
      stock: Number(r.stock ?? 0),
      priceCents: r.priceCents != null ? Number(r.priceCents) : r.price_cents != null ? Number(r.price_cents) : null,
      sortOrder: Number(r.sortOrder ?? r.sort_order ?? 0),
    };
  });
}

export { productRequiresVariant, totalVariantStock };

export function normalizeCartPayload(data: { cartId: string; items: Record<string, unknown>[] }) {
  return {
    cartId: data.cartId,
    items: (data.items || []).map((row) => {
      const unitCents = Number(row.unit_price_cents ?? 0);
      const price =
        unitCents > 0
          ? unitCents / 100
          : typeof row.price === "string"
            ? parseFloat(row.price)
            : Number(row.price ?? 0);
      const title = (row.title ?? row.name ?? "Product") as string;
      const variantLabel = (row.variant_label ?? row.variantLabel) as string | undefined;
      return {
        id: row.id as string,
        cart_id: data.cartId,
        product_id: row.product_id as string,
        variant_id: (row.variant_id ?? row.variantId) as string | undefined,
        variant_label: variantLabel,
        quantity: Number(row.qty ?? row.quantity ?? 1),
        product: {
          id: row.product_id as string,
          name: variantLabel ? `${title} (${variantLabel})` : title,
          price,
          stock: Number(row.stock ?? 99),
          imageUrl: (row.imageUrl ?? row.image_url) as string | undefined,
        },
      };
    }),
  };
}

export function normalizeWishlistItems(rows: Record<string, unknown>[]) {
  return rows.map((row) => {
    const price =
      typeof row.price === "string" ? parseFloat(row.price) : Number(row.price ?? 0);
    const name = (row.name ?? row.title ?? "Product") as string;
    return {
      product_id: row.id as string,
      product: {
        id: row.id as string,
        name,
        price,
        stock: Number(row.stock ?? 0),
        imageUrl: (row.imageUrl ?? row.image_url) as string | undefined,
        thumbUrl: row.thumbUrl as string | undefined,
        thumbWebpUrl: row.thumbWebpUrl as string | undefined,
        thumbAvifUrl: row.thumbAvifUrl as string | undefined,
      },
    };
  });
}

export function normalizeProductQuestions(rows: Record<string, unknown>[]) {
  return rows.map((row) => {
    const answers = Array.isArray(row.answers)
      ? (row.answers as Record<string, unknown>[]).map((a) => ({
          id: String(a.id ?? ""),
          answer: String(a.answer ?? a.answer_text ?? ""),
          isFromSeller: Boolean(a.is_from_seller ?? a.isFromSeller),
          helpfulVotes: Number(a.helpful_votes ?? a.helpfulVotes ?? 0),
          createdAt: String(a.created_at ?? a.createdAt ?? new Date().toISOString()),
          user: {
            id: String(a.user_id ?? a.userId ?? ""),
            firstName: String(a.first_name ?? a.firstName ?? "Seller"),
          },
        }))
      : [];
    return {
      id: String(row.id ?? ""),
      question: String(row.question ?? row.question_text ?? ""),
      createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
      user: {
        id: String(row.user_id ?? row.userId ?? ""),
        firstName: String(row.first_name ?? row.firstName ?? "User"),
      },
      answers,
    };
  });
}

export function normalizeProductReviews(rows: Record<string, unknown>[]) {
  return rows.map((row) => ({
    review: {
      id: row.id as string,
      rating: Number(row.rating ?? 0),
      reviewTitle: (row.review_title ?? row.reviewTitle ?? "") as string,
      reviewText: (row.review_text ?? row.reviewText ?? "") as string,
      isVerifiedPurchase: Boolean(row.is_verified_purchase ?? row.isVerifiedPurchase),
      createdAt: (row.created_at ?? row.createdAt ?? new Date().toISOString()) as string,
    },
    user: {
      id: (row.user_id ?? "") as string,
      firstName: (row.first_name ?? row.firstName ?? "User") as string,
      profileImageUrl: (row.profile_image_url ?? row.profileImageUrl) as string | undefined,
    },
  }));
}
