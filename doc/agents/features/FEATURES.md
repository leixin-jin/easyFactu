# Features Index

使用方法
- 新建功能文档：复制模板到 features 目录
  - `cp doc/agents/template/features/feature.md doc/agents/features/<slug>.md`
- 在本文件追加链接到新功能说明，或直接在下方的“Run: <Feature>”中列出任务供 Codex 执行。

功能文档索引
- [Display Restaurant Tables](doc/agents/features/display_table-plan.md)
- [Display Menu Items](doc/agents/features/display_menu_items-PLAN.md)

---

# Run: Display Restaurant Tables

说明
- 目标：读取 Supabase 表 `restaurant_tables`，实现只读 API，并在不改动页面结构的前提下，让 `components/table-management.tsx` 用真实数据渲染 N 条= N 卡片。
- 阅读规范：`doc/guides/nextjs-best-practices.md`、`doc/guides/nextjs-tailwind-best-practices.md`
- 参考功能说明：`doc/agents/features/display_table-plan.md`

注意
- 不修改 `app/tables/page.tsx` 的结构；前端仅改造 `components/table-management.tsx`。
- 每个任务独立、≤2 小时、可直接提交。
- 复杂任务提示词内含 `ultrathink`；需要参考文档时含 `use context7`。

### Task 1: 确认/补充 `restaurant_tables` 的 Drizzle 映射
**预计时间**: 0.5–1小时
**依赖**: 无

**AI 提示词**:
你是一位资深的全栈工程师（Next.js + Drizzle + Supabase）。ultrathink use context7。
开始前请阅读：
- `doc/guides/nextjs-best-practices.md`
- `doc/guides/nextjs-tailwind-best-practices.md`

请在不更改数据库结构的前提下，针对 Supabase 中已存在的 `restaurant_tables` 表，在 `db/schema.ts` 中补充/确认 Drizzle 映射（仅映射，不迁移）。字段以实际数据库为准，建议包含：`id`（主键）、`number`, `capacity?`, `status?`, `area?`。
- 如果确需结构变更，请在 PR 说明并使用：`pnpm drizzle:generate && pnpm drizzle:push`；否则不创建迁移。
- 输出：更新 `db/schema.ts` 并给出简短变更说明。

### Task 2: 实现 API `GET /api/restaurant-tables`
**预计时间**: 1小时
**依赖**: Task 1

**AI 提示词**:
你是一位资深的 Next.js API 工程师。ultrathink use context7。
请阅读 `doc/guides/nextjs-best-practices.md` 后，新增/完善 `app/api/restaurant-tables/route.ts`，实现 `GET` 读取 `restaurant_tables` 并返回 JSON 数组。
- 使用项目现有的 Drizzle 连接（`DATABASE_URL`）。
- 仅返回必要字段（`id`, `number`, `capacity?`, `status?`, `area?`）。
- 处理错误并返回合适状态码；记录错误日志。
- 输出：`app/api/restaurant-tables/route.ts`。

### Task 3: 改造 `components/table-management.tsx` 用 API 数据
**预计时间**: 1–1.5小时
**依赖**: Task 2

**AI 提示词**:
你是一位资深的 Next.js + Tailwind 前端工程师。ultrathink use context7。
请认真阅读 `components/table-management.tsx` 的现有实现，保持导出签名与 UI 交互不变，将组件内的 `mockTables` 替换为从 `/api/restaurant-tables` 拉取的真实数据：
- 使用 `useEffect` + `fetch`（或 SWR）请求 `/api/restaurant-tables`；提供 loading/错误/空态处理。
- 将返回数据映射为本组件 `Table` 类型所需字段（缺失字段做安全回退）。
- 所有筛选、统计与渲染逻辑基于实时数据（N 条= N 卡片）。
- 严禁改动 `app/tables/page.tsx` 的结构。
- 输出：仅修改 `components/table-management.tsx`。

### Task 4: 完善加载/错误与重试体验（组件内）
**预计时间**: 0.5–1小时
**依赖**: Task 3

**AI 提示词**:
你是一位资深前端工程师。use context7。
请在 `components/table-management.tsx` 内完善：
- Loading Skeleton（保持布局稳定）
- 错误提示与“重试”逻辑（重新拉取）
- 空态文案与可访问性（aria/role）
- 输出：更新 `components/table-management.tsx`。

