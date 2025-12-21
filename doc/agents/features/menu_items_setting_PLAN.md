# 菜单编辑与管理优化（任务驱动）

- ID: menu_items_setting
- Owner: Codex
- Status: proposed

## Summary
在现有菜单管理页面基础上，新增菜品编辑功能、已删除菜品恢复、批量导入和图片上传功能，提升菜单管理的完整性和易用性。保持现有 UI 布局和尺寸不变，使用 shadcn/ui 组件。

## Scope
- In:
  - 前端：`components/features/menu/MenuManagement.tsx` 新增编辑菜品弹窗、已删除菜品管理、批量导入和图片上传功能
  - API：
    - `PUT /api/menu-items/[id]`：编辑菜品
    - `POST /api/menu-items/[id]/restore`：恢复已删除菜品
    - `GET /api/menu-items/deleted`：获取已删除菜品列表
    - `POST /api/menu-items/batch`：批量导入菜品
    - `POST /api/menu-items/upload`：图片上传（存储到 Supabase Storage）
  - 数据：复用 `db/schema.ts` 的 `menuItems`，无需新增表/列
- Out:
  - 不调整现有页面宽高、栅格或主要视觉样式
  - 不改动桌台管理/订单逻辑与其他 API
  - 不实现复杂的分类管理（如分类排序、分类图标等）

## UX Notes
### 菜品编辑
- 在每个菜品卡片右上角添加"编辑"图标按钮（Pencil 图标）
- 点击后打开编辑弹窗，预填充当前菜品信息
- 字段与新增弹窗一致：名称、中文名、分类、价格、描述、图片
- 支持修改分类（下拉选择已有分类或输入新分类）
- 提交后更新列表，toast 提示成功/失败

### 已删除菜品管理
- 在页面头部新增"已删除菜品"按钮（Archive 图标）
- 点击后打开侧边抽屉（Sheet），展示所有 `available=false` 的菜品
- 每个已删除菜品显示名称、分类、删除时间
- 提供"恢复"按钮，点击后将 `available` 设为 `true`
- 恢复成功后从已删除列表移除，主列表自动刷新

### 批量导入
- 在页面头部新增"批量导入"按钮（Upload 图标）
- 支持 CSV 文件上传，格式：`name,nameEn,category,price,description`
- 上传前预览数据，显示将导入的菜品数量
- 支持跳过已存在的菜品（同名同分类）
- 导入完成后显示成功/失败统计

### 图片上传
- 在新增/编辑弹窗中，图片字段改为文件上传组件
- 支持拖拽上传或点击选择
- 上传到 Supabase Storage 的 `menu-images` bucket
- 上传成功后自动填充图片 URL
- 支持预览已上传的图片

## API / DB
### API 端点
- `PUT /api/menu-items/[id]`：
  - 校验：UUID、必填字段、价格格式
  - 更新菜品信息，返回更新后的记录
  - 错误码：400（校验失败）、404（不存在）、409（同名同分类冲突）、500（其他）

- `POST /api/menu-items/[id]/restore`：
  - 校验：UUID
  - 将 `available` 设为 `true`
  - 错误码：400（校验失败）、404（不存在或未删除）、500（其他）

- `GET /api/menu-items/deleted`：
  - 返回所有 `available=false` 的菜品
  - 按 `updatedAt` 降序排列

- `POST /api/menu-items/batch`：
  - 接收 JSON 数组格式的菜品数据
  - 校验每条记录，跳过已存在的
  - 返回成功/失败统计

- `POST /api/menu-items/upload`：
  - 接收 multipart/form-data
  - 上传到 Supabase Storage
  - 返回公开访问 URL

### DB
- 复用 `db/schema.ts` 中的 `menuItems`，不新增表/列
- 编辑操作更新 `updatedAt` 字段
- 恢复操作将 `available` 设为 `true` 并更新 `updatedAt`

### Supabase Storage 配置
需要在 Supabase 控制台创建 `menu-images` bucket，并配置 RLS 策略：

