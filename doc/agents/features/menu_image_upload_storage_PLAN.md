# 菜品图片上传到 Supabase Storage（任务驱动）

- ID: menu_image_upload_storage
- Owner: Codex
- Status: proposed

## Summary
在菜单管理中支持菜品图片上传到 Supabase Storage。用户可在新增菜品时上传图片、在编辑菜品时更换或删除图片；图片 URL 写入 `menu_items.image` 字段。

## Scope
- In:
  - 前端组件：新增可复用上传组件 `components/features/menu/ImageUpload.tsx`
  - 前端集成：在 `components/features/menu/MenuManagement.tsx` 新增/编辑弹窗集成图片上传
  - 直接使用 Supabase JS SDK Storage API（无自建后端 API）
- Out:
  - 不修改数据库 schema（复用 `menu_items.image` 列存储 URL）
  - 不调整页面主要布局与视觉风格
  - 不新增后端 API 或鉴权体系

## 技术细节
- Supabase Storage bucket 名称：`menu_items_photos`
- 数据库字段：`menu_items.image` 存储公开访问 URL
- 图片限制：jpeg/png/webp/gif，≤ 5MB
- 文件命名：`menu-{timestamp}-{random}.{ext}`
- Supabase 客户端：`import { createClient } from "@/lib/supabase/client"`
- 删除逻辑：
  - 仅在 URL 指向 `menu_items_photos` 时删除 Storage 对象
  - 替换图片时：新图上传成功后再删除旧图，避免丢失

## Supabase Storage RLS SQL
在 Supabase Dashboard SQL Editor 中执行：
```sql
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
```

## Acceptance Criteria
- [ ] 图片上传支持 jpeg/png/webp/gif，大小 ≤ 5MB
- [ ] 上传成功后写入公开访问 URL 到 `menu_items.image`
- [ ] 新增菜品弹窗支持上传并预览图片
- [ ] 编辑菜品弹窗支持预览、更换、删除图片
- [ ] 删除图片会清空 `menu_items.image` 并移除 Storage 文件
- [ ] 上传/删除失败时显示明确错误提示
- [ ] UI 布局与现有弹窗尺寸一致

## 任务清单（Tasks）
开始前请阅读：
- `../../guides/nextjs.instructions.md`
- `../../guides/nextjs-tailwind.instructions.md`

---

### Task 1: 创建可复用图片上传组件（ImageUpload）
**预计时间**: 1.5 小时
**依赖**: 无

**AI 提示词**:
你是一位资深的 Next.js 前端工程师。请在 `components/features/menu/ImageUpload.tsx` 实现图片上传组件，直接使用 Supabase JS SDK Storage API。use context7 获取最新的 Supabase Storage 与 shadcn/ui 最佳实践。

要求：
1. 使用项目 Supabase 客户端：`import { createClient } from "@/lib/supabase/client"`
2. Props 接口：
   ```ts
   interface ImageUploadProps {
     value?: string | null
     onChange: (url: string | null) => void
     onError?: (error: string) => void
     disabled?: boolean
   }
   ```
3. 功能：
   - 无图片时：显示上传区域，支持拖拽/点击选择文件
   - 有图片时：显示预览图，提供“更换”“删除”按钮
   - 上传中：显示 loading 状态；禁用操作
   - 错误时：显示错误提示并调用 `onError`
4. Supabase Storage 调用：
   - bucket：`menu_items_photos`
   - 上传：`supabase.storage.from('menu_items_photos').upload(path, file)`
   - 获取公开 URL：`supabase.storage.from('menu_items_photos').getPublicUrl(path)`
   - 删除：`supabase.storage.from('menu_items_photos').remove([path])`
   - 文件名：`menu-{timestamp}-{random}.{ext}`
5. 校验：
   - 类型：image/jpeg, image/png, image/webp, image/gif
   - 大小：≤ 5MB
6. 解析 URL 获取路径（仅用于删除 Storage 文件）：
   ```ts
   function getPathFromUrl(url: string): string | null {
     const match = url.match(/menu_items_photos\/(.+)$/)
     return match ? match[1] : null
   }
   ```
7. 替换图片时，新图上传成功后再删除旧图（若 URL 匹配 bucket）
8. UI：使用 shadcn/ui 组件（Button, Card 等），风格与现有一致
9. 导出：在 `components/features/menu/index.ts` 中导出组件（若文件存在）

---

### Task 2: 集成图片上传到新增菜品弹窗
**预计时间**: 0.5 小时
**依赖**: Task 1

**AI 提示词**:
你是一位资深的 Next.js 前端工程师。请在 `components/features/menu/MenuManagement.tsx` 的新增菜品弹窗中集成 `ImageUpload` 组件。

要求：
1. 替换新增弹窗中图片 URL 输入框（id="menu-image"）
2. 绑定：
   - `value={addForm.image}`
   - `onChange={(url) => handleAddFieldChange("image", url ?? "")}`
   - `onError` 用 toast 显示错误
   - `disabled={addSubmitting}`
3. 上传成功后 URL 自动写入表单
4. 图片上传区域放在描述字段下方，保持现有弹窗尺寸

---

### Task 3: 集成图片上传到编辑菜品弹窗（含删除）
**预计时间**: 0.5 小时
**依赖**: Task 1

**AI 提示词**:
你是一位资深的 Next.js 前端工程师。请在 `components/features/menu/MenuManagement.tsx` 的编辑菜品弹窗中集成 `ImageUpload` 组件，支持更换/删除图片。

要求：
1. 替换编辑弹窗中图片 URL 输入框（id="edit-menu-image"）
2. 绑定：
   - `value={editForm.image}`
   - `onChange={(url) => handleEditFieldChange("image", url ?? "")}`
   - `onError` 用 toast 显示错误
   - `disabled={editSubmitting}`
3. 打开编辑弹窗时应显示现有图片预览（若有）
4. 删除图片时清空 `editForm.image`；提交后后端会将其设为 null
5. UI 布局保持原有尺寸与结构

---

### Task 4: 验收与手工测试
**预计时间**: 0.5 小时
**依赖**: Task 2, Task 3

**AI 提示词**:
你是一位资深的 QA 工程师。请验证菜品图片上传功能的完整性。

前置条件：
- 已在 Supabase Dashboard 执行 RLS SQL 创建 bucket 与策略
- 已登录（Storage 上传/删除需要认证）

验收清单：
1. 新增菜品时上传图片：
   - [ ] 拖拽/点击上传成功
   - [ ] 上传后显示预览
   - [ ] 提交后菜单项图片正常显示
2. 编辑菜品时管理图片：
   - [ ] 编辑弹窗显示现有图片
   - [ ] 更换图片成功
   - [ ] 删除图片后保存成功
3. 错误处理：
   - [ ] 非图片格式提示错误
   - [ ] 超过 5MB 提示错误
   - [ ] 未登录提示错误
4. 运行 `pnpm lint` 确保无报错
