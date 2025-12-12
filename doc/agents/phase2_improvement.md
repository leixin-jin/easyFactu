# Phase 2: 架构优化（功能模板 · 任务驱动）

- ID: phase2-architecture
- Owner: Development Team
- Status: proposed

## Summary
引入现代化状态管理和数据获取方案，统一 API 客户端，整合类型系统，为代码库提供可扩展的架构基础。

## Scope
- In: 
  - 引入 TanStack Query 统一数据获取
  - 封装统一 API 客户端层
  - 整合分散的类型定义
  - 按功能模块重组目录结构
- Out: 
  - 不修改现有 UI 页面布局和样式
  - 不变更现有业务逻辑
  - 不变更数据库 schema

## UX Notes
- 本阶段为架构优化，用户无感知
- 保持所有现有功能正常运行
- 可能带来数据加载性能提升（缓存机制）

## API / DB
- API: 保持现有端点不变，仅封装客户端调用方式
- DB: 不变更

## Workflow
1. 安装依赖 → 2. API 客户端封装 → 3. 类型系统整合 → 4. TanStack Query 集成 → 5. 目录重组 → 6. 验收测试

## Acceptance Criteria
- [ ] TanStack Query 成功集成并应用于至少 3 个数据获取场景
- [ ] API 客户端统一封装，所有 fetch 调用迁移完成
- [ ] 类型定义集中在 `types/` 目录，无分散定义
- [ ] 目录结构按功能模块组织清晰
- [ ] `pnpm lint` 无错误
- [ ] `pnpm build` 构建成功
- [ ] 现有功能回归测试通过

## 任务清单（Tasks）

### Task 1: 安装 TanStack Query 依赖
**预计时间**: 0.5小时
**依赖**: Phase 1 完成

**AI 提示词**:
```
你是一位资深的 Next.js 工程师，专注于现代化前端架构。

任务：安装和配置 TanStack Query。

具体要求：
1. 安装依赖：
   - `@tanstack/react-query`
   - `@tanstack/react-query-devtools`（开发依赖）
2. 创建 `lib/query-client.ts`：
   - 配置默认的 QueryClient
   - 设置合理的 staleTime 和 cacheTime
   - 配置全局错误处理
3. 创建 `components/providers/QueryProvider.tsx`：
   - 封装 QueryClientProvider
   - 包含 ReactQueryDevtools（仅开发环境）
4. 在 `app/layout.tsx` 中集成 QueryProvider

use context7 查阅 TanStack Query v5 与 Next.js App Router 集成最佳实践。

运行 `pnpm lint` 和 `pnpm build` 确保无错误。
```

---

### Task 2: API 响应类型定义
**预计时间**: 1.5小时
**依赖**: 无

**AI 提示词**:
```
你是一位资深的 TypeScript 工程师，专注于类型安全和代码规范。

任务：统一 API 响应类型定义。

具体要求：
1. 在 `types/` 目录下创建以下文件：
   - `types/api.ts` - API 请求/响应类型
   - `types/database.ts` - 数据库实体类型（从 db/schema.ts 推导）
   - `types/index.ts` - 统一导出入口
2. 定义通用 API 响应结构：
   ```typescript
   interface ApiResponse<T> {
     success: boolean
     data?: T
     error?: { code: string; message: string; detail?: unknown }
   }
   ```
3. 为以下 API 定义具体响应类型：
   - `/api/orders` - OrderResponse, OrderListResponse
   - `/api/restaurant-tables` - TableResponse, TableListResponse
   - `/api/menu-items` - MenuItemResponse, MenuItemListResponse
4. 从 `types/pos.ts` 迁移相关类型到新结构

参考现有代码：
- `types/pos.ts` - 现有类型定义
- `db/schema.ts` - 数据库 schema
- `app/api/orders/route.ts` - API 响应结构参考

运行 `pnpm lint` 和 `pnpm build` 确保无错误。
```

---

### Task 3: API 客户端封装
**预计时间**: 2小时
**依赖**: Task 2

