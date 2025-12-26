# easyFactu 架构优化终版（Codex v3）

> 目标：新人 30 分钟读懂主流程；改造任务可拆分、可验收、可并行推进。

## 0. TL;DR

- 阅读路径：`app/*` → `components/features/*` → `lib/queries/*` → `lib/api/*` → `app/api/*` → `services/*` → `repositories/*` → `db/schema.ts`。
- 优先级：先去重（SSOT）+ 统一 API 响应 → 再抽服务层 → 领域化与测试完善。

---

## 1. 项目概览（简版）

- 项目：餐饮 POS 系统（桌台、点单、结账/AA、小票、日结、报表）。
- 栈：Next.js App Router + TanStack Query + Supabase Postgres + Drizzle ORM。
- 主要问题：重复组件/Hook、API 路由过重、业务计算分散、错误结构不统一。

---

## 2. 阅读指南（新人视角）

### 2.1 项目地图

```
app/                 # 页面入口与路由
components/          # UI 组件
  features/          # 业务模块组件（pos/tables/menu/finance）
  shared/            # 跨模块复用组件
  ui/                # 基础 UI（shadcn/ui）
lib/
  api/               # API 客户端
  queries/           # TanStack Query hooks
  domain/            # 纯业务规则（目标位置）
  contracts/         # Zod 输入/输出约束（目标位置）
  serializers/       # DB -> API DTO 映射（目标位置）
services/            # 业务编排与事务（目标位置）
repositories/        # DB 访问封装（目标位置）
db/schema.ts         # 数据表定义
```

### 2.2 一条功能链路怎么走

1) 从 `app/*` 找页面入口（如 `app/pos/page.tsx`）。
2) 跳到 `components/features/*` 的功能组件。
3) 数据请求统一在 `lib/queries/*` → `lib/api/*`。
4) `app/api/*` 只做校验与调用 `services/*`。
5) 核心业务规则在 `lib/domain/*`（或待迁移的 `lib/*`）。

### 2.3 新增功能放哪里

- 新页面：`app/<feature>/page.tsx`
- 新 UI：`components/features/<domain>/...`
- 数据请求：`lib/queries/<domain>` + `lib/api/<domain>`
- 业务规则：`lib/domain/<domain>`
- API：`app/api/<domain>/route.ts`（只做校验 + 调 service）

---

## 3. 目标架构（分层 + 单向依赖）

```
Presentation (UI)
  app/* + components/* + hooks/ui/*

Application (Use-cases)
  services/* + hooks/data/* (or lib/queries)

Domain (Business Rules)
  lib/domain/* (纯函数/值对象/规则)

Infrastructure
  repositories/* + lib/db.ts + db/schema.ts + app/api/*
```

### 依赖规则

- UI 不得直接访问 `db/schema.ts` 或 `app/api/*`。
- `app/api/*` 只依赖 `services/*`、`repositories/*`、`lib/domain/*`、`lib/contracts/*`。
- `lib/domain/*` 不依赖 Next/React/数据库/HTTP。

---

## 4. 核心问题清单（按优先级）

| P级 | 问题 | 影响 | 典型位置 |
| --- | --- | --- | --- |
| P0 | API 路由承载过多业务逻辑 | 难测试、难复用 | `app/api/orders/checkout/route.ts` 等 |
| P0 | 重复组件/Hook 并存 | 维护混乱 | `components/*` vs `components/features/*` |
| P1 | 组件过大 | 难理解/难修改 | `components/pos-interface.tsx` |
| P1 | 错误响应不统一 | 前端处理困难 | `app/api/*` |
| P1 | UI 直接 `fetch` | 缓存不一致 | `components/*`, `hooks/*` |
| P2 | 测试覆盖不足 | 重构无信心 | 全项目 |
| P2 | env 未类型校验 | 部署易出错 | `lib/db.ts` |

---

## 5. 统一规则（先定规矩）

### 5.1 API 响应结构
- 统一 `jsonOk/jsonError`，固定 `{ data, error, code, detail }` 形态。

