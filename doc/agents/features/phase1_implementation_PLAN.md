# Phase 1: 基础与去重（Foundation & Deduplication）

- ID: phase1-foundation-dedup
- Owner: 待分配
- Status: proposed

## Summary
构建基础架构设施（统一 API 响应、service/repository 骨架、contracts 约束层），并清理重复的组件和 Hook，为后续改造奠定基础。

## Scope
- In: 
  - 创建 `lib/http/response.ts` 统一响应工具 + AppError 错误类型
  - 创建 `lib/env.ts` 环境变量类型安全化
  - 建立 `services/` 和 `repositories/` 目录结构
  - 建立 `lib/contracts/` Zod 约束层
  - POS、Tables、Menu 组件去重
  - `use-toast` Hook 统一
  - 将统一响应落地到关键 API 路由并同步 `lib/api/fetcher.ts`
- Out: 
  - 不涉及业务逻辑重构
  - 不修改 UI 页面布局
  - 不新增功能特性

## UX Notes
本阶段为纯技术重构，用户界面无可见变化。

## API / DB
- API: 本阶段仅创建工具函数，不新增 API 端点
- DB: 无数据库变更

## Workflow
1. 创建基础工具 → 2. 建立目录结构 → 3. 组件去重 → 4. Hook 统一 → 5. 统一响应落地 → 6. 验收扫描

## Acceptance Criteria
- [x] `lib/http/response.ts` 存在且包含 `jsonOk`、`jsonError`、`withHandler` 函数
- [x] `lib/http/errors.ts` 存在且包含 `AppError`、`NotFoundError`、`ValidationError` 等类型
- [x] 成功响应结构固定为 `{ data }`，`lib/api/fetcher.ts` 解包返回 `data`
- [x] `lib/env.ts` 存在且用 Zod 校验关键环境变量（使用 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`）
- [x] `services/` 和 `repositories/` 目录存在且可被 import
- [x] `lib/contracts/` 目录存在，包含基础 schema 定义
- [x] POS 组件无重复实现，旧路径使用 re-export
- [x] Tables 组件无重复实现
- [x] Menu 组件无重复实现
- [x] `use-toast` 只有一个唯一实现来源
- [x] 关键 API 路由使用 `withHandler` + `lib/api/fetcher.ts` 解析结构同步
- [x] 验收扫描：`rg "fetch\\(" components hooks` 记录基线

## 任务清单（Tasks）

### Task 1: 创建统一 API 响应工具 + AppError 错误类型
**预计时间**: 1.5小时  
**依赖**: 无

**AI 提示词**:
```
你是一位资深的 Next.js 后端工程师。请完成以下任务：

1. 在 `lib/http/errors.ts` 创建统一错误类型：
   ```typescript
   export class AppError extends Error {
     constructor(
       public code: string,
       public statusCode: number,
       message: string,
       public detail?: unknown
     ) {
       super(message)
       this.name = 'AppError'
     }
   }
   
   export class NotFoundError extends AppError {
     constructor(resource: string, id?: string | number) {
       super('NOT_FOUND', 404, id ? `${resource} ${id} 不存在` : `${resource}不存在`)
     }
   }
   
   export class ValidationError extends AppError {
     constructor(message: string, detail?: unknown) {
       super('VALIDATION_ERROR', 400, message, detail)
     }
   }
   
   export class ConflictError extends AppError {
     constructor(message: string = '数据已存在') {
       super('DUPLICATE_ENTRY', 409, message)
     }
   }
   
   export class UnprocessableError extends AppError {
     constructor(message: string, detail?: unknown) {
       super('UNPROCESSABLE_ENTITY', 422, message, detail)
     }
   }
   ```

2. 在 `lib/http/response.ts` 创建统一响应工具：
   - `jsonOk<T>(data: T, status = 200)`: 返回成功响应
   - `jsonError(status, code, error, detail?)`: 返回错误响应
   - `withHandler<T>(handler)`: 统一错误处理，支持：
     - AppError 及其子类（使用对应 statusCode）
     - Zod 校验错误（400 VALIDATION_ERROR）
     - 数据库唯一约束错误 code=23505（409）
     - 其他错误（500 INTERNAL_ERROR）
   - 成功响应统一返回 `{ data }` 结构

