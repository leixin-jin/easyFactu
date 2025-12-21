# 日结页面优化（功能模板 · 任务驱动）

- ID: fix-daily-closure
- Owner: zhuyuxia
- Status: proposed

## Summary
优化日结总览的 KPI 与菜品分类展示，移除不含税切换与锁账页签，KPI 样式对齐报表页，菜品分类汇总融入总览。

## 修改建议（已纳入方案）
- Tabs 精简后需同步 `Tabs` 的 `defaultValue`/受控值，避免指向已移除的页签
- 金额格式化函数以现有实现为准（如 `formatEuro`/`formatMoney`），避免命名不一致导致编译错误
- 现金/银行卡比例为避免四舍五入合计不等于 100，建议 `bankRatio = 100 - cashRatio`
- 分类名称为空时显示“未分类”，并限制显示最多 2 行，避免挤压金额
- UI Fallback：关键数值缺失时显示 `0` 或 `€0.00`，不留空白
- 不依赖 Context7 网络检索，直接参考本地 `components/reports-view.tsx` 与现有 shadcn/ui

## Scope
- In: `components/features/daily-closure/DailyClosureManagement.tsx` 的总览 KPI 重构、Tabs 精简、分类营业额汇总展示
- Out: 报表页与导出逻辑不变；API/DB 无新增字段或端点；不显示单品明细、不增加筛选排序；入账拆分页签保留

## UX Notes

### KPI 卡片设计
- 卡片数量：4 张，顺序固定为 **营业额 → 订单数 → 客单价 → 现金 vs 银行**
- 样式参考 `components/reports-view.tsx` 的 KPI 卡片：
  - 左侧：标签 + 数值 + 辅助信息
  - 右侧：图标容器（`w-12 h-12 bg-primary/10 rounded-lg`）
  - 图标：营业额用 `DollarSign`，订单数用 `ShoppingBag`，客单价用 `Users`，现金 vs 银行用 `CreditCard`
