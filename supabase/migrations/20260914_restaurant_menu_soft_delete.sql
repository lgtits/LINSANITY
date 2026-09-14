-- 餐廳／餐點軟刪除
--
-- 訂單是歷史憑證，order_items 存了 menu_item_name / price 快照，orders 存了
-- restaurant_name 快照。主檔真刪除會撞 FK（23503），也會讓「這道菜賣了幾份」
-- 這類以 id 聚合的統計斷線。沿用 parents / students 的 deleted 旗標慣例。
--
-- 順便補上 20260630_fix_fk_on_delete.sql 漏掉的兩條 FK，讓「永久刪除」
-- 這條路（真刪除）不會再引發 FK violation：
--   order_items.menu_item_id → SET NULL
--   orders.restaurant_id     → SET NULL

-- ── 1. 軟刪除欄位 ──────────────────────────────────────────────────
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS restaurants_active_idx ON restaurants (active, deleted);
CREATE INDEX IF NOT EXISTS menu_items_deleted_idx ON menu_items (deleted);

-- ── 2. 補 FK 的 ON DELETE 行為 ─────────────────────────────────────
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_menu_item_id_fkey;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_menu_item_id_fkey
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_restaurant_id_fkey;

ALTER TABLE orders
  ADD CONSTRAINT orders_restaurant_id_fkey
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL;
