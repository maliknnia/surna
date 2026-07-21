import { db } from "../../db";
import { sql } from "drizzle-orm";
import { variantLabelsForCategory } from "@shared/marketplaceVariants";
import { ensureMarketplaceSchema } from "./ensureMarketplaceSchema";

function mapVariantRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    label: String(row.label),
    variantType: String(row.variant_type ?? "size"),
    sku: row.sku as string | null | undefined,
    stock: Number(row.stock ?? 0),
    priceCents: row.price_cents != null ? Number(row.price_cents) : null,
    sortOrder: Number(row.sort_order ?? 0),
  };
}

export async function getProductVariants(productId: string) {
  await ensureMarketplaceSchema();
  const q = await db.execute(sql`
    SELECT id, product_id, label, variant_type, sku, stock, price_cents, sort_order
    FROM product_variants
    WHERE product_id = ${productId} AND is_active = true
    ORDER BY sort_order ASC, label ASC;
  `);
  return q.rows.map((row) => mapVariantRow(row as Record<string, unknown>));
}

export async function ensureCatalogVariants(productId: string, category: string | null) {
  const existing = await getProductVariants(productId);
  if (existing.length > 0) return existing;

  const def = variantLabelsForCategory(category);
  if (!def) return [];

  for (let i = 0; i < def.labels.length; i++) {
    const label = def.labels[i];
    await db.execute(sql`
      INSERT INTO product_variants (product_id, label, variant_type, stock, sort_order)
      VALUES (${productId}, ${label}, ${def.variantType}, ${12}, ${i});
    `);
  }
  await db.execute(sql`UPDATE products SET has_variants = true WHERE id = ${productId}`);
  return getProductVariants(productId);
}
// name -> title, price -> price_cents conversion, is_active -> status mapping

export async function createProduct(sellerId: string, p: any) {
  const priceDecimal = (p.priceCents / 100).toFixed(2);
  const category = p.category ?? "marketplace";
  const q = await db.execute(sql`
    INSERT INTO products (seller_id, name, description, price, stock, is_active, category, brand, image_url)
    VALUES (${sellerId}, ${p.title}, ${p.description ?? ''}, ${priceDecimal}, ${p.stock ?? 1}, true, ${category}, ${p.brand ?? ''}, ${p.imageUrl ?? null})
    RETURNING id, name AS title, description, price, stock, is_active, seller_id, image_url AS "imageUrl", created_at;
  `);
  const row = q.rows[0] as any;
  return {
    ...row,
    price_cents: Math.round((row.price as number) * 100),
    status: (row.is_active as boolean) ? "active" : "hidden",
  };
}

export async function listSellerProducts(sellerId: string, limit = 50) {
  const result = await db.execute(sql`
    SELECT
      p.id,
      p.name AS title,
      p.description,
      p.price,
      p.stock,
      p.is_active,
      p.seller_id,
      p.category,
      p.image_url AS "imageUrl",
      p.created_at
    FROM products p
    WHERE p.seller_id = ${sellerId}
    ORDER BY p.created_at DESC
    LIMIT ${limit}
  `);
  return result.rows.map((row: any) => ({
    ...row,
    price_cents: Math.round(Number(row.price ?? 0) * 100),
    status: row.is_active ? "active" : "hidden",
  }));
}

export async function updateProduct(sellerId: string, id: string, p: any) {
  let priceDecimal: string | null = null;
  if (p.priceCents !== undefined) {
    priceDecimal = (p.priceCents / 100).toFixed(2);
  }
  
  const isActive = p.status === 'active' ? true : (p.status === 'hidden' || p.status === 'sold') ? false : undefined;
  
  const q = await db.execute(sql`
    UPDATE products SET
      name = COALESCE(${p.title}, name),
      description = COALESCE(${p.description}, description),
      price = COALESCE(${priceDecimal}, price),
      stock = COALESCE(${p.stock}, stock),
      is_active = COALESCE(${isActive}, is_active)
    WHERE id = ${id} AND seller_id = ${sellerId}
    RETURNING id, name AS title, description, price, stock, is_active, seller_id, created_at;
  `); 
  const row = q.rows[0] as any;
  if (!row) return null;
  
  return {
    ...row,
    price_cents: Math.round((row.price as number) * 100),
    status: (row.is_active as boolean) ? 'active' : 'hidden'
  };
}

