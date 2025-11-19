# Features Index

使用方法
- 新建功能文档：复制模板到 features 目录
  - `cp doc/agents/template/features/feature.md doc/agents/features/<slug>.md`
- 在本文件追加链接到新功能说明，或直接在下方的“Run: <Feature>”中列出任务供 Codex 执行。

功能文档索引
- [Display Restaurant Tables](doc/agents/features/display_table-plan.md)
- [Display Menu Items](doc/agents/features/display_menu_items-PLAN.md)
- [点单加减菜与批次显示（order_management）](doc/agents/features/order_management-PLAN.md)
- [结账与交易落库（transaction_backend）](doc/agents/features/transaction_backend-PLAN.md)
- [AA 分单结账（transaction_AA）](doc/agents/features/transaction_AA-PLAN.md)

---

# Run: Display Restaurant Tables

说明
- 目标：读取 Supabase 表 `restaurant_tables`，实现只读 API，并在不改动页面结构的前提下，让 `components/table-management.tsx` 用真实数据渲染 N 条= N 卡片。
- 阅读规范：`doc/guides/nextjs-best-practices.md`、`doc/guides/nextjs-tailwind-best-practices.md`
- 参考功能说明：`doc/agents/features/display_table-plan.md`

注意
- 不修改 `app/tables/page.tsx` 的结构；前端仅改造 `components/table-management.tsx`。
- 每个任务独立、≤2 小时、可直接提交。
- 复杂任务提示词内含 `ultrathink`；需要参考文档时含 `use context7`。

### Task 1: 确认/补充 `restaurant_tables` 的 Drizzle 映射
**预计时间**: 0.5–1小时
**依赖**: 无

**AI 提示词**:
你是一位资深的全栈工程师（Next.js + Drizzle + Supabase）。ultrathink use context7。
开始前请阅读：
- `doc/guides/nextjs-best-practices.md`
- `doc/guides/nextjs-tailwind-best-practices.md`

请在不更改数据库结构的前提下，针对 Supabase 中已存在的 `restaurant_tables` 表，在 `db/schema.ts` 中补充/确认 Drizzle 映射（仅映射，不迁移）。字段以实际数据库为准，建议包含：`id`（主键）、`number`, `capacity?`, `status?`, `area?`。
- 如果确需结构变更，请在 PR 说明并使用：`pnpm drizzle:generate && pnpm drizzle:push`；否则不创建迁移。
- 输出：更新 `db/schema.ts` 并给出简短变更说明。

### Task 2: 实现 API `GET /api/restaurant-tables`
**预计时间**: 1小时
**依赖**: Task 1

**AI 提示词**:
你是一位资深的 Next.js API 工程师。ultrathink use context7。
请阅读 `doc/guides/nextjs-best-practices.md` 后，新增/完善 `app/api/restaurant-tables/route.ts`，实现 `GET` 读取 `restaurant_tables` 并返回 JSON 数组。
- 使用项目现有的 Drizzle 连接（`DATABASE_URL`）。
- 仅返回必要字段（`id`, `number`, `capacity?`, `status?`, `area?`）。
- 处理错误并返回合适状态码；记录错误日志。
- 输出：`app/api/restaurant-tables/route.ts`。

### Task 3: 改造 `components/table-management.tsx` 用 API 数据
**预计时间**: 1–1.5小时
**依赖**: Task 2

**AI 提示词**:
你是一位资深的 Next.js + Tailwind 前端工程师。ultrathink use context7。
请认真阅读 `components/table-management.tsx` 的现有实现，保持导出签名与 UI 交互不变，将组件内的 `mockTables` 替换为从 `/api/restaurant-tables` 拉取的真实数据：
- 使用 `useEffect` + `fetch`（或 SWR）请求 `/api/restaurant-tables`；提供 loading/错误/空态处理。
- 将返回数据映射为本组件 `Table` 类型所需字段（缺失字段做安全回退）。
- 所有筛选、统计与渲染逻辑基于实时数据（N 条= N 卡片）。
- 严禁改动 `app/tables/page.tsx` 的结构。
- 输出：仅修改 `components/table-management.tsx`。

