# 菜单编辑与上下架优化（功能模板 · 任务驱动）

- ID: menu_items_setting
- Owner: Codex
- Status: proposed

## Summary
在现有菜单管理页面基础上，补齐菜品编辑、下架/上架（删除=下架、恢复=上架）、批量导入（含 image 字段）与图片上传能力。图片公开访问，前端使用 shadcn/ui，保持现有页面尺寸与布局，仅增强“菜品种类/分类显示”的准确性与一致性。

## Scope
- In:
  - 前端：`components/features/menu/MenuManagement.tsx` 增加编辑、下架/上架、批量导入、图片上传入口；新增可复用上传组件 `components/features/menu/ImageUpload.tsx`
  - API：
    - `PUT /api/menu-items/[id]` 编辑菜品
    - `POST /api/menu-items/[id]/restore` 恢复菜品（上架）
    - `GET /api/menu-items/deleted` 获取已下架（软删除）菜品
    - `POST /api/menu-items/batch` 批量导入（含 image 字段）
    - `POST /api/menu-items/upload` 图片上传（Supabase Storage，公开访问）
  - 数据：复用 `db/schema.ts` 的 `menuItems`；`available=false` 代表下架
  - UI 一致性：保留页面大小与布局，新增交互通过 Dialog/Sheet，不新增固定区块
- Out:
  - 不调整页面宽高、栅格与主要视觉样式
  - 不引入新的分类管理能力（排序/图标/层级）
  - 不新增鉴权体系（沿用现有 Supabase 配置）

## UX Notes
### 菜品编辑
- 每个菜品卡片右上角增加“编辑”图标按钮（Pencil）
- 编辑弹窗字段与新增一致：英文名、中文名、分类、价格、描述、图片
- 预填充当前菜品数据，提交成功后刷新列表并 toast

### 下架/上架（删除=下架、恢复=上架）
- “删除菜品”语义调整为“下架菜品”，保持同一按钮位置与样式
- 已下架菜品在侧边抽屉（Sheet）中展示，支持一键“恢复上架”

### 批量导入（含 image）
- 头部按钮区新增“批量导入”按钮（Upload）
- CSV 格式：`name,nameEn,category,price,description,image`
- 解析后预览（前 10 条），显示总数/校验结果，支持“跳过已存在”

### 图片上传（公开访问）
- 新增/编辑弹窗使用上传组件替代图片 URL 输入
- 支持拖拽/点击上传，上传成功后展示预览并写回 URL
- 图片存储在公开 bucket，前端直接使用公开 URL 展示

### 菜品种类/分类显示
- 分类侧边栏与列表分类信息保持可见且不改变布局
- 新增/编辑/导入/恢复后分类计数更新正确

## API / DB
- API: 见 Scope 中的端点列表
- DB: 复用 `menu_items`，不新增表/列；编辑/上下架操作更新 `updatedAt`
  - 生成与推送：若后续确需 schema 变更，再执行 `pnpm drizzle:generate && pnpm drizzle:push`
  - 种子：如需示例数据，更新 `seed/` 并在 PR 说明

### Supabase Storage（公开访问）与 RLS SQL
```sql
-- 创建 menu-images bucket（公开读）
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- 启用 RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 允许所有用户读取 menu-images bucket 中的文件（公开访问）
CREATE POLICY "public read menu-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');

-- 允许认证用户上传文件到 menu-images bucket
CREATE POLICY "authenticated upload menu-images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'menu-images'
  AND auth.role() = 'authenticated'
);

-- 仅允许上传者更新/删除自己的文件（如需更严格，可加 owner=auth.uid()）
CREATE POLICY "authenticated update menu-images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'menu-images'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "authenticated delete menu-images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'menu-images'
  AND auth.role() = 'authenticated'
);
```

## Workflow
1. 设计 → 2. Schema/Migration → 3. UI → 4. API → 5. 联调 → 6. 种子/文档 → 7. 验收

