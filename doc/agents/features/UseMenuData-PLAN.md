# Use Menu Data Hook（功能模板 · 任务驱动）

- ID: use-menu-data-hook
- Owner: zhuyuxia
- Status: in-progress

## Summary
将菜单数据获取逻辑封装为前端 Hook（`hooks/useMenuData.ts`），统一从 `GET /api/menu-items` 拉取“菜品分类 + 菜品列表”，并在 POS 页面（`components/pos-interface.tsx`）接入此 Hook。保持 UI 页面布局与尺寸不变，仅替换数据来源以完成“菜品种类的显示”，必要时提供本地 mock 的降级回退，确保稳定性。

## Scope
- In: 
  - 新增 `hooks/useMenuData.ts`（客户端 Hook，fetch `/api/menu-items`）
  - 改造 `components/pos-interface.tsx` 使用 Hook 中的 `categories`（以及 `items`）渲染，不改 UI 结构/大小
- Out:
  - 不调整页面布局与组件尺寸
  - 不改动 `app/api/menu-items/route.ts` 已有接口语义
  - 不涉及其它页面与数据库结构

## UX Notes
- 保持原有 POS 页头、Tabs、卡片栅格等 UI 大小与布局完全一致。
- 加载与失败：若接口加载失败，使用内置 mock 作为回退，避免空白页面。
- 分类 Tabs 来源改为接口返回的 `categories`，默认包含 `{ id: "all", name: "全部" }`。

## API / DB
- API: `GET /api/menu-items`
  - 响应示例：`{ categories: Array<{id: string; name: string}>, items: Array<MenuItem> }`
  - 字段对齐：`price` 在接口层已转换为 `number`（见 `app/api/menu-items/route.ts`）。
- DB: 无需变更，表结构见 `db/schema.ts`（`menu_items`）。
  - 如需在本地生成与推送迁移：`pnpm drizzle:generate && pnpm drizzle:push`（当前功能不需要）。

## Workflow
1. 设计（Hook 输入/输出、失败回退）
2. 实现 Hook：`hooks/useMenuData.ts`
3. 改造 POS：`components/pos-interface.tsx` 接入 Hook
4. 联调：验证分类 Tabs 与商品过滤逻辑
5. 文档：本计划文档与实现备注
6. 验收：核对 UI 未变、分类显示正确

## Acceptance Criteria
- [ ] POS 页的分类 Tabs 来自 `/api/menu-items` 返回的 `categories`。
- [ ] `price` 为 number，客户端可直接参与计算。
- [ ] UI 布局与尺寸完全不变（不修改现有样式与结构）。
- [ ] 接口失败时回退至既有 mock，页面仍可用。
- [ ] Hook 可被 `menu-management` 等页面后续复用（DRY）。

## 任务清单（Tasks）

### 任务清单要求
- 独立可执行：每个任务可单独提交与回滚。
- 时间约束：单任务 ≤ 2 小时。
- 顺序与依赖：先 Hook，再接入，再验收。
- 清晰命名：含可复制 AI 提示词；必要时标注 `use context7`。

### Task 1: 新增客户端 Hook useMenuData
**预计时间**: 0.5 小时
**依赖**: 无

**AI 提示词**:
你是一位资深 Next.js + React 工程师。请在 `hooks/useMenuData.ts` 实现客户端 Hook：
- `"use client"` 顶部声明；
- 从 `GET /api/menu-items` 获取 `categories` 与 `items`；
- 返回 `{ items, categories, loading, error }`；
- 支持 `fallback`（接口失败时回退到 mock）；
- 遵循项目样式与 TypeScript 约定。
关键词：use context7（Next.js Route Handlers）。

### Task 2: 在 POS 接入 Hook 并保持 UI 不变
**预计时间**: 0.5 小时
**依赖**: Task 1

**AI 提示词**:
你是一位资深前端工程师。改造 `components/pos-interface.tsx`：
- 删除本地 `menuCategories` 常量；
- 使用 `useMenuData({ fallback: { items: mockMenuItems, categories: [{ id: "all", name: "全部" }] } })`；
- 将分类 Tabs 渲染改为使用 `menuCategories`；
- `filteredItems` 改为使用从 Hook 返回的 `items`；
- 严禁修改任何 UI 尺寸/布局，仅替换数据来源；
- 接口失败时仍可用（依赖 fallback）。
关键词：use context7（Next.js App Router + Client Components）。

### Task 3: 验收与文档
**预计时间**: 0.5 小时
**依赖**: Task 1, Task 2

**AI 提示词**:
请验证：
- 分类 Tabs 与数据库一致；
- 切换分类与搜索仍正确过滤；
- UI 布局与尺寸未变化；
- 在无网络或接口错误时页面仍可用（mock 回退）。
编写说明：本文件（`doc/agents/features/UseMenuData-PLAN.md`），并在 PR 附运行说明与截图。
关键词：use context7。

## Links
- API Route：`app/api/menu-items/route.ts`
- POS 页面：`components/pos-interface.tsx`
- Hook：`hooks/useMenuData.ts`
- Guides：`../../guides/nextjs.instructions.md`, `../../guides/nextjs-tailwind.instructions.md`
- Next.js 文档（via context7）：`/vercel/next.js` 路由与 Route Handlers（已检索）

