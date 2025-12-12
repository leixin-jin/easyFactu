# Repository Guidelines

## Project Structure & Module Organization
- `app/` — Next.js App Router pages (`page.tsx`, `layout.tsx`).
- `components/` — 复用型 React 组件（PascalCase）：
  - `components/ui/` — 基础 UI 组件（shadcn/ui）
  - `components/features/` — 功能模块组件：
    - `features/pos/` — POS 点单界面相关组件
    - `features/tables/` — 桌台管理组件
    - `features/menu/` — 菜单管理组件
    - `features/finance/` — 财务管理组件
  - `components/providers/` — Context Providers（如 QueryProvider）
- `db/schema.ts` — Drizzle ORM schema 源；`drizzle/` 生成的迁移与快照。
- `lib/` — 工具方法：
  - `lib/api/` — 统一 API 客户端（fetcher + typed endpoints）
  - `lib/queries/` — TanStack Query hooks（数据获取与缓存）
- `hooks/` — 自定义 React hooks（业务逻辑封装）
- `types/` — TypeScript 类型定义（API、数据库、UI）
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

## Data Fetching (TanStack Query)
- 使用 TanStack Query v5 进行数据获取和缓存管理
- Query hooks 位于 `lib/queries/`：
  - `useTables()` — 获取桌台列表
  - `useMenuItems()` — 获取菜单列表
  - `useTableOrder(tableId)` — 获取指定桌台订单
- Mutation hooks 用于数据变更，自动刷新相关缓存
- 示例用法：
  ```typescript
  import { useTables, useCreateTable } from "@/lib/queries"
  
  function MyComponent() {
    const { data: tables, isLoading } = useTables()
    const createTable = useCreateTable()
    
    const handleCreate = () => {
      createTable.mutate({ number: "A1", capacity: 4 })
    }
  }
  ```

## API Client
- 统一 API 客户端位于 `lib/api/client.ts`
- 类型安全的 API 调用：
  ```typescript
  import { api } from "@/lib/api"
  
  // GET
  const tables = await api.tables.list()
  // POST
  const newTable = await api.tables.create({ number: "A1", capacity: 4 })
  // DELETE
  await api.tables.delete(tableId)
  ```

## Agent Notes
- 组件复用优先放入 `components/` 以避免页面冗余。
- 功能组件按模块放入 `components/features/` 目录。
- 数据获取优先使用 TanStack Query hooks（`lib/queries/`）。
- API 调用使用统一客户端（`lib/api/`），勿直接使用 fetch。
- 保持 KISS/DRY/YAGNI，提交前可运行 `pnpm lint`/`pnpm build` 做最小验证。
