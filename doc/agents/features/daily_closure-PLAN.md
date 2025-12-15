# 日结功能页（daily_closure）

- ID: daily_closure
- Owner: TBD
- Status: proposed

## Summary
新增独立“日结”功能页：展示今日经营总览、按支付方式入账拆分、按菜品统计营业额，并支持“日结确认/锁账”、补录差额备注，以及导出 PDF/Excel 供对账与留档。

## Scope
- In:
  - 导航与路由
    - 左侧引导栏新增入口“日结”（复用 `components/dashboard-layout.tsx` 的 `navigation` 配置）
    - 新增页面路由：`app/daily-closure/page.tsx`（保持与其他页面一致：`DashboardLayout` + feature 组件）
  - 前端功能（UI 一致且不改整体尺寸）
    - 今日总览：含税/不含税切换、订单数、客单价、退款/作废金额（独立展示、不混入营业额）
    - 入账拆分：现金/银行卡与电子支付合计、按支付方式明细、应收 vs 实收差额（手续费/抹零/差额调整）
    - 菜品明细：按菜品统计今日营业额；支持按营业额/销量排序、按分类筛选（重点：完成“菜品种类/分类”的显示）
    - 日结输出与锁账：确认生成不可随意改的日结记录；支持补录差额并写备注；导出 PDF/Excel
  - 后端/数据
    - 基于现有 `orders` / `order_items` / `menu_items` / `transactions` 统计当日数据
    - 新增“日结记录”相关表与 API（锁账、调整、导出）
- Out:
  - 多门店/多币种/多税率的完整财务体系（首版以单店、单税率为前提）
  - 跨日订单（例如昨日开单今日结账）的精细归集与拆分（可在后续版本增强）
  - 完整的退款/作废业务流（本功能页展示金额来源于已有/新增的交易流水；退款/作废操作入口可后续独立完善）

## UX Notes
- 页面框架：保持与现有 `/reports`、`/finance` 一致的结构：顶部 Header（标题+说明+操作区）+ `Tabs` 分区 + `Card` 栅格/列表。
- 不修改整体 UI 尺寸：
  - 不调整 `DashboardLayout` 的侧边栏宽度与主内容 padding/高度；
  - 列表区域使用现有 `Card` + `ScrollArea`，避免引入新的全屏/固定宽高布局；
  - “菜品分类筛选”优先使用 `Select`（或可横向滚动的 `TabsList`）来展示分类，避免新增左侧分类栏改变页面比例。
- 今日总览：
  - “含税/不含税”切换为轻量控件（例如 `TabsTrigger` / `ToggleGroup`），切换只影响金额展示与派生字段（客单价等）。
  - 退款/作废金额独立卡片展示，并在明细区提供“来源说明”（例如来自 `transactions.type='expense'` 的指定分类）。
- 入账拆分：
  - 默认展示“现金合计”“银行卡/电子支付合计”，下方按支付方式列出明细（现金、Visa-MC、Apple Pay、外卖平台等）。
  - “补录差额”通过 Dialog 完成：选择类型（手续费/抹零/其他）、金额（正负）、备注、可选关联支付方式/组。
- 菜品明细：
  - 列表字段：菜品名、分类、销量（份数）、营业额、均价、（可选）折扣影响金额。
  - 筛选/排序：分类筛选（展示“菜品种类”）、按营业额降序/按销量降序。
- 日结确认/锁账：
  - 未锁账：显示“日结确认”按钮；确认后页面进入只读状态（仍允许追加“差额补录”作为附加记录）。
  - 已锁账：显示锁账时间、日结单号（ID），导出按钮可用。

## API / DB
- DB（建议新增）
  - `daily_closures`
    - `id`（uuid pk）、`business_date`（date，unique）、`tax_rate`（numeric，可选：用于含税/不含税换算口径）
    - 汇总快照字段（numeric/int）：`gross_revenue`、`net_revenue`、`orders_count`、`refund_amount`、`void_amount` 等
    - 锁账字段：`locked_at`（timestamp）、`created_at`
  - `daily_closure_adjustments`
    - `id`、`closure_id`（fk）、`type`（手续费/抹零/其他）、`amount`（numeric）、`note`（text）、`payment_method`（text nullable）、`created_at`
  - `daily_closure_payment_lines`（用于冻结“入账拆分”快照）
    - `id`、`closure_id`（fk）、`payment_method`（text）、`payment_group`（cash/card/platform/other）、`expected_amount`（numeric）
  - `daily_closure_item_lines`（用于冻结“菜品明细”快照）
    - `id`、`closure_id`（fk）、`menu_item_id`（uuid nullable）、`name_snapshot`、`category_snapshot`
    - `quantity_sold`（int）、`revenue_amount`（numeric）、`discount_impact_amount`（numeric nullable）
  - 索引：`daily_closures.business_date` unique；`daily_closure_*` 的 `closure_id` index；必要时为 `transactions.date`/`orders.closed_at` 增补索引。