### Task 4: 完善加载/错误与重试体验（组件内）
**预计时间**: 0.5–1小时
**依赖**: Task 3

**AI 提示词**:
你是一位资深前端工程师。use context7。
请在 `components/table-management.tsx` 内完善：
- Loading Skeleton（保持布局稳定）
- 错误提示与“重试”逻辑（重新拉取）
- 空态文案与可访问性（aria/role）
- 输出：更新 `components/table-management.tsx`。

### Task 5: 文档与验收
**预计时间**: 0.5小时
**依赖**: Task 4

**AI 提示词**:
你是一位严谨的文档维护者。请更新 `doc/agents/features/display_table-plan.md` 的验收记录：
- 勾选 AC；在 PR 中附 `/api/restaurant-tables` 响应截图与 `/tables` 页面渲染（5 条=5 卡片）
- 简述运行步骤与注意事项（`.env.local`、SSL 等）

## Links
- 功能说明：`doc/agents/features/display_table-plan.md`
- 规范：
  - `doc/guides/nextjs-best-practices.md`
  - `doc/guides/nextjs-tailwind-best-practices.md`
- 模板：`doc/agents/template/features/feature.md`

---

# Run: Display Menu Items

说明
- 目标：读取 Supabase 表 `menu_items`，实现只读 API，并在不改动页面尺寸/布局的前提下，让 `components/menu-management.tsx` 用真实数据按“分类 → 菜品”展示；分类数量与每类菜品数量与数据库一致。
- 阅读规范：`doc/guides/nextjs.instructions.md`、`doc/guides/nextjs-tailwind.instructions.md`
- 参考功能说明：`doc/agents/features/display_menu_items-PLAN.md`

注意
- 不修改 `app/menu/page.tsx` 的结构与尺寸；前端仅改造 `components/menu-management.tsx` 的数据来源。
- 保留“全部”分类；分类计数来自 items 聚合；仅显示 `available=true`。
- 每个任务独立、≤2 小时、可直接提交；提示词包含 `use context7`（必要时查阅文档）。

### Task 1: 新增 API `GET /api/menu-items`
**预计时间**: 0.5–1 小时  
**依赖**: 无

**AI 提示词**:
你是一位资深 Next.js + Drizzle 工程师。ultrathink use context7。
开始前阅读：`doc/guides/nextjs.instructions.md`。
目标：在 `app/api/menu-items/route.ts` 实现 `GET`，使用 `lib/db.ts` 连接，从 `db/schema.ts` 的 `menuItems` 读取 `available=true` 的记录；将 `price`（numeric）转换为 `number`；返回：
```json
{ "categories": [{"id":"all","name":"全部"}, {"id":"<cat>","name":"<cat>"}, ...], "items": [ ... ] }
```
要求：
- 错误处理返回 500，消息包含 `detail` 字段；不得泄露敏感信息。
- 仅在 API 内做数据适配（不修改 schema）。

输出：`app/api/menu-items/route.ts`。

### Task 2: 改造 `components/menu-management.tsx` 使用 API 数据
**预计时间**: 0.5–1 小时  
**依赖**: Task 1

**AI 提示词**:
你是一位资深的 Next.js 前端工程师。use context7。
目标：将 `components/menu-management.tsx` 中的本地 `menuCategories` 与 `mockMenuItems` 替换为从 `/api/menu-items` 拉取的真实数据，保持：
- 现有布局、尺寸与样式不变；
- 顶部分类含“全部”，分类数量与 DB 匹配且带计数；
- 搜索/筛选逻辑保持一致；
- 接口失败时不崩溃，显示空列表。

输出：仅修改 `components/menu-management.tsx`。

### Task 3: 集成验证（`/menu` 页面）
**预计时间**: 0.5 小时  
**依赖**: Task 2