```sql
-- 创建 menu-images bucket（如果不存在）
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- 启用 RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 允许所有用户读取 menu-images bucket 中的文件
CREATE POLICY "Allow public read access on menu-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');

-- 允许认证用户上传文件到 menu-images bucket
CREATE POLICY "Allow authenticated users to upload to menu-images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'menu-images'
  AND auth.role() = 'authenticated'
);

-- 允许认证用户更新自己上传的文件
CREATE POLICY "Allow authenticated users to update own files in menu-images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'menu-images'
  AND auth.role() = 'authenticated'
);

-- 允许认证用户删除自己上传的文件
CREATE POLICY "Allow authenticated users to delete own files in menu-images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'menu-images'
  AND auth.role() = 'authenticated'
);
```

## Workflow
1. 设计与交互对齐
2. API 实现（编辑、恢复、已删除列表、批量导入、图片上传）
3. 前端组件开发（编辑弹窗、已删除抽屉、批量导入、图片上传）
4. 联调与错误态校验
5. 文档与验收

## Acceptance Criteria
- [ ] 菜品卡片显示编辑按钮，点击后可编辑菜品信息
- [ ] 编辑弹窗预填充当前菜品数据，支持修改所有字段
- [ ] 编辑成功后列表自动更新，toast 提示成功
- [ ] 页面头部显示"已删除菜品"按钮，点击打开侧边抽屉
- [ ] 已删除菜品列表显示所有软删除的菜品，支持恢复操作
- [ ] 恢复成功后菜品重新出现在主列表
- [ ] 页面头部显示"批量导入"按钮，支持 CSV 文件上传
- [ ] 批量导入支持预览和跳过已存在菜品
- [ ] 新增/编辑弹窗支持图片文件上传
- [ ] 图片上传到 Supabase Storage 并返回公开 URL
- [ ] 所有 API 返回合理的状态码和错误信息
- [ ] UI 布局和尺寸保持不变，使用 shadcn/ui 组件

## 任务清单（Tasks）
开始前请阅读：
- `../../guides/nextjs.instructions.md`
- `../../guides/nextjs-tailwind.instructions.md`

---

### Task 1: 实现 `PUT /api/menu-items/[id]` 编辑菜品 API
**预计时间**: 1 小时
**依赖**: 无

**AI 提示词**:
你是一位资深的 Next.js + Drizzle 后端工程师。请在 `app/api/menu-items/[id]/route.ts` 中添加 `PUT` 方法实现菜品编辑功能。use context7 获取最新的 Next.js Route Handlers 最佳实践。

要求：
1. 使用 Zod 校验请求体，字段包括：
   - `name`（必填，字符串，1-120字符）
   - `nameEn`（可选，字符串，最多120字符）
   - `category`（必填，字符串，1-120字符）
   - `price`（必填，正数，最多两位小数）
   - `description`（可选，字符串，最多500字符）
   - `image`（可选，字符串，最多512字符）
2. 校验 `id` 为有效 UUID
3. 检查菜品是否存在且 `available=true`，不存在返回 404
4. 检查同分类下是否有同名菜品（排除自身），有则返回 409
5. 使用 Drizzle 更新记录，同时更新 `updatedAt`
6. 返回更新后的菜品数据，使用 `toMenuItemResponse` 格式化
7. 错误码：400（校验失败）、404（不存在）、409（冲突）、500（其他）

参考现有的 `POST` 和 `DELETE` 实现风格。

---

### Task 2: 实现已删除菜品相关 API
**预计时间**: 1 小时
**依赖**: 无

**AI 提示词**:
你是一位资深的 Next.js + Drizzle 后端工程师。请实现已删除菜品的获取和恢复 API。use context7 获取最新的 Next.js Route Handlers 最佳实践。

要求：
1. 创建 `app/api/menu-items/deleted/route.ts`，实现 `GET` 方法：
   - 查询所有 `available=false` 的菜品
   - 按 `updatedAt` 降序排列
   - 返回格式与现有菜品列表一致

