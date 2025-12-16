# 结算记录（checkout_history · 任务驱动）

- ID: checkout_history
- Owner: <owner>
- Status: proposed

## Summary
新增“结算记录”功能页面（英文名/Feature ID：`checkout_history`），在侧边栏导航“菜单”和“日结”之间展示。页面以表格形式展示最近 50 条结算记录（来自数据库表 `transactions`），默认按时间倒序（最新 → 最早），支持鼠标滚轮上下滚动浏览。每行包含“结算ID、桌号、金额、反结算、补打发票”。

## Scope
- In:
  - 导航：`components/dashboard-layout.tsx` 侧边栏新增入口“结算记录”，位置在“菜单”与“日结”之间
  - 页面路由：新增 `app/checkout-history/page.tsx`（建议 URL：`/checkout-history`）
  - 功能组件：新增 `components/features/checkout-history/CheckoutHistory.tsx` 与 `components/features/checkout-history/index.ts`
  - 数据接口：新增 `GET /api/checkout-history`（`app/api/checkout-history/route.ts`），返回最近 50 条“POS 结账”交易，并带出桌号
  - 前端数据层：新增 `lib/api` 客户端方法与 `lib/queries` TanStack Query hook（用于缓存与错误处理）
  - 交互弹窗：点击“反结算”弹出居中 Dialog（仅展示 UI，不实现反结算与补打逻辑）
- Out:
  - 不实现真实“反结算/补打发票”业务流程（仅显示按钮与弹窗，后续迭代再补）
  - 不更改 `transactions`/`orders`/`restaurant_tables` 表结构（本期通过关联查询拿到桌号）
  - 不做分页/搜索/筛选（仅最近 50 条；后续如需再扩展）
  - 不调整 Dashboard 框架尺寸与全局布局（仅新增页面内容，保持 UI 风格一致）

## UX Notes
- 页面结构：
  - 复用现有页面风格（参考 `components/features/tables/TableManagement.tsx` 的列表表格）：`Card` + `table`，表头浅底色、行 hover、边框与字体一致。
  - 标题区：`h1` = “结算记录”，副标题描述“最近 50 条结算记录（最新在前）”。
- 表格展示：
  - 列：结算ID（`transaction.id`）、桌号（`restaurant_tables.number`）、金额（`transactions.amount`）、操作（反结算/补打发票）。
  - 排序：按 `transactions.created_at` 倒序；接口与前端均不再二次排序（避免不一致）。
  - 滚动：表格容器支持鼠标滚轮上下滚动（建议 `max-h` + `overflow-y-auto` 或 `ScrollArea`），不改变页面整体尺寸。
  - 空状态：无记录时展示“暂无结算记录”；加载中显示 Skeleton；接口失败显示轻量错误提示（不崩溃）。
- “反结算”弹窗（仅 UI）：
  - 触发：点击行内“反结算”按钮打开。
  - 尺寸：窗口页面除以二的正方形，居中显示（建议 `DialogContent` 使用 `w-[50vmin] h-[50vmin] max-w-none`，确保正方形且随视口变化）。
  - 文案：弹窗提示“请选择需要反结算的菜品”。
  - 按钮：两个按钮“整单反结算”“反结算”仅展示（可置灰/disabled，并用 Toast 或文案提示“敬请期待”）。
- “补打发票”：
  - 行内按钮仅展示（可置灰/disabled）；不触发任何业务逻辑。

## API / DB
- API:
  - `GET /api/checkout-history?limit=50`
    - 返回：`CheckoutHistoryItem[]`
    - 建议结构：
      ```ts
      type CheckoutHistoryItem = {
        transactionId: string
        tableNumber: string | null
        amount: number
        createdAt: string // ISO
        orderId: string | null
      }
      ```
    - 约束：
      - 仅取“结账相关”交易：建议 `transactions.type = 'income'` 且 `transactions.category LIKE 'POS checkout%'`（兼容 AA：`POS checkout - AA`）；
      - `order_id` 允许为空，但用于“桌号”展示时应尽量通过 `order_id → orders.table_id → restaurant_tables.number` 联表取值；取不到则 `tableNumber=null`。
    - Next.js Route Handlers 最佳实践要点（use context7）：
      - Route Handler 放在 `app/api/**/route.ts`；使用标准 Web `Request/Response` API；
      - 错误处理返回明确 `status` 与 `detail` 字段。
