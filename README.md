# easyFactu POS

A Next.js (App Router) + Supabase + Drizzle-based POS for restaurant-style ordering, tables, and checkout。

## Features
- 桌台管理：列表、并台、拆台，支持在 `/tables` 选择桌台进入 POS。
- 点餐与批次：菜单来自 `/api/menu-items`，支持草稿批次与已落库批次。
- 结账与 AA：整单/AA 结账，支付方式与折扣，金额校验提示。
- 小票打印：80mm 热敏打印优化的结账/AA 小票，覆盖所有菜品。
- UI 基础：Tailwind + shadcn/ui，Supabase Auth 页面集成。

## Tech Stack
- Next.js 16（App Router、Turbopack 构建）
- Supabase（Auth / Postgres）
- Drizzle ORM（`db/schema.ts` 为源，`drizzle/` 为迁移与快照）
- Tailwind CSS + shadcn/ui
- pnpm

## Getting Started
前置：Node 18+、pnpm、可用的 Supabase 项目。

安装依赖：
```bash
pnpm install
```

环境变量（`.env.local`）：
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
DATABASE_URL=... # Supabase Postgres 连接串
```

开发：
```bash
pnpm dev
```

## Database & Migrations
- Schema 源：`db/schema.ts`；迁移输出：`drizzle/`。
- 生成 SQL：`pnpm drizzle:generate`
- 推送迁移：`pnpm drizzle:push`
- 数据浏览：`pnpm drizzle:studio`
- 种子：`seed/` 提供 Supabase CSV 导入。

## Scripts
- `pnpm build` — 生产构建
- `pnpm start` — 运行构建产物
- `pnpm lint` — ESLint 检查

## POS Usage Notes
- 主入口：`/pos`，需先在右侧选择桌台；AA 需在订单汇总区选择菜品。
- 打印：结账/AA 成功后生成 80mm 小票，可在预览中重新打印。

## Deployment (Vercel)
- Build Command: `pnpm build`
- Output: `.next`
- 在 Vercel 配置上述三个环境变量（Production/Preview 均需）。
