import { Router } from "express";
import { z } from "zod";
import { CreateProduct, UpdateProduct, ListQuery, CartItemInput, TeamBulkPreviewQuery, TeamBulkAddToCartBody } from "./marketplace.validation";
import { Marketplace as MP } from "./marketplace.service";
import { authMiddleware, requireAuth } from "../../middleware/auth";
import { bridgeSessionUser } from "../../middleware/bridgeSessionUser";

export const marketplaceRouter = Router();

marketplaceRouter.use(authMiddleware());
marketplaceRouter.use(bridgeSessionUser);

// ===== PUBLIC ROUTES (AUTH OPTIONAL - req.jwtUser populated if authenticated) =====

// ===== TEAM BULK ORDER (captain orders kit for roster) =====

marketplaceRouter.get("/team-orders/preview", requireAuth(), async (req: any, res, next) => {
  try {
    const q = TeamBulkPreviewQuery.parse(req.query);
    const { previewTeamBulkOrder } = await import("../../services/teamBulkOrderService");
    const preview = await previewTeamBulkOrder({
      productId: q.productId,
      teamId: q.teamId,
      managerUserId: req.jwtUser.id,
    });
    res.json(preview);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "FORBIDDEN") return res.status(403).json({ error: "Only team captains can bulk order" });
      if (e.message === "TEAM_BULK_REQUIRES_VARIANTS") {
        return res.status(400).json({ error: "This product needs size options for team orders" });
      }
      if (e.message === "PRODUCT_NOT_FOUND" || e.message === "TEAM_NOT_FOUND") {
        return res.status(404).json({ error: e.message });
      }
    }
    next(e);
  }
});

marketplaceRouter.post("/team-orders/add-to-cart", requireAuth(), async (req: any, res, next) => {
  try {
    const body = TeamBulkAddToCartBody.parse(req.body ?? {});
    const { addTeamBulkOrderToCart } = await import("../../services/teamBulkOrderService");
    const result = await addTeamBulkOrderToCart({
      productId: body.productId,
      teamId: body.teamId,
      managerUserId: req.jwtUser.id,
      memberUserIds: body.memberUserIds,
    });
    res.status(201).json(result);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "FORBIDDEN") return res.status(403).json({ error: "Only team captains can bulk order" });
      if (e.message === "NO_LINES_ADDED") {
        return res.status(400).json({ error: "No players were ready — check sizing roster first" });
      }
      if (e.message === "INSUFFICIENT_STOCK") {
        return res.status(409).json({ error: "Not enough stock for one or more sizes" });
      }
      if (e.message === "TEAM_BULK_REQUIRES_VARIANTS") {
        return res.status(400).json({ error: "This product needs size options for team orders" });
      }
    }
    next(e);
  }
});

// PUBLIC: list/search products
marketplaceRouter.get("/products", async (req: any, res, next) => {
  try {
    const q = ListQuery.parse(req.query);
    const rows = await MP.listPublic(q);
    const nextCursor = rows.length ? { createdAt: rows[rows.length-1].created_at, id: rows[rows.length-1].id } : null;
    res.json({ items: rows, nextCursor });
  } catch(e) { next(e); }
});

