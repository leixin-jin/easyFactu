# easyFactu Overall Architecture

本文档用于从“整体视角”描述该仓库的主要模块、运行时链路与目录职责，便于快速定位代码入口与数据流。

---

## 1. 项目定位（What）

这是一个基于 **Next.js App Router** 的餐饮业务系统（POS + 后台管理），包含：

- 登录/注册（Supabase Auth）
- 经营看板（Dashboard）
- 桌台管理（Tables）
- 菜单管理（Menu items）
- 点单/下单/结账（POS：支持整单结账与 AA）
- 财务/报表/设置（目前多为前端 UI / mock 展示，部分能力已在后端落库，如 `transactions`）

---

## 2. 技术栈与关键依赖（How）

- **Next.js 16**（`app/` App Router，包含 Route Handlers：`app/api/**/route.ts`）
- **React 19** + **TypeScript（strict）**
- **Tailwind CSS 4**（`tailwind.config.ts`，darkMode=class；大量使用 `print:*` 类做打印小票）
- **shadcn/ui + Radix UI**（`components/ui/*`，UI 基础组件）
- **Supabase**
  - `@supabase/ssr`：用于 SSR/Edge middleware 刷新 session & 读取 claims
  - `@supabase/supabase-js`：Auth 能力（登录/注册/退出）
- **PostgreSQL + Drizzle ORM**
  - `drizzle-orm` + `pg`（node-postgres）
  - 以 `DATABASE_URL` 连接（通常指向 Supabase Postgres）
- **Zod**：后端接口（Route Handlers）请求体校验

---

## 3. 目录结构（Where）

核心目录（简化版）：

```text
app/
  layout.tsx              # 全局 RootLayout（ThemeProvider 目前强制 light）
  page.tsx                # 首页（直接渲染 DashboardLayout + DashboardContent）
  dashboard/ page.tsx     # 服务器端校验 claims 后渲染后台布局
  pos/ page.tsx           # POS（client component，使用 hooks + /api）
  tables/ page.tsx        # 桌台管理（client component）
  menu/ page.tsx          # 菜单管理（client component）
  finance/ page.tsx       # 财务（当前多为 mock UI）
  reports/ page.tsx       # 报表（当前多为 mock UI）
  settings/ page.tsx      # 设置（当前偏 UI 展示）
  auth/                   # 登录/注册/忘记密码/确认回调
  api/
    menu-items/           # 菜单 CRUD（可用/下架）
    restaurant-tables/    # 桌台 CRUD + 状态更新
    orders/               # 下单(批次)/改单/清空/结账/拆并台

components/
  dashboard-layout.tsx    # 后台通用 Shell（侧边栏+顶部栏）
  pos-interface.tsx       # POS 主界面（下单、结账、打印）
  menu-management.tsx     # 菜单管理 UI（调用 /api/menu-items）
  table-management.tsx    # 桌台管理 UI（调用 /api/restaurant-tables）
  ui/                     # shadcn 基础组件（Button/Dialog/Select/...）

hooks/
  useMenuData.ts          # fetch /api/menu-items
  useRestaurantTables.ts  # fetch /api/restaurant-tables
  usePosOrder.ts          # fetch /api/orders（读取/提交批次/改菜/清空）
  useCheckout.ts          # 前端结账状态机与金额计算
  useTableTransfer.ts     # 拆台/并台（/api/orders/transfer）

db/
  schema.ts               # Drizzle schema：menu_items / restaurant_tables / orders / order_items / transactions

lib/
  db.ts                   # Drizzle + pg Pool（全局复用 pool）
  money.ts                # 金额解析/格式化（numeric<->number/string）
  order-utils.ts          # 将 order_items 聚合为 batch 视图（buildOrderBatches）
  supabase/               # SSR/浏览器 client + middleware 刷新 session

drizzle/                  # drizzle-kit 生成的 SQL migrations + meta
seed/                     # CSV 种子数据（菜单、桌台）
doc/                      # 项目内部分析文档
```

---

## 4. 运行时链路（Runtime Flow）

### 4.1 认证与路由保护

- `middleware.ts` 会对除静态资源外的所有路径执行 `updateSession()`。
- `updateSession()`（`lib/supabase/middleware.ts`）会：
  1. 用 `createServerClient()` 读取并刷新 cookie session
  2. 调用 `supabase.auth.getClaims()`
  3. 若无用户且不在 `/auth/*`，重定向到 `/auth/login`

因此，**在运行时几乎整个应用都被 middleware 保护**；另外 `app/dashboard/page.tsx` 也做了服务端二次校验（防止直达/渲染时无 session）。

### 4.2 页面渲染与 UI 结构