- 保持现有 grid 布局：`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- 保持 Skeleton 加载状态处理
- UI Fallback：数值无数据时显示 `0` 或 `€0.00`

### 含税/不含税切换
- 移除 `ToggleGroup`（含税/不含税切换），仅显示含税数据
- 移除 `taxView` 状态及相关逻辑
- 营业额、客单价直接使用 `grossRevenue` 和 `averageOrderValueGross`

### 现金 vs 银行卡片
- 显示比例：`现金% / 银行%`（如 `60% / 40%`）
- 显示金额：`€现金 / €银行`（辅助信息行）
- 计算逻辑：
  ```typescript
  const cashTotal = data?.payments.cashActualTotal ?? 0
  const bankTotal = data?.payments.nonCashActualTotal ?? 0
  const total = cashTotal + bankTotal
  const cashRatio = total > 0 ? Math.round((cashTotal / total) * 100) : 0
  const bankRatio = total > 0 ? 100 - cashRatio : 0
  ```

### Tabs 精简
- 移除"菜品明细"页签（`items`）
- 移除"锁账与导出"页签（`lock`）
- 保留"总览"（`overview`）和"入账拆分"（`payments`）

### 菜品分类汇总
- 位置：总览 KPI 卡片下方
- 展示内容：分类名称 + 营业额（如 `appetizer  €90.00`）
- 排序：按营业额降序
- 聚合逻辑：
  ```typescript
  const categoryRevenue = useMemo(() => {
    const lines = data?.items.lines ?? []
    const map = new Map<string, number>()
    lines.forEach((line) => {
      const current = map.get(line.category) ?? 0
      map.set(line.category, current + line.revenueAmount)
    })
    return Array.from(map.entries())
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [data?.items.lines])
  ```
- 使用 `Card` + `ScrollArea`（高度约 `h-[200px]`）
- 空状态：显示"暂无分类数据"
- 分类名称为空时显示“未分类”
- 分类名称最多显示 2 行，金额单行右对齐

## API / DB
- API: 无新增/改动，继续使用 `GET /api/daily-closure`
- DB: 无变更

## Workflow
1. 设计 → 2. Schema/Migration（不涉及） → 3. UI → 4. API（不涉及） → 5. 联调 → 6. 种子/文档（不涉及） → 7. 验收

## Acceptance Criteria
- [ ] 仅显示"含税"，移除"不含税"切换（ToggleGroup 及 taxView 状态）
- [ ] KPI 卡片为 4 张，顺序为营业额、订单数、客单价、现金 vs 银行
- [ ] KPI 卡片样式对齐报表页（含图标、布局结构、Skeleton 处理）
- [ ] 现金 vs 银行显示比例（%）与金额（€）
- [ ] "锁账与导出"页签移除
- [ ] "菜品明细"页签移除
- [ ] KPI 下方展示菜品分类 + 营业额汇总（按营业额降序）
- [ ] 分类汇总无数据时显示空状态文案
- [ ] UI Fallback：关键数值缺失时显示 `0` 或 `€0.00`
- [ ] 分类名称最多 2 行显示，金额不换行
- [ ] 页面尺寸与布局保持一致（grid 断点不变）
- [ ] 加载状态（Skeleton）正常显示
- [ ] 错误状态正常显示
- [ ] 响应式布局正常（md/lg 断点）
- [ ] 无 API/DB 变更

## 任务清单（Tasks）

### Task 1: 移除含税/不含税切换
**预计时间**: 0.5 小时
**依赖**: 无

**AI 提示词**:
你是一位资深前端工程师。请在 `components/features/daily-closure/DailyClosureManagement.tsx` 中完成以下改动：

1. 移除 `taxView` 状态（`useState<"gross" | "net">("gross")`）
2. 移除 `ToggleGroup` 组件及其相关 UI（含税/不含税切换）
3. 将 `revenue` 和 `averageOrderValue` 直接使用含税值：
   - `revenue = data?.overview.grossRevenue ?? 0`
   - `averageOrderValue = data?.overview.averageOrderValueGross ?? 0`
4. 移除 KPI 卡片标签中的 `（含税）`/`（不含税）` 动态文案，统一显示为固定标签

请保持现有的错误处理和加载状态逻辑不变。

---

### Task 2: 重构 KPI 卡片样式对齐报表页
**预计时间**: 1.5 小时
**依赖**: Task 1

**AI 提示词**:
你是一位资深前端工程师。请直接参考本地 `components/reports-view.tsx` 与现有 shadcn/ui 组件实现，不依赖联网检索。

请在 `components/features/daily-closure/DailyClosureManagement.tsx` 中重构 KPI 卡片，参考 `components/reports-view.tsx` 的样式：

1. 从 `lucide-react` 导入图标：`DollarSign`, `ShoppingBag`, `Users`, `CreditCard`
2. KPI 卡片改为 4 张，顺序为：营业额、订单数、客单价、现金 vs 银行
3. 移除"退款金额"和"作废金额"卡片
4. 每张卡片结构参考报表页：
   ```tsx
   <Card className="p-6 bg-card border-border">
     <div className="flex items-start justify-between">
       <div className="space-y-2">
         <p className="text-sm text-muted-foreground">{标签}</p>
         <div className="text-2xl font-bold text-foreground">
           {isLoading ? <Skeleton className="h-8 w-24" /> : 数值}
         </div>
         <div className="flex items-center gap-1">
           {辅助信息}
         </div>
       </div>
       <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
         <Icon className="w-6 h-6 text-primary" />
       </div>
     </div>
   </Card>
   ```
5. 现金 vs 银行卡片：
   - 主数值：`{cashRatio}% / {bankRatio}%`
   - 辅助信息：`€{cashAmount} / €{bankAmount}`
   - 计算逻辑：
     ```typescript
     const cashTotal = data?.payments.cashActualTotal ?? 0
     const bankTotal = data?.payments.nonCashActualTotal ?? 0
     const total = cashTotal + bankTotal
     const cashRatio = total > 0 ? Math.round((cashTotal / total) * 100) : 0
     const bankRatio = total > 0 ? 100 - cashRatio : 0
     ```
6. 保持 grid 布局：`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
7. 使用现有的金额格式化函数（如 `formatEuro`/`formatMoney`）格式化金额
8. 数值缺失时显示 `0` 或 `€0.00`

---

### Task 3: 移除页签并精简 Tabs
**预计时间**: 0.5 小时
**依赖**: Task 2

**AI 提示词**:
你是一位资深前端工程师。请在 `components/features/daily-closure/DailyClosureManagement.tsx` 中完成以下改动：

1. 移除 Tabs 中的"菜品明细"页签（`value="items"`）及其 `TabsContent`
2. 移除 Tabs 中的"锁账与导出"页签（`value="lock"`）及其 `TabsContent`
3. 保留"总览"（`value="overview"`）和"入账拆分"（`value="payments"`）
4. 更新 `TabsList` 的 grid 布局：`grid-cols-2`（原为 `grid-cols-4`）
5. 清理无用的状态和变量：
   - 移除 `categoryFilter` 状态
   - 移除 `sortBy` 状态
   - 移除 `filteredItems` useMemo
6. 确保 `Tabs` 的 `defaultValue` 或受控 `value` 指向 `overview`

---

### Task 4: 添加菜品分类营业额汇总
**预计时间**: 1 小时
**依赖**: Task 3

**AI 提示词**:
你是一位资深前端工程师。请直接参考本地 shadcn/ui 组件实现，不依赖联网检索。

请在 `components/features/daily-closure/DailyClosureManagement.tsx` 的总览页签（`TabsContent value="overview"`）中，在 KPI 卡片下方添加菜品分类营业额汇总：

1. 添加 `categoryRevenue` useMemo 计算分类汇总：
   ```typescript
   const categoryRevenue = useMemo(() => {
     const lines = data?.items.lines ?? []
     const map = new Map<string, number>()
     lines.forEach((line) => {
       const current = map.get(line.category) ?? 0
       map.set(line.category, current + line.revenueAmount)
     })
     return Array.from(map.entries())
       .map(([category, revenue]) => ({ category, revenue }))
       .sort((a, b) => b.revenue - a.revenue)
   }, [data?.items.lines])
   ```

2. 在 KPI grid 下方添加分类汇总卡片：
   ```tsx
   <Card className="bg-card border-border">
     <div className="p-4 border-b border-border">
       <h2 className="text-lg font-semibold text-foreground">菜品分类营业额</h2>
     </div>
     <ScrollArea className="h-[200px]">
       <div className="p-4 space-y-2">
         {categoryRevenue.length === 0 ? (
           <p className="text-sm text-muted-foreground">暂无分类数据</p>
         ) : (
           categoryRevenue.map(({ category, revenue }) => (
             <div key={category} className="flex items-start justify-between gap-3 py-2">
               <span className="text-sm text-foreground line-clamp-2 break-words leading-5 flex-1 min-w-0">
                 {category || "未分类"}
               </span>
               <span className="text-sm font-medium text-foreground whitespace-nowrap">
                 {formatMoney(revenue)}
               </span>
             </div>
           ))
         )}
       </div>
     </ScrollArea>
   </Card>
   ```

3. 确保加载状态时显示 Skeleton：
   ```tsx
   {query.isLoading ? (
     <Card className="bg-card border-border">
       <div className="p-4 border-b border-border">
         <Skeleton className="h-6 w-32" />
       </div>
       <div className="p-4 space-y-2">
         {Array.from({ length: 4 }).map((_, idx) => (
           <div key={idx} className="flex items-center justify-between py-2">
             <Skeleton className="h-4 w-24" />
             <Skeleton className="h-4 w-16" />
           </div>
         ))}
       </div>
     </Card>
   ) : (
     // 分类汇总卡片
   )}
   ```
4. 分类名称最多 2 行显示，金额右对齐单行不换行
5. 使用现有金额格式化函数（如 `formatEuro`/`formatMoney`），数据缺失时金额显示 `€0.00`

---

### Task 5: 验收与回归测试
**预计时间**: 0.5 小时
**依赖**: Task 4

**AI 提示词**:
你是一位资深前端工程师。请对日结页面进行验收测试：

1. 启动开发服务器：`pnpm dev`
2. 访问日结页面，验证以下内容：
   - [ ] 无含税/不含税切换
   - [ ] KPI 卡片为 4 张，顺序正确（营业额、订单数、客单价、现金 vs 银行）
   - [ ] KPI 卡片样式与报表页一致（含图标）
   - [ ] 现金 vs 银行显示比例与金额
   - [ ] 仅有"总览"和"入账拆分"两个页签
   - [ ] 分类营业额汇总显示正确（按营业额降序）
   - [ ] 分类名称最多 2 行显示，金额不换行
   - [ ] 数值缺失时显示 `0` 或 `€0.00`
   - [ ] 加载状态（Skeleton）正常
   - [ ] 错误状态正常
   - [ ] 响应式布局正常（调整浏览器宽度测试 md/lg 断点）
3. 运行现有测试确保无回归：`pnpm test:run`
4. 如有测试失败，修复相关测试用例

## Links
- `components/features/daily-closure/DailyClosureManagement.tsx`
- `components/reports-view.tsx`（KPI 样式参考）
- `app/daily-closure/page.tsx`
- `lib/queries/use-daily-closure.ts`
- `lib/money.ts`（formatMoney 函数）
- `types/api.ts`（DailyClosureResponse 类型）
- `doc/guides/nextjs.instructions.md`
- `doc/guides/nextjs-tailwind.instructions.md`