// PUBLIC: Get single product
marketplaceRouter.get("/products/:id", async (req: any, res, next) => {
  try {
    const product = await MP.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch(e) { next(e); }
});

// PUBLIC: List shops
marketplaceRouter.get("/shops", async (req: any, res, next) => {
  try {
    const { q, limit = '20', cursor } = req.query;
    const shops = await MP.listShops({ q, limit: parseInt(limit), cursor });
    res.json({ shops });
  } catch(e) { next(e); }
});

// PUBLIC: Get shop profile
marketplaceRouter.get("/shops/:id", async (req: any, res, next) => {
  try {
    const shop = await MP.getShop(req.params.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    
    // Check if user is following (if authenticated)
    let isFollowing = false;
    if (req.jwtUser?.id) {
      isFollowing = await MP.isFollowingShop(req.params.id, req.jwtUser.id);
    }
    
    res.json({ ...shop, isFollowing });
  } catch(e) { next(e); }
});

// PUBLIC: Get shop products
marketplaceRouter.get("/shops/:id/products", async (req: any, res, next) => {
  try {
    const { limit = '20' } = req.query;
    const products = await MP.getShopProducts(req.params.id, parseInt(limit));
    res.json({ products });
  } catch(e) { next(e); }
});

// PUBLIC: Get product reviews
marketplaceRouter.get("/products/:id/reviews", async (req: any, res, next) => {
  try {
    const { limit = '10' } = req.query;
    const reviews = await MP.getProductReviews(req.params.id, parseInt(limit));
    res.json({ reviews });
  } catch(e) { next(e); }
});

// PUBLIC: Get product questions
marketplaceRouter.get("/products/:id/questions", async (req: any, res, next) => {
  try {
    const { limit = '10' } = req.query;
    const questions = await MP.getProductQuestions(req.params.id, parseInt(limit));
    res.json({ questions });
  } catch(e) { next(e); }
});

// ===== PROTECTED ROUTES (AUTH REQUIRED) =====

// AUTH: create product
marketplaceRouter.post("/products", requireAuth(), async (req: any, res, next) => {
  try {
    const body = CreateProduct.parse(req.body);
    const row = await MP.createProduct(req.jwtUser.id, body);
    res.status(201).json(row);
  } catch(e) { next(e); }
});

// AUTH: update own product
marketplaceRouter.patch("/products/:id", requireAuth(), async (req: any, res, next) => {
  try {
    const body = UpdateProduct.parse(req.body);
    const row = await MP.updateProduct(req.jwtUser.id, req.params.id, body);
    if (!row) return res.status(404).json({ error: "NOT_FOUND" });
    res.json(row);
  } catch(e) { next(e); }
});

// AUTH: cart operations
marketplaceRouter.get("/cart", requireAuth(), async (req: any, res, next) => {
  try {
    const cartId = await MP.ensureCart(req.jwtUser.id);
    const items = await MP.getCart(cartId);
    res.json({ cartId, items });
  } catch(e) { next(e); }
});

marketplaceRouter.post("/cart/items", requireAuth(), async (req: any, res, next) => {
  try {
    const cartId = await MP.ensureCart(req.jwtUser.id);
    const { productId, qty, variantId, variantKey } = CartItemInput.parse(req.body);
    await MP.addToCart(cartId, productId, qty, variantId, { variantKey });
    const items = await MP.getCart(cartId);
    res.status(201).json({ cartId, items });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "VARIANT_REQUIRED") {
        return res.status(400).json({ error: "Select a size before adding to cart" });
      }
      if (e.message === "VARIANT_NOT_FOUND") {
        return res.status(404).json({ error: "Size option not found" });
      }
      if (e.message === "INSUFFICIENT_STOCK") {
        return res.status(409).json({ error: "Not enough stock for that size" });
      }
    }
    next(e);
  }
});

// AUTH: dev/test checkout — records order, reduces stock, clears cart (no Stripe)
marketplaceRouter.post("/checkout", requireAuth(), async (req: any, res, next) => {
  try {
    const cartId = await MP.ensureCart(req.jwtUser.id);
    const out = await MP.checkout(req.jwtUser.id, cartId);
    res.status(201).json(out);
  } catch(e) { next(e); }
});

// ===== SHOP/SELLER PROTECTED ROUTES =====

// AUTH: Get current user's shop
marketplaceRouter.get("/shops/mine", requireAuth(), async (req: any, res, next) => {
  try {
    const shop = await MP.getShopBySellerId(req.jwtUser.id);
    res.json({ shop: shop ?? null });
  } catch (e) {
    next(e);
  }
});

// AUTH: Create shop
marketplaceRouter.post("/shops", requireAuth(), async (req: any, res, next) => {
  try {
    // Check if user already has a shop
    const existing = await MP.getShopBySellerId(req.jwtUser.id);
    if (existing) {
      return res.status(400).json({ error: "You already have a shop" });
    }
    
    const shop = await MP.createShop(req.jwtUser.id, req.body);
    res.status(201).json(shop);
  } catch(e) { next(e); }
});

// AUTH: Update own shop
marketplaceRouter.patch("/shops/:id", requireAuth(), async (req: any, res, next) => {
  try {
    const shop = await MP.updateShop(req.params.id, req.jwtUser.id, req.body);
    if (!shop) return res.status(404).json({ error: "Shop not found or unauthorized" });
    
    res.json(shop);
  } catch(e) { next(e); }
});

// AUTH: Follow/Unfollow shop
marketplaceRouter.post("/shops/:id/follow", requireAuth(), async (req: any, res, next) => {
  try {
    const { action } = req.body; // 'follow' or 'unfollow'
    
    if (action === 'follow') {
      await MP.followShop(req.params.id, req.jwtUser.id);
    } else if (action === 'unfollow') {
      await MP.unfollowShop(req.params.id, req.jwtUser.id);
    }
    
    res.json({ success: true });
  } catch(e) { next(e); }
});

// ===== REVIEW PROTECTED ROUTES =====

// AUTH: Add or update product review (one per user per product)
marketplaceRouter.post("/products/:id/reviews", requireAuth(), async (req: any, res, next) => {
  try {
    const body = z
      .object({
        rating: z.number().int().min(1).max(5),
        reviewTitle: z.string().max(200).optional(),
        reviewText: z.string().max(4000).optional(),
      })
      .parse(req.body);
    const { review, updated } = await MP.upsertProductReview(req.params.id, req.jwtUser.id, body);
    res.status(updated ? 200 : 201).json(review);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: "Invalid review" });
    next(e);
  }
});

// ===== Q&A PROTECTED ROUTES =====