## Acceptance Criteria
- [ ] 菜品编辑：弹窗预填充、校验失败提示明确、保存成功后列表刷新
- [ ] 下架=删除、上架=恢复语义明确；下架后主列表隐藏、恢复后重新出现
- [ ] 已下架列表按 `updatedAt` 降序展示，恢复冲突提示清晰
- [ ] 批量导入 CSV 格式含 `image` 字段，支持预览/统计/跳过已存在
- [ ] 单次导入超 100 条被阻止并提示原因
- [ ] 图片上传限制类型与大小，成功返回公开 URL 并可预览/清空
- [ ] 分类侧边栏与列表中的“菜品种类显示”在新增/编辑/下架/恢复/导入后正确更新
- [ ] UI 尺寸与布局保持一致，新增交互使用 shadcn/ui
- [ ] API 错误码与错误信息风格一致，关键错误可追踪（log）
- [ ] RLS SQL 已包含公开读与认证写策略，符合图片公开访问要求

## 任务清单（Tasks）
开始前请阅读：
- `../../guides/nextjs.instructions.md`
- `../../guides/nextjs-tailwind.instructions.md`

### 任务清单要求
- 独立可执行：每个任务可单独提交与回滚。
- 时间约束：控制在 2 小时内完成。
- 顺序与依赖：按技术依赖与业务优先级排序。
- 清晰命名：包含清晰标题与可复制的 AI 提示词。

### 提示词编写建议
- 开头定义角色：如“你是一位资深的[领域]工程师…”。
- 必要时在提示词中提供参考代码/接口定义。
- 明确涉及的项目/目录路径（前端在 `app/`, `components/`, `hooks/`, `lib/`；后端/API 在 `app/api/` 或 `db/`）。
- 复杂任务在提示词中加入关键字：`ultrathink`。
- 需要参考外部文档/库时加入关键字：`use context7`。

### 任务输出格式
将每个任务用以下结构编写，直接复制给 Codex 或 Claude Code 可执行：

```markdown
### Task [N]: [任务标题]
**预计时间**: [X]小时
**依赖**: Task [M] 或 无

**AI 提示词**:
[可直接复制给 Claude Code 的完整提示词]
```

---

### Task 1: 实现菜单编辑与上下架相关 API
**预计时间**: 2 小时
**依赖**: 无

**AI 提示词**:
你是一位资深的 Next.js + Drizzle 后端工程师。请实现菜单编辑与上下架相关 API。use context7 获取最新的 Next.js Route Handlers 最佳实践。

要求：
1. 在 `app/api/menu-items/[id]/route.ts` 增加 `PUT`：编辑菜品
   - Zod 校验：`name`、`nameEn`、`category`、`price`、`description`、`image`
   - 校验 `id` 为 UUID；不存在或 `available=false` 返回 404
   - 同分类同名冲突返回 409
   - 更新 `updatedAt`，返回 `toMenuItemResponse`
2. 新增 `app/api/menu-items/deleted/route.ts`：`GET` 返回 `available=false` 菜品，按 `updatedAt` 降序
3. 新增 `app/api/menu-items/[id]/restore/route.ts`：`POST` 恢复上架（`available=true`）
   - 校验 `id`；不存在或非下架返回 404
   - 恢复冲突返回 409
4. 错误码统一：400/404/409/500；错误信息与现有风格一致

---

### Task 2: 实现批量导入 API（含 image）
**预计时间**: 1.5 小时
**依赖**: 无

**AI 提示词**:
你是一位资深的 Next.js + Drizzle 后端工程师。请在 `app/api/menu-items/batch/route.ts` 中实现批量导入菜品 API。use context7 获取最新的 Next.js Route Handlers 最佳实践。

要求：
1. `POST` 接收 JSON：
   ```ts
   {
     items: Array<{ name: string; nameEn?: string; category: string; price: number; description?: string; image?: string }>
     skipExisting?: boolean
   }
   ```
2. 使用 Zod 校验，每次最多 100 条
3. 同名同分类处理：`skipExisting=true` 时跳过并统计；否则返回错误
4. 事务插入，返回统计：total/created/skipped/errors[]

---

### Task 3: 实现图片上传 API（公开访问）
**预计时间**: 1.5 小时
**依赖**: 无

**AI 提示词**:
你是一位资深的 Next.js + Supabase 后端工程师。请在 `app/api/menu-items/upload/route.ts` 实现图片上传 API。use context7 获取最新的 Next.js Route Handlers 与 Supabase Storage 最佳实践。

要求：
1. `POST` 接收 `multipart/form-data`，用 `formData()` 解析
2. 校验类型：jpeg/png/webp/gif；大小 ≤ 5MB
3. 生成文件名 `menu-{timestamp}-{random}.{ext}` 并上传到 `menu-images` bucket
4. 返回公开访问 URL
5. 错误码：400（参数/文件错误）、500（上传失败）