- DB:
  - 本期不改动 schema 与迁移；仅读取 `transactions` 并联表 `orders`、`restaurant_tables`。
  - 性能：`transactions.created_at` 已有索引（`transactions_created_at_idx`），`ORDER BY created_at DESC LIMIT 50` 可直接命中。
  - 如未来需要直接通过 Supabase API（`anon` key）读取该表（非本期必做），需启用 RLS 并配置最小权限策略（示例 SQL）：
    ```sql
    alter table public.transactions enable row level security;

    create policy "transactions_read_authenticated"
    on public.transactions
    for select
    to authenticated
    using (true);
    ```
    > 注意：当前项目多数读写通过 `app/api/*` 使用数据库连接执行，RLS 仅影响 Supabase PostgREST/Realtime 访问路径。

## Workflow
1. 设计（UI/字段） → 2. API（查询与联表） → 3. 类型与 Query Hook → 4. UI 组件 → 5. 导航接入 → 6. 测试 → 7. 验收

## Acceptance Criteria
- [ ] 侧边栏新增“结算记录”，位置在“菜单”和“日结”之间，路由可访问。
- [ ] 页面以表格展示最近 50 条结账交易，默认按 `createdAt` 倒序（最新在前）。
- [ ] 每行展示：结算ID、桌号、金额；金额按欧元格式显示（示例：`€12.30`）。
- [ ] 表格区域可用鼠标滚轮上下滚动浏览；表格视觉样式与“桌台管理”的列表表格一致。
- [ ] 点击“反结算”打开居中正方形弹窗（`50vmin × 50vmin`），提示文案正确，两个按钮仅展示（无业务动作）。
- [ ] “补打发票”按钮仅展示（无业务动作）。
- [ ] API 异常时页面不崩溃，显示错误提示/空态；无数据时显示空态。

## 任务清单（Tasks）
开始前请阅读：
- `../../guides/nextjs.instructions.md`
- `../../guides/nextjs-tailwind.instructions.md`

### Task 1: 新增结算记录 API（`GET /api/checkout-history`）
**预计时间**: 1–2 小时
**依赖**: 无

**AI 提示词**:
你是一位资深 Next.js（App Router）+ Drizzle 工程师。请新增 `app/api/checkout-history/route.ts` 并实现 `GET`：
1) 使用 `lib/db.ts` 的 `getDb()`；
2) 从 `db/schema.ts` 的 `transactions` 读取最近 `limit` 条（默认 50），按 `transactions.createdAt` 倒序；
3) 仅返回结账相关记录：`type='income'` 且 `category` 以 `POS checkout` 开头（兼容 `POS checkout - AA`）；
4) 通过 `transactions.orderId -> orders.tableId -> restaurantTables.number` 联表取 `tableNumber`；
5) 将 `amount`（numeric）转换为 `number`，返回：
```json
{ "items": [ { "transactionId": "...", "tableNumber": "A1", "amount": 12.3, "createdAt": "ISO", "orderId": "..." } ] }
```
6) 错误处理：返回 `{ error: "...", detail: "..." }` 与正确的 HTTP status。

关键字：use context7（查阅 Next.js Route Handlers 约定与最佳实践）。

### Task 2: 增加前端类型、API 客户端与 Query Hook
**预计时间**: 1–2 小时
**依赖**: Task 1