// AUTH: Ask a question
marketplaceRouter.post("/products/:id/questions", requireAuth(), async (req: any, res, next) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "Question is required" });
    
    const newQuestion = await MP.askQuestion(req.params.id, req.jwtUser.id, question);
    res.status(201).json(newQuestion);
  } catch(e) { next(e); }
});

// AUTH: Answer a question
marketplaceRouter.post("/questions/:id/answers", requireAuth(), async (req: any, res, next) => {
  try {
    const { answer, isFromSeller } = req.body;
    if (!answer) return res.status(400).json({ error: "Answer is required" });
    
    const newAnswer = await MP.answerQuestion(req.params.id, req.jwtUser.id, answer, isFromSeller || false);
    res.status(201).json(newAnswer);
  } catch(e) { next(e); }
});

// ===== WISHLIST ROUTES =====

// AUTH: Get wishlist items
marketplaceRouter.get("/wishlist", requireAuth(), async (req: any, res, next) => {
  try {
    const items = await MP.getWishlistItems(req.jwtUser.id);
    res.json({ items });
  } catch(e) { next(e); }
});

// AUTH: Add to wishlist
marketplaceRouter.post("/wishlist", requireAuth(), async (req: any, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: "Product ID is required" });
    
    await MP.addToWishlist(req.jwtUser.id, productId);
    res.json({ success: true });
  } catch(e) { next(e); }
});

// AUTH: Remove from wishlist
marketplaceRouter.delete("/wishlist/:productId", requireAuth(), async (req: any, res, next) => {
  try {
    await MP.removeFromWishlist(req.jwtUser.id, req.params.productId);
    res.json({ success: true });
  } catch(e) { next(e); }
});

// ===== ORDERS ROUTES =====

// AUTH: Get user orders
marketplaceRouter.get("/orders", requireAuth(), async (req: any, res, next) => {
  try {
    const orders = await MP.getUserOrders(req.jwtUser.id);
    res.json({ orders });
  } catch(e) { next(e); }
});

// AUTH: Get order details
marketplaceRouter.get("/orders/:id", requireAuth(), async (req: any, res, next) => {
  try {
    const order = await MP.getOrderDetails(req.params.id, req.jwtUser.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    
    res.json(order);
  } catch(e) { next(e); }
});

// AUTH: Seller shop dashboard (My Hub / Shop Pro)
marketplaceRouter.get("/seller/shop", requireAuth(), async (req: any, res, next) => {
  try {
    const dash = await MP.getSellerShopDashboard(req.jwtUser.id);
    if (!dash) return res.status(404).json({ error: "No shop found" });
    res.json(dash);
  } catch (e) {
    next(e);
  }
});

// AUTH: Seller's own product listings
marketplaceRouter.get("/seller/products", requireAuth(), async (req: any, res, next) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 100);
    const items = await MP.listSellerProducts(req.jwtUser.id, limit);
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// AUTH: Seller orders
marketplaceRouter.get("/seller/orders", requireAuth(), async (req: any, res, next) => {
  try {
    const orders = await MP.getSellerOrders(req.jwtUser.id);
    res.json({ orders });
  } catch (e) { next(e); }
});

// AUTH: Seller order status update
marketplaceRouter.patch("/seller/orders/:id/status", requireAuth(), async (req: any, res, next) => {
  try {
    const status = String(req.body?.status || "");
    const updated = await MP.updateSellerOrderStatus(req.params.id, req.jwtUser.id, status);
    if (!updated) return res.status(404).json({ error: "Order not found or invalid status" });
    res.json(updated);
  } catch (e) { next(e); }
});

// ===== PAYMENT ROUTES =====

function isStripeConfigured() {
  const key = process.env.STRIPE_SECRET_KEY;
  return Boolean(key && !key.includes("placeholder"));
}

// AUTH: Server-calculated checkout totals (matches order fulfillment tax)
marketplaceRouter.get("/checkout/summary", requireAuth(), async (req: any, res, next) => {
  try {
    const totals = await MP.calculateCartCheckoutTotals(req.jwtUser.id);
    if (!totals) return res.status(400).json({ error: "Cart is empty" });
    res.json({
      ...totals,
      stripeConfigured: isStripeConfigured(),
    });
  } catch (e) {
    next(e);
  }
});

// AUTH: Create payment intent for checkout
marketplaceRouter.post("/create-payment-intent", requireAuth(), async (req: any, res, next) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: "Stripe is not configured" });
    }

    const totals = await MP.calculateCartCheckoutTotals(req.jwtUser.id);
    if (!totals) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-08-27.basil",
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totals.totalCents,
      currency: totals.currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: req.jwtUser.id,
        source: "marketplace",
        cartId: totals.cartId,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      subtotalCents: totals.subtotalCents,
      taxCents: totals.taxCents,
      totalCents: totals.totalCents,
      currency: totals.currency,
    });
  } catch (e: any) {
    console.error("Payment intent creation error:", e);
    res.status(500).json({ error: "Failed to create payment intent: " + e.message });
  }
});