**AI 提示词**:
```
你是一位资深的 TypeScript 工程师，专注于 API 层设计和类型安全。

ultrathink

任务：创建统一的 API 客户端层。

具体要求：
1. 创建 `lib/api/` 目录
2. 创建 `lib/api/fetcher.ts`：
   - 封装基础 fetch 函数
   - 统一处理请求头、超时、错误
   - 支持泛型类型推断
   ```typescript
   async function fetcher<T>(url: string, options?: RequestInit): Promise<T>
   ```
3. 创建 `lib/api/client.ts`：
   - 按模块组织 API 方法
   ```typescript
   export const api = {
     orders: {
       get: (tableId: string) => fetcher<OrderResponse>(...),
       create: (data: CreateOrderInput) => fetcher<OrderResponse>(...),
       checkout: (data: CheckoutInput) => fetcher<CheckoutResponse>(...),
     },
     tables: {
       list: () => fetcher<TableListResponse>(...),
       create: (data: CreateTableInput) => fetcher<TableResponse>(...),
       delete: (id: string) => fetcher<void>(...),
     },
     menuItems: {
       list: () => fetcher<MenuItemListResponse>(...),
       create: (data: CreateMenuItemInput) => fetcher<MenuItemResponse>(...),
       delete: (id: string) => fetcher<void>(...),
     },
   }
   ```
4. 创建 `lib/api/index.ts` 统一导出

参考现有代码：
- `hooks/usePosOrder.ts` - fetch 调用示例
- `hooks/useMenuData.ts` - fetch 调用示例
- `hooks/useRestaurantTables.ts` - fetch 调用示例

use context7 查阅 TypeScript fetch 封装最佳实践。

运行 `pnpm lint` 和 `pnpm build` 确保无错误。
```

---

### Task 4: TanStack Query - 桌台数据查询
**预计时间**: 1.5小时
**依赖**: Task 1, Task 3

**AI 提示词**:
```
你是一位资深的 React/TypeScript 工程师，专注于数据获取和状态管理。

任务：使用 TanStack Query 重构桌台数据获取逻辑。

具体要求：
1. 创建 `lib/queries/` 目录
2. 创建 `lib/queries/use-tables.ts`：
   - 使用 `useQuery` 封装桌台列表查询
   - 使用 `useMutation` 封装创建/删除操作
   - 配置适当的 queryKey 和 staleTime
   ```typescript
   export function useTables(options?: UseTablesOptions) {
     return useQuery({
       queryKey: ['tables'],
       queryFn: () => api.tables.list(),
       // ...
     })
   }
   
   export function useCreateTable() {
     return useMutation({
       mutationFn: api.tables.create,
       onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] }),
     })
   }
   ```
3. 更新 `hooks/useRestaurantTables.ts`：
   - 内部使用新的 TanStack Query hooks
   - 保持对外 API 接口不变
4. 验证 `components/table-management.tsx` 功能正常

use context7 查阅 TanStack Query useQuery 和 useMutation 最佳实践。

保持 UI 页面一致。运行 `pnpm lint` 和 `pnpm build` 确保无错误。
```

---

### Task 5: TanStack Query - 菜单数据查询
**预计时间**: 1.5小时
**依赖**: Task 1, Task 3

**AI 提示词**:
```
你是一位资深的 React/TypeScript 工程师，专注于数据获取和状态管理。

任务：使用 TanStack Query 重构菜单数据获取逻辑。

具体要求：
1. 创建 `lib/queries/use-menu.ts`：
   - 使用 `useQuery` 封装菜单列表查询
   - 使用 `useMutation` 封装创建/删除操作
   - 配置适当的缓存策略
   ```typescript
   export function useMenuItems(options?: UseMenuItemsOptions) {
     return useQuery({
       queryKey: ['menuItems'],
       queryFn: () => api.menuItems.list(),
       staleTime: 5 * 60 * 1000, // 菜单数据可以缓存较长时间
     })
   }
   ```
2. 更新 `hooks/useMenuData.ts`：
   - 内部使用新的 TanStack Query hooks
   - 保持对外 API 接口不变（items, categories, loading, error, refresh）
3. 验证以下页面功能正常：
   - `components/menu-management.tsx`
   - `components/PosMenuPane.tsx`

use context7 查阅 TanStack Query 缓存策略最佳实践。

保持 UI 页面一致。运行 `pnpm lint` 和 `pnpm build` 确保无错误。
```

---

### Task 6: TanStack Query - 订单数据查询
**预计时间**: 2小时
**依赖**: Task 1, Task 3

