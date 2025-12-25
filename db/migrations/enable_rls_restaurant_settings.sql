-- =============================================
-- Restaurant Settings Table RLS Configuration
-- =============================================
-- 在Supabase SQL Editor中执行此脚本

-- 启用 RLS (Row Level Security)
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略：允许所有认证用户读取
CREATE POLICY "Allow authenticated users to read restaurant settings"
ON restaurant_settings
FOR SELECT
TO authenticated
USING (true);

-- 创建 RLS 策略：允许所有认证用户更新
CREATE POLICY "Allow authenticated users to update restaurant settings"
ON restaurant_settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 创建 RLS 策略：允许所有认证用户插入
CREATE POLICY "Allow authenticated users to insert restaurant settings"
ON restaurant_settings
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 插入默认设置记录（如果表为空）
INSERT INTO restaurant_settings (restaurant_name, address, phone, email, tax_rate, currency, business_hours)
SELECT '意式餐厅', '123 Main Street, City', '+1 234 567 8900', 'info@restaurant.com', 0.1000, 'EUR', '周一至周五: 11:00 - 22:00
周六至周日: 10:00 - 23:00'
WHERE NOT EXISTS (SELECT 1 FROM restaurant_settings);
