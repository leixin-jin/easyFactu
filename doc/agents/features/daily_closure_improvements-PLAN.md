# 日结逻辑改造（按用户点击顺序生成日结记录）

- ID: daily_closure_improvements
- Owner: TBD
- Status: proposed

## Summary
将当前“按自然日锁账”的日结，改为“按用户点击顺序生成结算报告”。每次点击「日结确认」都会在数据库写入一条新的“日结记录”（含汇总/支付方式/菜品明细快照），随后立即开启下一段统计区间；不再锁住当日结账入口，从而解决跨午夜营业（例如开到凌晨 3 点）导致的营业额归集偏差问题。

## Scope
- In:
  - 日结记录改为“多次生成、顺序编号”
    - 同一天可以生成多份日结报告，数据库中保留多条记录（按 `sequenceNo` 或 `createdAt` 排序）。
    - 日结统计口径从“按 YYYY-MM-DD”改为“按区间 [periodStartAt, periodEndAt)”。
  - 后端统计口径改造
    - 收入/支付方式：基于 `transactions.createdAt` 的时间区间聚合（不再依赖 `transactions.date`）。
    - 订单/菜品明细：基于 `orders.closedAt` 的时间区间聚合（不再依赖 `DATE(orders.closedAt)`）。
  - 前端交互保持一致（不改页面整体尺寸）
    - 保持现有 Tabs/Card/ScrollArea 的布局与尺寸。
    - 允许用户在同一页面连续生成下一份日结报告（不出现“锁住无法继续日结”的状态）。
    - 确保“菜品种类/分类（menu_items.category）”在「菜品明细」Tab 中可展示与筛选（本次 UI 重点）。
- Out:
  - 多门店/多员工权限隔离（本次默认单租户；如未来引入需为日结记录增加 `storeId/userId` 维度）。
  - 可配置的“日界线/时区”（本次通过区间统计解决跨午夜问题；不提供 UI 配置项）。
  - “历史日结记录列表/查询页”的完整产品形态（可先提供后端列表 API，UI 后续迭代）。
  - 退款/作废的完整业务流与统计闭环（本次保持现状或固定为 0，并在接口 meta 中说明口径）。

## UX Notes
- 目标：用户点击「日结确认」即可生成一份报告并开始下一段统计；页面仍保持可用，不进入只读锁定。
- 布局约束（必须遵守）：
  - 不修改 `DashboardLayout`、Tab 数量、主内容区域宽高与整体栅格尺寸；
  - 仅允许在既有 Card/文案位置更新文案与数据绑定；
  - 「菜品明细」保持现有筛选控件（`Select`）与列表高度（`ScrollArea`），只确保分类数据正确展示。
- 交互建议（不引入新区域的前提下）：
  - 「锁账与导出」Tab 文案可调整为“报告与导出”的语义，但尺寸不变；
  - 点击「日结确认」成功后：用 toast/Badge 提示“已生成第 N 份日结（可导出）”，并在同一操作区继续保留「日结确认」按钮以便下一次生成。

## API / DB
- DB（建议改造为“区间 + 顺序”）
  - `daily_closures`（或新表 `closure_reports`，二选一，推荐新表以避免语义混淆）
    - 关键字段：
      - `id`（uuid pk）
      - `sequence_no`（int，唯一，按用户点击顺序递增）
      - `period_start_at`（timestamp / timestamptz，当前统计区间起点）
      - `period_end_at`（timestamp / timestamptz，当前统计区间终点=生成时刻）
      - 汇总快照：`gross_revenue`、`net_revenue`、`orders_count`、`refund_amount`、`void_amount`、`tax_rate` 等
      - `created_at`（生成时间）
    - 重要变更：
      - 移除 `business_date` 的唯一约束（同一天允许多条记录）。
  - `daily_closure_state`（新增，保证区间不重叠/不遗漏，解决并发生成问题）
    - `id`（单行/固定主键）
    - `current_period_start_at`（timestamp，下一次日结的起点）
    - `next_sequence_no`（int）
    - `updated_at`
    - 生成日结时以事务 + 行锁更新该表，保证两次日结不会生成相同区间。
  - 现有 line tables 继续复用（或改名）：
    - `daily_closure_payment_lines`：冻结支付方式拆分（关联 `closure_id/report_id`）
    - `daily_closure_item_lines`：冻结菜品明细（含 `category_snapshot`，用于“菜品种类显示”）
    - `daily_closure_adjustments`：差额补录（关联某一份报告；不影响下一段统计）
  - 索引（按区间查询优化）：
    - `transactions.created_at` index（区间聚合）
    - `orders.closed_at` index（区间聚合）
