import * as repo from "./marketplace.repo";
import { deriveImageVariants } from "../media/variants";

// Attach the worker's `_thumb` / `_medium` (and modern format) sibling URLs
// to each product so list cards can request the small variant and detail
// pages can request the larger one. Returns the row unchanged when the
// stored image isn't a worker-generated URL.
function withImageVariants<T extends Record<string, any>>(row: T): T {
  if (!row) return row;
  const base = row.imageUrl ?? row.image_url;
  const v = deriveImageVariants(base);
  if (!v) return row;
  return { ...row, ...v };
}

export const Marketplace = {
  // Products
  createProduct: repo.createProduct,
  updateProduct: repo.updateProduct,
  getProduct: async (id: string) => {
    const p = await repo.getProduct(id);
    return p ? withImageVariants(p as any) : p;
  },
  listPublic: async (qs: Parameters<typeof repo.listPublic>[0]) => {
    const rows = await repo.listPublic(qs);
    return rows.map(withImageVariants);
  },
  
  // Cart
  ensureCart: repo.ensureCart,
  addToCart: (cartId: string, productId: string, qty: number, variantId?: string, opts?: { variantKey?: string; variantLabel?: string }) =>
    repo.upsertCartItem(cartId, productId, qty, variantId, opts),
  getCart: repo.getCart,
  checkout: (userId: string, cartId: string) => repo.checkout(userId, cartId, Number(process.env.TAX_RATE_BPS ?? 0)),
  
  // Shops/Sellers
  createShop: repo.createShop,
  getShop: repo.getShop,
  getShopBySellerId: repo.getShopBySellerId,
  updateShop: repo.updateShop,
  listShops: repo.listShops,
  followShop: repo.followShop,
  unfollowShop: repo.unfollowShop,
  isFollowingShop: repo.isFollowingShop,
  getShopProducts: async (shopId: string, limit?: number) => {
    const rows = await repo.getShopProducts(shopId, limit);
    return rows.map(withImageVariants);
  },
  
  // Reviews
  addProductReview: repo.addProductReview,
  getProductReviews: repo.getProductReviews,
  
  // Q&A
  askQuestion: repo.askQuestion,
  answerQuestion: repo.answerQuestion,
  getProductQuestions: repo.getProductQuestions,
  
  // Wishlist
  addToWishlist: repo.addToWishlist,
  removeFromWishlist: repo.removeFromWishlist,
  getWishlistItems: async (userId: string) => {
    const rows = await repo.getWishlistItems(userId);
    return rows.map(withImageVariants);
  },
  
  // Orders
  getUserOrders: repo.getUserOrders,
  getOrderDetails: repo.getOrderDetails,
  getSellerOrders: repo.getSellerOrders,
  getSellerShopDashboard: repo.getSellerShopDashboard,
  updateSellerOrderStatus: repo.updateSellerOrderStatus,
};