export async function getProduct(id: string) {
  await ensureMarketplaceSchema();
  const q = await db.execute(sql`
    SELECT 
      p.id, 
      p.name AS title, 
      p.description, 
      p.price, 
      p.stock, 
      p.is_active, 
      p.seller_id,
      p.category,
      p.brand,
      p.has_variants,
      p.image_url AS "imageUrl",
      p.created_at,
      ps.id as shop_id,
      ps.business_name as shop_name,
      ps.logo_url as shop_logo_url,
      (
        SELECT COALESCE(AVG(pr.rating), 0)
        FROM product_reviews pr
        WHERE pr.product_id = p.id AND pr.is_visible = true
      ) AS avg_rating,
      (
        SELECT COUNT(*)::int
        FROM product_reviews pr
        WHERE pr.product_id = p.id AND pr.is_visible = true
      ) AS review_count
    FROM products p
    LEFT JOIN product_sellers ps ON p.seller_id = ps.seller_id
    WHERE p.id=${id} 
    LIMIT 1;
  `);
  const row = q.rows[0] as any;
  if (!row) return null;

  let variants = await getProductVariants(id);
  if (variants.length === 0 && !row.has_variants) {
    variants = await ensureCatalogVariants(id, row.category ?? null);
  }

  const variantStock = variants.reduce((s, v) => s + v.stock, 0);
  const hasVariants = variants.length > 0 || Boolean(row.has_variants);
  
  return {
    ...row,
    price_cents: Math.round((row.price as number) * 100),
    status: (row.is_active as boolean) ? 'active' : 'hidden',
    avgRating: parseFloat(row.avg_rating || 0),
    reviewCount: parseInt(row.review_count || 0, 10),
    hasVariants,
    variants,
    stock: hasVariants ? variantStock : Number(row.stock ?? 0),
    shop: row.shop_id ? {
      id: row.shop_id,
      name: row.shop_name,
      logoUrl: row.shop_logo_url
    } : null
  };
}

export async function listPublic(qs: { q?: string, cursorCreatedAt?: string, cursorId?: string, limit: number }) {
  const whereSearch = qs.q
    ? sql`AND to_tsvector('simple', p.name || ' ' || coalesce(p.description,'')) @@ plainto_tsquery('simple', ${qs.q})`
    : sql``;
  const cursor = (qs.cursorCreatedAt && qs.cursorId)
    ? sql`AND (p.created_at, p.id) < (${qs.cursorCreatedAt}::timestamptz, ${qs.cursorId})`
    : sql``;

  const q = await db.execute(sql`
    SELECT 
      p.id, 
      p.name AS title, 
      p.description, 
      p.price, 
      p.stock, 
      p.is_active, 
      p.seller_id, 
      p.category,
      p.image_url AS "imageUrl",
      p.created_at,
      ps.id as shop_id,
      ps.business_name as shop_name,
      ps.logo_url as shop_logo_url,
      COALESCE(AVG(pr.rating), 0) as avg_rating,
      COUNT(DISTINCT pr.id) as review_count
    FROM products p
    LEFT JOIN product_sellers ps ON p.seller_id = ps.seller_id
    LEFT JOIN product_reviews pr ON p.id = pr.product_id AND pr.is_visible = true
    WHERE p.is_active = true AND p.stock > 0
    ${whereSearch}
    ${cursor}
    GROUP BY p.id, p.name, p.description, p.price, p.stock, p.is_active, p.seller_id, p.category, p.image_url, p.created_at, ps.id, ps.business_name, ps.logo_url
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT ${qs.limit};
  `);
  
  return q.rows.map((row: any) => ({
    ...row,
    price_cents: Math.round((row.price as number) * 100),
    status: 'active',
    avgRating: parseFloat(row.avg_rating || 0),
    reviewCount: parseInt(row.review_count || 0),
    shop: row.shop_id ? {
      id: row.shop_id,
      name: row.shop_name,
      logoUrl: row.shop_logo_url
    } : null
  }));
}