**AI 提示词**:
你是一位资深 TypeScript + TanStack Query 工程师，请完成：
1) 在 `types/api.ts` 增加 `CheckoutHistoryItem` 与 `CheckoutHistoryResponse` 类型；
2) 在 `lib/api/client.ts` 增加 `api.checkoutHistory.list({ limit?: number })`，请求 `GET /api/checkout-history?limit=50`；
3) 新增 `lib/queries/use-checkout-history.ts`，实现 `useCheckoutHistoryQuery({ limit: 50 })`，并导出 queryKey 工厂（数组 key，包含 limit）；
4) 按现有项目约定设置 `staleTime`（建议 30s–60s），并在 `lib/queries/index.ts` 导出。

关键字：use context7（Query Keys 需要是数组、并包含 queryFn 依赖变量）。

### Task 3: 实现“结算记录”页面表格 UI（复用桌台管理表格风格）
**预计时间**: 1–2 小时
**依赖**: Task 2

**AI 提示词**:
你是一位资深前端工程师。请新增 `components/features/checkout-history/CheckoutHistory.tsx`（shadcn/ui + Tailwind）：
1) 使用 `useCheckoutHistoryQuery({ limit: 50 })` 获取数据；
2) 使用与 `components/features/tables/TableManagement.tsx` 列表视图一致的 `Card + table` 样式（表头、行 hover、边框与字体），展示列：结算ID、桌号、金额、操作；
3) 表格容器支持鼠标滚轮上下滚动（`max-h` + `overflow-y-auto` 或 `ScrollArea`），不改动 Dashboard 全局布局尺寸；
4) 金额用 `lib/money.ts` 的 `formatMoney` 格式化并加 `€`；
5) 加入 loading skeleton、空态与错误提示（不崩溃）。

### Task 4: “反结算”弹窗 UI（仅展示）
**预计时间**: 0.5–1 小时
**依赖**: Task 3

**AI 提示词**:
你是一位熟悉 shadcn/ui 的前端工程师。请在 `components/features/checkout-history/` 下实现“反结算”弹窗：
1) 行内“反结算”按钮点击后打开 `Dialog`；
2) `DialogContent` 为居中正方形，尺寸为窗口一半：`w-[50vmin] h-[50vmin] max-w-none`；
3) 弹窗内展示文案“请选择需要反结算的菜品”；
4) 展示两个按钮“整单反结算”“反结算”，当前仅展示（可 disabled / 无动作）。

关键字：use context7（shadcn/ui Dialog 最佳实践）。

### Task 5: 新增路由页面并接入侧边栏导航
**预计时间**: 0.5–1 小时
**依赖**: Task 3, Task 4

**AI 提示词**:
你是一位熟悉 Next.js App Router 的工程师。请完成：
1) 新增 `app/checkout-history/page.tsx`，使用 `DashboardLayout` 包裹并渲染 `CheckoutHistory`；
2) 在 `components/dashboard-layout.tsx` 的 `navigation` 数组中新增导航项：
   - name: "结算记录"
   - href: "/checkout-history"
   - icon: 选择一个合适的 lucide 图标
   - 位置：插入在“菜单”和“日结”之间
3) 确保不影响现有 UI 尺寸与布局（仅增加入口与页面）。

### Task 6: 增加基础测试（渲染 + 弹窗打开）
**预计时间**: 1–2 小时
**依赖**: Task 3, Task 4

**AI 提示词**:
你是一位细心的测试工程师（Vitest + React Testing Library + MSW）。请新增 `components/features/checkout-history/__tests__/CheckoutHistory.test.tsx`：
1) 参考 `components/features/daily-closure/__tests__/DailyClosureManagement.test.tsx` 的 QueryClientProvider 包装方式；
2) mock `GET /api/checkout-history` 返回 2 条记录；
3) 断言表格渲染出结算ID/桌号/金额；
4) 点击“反结算”按钮后，弹窗出现且包含文案“请选择需要反结算的菜品”。

## Links
- Guides：
  - `../../guides/nextjs.instructions.md`
  - `../../guides/nextjs-tailwind.instructions.md`
- 相关讨论/Issue/PR：TBD