2. 创建 `app/api/menu-items/[id]/restore/route.ts`，实现 `POST` 方法：
   - 校验 `id` 为有效 UUID
   - 检查菜品是否存在且 `available=false`，否则返回 404
   - 检查恢复后是否会与现有菜品冲突（同名同分类），有则返回 409
   - 将 `available` 设为 `true`，更新 `updatedAt`
   - 返回恢复后的菜品数据

参考现有 API 的校验和错误处理风格。

---

### Task 3: 实现批量导入 API
**预计时间**: 1.5 小时
**依赖**: 无

**AI 提示词**:
你是一位资深的 Next.js + Drizzle 后端工程师。请在 `app/api/menu-items/batch/route.ts` 中实现批量导入菜品 API。use context7 获取最新的 Next.js Route Handlers 最佳实践。

要求：
1. 实现 `POST` 方法，接收 JSON 数组格式的菜品数据
2. 请求体格式：
   ```typescript
   {
     items: Array<{
       name: string
       nameEn?: string
       category: string
       price: number
       description?: string
       image?: string
     }>
     skipExisting?: boolean // 是否跳过已存在的菜品，默认 true
   }
   ```
3. 使用 Zod 校验每条记录
4. 对于每条记录：
   - 检查同分类下是否有同名菜品
   - 如果 `skipExisting=true`，跳过已存在的
   - 如果 `skipExisting=false`，返回错误
5. 使用事务批量插入
6. 返回统计信息：
   ```typescript
   {
     total: number      // 总数
     created: number    // 成功创建数
     skipped: number    // 跳过数
     errors: Array<{ index: number; name: string; reason: string }>
   }
   ```
7. 限制单次导入最多 100 条

参考现有 `POST /api/menu-items` 的校验逻辑。

---

### Task 4: 实现图片上传 API
**预计时间**: 1.5 小时
**依赖**: 无

**AI 提示词**:
你是一位资深的 Next.js + Supabase 后端工程师。请在 `app/api/menu-items/upload/route.ts` 中实现图片上传 API。use context7 获取最新的 Next.js Route Handlers 和 Supabase Storage 最佳实践。

要求：
1. 实现 `POST` 方法，接收 `multipart/form-data`
2. 使用 Next.js 内置的 `formData()` 解析请求
3. 校验文件：
   - 必须是图片类型（image/jpeg, image/png, image/webp, image/gif）
   - 文件大小不超过 5MB
4. 生成唯一文件名：`menu-{timestamp}-{random}.{ext}`
5. 上传到 Supabase Storage 的 `menu-images` bucket
6. 返回公开访问 URL
7. 错误处理：
   - 400：无文件、文件类型错误、文件过大
   - 500：上传失败

使用 `@supabase/supabase-js` 的 Storage API，参考 `lib/supabase/server.ts` 创建客户端。

---

### Task 5: 更新 API 客户端和类型定义
**预计时间**: 0.5 小时
**依赖**: Task 1, Task 2, Task 3, Task 4

**AI 提示词**:
你是一位资深的 TypeScript 工程师。请更新 API 客户端和类型定义以支持新的菜单管理 API。

要求：
1. 在 `types/api.ts` 中添加新的类型定义：
   ```typescript
   // 编辑菜品
   interface UpdateMenuItemInput {
     name: string
     nameEn?: string
     category: string
     price: number
     description?: string
     image?: string
   }

   // 批量导入
   interface BatchImportInput {
     items: CreateMenuItemInput[]
     skipExisting?: boolean
   }

   interface BatchImportResponse {
     total: number
     created: number
     skipped: number
     errors: Array<{ index: number; name: string; reason: string }>
   }

   // 图片上传
   interface UploadImageResponse {
     url: string
   }

   // 已删除菜品列表
   interface DeletedMenuListResponse {
     items: MenuItemResponse[]
   }
   ```

