# 人员模块简化（功能模板 · 任务驱动）

- ID: staff_simplification
- Owner: Codex Agent
- Status: proposed

## Summary
彻底移除“人员”相关的前端页面、组件与数据库表，仅保留其余功能（尤其是菜单/菜品分类及桌台等 UI）现有的布局与尺寸不变，确保系统只展示菜品与运营所需的数据。

## Scope
- In: 删除 `app/staff/page.tsx` 与 `components/staff-management.tsx`，并确保 `DashboardLayout` 不再暴露“人员”导航；清理 `hooks/useRestaurantTables.ts`, `components/table-management.tsx` 等位置中与员工/服务员相关的字段或示例数据；移除 Drizzle `staff` 表、`staff_status` 枚举与 `orders.staff_id`、`restaurant_tables.waiter_id` 外键；同步删除 `seed/staff.csv` 以及任何引用员工列的种子文件；对全仓做一次 `rg` 自检，确保剩余代码仅保留结构化菜单/桌台逻辑。
- Out: 不调整 POS、菜单、财务等页面的 UI 尺寸与布局（尤其是菜品分类区域）；不新增新的业务逻辑或数据模型；不处理运行环境与部署配置。

## UX Notes
- 侧边栏宽度与卡片布局保持不变，仅从 `components/dashboard-layout.tsx` 中移除“人员”项，保证其他导航仍然均匀排列。
- 删除 `app/staff` 路由后无需添加占位页，访问 `/staff` 应返回 Next.js 默认 404。
- 任何涉及桌台或菜单的卡片/表格尺寸、响应式断点以及按钮排列均不得变化，移除“服务员”标签或列时维持现有网格与留白。

## API / DB
- API: 当前 API 未直接依赖人员数据，无需新增端点，但需要确认 `app/api/restaurant-tables`、`app/api/orders` 不再引用 `staff_id`。
- DB: 
  - 删除 `staff_status` 枚举、`staff` 表以及 `orders.staff_id`、`restaurant_tables.waiter_id` 外键与索引。
  - 更新 `db/schema.ts`、`drizzle/meta`/`*.json` 快照，并生成新的迁移（示例：`pnpm drizzle:generate`）后 `pnpm drizzle:push`。
  - 删除或调整 `seed/staff.csv` 与 `seed/restaurant_tables.csv`（去掉 `waiter_id` 列），并在 PR 中说明无需导入员工数据。

## Workflow
1. 需求对齐：确认仅保留菜品/桌台等必要 UI，不引入新布局。
2. 前端删除：移除 `app/staff` 与对应组件、导航、hooks 中的员工字段。
3. Schema/Migration：更新 `db/schema.ts` 与生成迁移清理 `staff` 表及外键。
4. 种子/文档：同步删除种子文件及 README/指南中的人员引用。
5. 自测与验证：`rg "staff"` 检查、`pnpm lint` or `pnpm build` 作为最小验证。

## Acceptance Criteria
- [ ] `app/staff/page.tsx` 与 `components/staff-management.tsx` 被移除，`DashboardLayout` 中不再展示“人员”导航，其他页面布局尺寸保持原样。
- [ ] 仓库中不再存在 TypeScript/SQL 层面的 `staff`/`waiter_id` 等引用，相关 hooks/组件的 TypeScript 类型同步更新。
- [ ] 新的 Drizzle 迁移成功删除 `staff` 相关表、枚举与外键，`pnpm drizzle:generate && pnpm drizzle:push` 运行通过，`db/schema.ts` 与数据库结构一致。
- [ ] `seed/` 内不再包含员工数据，文档说明与 `rg` 自检均确认仓库只展示菜品/桌台等内容，`pnpm lint` 通过。

## 任务清单（Tasks）

### Task 1: 移除人员路由与界面
**预计时间**: 1.0小时  
**依赖**: 无

**AI 提示词**:  
你是一位资深 Next.js + Tailwind 工程师。请删除 `app/staff/page.tsx` 与 `components/staff-management.tsx`，并确保没有其他文件再引用这些模块。保留其余页面的排版尺寸不变。完成后以 `rg "StaffManagement"` 验证无残留。必要时查阅 Next.js App Router 最新规范（use context7）。

### Task 2: 清理共享 UI 中的人员引用
**预计时间**: 1.5小时  
**依赖**: Task 1

**AI 提示词**:  
你是一位熟悉 React hooks 的前端工程师。请从 `components/dashboard-layout.tsx` 中移除“人员”导航项，并检查 `hooks/useRestaurantTables.ts`、`components/table-management.tsx` 等组件，删除 `waiter`/员工相关字段或假数据，确保对象结构与 `/api/restaurant-tables` 响应一致且不会影响现有网格尺寸。必要时参考 Next.js + Tailwind 指南（use context7）。

### Task 3: 清理 Drizzle Schema 与生成迁移
**预计时间**: 2.0小时  
**依赖**: Task 2

**AI 提示词**:  
你是一位熟悉 Drizzle ORM 的后端工程师。请在 `db/schema.ts` 中删除 `staff_status` 枚举、`staff` 表、`orders.staffId` 与 `restaurantTables.waiterId`。生成新的迁移以 `DROP TABLE staff`、删除相关列和外键，并更新 `drizzle/meta/*.json`。运行 `pnpm drizzle:generate && pnpm drizzle:push`，确保数据库结构与代码一致。如需查阅 Drizzle/Next.js 细节，请 use context7。

### Task 4: 更新种子与仓库检查
**预计时间**: 1.0小时  
**依赖**: Task 3

**AI 提示词**:  
你是一位注重数据一致性的全栈工程师。删除 `seed/staff.csv`，并从 `seed/restaurant_tables.csv` 中去除 `waiter_id` 列，同时更新任何 README/指南中提到人员数据的段落。执行 `rg "staff"`/`rg "waiter"` 确认代码中无相关引用，最后运行 `pnpm lint` 验证。必要时 use context7 参考项目指南。

## Links
- `../../guides/README.md`
- `../../guides/nextjs.instructions.md`
- `../../guides/nextjs-tailwind.instructions.md`