- API（建议新增，App Router Route Handlers）
  - `GET /api/daily-closure?date=YYYY-MM-DD`
    - 作用：用于页面实时查看（若当日已锁账则优先返回锁账快照 + 调整项；否则返回实时计算结果）
  - `POST /api/daily-closures/confirm`
    - 作用：执行“日结确认”，生成/更新（幂等）当日 `daily_closures` + line items 快照并写入 `locked_at`
  - `POST /api/daily-closures/[id]/adjustments`
    - 作用：补录差额（允许锁账后追加），用于对账差异说明
  - `GET /api/daily-closures/[id]/export?format=pdf|xlsx`
    - 作用：导出 PDF/Excel（优先基于锁账快照 + 调整项渲染，避免导出内容随实时数据变化）

## Workflow
1. 需求与口径确认（含税/不含税、退款/作废来源、日界线/时区） → 2. Schema/Migration → 3. API（查询/锁账/调整/导出） → 4. UI（Tabs + Cards + 列表） → 5. 联调（锁账前后、导出） → 6. 测试与文档 → 7. 验收

## Acceptance Criteria
- [ ] 左侧引导栏新增“日结”，点击进入 `app/daily-closure` 页面，整体 UI 风格与现有页面一致
- [ ] 今日总览：总营业额支持含税/不含税切换；展示订单数、客单价；退款/作废金额单独展示且不混入营业额
- [ ] 入账拆分：展示现金/银行卡与电子支付合计；支持按支付方式明细；展示应收 vs 实收差额并支持“补录差额+备注”
- [ ] 菜品明细：按菜品统计销量/营业额/均价；支持按营业额/销量排序；支持分类筛选并完成“菜品种类/分类”的显示
- [ ] 日结确认：确认后生成不可随意改的日结记录（锁账），页面进入只读；允许通过“补录差额”追加调整记录
- [ ] 导出：支持导出 PDF/Excel（内容与锁账快照一致）
- [ ] 可观测性：关键 API 失败返回明确 `code`；锁账冲突/重复锁账有幂等与可解释错误

## 任务清单（Tasks）

### Task 1: 新增“日结”导航入口与页面壳
**预计时间**: 1小时
**依赖**: 无

**AI 提示词**:
你是一位资深 Next.js App Router 工程师，请在本仓库新增“日结”功能页的基础骨架，要求保持与其他页面一致的 UI 框架。  
具体要求：  
1）在 `components/dashboard-layout.tsx` 的 `navigation` 数组中新增一项：`name: "日结"`, `href: "/daily-closure"`，并选用一个合适的 `lucide-react` icon；  
2）新增页面文件 `app/daily-closure/page.tsx`，按现有页面模式使用 `<DashboardLayout>` 包裹一个新的 feature 组件；  
3）在 `components/features/` 下新增 `daily-closure/` 目录与 `index.ts`，并创建占位组件（例如 `DailyClosureManagement`），随后在 `components/features/index.ts` 中导出；  
4）不修改任何现有页面的布局尺寸（尤其不要改 `DashboardLayout` 的结构/宽度/高度）。  

### Task 2: 设计并实现日结锁账的数据库表结构与迁移
**预计时间**: 2小时
**依赖**: Task 1

**AI 提示词**:
你是一位熟悉 Drizzle ORM + PostgreSQL 的后端工程师，请为“日结”设计并实现数据模型，并生成迁移。use context7  
要求：  
1）在 `db/schema.ts` 新增 `daily_closures`、`daily_closure_adjustments`、`daily_closure_payment_lines`、`daily_closure_item_lines` 表（字段设计见本计划的 API/DB 小节，可微调但需解释原因）；  
2）为 `business_date` 添加唯一约束（确保一天只能锁一次账），并为 `closure_id` 建立必要索引；  
3）按仓库规范生成与推送迁移：`pnpm drizzle:generate && pnpm drizzle:push`（仅在实现阶段执行）；  
4）补充 TypeScript 推断类型导出（与 `MenuItem`、`Order` 等风格一致）。  

### Task 3: 实现日结实时汇总查询 API（GET）
**预计时间**: 2小时
**依赖**: Task 2

**AI 提示词**:
你是一位资深全栈工程师，请实现“日结”页面所需的只读查询接口。use context7  
要求：  
1）新增 Route Handler：`GET /api/daily-closure?date=YYYY-MM-DD`（放在 `app/api/daily-closure/route.ts` 或等价路径）；  
2）使用 `zod` 校验 query 参数 `date`，并输出统一错误结构（含 `code`）；  
3）若当日存在已锁账的 `daily_closures`：返回锁账快照 + 调整项；若未锁账：基于 `transactions` / `orders` / `order_items` / `menu_items` 实时计算并返回：  
   - 今日总览（gross/net 两套金额口径或返回足够信息供前端切换）  
   - 入账拆分（按支付方式分组的明细 + 现金/非现金合计）  
   - 菜品明细（至少返回分类列表与菜品明细所需字段；需要支持分类筛选与排序的参数设计可先预留）  