2. 在 `lib/api/client.ts` 的 `menuItems` 对象中添加新方法：
   - `update(id: string, data: UpdateMenuItemInput)`
   - `listDeleted()`
   - `restore(id: string)`
   - `batchImport(data: BatchImportInput)`
   - `uploadImage(file: File)`

3. 在 `lib/queries/use-menu.ts` 中添加新的 mutation hooks：
   - `useUpdateMenuItem()`
   - `useRestoreMenuItem()`
   - `useBatchImportMenuItems()`
   - `useUploadMenuImage()`

---

### Task 6: 实现菜品编辑弹窗组件
**预计时间**: 1.5 小时
**依赖**: Task 1, Task 5

**AI 提示词**:
你是一位资深的 Next.js 前端工程师。请在 `components/features/menu/MenuManagement.tsx` 中添加菜品编辑功能。use context7 获取最新的 shadcn/ui Dialog 组件最佳实践。

要求：
1. 在每个菜品卡片右上角添加编辑按钮（使用 Pencil 图标）
2. 创建编辑弹窗组件，复用新增弹窗的表单结构
3. 点击编辑按钮时：
   - 设置当前编辑的菜品 ID
   - 预填充表单数据
   - 打开编辑弹窗
4. 表单字段与新增弹窗一致：
   - 英文名称（必填）
   - 中文名称（可选）
   - 分类（必填，支持选择已有或输入新分类）
   - 价格（必填）
   - 描述（可选）
   - 图片 URL（可选）
5. 提交时调用 `PUT /api/menu-items/[id]`
6. 成功后关闭弹窗、刷新列表、显示 toast
7. 错误处理：显示服务器返回的错误信息

保持现有 UI 布局和尺寸不变，使用 shadcn/ui 组件。

---

### Task 7: 实现已删除菜品管理抽屉
**预计时间**: 1.5 小时
**依赖**: Task 2, Task 5

**AI 提示词**:
你是一位资深的 Next.js 前端工程师。请在 `components/features/menu/MenuManagement.tsx` 中添加已删除菜品管理功能。use context7 获取最新的 shadcn/ui Sheet 组件最佳实践。

要求：
1. 在页面头部按钮区域添加"已删除菜品"按钮（使用 Archive 图标）
2. 点击后打开右侧抽屉（Sheet 组件）
3. 抽屉内容：
   - 标题："已删除菜品"
   - 描述："这些菜品已被删除，可以恢复到菜单中"
   - 已删除菜品列表（调用 `GET /api/menu-items/deleted`）
   - 每个菜品显示：名称、分类、删除时间（updatedAt）
   - 每个菜品右侧显示"恢复"按钮
4. 点击恢复按钮：
   - 调用 `POST /api/menu-items/[id]/restore`
   - 成功后从列表移除该菜品
   - 刷新主菜单列表
   - 显示 toast 提示
5. 空状态：显示"暂无已删除的菜品"
6. 加载状态：显示 skeleton

保持现有 UI 风格，使用 shadcn/ui 组件。

---

### Task 8: 实现批量导入功能
**预计时间**: 2 小时
**依赖**: Task 3, Task 5

**AI 提示词**:
你是一位资深的 Next.js 前端工程师。请在 `components/features/menu/MenuManagement.tsx` 中添加批量导入功能。use context7 获取最新的文件上传和 CSV 解析最佳实践。

要求：
1. 在页面头部按钮区域添加"批量导入"按钮（使用 Upload 图标）
2. 点击后打开导入弹窗（Dialog 组件）
3. 弹窗内容：
   - 标题："批量导入菜品"
   - 文件上传区域（支持拖拽或点击选择 CSV 文件）
   - CSV 格式说明：`name,nameEn,category,price,description`
   - 下载模板按钮（生成示例 CSV）
4. 选择文件后：
   - 解析 CSV 内容（使用 `papaparse` 库或手动解析）
   - 显示预览表格（最多显示前 10 条）
   - 显示总数和校验结果
   - 提供"跳过已存在菜品"选项（默认勾选）