- 多数业务页面为 App Router 的 `page.tsx`，内部统一包裹 `DashboardLayout`（client component）作为后台壳。
- 业务主 UI 组件在 `components/*`，通过 hooks 获取数据并驱动交互。

### 4.3 前后端数据交互方式

该项目主要采用：

- 前端（client）通过 `fetch("/api/...")` 调用 **Route Handlers**
- 后端（`app/api/**/route.ts`）使用 `getDb()` + Drizzle 访问 Postgres，并使用 Zod 做输入校验

这使得业务数据流非常清晰：

`React UI -> hooks -> fetch /api -> route handler -> drizzle -> Postgres`

---

## 5. 数据层设计（DB Architecture）

### 5.1 连接与 ORM

- `lib/db.ts` 用 `pg.Pool` + `drizzle-orm/node-postgres` 建立连接。
- Pool 被缓存到 `global.__drizzle_pool__`，减少 dev/hmr 下重复创建连接。

### 5.2 核心表与领域模型（db/schema.ts）

- `menu_items`：菜品（`available` 作为软下架标记）
- `restaurant_tables`：桌台（`status`：idle/occupied；`amount` 可用于展示未结金额）
- `orders`：订单（`status`：open/paid/cancelled；有 `totalAmount/paidAmount` 用于累计/已付跟踪）
- `order_items`：订单明细（按 `batchNo` 分批；`paidQuantity` 支持 AA/部分结账）
- `transactions`：交易流水（结账时写入，支持后续财务/报表聚合）

关键约束：

- `orders` 上通过部分唯一索引保证 **同一桌台最多只有一个 open 订单**：
  - `uniq_open_order_per_table` with `where status = 'open'`

### 5.3 Migrations & Seed

- `drizzle/` 保存 drizzle-kit 生成的 SQL 迁移文件。
- `seed/*.csv` 提供菜单与桌台的导入数据（适用于 Supabase 导入或本地初始化）。

---

## 6. 业务模块拆解（Domain Modules）

### 6.1 菜单（Menu）

- 前端：`components/menu-management.tsx` + `hooks/useMenuData.ts`
- 后端：
  - `GET /api/menu-items`：获取可售菜品 + 分类统计
  - `POST /api/menu-items`：新增菜品（后端 zod 校验 + 防重复）
  - `DELETE /api/menu-items/[id]`：软删除（`available=false`）

### 6.2 桌台（Tables）

- 前端：`components/table-management.tsx` + `hooks/useRestaurantTables.ts`
- 后端：
  - `GET /api/restaurant-tables`：桌台列表 + 关联 open 订单的未结金额（totalAmount - paidAmount）
  - `POST /api/restaurant-tables`：创建桌台（桌号唯一）
  - `PATCH /api/restaurant-tables/[id]`：更新桌台状态
  - `DELETE /api/restaurant-tables/[id]`：删除桌台（若有 open 订单则拒绝）

### 6.3 POS（下单/改菜/结账/拆并台）

入口：`app/pos/page.tsx -> components/pos-interface.tsx`。

- 下单（批次）：`POST /api/orders`
  - 会自动创建/复用 open 订单
  - `order_items` 以 `batchNo` 分批写入
- 读取当前桌台 open 订单：`GET /api/orders?tableId=...`
- 改菜：`PATCH /api/orders/[id]`（对 order_items 做 decrement/remove，包含“已付数量”保护）
- 清空：`POST /api/orders/clear`
- 结账：`POST /api/orders/checkout`
  - full：整单结账，更新订单为 paid，写入 transactions，桌台回 idle
  - aa：按菜品数量分摊并更新 `paidQuantity`，可能造成订单继续 open 或最终 paid，同时写入 transactions
- 拆台/并台：`POST /api/orders/transfer`

打印：POS 在结账成功后生成 `printData`，触发 `window.print()`，并依赖 `print:*` Tailwind 与 `@page` CSS 控制小票宽度。

### 6.4 财务/报表

- `components/finance-management.tsx`、`components/reports-view.tsx` 当前主要为 UI 与 mock 数据。
- 但后端在 `orders/checkout` 已落库 `transactions`，后续要做真实报表时，可基于 `transactions` 聚合实现。

---

## 7. 配置与工程化（Tooling）

- 脚本（`package.json`）：
  - `pnpm dev` / `pnpm build` / `pnpm start`
  - `pnpm lint`（ESLint 9 + `eslint-config-next`）
  - `pnpm drizzle:*`（生成/推送/Studio）
- TypeScript：`strict: true`，路径别名 `@/* -> ./*`
- Tailwind：集中在 `app/globals.css` 与各组件 className

---

## 8. 环境变量（Runtime Config）

关键环境变量（通常放在 `.env.local`，不提交）：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `DATABASE_URL`
