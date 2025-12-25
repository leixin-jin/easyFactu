-- =============================================
-- 修复所有表的 RLS (Row Level Security) 配置
-- 请在 Supabase SQL Editor 中执行此脚本
-- =============================================
-- 此脚本会为所有表启用RLS并创建允许认证用户访问的策略
-- 如果策略已存在会跳过（使用 IF NOT EXISTS 或忽略错误）

-- =============================================
-- 1. menu_items 表
-- =============================================
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read menu_items" ON menu_items;
CREATE POLICY "Allow authenticated users to read menu_items"
ON menu_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert menu_items" ON menu_items;
CREATE POLICY "Allow authenticated users to insert menu_items"
ON menu_items FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update menu_items" ON menu_items;
CREATE POLICY "Allow authenticated users to update menu_items"
ON menu_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete menu_items" ON menu_items;
CREATE POLICY "Allow authenticated users to delete menu_items"
ON menu_items FOR DELETE TO authenticated USING (true);

-- =============================================
-- 2. restaurant_tables 表
-- =============================================
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read restaurant_tables" ON restaurant_tables;
CREATE POLICY "Allow authenticated users to read restaurant_tables"
ON restaurant_tables FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert restaurant_tables" ON restaurant_tables;
CREATE POLICY "Allow authenticated users to insert restaurant_tables"
ON restaurant_tables FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update restaurant_tables" ON restaurant_tables;
CREATE POLICY "Allow authenticated users to update restaurant_tables"
ON restaurant_tables FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete restaurant_tables" ON restaurant_tables;
CREATE POLICY "Allow authenticated users to delete restaurant_tables"
ON restaurant_tables FOR DELETE TO authenticated USING (true);

-- =============================================
-- 3. orders 表
-- =============================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read orders" ON orders;
CREATE POLICY "Allow authenticated users to read orders"
ON orders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert orders" ON orders;
CREATE POLICY "Allow authenticated users to insert orders"
ON orders FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update orders" ON orders;
CREATE POLICY "Allow authenticated users to update orders"
ON orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete orders" ON orders;
CREATE POLICY "Allow authenticated users to delete orders"
ON orders FOR DELETE TO authenticated USING (true);

-- =============================================
-- 4. order_items 表
-- =============================================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read order_items" ON order_items;
CREATE POLICY "Allow authenticated users to read order_items"
ON order_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert order_items" ON order_items;
CREATE POLICY "Allow authenticated users to insert order_items"
ON order_items FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update order_items" ON order_items;
CREATE POLICY "Allow authenticated users to update order_items"
ON order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete order_items" ON order_items;
CREATE POLICY "Allow authenticated users to delete order_items"
ON order_items FOR DELETE TO authenticated USING (true);

-- =============================================
-- 5. transactions 表
-- =============================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read transactions" ON transactions;
CREATE POLICY "Allow authenticated users to read transactions"
ON transactions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert transactions" ON transactions;
CREATE POLICY "Allow authenticated users to insert transactions"
ON transactions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update transactions" ON transactions;
CREATE POLICY "Allow authenticated users to update transactions"
ON transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete transactions" ON transactions;
CREATE POLICY "Allow authenticated users to delete transactions"
ON transactions FOR DELETE TO authenticated USING (true);

-- =============================================
-- 6. transaction_items 表
-- =============================================
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read transaction_items" ON transaction_items;
CREATE POLICY "Allow authenticated users to read transaction_items"
ON transaction_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert transaction_items" ON transaction_items;
CREATE POLICY "Allow authenticated users to insert transaction_items"
ON transaction_items FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update transaction_items" ON transaction_items;
CREATE POLICY "Allow authenticated users to update transaction_items"
ON transaction_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete transaction_items" ON transaction_items;
CREATE POLICY "Allow authenticated users to delete transaction_items"
ON transaction_items FOR DELETE TO authenticated USING (true);

-- =============================================
-- 7. daily_closures 表
-- =============================================
ALTER TABLE daily_closures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read daily_closures" ON daily_closures;
CREATE POLICY "Allow authenticated users to read daily_closures"
ON daily_closures FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert daily_closures" ON daily_closures;
CREATE POLICY "Allow authenticated users to insert daily_closures"
ON daily_closures FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update daily_closures" ON daily_closures;
CREATE POLICY "Allow authenticated users to update daily_closures"
ON daily_closures FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete daily_closures" ON daily_closures;
CREATE POLICY "Allow authenticated users to delete daily_closures"
ON daily_closures FOR DELETE TO authenticated USING (true);