5. 点击导入按钮：
   - 调用 `POST /api/menu-items/batch`
   - 显示进度状态
   - 完成后显示结果统计（成功数、跳过数、失败数）
   - 刷新主菜单列表
6. 错误处理：
   - CSV 格式错误
   - 必填字段缺失
   - 价格格式错误

保持现有 UI 风格，使用 shadcn/ui 组件。

---

### Task 9: 实现图片上传组件
**预计时间**: 1.5 小时
**依赖**: Task 4, Task 5

**AI 提示词**:
你是一位资深的 Next.js 前端工程师。请创建图片上传组件并集成到菜品新增/编辑弹窗中。use context7 获取最新的文件上传和图片预览最佳实践。

要求：
1. 创建 `components/features/menu/ImageUpload.tsx` 组件
2. 组件功能：
   - 支持拖拽上传或点击选择
   - 显示上传区域（虚线边框，图标提示）
   - 文件类型限制：image/jpeg, image/png, image/webp, image/gif
   - 文件大小限制：5MB
   - 上传中显示进度/loading 状态
   - 上传成功后显示图片预览
   - 支持删除已上传的图片
   - 支持传入初始图片 URL（编辑时使用）
3. 组件 Props：
   ```typescript
   interface ImageUploadProps {
     value?: string           // 当前图片 URL
     onChange: (url: string | null) => void
     disabled?: boolean
   }
   ```
4. 在新增/编辑弹窗中替换原有的图片 URL 输入框
5. 调用 `POST /api/menu-items/upload` 上传图片
6. 错误处理：
   - 文件类型错误
   - 文件过大
   - 上传失败

使用 shadcn/ui 组件和 Tailwind CSS 样式。

---

### Task 10: 联调与回归验证
**预计时间**: 1 小时
**依赖**: Task 6, Task 7, Task 8, Task 9

**AI 提示词**:
你是一位 QA 工程师。请验证菜单管理优化功能的完整性和正确性。

验证要点：
1. 菜品编辑功能：
   - [ ] 编辑按钮正确显示在每个菜品卡片上
   - [ ] 点击编辑按钮打开弹窗，数据正确预填充
   - [ ] 修改字段后提交成功，列表更新
   - [ ] 同名同分类冲突时显示错误提示
   - [ ] 编辑不存在的菜品返回 404

2. 已删除菜品管理：
   - [ ] "已删除菜品"按钮正确显示
   - [ ] 抽屉正确显示已删除菜品列表
   - [ ] 恢复功能正常工作
   - [ ] 恢复后菜品出现在主列表
   - [ ] 恢复冲突时显示错误提示

3. 批量导入功能：
   - [ ] 导入按钮正确显示
   - [ ] CSV 文件解析正确
   - [ ] 预览数据正确显示
   - [ ] 导入成功后列表更新
   - [ ] 跳过已存在菜品功能正常
   - [ ] 错误统计正确显示

4. 图片上传功能：
   - [ ] 上传组件正确显示在新增/编辑弹窗中
   - [ ] 拖拽上传功能正常
   - [ ] 点击选择功能正常
   - [ ] 文件类型限制生效
   - [ ] 文件大小限制生效
   - [ ] 上传成功后显示预览
   - [ ] 图片 URL 正确保存到数据库

5. UI 一致性：
   - [ ] 页面布局和尺寸未改变
   - [ ] 所有新增组件使用 shadcn/ui 风格
   - [ ] Toast 提示正确显示
   - [ ] 加载状态正确显示

运行命令：
```bash
pnpm lint
pnpm test:run
pnpm build
pnpm dev
```

## Links
- Guides：
  - `../../guides/nextjs.instructions.md`
  - `../../guides/nextjs-tailwind.instructions.md`
- 相关文档：
  - 现有菜品增删计划：`menu_items_modification-PLAN.md`
- Supabase Storage 文档：https://supabase.com/docs/guides/storage
