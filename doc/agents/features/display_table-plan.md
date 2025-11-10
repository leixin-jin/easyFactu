# Display Restaurant Tables

- ID: display-tables
- Owner: <name>
- Status: proposed

## Summary
从 Supabase（Postgres）中的 `restaurant_tables` 表读取数据，并在现有页面与组件结构下展示。严格遵循：不修改 `app/tables/page.tsx` 的页面结构；前端以现有组件 `components/table-management.tsx` 为主体渲染，数据有几条就展示几张（5 条 = 5 张，10 条 = 10 张）。

## Scope
- In:
  - 页面：`app/tables/page.tsx`（不得修改结构；如需，仅允许补极小型调用说明/导入保持一致）
  - UI 组件：仅使用并改造 `components/table-management.tsx`（替换内置 mock 为真实数据）
  - API：`app/api/restaurant-tables/route.ts`（GET，只读）
  - DB：`db/schema.ts` 中 `restaurant_tables` 的 Drizzle 映射确认
- Out:
  - 不新增其它 UI 组件（如 `components/Tables/*`）
  - 不改动页面路由与布局结构
  - 不涉及创建/编辑/删除桌台、权限与实时订阅

## UX Notes
- 沿用 `components/table-management.tsx` 现有布局与交互（筛选、统计、网格/列表切换等）。
- 将“数据源”由 mock 替换为 API 返回；空/错/加载态需友好且不跳闪。

## API / DB
- API:
  - `GET /api/restaurant-tables`：返回 `restaurant_tables` 的行数组（仅必要字段）。
  - 响应示例：
    ```json
    [
      {"id": "uuid", "number": "A-01", "capacity": 4, "status": "idle", "area": "大厅A区"}
    ]
    ```
- DB:
  - 读取 Supabase 表 `restaurant_tables`。
  - 确认 `db/schema.ts` 映射：`id`, `number`, `capacity?`, `status?`, `area?`。
  - 若需结构变更：`pnpm drizzle:generate && pnpm drizzle:push`（变更需在 PR 说明）。

## Workflow
1. 设计 → 2. Schema/确认 → 3. API → 4. 组件改造 → 5. 联调 → 6. 文档 → 7. 验收

## Acceptance Criteria
- [ ] `components/table-management.tsx` 由 API 数据驱动，移除 mock（或在失败时回退）。
- [ ] `/tables` 页面不改结构即可渲染 N 条= N 卡片。
- [ ] 具备空/加载/错误态与最小日志；不泄露敏感字段。
- [ ] 文档与代码路径一致。

## 任务清单（≤2 小时/任务，独立可提交）

参考规范（开始前阅读）：
- Next.js: `../../guides/nextjs-best-practices.md`
- Next.js + Tailwind: `../../guides/nextjs-tailwind-best-practices.md`

### Task 1: 确认/补充 `restaurant_tables` 的 Drizzle 映射
**预计时间**: 0.5–1 小时
**依赖**: 无

**AI 提示词**:
你是一位资深全栈工程师（Next.js + Drizzle + Supabase）。请先阅读：
- `doc/guides/nextjs-best-practices.md`
- `doc/guides/nextjs-tailwind-best-practices.md`

目标：在不更改数据库结构前提下，确认/补充 `db/schema.ts` 中 `restaurant_tables` 的映射。如与实际表存在差异，以实际表为准。

要求：
- 字段至少：`id`, `number`, `capacity?`, `status?`, `area?`。
- 不创建迁移；如需结构变更，在 PR 说明并执行 `pnpm drizzle:generate && pnpm drizzle:push`。

关键字：ultrathink, use context7（查阅 Drizzle 文档）。

---

### Task 2: 实现只读 API `GET /api/restaurant-tables`
**预计时间**: 1 小时
**依赖**: Task 1

**AI 提示词**:
你是一位资深 Next.js API 工程师。请先阅读 `doc/guides/nextjs-best-practices.md`。use context7。

目标：新增 `app/api/restaurant-tables/route.ts`，读取 `restaurant_tables` 并返回最小字段 JSON 数组。

要求：
- 使用项目现有 Drizzle 连接（`DATABASE_URL`）。
- 返回字段：`id`, `number`, `capacity?`, `status?`, `area?`。
- 处理错误并返回合适状态码；记录日志。

输出：`app/api/restaurant-tables/route.ts`。

---

### Task 3: 改造 `components/table-management.tsx` 用 API 数据
**预计时间**: 1–1.5 小时
**依赖**: Task 2

**AI 提示词**:
你是一位资深 Next.js + Tailwind 前端工程师。请认真通读并理解 `components/table-management.tsx` 现有代码与 UI。开始前阅读：
- `doc/guides/nextjs-best-practices.md`
- `doc/guides/nextjs-tailwind-best-practices.md`

目标：将组件内的 `mockTables` 替换为来自 `GET /api/restaurant-tables` 的数据源，保持现有 UI/交互不变，不修改 `app/tables/page.tsx` 的结构。

要求：
- 使用 `useEffect`/`fetch` 或 SWR 从 `/api/restaurant-tables` 拉取数据；提供 loading/错误/空态处理。
- 将返回数据映射到本组件 `Table` 类型所需字段（缺省字段以安全回退显示）。
- 统计、筛选与渲染逻辑均基于实时数据（N 条= N 卡片）。
- 保持导出签名不变：`export function TableManagement()`。

输出：仅修改 `components/table-management.tsx`，不引入新目录结构。

关键字：ultrathink, use context7（如需查阅 SWR/数据获取最佳实践）。

---

### Task 4: 联调与空/错/加载体验完善
**预计时间**: 0.5–1 小时
**依赖**: Task 3

**AI 提示词**:
你是一位资深前端工程师。阅读 `doc/guides/nextjs-best-practices.md`。use context7。

目标：完善 `table-management` 的加载 Skeleton、错误提示与重试（轻量客户端逻辑）。

要求：
- 错误时提示用户并可重试（`router.refresh()` 或重新拉取）。
- 空态清晰可见，不与最终内容跳闪。

输出：更新 `components/table-management.tsx`。

---

### Task 5: 文档与验收
**预计时间**: 0.5 小时
**依赖**: Task 4

**AI 提示词**:
你是一位严谨的文档维护者。请更新本功能验收记录并在 PR 中附带截图（API 响应与页面效果：5 条=5 卡片），标注依赖、运行步骤与注意事项。

输出：更新本文件“Acceptance Criteria”勾选项与 Links 区域。

## Links
- 规范与参考：
  - `../../guides/nextjs-best-practices.md`
  - `../../guides/nextjs-tailwind-best-practices.md`
- 相关代码：
  - `components/table-management.tsx`
  - `app/tables/page.tsx`
  - `app/api/restaurant-tables/route.ts`
  - `db/schema.ts`

