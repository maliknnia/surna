import { z } from "zod";

export const CreateProduct = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().default(process.env.CURRENCY_DEFAULT || "USD"),
  stock: z.number().int().min(0).default(1),
  mediaId: z.string().optional().nullable(),
});

export const UpdateProduct = CreateProduct.partial().extend({
  status: z.enum(["active","hidden","sold"]).optional(),
});

export const ListQuery = z.object({
  q: z.string().optional(),
  cursorCreatedAt: z.string().datetime().optional(),
  cursorId: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default( Number(process.env.MARKETPLACE_PAGE_SIZE ?? 20) ),
});

export const CartItemInput = z.object({
  productId: z.string(),
  qty: z.number().int().min(1),
});