export async function ensureCart(userId: string) {
  await ensureMarketplaceSchema();
  const got = await db.execute(sql`SELECT id FROM carts WHERE user_id=${userId} LIMIT 1;`);
  if (got.rows[0]) return got.rows[0].id as string;
  const ins = await db.execute(sql`INSERT INTO carts (user_id) VALUES (${userId}) RETURNING id;`);
  return ins.rows[0].id as string;
}

export async function upsertCartItem(
  cartId: string,
  productId: string,
  qty: number,
  variantId?: string,
  opts?: { variantKey?: string; variantLabel?: string },
) {
  await ensureMarketplaceSchema();

  const variantKey = opts?.variantKey ?? variantId ?? "";

  if (qty <= 0) {
    await db.execute(sql`
      DELETE FROM cart_items
      WHERE cart_id = ${cartId} AND product_id = ${productId} AND variant_key = ${variantKey};
    `);
    return;
  }

  let priceCents: number;
  let variantLabel: string | null = opts?.variantLabel ?? null;

  if (variantId) {
    const v = await db.execute(sql`
      SELECT pv.label, pv.price_cents, pv.stock, p.price
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id = ${variantId} AND pv.product_id = ${productId} AND pv.is_active = true
      LIMIT 1;
    `);
    const row = v.rows[0] as { label: string; price_cents: number | null; stock: number; price: number } | undefined;
    if (!row) throw new Error("VARIANT_NOT_FOUND");
    if (Number(row.stock) < qty) throw new Error("INSUFFICIENT_STOCK");
    priceCents = row.price_cents != null ? Number(row.price_cents) : Math.round(Number(row.price) * 100);
    if (!variantLabel) variantLabel = row.label;
  } else {
    const p = await db.execute(sql`
      SELECT price, has_variants FROM products WHERE id=${productId} LIMIT 1;
    `);
    const row = p.rows[0] as { price: number; has_variants: boolean } | undefined;
    if (!row) throw new Error("PRODUCT_NOT_FOUND");
    if (row.has_variants) throw new Error("VARIANT_REQUIRED");
    priceCents = Math.round(Number(row.price) * 100);
  }

  await db.execute(sql`
    INSERT INTO cart_items (cart_id, product_id, variant_id, variant_label, variant_key, qty, unit_price_cents, currency)
    VALUES (${cartId}, ${productId}, ${variantId ?? null}, ${variantLabel}, ${variantKey}, ${qty}, ${priceCents}, 'USD')
    ON CONFLICT (cart_id, product_id, variant_key)
    DO UPDATE SET
      qty = EXCLUDED.qty,
      unit_price_cents = EXCLUDED.unit_price_cents,
      variant_label = EXCLUDED.variant_label,
      variant_id = EXCLUDED.variant_id;
  `);
}

export async function getCart(cartId: string) {
  await ensureMarketplaceSchema();
  const items = await db.execute(sql`
    SELECT ci.id, ci.product_id, ci.variant_id, ci.variant_label, ci.variant_key,
           ci.qty, ci.unit_price_cents, ci.currency, p.name AS title, p.seller_id
    FROM cart_items ci JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id=${cartId};
  `); 
  return items.rows;
}

export async function clearCart(cartId: string) {
  await db.execute(sql`DELETE FROM cart_items WHERE cart_id=${cartId};`);
}

export async function calculateCartCheckoutTotals(userId: string) {
  await ensureMarketplaceSchema();
  const cartId = await ensureCart(userId);
  const items = await getCart(cartId);
  if (items.length === 0) return null;

  const taxBps = Number(process.env.TAX_RATE_BPS ?? 800);
  const subtotal = items.reduce(
    (sum, row: any) => sum + (row.unit_price_cents as number) * (row.qty as number),
    0,
  );
  const tax = Math.floor(subtotal * (taxBps / 10000));
  const total = subtotal + tax;
  const currency = String(items[0]?.currency ?? "USD").toLowerCase();

  return {
    cartId,
    itemCount: items.length,
    subtotalCents: subtotal,
    taxCents: tax,
    totalCents: total,
    currency,
  };
}