### Task 5: 文档与验收
**预计时间**: 0.5小时
**依赖**: Task 4

**AI 提示词**:
你是一位严谨的文档维护者。请更新 `doc/agents/features/display_table-plan.md` 的验收记录：
- 勾选 AC；在 PR 中附 `/api/restaurant-tables` 响应截图与 `/tables` 页面渲染（5 条=5 卡片）
- 简述运行步骤与注意事项（`.env.local`、SSL 等）

## Links
- 功能说明：`doc/agents/features/display_table-plan.md`
- 规范：
  - `doc/guides/nextjs-best-practices.md`
  - `doc/guides/nextjs-tailwind-best-practices.md`
- 模板：`doc/agents/template/features/feature.md`

---

# Run: Display Menu Items

说明
- 目标：读取 Supabase 表 `menu_items`，实现只读 API，并在不改动页面尺寸/布局的前提下，让 `components/menu-management.tsx` 用真实数据按“分类 → 菜品”展示；分类数量与每类菜品数量与数据库一致。
- 阅读规范：`doc/guides/nextjs.instructions.md`、`doc/guides/nextjs-tailwind.instructions.md`
- 参考功能说明：`doc/agents/features/display_menu_items-PLAN.md`

注意
- 不修改 `app/menu/page.tsx` 的结构与尺寸；前端仅改造 `components/menu-management.tsx` 的数据来源。
- 保留“全部”分类；分类计数来自 items 聚合；仅显示 `available=true`。
- 每个任务独立、≤2 小时、可直接提交；提示词包含 `use context7`（必要时查阅文档）。

### Task 1: 新增 API `GET /api/menu-items`
**预计时间**: 0.5–1 小时  
**依赖**: 无

**AI 提示词**:
你是一位资深 Next.js + Drizzle 工程师。ultrathink use context7。
开始前阅读：`doc/guides/nextjs.instructions.md`。
目标：在 `app/api/menu-items/route.ts` 实现 `GET`，使用 `lib/db.ts` 连接，从 `db/schema.ts` 的 `menuItems` 读取 `available=true` 的记录；将 `price`（numeric）转换为 `number`；返回：
```json
{ "categories": [{"id":"all","name":"全部"}, {"id":"<cat>","name":"<cat>"}, ...], "items": [ ... ] }
```
要求：
- 错误处理返回 500，消息包含 `detail` 字段；不得泄露敏感信息。
- 仅在 API 内做数据适配（不修改 schema）。

输出：`app/api/menu-items/route.ts`。

### Task 2: 改造 `components/menu-management.tsx` 使用 API 数据
**预计时间**: 0.5–1 小时  
**依赖**: Task 1

**AI 提示词**:
你是一位资深的 Next.js 前端工程师。use context7。
目标：将 `components/menu-management.tsx` 中的本地 `menuCategories` 与 `mockMenuItems` 替换为从 `/api/menu-items` 拉取的真实数据，保持：
- 现有布局、尺寸与样式不变；
- 顶部分类含“全部”，分类数量与 DB 匹配且带计数；
- 搜索/筛选逻辑保持一致；
- 接口失败时不崩溃，显示空列表。

输出：仅修改 `components/menu-management.tsx`。

### Task 3: 集成验证（`/menu` 页面）
**预计时间**: 0.5 小时  
**依赖**: Task 2

**AI 提示词**:
你是一位细心的 QA/前端工程师。use context7。
步骤：
- 确认 `.env.local` 配置了 `DATABASE_URL`（Supabase 连接串）。
- 打开 `/menu` 页面，验证分类数量与每类菜品数量正确；搜索/筛选可用；页面尺寸未变化。
- 若 API 失败，前端不崩溃，空列表呈现。

### Task 4: 文档核对
**预计时间**: 0.5 小时  
**依赖**: Task 3

**AI 提示词**:
你是一位严谨的文档维护者。
核对并在 `doc/agents/features/display_menu_items-PLAN.md` 勾选 AC；在 PR 中附 `/api/menu-items` 响应与 `/menu` 页面分类/列表截图；简述运行步骤（`.env.local`、SSL）。

## Links
- 功能说明：`doc/agents/features/display_menu_items-PLAN.md`
- 规范：
  - `doc/guides/nextjs.instructions.md`
  - `doc/guides/nextjs-tailwind.instructions.md`
- 模板：`doc/agents/FEATURES_Template.md`