- API（App Router Route Handlers；按 Next.js 约定放在 `app/api/**/route.ts`）
  - `GET /api/daily-closure`（当前区间预览）
    - 返回：`periodStartAt`、`periodEndAt=now`、overview/payments/items/categories，以及最近一次生成的报告信息（`lastReportId/sequenceNo` 可选）。
  - `POST /api/daily-closures/confirm`（生成一份日结记录；语义从“锁账”改为“生成报告并推进区间”）
    - 行为：以 `daily_closure_state.current_period_start_at` 为起点，`now` 为终点生成快照；写入 report + line tables；更新 state 起点与序号；返回新生成的报告 payload。
  - `POST /api/daily-closures/[id]/adjustments`（保持：补录差额；仅作用于该报告）
  - `GET /api/daily-closures/[id]/export?format=pdf|xlsx`（保持：导出；不再依赖 locked 标志）
  - （可选）`GET /api/daily-closures?cursor=...`：分页列出历史报告（UI 后续迭代使用）

## Workflow
1. 需求与口径确认 → 2. Schema/Migration → 3. 统计函数改造 → 4. API 改造 → 5. UI 最小改造 → 6. 联调与回归 → 7. 测试与文档 → 8. 验收

## Acceptance Criteria
- [ ] 点击一次「日结确认」必定新增 1 条“日结记录”（不覆盖旧记录），并保存支付/菜品快照与汇总数据。
- [ ] 同一天连续点击两次，会产生 2 条记录，且两条记录的 `sequenceNo` 递增、统计区间不重叠且首尾衔接。
- [ ] 日结不再“锁住系统”：生成报告后仍可继续结账，且后续交易会进入下一段统计区间。
- [ ] 跨午夜场景（营业到凌晨）统计正确：以用户点击顺序划分区间，不再按自然日切分。
- [ ] UI 页面整体尺寸与布局保持一致；「菜品明细」能正确显示“菜品种类/分类”并可筛选。
- [ ] 可观测性：关键 API 返回明确 `code`；并发生成/幂等重试有可解释错误或通过幂等键消除重复。

## 任务清单（Tasks）

### Task 1: 口径确认与技术方案定稿（区间、顺序、并发）
**预计时间**: 1小时
**依赖**: 无

**AI 提示词**:
你是一位资深后端/产品联调工程师，请基于现有代码（`app/api/daily-closure/*`, `app/api/daily-closures/*`, `app/api/orders/checkout/route.ts`）把“日结按点击顺序生成报告”的口径写成可落地的技术方案。  
要求：  
1）明确每份报告的统计区间定义：`[periodStartAt, periodEndAt)`，`periodEndAt=生成时刻`；下一份报告的 `periodStartAt=上一份的 periodEndAt`；  
2）明确并发策略：如何保证两次生成不会产生相同区间（建议新增 `daily_closure_state` 并在事务内行锁更新）；  
3）明确数据来源：支付聚合用 `transactions.createdAt`，菜品/订单用 `orders.closedAt`；不要再用 `businessDate`；  
4）列出必须保留的 UI 约束：不改页面尺寸；只确保“菜品种类/分类”显示与筛选；  
5）若需要参考 Next.js Route Handlers/Drizzle 事务最佳实践，请 use context7。  

### Task 2: 数据库改造（支持多份日结记录 + 区间状态表）
**预计时间**: 2小时
**依赖**: Task 1

**AI 提示词**:
你是一位资深数据库工程师，请实现“日结记录按点击顺序可多次生成”的 schema 与迁移。use context7  
要求：  
1）在 `db/schema.ts` 增加（或改造）用于存储日结报告的表：包含 `sequence_no`、`period_start_at`、`period_end_at` 以及既有汇总字段；移除（或不再使用）按 `business_date` 的唯一约束，允许同日多条记录；  
2）新增 `daily_closure_state` 单行表（含 `current_period_start_at`、`next_sequence_no`），用于生成报告时推进区间并防并发；  
3）为区间查询补充必要索引（`transactions.created_at`、`orders.closed_at`）；  
4）生成并推送迁移：`pnpm drizzle:generate && pnpm drizzle:push`；如存在已有数据，提供最小迁移策略说明（允许无数据场景下直接迁移）。  

### Task 3: 统计函数改造（按区间计算预览快照）
**预计时间**: 2小时
**依赖**: Task 2