export async function checkout(userId: string, cartId: string, taxBps: number) {
  await ensureMarketplaceSchema();
  // compute totals
  const items = await getCart(cartId);
  const subtotal = items.reduce((s,i:any)=>s + (i.unit_price_cents as number)*(i.qty as number), 0);
  const tax = Math.floor(subtotal * (taxBps/10000));
  const total = subtotal + tax;

  // create order + items; decrement stock
  const totalDecimal = (total / 100).toFixed(2);
  const order = await db.execute(sql`
    INSERT INTO orders (user_id, subtotal_cents, tax_cents, total_cents, currency, total_amount, total, status)
    VALUES (${userId}, ${subtotal}, ${tax}, ${total}, ${items[0]?.currency ?? 'USD'}, ${totalDecimal}, ${totalDecimal}, 'paid')
    RETURNING *;
  `);
  const orderId = order.rows[0].id as string;

  for (const i of items) {
    const priceDecimal = ((i.unit_price_cents as number) / 100).toFixed(2);
    const lineTotal = ((i.unit_price_cents as number) * (i.qty as number) / 100).toFixed(2);
    const title = i.variant_label
      ? `${i.title as string} (${i.variant_label as string})`
      : (i.title as string);
    await db.execute(sql`
      INSERT INTO order_items (order_id, product_id, seller_id, title, qty, unit_price_cents, currency, quantity, price, total, variant_id, variant_label)
      VALUES (${orderId}, ${i.product_id}, ${i.seller_id}, ${title}, ${i.qty as number}, ${i.unit_price_cents}, ${i.currency}, ${i.qty as number}, ${priceDecimal}, ${lineTotal}, ${i.variant_id ?? null}, ${i.variant_label ?? null});
    `);
    if (i.variant_id) {
      await db.execute(sql`
        UPDATE product_variants SET stock = GREATEST(stock - ${i.qty as number}, 0)
        WHERE id=${i.variant_id};
      `);
    } else {
      await db.execute(sql`
        UPDATE products SET stock = GREATEST(stock - ${i.qty as number}, 0)
        WHERE id=${i.product_id};
      `);
    }
  }

  await clearCart(cartId);
  return { order: order.rows[0], items };
}

// ===== SHOP/SELLER OPERATIONS =====

export async function createShop(sellerId: string, data: any) {
  const result = await db.execute(sql`
    INSERT INTO product_sellers (
      seller_id, business_name, business_type, description, logo_url, banner_url,
      location, city, country, email, phone, website, social_links, operating_hours
    ) VALUES (
      ${sellerId}, ${data.businessName}, ${data.businessType || 'retailer'}, ${data.description || ''},
      ${data.logoUrl || null}, ${data.bannerUrl || null}, ${data.location || null},
      ${data.city || null}, ${data.country || null}, ${data.email || null}, 
      ${data.phone || null}, ${data.website || null}, ${data.socialLinks || null}::jsonb,
      ${data.operatingHours || null}::jsonb
    )
    RETURNING *;
  `);
  return result.rows[0];
}

export async function getShop(shopId: string) {
  const result = await db.execute(sql`
    SELECT * FROM product_sellers WHERE id = ${shopId} LIMIT 1;
  `);
  return result.rows[0] || null;
}

export async function getShopBySellerId(sellerId: string) {
  const result = await db.execute(sql`
    SELECT * FROM product_sellers WHERE seller_id = ${sellerId} LIMIT 1;
  `);
  return result.rows[0] || null;
}

