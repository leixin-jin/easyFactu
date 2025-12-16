# 报表页面完善（功能模板 · 任务驱动）

- ID: report_improvements
- Owner: TBD
- Status: proposed

## Summary
将「数据报表」页面从静态 mock 数据升级为数据库驱动：按需求调整 KPI（移除平均翻台时长、增加现金 vs 银行占比）、移除“高峰时段”、支持日/周/月/年时间粒度切换（默认本月）、将“销售趋势”改为折线图，并提供导出 Excel 报表能力；要求保持现有 UI 布局尺寸与风格一致，仅补齐“菜品种类（category）”的展示。

## Scope
- In:
  - 页面结构保持不变（不改整体布局尺寸）
    - 继续使用现有 Header（Select + 导出按钮）、4 个 KPI 卡片栅格、Tabs（保留“销售趋势/热销菜品”，移除“高峰时段”）。
    - 不新增侧栏/新区域，不改变 Card/ScrollArea 的既有高度与宽度约束（`SelectTrigger` 宽度、KPI 卡片栅格列数、热销列表 `ScrollArea` 高度等保持一致）。
  - KPI 调整
    - 删除「平均翻台时长」KPI 卡片。
    - 增加「现金占比 vs 银行占比」KPI 卡片（展示金额与占比；占比口径在 API 明确）。
  - 功能删除
    - 删除「高峰时段」Tab 与相关数据/渲染逻辑（含 mock 数据）。
  - 时间粒度切换
    - 粒度固定为：日 / 周 / 月 / 年（默认：本月）。
    - 粒度决定报表统计区间与趋势图聚合粒度（详见 API 设计）。
  - 销售趋势可视化
    - 使用 Line Chart 展示“营业额趋势”（x=时间 bucket，y=营业额）。
    - 使用项目内既有 `recharts` 与 `components/ui/chart.tsx`，保持 UI 风格一致。
  - 菜品种类显示（必须项）
    - “热销菜品排行”列表中补齐菜品 `category` 展示（例如：在菜名下显示分类或 Badge），不改变列表高度。
  - 新增报表 API（数据库驱动）
    - 新增 Route Handler：`GET /api/reports`（聚合统计 + 趋势 + 热销菜品 + 现金/银行占比）。
    - 前端 `ReportsView` 改为通过 TanStack Query 拉取 API 数据并渲染（移除 mock 数组）。
  - 导出报表
    - `GET /api/reports/export?format=xlsx&granularity=...` 返回 Excel 文件；前端「导出报表」按钮触发下载。
- Out:
  - 自定义日期范围/任意日期选择（本期仅支持“当前日/周/月/年”）。
  - 同比/环比、跨店/多租户维度、权限管理与审计。
  - PDF 导出、打印样式调整（仅要求 Excel 导出）。
  - “高峰时段”任何形式的独立分析视图（已按需求移除）。

## UX Notes
- 保持现有 UI 尺寸与一致性（关键约束）：
  - `components/reports-view.tsx` 中 KPI 卡片仍为 4 张，栅格与间距不变；仅替换其中 1 张的内容。
  - Tabs 仅减少为 2 个（销售趋势/热销菜品），其余布局不变。
  - “热销菜品排行”继续使用现有 `ScrollArea className="h-[400px]"`，仅在每个条目内部补齐分类展示（菜品种类）。
  - “销售趋势”卡片保持现有 padding、标题层级与字体；内容区改为折线图但不引入新的外层容器尺寸变更。
- 交互与状态：
  - 默认选中“本月”（粒度=月），切换粒度后自动刷新 KPI/趋势/热销菜品。
  - Loading：KPI 与图表展示 skeleton/占位（不扩充布局）。
  - Empty：无数据时 KPI 显示 0、趋势图显示空态文案（不改变 Card 高度）。

## API / DB
- API:
  - `GET /api/reports?granularity=day|week|month|year`
    - Query（zod 校验）：
      - `granularity`：可选，默认 `month`
    - 统计区间（服务器端根据当前时间计算）：
      - `day`：`[startOfToday, startOfTomorrow)`
      - `week`：`[startOfWeek, startOfNextWeek)`（以项目既定 weekStartsOn 为准）
      - `month`：`[startOfMonth, startOfNextMonth)`
      - `year`：`[startOfYear, startOfNextYear)`
    - 返回（建议结构；可按实现微调但需覆盖前端所需字段）：
      - `range`: `{ granularity, startAt, endAt }`
      - `kpis`: `{ grossRevenue, ordersCount, averageOrderValueGross, cashAmount, bankAmount, cashRatio, bankRatio }`
      - `salesTrend`: `Array<{ bucket: string; revenue: number }>`（bucket 为时间点/区间起点的 ISO 或可展示 label）
      - `topItems`: `Array<{ menuItemId: string | null; name: string; category: string; quantitySold: number; revenueAmount: number }>`（用于热销列表与“菜品种类”展示）
  - `GET /api/reports/export?format=xlsx&granularity=...`
    - 返回 `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
    - `Content-Disposition` 文件名建议包含粒度与月份/年份（例如：`reports-2025-12-month.xlsx`）
- DB:
  - 本期不新增/修改表结构，直接基于现有表聚合：
    - `transactions`（收入：`type='income'`，按 `createdAt` 区间聚合，支付方式用于现金/银行占比）
    - `orders`（订单数：`status='paid'`，按 `closedAt` 区间聚合）
    - `order_items` + `menu_items`（热销菜品：销量/营收；必须产出 `category` 用于“菜品种类显示”）
  - 不涉及 Supabase Schema 变更，因此无需新增 RLS SQL；若后续新增报表快照表（不在本期范围），需在迁移中补齐 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` 与对应策略。

