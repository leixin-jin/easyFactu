# Repository Guidelines

## Project Structure & Module Organization
- `app/` — Next.js App Router pages (`page.tsx`, `layout.tsx`).
- `components/` — 复用型 React 组件（PascalCase）；`components/ui/` 为基础 UI。
- `db/schema.ts` — Drizzle ORM schema 源；`drizzle/` 生成的迁移与快照。
- `lib/`, `hooks/` — 工具方法与自定义 hooks。
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

## Agent Notes
- 组件复用优先放入 `components/` 以避免页面冗余。
- 保持 KISS/DRY/YAGNI，提交前可运行 `pnpm lint`/`pnpm build` 做最小验证。