export async function updateShop(shopId: string, sellerId: string, data: any) {
  const result = await db.execute(sql`
    UPDATE product_sellers SET
      business_name = COALESCE(${data.businessName}, business_name),
      business_type = COALESCE(${data.businessType}, business_type),
      description = COALESCE(${data.description}, description),
      logo_url = COALESCE(${data.logoUrl}, logo_url),
      banner_url = COALESCE(${data.bannerUrl}, banner_url),
      location = COALESCE(${data.location}, location),
      city = COALESCE(${data.city}, city),
      country = COALESCE(${data.country}, country),
      email = COALESCE(${data.email}, email),
      phone = COALESCE(${data.phone}, phone),
      website = COALESCE(${data.website}, website),
      social_links = COALESCE(${data.socialLinks || null}::jsonb, social_links),
      operating_hours = COALESCE(${data.operatingHours || null}::jsonb, operating_hours),
      updated_at = NOW()
    WHERE id = ${shopId} AND seller_id = ${sellerId}
    RETURNING *;
  `);
  return result.rows[0] || null;
}

export async function listShops(params: { q?: string; limit: number; cursor?: string }) {
  const whereSearch = params.q
    ? sql`AND to_tsvector('simple', business_name || ' ' || coalesce(description,'')) @@ plainto_tsquery('simple', ${params.q})`
    : sql``;
  const cursor = params.cursor
    ? sql`AND id < ${params.cursor}`
    : sql``;

  const result = await db.execute(sql`
    SELECT * FROM product_sellers
    WHERE is_active = true
    ${whereSearch}
    ${cursor}
    ORDER BY created_at DESC
    LIMIT ${params.limit};
  `);
  return result.rows;
}

export async function followShop(shopId: string, userId: string) {
  await db.execute(sql`
    INSERT INTO shop_followers (shop_id, user_id)
    VALUES (${shopId}, ${userId})
    ON CONFLICT DO NOTHING;
  `);
  await db.execute(sql`
    UPDATE product_sellers SET followers_count = followers_count + 1
    WHERE id = ${shopId};
  `);
}

export async function unfollowShop(shopId: string, userId: string) {
  await db.execute(sql`
    DELETE FROM shop_followers WHERE shop_id = ${shopId} AND user_id = ${userId};
  `);
  await db.execute(sql`
    UPDATE product_sellers SET followers_count = GREATEST(followers_count - 1, 0)
    WHERE id = ${shopId};
  `);
}

export async function isFollowingShop(shopId: string, userId: string) {
  const result = await db.execute(sql`
    SELECT 1 FROM shop_followers WHERE shop_id = ${shopId} AND user_id = ${userId} LIMIT 1;
  `);
  return result.rows.length > 0;
}

export async function getShopProducts(shopId: string, limit: number = 20) {
  const result = await db.execute(sql`
    SELECT p.* FROM products p
    JOIN product_sellers ps ON p.seller_id = ps.seller_id
    WHERE ps.id = ${shopId} AND p.is_active = true
    ORDER BY p.created_at DESC
    LIMIT ${limit};
  `);
  return result.rows;
}

// ===== PRODUCT REVIEWS =====

async function userPurchasedProduct(userId: string, productId: string): Promise<boolean> {
  const q = await db.execute(sql`
    SELECT 1
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.user_id = ${userId}
      AND oi.product_id = ${productId}
      AND o.status IN ('paid', 'fulfilled', 'delivered', 'confirmed')
    LIMIT 1;
  `);
  return q.rows.length > 0;
}

export async function upsertProductReview(
  productId: string,
  userId: string,
  data: { rating: number; reviewTitle?: string; reviewText?: string },
): Promise<{ review: Record<string, unknown>; updated: boolean }> {
  const verified = await userPurchasedProduct(userId, productId);
  const title = data.reviewTitle?.trim() || "";
  const text = data.reviewText?.trim() || "";

  const existing = await db.execute(sql`
    SELECT id FROM product_reviews
    WHERE product_id = ${productId} AND user_id = ${userId}
    LIMIT 1;
  `);
  const isUpdate = existing.rows.length > 0;

  const result = await db.execute(sql`
    INSERT INTO product_reviews (product_id, user_id, rating, review_title, review_text, is_verified_purchase)
    VALUES (${productId}, ${userId}, ${data.rating}, ${title}, ${text}, ${verified})
    ON CONFLICT (product_id, user_id)
    DO UPDATE SET
      rating = EXCLUDED.rating,
      review_title = EXCLUDED.review_title,
      review_text = EXCLUDED.review_text,
      is_verified_purchase = product_reviews.is_verified_purchase OR EXCLUDED.is_verified_purchase,
      updated_at = NOW()
    RETURNING *;
  `);

  return { review: result.rows[0] as Record<string, unknown>, updated: isUpdate };
}