## Workflow
1. 设计 → 2. Schema/Migration → 3. UI → 4. API → 5. 联调 → 6. 种子/文档 → 7. 验收

## Acceptance Criteria
- [ ] 删除 KPI「平均翻台时长」（`components/reports-view.tsx` 不再渲染该卡片）
- [ ] 删除“高峰时段”功能（Tabs 中无该 Tab，且无相关 mock 数据与渲染逻辑）
- [ ] 时间粒度切换为「日/周/月/年」，默认「本月」，切换后 KPI/趋势/热销同步更新
- [ ] 新增 KPI「现金占比 vs 银行占比」，数据来自数据库聚合（口径在 API 中可追溯）
- [ ] “销售趋势”使用折线图展示（x=时间，y=营业额），并随粒度变化正确聚合
- [ ] 新增报表 API，前端不再使用 mock 数组，改为通过 API 拉取数据库数据
- [ ] “导出报表”可导出 Excel 文件，字段包含至少：汇总 KPI、趋势明细、热销菜品（含分类）
- [ ] UI 一致性：不修改页面整体尺寸/栅格/关键高度约束；仅补齐“菜品种类（category）”展示

## 任务清单（Tasks）
按“技术依赖优先、≤2小时/任务、独立可提交 PR”的原则拆分并排序任务。建议 3–8 个任务。

### Task 1: 新增报表聚合 API（GET /api/reports）
**预计时间**: 2小时
**依赖**: 无

**AI 提示词**:
你是一位资深全栈工程师，请为「数据报表」页新增数据库驱动的报表聚合 API。ultrathink use context7  
要求：  
1）新增 Next.js Route Handler：`app/api/reports/route.ts`，实现 `GET /api/reports?granularity=day|week|month|year`；使用 `zod` 校验 query，默认 `granularity=month`；错误返回统一 `{ error, code, detail }`；  
2）按粒度计算统计区间（当前日/周/月/年），并用 Drizzle + `getDb()` 查询数据库；收入口径对齐现有日结：基于 `transactions`（`type='income'`）在 `[startAt, endAt)` 区间按 `createdAt` 聚合；订单数基于 `orders`（`status='paid'`）在 `[startAt, endAt)` 区间按 `closedAt` 聚合；  
3）KPI 至少返回：`grossRevenue`、`ordersCount`、`averageOrderValueGross`、`cashAmount`、`bankAmount`、`cashRatio`、`bankRatio`；其中“现金/银行”口径沿用 `lib/daily-closure/calculate.ts` 的支付分组推断逻辑（现金=group cash，其余并入银行或按约定映射，需在字段命名/注释中明确）；  
4）趋势数据：返回 `salesTrend: Array<{ bucket: string; revenue: number }>`；bucket 聚合规则建议：`day=>hour`，`week/month=>day`，`year=>month`（用 `date_trunc` 生成 bucket 并 sum）；  
5）热销菜品：复用或对齐 `app/api/daily-closure/utils.ts` 的折扣分摊与 item 聚合逻辑，输出 `topItems`，每条必须包含 `name` 与 `category`（用于“菜品种类显示”）；  
6）不要修改任何现有页面；只做 API 与必要的共享纯函数抽取（若需要可新增 `lib/reports/*`），并为关键纯函数预留可测试边界（下一任务补测）。  

### Task 2: 新增导出报表 API（GET /api/reports/export，xlsx）
**预计时间**: 2小时
**依赖**: Task 1

**AI 提示词**:
你是一位资深后端工程师，请实现报表导出 Excel 的 API。use context7  
要求：  
1）新增 Route Handler：`app/api/reports/export/route.ts`，实现 `GET /api/reports/export?format=xlsx&granularity=...`（zod 校验，`format` 仅允许 `xlsx`）；  
2）复用 Task 1 的报表聚合逻辑（建议抽成共享函数，避免重复查询），生成 Excel（使用项目已安装的 `exceljs`）；参考 `app/api/daily-closures/[id]/export/route.ts` 的实现风格：返回 buffer，并设置 `Content-Type` 与 `Content-Disposition`（文件名含粒度与日期）；  
3）Excel 至少包含 3 个 sheet：`Summary`（区间与 KPI 含现金/银行占比）、`SalesTrend`（bucket+revenue）、`TopItems`（rank、name、category、quantitySold、revenueAmount）；  
4）不新增外部依赖，不引入网络请求；确保在 Node runtime 下可运行（如需要显式 `export const runtime = 'nodejs'`）。  