3. 在 `lib/http/index.ts` 统一导出

use context7 获取 Next.js 最新的 API Route 最佳实践。
```

---

### Task 2: 创建环境变量类型安全化模块
**预计时间**: 30分钟  
**依赖**: 无

**AI 提示词**:
```
你是一位资深的 TypeScript 工程师。请完成以下任务：

1. 在 `lib/env.ts` 创建类型安全的环境变量模块：
   - 使用 Zod 定义 `envSchema` 校验以下变量：
     - `DATABASE_URL`: 必须是有效 URL
     - `NEXT_PUBLIC_SUPABASE_URL`: 必须是有效 URL
     - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: 非空字符串（注意：项目使用 PUBLISHABLE_KEY 不是 ANON_KEY）
   - 导出 `env` 常量，在模块加载时校验环境变量
   - 如校验失败，应用启动时显示可读错误信息

2. 更新 `lib/db.ts` 使用 `env.DATABASE_URL` 替代 `process.env.DATABASE_URL`

3. 更新 `lib/supabase/*.ts` 使用 env 对象

**注意**：核准的环境变量名为 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`（与 .env.local 一致）

参考代码：
```typescript
import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL 必须是有效的 URL"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
})

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
})
```
```

---

### Task 3: 建立 services/repositories 目录骨架 + server-only 防护
**预计时间**: 45分钟  
**依赖**: 无

**AI 提示词**:
```
你是一位资深的 Next.js 架构师。请完成以下任务：

1. 创建 `services/` 目录结构：
   - `services/index.ts`: 导出入口，添加 `import 'server-only'` 防止客户端误用
   - `services/orders/`: 订单相关服务（先创建空的 `index.ts`）
   - `services/daily-closures/`: 日结相关服务
   - `services/menu/`: 菜单相关服务
   - `services/tables/`: 桌台相关服务
   - `services/reports/`: 报表相关服务
   - `services/transactions/`: 交易相关服务

2. 创建 `repositories/` 目录结构：
   - `repositories/index.ts`: 导出入口，添加 `import 'server-only'`
   - `repositories/orders.ts`: 订单数据访问
   - `repositories/order-items.ts`: 订单项数据访问
   - `repositories/transactions.ts`: 交易数据访问
   - `repositories/menu.ts`: 菜单数据访问
   - `repositories/tables.ts`: 桌台数据访问
   - `repositories/daily-closures.ts`: 日结数据访问

3. 确保安装 `server-only` 包：`pnpm add server-only`

4. 在每个 index.ts 中添加注释说明该目录的职责

注意：本任务仅创建目录结构，不迁移业务逻辑。`server-only` 确保这些模块不会被客户端组件误导入。
```

---

### Task 4: 创建 lib/contracts 约束层
**预计时间**: 1小时  
**依赖**: 无

**AI 提示词**:
```
你是一位资深的 TypeScript 架构师。请创建 `lib/contracts/` 约束层：

## 背景
contracts 层用于定义 API 输入/输出的 Zod schema，确保前后端类型一致。

## 任务
1. 创建 `lib/contracts/index.ts`：统一导出

2. 创建 `lib/contracts/orders.ts`：
   ```typescript
   import { z } from 'zod'
   
   // 结账输入
   export const checkoutInputSchema = z.object({
     orderId: z.number(),
     paymentMode: z.enum(['full', 'aa']),
     paymentMethod: z.enum(['cash', 'card']),
     items: z.array(z.object({
       id: z.number(),
       amount: z.number(),
     })).optional(),
   })
   export type CheckoutInput = z.infer<typeof checkoutInputSchema>
   
   // 创建订单输入
   export const createOrderInputSchema = z.object({
     tableId: z.number(),
     items: z.array(z.object({
       menuItemId: z.number(),
       quantity: z.number().positive(),
     })),
   })
   export type CreateOrderInput = z.infer<typeof createOrderInputSchema>
   ```

3. 创建 `lib/contracts/menu.ts`：菜单项的 CRUD schema

4. 创建 `lib/contracts/tables.ts`：桌台的 CRUD schema

5. 创建 `lib/contracts/common.ts`：通用 schema（分页、ID 参数等）
   ```typescript
   export const idParamSchema = z.object({ id: z.coerce.number() })
   export const paginationSchema = z.object({
     page: z.coerce.number().default(1),
     limit: z.coerce.number().default(20),
   })
   ```
```

