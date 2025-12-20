# 反结算（整单按结算明细回退）（功能模板 · 任务驱动）

- ID: undo-checkout
- Owner: zhuyuxia
- Status: proposed

## Summary
基于结算明细行实现“整单反结算”：只回退该结算单涉及的菜品数量，按要求物理删除交易并重开订单；UI 保持现有尺寸，仅展示菜品种类与数量。

## Scope
- In: 结账时记录交易明细行；反结算只支持“整单”；删除交易后订单/桌台状态与金额回退；结算记录页展示该结算单菜品种类与数量。
- Out: 部分反结算、任意金额退款、UI 布局/尺寸调整、历史交易无明细的反结算。

## UX Notes
- 保持现有反结算 Dialog 尺寸不变，仅在内容区展示菜品种类与数量。
- 使用 shadcn/ui 组件（如 `Table`, `ScrollArea`, `Dialog`）展示列表，超出内容滚动。
- 仅提供“整单反结算”按钮，移除/禁用菜品选择。
- 空态：若交易缺少明细，提示“该结算单无法反结算（缺少明细）”，并拒绝执行反结算。

## API / DB
- API:
  - `GET /api/transactions/:id`：返回结算单详情（菜品种类 + 数量 + 支付方式）。
  - `POST /api/transactions/:id/reverse`：整单反结算（仅回退该结算单明细数量；无明细则拒绝）。
  - `POST /api/orders/checkout`：写入交易明细行（增量数量）。
- DB:
  - 新表 `transaction_items`（记录每次结账的菜品增量数量）
    - 关键字段：`transaction_id`, `order_item_id`, `quantity`, `created_at`
    - 必含留痕字段：`menu_item_id`, `name_snapshot`, `unit_price`
  - 删除交易时级联删除明细行（FK + ON DELETE CASCADE）。
  - 反结算后订单折扣固定重置为 `0`。
  - 迁移与推送：`pnpm drizzle:generate && pnpm drizzle:push`
  - RLS（Supabase 必需）：
    - `ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;`
    - 如需策略，另行补充（本计划阶段先启用）。

## Workflow
1. 设计 → 2. Schema/Migration → 3. API → 4. UI → 5. 联调 → 6. 测试 → 7. 验收

## Acceptance Criteria
- [ ] 反结算仅支持整单，按交易明细回退 `order_items.paid_quantity`，无明细则拒绝。
- [ ] 反结算完成后交易记录被物理删除，报表/日结收入同步减少。
- [ ] 订单被重开时：`discount=0`、`paid_amount` 按剩余交易汇总，`total=paid_amount`。
- [ ] 结算记录页仅展示菜品种类与数量，UI 尺寸不变（shadcn/ui）。
- [ ] 当桌台存在 open 订单且与交易订单不一致时返回 409。
- [ ] 可观测性：关键反结算失败路径记录日志。

## 任务清单（Tasks）

### Task 1: 交易明细表与迁移
**预计时间**: 1.5小时
**依赖**: 无

**AI 提示词**:
你是一位资深的数据库工程师。请在 `db/schema.ts` 新增 `transaction_items` 表，包含 `transaction_id`, `order_item_id`, `quantity`, `created_at`, `menu_item_id`, `name_snapshot`, `unit_price`（必需留痕字段）。生成迁移并包含 Supabase RLS 启用语句：`ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;`。运行 `pnpm drizzle:generate && pnpm drizzle:push`。注意保持现有命名风格与外键级联删除。

### Task 2: 结账写入交易明细行
**预计时间**: 1.5小时
**依赖**: Task 1

**AI 提示词**:
你是一位资深的后端工程师。更新 `app/api/orders/checkout/route.ts`，在 Full/AA 结账成功后写入 `transaction_items`（只写增量数量：Full 为 `quantity - paid_quantity`，AA 为分配数量）。遵循 Next.js API 最佳实践（use context7）。保持现有业务逻辑不变，失败时返回正确的状态码。

### Task 3: 反结算接口（整单）
**预计时间**: 2小时
**依赖**: Task 1

**AI 提示词**:
你是一位资深的后端工程师。新增 `GET /api/transactions/:id` 和 `POST /api/transactions/:id/reverse`。GET 返回该交易的菜品种类与数量（用 `transaction_items` 联表 `order_items/menu_items`）。POST 仅整单反结算：按明细回退 `order_items.paid_quantity`，删除该交易及其明细，重算订单金额，`discount=0`，更新桌台状态。若桌台已有 open 订单且订单 ID 不一致，返回 409。不要改变 UI 相关逻辑。

### Task 4: 前端展示与交互（保持尺寸）
**预计时间**: 1.5小时
**依赖**: Task 3

**AI 提示词**:
你是一位资深的前端工程师。使用 shadcn/ui 更新 `components/features/checkout-history/CheckoutHistory.tsx`：反结算弹窗保持原尺寸，只展示菜品种类与数量（可滚动），按钮仅“整单反结算”。对接新接口，并在错误时给出提示。不要修改页面布局或尺寸。

### Task 5: 客户端类型与查询
**预计时间**: 1小时
**依赖**: Task 3

**AI 提示词**:
你是一位资深的 TypeScript 工程师。补充 `types/api.ts` 与 `lib/api/client.ts`，新增 `transactions.getDetail` / `transactions.reverse`，并在 `lib/queries` 中新增对应 query/mutation。注意类型命名与现有风格一致。

### Task 6: 关键测试与说明
**预计时间**: 1.5小时
**依赖**: Task 2-5

**AI 提示词**:
你是一位资深测试工程师。为反结算流程新增 API 测试（`__tests__/`），覆盖：AA 明细回退、交易删除、订单重开、open 订单冲突。更新相关文档说明反结算的限制与报表影响。

## Links
- `../../guides/nextjs.instructions.md`
- `../../guides/nextjs-tailwind.instructions.md`
- Next.js Best Practices（Context7: `/vercel/next.js` · production checklist/auth best practices）
