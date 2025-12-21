# 日结页面优化（功能模板 · 任务驱动）

- ID: fix-daily-closure
- Owner: zhuyuxia
- Status: proposed

## Summary
优化日结总览的 KPI 与菜品分类展示，保持 UI 规模不变，去掉不含税与锁账子页，体验对齐报表页。

## Scope
- In: `app/daily-closure/page.tsx` 与 `components/features/daily-closure/DailyClosureManagement.tsx` 的总览/KPI/菜品分类展示；Tabs 精简；分类营业额汇总展示。
- Out: 报表页与导出逻辑不变；API/DB 无新增字段或端点；不显示单品明细、不增加筛选排序。

## UX Notes
- KPI 卡片顺序固定：营业额 → 订单数 → 客单价 → 现金 vs 银行；样式参考 `components/reports-view.tsx`，保持当前 grid 与卡片尺寸不变。
- 仅保留含税：移除“不含税”切换，相关文案不再提示含税/不含税切换。
- 现金 vs 银行：展示现金%/银行%与金额（现金/非现金），使用日结 payments 实收汇总计算。
- “菜品明细”合并到总览 KPI 下方：只显示分类名称 + 营业额（如 `appetizer  €90.00`），不显示单品、销量、均价、折扣；使用 shadcn/ui `Card` + `ScrollArea`，不改页面尺寸。
- 空状态：无分类数据时显示简短提示。

## API / DB
- API: 无新增/改动，继续使用 `GET /api/daily-closure`。
- DB: 无变更；如后续涉及 Supabase 表结构调整，需提供启用 RLS 的 SQL（示例：`ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;` 并补充 policy）。

## Workflow
1. 设计 → 2. Schema/Migration（不涉及） → 3. UI → 4. API（不涉及） → 5. 联调 → 6. 种子/文档（不涉及） → 7. 验收

## Acceptance Criteria
- [ ] 仅显示“含税”，移除“不含税”切换。
- [ ] KPI 卡片为 4 张，顺序为营业额、订单数、客单价、现金 vs 银行，视觉对齐报表页。
- [ ] “锁账与导出”页签移除；“菜品明细”页签移除并合并到总览。
- [ ] KPI 下仅展示菜品分类 + 营业额汇总，不展示单品明细/销量/均价/折扣。
- [ ] 页面尺寸与布局一致，继续使用 shadcn/ui 组件。
- [ ] 可观测性：无新增埋点需求，沿用现有错误提示。
- [ ] 无 API/DB 变更。

## 任务清单（Tasks）

### Task 1: 对齐日结 KPI 与报表页样式
**预计时间**: 1.5 小时
**依赖**: 无

**AI 提示词**:
你是一位资深前端工程师。请在 `components/features/daily-closure/DailyClosureManagement.tsx` 中调整日结总览 KPI：
- 仅保留含税视图，移除 `taxView` 状态与 ToggleGroup（不含税选项消失）。
- KPI 卡片改为 4 张，顺序为：营业额、订单数、客单价、现金 vs 银行。
- 视觉与布局参考 `components/reports-view.tsx` 的 KPI 卡片（含图标、结构、Skeleton 处理），保持现有页面尺寸与 grid 行为不变。
- 现金 vs 银行显示比例（现金%/银行%）与金额（现金/非现金），基于 `data?.payments.cashActualTotal` 与 `data?.payments.nonCashActualTotal` 计算。
- 继续使用 shadcn/ui 组件，不修改页面整体尺寸。

### Task 2: 移除页签并合并菜品分类汇总
**预计时间**: 1.5 小时
**依赖**: Task 1

**AI 提示词**:
你是一位资深前端工程师。请在 `components/features/daily-closure/DailyClosureManagement.tsx` 中完成以下改动：
- 删除 Tabs 中的“菜品明细”和“锁账与导出”页签与对应内容。
- 在总览（overview）KPI 卡片下方新增“菜品分类营业额”区块：只展示分类名称 + 营业额汇总，不展示单品、销量、均价、折扣等明细。
- 使用 shadcn/ui 的 `Card` 与 `ScrollArea`，保持高度与间距，避免改变整体页面尺寸。
- 若无数据，显示简短空状态文案。

### Task 3: 分类汇总数据整理与回归验证
**预计时间**: 1 小时
**依赖**: Task 2

**AI 提示词**:
你是一位资深前端工程师。请整理日结分类汇总数据并做回归验证：
- 基于 `data?.items.lines` 在前端聚合按 `category` 的营业额（降序排序），用于分类汇总列表。
- 清理无用状态（如 `categoryFilter`、`sortBy`、`filteredItems` 等）与相关 UI。
- 手动验证日结页面：仅含税、KPI 顺序正确、现金 vs 银行比例与金额显示、分类汇总列表显示、页签移除且页面尺寸保持一致。

## Links
- `components/features/daily-closure/DailyClosureManagement.tsx`
- `components/reports-view.tsx`
- `app/daily-closure/page.tsx`
- `types/api.ts`
- `doc/guides/nextjs.instructions.md`
- `doc/guides/nextjs-tailwind.instructions.md`
- Context7 Next.js Best Practices：`/vercel/next.js`（production checklist / App Router guidance）
