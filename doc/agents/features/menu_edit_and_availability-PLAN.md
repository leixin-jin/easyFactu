# 菜单编辑与上下架功能（精简版）

- ID: menu_edit_and_availability
- Owner: Codex
- Status: completed

## Summary
在现有菜单管理页面基础上，实现菜品编辑与上下架功能。"删除"语义调整为"下架"（软删除，`available=false`），主列表默认只展示 `available=true`，支持已下架菜品的查看与恢复上架。

## Scope
- In:
  - 前端：`components/features/menu/MenuManagement.tsx` 增加编辑、下架/上架入口
  - API：
    - `PUT /api/menu-items/[id]` 编辑菜品
    - `POST /api/menu-items/[id]/restore` 恢复菜品（上架）
    - `GET /api/menu-items/deleted` 获取已下架（软删除）菜品
    - 现有 `DELETE /api/menu-items/[id]` 语义保持“下架=软删除”（设置 `available=false`）
  - 数据：复用 `db/schema.ts` 的 `menuItems`；`available=false` 代表下架
  - UI 一致性：保留页面大小与布局，新增交互通过 Dialog/Sheet
- Out:
  - 批量导入功能
  - 图片上传功能
  - 分类管理能力

## UX Notes
### 菜品编辑
- 每个菜品卡片右上角增加"编辑"图标按钮（Pencil）
- 编辑弹窗字段与新增一致：英文名、中文名、分类、价格、描述、图片URL
- 预填充当前菜品数据，提交成功后刷新列表并 toast

### 下架/上架
- "删除菜品"语义调整为"下架菜品"，保持同一按钮位置与样式
- 已下架菜品在侧边抽屉（Sheet）中展示，支持一键"恢复上架"
  - 下架时间显示 `updatedAt`

## API / DB
- DB: 复用 `menu_items`，不新增表/列；`available=false` 为软删除；编辑/下架/恢复均更新 `updatedAt`
- API: 菜品主列表默认只返回 `available=true`；`DELETE` 仅软删除不物理删除

## Acceptance Criteria
- [x] 菜品编辑：弹窗预填充、校验失败提示明确、保存成功后列表刷新
- [x] 下架=删除、上架=恢复语义明确；下架后主列表隐藏、恢复后重新出现
- [x] 已下架列表按 `updatedAt` 降序展示，恢复冲突提示清晰
- [x] 分类侧边栏与列表中的"菜品种类显示"在编辑/下架/恢复后正确更新
- [x] UI 尺寸与布局保持一致，新增交互使用 shadcn/ui
- [x] API 错误码与错误信息风格一致
- [x] 路由与 hooks 有基础测试覆盖（编辑/下架/恢复/已下架列表）

## 任务清单（Tasks）

开始前请阅读：
- `../../guides/nextjs.instructions.md`
- `../../guides/nextjs-tailwind.instructions.md`

---

### Task 1: 实现菜单编辑与上下架相关 API
**预计时间**: 1.5 小时
**依赖**: 无

**AI 提示词**:
你是一位资深的 Next.js + Drizzle 后端工程师。请实现菜单编辑与上下架相关 API。use context7 获取最新的 Next.js Route Handlers 最佳实践。

要求：
1. 在 `app/api/menu-items/[id]/route.ts` 增加 `PUT`：编辑菜品
   - Zod 校验：`name`、`nameEn`、`category`、`price`、`description`、`image`
   - 校验 `id` 为 UUID；不存在或 `available=false` 返回 404
   - 同分类同名冲突返回 409（排除当前 `id`）
   - 更新 `updatedAt`，返回 `toMenuItemResponse`
2. 新增 `app/api/menu-items/deleted/route.ts`：`GET` 返回 `available=false` 菜品，按 `updatedAt` 降序
3. 新增 `app/api/menu-items/[id]/restore/route.ts`：`POST` 恢复上架（`available=true`）
   - 校验 `id`；不存在或非下架返回 404
   - 恢复冲突返回 409
4. 确认并修正 `DELETE /api/menu-items/[id]` 为软删除：仅设置 `available=false`（如已有则保持）
5. 错误码统一：400/404/409/500；错误信息与现有风格一致

---

### Task 2: 更新类型定义与 API Client/Query hooks
**预计时间**: 0.5 小时
**依赖**: Task 1

**AI 提示词**:
你是一位资深的 TypeScript 工程师。请更新 `types/api.ts`、`lib/api/client.ts`、`lib/queries/use-menu.ts` 以支持菜单编辑与上下架接口。

要求：
1. 新增类型：`UpdateMenuItemInput`、`DeletedMenuListResponse`
2. `api.menuItems` 新增方法：`update`、`listDeleted`、`restore`
3. 新增 mutation hooks：`useUpdateMenuItem`、`useRestoreMenuItem`
4. 新增 query hook：`useDeletedMenuItems`
5. 在更新/下架/恢复后统一失效菜单列表与已下架列表的缓存

---

### Task 3: 菜品编辑弹窗与下架语义调整
**预计时间**: 1.5 小时
**依赖**: Task 1, Task 2

**AI 提示词**:
你是一位资深的 Next.js 前端工程师。请在 `components/features/menu/MenuManagement.tsx` 中添加菜品编辑功能，并将"删除"语义调整为"下架"。use context7 获取最新的 shadcn/ui Dialog 最佳实践。

要求：
1. 菜品卡片右上角新增编辑按钮（Pencil 图标）
2. 编辑弹窗预填充当前菜品数据，字段与新增一致（name、nameEn、category、price、description、image URL）
3. 提交调用 `PUT /api/menu-items/[id]`，成功后刷新列表并显示 toast
4. 将"删除"按钮文案与确认提示改为"下架"，仍调用现有删除 API（软删除：设置 `available=false`）
5. UI 布局尺寸不变，仅增量交互

---

### Task 4: 已下架菜品抽屉与恢复上架
**预计时间**: 1.5 小时
**依赖**: Task 1, Task 2

**AI 提示词**:
你是一位资深的 Next.js 前端工程师。请在 `components/features/menu/MenuManagement.tsx` 中添加"已下架菜品"抽屉。use context7 获取最新的 shadcn/ui Sheet 最佳实践。

要求：
1. 头部按钮区新增"已下架菜品"按钮（Archive 图标），点击打开右侧 Sheet
2. 列表展示菜品名称、分类、下架时间（updatedAt）
3. 每个菜品项提供"恢复上架"按钮，调用 `POST /api/menu-items/[id]/restore` 并刷新主列表
4. 空状态与加载状态使用 shadcn/ui 样式
5. UI 布局尺寸不变

---

### Task 5: 添加基础测试覆盖
**预计时间**: 0.5 小时
**依赖**: Task 1, Task 2

**AI 提示词**:
你是一位资深的测试工程师。请为菜单编辑与上下架接口补充基础测试。使用 Vitest + MSW，覆盖 `PUT /api/menu-items/[id]`、`GET /api/menu-items/deleted`、`POST /api/menu-items/[id]/restore` 的成功与核心错误分支，并验证 hooks 在 mutate 后触发缓存失效。

---

## Links
- Guides：
  - `../../guides/nextjs.instructions.md`
  - `../../guides/nextjs-tailwind.instructions.md`
- 相关文档：
  - `menu_items_setting_PLAN.md`（完整版，含批量导入与图片上传）