**AI 提示词**:
你是一位细心的 QA/前端工程师。use context7。
步骤：
- 确认 `.env.local` 配置了 `DATABASE_URL`（Supabase 连接串）。
- 打开 `/menu` 页面，验证分类数量与每类菜品数量正确；搜索/筛选可用；页面尺寸未变化。
- 若 API 失败，前端不崩溃，空列表呈现。

### Task 4: 文档核对
**预计时间**: 0.5 小时  
**依赖**: Task 3

**AI 提示词**:
你是一位严谨的文档维护者。
核对并在 `doc/agents/features/display_menu_items-PLAN.md` 勾选 AC；在 PR 中附 `/api/menu-items` 响应与 `/menu` 页面分类/列表截图；简述运行步骤（`.env.local`、SSL）。

## Links
- 功能说明：`doc/agents/features/display_menu_items-PLAN.md`
- 规范：
  - `doc/guides/nextjs.instructions.md`
  - `doc/guides/nextjs-tailwind.instructions.md`
- 模板：`doc/agents/FEATURES_Template.md`

---

# Run: Order Management

说明
- 目标：为 POS 点单页面提供加菜/减菜能力，并将同一桌台多次加菜按批次分组显示与配色，同时写入 `orders` / `order_items` 表，保持现有 UI 布局和尺寸不变。
- 阅读规范：`doc/guides/nextjs.instructions.md`、`doc/guides/nextjs-tailwind.instructions.md`
- 参考功能说明：`doc/agents/features/order_management-PLAN.md`

注意
- 不改变 `app/pos/page.tsx` 与 `components/pos-interface.tsx` 的整体布局尺寸，仅在“当前订单”区域内补充批次与加减菜逻辑。
- 仅在 POS 点单页面内实现批次展示、加菜与减菜逻辑；账务流水与结算流程仍由其它功能负责。
- 每个任务独立、≤2 小时、可直接提交；提示词内含 `use context7`/`ultrathink` 时可查阅外部文档。

### Task 1: 设计批次模型与 DB 字段
**预计时间**: 1小时  
**依赖**: 无  

**AI 提示词**:  
你是一位资深的后端与数据库工程师，熟悉 Drizzle ORM 与 PostgreSQL。请在 easyFactu 项目中为点单加菜功能设计“批次”模型：在不破坏现有 `orders` / `order_items` 逻辑的前提下，为 `order_items` 增加表示批次的字段（例如 `batch_no`），并在 `db/schema.ts` 中完成定义、生成迁移（`pnpm drizzle:generate`）以及推送（`pnpm drizzle:push`）。请给出字段类型、默认值与索引建议，并考虑后续查询一个桌台的订单时如何按 `order_id` + `batch_no` 排序。完成后更新相关文档注释。必要时可参考 Drizzle 官方文档（use context7）。  

### Task 2: 实现订单创建与批次写入 API
**预计时间**: 2小时  
**依赖**: Task 1  

**AI 提示词**:  
你是一位资深的 Next.js + TypeScript 后端工程师，请在 `app/api/orders/route.ts` 中实现 `POST /api/orders` 路由，用于为指定桌台创建订单或加菜批次。使用 Drizzle ORM 操作 `orders` 与 `order_items` 表，根据请求体中的 `tableId` 与菜品数组创建记录，并为每一条 `order_items` 生成正确的 `batch_no`。注意：需要支持同一桌台多次加菜，新的批次应在已有批次最大值基础上递增。请添加基本参数校验（可以使用 `zod`），保证错误时返回合适的 HTTP 状态码。完成后，返回当前桌台的订单信息及按批次分组的明细列表。必要时 use context7 查询 Drizzle ORM 插入与事务示例。  

### Task 3: 实现按桌台查询订单与批次 API
**预计时间**: 1小时  
**依赖**: Task 2  