/** @deprecated Use upsertProductReview */
export async function addProductReview(productId: string, userId: string, data: any) {
  const { review } = await upsertProductReview(productId, userId, data);
  return review;
}

export async function getProductReviews(productId: string, limit: number = 10) {
  const result = await db.execute(sql`
    SELECT 
      pr.*,
      u.id as user_id,
      u.first_name,
      u.last_name,
      u.profile_image_url
    FROM product_reviews pr
    JOIN users u ON pr.user_id = u.id
    WHERE pr.product_id = ${productId} AND pr.is_visible = true
    ORDER BY pr.created_at DESC
    LIMIT ${limit};
  `);
  return result.rows;
}

// ===== PRODUCT Q&A =====

export async function askQuestion(productId: string, userId: string, question: string) {
  const result = await db.execute(sql`
    INSERT INTO product_questions (product_id, user_id, question)
    VALUES (${productId}, ${userId}, ${question})
    RETURNING *;
  `);
  return result.rows[0];
}

export async function answerQuestion(questionId: string, userId: string, answer: string, isFromSeller: boolean = false) {
  const result = await db.execute(sql`
    INSERT INTO product_answers (question_id, user_id, answer, is_from_seller)
    VALUES (${questionId}, ${userId}, ${answer}, ${isFromSeller})
    RETURNING *;
  `);
  
  await db.execute(sql`
    UPDATE product_questions SET is_answered = true WHERE id = ${questionId};
  `);
  
  return result.rows[0];
}

export async function getProductQuestions(productId: string, limit: number = 10) {
  const questions = await db.execute(sql`
    SELECT 
      pq.*,
      u.id as user_id,
      u.first_name,
      u.last_name
    FROM product_questions pq
    JOIN users u ON pq.user_id = u.id
    WHERE pq.product_id = ${productId}
    ORDER BY pq.created_at DESC
    LIMIT ${limit};
  `);
  
  // Get answers for each question
  const questionsWithAnswers: Array<Record<string, unknown> & { answers: Record<string, unknown>[] }> = [];
  for (const q of questions.rows) {
    const answers = await db.execute(sql`
      SELECT 
        pa.*,
        u.id as user_id,
        u.first_name,
        u.last_name
      FROM product_answers pa
      JOIN users u ON pa.user_id = u.id
      WHERE pa.question_id = ${q.id}
      ORDER BY pa.created_at ASC;
    `);
    
    questionsWithAnswers.push({
      ...q,
      answers: answers.rows
    });
  }
  
  return questionsWithAnswers;
}

// ===== WISHLIST OPERATIONS =====

export async function getOrCreateWishlist(userId: string) {
  const existing = await db.execute(sql`
    SELECT id FROM user_wishlists WHERE user_id = ${userId} LIMIT 1;
  `);
  
  if (existing.rows[0]) {
    return existing.rows[0].id as string;
  }
  
  const newWishlist = await db.execute(sql`
    INSERT INTO user_wishlists (user_id, name) VALUES (${userId}, 'My Wishlist')
    RETURNING id;
  `);
  
  return newWishlist.rows[0].id as string;
}

export async function addToWishlist(userId: string, productId: string) {
  const wishlistId = await getOrCreateWishlist(userId);
  
  await db.execute(sql`
    INSERT INTO wishlist_items (wishlist_id, product_id)
    VALUES (${wishlistId}, ${productId})
    ON CONFLICT DO NOTHING;
  `);
}

export async function removeFromWishlist(userId: string, productId: string) {
  const wishlistId = await getOrCreateWishlist(userId);
  
  await db.execute(sql`
    DELETE FROM wishlist_items 
    WHERE wishlist_id = ${wishlistId} AND product_id = ${productId};
  `);
}

