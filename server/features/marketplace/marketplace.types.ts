export type ProductStatus = "active" | "hidden" | "sold";

export interface ProductInput {
  title: string;
  description?: string;
  priceCents: number;
  currency?: string;
  stock?: number;
  mediaId?: string | null;
}