---

### Task 4: 更新类型定义与 API Client/Query hooks
**预计时间**: 0.5 小时
**依赖**: Task 1-3

**AI 提示词**:
你是一位资深的 TypeScript 工程师。请更新 `types/api.ts`、`lib/api/client.ts`、`lib/queries/use-menu.ts` 以支持新接口。

要求：
1. 新增类型：`UpdateMenuItemInput`、`BatchImportInput`（含 image）、`BatchImportResponse`、`UploadImageResponse`、`DeletedMenuListResponse`
2. `api.menuItems` 新增方法：update/listDeleted/restore/batchImport/uploadImage
3. 新增 mutation hooks：`useUpdateMenuItem`、`useRestoreMenuItem`、`useBatchImportMenuItems`、`useUploadMenuImage`

---

### Task 5: 创建图片上传组件（ImageUpload）
**预计时间**: 1 小时
**依赖**: Task 3, Task 4

**AI 提示词**:
你是一位资深的 Next.js 前端工程师。请在 `components/features/menu/ImageUpload.tsx` 实现图片上传组件。use context7 获取最新的 shadcn/ui 与文件上传最佳实践。

要求：
1. 支持拖拽/点击上传、预览、清空
2. 校验类型与大小（jpeg/png/webp/gif，≤5MB）
3. 调用 `POST /api/menu-items/upload`，成功后回传公开 URL
4. 错误态与 loading 状态清晰，使用 shadcn/ui

---

### Task 6: 菜品编辑弹窗与下架语义调整
**预计时间**: 1.5 小时
**依赖**: Task 1, Task 4, Task 5

**AI 提示词**:
你是一位资深的 Next.js 前端工程师。请在 `components/features/menu/MenuManagement.tsx` 中添加菜品编辑功能，并将“删除”语义调整为“下架”。use context7 获取最新的 shadcn/ui Dialog 最佳实践。

要求：
1. 菜品卡片右上角新增编辑按钮（Pencil）
2. 编辑弹窗预填充，字段与新增一致，图片字段使用 `ImageUpload`
3. 提交调用 `PUT /api/menu-items/[id]`，成功后刷新列表并 toast
4. 下架按钮文案与提示改为“下架”，仍调用现有删除 API（`available=false`）
5. UI 布局尺寸不变，仅增量交互

---

### Task 7: 已下架菜品抽屉与恢复上架
**预计时间**: 1.5 小时
**依赖**: Task 1, Task 4

**AI 提示词**:
你是一位资深的 Next.js 前端工程师。请在 `components/features/menu/MenuManagement.tsx` 中添加“已下架菜品”抽屉。use context7 获取最新的 shadcn/ui Sheet 最佳实践。

要求：
1. 头部新增按钮“已下架菜品”（Archive），点击打开右侧 Sheet
2. 列表展示名称/分类/下架时间（updatedAt）
3. 点击“恢复上架”调用 `POST /api/menu-items/[id]/restore` 并刷新主列表
4. 空状态与加载状态使用 shadcn/ui 样式
5. UI 布局尺寸不变

---

### Task 8: 批量导入 UI（含 image 列）
**预计时间**: 2 小时
**依赖**: Task 2, Task 4

**AI 提示词**:
你是一位资深的 Next.js 前端工程师。请在 `components/features/menu/MenuManagement.tsx` 中完成批量导入 UI。use context7 获取最新的文件上传与 CSV 解析最佳实践。

要求：
1. 批量导入弹窗：CSV 格式 `name,nameEn,category,price,description,image`，支持预览/统计/跳过已存在
2. CSV 解析可使用 `papaparse`（若新增依赖需在 `package.json` 记录）
3. 校验必填与价格格式，超 100 条提示并阻止导入
4. 导入完成显示成功/跳过/失败统计，失败项需说明原因
5. UI 布局尺寸不变，全部使用 shadcn/ui

## Links
- Guides：
  - `../../guides/nextjs.instructions.md`
  - `../../guides/nextjs-tailwind.instructions.md`
- 相关文档：
  - `menu_items_modification-PLAN.md`
- Supabase Storage 文档：https://supabase.com/docs/guides/storage