export async function getWishlistItems(userId: string) {
  const wishlistId = await getOrCreateWishlist(userId);
  
  const result = await db.execute(sql`
    SELECT 
      p.*,
      wi.added_at,
      wi.notes
    FROM wishlist_items wi
    JOIN products p ON wi.product_id = p.id
    WHERE wi.wishlist_id = ${wishlistId}
    ORDER BY wi.added_at DESC;
  `);
  
  return result.rows;
}

// ===== ORDERS =====

export async function getUserOrders(userId: string) {
  const result = await db.execute(sql`
    SELECT * FROM orders
    WHERE user_id = ${userId}
    ORDER BY created_at DESC;
  `);
  return result.rows;
}

export async function getOrderDetails(orderId: string, userId: string) {
  const order = await db.execute(sql`
    SELECT * FROM orders WHERE id = ${orderId} AND user_id = ${userId} LIMIT 1;
  `);
  
  if (!order.rows[0]) return null;
  
  const items = await db.execute(sql`
    SELECT * FROM order_items WHERE order_id = ${orderId};
  `);
  
  return {
    ...order.rows[0],
    items: items.rows
  };
}

export async function getSellerOrders(sellerId: string) {
  const result = await db.execute(sql`
    SELECT DISTINCT o.*
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.id
    WHERE oi.seller_id = ${sellerId}
    ORDER BY o.created_at DESC;
  `);
  return result.rows;
}

export async function getSellerShopDashboard(sellerId: string) {
  const shopRow = await getShopBySellerId(sellerId);
  if (!shopRow) return null;

  const shop = shopRow as Record<string, unknown>;
  const productsResult = await db.execute<{ active_products: number; total_products: number }>(sql`
    SELECT
      COUNT(*) FILTER (WHERE is_active = true)::int AS active_products,
      COUNT(*)::int AS total_products
    FROM products WHERE seller_id = ${sellerId}
  `);
  const productStats = productsResult.rows[0] ?? { active_products: 0, total_products: 0 };
  const orders = await getSellerOrders(sellerId);
  const pendingOrders = orders.filter((o) => {
    const s = String((o as { status?: string }).status ?? "").toLowerCase();
    return s === "pending" || s === "paid" || s === "confirmed";
  }).length;
  const completedOrders = orders.filter(
    (o) => String((o as { status?: string }).status ?? "").toLowerCase() === "delivered",
  ).length;

  return {
    shop: {
      id: String(shop.id ?? ""),
      name: String(shop.business_name ?? "My shop"),
      businessType: shop.business_type as string | null,
      description: shop.description as string | null,
      logoUrl: shop.logo_url as string | null,
      bannerUrl: shop.banner_url as string | null,
      location: shop.location as string | null,
      city: shop.city as string | null,
      followersCount: Number(shop.followers_count ?? 0),
      productsCount: Number(shop.products_count ?? productStats.total_products),
      isVerified: Boolean(shop.is_verified),
      isActive: shop.is_active !== false,
    },
    stats: {
      activeProducts: Number(productStats.active_products ?? 0),
      totalProducts: Number(productStats.total_products ?? 0),
      pendingOrders,
      completedOrders,
      totalOrders: orders.length,
    },
  };
}

export async function updateSellerOrderStatus(orderId: string, sellerId: string, status: string) {
  const allowed = ["pending", "confirmed", "dispatched", "delivered"];
  if (!allowed.includes(status)) return null;
  const result = await db.execute(sql`
    UPDATE orders o
    SET status = ${status}, updated_at = NOW()
    WHERE o.id = ${orderId}
      AND EXISTS (
        SELECT 1 FROM order_items oi
        WHERE oi.order_id = o.id AND oi.seller_id = ${sellerId}
      )
    RETURNING *;
  `);
  return result.rows[0] || null;
}