### 5.2 单一来源（SSOT）
- 同名组件/Hook 只保留一个实现，其它路径只能 re-export。

### 5.3 纯函数优先
- 金额、折扣、AA、报表聚合必须归位到 `lib/domain/*`，并可单测。

---

## 6. 任务拆解（精细可执行）

> 每条任务包含范围、步骤、验收标准，便于拆分并行。

### 6.1 基础工程（BASE）

**BASE-01 (P0) 建立 services/repositories 骨架**
范围：`services/`, `repositories/`, `services/index.ts`, `repositories/index.ts`
步骤：
1) 新建目录与导出入口。
2) 先不动业务逻辑，仅提供结构。
验收：目录存在且可被 import，无 lint 报错。

**BASE-02 (P0) 统一 API 响应与错误结构**
范围：`lib/http/response.ts`（或 `lib/api/response.ts`），`app/api/*`
步骤：
1) 新增 `jsonOk/jsonError` helper。
2) 新增 `withErrorHandler`，统一 Zod/DB 错误映射。
3) 先落地到 `app/api/restaurant-tables/route.ts`、`app/api/orders/checkout/route.ts`，再推广全量。
验收：全局不再出现 `{ message }` / `{ error }` 混用。

**BASE-03 (P1) 环境变量类型安全化**
范围：`lib/env.ts`, `lib/db.ts`, `lib/supabase/*`
步骤：
1) 用 zod 校验关键 env。
2) 所有 env 通过 `lib/env.ts` 获取。
验收：启动缺少 env 时可读错误。

**BASE-04 (P1) DTO 序列化集中管理**
范围：`lib/serializers/*`, `app/api/menu-items/*`, `app/api/orders/*`
步骤：
1) 新建 `lib/serializers/menu.ts`、`lib/serializers/orders.ts`。
2) API route 使用 serializer 返回数据。
验收：DB -> API 映射仅在 serializers 中出现。

### 6.2 组件/Hook 去重（SSOT）

**SSOT-01 (P0) POS 组件去重**
范围：`components/pos-interface.tsx`, `components/PosCheckoutDialog.tsx`, `components/PosMenuPane.tsx`, `components/PosOrderSidebar.tsx`, `components/PosReceiptPreview.tsx`
步骤：
1) 统一保留 `components/features/pos/*` 为唯一实现。
2) 旧路径改为 re-export 或移至 `components/legacy/`。
验收：POS 组件无重复实现，导入路径统一。

**SSOT-02 (P0) Tables 组件去重**
范围：`components/table-management.tsx`, `components/TableTransferDialogs.tsx`
步骤：
1) 统一保留 `components/features/tables/*`。
2) 旧路径 re-export。
验收：Tables 组件无重复实现。

**SSOT-03 (P0) Menu 组件去重**
范围：`components/menu-management.tsx`
步骤：
1) 统一保留 `components/features/menu/MenuManagement.tsx`。
2) 旧路径 re-export。
验收：Menu 组件无重复实现。

**SSOT-04 (P0) use-toast 统一**
范围：`hooks/use-toast.ts`, `components/ui/use-toast.ts`
步骤：
1) 决定单一来源（建议 `components/ui/use-toast.ts`）。
2) 其它路径 re-export。
验收：全项目只存在一个实现来源。

### 6.3 POS + Orders（POS/ORD）

**POS-01 (P0) POS 结账使用 query/mutation**
范围：`components/features/pos/PosInterface.tsx`, `components/pos-interface.tsx`
步骤：
1) 用 `lib/queries/use-orders.ts` 的 `useCheckout` 替换 `fetch`。
2) 统一错误提示与 loading 状态。
验收：UI 不再直接 `fetch` 结账接口。

**POS-02 (P1) 拆分 PosInterface**
范围：`components/features/pos/PosInterface.tsx`
步骤：
1) 抽出 `PosHeader`、`PosContent`、`PosFooter`（或等价划分）。
2) 子组件只通过 props 传递状态。
验收：`PosInterface.tsx` 行数 < 300。

