# 菜品增删（菜单管理按钮与 API · 任务驱动）

- ID: menu_items_modification
- Owner: <owner>
- Status: proposed

## Summary
在保持现有页面尺寸与布局不变的前提下，在右上角新增“增加菜品/+”“删除菜品/-”按钮（`components/menu-management.tsx`），通过弹窗完成菜品新增/删除，并接入后端 API 更新 `menu_items` 表。删除为软删除：将 `available` 置为 `false`，菜单列表仅展示 `available = true` 的菜品。API 交互、校验与错误码对齐桌台 API（`restaurant-tables` 路由）的风格。

## Scope
- In:
  - 前端：`components/menu-management.tsx` 增加菜品增删按钮与对应 Dialog，不改整体尺寸/布局。
  - API：`app/api/menu-items/route.ts` 补充 `POST`（新增菜品，并保证 `GET` 仅返回 `available = true`，校验/错误码风格参考桌台 `POST`）；`app/api/menu-items/[id]/route.ts` 新增 `DELETE`（软删除：将 `available` 更新为 false，校验/错误码风格参考桌台 `DELETE`）。
  - 数据：使用 `db/schema.ts` 的 `menuItems`（表结构见 `drizzle/0000_workable_gamora.sql`），通过 `lib/db.ts` 访问。
- Out:
  - 不调整现有页面宽高、栅格或主要视觉样式。
  - 不实现菜品编辑、批量导入或复杂分类管理。
  - 不改动桌台管理/订单逻辑与其他 API。

## UX Notes
- 头部右上角新增两个按钮：`+ 增加菜品`（默认样式）、`- 删除菜品`（危险/次要样式），尺寸与现有按钮一致，保持当前行高与间距。
- 新增菜品 Dialog：字段至少含 `name`（必填）、`category`（必填）、`price`（必填，最多两位小数）；可选 `nameEn`、`cost`、`description`、`image`、`available`、`popular`、`spicy`、`allergens`；提交中禁用按钮并展示错误提示。
- 删除菜品 Dialog：下拉选择现有菜品（可按分类/名称展示），无数据时禁用提交；删除失败时显示原因（如存在关联订单）；成功后列表不再显示该菜品（因 `available=false` 被过滤）。交互与接口行为参考桌台删除对话框/接口的反馈节奏。
- 前端交互使用现有 shadcn UI 风格；对话框关闭后重置表单；成功后刷新列表（复用 `useMenuData` 或触发重新获取）。

## API / DB
- API:
  - `POST /api/menu-items`：校验必填字段与数值格式，插入 `menu_items`，返回新纪录（数值字段转为 number）。
  - `DELETE /api/menu-items/[id]`：校验 UUID，将对应记录的 `available` 更新为 `false`（软删除）；若被 `order_items` 引用仍需阻止并返回 409（风格同桌台删除的开放订单阻断）。
- DB:
  - 复用 `db/schema.ts` 中的 `menuItems`，不新增表/列；利用默认 `created_at/updated_at`。
  - 菜单列表查询仅返回 `available = true` 的记录；软删除通过更新 `available` 字段实现，无物理删除，已有订单项仍然保留（类似桌台删除时订单表的外键自动置空/不硬删）。
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
- [ ] 删除菜品弹窗可选择现有菜品，成功将该菜品标记为不可用（`available=false`）；被引用或无效 ID 时给出错误提示并不崩溃（提示风格对齐桌台删除接口）。
- [ ] API 使用 Drizzle 访问 `menuItems`，`GET` 仅返回 `available = true`，返回 JSON，数值字段为 number，含合理的状态码（400/409/500）。
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
你是一位 Next.js + Drizzle 后端工程师。在 `app/api/menu-items/route.ts` 增加 `POST`：使用 `lib/db.ts` 与 `menuItems`，校验 body（name/category/price 必填，price 为正数，spicy 0–5），填充默认值（available=true, popular=false, spicy=0），插入后将 numeric 转为 number 返回。错误码：400（校验失败）、409（同名同分类冲突可选，对齐桌台重复桌号处理）、500（其他）。`GET` 需仅返回 `available = true` 的记录。关键字：use context7（Next.js Route Handlers、Drizzle insert），参考桌台 `POST` 的校验/错误响应风格。

### Task 3: 实现 `DELETE /api/menu-items/[id]`
**预计时间**: 0.5–0.75 小时  
**依赖**: Task 2

**AI 提示词**:  
你是一位 Next.js 后端工程师。在 `app/api/menu-items/[id]/route.ts` 创建 `DELETE`：校验 `id` 为 UUID，使用 Drizzle 将 `available` 更新为 `false`（软删除）；若无匹配或已软删除返回 404；捕获外键约束（被 `order_items` 引用）并返回 409 带错误消息；其他错误 500。响应为 JSON，数值字段转为 number。关键字：use context7（Route Handlers、Drizzle update 与错误处理），参考桌台 `DELETE` 的校验/阻断/返回结构。

### Task 4: 前端接入菜品增删 Dialog
**预计时间**: 1–1.5 小时  
**依赖**: Task 2, Task 3

**AI 提示词**:  
你是一位资深 Next.js 前端工程师。修改 `components/menu-management.tsx`：在头部右上角添加 `+ 增加菜品` 与 `- 删除菜品` 按钮（使用现有 Button/Plus/Minus 图标，保持布局尺寸）；实现新增/删除弹窗，字段与校验来自 Task 1；调用 `POST /api/menu-items` 与 `DELETE /api/menu-items/[id]`，使用 toast 展示成功/失败，提交中禁用按钮，成功后刷新菜单数据（可调用已有 `useMenuData` 或本地刷新逻辑）。避免改变页面宽度/栅格。关键字：use context7（Next.js 客户端 fetch、shadcn 表单模式）。

### Task 5: 联调与回归验证
**预计时间**: 0.5 小时  
**依赖**: Task 4

**AI 提示词**:  
你是一位 QA 工程师。准备 `.env.local`（含 `DATABASE_URL` 等），启动 `pnpm dev`，验证：按钮位置与尺寸未变；新增菜品后可在列表看到；删除菜品后列表隐藏该项且记录 `available=false`（数据库可确认）；校验与错误提示符合预期（含 400/409/500 场景）；接口 JSON 数值字段为 number，`GET` 仅返回 `available=true`；接口行为/错误码节奏与桌台 API 一致。输出测试要点与已知限制。关键字：use context7（Next.js API 测试、表单交互检查）。

## Links
- Guides：
  - `../../guides/nextjs.instructions.md`
  - `../../guides/nextjs-tailwind.instructions.md`
- 相关讨论/Issue/PR：TBD