async function appendOrderItemsAndReduceStock(orderId: string, items: any[]) {
  for (const i of items) {
    const priceDecimal = ((i.unit_price_cents as number) / 100).toFixed(2);
    await db.execute(sql`
      INSERT INTO order_items (order_id, product_id, seller_id, title, qty, unit_price_cents, currency, quantity, price)
      VALUES (${orderId}, ${i.product_id}, ${i.seller_id}, ${i.title}, ${i.qty as number}, ${i.unit_price_cents}, ${i.currency}, ${i.qty as number}, ${priceDecimal});
    `);
    await db.execute(sql`
      UPDATE products SET stock = GREATEST(stock - ${i.qty as number}, 0)
      WHERE id=${i.product_id};
    `);
  }
}

export async function fulfillMarketplacePayment(
  stripePaymentIntentId: string,
  userId: string,
): Promise<{ orderId: string; alreadyFulfilled: boolean } | null> {
  const taxBps = Number(process.env.TAX_RATE_BPS ?? 800);
  const shippingPayload = JSON.stringify({ paymentIntentId: stripePaymentIntentId });

  const existingOrder = await db.execute(sql`
    SELECT id, status FROM orders
    WHERE user_id = ${userId}
      AND shipping_address->>'paymentIntentId' = ${stripePaymentIntentId}
    LIMIT 1;
  `);
  const existing = existingOrder.rows[0] as { id: string; status: string } | undefined;

  if (existing && (existing.status === "paid" || existing.status === "fulfilled")) {
    return { orderId: existing.id, alreadyFulfilled: true };
  }

  let orderId = existing?.id;
  const cartId = await ensureCart(userId);
  const cartItems = await getCart(cartId);

  if (!orderId) {
    if (cartItems.length === 0) {
      console.warn("[Marketplace] Payment succeeded but cart is empty:", stripePaymentIntentId);
      return null;
    }

    const subtotal = cartItems.reduce(
      (s, i: any) => s + (i.unit_price_cents as number) * (i.qty as number),
      0,
    );
    const tax = Math.floor(subtotal * (taxBps / 10000));
    const total = subtotal + tax;
    const totalDecimal = (total / 100).toFixed(2);

    const order = await db.execute(sql`
      INSERT INTO orders (user_id, subtotal_cents, tax_cents, total_cents, currency, total_amount, status, payment_method, shipping_address)
      VALUES (${userId}, ${subtotal}, ${tax}, ${total}, ${cartItems[0]?.currency ?? "USD"}, ${totalDecimal}, 'paid', 'stripe', ${shippingPayload}::jsonb)
      RETURNING id;
    `);
    orderId = order.rows[0].id as string;
    await appendOrderItemsAndReduceStock(orderId, cartItems);
    await clearCart(cartId);
  } else {
    const itemCheck = await db.execute(sql`
      SELECT COUNT(*)::int AS c FROM order_items WHERE order_id = ${orderId};
    `);
    const itemCount = (itemCheck.rows[0] as { c: number })?.c ?? 0;

    if (itemCount === 0 && cartItems.length > 0) {
      await appendOrderItemsAndReduceStock(orderId, cartItems);
      await clearCart(cartId);
    }

    await db.execute(sql`
      UPDATE orders
      SET status = 'paid', payment_method = 'stripe', updated_at = NOW()
      WHERE id = ${orderId};
    `);
  }

  const orderItems = await db.execute(sql`
    SELECT seller_id FROM order_items WHERE order_id = ${orderId};
  `);
  const sellerIds = [
    ...new Set(
      orderItems.rows
        .map((r: any) => r.seller_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { notifyUser } = await import("../notifications/notifications.service");
  const shortId = orderId.slice(0, 8);

  await notifyUser({
    userId,
    type: "system",
    message: `Your marketplace order #${shortId} is confirmed. Payment received.`,
    metadata: { orderId, paymentIntentId: stripePaymentIntentId, kind: "marketplace_order_paid" },
  });

  for (const sellerId of sellerIds) {
    await notifyUser({
      userId: sellerId,
      type: "system",
      message: `New marketplace order #${shortId}. Payment received.`,
      metadata: { orderId, paymentIntentId: stripePaymentIntentId, kind: "marketplace_order_received" },
    });
  }

  console.log("[Fix 4] Marketplace order fulfilled:", orderId, "sellers notified:", sellerIds.length);
  return { orderId, alreadyFulfilled: false };
}