**AI 提示词**:  
你是一位熟悉 REST 设计与 Drizzle ORM 的工程师，请在 `app/api/orders/route.ts` 中实现 `GET /api/orders?tableId=<id>` 接口，返回指定桌台当前开放订单（`status = 'open'`）以及全部 `order_items`，并在响应 JSON 中按 `batch_no` 和创建时间排序与分组，方便前端直接渲染为“批次 + 菜品列表”的结构。请确保查询性能（合理使用索引），同时在桌台无订单时返回空列表而不是错误。  

### Task 4: 调整 POSInterface 购物车/订单状态结构
**预计时间**: 2小时  
**依赖**: Task 3  

**AI 提示词**:  
你是一位资深的前端工程师，熟悉 Next.js App Router 与 React hooks。请在 `components/pos-interface.tsx` 中，将当前基于 `cart: CartItem[]` 的购物车结构扩展为“按批次的订单视图”，例如 `batches: Array<{ batchNo: number; items: CartItem[] }>`，并保证：  
1）现有布局与尺寸（左侧菜单区域 + 右侧宽度 `w-96` 的订单卡片）保持不变；  
2）点击菜单卡片“加号”或“加菜”按钮时，会在当前“临时选中批次”中累加数量；  
3）提交时调用 `POST /api/orders`，并根据返回数据更新本地 `batches` 状态。  
请重用现有 UI 组件（Card、Badge、Button 等），不要扩大页面尺寸或增加全屏弹窗。  

### Task 5: 在 UI 中实现批次分组与两种配色
**预计时间**: 1.5小时  
**依赖**: Task 4  

**AI 提示词**:  
你是一位熟悉 Tailwind 与 UX 设计的前端工程师。请在 `components/pos-interface.tsx` 的“当前订单”区域中，将订单展示调整为：按批次分组的列表。第 1 批使用当前默认样式，第 2 批及之后使用另一种但风格统一的颜色（例如背景、边框或批次标签颜色略有区别），同时在每个批次前增加“第 N 批加菜”的小标题或分隔条。注意所有修改必须局限在现有订单卡片区域内部，不得改变整体布局的宽高与主容器的 Tailwind 类。  

### Task 6: 实现减菜与清空菜品逻辑（前后端联动）
**预计时间**: 1.5小时  
**依赖**: Task 4  

**AI 提示词**:  
你是一位全栈工程师，请在 `components/pos-interface.tsx` 中完善“-”与“垃圾桶”按钮的行为：  
1）“-” 按钮：将当前批次中对应菜品的数量减 1，减至 0 时移除该行；  
2）“垃圾桶”按钮：直接从当前批次中移除该菜品；  
3）在需要持久化到数据库的场景中，调用适当的 API（例如 `PATCH /api/orders/[id]` 或重新提交批次）同步更新 `order_items`。  
请保持 UI 尺寸不变，并为失败的网络请求提供轻量级错误提示（如 Toast 或顶部提示条），避免弹出全屏错误。  

### Task 7: 联调与文档更新
**预计时间**: 1小时  
**依赖**: Task 5, Task 6  

**AI 提示词**:  
你是一位负责交付质量的全栈工程师。请在完成前述实现后，联调前后端：  
1）验证在不同桌台、多次加菜、减菜、清空菜品的情况下，`orders` 与 `order_items` 中数据正确，批次号连续且排序正确；  
2）确保 POS 页面布局与尺寸与原先一致；  
3）根据 `doc/guides/nextjs.instructions.md` 与 `doc/guides/nextjs-tailwind.instructions.md` 的规范检查代码；  
4）在 `doc/agents/features/FEATURES.md` 或相关文档中增加本功能的链接说明，并在 PR 描述中附上关键截图。必要时使用 use context7 查阅 Next.js 与 Drizzle 最新实践。  

## Links
- 功能说明：`doc/agents/features/order_management-PLAN.md`  
- 规范：  
  - `doc/guides/nextjs.instructions.md`  
  - `doc/guides/nextjs-tailwind.instructions.md`  
- 相关代码：  
  - `components/pos-interface.tsx`  
  - `app/pos/page.tsx`  
  - `app/api/orders/route.ts`  
  - `db/schema.ts`  
