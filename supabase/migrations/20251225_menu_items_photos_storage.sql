-- ============================================================
-- 菜品图片上传 Storage RLS 配置
-- 请在 Supabase Dashboard SQL Editor 中执行此脚本
-- ============================================================

-- 创建 menu_items_photos bucket（公开读）
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu_items_photos', 'menu_items_photos', true)
ON CONFLICT (id) DO NOTHING;

-- 启用 RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 允许所有用户读取（公开访问）
CREATE POLICY "public read menu_items_photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu_items_photos');

-- 允许认证用户上传
CREATE POLICY "authenticated upload menu_items_photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'menu_items_photos'
  AND auth.role() = 'authenticated'
);

-- 允许认证用户删除
CREATE POLICY "authenticated delete menu_items_photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'menu_items_photos'
  AND auth.role() = 'authenticated'
);