4）注意“退款/作废金额”不能混入营业额，需独立统计；若当前系统尚无对应流水，也要保证接口返回 0 且说明统计口径。  

### Task 4: 实现日结确认/锁账与补录差额 API（POST）
**预计时间**: 2小时
**依赖**: Task 2, Task 3

**AI 提示词**:
你是一位资深后端工程师，请实现日结锁账与差额补录的写接口，并保证幂等与不可随意改。use context7  
要求：  
1）实现 `POST /api/daily-closures/confirm`：  
   - 请求体包含 `date`（可选，默认今天）与可选的初始备注/调整项；  
   - 若该日已锁账，返回已有记录（幂等）；否则计算当日汇总并写入 `daily_closures` + line tables，设置 `locked_at`；  
2）实现 `POST /api/daily-closures/[id]/adjustments`：写入一条补录差额记录（金额可正可负、必须备注、可选关联支付方式），返回最新调整列表；  
3）（可选但推荐）在 `app/api/orders/checkout/route.ts` 等产生交易流水的入口增加“锁账拦截”：若目标日期已锁账，拒绝写入并返回 409（避免锁账后数据继续变化）。  

### Task 5: 前端集成日结页面（总览 + 入账拆分）
**预计时间**: 2小时
**依赖**: Task 1, Task 3

**AI 提示词**:
你是一位资深前端工程师，请实现“日结”页面的主要 UI（保持现有页面风格与尺寸），并通过 TanStack Query 接入 `GET /api/daily-closure` 数据。use context7  
要求：  
1）新增 `lib/api` 客户端方法（例如 `api.dailyClosure.get(date)`），并补充 `types/api.ts` 类型；  
2）在 `lib/queries/` 新增 `use-daily-closure.ts`（包含 queryKey、useQuery、必要的 invalidate 策略）；  
3）实现 `components/features/daily-closure/DailyClosureManagement.tsx`：  
   - Header：标题“日结”、说明文案、日期（默认今天，可先只读显示）  
   - Tabs：至少包含“总览”“入账拆分”“菜品明细”“锁账与导出”  
   - 总览：展示含税/不含税切换、订单数、客单价、退款/作废金额  
   - 入账拆分：展示现金/非现金合计与支付方式明细（先按接口返回渲染）  
4）不要修改 `DashboardLayout` 布局与页面整体尺寸；组件内可复用 `Card`、`Tabs`、`ScrollArea` 等现有 UI。  

### Task 6: 菜品明细（分类显示 + 排序/筛选）
**预计时间**: 2小时
**依赖**: Task 3, Task 5

**AI 提示词**:
你是一位负责数据展示与交互体验的前端工程师，请在“菜品明细”Tab 中实现按菜品统计列表，并重点完成“菜品种类/分类”的显示与筛选。  
要求：  
1）每个菜品展示：销量（份数）、营业额、均价（营业额/销量），可选展示折扣影响金额；  
2）支持排序：按营业额降序、按销量降序；  
3）支持分类筛选：分类来源于 `menu_items.category`（或 API 返回的分类列表），用 `Select`（或可横向滚动的 Tabs）展示；  
4）保持页面布局尺寸不变：列表区域使用 `Card` + `ScrollArea`，不要引入新的固定宽度侧栏。  


### Task 7: 测试、验收与文档补充
**预计时间**: 2小时
**依赖**: Task 1, Task 2, Task 3, Task 4, Task 5, Task 6

**AI 提示词**:
你是一位负责交付质量的工程师，请为“日结”增加必要测试并完成验收清单。  
要求：  
1）为核心统计口径（总览/入账拆分/菜品明细）提取纯函数并编写单元测试（Vitest）；  
2）为 `DailyClosureManagement` 编写至少 1 个组件测试（React Testing Library + MSW），覆盖“分类筛选 UI 能展示分类并筛选列表”；  
3）按 `doc/guides/nextjs.instructions.md` 与 `doc/guides/nextjs-tailwind.instructions.md` 做一次自查，确保没有破坏现有布局尺寸；  
4）在 `doc/agents/features/FEATURES.md` 中补充该功能的链接与简述（仅在实现阶段执行）。  

## Links
- 工程规范：`../../guides/nextjs.instructions.md`、`../../guides/nextjs-tailwind.instructions.md`
- Context7 参考库（实现阶段用）：Next.js App Router Route Handlers（`/websites/nextjs_app`）、TanStack Query v5（`/websites/tanstack_query_v5`）、Drizzle ORM（`/drizzle-team/drizzle-orm-docs`）、ExcelJS（`/exceljs/exceljs`）、pdf-lib（`/hopding/pdf-lib`）