**AI 提示词**:
```
你是一位资深的 React/TypeScript 工程师，专注于数据获取和状态管理。

ultrathink

任务：使用 TanStack Query 重构订单数据获取逻辑。

具体要求：
1. 创建 `lib/queries/use-orders.ts`：
   - 使用 `useQuery` 封装订单查询（按 tableId）
   - 使用 `useMutation` 封装下单、结账、清空等操作
   - 配置乐观更新（Optimistic Updates）
   ```typescript
   export function useTableOrder(tableId: string) {
     return useQuery({
       queryKey: ['orders', tableId],
       queryFn: () => api.orders.get(tableId),
       enabled: !!tableId,
       staleTime: 0, // 订单数据需要实时
     })
   }
   
   export function useCreateOrderBatch() {
     return useMutation({
       mutationFn: api.orders.create,
       onSuccess: (data, variables) => {
         queryClient.invalidateQueries({ queryKey: ['orders', variables.tableId] })
         queryClient.invalidateQueries({ queryKey: ['tables'] })
       },
     })
   }
   ```
2. 更新 `hooks/usePosOrder.ts`：
   - 内部使用新的 TanStack Query hooks
   - 保持对外 API 接口不变
3. 验证 POS 点单流程完整功能正常

注意：订单相关操作较复杂，需要处理好状态同步和错误回滚。

use context7 查阅 TanStack Query 乐观更新和错误处理最佳实践。

保持 UI 页面一致。运行 `pnpm lint` 和 `pnpm build` 确保无错误。
```

---

### Task 7: 目录结构重组 - 功能模块化
**预计时间**: 2小时
**依赖**: Task 4, Task 5, Task 6

**AI 提示词**:
```
你是一位资深的前端架构师，专注于代码组织和可维护性。

ultrathink

任务：按功能模块重组组件目录结构。

具体要求：
1. 创建功能模块目录结构：
   ```
   components/
   ├── features/
   │   ├── pos/
   │   │   ├── PosInterface.tsx
   │   │   ├── PosMenuPane.tsx
   │   │   ├── PosOrderSidebar.tsx
   │   │   ├── PosCheckoutDialog.tsx
   │   │   ├── PosReceiptPreview.tsx
   │   │   └── index.ts
   │   ├── tables/
   │   │   ├── TableManagement.tsx
   │   │   ├── TableCard.tsx
   │   │   └── index.ts
   │   ├── menu/
   │   │   ├── MenuManagement.tsx
   │   │   └── index.ts
   │   └── finance/
   │       ├── FinanceManagement.tsx
   │       ├── ExpenseDialog.tsx
   │       └── index.ts
   ├── shared/
   │   ├── TableSelect.tsx
   │   ├── PriceDisplay.tsx
   │   └── index.ts
   └── ui/  (保持不变)
   ```
2. 移动组件到对应目录
3. 创建每个模块的 `index.ts` 统一导出
4. 更新所有导入路径
5. 更新 `app/` 下页面的组件导入

注意事项：
- 使用 VSCode/IDE 的重命名功能辅助更新导入
- 保持 `components/ui/` 目录不变
- 确保所有页面正常渲染

保持 UI 页面一致。运行 `pnpm lint` 和 `pnpm build` 确保无错误。
```

---

### Task 8: 回归测试与文档更新
**预计时间**: 1小时
**依赖**: Task 1-7

**AI 提示词**:
```
你是一位资深的 QA 工程师和技术文档编写者。

任务：验证 Phase 2 架构优化结果并更新相关文档。

具体要求：
1. 运行验证命令：
   - `pnpm lint` - 检查代码规范
   - `pnpm build` - 确保构建成功
2. 功能验证清单：
   - [ ] 桌台管理页面数据加载和 CRUD
   - [ ] 菜单管理页面数据加载和 CRUD
   - [ ] POS 点单完整流程（选桌台→点菜→下单→结账）
   - [ ] 财务管理页面数据展示
   - [ ] 验证数据缓存生效（网络面板观察请求次数）
3. 更新 `AGENTS.md` 文件，添加：
   - 新架构目录结构说明
   - TanStack Query 使用指南
   - API 客户端使用示例
4. 在 `doc/agents/` 下创建 `phase2_completion_report.md`，记录：
   - 完成的任务列表
   - 引入的新依赖
   - 架构变更说明
   - 性能改进点

保持文档简洁清晰，便于团队成员理解架构变更。
```

## Links
- 优化方案：`doc/opus_improve_plan.md`
- Phase 1 计划：`doc/agents/phase1_improvement.md`
- 编码规范：`doc/guides/nextjs.instructions.md`
- TanStack Query 官方文档：https://tanstack.com/query/latest