**ORD-01 (P0) Checkout Service 抽离**
范围：`app/api/orders/checkout/route.ts`, `services/orders/checkout.ts`, `repositories/orders.ts`, `repositories/transactions.ts`
步骤：
1) 把事务与业务规则迁到 service。
2) route 仅校验与调用。
验收：route 里只剩校验 + service 调用。

**ORD-02 (P0) Order Create Service 抽离**
范围：`app/api/orders/route.ts`, `services/orders/create.ts`, `repositories/orders.ts`
验收：route 无业务逻辑。

**ORD-03 (P0) Order Item Update Service 抽离**
范围：`app/api/orders/[id]/route.ts`, `services/orders/update-item.ts`, `repositories/order-items.ts`
验收：route 无业务逻辑。

**ORD-04 (P0) Order Transfer/Clear Service 抽离**
范围：`app/api/orders/transfer/route.ts`, `app/api/orders/clear/route.ts`, `services/orders/transfer.ts`, `services/orders/clear.ts`
验收：route 无业务逻辑。

**ORD-05 (P1) 结账/AA 计算统一到 domain**
范围：`lib/checkout/calculate.ts`, `hooks/useCheckout.ts`, `lib/domain/checkout.ts`（新）
步骤：
1) 以 `lib/checkout/calculate.ts` 为核心，建立 `lib/domain/checkout.ts` 入口。
2) `hooks/useCheckout.ts` 仅负责 UI 状态管理。
验收：业务计算只在 domain 层。

### 6.4 Tables（TBL）

**TBL-01 (P0) TableManagement 使用 queries**
范围：`components/features/tables/TableManagement.tsx`, `components/table-management.tsx`
步骤：
1) 使用 `useCreateTable`、`useDeleteTable` 替换 `fetch`。
2) UI 只处理表单与 toast。
验收：Table 管理不再直接 `fetch`。

**TBL-02 (P0) TableTransferDialogs 使用 query/mutation**
范围：`components/features/tables/TableTransferDialogs.tsx`, `components/TableTransferDialogs.tsx`
步骤：
1) 使用 `useTableOrderQuery` 获取订单。
2) 使用 `useTransferOrder` 进行拆并台。
验收：UI 不再直接 `fetch` 订单/拆并台。

**TBL-03 (P1) useTableTransfer 使用 api client**
范围：`hooks/useTableTransfer.ts`
步骤：
1) 用 `api.orders.transfer` 或 `useTransferOrder` 替换 `fetch`。
验收：hook 不直接 `fetch`。

**TBL-04 (P1) Table API Service 抽离**
范围：`app/api/restaurant-tables/route.ts`, `app/api/restaurant-tables/[id]/route.ts`, `services/tables/*`
验收：route 无业务逻辑。

### 6.5 Menu（MENU）

**MENU-01 (P0) MenuManagement 使用 queries**
范围：`components/features/menu/MenuManagement.tsx`, `components/menu-management.tsx`
步骤：
1) 使用 `useMenuQuery`、`useCreateMenuItem`、`useUpdateMenuItem`、`useDeleteMenuItem`。
验收：UI 不再直接 `fetch`。

**MENU-02 (P1) Menu API Service 抽离**
范围：`app/api/menu-items/route.ts`, `app/api/menu-items/[id]/route.ts`, `app/api/menu-items/[id]/restore/route.ts`, `services/menu/*`
验收：route 无业务逻辑。

**MENU-03 (P1) Menu DTO 序列化**
范围：`lib/serializers/menu.ts`, `app/api/menu-items/*`
验收：序列化逻辑不出现在 route。

### 6.6 Finance（FIN）

**FIN-01 (P0) Daily Closure Service 抽离**
范围：`app/api/daily-closure/route.ts`, `services/daily-closure/get-current.ts`
验收：route 无业务逻辑。

**FIN-02 (P0) Daily Closure Confirm Service 抽离**
范围：`app/api/daily-closures/confirm/route.ts`, `services/daily-closures/confirm.ts`
验收：route 无业务逻辑。

**FIN-03 (P1) Daily Closure Adjustments Service 抽离**
范围：`app/api/daily-closures/[id]/adjustments/route.ts`, `services/daily-closures/adjustments.ts`
验收：route 无业务逻辑。

