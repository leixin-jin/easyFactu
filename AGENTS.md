# Repository Guidelines

## Project Structure & Module Organization
- `app/` — Next.js App Router pages (`page.tsx`, `layout.tsx`).
- `components/` — 复用型 React 组件（PascalCase）：
  - `components/features/` — 功能模块组件：
    - `pos/` — POS 点单相关（PosInterface, PosMenuPane, PosOrderSidebar, PosCheckoutDialog, PosReceiptPreview）
    - `tables/` — 桌台管理（TableManagement, SplitTableDialog, MergeTableDialog）
    - `menu/` — 菜单管理（MenuManagement）
    - `finance/` — 财务管理（FinanceManagement, ExpenseDialog, 等）
  - `components/shared/` — 跨模块共享组件
  - `components/ui/` — 基础 UI 组件（shadcn/ui）
  - `components/providers/` — React Context Providers（QueryProvider 等）
- `db/schema.ts` — Drizzle ORM schema 源；`drizzle/` 生成的迁移与快照。
- `lib/` — 工具方法：
  - `lib/api/` — 统一 API 客户端（fetcher.ts, client.ts）
  - `lib/queries/` — TanStack Query hooks（use-tables.ts, use-menu.ts, use-orders.ts）
- `hooks/` — 自定义 React hooks（保持兼容层）
- `types/` — TypeScript 类型定义（api.ts, database.ts, pos.ts）
- `public/` — 静态资源；`seed/` — Supabase 导入用 CSV。

## Build, Test, and Development Commands
- `pnpm dev` — 启动本地开发（Next.js）。
- `pnpm build` — 生产构建（Turbopack）。
- `pnpm start` — 运行构建产物。
- `pnpm lint` — ESLint 检查。
- Drizzle：`pnpm drizzle:generate` 生成 SQL，`pnpm drizzle:push` 推送迁移，`pnpm drizzle:studio` 浏览数据。

## Coding Style & Naming Conventions
- 语言：TypeScript + React 函数组件；缩进 2 空格。
- 组件/文件 PascalCase（如 `components/OrderCard.tsx`）；App 路由遵循 Next.js 约定。
- 遵守 ESLint；避免未使用的导出；优先命名导出。
- UI 样式使用 Tailwind；print 媒体样式需确保不影响屏幕端 UI。

## Testing Guidelines
- 当前未配置测试框架；如新增，优先 Vitest + React Testing Library。
- 测试文件同目录放置，命名 `*.test.ts[x]`；保持快速、确定性。
- 新增测试时同步在 `package.json` 增加 `test` 脚本并记录运行方式。

## Commit & Pull Request Guidelines
- 使用 Conventional Commits：`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `ci:` 等；主题 ≤72 字符，可带 scope（如 `feat(db): add orders index`）。
- PR 需说明目的、关键变更、截图（涉及 UI）、关联 Issue；保持 diff 聚焦，涉及 schema 变更需更新迁移与 seed。

## Security & Configuration Tips
- 环境变量：`.env.local`（不入库）。必需项：`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`。
- 处理输入时遵循边界优先：校验/空值/超时与重试；勿提交任何密钥。

## TanStack Query 使用指南
- QueryProvider 已在 `app/layout.tsx` 中集成。
- 数据查询使用 `lib/queries/` 中的 hooks：
  ```typescript
  import { useTablesQuery, useCreateTable } from "@/lib/queries"
  
  // 获取桌台列表
  const { data, isLoading, error } = useTablesQuery()
  
  // 创建桌台
  const createMutation = useCreateTable()
  await createMutation.mutateAsync({ number: "A1", capacity: 4 })
  ```
- API 客户端使用 `lib/api/client.ts`：
  ```typescript
  import { api } from "@/lib/api"
  
  // 直接调用 API
  const tables = await api.tables.list()
  const order = await api.orders.get(tableId)
  ```
- 缓存配置：菜单数据 5 分钟，桌台 30 秒，订单实时。

## Agent Notes
- 组件复用优先放入 `components/features/` 对应模块或 `components/shared/`。
- 新增功能模块时在 `components/features/` 下创建目录并添加 `index.ts` 导出。
- 保持 KISS/DRY/YAGNI，提交前可运行 `pnpm lint`/`pnpm build` 做最小验证。
