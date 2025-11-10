# Display Restaurant Tables

- ID: display-tables
- Owner: <name>
- Status: proposed

## Summary
在 Next.js 应用中新增“桌台列表”页面，从 Supabase（Postgres）中的 `restaurant_tables` 表读取数据并展示。数据有几条就展示几张卡片（如 5 条显示 5 张），并提供基础的空/错/加载态。后端提供只读 API 以供前端获取。

## Scope
- In: 
  - 前端页面：`app/tables/page.tsx`
  - UI 组件：`components/Tables/TableGrid.tsx`、`components/Tables/TableCard.tsx`
  - 后端 API：`app/api/restaurant-tables/route.ts`（GET）
  - 与 `db/schema.ts` 的 Drizzle 映射（如需）
- Out:
  - 不涉及创建/编辑/删除桌台的后台管理
  - 不涉及权限、登录与复杂状态流转
  - 不涉及实时订阅或消息推送

## UX Notes
- 页面：标题“桌台列表”，网格卡片布局，卡片显示：桌台编号/名称、可选的容纳人数与状态（available/occupied 等）。
- 空状态：无数据时展示插图与“暂无桌台”。
- 错误状态：请求失败时给出错误提示并可重试。
- 加载状态：骨架屏或 Spinner。

## API / DB
- API:
  - `GET /api/restaurant-tables`：返回 `restaurant_tables` 的行数组。
  - 响应示例（字段以实际表为准）：
    ```json
    [
      {"id": 1, "name": "A1", "capacity": 4, "status": "available"},
      {"id": 2, "name": "A2", "capacity": 2, "status": "occupied"}
    ]
    ```
- DB:
  - 读取 Supabase 数据库表 `restaurant_tables`。
  - 若需在 `db/schema.ts` 中新增 Drizzle 映射（不一定需要迁移）：
    - 建议最小字段：`id`（主键）、`name`/`number`、`capacity?`、`status?`。
    - 如需变更数据库结构，请在 PR 中说明并使用：`pnpm drizzle:generate && pnpm drizzle:push`。
  - 如需种子数据，请更新 `seed/` 并在 PR 中说明。

## Workflow
1. 设计 → 2. Schema/Migration → 3. UI → 4. API → 5. 联调 → 6. 种子/文档 → 7. 验收

## Acceptance Criteria
- [ ] 页面成功渲染来自 `restaurant_tables` 的数据，N 条记录渲染 N 张卡片。
- [ ] 支持空、加载、错误状态，用户体验清晰。
- [ ] API 使用 Drizzle 或等效方式读取 Postgres（Supabase）并返回 JSON。
- [ ] 不额外泄露敏感字段；响应时间可接受，并具备基本日志。
- [ ] 文档（本文件）与代码路径一致，可直接交付。

## 任务清单（≤2 小时/任务，独立可提交）

参考规范（在开始前阅读）：
- Next.js: `../../guides/nextjs-best-practices.md`
- Next.js + Tailwind: `../../guides/nextjs-tailwind-best-practices.md`

### Task 1: 确认/补充 `restaurant_tables` 的 Drizzle 映射
**预计时间**: 1 小时  
**依赖**: 无

**AI 提示词**:
你是一位资深的全栈工程师（Next.js + Drizzle + Supabase）。请先阅读：
- `doc/guides/nextjs-best-practices.md`
- `doc/guides/nextjs-tailwind-best-practices.md`

目标：在不更改数据库结构的前提下，为 Supabase 中已存在的 `restaurant_tables` 表在 `db/schema.ts` 中补充/确认 Drizzle 映射（仅映射，不迁移）。如字段与示例不一致，请以实际库表为准。

要求：
- 在 `db/schema.ts` 中新增（或确认）`restaurantTables` 映射，字段至少包含：`id`（主键）、`name`/`number`、`capacity?`、`status?`。
- 不创建迁移；若确需变更结构，先在 PR 说明并使用 `pnpm drizzle:generate && pnpm drizzle:push`。
- 提交修改后给出简短说明。

关键字：ultrathink, use context7（如需查阅 Drizzle 文档）。

---

### Task 2: 实现 API 路由 `GET /api/restaurant-tables`
**预计时间**: 1 小时  
**依赖**: Task 1

**AI 提示词**:
你是一位资深的 Next.js API 工程师。请先阅读：
- `doc/guides/nextjs-best-practices.md`

目标：新增 `app/api/restaurant-tables/route.ts`，实现 `GET` 读取 `restaurant_tables` 并返回 JSON 数组。

要求：
- 使用项目现有的 Drizzle 连接（`DATABASE_URL`），从 `restaurant_tables` 读取数据。
- 响应仅返回必要字段（`id`, `name`/`number`, `capacity?`, `status?`）。
- 处理错误并返回合适的状态码；记录错误日志。

输出：`app/api/restaurant-tables/route.ts`。

关键字：use context7（如需查阅 Next.js App Router API Routes 或 Drizzle 文档）。

---

### Task 3: Scaffold 前端页面 `app/tables/page.tsx`
**预计时间**: 1 小时  
**依赖**: Task 2

**AI 提示词**:
你是一位资深的 Next.js + Tailwind 前端工程师。请先阅读：
- `doc/guides/nextjs-best-practices.md`
- `doc/guides/nextjs-tailwind-best-practices.md`

目标：创建 `app/tables/page.tsx`（Server Component 优先），请求 `GET /api/restaurant-tables` 显示桌台列表。

要求：
- SSR 获取数据并渲染；提供加载与空状态占位。
- 页面包含标题与说明；使用响应式网格布局。
- 将展示逻辑抽离到组件（参考 Task 4）。

输出：`app/tables/page.tsx`。

关键字：ultrathink, use context7（如需查阅 Next.js 数据获取与 Server Components 文档）。

---

### Task 4: 封装 UI 组件（TableGrid / TableCard）
**预计时间**: 1 小时  
**依赖**: Task 3

**AI 提示词**:
你是一位资深的 Tailwind/组件工程师。请先阅读：
- `doc/guides/nextjs-tailwind-best-practices.md`

目标：在 `components/Tables/` 下创建：
- `TableGrid.tsx`：接收 `tables` 数组并按网格渲染。
- `TableCard.tsx`：展示单个桌台信息（名称/编号、capacity、状态颜色）。

要求：
- 样式遵循 Tailwind 规范；保持无障碍（aria/role）。
- 空数组时在 `TableGrid` 内部渲染空态文案。

输出：`components/Tables/TableGrid.tsx`, `components/Tables/TableCard.tsx`。

关键字：use context7（如需查阅 Tailwind 组件规范或 A11y 资料）。

---

### Task 5: 错误与加载体验完善
**预计时间**: 0.5–1 小时  
**依赖**: Task 3

**AI 提示词**:
你是一位资深前端工程师。请先阅读：
- `doc/guides/nextjs.instructions.md`
- `doc/guides/nextjs-tailwind.instructions.md`

目标：为 `app/tables/page.tsx` 与组件增加加载骨架、错误提示与简单重试逻辑（客户端轻量交互可选）。

要求：
- 在 API 报错时给出用户友好的提示。
- Loading Skeleton 与空态清晰，不与最终内容跳闪。

输出：更新 `app/tables/page.tsx` 与相关组件。

关键字：use context7（如需查阅 Next.js 加载/错误处理文档）。

## Links
- 规范与参考：
  - `../../guides/nextjs-best-practices.md`
  - `../../guides/nextjs-tailwind-best-practices.md`
- 相关 Issue / PR / 设计稿 / 讨论记录：TBD