-- =============================================
-- 8. daily_closure_state 表
-- =============================================
ALTER TABLE daily_closure_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read daily_closure_state" ON daily_closure_state;
CREATE POLICY "Allow authenticated users to read daily_closure_state"
ON daily_closure_state FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert daily_closure_state" ON daily_closure_state;
CREATE POLICY "Allow authenticated users to insert daily_closure_state"
ON daily_closure_state FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update daily_closure_state" ON daily_closure_state;
CREATE POLICY "Allow authenticated users to update daily_closure_state"
ON daily_closure_state FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete daily_closure_state" ON daily_closure_state;
CREATE POLICY "Allow authenticated users to delete daily_closure_state"
ON daily_closure_state FOR DELETE TO authenticated USING (true);

-- =============================================
-- 9. daily_closure_adjustments 表
-- =============================================
ALTER TABLE daily_closure_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read daily_closure_adjustments" ON daily_closure_adjustments;
CREATE POLICY "Allow authenticated users to read daily_closure_adjustments"
ON daily_closure_adjustments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert daily_closure_adjustments" ON daily_closure_adjustments;
CREATE POLICY "Allow authenticated users to insert daily_closure_adjustments"
ON daily_closure_adjustments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update daily_closure_adjustments" ON daily_closure_adjustments;
CREATE POLICY "Allow authenticated users to update daily_closure_adjustments"
ON daily_closure_adjustments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete daily_closure_adjustments" ON daily_closure_adjustments;
CREATE POLICY "Allow authenticated users to delete daily_closure_adjustments"
ON daily_closure_adjustments FOR DELETE TO authenticated USING (true);

-- =============================================
-- 10. daily_closure_payment_lines 表
-- =============================================
ALTER TABLE daily_closure_payment_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read daily_closure_payment_lines" ON daily_closure_payment_lines;
CREATE POLICY "Allow authenticated users to read daily_closure_payment_lines"
ON daily_closure_payment_lines FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert daily_closure_payment_lines" ON daily_closure_payment_lines;
CREATE POLICY "Allow authenticated users to insert daily_closure_payment_lines"
ON daily_closure_payment_lines FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update daily_closure_payment_lines" ON daily_closure_payment_lines;
CREATE POLICY "Allow authenticated users to update daily_closure_payment_lines"
ON daily_closure_payment_lines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete daily_closure_payment_lines" ON daily_closure_payment_lines;
CREATE POLICY "Allow authenticated users to delete daily_closure_payment_lines"
ON daily_closure_payment_lines FOR DELETE TO authenticated USING (true);

-- =============================================
-- 11. daily_closure_item_lines 表
-- =============================================
ALTER TABLE daily_closure_item_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read daily_closure_item_lines" ON daily_closure_item_lines;
CREATE POLICY "Allow authenticated users to read daily_closure_item_lines"
ON daily_closure_item_lines FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert daily_closure_item_lines" ON daily_closure_item_lines;
CREATE POLICY "Allow authenticated users to insert daily_closure_item_lines"
ON daily_closure_item_lines FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update daily_closure_item_lines" ON daily_closure_item_lines;
CREATE POLICY "Allow authenticated users to update daily_closure_item_lines"
ON daily_closure_item_lines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete daily_closure_item_lines" ON daily_closure_item_lines;
CREATE POLICY "Allow authenticated users to delete daily_closure_item_lines"
ON daily_closure_item_lines FOR DELETE TO authenticated USING (true);

-- =============================================
-- 12. restaurant_settings 表
-- =============================================
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read restaurant_settings" ON restaurant_settings;
CREATE POLICY "Allow authenticated users to read restaurant_settings"
ON restaurant_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert restaurant_settings" ON restaurant_settings;
CREATE POLICY "Allow authenticated users to insert restaurant_settings"
ON restaurant_settings FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update restaurant_settings" ON restaurant_settings;
CREATE POLICY "Allow authenticated users to update restaurant_settings"
ON restaurant_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete restaurant_settings" ON restaurant_settings;
CREATE POLICY "Allow authenticated users to delete restaurant_settings"
ON restaurant_settings FOR DELETE TO authenticated USING (true);

-- =============================================
-- 完成！所有表的RLS已启用并创建策略
-- =============================================
