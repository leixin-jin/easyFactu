# 报表页面完善（report_improvements）验收清单

## 最小验证命令
- `pnpm lint`
- `pnpm test:run`

## 功能验收（UI）
- 默认粒度为「本月」，切换「本日/本周/本月/本年」会刷新 KPI / 趋势图 / 热销菜品。
- KPI 卡片仍为 4 张：包含「现金 vs 银行」且不再包含「平均翻台时长」。
- Tabs 仅保留「销售趋势 / 热销菜品」，不存在「高峰时段」。
- 热销菜品列表每条展示 `category`（分类）。
- 销售趋势为折线图，金额 tooltip 与坐标轴显示正常；无数据时显示空态但不撑破布局。

## 功能验收（API）
- `GET /api/reports?granularity=day|week|month|year` 返回：
  - `range` 含 `startAt/endAt` 且口径为 `[startAt, endAt)`
  - `kpis` 含 `grossRevenue/ordersCount/averageOrderValueGross/cashAmount/bankAmount/cashRatio/bankRatio`
  - `salesTrend` bucket 聚合随粒度变化
  - `topItems` 含 `name/category/quantitySold/revenueAmount`

## 导出验收（xlsx）
- 在报表页点击「导出报表」会下载 `.xlsx` 文件，文件名包含粒度与日期信息。
- Excel 至少包含 `Summary` / `SalesTrend` / `TopItems` 三个 sheet，且 `TopItems` 包含 `category`。