---

### Task 5: POS 组件去重（SSOT-01）
**预计时间**: 1.5小时  
**依赖**: 无

**AI 提示词**:
```
ultrathink

你是一位资深的 React/Next.js 工程师。请完成 POS 组件去重任务：

## 背景
项目中存在重复的 POS 组件：
- `components/pos-interface.tsx` (版本 A)
- `components/PosCheckoutDialog.tsx` (版本 A)
- `components/PosMenuPane.tsx` (版本 A)
- `components/PosOrderSidebar.tsx` (版本 A)
- `components/PosReceiptPreview.tsx` (版本 A)
- `components/features/pos/*` (版本 B - 新版)

## 任务
1. 确认 `components/features/pos/*` 为唯一正式实现
2. 将 `components/` 下的旧 POS 组件改为 re-export，例如：
   ```typescript
   // components/pos-interface.tsx
   export { PosInterface } from "@/components/features/pos/PosInterface"
   ```
3. 或者将旧组件移至 `components/legacy/` 并添加 `@deprecated` 注释
4. 检查所有 import 路径，确保无遗漏

## 要求
- 保持 UI 页面一致，不修改 UI 布局
- 使用 shadcn UI 组件
- 不写兼容代码，直接替换

## 涉及文件
- `components/pos-interface.tsx`
- `components/PosCheckoutDialog.tsx`
- `components/PosMenuPane.tsx`
- `components/PosOrderSidebar.tsx`
- `components/PosReceiptPreview.tsx`
- `components/features/pos/` 目录
```

---

### Task 6: Tables 组件去重（SSOT-02）
**预计时间**: 1小时  
**依赖**: 无

**AI 提示词**:
```
你是一位资深的 React/Next.js 工程师。请完成 Tables 组件去重任务：

## 背景
项目中存在重复的桌台组件：
- `components/table-management.tsx`
- `components/TableTransferDialogs.tsx`
- `components/features/tables/*`

## 任务
1. 确认 `components/features/tables/*` 为唯一正式实现
2. 将旧组件改为 re-export：
   ```typescript
   // components/table-management.tsx
   export { TableManagement } from "@/components/features/tables/TableManagement"
   ```
3. 检查所有 import 路径，更新引用

## 要求
- 保持 UI 页面一致，不修改 UI 布局
- 使用 shadcn UI 组件
- 不写兼容代码

## 涉及文件
- `components/table-management.tsx`
- `components/TableTransferDialogs.tsx`
- `components/features/tables/` 目录
```

---

### Task 7: Menu 组件去重（SSOT-03）
**预计时间**: 45分钟  
**依赖**: 无

**AI 提示词**:
```
你是一位资深的 React/Next.js 工程师。请完成 Menu 组件去重任务：

## 背景
项目中存在重复的菜单组件：
- `components/menu-management.tsx`
- `components/features/menu/MenuManagement.tsx`

## 任务
1. 确认 `components/features/menu/MenuManagement.tsx` 为唯一正式实现
2. 将旧组件改为 re-export：
   ```typescript
   // components/menu-management.tsx
   export { MenuManagement } from "@/components/features/menu/MenuManagement"
   ```
3. 检查所有 import 路径，更新引用

## 要求
- 保持 UI 页面一致
- 使用 shadcn UI 组件
- 不写兼容代码

## 涉及文件
- `components/menu-management.tsx`
- `components/features/menu/` 目录
```

---

### Task 8: use-toast Hook 统一（SSOT-04）
**预计时间**: 30分钟  
**依赖**: 无

**AI 提示词**:
```
你是一位资深的 React 工程师。请完成 use-toast Hook 统一任务：

## 背景
项目中存在重复的 toast Hook：
- `hooks/use-toast.ts`
- `components/ui/use-toast.ts`

## 任务
1. 决定单一来源为 `components/ui/use-toast.ts`（shadcn/ui 标准位置）
2. 将 `hooks/use-toast.ts` 改为 re-export：
   ```typescript
   // hooks/use-toast.ts
   export { useToast, toast } from "@/components/ui/use-toast"
   ```
3. 检查全项目引用，确保无重复实现

## 要求
- 不破坏现有功能
- 保持 API 兼容

## 涉及文件
- `hooks/use-toast.ts`
- `components/ui/use-toast.ts`
```

---

### Task 9: 统一响应落地到关键 API 路由 + 更新 fetcher
**预计时间**: 2小时  
**依赖**: Task 1

**AI 提示词**:
```
你是一位资深的 Next.js 全栈工程师。请完成统一响应落地任务：

## 背景
Task 1 创建了 `lib/http/response.ts`，现在需要将其落地到实际 API 路由，并同步更新前端 API Client 的错误解析逻辑。

## 任务
1. 将 `withHandler` 应用到以下关键 API 路由：
   - `app/api/restaurant-tables/route.ts`
   - `app/api/orders/checkout/route.ts`
   - `app/api/menu-items/route.ts`

2. 更新 `lib/api/fetcher.ts`：
   - 统一错误响应解析，期望格式 `{ error, code, detail }`
   - 成功响应解包 `{ data }`
   - `ApiError` 统一携带 `status/code/detail`

3. 确保前后端响应结构一致

## 参考代码
```typescript
// lib/api/fetcher.ts (示意)
const payload = await response.json().catch(() => null)
if (!response.ok) {
  const message = payload?.error ?? payload?.message ?? `HTTP ${response.status}`
  const code = payload?.code ?? `HTTP_${response.status}`
  throw new ApiError(response.status, code, message, payload?.detail)
}
return (payload?.data ?? payload) as T
```

## 涉及文件
- `lib/http/response.ts`
- `lib/api/fetcher.ts`
- `app/api/restaurant-tables/route.ts`
- `app/api/orders/checkout/route.ts`
- `app/api/menu-items/route.ts`
```

---

### Task 10: 验收扫描 - 记录基线
**预计时间**: 15分钟  
**依赖**: Task 5-8

**AI 提示词**:
```
你是一位 DevOps 工程师。请完成 Phase 1 验收扫描：

## 任务
1. 执行以下扫描命令记录基线：
   ```bash
   # 扫描 components 和 hooks 中的直接 fetch 调用
   rg "fetch\(" components hooks --type ts --type tsx -c > doc/agents/features/phase1_fetch_baseline.txt
   
   # 扫描重复组件引用
   rg "from ['\"]@/components/(pos-interface|table-management|menu-management)" --type ts --type tsx
   ```

2. 将扫描结果记录到 `doc/agents/features/phase1_verification.md`

3. 确认所有组件去重已完成，无重复实现

## 验收清单
- [ ] `lib/http/response.ts` 可正常 import
- [ ] `lib/env.ts` 启动时无报错
- [ ] `services/` 和 `repositories/` 目录结构正确
- [ ] `lib/contracts/` 包含基础 schema
- [ ] 旧组件路径使用 re-export
- [ ] 关键 API 使用 withHandler
- [ ] **Contracts 与 DB 类型对齐验证**：
  - [ ] 所有 contract 枚举值与 `db/schema.ts` 中的 pgEnum 保持一致
  - [ ] 所有 contract 可空字段与 DB 表定义保持一致（nullable vs required）
  - [ ] 所有 contract 必填字段在 API 响应中确实返回
```

---

## Links
- 架构评审 Claude v3: [architecture_review_claude_v3.md](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/architecture_review_claude_v3.md)
- 架构评审 Codex v3: [architecture_review_codex_v3.md](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/architecture_review_codex_v3.md)
- Next.js 最佳实践: [nextjs.instructions.md](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/guides/nextjs.instructions.md)
