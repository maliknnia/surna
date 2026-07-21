-- One review per buyer per product
DELETE FROM product_reviews a
USING product_reviews b
WHERE a.id > b.id
  AND a.product_id = b.product_id
  AND a.user_id = b.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS product_reviews_product_user_idx
  ON product_reviews (product_id, user_id);
