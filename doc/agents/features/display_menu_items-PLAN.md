# 显示菜单项（菜单管理页分类展示 · 任务驱动）

- ID: display_menu_items
- Owner: <owner>
- Status: proposed

## Summary
在菜单管理页从 Supabase（Postgres）表 `menu_items` 读取数据，按“分类 → 菜品”展示：有多少菜品种类就显示多少分类，每个种类下显示对应数量的菜品。保持现有 UI 页面一致（不修改页面大小与布局），仅完成真实数据的分类与列表展示。

## Scope
- In:
  - 前端页面：`app/menu/page.tsx`（保持路由与框架不变）
  - UI 组件：`components/menu-management.tsx`（改为从 API 拉取并渲染真实数据）
  - 后端 API：`app/api/menu-items/route.ts`（GET，返回分类与菜品）
  - DB 访问：`lib/db.ts` + Drizzle 读取 `db/schema.ts` 的 `menuItems`
- Out:
  - 不调整页面尺寸、整体布局与样式（仅替换数据来源）
  - 不实现创建/编辑/删除菜品的管理后台
  - 不做实时订阅或复杂缓存策略

## UX Notes
- 保持现有菜单管理页 UI 一致（顶部分类、搜索、网格卡片与右侧交互区域尺寸不变）。
- 分类：固定含“全部”+ 数据库中去重后的 `category` 值；“全部”置于首位；分类计数来自 items 聚合。
- 菜品卡片：沿用现有样式与字段（名称/英文名/价格/图片/可用状态/热门/辣度等）；无图用占位图。
- 仅显示 `available=true` 的菜品；保留搜索与筛选逻辑。

## API / DB
- API:
  - `GET /api/menu-items` → `{ categories: Category[], items: MenuItem[] }`
    - Category: `{ id: string, name: string, count?: number }`（`id=name=category`；另含固定 `all`）
    - MenuItem: `{ id, name, nameEn, category, price(number), image, available, popular?, spicy? }`
- DB:
  - 读取 Supabase（Postgres）表 `menu_items`，仅筛选 `available=true`。
  - 不更改 `db/schema.ts`；如需迁移：`pnpm drizzle:generate && pnpm drizzle:push`，并更新 `seed/`。

## Workflow
1. 设计 → 2. API → 3. UI → 4. 联调 → 5. 文档 → 6. 验收

## Acceptance Criteria
- [ ] `GET /api/menu-items` 返回与数据库一致的分类与菜品，`price` 为 number。
- [ ] 前端分类数量与数据库去重分类一致（含“全部”）；每类菜品显示数量正确。
- [ ] 页面尺寸与布局未变化（仅数据来源改变）。
- [ ] `.env.local` 缺失或 DB 不可达时，接口返回 500；前端不崩溃（显示空列表）。
- [ ] 文档（本文件）与代码路径一致，并引用项目 guides。

## 任务清单（Tasks）
开始前请阅读：
- `../../guides/nextjs.instructions.md`
- `../../guides/nextjs-tailwind.instructions.md`

### Task 1: 新增 API 路由 `GET /api/menu-items`
**预计时间**: 0.5–1 小时
**依赖**: 无

**AI 提示词**:
你是一位资深 Next.js + Drizzle 工程师。请在 `app/api/menu-items/route.ts` 实现 `GET`，使用 `lib/db.ts` 连接，并从 `db/schema.ts` 的 `menuItems` 读取 `available=true` 的记录。将 `price`（numeric）转换为 `number`，并返回：
```json
{ "categories": [{"id":"all","name":"全部"}, {"id":"pizza","name":"pizza"}, ...], "items": [ ... ] }
```
要求：
- 错误处理返回 500，消息包含 `detail` 字段。
- 仅在 API 内做数据适配（不修改 schema）。

关键字：use context7（查阅 Next.js Route Handlers 与 Drizzle select 查询）。

### Task 2: 改造 `components/menu-management.tsx` 使用 API 数据
**预计时间**: 0.5–1 小时
**依赖**: Task 1

**AI 提示词**:
你是一位资深 Next.js 前端工程师。将 `components/menu-management.tsx` 的本地 `menuCategories` 与 `mockMenuItems` 替换为从 `/api/menu-items` 拉取的真实数据，保留：
- 现有布局、尺寸与样式不变；
- 顶部分类含“全部”，分类数量与 DB 匹配；
- 搜索/筛选逻辑保持一致；
- 接口失败时不崩溃，显示空列表。

关键字：use context7（查阅 Next.js 客户端数据获取最佳实践）。

### Task 3: 集成到 `app/menu/page.tsx` 并联调
**预计时间**: 0.5 小时
**依赖**: Task 1, Task 2

**AI 提示词**:
你是一位细心的 QA/前端工程师。联调验证：
- 确认 `.env.local` 已配置 `DATABASE_URL`（Supabase 连接串）。
- 打开 `/menu` 页面，验证分类数量与每类菜品数量正确；搜索与筛选可用；页面尺寸未变化。
- 若 API 失败，前端不崩溃，空列表呈现。

## Links
- Guides：
  - `../../guides/nextjs.instructions.md`
  - `../../guides/nextjs-tailwind.instructions.md`
- 相关讨论/Issue/PR：TBD