**FIN-04 (P1) Daily Closure Export Service 抽离**
范围：`app/api/daily-closures/[id]/export/route.ts`, `services/daily-closures/export.ts`
验收：route 无业务逻辑。

**FIN-05 (P1) Reports Service 抽离**
范围：`app/api/reports/route.ts`, `services/reports/get.ts`, `lib/reports/*`
验收：聚合逻辑不在 route。

**FIN-06 (P1) Reports Export Service 抽离**
范围：`app/api/reports/export/route.ts`, `services/reports/export.ts`
验收：route 无业务逻辑。

**FIN-07 (P1) Transactions Service 抽离**
范围：`app/api/transactions/[id]/route.ts`, `app/api/transactions/[id]/reverse/route.ts`, `services/transactions/*`
验收：route 无业务逻辑。

**FIN-08 (P1) Checkout History Service 抽离**
范围：`app/api/checkout-history/route.ts`, `services/checkout-history/get.ts`
验收：route 无业务逻辑。

**FIN-09 (P0) Reports UI 使用 query**
范围：`components/reports-view.tsx`, `lib/queries/use-reports.ts`
验收：UI 不再直接 `fetch` 报表。

### 6.7 Settings（SET）

**SET-01 (P1) Restaurant Settings 引入 api + query**
范围：`lib/api/client.ts`, `lib/queries/use-restaurant-settings.ts`, `components/settings-view.tsx`
步骤：
1) 增加 `api.restaurantSettings.get/update`。
2) 新增 query/mutation。
3) 组件用 hooks 调用。
验收：settings UI 不再直接 `fetch`。

### 6.8 Tests & CI（TEST）

**TEST-01 (P0) 核心工具函数单测**
范围：`lib/money.ts`, `lib/order-utils.ts`
验收：覆盖率达标（>60%）。

**TEST-02 (P0) 结账计算单测**
范围：`lib/checkout/calculate.ts`
验收：核心分支覆盖。

**TEST-03 (P1) Checkout Service 集成测试**
范围：`services/orders/checkout.ts`, `app/api/orders/checkout/route.ts`
验收：主流程通过、错误路径覆盖。

**TEST-04 (P1) Reports/Daily Closure 单测**
范围：`lib/reports/*`, `lib/daily-closure/*`
验收：聚合逻辑覆盖。

---

## 7. 改造顺序建议（并行友好）

1) **基础与去重**：BASE-01/02 + SSOT-01~04。
2) **数据获取统一**：POS-01、TBL-01/02、MENU-01、FIN-09、SET-01。
3) **服务层抽离**：ORD-01~04 → FIN-01~08 → MENU-02 → TBL-04。
4) **领域化与测试**：ORD-05 + TEST-01~04。

---

## 8. 可验收完成标准

- 新人可按阅读指南完整追踪 POS/桌台/菜单的数据流。
- UI 中不存在直接 `fetch` 请求。
- 业务逻辑集中在 `services/*` 与 `lib/domain/*`。
- 同名组件/Hook 只有一个实现来源。
- 核心业务计算具备单测覆盖。

---

## 9. 附录（可选）

### 9.1 统一错误处理示例（参考）

```ts
import { NextResponse } from "next/server"
import { ZodError } from "zod"

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

export function jsonError(status: number, code: string, error: string, detail?: unknown) {
  return NextResponse.json({ error, code, detail }, { status })
}

export async function withErrorHandler<T>(handler: () => Promise<T>) {
  try {
    const result = await handler()
    return jsonOk(result)
  } catch (err) {
    if (err instanceof ZodError) {
      return jsonError(400, "VALIDATION_ERROR", "参数校验失败", err.flatten())
    }
    if ((err as { code?: string }).code === "23505") {
      return jsonError(409, "DUPLICATE_ENTRY", "数据已存在")
    }
    console.error("[API Error]", err)
    return jsonError(500, "INTERNAL_ERROR", "服务器内部错误")
  }
}
```

### 9.2 env 校验示例（参考）

```ts
import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
})
```

