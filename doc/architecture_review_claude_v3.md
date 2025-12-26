# easyFactu 架构评审 v3（终极综合版）

> **版本**: v3.0  
> **日期**: 2025-12-26  
> **目标读者**: 新加入团队的开发者 & 负责重构的工程师  
> **核心目标**: 30 分钟读懂主流程，任务可直接拆分并行推进

---

## 📖 阅读指南

本文档综合了 **Codex v2**（任务拆解清晰、优先级明确）与 **Claude v2**（架构分析深入、代码示例详尽）的优点，形成**最终参考版本**。

**阅读路径建议**:

| 读者类型 | 推荐阅读章节 |
|----------|--------------|
| 🆕 新人了解项目 | [A. 项目概览](#a-项目概览) → [B. 代码阅读路径](#b-代码阅读路径) |
| 🔍 理解问题 | [C. 核心问题总结](#c-核心问题总结) |
| 🛠️ 动手改进 | [D. 目标架构](#d-目标架构) → [E. 改进实施指南](#e-改进实施指南) |
| 📋 分配任务 | [F. 任务拆解清单](#f-任务拆解清单) |
| 📅 规划迭代 | [G. 演进路线图](#g-演进路线图) |

---

## A. 项目概览

### A.1 这是什么项目？

**easyFactu** 是一个**餐饮 POS（收银）系统**，核心功能包括：

```
┌─────────────────────────────────────────────────────┐
│                    easyFactu                         │
├─────────────────────────────────────────────────────┤
│  🍽️ 桌台管理    │  📝 点单下单   │  💰 结账/AA     │
│  🖨️ 小票打印    │  📊 日结报表   │  📱 菜单管理    │
└─────────────────────────────────────────────────────┘
```

### A.2 技术栈速览

| 层级 | 技术选择 | 说明 |
|------|----------|------|
| **前端框架** | Next.js 16 (App Router) | React 19 + Turbopack |
| **状态管理** | TanStack Query 5 | 数据获取和缓存 |
| **UI 组件** | shadcn/ui + TailwindCSS | Radix UI 基础 |
| **后端 API** | Next.js API Routes | 内置于 Next.js |
| **数据库** | PostgreSQL (Supabase) | Drizzle ORM |
| **测试** | Vitest + RTL + MSW | React Testing Library |

### A.3 目录结构一览

```
easyFactu/
├── app/                      # Next.js 页面和 API
│   ├── api/                  # 后端 API 路由
│   │   ├── orders/           # 订单相关 API
│   │   │   └── checkout/     # ⚠️ 结账逻辑（742行）
│   │   └── daily-closures/   # 日结 API
│   ├── pos/                  # POS 页面
│   └── tables/               # 桌台页面
│
├── components/               # UI 组件
│   ├── features/             # ✅ 功能模块（推荐）
│   │   ├── pos/              #    POS 相关组件
│   │   ├── tables/           #    桌台相关组件
│   │   └── menu/             #    菜单相关组件
│   ├── shared/               # 跨模块复用组件
│   ├── ui/                   # ✅ 基础 UI 组件 (shadcn/ui)
│   └── pos-interface.tsx     # ⚠️ 待迁移到 features/
│
├── hooks/                    # 自定义 Hooks
│   ├── useCheckout.ts        # 结账状态管理
│   └── usePosOrder.ts        # POS 订单状态
│
├── lib/                      # 核心库
│   ├── api/                  # ✅ API 客户端（统一调用）
│   ├── queries/              # ✅ React Query Hooks
│   ├── domain/               # 🆕 纯业务规则（目标位置）
│   ├── contracts/            # 🆕 Zod 输入/输出约束（目标位置）
│   ├── serializers/          # 🆕 DB -> API DTO 映射（目标位置）
│   ├── money.ts              # ✅ 金额计算工具
│   └── order-utils.ts        # 订单工具函数
│
├── services/                 # 🆕 业务编排与事务（目标位置）
├── repositories/             # 🆕 DB 访问封装（目标位置）
│
├── db/                       # 数据库
│   └── schema.ts             # Drizzle Schema（13张表）
│
└── types/                    # 类型定义
    └── api.ts                # API 契约类型
```

> **图例**: ✅ = 设计良好 | ⚠️ = 需要改进 | 🆕 = 待新增

---

## B. 代码阅读路径

### B.1 一条功能链路怎么走

1. 从 `app/*` 找页面入口（例如 `app/pos/page.tsx`）
2. 跳到 `components/features/*` 的功能组件
3. 数据请求统一在 `lib/queries/*` → `lib/api/*`
4. `app/api/*` 只做校验与调用 `services/*`
5. 核心业务规则在 `lib/domain/*`（或待迁移的 `lib/*`）

### B.2 新增功能放哪里

| 类型 | 路径 | 示例 |
|------|------|------|
| 新页面 | `app/<feature>/page.tsx` | `app/reports/page.tsx` |
| 新 UI 组件 | `components/features/<domain>/...` | `components/features/reports/ReportsView.tsx` |
| 数据请求 | `lib/queries/<domain>` + `lib/api/<domain>` | `lib/queries/use-reports.ts` |
| 业务规则 | `lib/domain/<domain>` | `lib/domain/reports.ts` |
| API 路由 | `app/api/<domain>/route.ts` | `app/api/reports/route.ts`（只做校验 + 调 service） |

### B.3 推荐阅读顺序（新人）

```
app/*  →  components/features/*  →  lib/queries/*  →  lib/api/*
                                                          ↓
                                              app/api/*  →  services/*
                                                          ↓
                                              repositories/*  →  db/schema.ts
```

1. **理解数据模型**: `db/schema.ts`
2. **理解业务流程**: `app/api/orders/checkout/route.ts`
3. **理解 UI 结构**: `components/features/pos/`

---

## C. 核心问题总结

### C.1 问题清单（按优先级）

| P级 | 问题 | 影响 | 涉及文件 |
|-----|------|------|----------|
| **P0** | API 路由承载过多业务逻辑 | 难测试、难复用 | `checkout/route.ts` (742行) |
| **P0** | 重复组件并存 | 维护混乱 | `components/` vs `components/features/` |
| **P0** | API 错误结构不统一 | 前端难以处理 | 所有 `app/api/*` |
| **P1** | 组件过大 | 难以理解和修改 | `pos-interface.tsx` (623行) |
| **P1** | 部分组件绑过统一 API 层 | 缓存不一致 | 部分组件直接 `fetch` |
| **P2** | 测试覆盖不足 | 重构无信心 | 项目范围 |
| **P2** | 环境变量无类型安全 | 部署易出错 | `lib/db.ts` |

### C.2 问题详解

#### 问题 1: API 路由承载过多业务逻辑（P0）

```
           当前状态                          目标状态
┌─────────────────────────┐          ┌─────────────────────────┐
│   checkout/route.ts     │          │   checkout/route.ts     │
│   (742 行代码)           │    →     │   (约 50 行)             │
│                         │          │   - 参数校验             │
│   - 参数校验             │          │   - 调用 Service         │
│   - 数据库查询           │          │   - 返回响应             │
│   - 业务计算 (AA)        │          └───────────┬─────────────┘
│   - 事务控制             │                      │
│   - HTTP 响应            │          ┌───────────▼─────────────┐
└─────────────────────────┘          │   CheckoutService       │
                                     │   (业务逻辑)             │
                                     └─────────────────────────┘
```

**为什么这是问题？**
- ❌ 难以单元测试（需要模拟 HTTP 请求）
- ❌ 相似逻辑难以复用
- ❌ 新人难以理解 742 行的单个文件

#### 问题 2: 重复组件并存（P0）

```
components/
├── pos-interface.tsx          # 版本 A
├── PosMenuPane.tsx            # 版本 A
└── features/
    └── pos/
        ├── PosInterface.tsx   # 版本 B (新版)
        └── PosMenuPane.tsx    # 版本 B (新版)
```

**为什么这是问题？**
- ❌ 不清楚该用哪个版本
- ❌ Bug 修复可能只改了一个版本
- ❌ 新人容易引入错误的版本

#### 问题 3: API 错误结构不统一（P0）

```typescript
// 当前：各 API 返回格式不一致
{ message: "错误" }      // 某些 API
{ error: "错误" }        // 另一些 API
{ success: false, ... }  // 还有其他格式
```

---

## D. 目标架构

### D.1 分层架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        📱 表示层 (Presentation)                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  app/* (页面)    │    components/* (UI 组件)                     │  │
│  │  - 路由处理       │    - 纯展示组件                               │  │
│  │  - SSR/SSG       │    - 通过 Props 接收数据                       │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        🎯 应用层 (Application)                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  hooks/*          │    lib/services/* (或 services/*)           │  │
│  │  - UI 状态管理     │    - 业务逻辑编排                            │  │
│  │  - 数据获取 Hooks  │    - 事务控制                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        💼 领域层 (Domain) [新增]                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  lib/domain/*                                                   │  │
│  │  - Money.ts (金额值对象)                                         │  │
│  │  - Order.ts (订单实体)                                           │  │
│  │  - Checkout.ts (结账领域逻辑)                                     │  │
│  │  - 纯业务规则，不依赖数据库                                        │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        🗄️ 基础设施层 (Infrastructure)                 │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  app/api/*        │    repositories/*          │    db/*       │  │
│  │  - HTTP 处理      │    - 数据访问抽象            │    - Schema   │  │
│  │  - 参数校验       │    - 封装 Drizzle 调用       │    - 迁移     │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### D.2 依赖规则

```
                    ✅ 允许依赖
┌──────────────────────────────────────┐
│  表示层 → 应用层 → 领域层 ← 基础设施层  │
└──────────────────────────────────────┘

                    ❌ 禁止依赖
┌──────────────────────────────────────┐
│  表示层 ✗ 直接访问数据库              │
│  领域层 ✗ 依赖任何外部层              │
│  应用层 ✗ 依赖表示层                  │
└──────────────────────────────────────┘
```

### D.3 目录结构目标

```
lib/
├── api/              # ✅ 保持 - API 客户端
├── queries/          # ✅ 保持 - React Query Hooks
├── constants/        # ✅ 保持 - 常量定义
├── domain/           # 🆕 新增 - 领域模型
│   ├── Money.ts      #    金额值对象
│   ├── Order.ts      #    订单实体
│   └── Checkout.ts   #    结账领域逻辑
├── contracts/        # 🆕 新增 - Zod 输入/输出约束
├── serializers/      # 🆕 新增 - DB -> API DTO 映射
└── http/             # 🆕 新增 - HTTP 工具
    └── response.ts   #    统一响应函数

services/             # 🆕 新增 - 业务服务层
├── index.ts          #    导出入口
├── orders/
│   ├── checkout.ts
│   ├── create.ts
│   └── transfer.ts
└── daily-closures/
    └── confirm.ts

repositories/         # 🆕 新增 - 数据访问层
├── index.ts          #    导出入口
├── orders.ts
└── transactions.ts
```

---

## E. 改进实施指南

### E.1 第一步：统一 API 响应与错误结构（1小时）

创建统一的 HTTP 响应工具：

```typescript
// lib/http/response.ts

import { NextResponse } from "next/server"
import { ZodError } from "zod"

// 成功响应
export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

// 错误响应
export function jsonError(
  status: number,
  code: string,
  error: string,
  detail?: unknown
) {
  return NextResponse.json({ error, code, detail }, { status })
}

// 统一错误处理包装器
export async function withHandler<T>(
  handler: () => Promise<T>
): Promise<NextResponse> {
  try {
    const result = await handler()
    return jsonOk(result)
  } catch (err) {
    // Zod 校验错误
    if (err instanceof ZodError) {
      return jsonError(400, "VALIDATION_ERROR", "参数校验失败", err.flatten())
    }
    
    // 数据库唯一约束错误
    if ((err as { code?: string }).code === "23505") {
      return jsonError(409, "DUPLICATE_ENTRY", "数据已存在")
    }
    
    // 其他错误
    console.error("[API Error]", err)
    return jsonError(500, "INTERNAL_ERROR", "服务器内部错误")
  }
}
```

**使用方式**：

```typescript
// app/api/orders/route.ts (改进后)

import { withHandler, jsonOk } from "@/lib/http/response"

export async function GET() {
  return withHandler(async () => {
    const orders = await db.select().from(ordersTable)
    return orders
  })
}
```

### E.2 第二步：环境变量类型安全化（30分钟）

```typescript
// lib/env.ts

import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL 必须是有效的 URL"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

// 启动时校验环境变量
export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
})
```

**使用方式**：

```typescript
// lib/db.ts (改进后)

import { env } from "@/lib/env"

const db = drizzle(env.DATABASE_URL)  // 类型安全！
```

### E.3 第三步：统一组件导入路径（2小时）

对于重复的组件，将旧路径改为 re-export：

```typescript
// components/pos-interface.tsx (改为 re-export)

// 旧代码全部删除，只保留一行
export { PosInterface } from "@/components/features/pos/PosInterface"
```

或者移动到 `legacy/` 目录并添加废弃警告：

```typescript
// components/legacy/pos-interface.tsx

/**
 * @deprecated 请使用 @/components/features/pos/PosInterface
 */
export { default } from "@/components/features/pos/PosInterface"
```

### E.4 第四步：抽取 Service 层（1天）

以结账逻辑为例：

```typescript
// services/orders/checkout.ts

import { db, Transaction } from "@/lib/db"
import { calculateCheckoutTotal } from "@/lib/domain/Checkout"

export interface CheckoutInput {
  orderId: number
  paymentMode: "full" | "aa"
  paymentMethod: "cash" | "card"
  items?: { id: number; amount: number }[]
}

export interface CheckoutResult {
  success: boolean
  transactionId: number
  totalPaid: number
}

export async function processCheckout(
  input: CheckoutInput
): Promise<CheckoutResult> {
  return await db.transaction(async (tx: Transaction) => {
    // 1. 获取订单
    const order = await getOrderById(input.orderId, tx)
    
    // 2. 验证订单状态
    if (order.status === "paid") {
      throw new Error("订单已结账")
    }
    
    // 3. 计算金额（使用领域函数）
    const calculation = calculateCheckoutTotal(order, input)
    
    // 4. 更新订单状态
    await updateOrderStatus(input.orderId, "paid", tx)
    
    // 5. 创建交易记录
    const transactionId = await createTransaction(calculation, tx)
    
    return {
      success: true,
      transactionId,
      totalPaid: calculation.total,
    }
  })
}
```

**API 路由简化**：

```typescript
// app/api/orders/checkout/route.ts (改进后：约50行)

import { NextRequest } from "next/server"
import { z } from "zod"
import { withHandler } from "@/lib/http/response"
import { processCheckout } from "@/services/orders/checkout"

const checkoutSchema = z.object({
  orderId: z.number(),
  paymentMode: z.enum(["full", "aa"]),
  paymentMethod: z.enum(["cash", "card"]),
  items: z.array(z.object({
    id: z.number(),
    amount: z.number(),
  })).optional(),
})

export async function POST(req: NextRequest) {
  return withHandler(async () => {
    const body = await req.json()
    const input = checkoutSchema.parse(body)
    return processCheckout(input)
  })
}
```

---

## F. 任务拆解清单

> **说明**: 每条任务包含范围、步骤、验收标准，便于拆分并行推进。

### F.1 基础工程（BASE）

#### BASE-01 (P0) 建立 services/repositories 骨架
**范围**: `services/`, `repositories/`, `services/index.ts`, `repositories/index.ts`  
**步骤**:
1. 新建目录与导出入口
2. 先不动业务逻辑，仅提供结构

**验收**: 目录存在且可被 import，无 lint 报错

#### BASE-02 (P0) 统一 API 响应与错误结构
**范围**: `lib/http/response.ts`, `app/api/*`  
**步骤**:
1. 新增 `jsonOk/jsonError` helper
2. 新增 `withHandler`，统一 Zod/DB 错误映射
3. 先落地到 `app/api/restaurant-tables/route.ts`、`app/api/orders/checkout/route.ts`，再推广全量

**验收**: 全局不再出现 `{ message }` / `{ error }` 混用

#### BASE-03 (P1) 环境变量类型安全化
**范围**: `lib/env.ts`, `lib/db.ts`, `lib/supabase/*`  
**步骤**:
1. 用 zod 校验关键 env
2. 所有 env 通过 `lib/env.ts` 获取

**验收**: 启动缺少 env 时可读错误

#### BASE-04 (P1) DTO 序列化集中管理
**范围**: `lib/serializers/*`, `app/api/menu-items/*`, `app/api/orders/*`  
**步骤**:
1. 新建 `lib/serializers/menu.ts`、`lib/serializers/orders.ts`
2. API route 使用 serializer 返回数据

**验收**: DB -> API 映射仅在 serializers 中出现

---

### F.2 组件/Hook 去重（SSOT）

#### SSOT-01 (P0) POS 组件去重
**范围**: `components/pos-interface.tsx`, `components/PosCheckoutDialog.tsx`, `components/PosMenuPane.tsx`, `components/PosOrderSidebar.tsx`, `components/PosReceiptPreview.tsx`  
**步骤**:
1. 统一保留 `components/features/pos/*` 为唯一实现
2. 旧路径改为 re-export 或移至 `components/legacy/`

**验收**: POS 组件无重复实现，导入路径统一

#### SSOT-02 (P0) Tables 组件去重
**范围**: `components/table-management.tsx`, `components/TableTransferDialogs.tsx`  
**步骤**:
1. 统一保留 `components/features/tables/*`
2. 旧路径 re-export

**验收**: Tables 组件无重复实现

#### SSOT-03 (P0) Menu 组件去重
**范围**: `components/menu-management.tsx`  
**步骤**:
1. 统一保留 `components/features/menu/MenuManagement.tsx`
2. 旧路径 re-export

**验收**: Menu 组件无重复实现

#### SSOT-04 (P0) use-toast 统一
**范围**: `hooks/use-toast.ts`, `components/ui/use-toast.ts`  
**步骤**:
1. 决定单一来源（建议 `components/ui/use-toast.ts`）
2. 其它路径 re-export

**验收**: 全项目只存在一个实现来源

---

### F.3 POS + Orders（POS/ORD）

#### POS-01 (P0) POS 结账使用 query/mutation
**范围**: `components/features/pos/PosInterface.tsx`, `components/pos-interface.tsx`  
**步骤**:
1. 用 `lib/queries/use-orders.ts` 的 `useCheckout` 替换 `fetch`
2. 统一错误提示与 loading 状态

**验收**: UI 不再直接 `fetch` 结账接口

#### POS-02 (P1) 拆分 PosInterface
**范围**: `components/features/pos/PosInterface.tsx`  
**步骤**:
1. 抽出 `PosHeader`、`PosContent`、`PosFooter`（或等价划分）
2. 子组件只通过 props 传递状态

**验收**: `PosInterface.tsx` 行数 < 300

#### ORD-01 (P0) Checkout Service 抽离
**范围**: `app/api/orders/checkout/route.ts`, `services/orders/checkout.ts`, `repositories/orders.ts`, `repositories/transactions.ts`  
**步骤**:
1. 把事务与业务规则迁到 service
2. route 仅校验与调用

**验收**: route 里只剩校验 + service 调用

#### ORD-02 (P0) Order Create Service 抽离
**范围**: `app/api/orders/route.ts`, `services/orders/create.ts`, `repositories/orders.ts`

**验收**: route 无业务逻辑

#### ORD-03 (P0) Order Item Update Service 抽离
**范围**: `app/api/orders/[id]/route.ts`, `services/orders/update-item.ts`, `repositories/order-items.ts`

**验收**: route 无业务逻辑

#### ORD-04 (P0) Order Transfer/Clear Service 抽离
**范围**: `app/api/orders/transfer/route.ts`, `app/api/orders/clear/route.ts`, `services/orders/transfer.ts`, `services/orders/clear.ts`

**验收**: route 无业务逻辑

#### ORD-05 (P1) 结账/AA 计算统一到 domain
**范围**: `lib/checkout/calculate.ts`, `hooks/useCheckout.ts`, `lib/domain/checkout.ts`（新）  
**步骤**:
1. 以 `lib/checkout/calculate.ts` 为核心，建立 `lib/domain/checkout.ts` 入口
2. `hooks/useCheckout.ts` 仅负责 UI 状态管理

**验收**: 业务计算只在 domain 层

---

### F.4 Tables（TBL）

#### TBL-01 (P0) TableManagement 使用 queries
**范围**: `components/features/tables/TableManagement.tsx`, `components/table-management.tsx`  
**步骤**:
1. 使用 `useCreateTable`、`useDeleteTable` 替换 `fetch`
2. UI 只处理表单与 toast

**验收**: Table 管理不再直接 `fetch`

#### TBL-02 (P0) TableTransferDialogs 使用 query/mutation
**范围**: `components/features/tables/TableTransferDialogs.tsx`, `components/TableTransferDialogs.tsx`  
**步骤**:
1. 使用 `useTableOrderQuery` 获取订单
2. 使用 `useTransferOrder` 进行拆并台

**验收**: UI 不再直接 `fetch` 订单/拆并台

#### TBL-03 (P1) useTableTransfer 使用 api client
**范围**: `hooks/useTableTransfer.ts`  
**步骤**:
1. 用 `api.orders.transfer` 或 `useTransferOrder` 替换 `fetch`

**验收**: hook 不直接 `fetch`

#### TBL-04 (P1) Table API Service 抽离
**范围**: `app/api/restaurant-tables/route.ts`, `app/api/restaurant-tables/[id]/route.ts`, `services/tables/*`

**验收**: route 无业务逻辑

---

### F.5 Menu（MENU）

#### MENU-01 (P0) MenuManagement 使用 queries
**范围**: `components/features/menu/MenuManagement.tsx`, `components/menu-management.tsx`  
**步骤**:
1. 使用 `useMenuQuery`、`useCreateMenuItem`、`useUpdateMenuItem`、`useDeleteMenuItem`

**验收**: UI 不再直接 `fetch`

#### MENU-02 (P1) Menu API Service 抽离
**范围**: `app/api/menu-items/route.ts`, `app/api/menu-items/[id]/route.ts`, `app/api/menu-items/[id]/restore/route.ts`, `services/menu/*`

**验收**: route 无业务逻辑

#### MENU-03 (P1) Menu DTO 序列化
**范围**: `lib/serializers/menu.ts`, `app/api/menu-items/*`

**验收**: 序列化逻辑不出现在 route

---

### F.6 Finance（FIN）

#### FIN-01 (P0) Daily Closure Service 抽离
**范围**: `app/api/daily-closure/route.ts`, `services/daily-closure/get-current.ts`

**验收**: route 无业务逻辑

#### FIN-02 (P0) Daily Closure Confirm Service 抽离
**范围**: `app/api/daily-closures/confirm/route.ts`, `services/daily-closures/confirm.ts`

**验收**: route 无业务逻辑

#### FIN-03 (P1) Daily Closure Adjustments Service 抽离
**范围**: `app/api/daily-closures/[id]/adjustments/route.ts`, `services/daily-closures/adjustments.ts`

**验收**: route 无业务逻辑

#### FIN-04 (P1) Daily Closure Export Service 抽离
**范围**: `app/api/daily-closures/[id]/export/route.ts`, `services/daily-closures/export.ts`

**验收**: route 无业务逻辑

#### FIN-05 (P1) Reports Service 抽离
**范围**: `app/api/reports/route.ts`, `services/reports/get.ts`, `lib/reports/*`

**验收**: 聚合逻辑不在 route

#### FIN-06 (P1) Reports Export Service 抽离
**范围**: `app/api/reports/export/route.ts`, `services/reports/export.ts`

**验收**: route 无业务逻辑

#### FIN-07 (P1) Transactions Service 抽离
**范围**: `app/api/transactions/[id]/route.ts`, `app/api/transactions/[id]/reverse/route.ts`, `services/transactions/*`

**验收**: route 无业务逻辑

#### FIN-08 (P1) Checkout History Service 抽离
**范围**: `app/api/checkout-history/route.ts`, `services/checkout-history/get.ts`

**验收**: route 无业务逻辑

#### FIN-09 (P0) Reports UI 使用 query
**范围**: `components/reports-view.tsx`, `lib/queries/use-reports.ts`

**验收**: UI 不再直接 `fetch` 报表

---

### F.7 Settings（SET）

#### SET-01 (P1) Restaurant Settings 引入 api + query
**范围**: `lib/api/client.ts`, `lib/queries/use-restaurant-settings.ts`, `components/settings-view.tsx`  
**步骤**:
1. 增加 `api.restaurantSettings.get/update`
2. 新增 query/mutation
3. 组件用 hooks 调用

**验收**: settings UI 不再直接 `fetch`

---

### F.8 Tests & CI（TEST）

#### TEST-01 (P0) 核心工具函数单测
**范围**: `lib/money.ts`, `lib/order-utils.ts`

**验收**: 覆盖率达标（>60%）

#### TEST-02 (P0) 结账计算单测
**范围**: `lib/checkout/calculate.ts`

**验收**: 核心分支覆盖

#### TEST-03 (P1) Checkout Service 集成测试
**范围**: `services/orders/checkout.ts`, `app/api/orders/checkout/route.ts`

**验收**: 主流程通过、错误路径覆盖

#### TEST-04 (P1) Reports/Daily Closure 单测
**范围**: `lib/reports/*`, `lib/daily-closure/*`

**验收**: 聚合逻辑覆盖

---

## G. 演进路线图

### G.1 改造顺序建议（并行友好）

```
阶段 1 ──────────────────────────────────────────────────────
│ 基础与去重：BASE-01/02 + SSOT-01~04                        │
│ 工作量：1-2 天 | 风险：低                                   │
└──────────────────────────────────────────────────────────

        ↓
        
阶段 2 ──────────────────────────────────────────────────────
│ 数据获取统一：POS-01、TBL-01/02、MENU-01、FIN-09            │
│ 工作量：2-3 天 | 风险：低                                   │
└──────────────────────────────────────────────────────────

        ↓
        
阶段 3 ──────────────────────────────────────────────────────
│ 服务层抽离：ORD-01~04 → FIN-01~08 → MENU-02 → TBL-04       │
│ 工作量：1-2 周 | 风险：中                                   │
└──────────────────────────────────────────────────────────

        ↓
        
阶段 4 ──────────────────────────────────────────────────────
│ 领域化与测试：ORD-05 + TEST-01~04                          │
│ 工作量：1-2 周 | 风险：低                                   │
└──────────────────────────────────────────────────────────
```

### G.2 详细时间表

| 阶段 | 任务 | 工作量 | 风险 | 收益 |
|------|------|--------|------|------|
| **阶段 1** | 创建 `lib/http/response.ts` | S | 低 | 统一错误处理 |
| | 创建 `lib/env.ts` | S | 低 | 启动时发现配置错误 |
| | 统一组件导入（re-export） | M | 低 | 消除混淆 |
| | 为 `lib/money.ts` 补充测试 | S | 无 | 核心逻辑保障 |
| **阶段 2** | 组件使用 React Query | M | 低 | 缓存一致性 |
| **阶段 3** | 创建 `CheckoutService` | L | 中 | 可测试性提升 |
| | 拆分 `pos-interface.tsx` | M | 中 | 可维护性提升 |
| **阶段 4** | 创建 `lib/domain/Money.ts` | S | 低 | 金额计算统一 |
| | 补充 API 集成测试 | M | 无 | 重构安全网 |

---

## H. 常见问题 FAQ

### Q1: 为什么需要 Service 层？直接在 API 路由写不行吗？

**A**: 可以，但会有以下问题：
- 📍 **测试困难**: 需要模拟整个 HTTP 请求才能测试业务逻辑
- 📍 **复用困难**: 如果另一个 API 需要相同逻辑，只能复制代码
- 📍 **代码膨胀**: API 路由会变得越来越大，难以阅读

### Q2: Domain 层和 Service 层有什么区别？

**A**: 
| 层级 | 职责 | 示例 |
|------|------|------|
| **Domain** | 纯业务规则，不涉及数据库 | `calculateTax(amount)` |
| **Service** | 业务编排，调用多个操作 | `processCheckout()` (查询+计算+保存) |

### Q3: 重构一定要一次完成吗？

**A**: 不需要！建议采用**渐进式重构**：
1. 新功能用新架构写
2. 修改旧代码时顺便重构
3. 保持两套代码共存，逐步迁移

### Q4: 优先级 P0/P1/P2 是什么意思？

**A**:
| 优先级 | 含义 | 建议时间 |
|--------|------|----------|
| **P0** | 阻塞开发效率，必须立即解决 | 本周 |
| **P1** | 影响代码质量，应尽快解决 | 本月 |
| **P2** | 改善长期健康度，可以规划 | 季度内 |

---

## I. 附录

### I.1 关键文件索引

| 文件 | 行数 | 状态 | 改进方向 |
|------|------|------|----------|
| [checkout/route.ts](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/app/api/orders/checkout/route.ts) | 742 | ⚠️ | 抽取到 Service |
| [pos-interface.tsx](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/components/pos-interface.tsx) | 623 | ⚠️ | 拆分子组件 |
| [menu-management.tsx](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/components/menu-management.tsx) | 621 | ⚠️ | 拆分子组件 |
| [useCheckout.ts](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/hooks/useCheckout.ts) | 359 | ⚠️ | 需补充测试 |
| [money.ts](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/lib/money.ts) | - | ✅ | 需补充测试 |
| [db/schema.ts](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/db/schema.ts) | 349 | ✅ | 良好 |

### I.2 可验收完成标准

- ✅ 新人可按阅读指南完整追踪 POS/桌台/菜单的数据流
- ✅ UI 中不存在直接 `fetch` 请求
- ✅ 业务逻辑集中在 `services/*` 与 `lib/domain/*`
- ✅ 同名组件/Hook 只有一个实现来源
- ✅ 核心业务计算具备单测覆盖

### I.3 相关文档

- [Codex v2 评审](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/architecture_review_codex_v2.md)
- [Claude v2 评审](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/architecture_review_claude_v2.md)
- [原始评审-Codex版](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/architecture_review_codex.md)
- [原始评审-Claude版](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/architecture_review_claude.md)
- [原始评审-Gemini版](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/architecture_review_gemini.md)

---

> 📝 本文档基于 2025-12-26 代码库快照生成，综合了 Codex v2 的任务拆解与 Claude v2 的架构分析优点，建议随项目演进持续更新。