### Task 3: 前端接入数据库数据并落地 UI 需求（KPI/粒度/删除高峰/菜品种类）
**预计时间**: 2小时
**依赖**: Task 1

**AI 提示词**:
你是一位资深前端工程师，请在不改变报表页面整体尺寸与风格的前提下，完成 UI 需求并接入数据库数据。use context7  
要求：  
1）涉及文件：`components/reports-view.tsx`、`app/reports/page.tsx`（必要时）、以及新增/修改 `types/api.ts`、`lib/api/client.ts`、`lib/queries/use-reports.ts`（或按项目既有 query hook 组织方式）；  
2）把 `ReportsView` 中的 mock 数据（`salesData/topItems/peakHours`）替换为通过 TanStack Query 拉取 `GET /api/reports` 的真实数据；Query key 需包含 `granularity`；  
3）时间粒度切换：Select 选项改为「日/周/月/年」，默认「本月」，切换后触发重新拉取并更新渲染；保持 `SelectTrigger` 宽度与 Header 布局不变；  
4）删除 KPI「平均翻台时长」卡片，并新增 KPI「现金占比 vs 银行占比」卡片（保持 4 张 KPI 卡片栅格与尺寸不变）；  
5）删除“高峰时段”Tab 与内容（包括 tabs trigger、content 与相关数据）；  
6）“菜品种类显示”（必须项）：在“热销菜品排行”列表中展示每个菜品的 `category`（例如 Badge/副标题），不得改变 `ScrollArea` 高度（仍为 `h-[400px]`）与整体布局比例；  
7）处理 loading/empty：不扩展页面尺寸；无数据时不要报错。  

### Task 4: 销售趋势改为折线图（Line Chart）
**预计时间**: 1.5小时
**依赖**: Task 3

**AI 提示词**:
你是一位资深前端工程师，请把“销售趋势”从列表条形展示改为折线图展示。use context7  
要求：  
1）使用项目内既有 `recharts` 与 `components/ui/chart.tsx`（ChartContainer/Tooltip 等）实现 LineChart；  
2）数据源来自 `GET /api/reports` 返回的 `salesTrend`；x 轴为时间 bucket（按粒度格式化），y 轴为营业额；tooltip/坐标轴金额使用项目的金额格式化工具（如 `lib/money.ts`）；  
3）保持 Card 的 padding、标题与整体布局尺寸不变，不新增外围容器改变宽高；  
4）空数据时显示空态（不改变 Card 高度）。  

### Task 5: 导出报表按钮联动（下载 xlsx）
**预计时间**: 1小时
**依赖**: Task 2, Task 3

**AI 提示词**:
你是一位资深前端工程师，请让报表页「导出报表」按钮导出 Excel。use context7  
要求：  
1）在 `lib/api/client.ts` 增加 `api.reports.exportUrl(granularity, format)`（或等价方法），返回 `/api/reports/export?...`；  
2）`components/reports-view.tsx` 中点击「导出报表」触发浏览器下载（可用 `window.location.href` 或创建隐藏 `<a download>`），文件为 xlsx；  
3）导出应基于当前选择的粒度（day/week/month/year）；loading 时按钮可 disabled，但不能改变按钮尺寸与布局；  
4）失败时给出 toast（如项目已有 `sonner`），不影响布局。  

### Task 6: 测试与验收（API + UI）
**预计时间**: 2小时
**依赖**: Task 1, Task 2, Task 3, Task 4, Task 5

**AI 提示词**:
你是一位负责交付质量的工程师，请为报表页改造补齐必要测试并给出验收清单。use context7  
要求：  
1）为报表时间区间计算与趋势聚合（建议抽到 `lib/reports/*` 的纯函数）添加 Vitest 单测；覆盖：四种粒度的 start/end 正确、bucket 聚合数量与边界（`[startAt, endAt)`）正确；  
2）为 `ReportsView` 添加 React Testing Library 组件测试（MSW mock `/api/reports`）：验证默认“本月”、切换粒度会重新渲染、已移除“平均翻台时长/高峰时段”、热销条目展示 `category`；  
3）如为导出按钮加了行为，补充最小测试或在验收清单中给出手测步骤（文件下载/文件名/字段）；  
4）运行并记录最小验证命令建议：`pnpm lint`、`pnpm test:run`。  

## Links
- 相关页面：
  - `components/reports-view.tsx`
  - `app/reports/page.tsx`
- 参考实现：
  - `components/ui/chart.tsx`（Recharts 封装与样式）
  - `app/api/daily-closure/utils.ts`（折扣分摊与菜品聚合口径，可复用）
  - `app/api/daily-closures/[id]/export/route.ts`（ExcelJS 导出范例）
- 工程规范：
  - `../../guides/nextjs.instructions.md`
  - `../../guides/nextjs-tailwind.instructions.md`
- Context7（实现阶段参考库）：
  - Next.js App Router Route Handlers：`/websites/nextjs_app`
  - Drizzle ORM：`/drizzle-team/drizzle-orm-docs`
  - TanStack Query：`/tanstack/query`
  - Recharts：`/recharts/recharts`
  - ExcelJS：`/exceljs/exceljs`
