# 菜品增删（菜单管理按钮与 API · 任务驱动）

- ID: menu_items_modification
- Owner: <owner>
- Status: proposed

## Summary
在保持现有页面尺寸与布局不变的前提下，在右上角新增“增加菜品/+”“删除菜品/-”按钮（`components/menu-management.tsx`），通过弹窗完成菜品新增/删除，并接入后端 API 更新 `menu_items` 表。

## Scope
- In:
  - 前端：`components/menu-management.tsx` 增加菜品增删按钮与对应 Dialog，不改整体尺寸/布局。
  - API：`app/api/menu-items/route.ts` 补充 `POST`（新增菜品）；`app/api/menu-items/[id]/route.ts` 新增 `DELETE`。
  - 数据：使用 `db/schema.ts` 的 `menuItems`（表结构见 `drizzle/0000_workable_gamora.sql`），通过 `lib/db.ts` 访问。
- Out:
  - 不调整现有页面宽高、栅格或主要视觉样式。
  - 不实现菜品编辑、批量导入或复杂分类管理。
  - 不改动桌台管理/订单逻辑与其他 API。

## UX Notes
- 头部右上角新增两个按钮：`+ 增加菜品`（默认样式）、`- 删除菜品`（危险/次要样式），尺寸与现有按钮一致，保持当前行高与间距。
- 新增菜品 Dialog：字段至少含 `name`（必填）、`category`（必填）、`price`（必填，最多两位小数）；可选 `nameEn`、`cost`、`description`、`image`、`available`、`popular`、`spicy`、`allergens`；提交中禁用按钮并展示错误提示。
- 删除菜品 Dialog：下拉选择现有菜品（可按分类/名称展示），无数据时禁用提交；删除失败时显示原因（如存在关联订单）。
- 前端交互使用现有 shadcn UI 风格；对话框关闭后重置表单；成功后刷新列表（复用 `useMenuData` 或触发重新获取）。

## API / DB
- API:
  - `POST /api/menu-items`：校验必填字段与数值格式，插入 `menu_items`，返回新纪录（数值字段转为 number）。
  - `DELETE /api/menu-items/[id]`：校验 UUID，删除对应记录；若被 `order_items` 引用，返回 409 并提示不可删除。
- DB:
  - 复用 `db/schema.ts` 中的 `menuItems`，不新增表/列；利用默认 `created_at/updated_at`。
  - 如需迁移（当前不预期）：`pnpm drizzle:generate && pnpm drizzle:push`。

## Workflow
1. 设计与交互对齐
2. API（POST/DELETE）实现与验证
3. 前端按钮与 Dialog 接入 API
4. 联调与错误态校验
5. 文档与验收

## Acceptance Criteria
- [ ] 右上角新增“增加菜品/+”与“删除菜品/-”按钮，布局与尺寸保持不变。
- [ ] 新增菜品弹窗校验必填项（name/category/price），提交成功写入数据库并更新列表；错误提示清晰。
- [ ] 删除菜品弹窗可选择现有菜品，成功删除数据库记录；被引用或无效 ID 时给出错误提示并不崩溃。
- [ ] API 使用 Drizzle 访问 `menuItems`，返回 JSON，数值字段为 number，含合理的状态码（400/409/500）。
- [ ] 文档引用项目 guides，交互与 UI 风格与现有页面一致，无页面尺寸或主要布局变更。

## 任务清单（Tasks）
开始前请阅读：
- `../../guides/nextjs.instructions.md`
- `../../guides/nextjs-tailwind.instructions.md`

### Task 1: 明确字段与交互稿
**预计时间**: 0.5 小时  
**依赖**: 无

**AI 提示词**:  
你是一位产品/前端设计工程师。请梳理 `menu_items` 必填/可选字段（参考 `drizzle/0000_workable_gamora.sql`），输出新增/删除菜品弹窗的字段、校验（name/category/price 必填、price 两位小数、UUID 校验）、文案与交互流程，要求不改变页面现有尺寸/布局。关键字：use context7（查阅 Next.js + shadcn Dialog 交互最佳实践）。

### Task 2: 实现 `POST /api/menu-items`
**预计时间**: 0.75–1 小时  
**依赖**: Task 1

**AI 提示词**:  
你是一位 Next.js + Drizzle 后端工程师。在 `app/api/menu-items/route.ts` 增加 `POST`：使用 `lib/db.ts` 与 `menuItems`，校验 body（name/category/price 必填，price 为正数，spicy 0–5），填充默认值（available=true, popular=false, spicy=0），插入后将 numeric 转为 number 返回。错误码：400（校验失败）、409（同名同分类冲突可选）、500（其他）。保持现有 `GET` 行为。关键字：use context7（Next.js Route Handlers、Drizzle insert）。

### Task 3: 实现 `DELETE /api/menu-items/[id]`
**预计时间**: 0.5–0.75 小时  
**依赖**: Task 2

**AI 提示词**:  
你是一位 Next.js 后端工程师。在 `app/api/menu-items/[id]/route.ts` 创建 `DELETE`：校验 `id` 为 UUID，使用 Drizzle 删除 `menuItems` 记录；若无匹配返回 404；捕获外键约束（被 `order_items` 引用）并返回 409 带错误消息；其他错误 500。响应为 JSON，数值字段转为 number。关键字：use context7（Route Handlers、Drizzle delete 与错误处理）。

### Task 4: 前端接入菜品增删 Dialog
**预计时间**: 1–1.5 小时  
**依赖**: Task 2, Task 3

**AI 提示词**:  
你是一位资深 Next.js 前端工程师。修改 `components/menu-management.tsx`：在头部右上角添加 `+ 增加菜品` 与 `- 删除菜品` 按钮（使用现有 Button/Plus/Minus 图标，保持布局尺寸）；实现新增/删除弹窗，字段与校验来自 Task 1；调用 `POST /api/menu-items` 与 `DELETE /api/menu-items/[id]`，使用 toast 展示成功/失败，提交中禁用按钮，成功后刷新菜单数据（可调用已有 `useMenuData` 或本地刷新逻辑）。避免改变页面宽度/栅格。关键字：use context7（Next.js 客户端 fetch、shadcn 表单模式）。

### Task 5: 联调与回归验证
**预计时间**: 0.5 小时  
**依赖**: Task 4

**AI 提示词**:  
你是一位 QA 工程师。准备 `.env.local`（含 `DATABASE_URL` 等），启动 `pnpm dev`，验证：按钮位置与尺寸未变；新增/删除菜品可写入/删除数据库并在 UI 反映；校验与错误提示符合预期（含 400/409/500 场景）；接口 JSON 数值字段为 number。输出测试要点与已知限制。关键字：use context7（Next.js API 测试、表单交互检查）。

## Links
- Guides：
  - `../../guides/nextjs.instructions.md`
  - `../../guides/nextjs-tailwind.instructions.md`
- 相关讨论/Issue/PR：TBD