**AI 提示词**:
你是一位资深后端工程师，请把日结统计从“按自然日”改为“按时间区间”。use context7  
要求：  
1）重构 `app/api/daily-closure/utils.ts`：新增 `computeClosureSnapshotByRange(db, periodStartAt, periodEndAt, taxRate)`；  
2）收入与支付拆分：从 `transactions` 按 `createdAt` 区间筛选，并按 `paymentMethod` 聚合；  
3）订单数与菜品明细：从 `orders` 按 `closedAt` 区间筛选，并联表 `order_items`/`menu_items` 构造 itemLines（必须能产出分类列表 `categories` 以支持“菜品种类显示”）；  
4）保持现有返回结构的可复用性（overview/payments/items/adjustments/meta），但不要再依赖 `businessDate` 做过滤；  
5）为关键纯计算（金额聚合、折扣分摊、分类提取）补充单元测试接口设计建议（实现放到后续 Task）。  

### Task 4: API 改造（生成报告不锁定；预览基于当前区间）
**预计时间**: 2小时
**依赖**: Task 3

**AI 提示词**:
你是一位资深后端工程师，请改造日结相关 API，使其满足“点击一次生成一条记录，并立即开始下一段统计”的需求。use context7  
要求：  
1）`GET /api/daily-closure`：读取 `daily_closure_state.current_period_start_at`，以 `now` 作为 `periodEndAt` 计算预览快照并返回；  
2）`POST /api/daily-closures/confirm`：在事务内锁定 `daily_closure_state` 行，读取 start/end 与 next sequence，写入一条新的报告记录 + line tables，然后推进 state；  
3）移除 `app/api/orders/checkout/route.ts` 中“当日锁账拦截”的 409 逻辑（不再按日期锁住结账）；  
4）保持错误结构统一并包含 `code`，并对并发/重复提交提供幂等策略（推荐支持 `clientRequestId` 或 `Idempotency-Key`，既避免误触重复，又允许用户主动生成第二份报告）。  

### Task 5: 前端最小改造（允许连续日结；保持页面尺寸；分类可见）
**预计时间**: 2小时
**依赖**: Task 4

**AI 提示词**:
你是一位资深前端工程师，请在不改变页面整体尺寸的前提下，让“日结”页支持按点击顺序连续生成报告，并确保“菜品种类/分类”正确显示。use context7  
要求：  
1）保持 `components/features/daily-closure/DailyClosureManagement.tsx` 的布局/尺寸不变（Tabs/Card/ScrollArea 高度不变）；  
2）按钮逻辑：无论是否已生成过报告，都允许再次点击「日结确认」生成下一份；生成成功后可用 toast/Badge 提示“已生成第 N 份”；  
3）数据拉取：`useDailyClosureQuery` 改为拉取“当前区间预览”（不再用 `date` 作为 key/过滤条件）；  
4）「菜品明细」Tab：分类下拉框必须展示分类列表（来自 API 的 `items.categories`），并能筛选列表；不得新增侧栏或改变布局比例。  

### Task 6: 回归测试与验收清单（区间正确性 + 分类显示）
**预计时间**: 2小时
**依赖**: Task 5

**AI 提示词**:
你是一位负责交付质量的工程师，请为“按点击顺序生成日结报告”的改造补充测试与验收用例。use context7  
要求：  
1）为区间统计的核心纯函数补充 Vitest 单测：两次连续生成的区间应首尾衔接且无重叠；跨午夜数据应被同一份报告覆盖；  
2）为 `DailyClosureManagement` 编写组件测试（React Testing Library + MSW）：验证“分类筛选”能展示分类并筛选菜品列表；  
3）按 `doc/guides/nextjs.instructions.md` 与 `doc/guides/nextjs-tailwind.instructions.md` 自查：不引入破坏布局尺寸的 UI 变更；Route Handlers 符合 Next.js 约定。  

## Links
- 工程规范：`../../guides/nextjs.instructions.md`、`../../guides/nextjs-tailwind.instructions.md`
- 现状参考：`../features/daily_closure-PLAN.md`
- Context7（实现阶段参考库）：
  - Next.js App Router Route Handlers：`/websites/nextjs_app`
  - Drizzle ORM：`/drizzle-team/drizzle-orm-docs`
  - TanStack Query：`/tanstack/query`
  - ExcelJS：`/exceljs/exceljs`
  - pdf-lib：`/hopding/pdf-lib`

