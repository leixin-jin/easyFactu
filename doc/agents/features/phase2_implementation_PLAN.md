# Phase 2: 数据获取统一（Unified Data Fetching）

- ID: phase2-data-fetching
- Owner: 待分配
- Status: proposed

## Summary
将所有 UI 组件的直接 `fetch` 调用替换为 TanStack Query（React Query）的 hooks，实现数据缓存一致性和统一的 loading/error 状态管理。明确配置缓存策略，并确保 mutation 的缓存失效策略一致。

## Scope
- In: 
  - POS 结账组件使用 query/mutation
  - POS 组件拆分（POS-02）
  - TableManagement 使用 queries
  - TableTransferDialogs 使用 query/mutation
  - MenuManagement 使用 queries
  - Reports UI 使用 query
  - 配置各模块缓存策略
- Out: 
  - 不涉及服务层抽离（Phase 3）
  - 不修改 API 路由逻辑
  - 不新增功能特性

## UX Notes
本阶段为技术重构，用户可见的变化包括：
- 更一致的 loading 状态展示
- 更统一的错误提示
- 缓存提升（重复请求减少）

## API / DB
- API: 不新增 API 端点，仅统一前端调用方式
- DB: 无数据库变更

## Workflow
1. POS 结账改造 → 2. POS 组件拆分 → 3. Tables 组件改造 → 4. Menu 组件改造 → 5. Reports UI 改造 → 6. 验收扫描

## Acceptance Criteria
- [x] POS 结账 UI 不再直接 `fetch` 结账接口
- [x] `PosInterface.tsx` 行数 < 300（拆分后）
- [x] TableManagement 不再直接 `fetch`
- [x] TableTransferDialogs 不再直接 `fetch`
- [x] MenuManagement 不再直接 `fetch`
- [x] Reports UI 不再直接 `fetch` 报表
- [x] 所有 queries 配置了 staleTime/gcTime
- [x] 所有 mutation 的 `onSuccess` 配置 `invalidateQueries`（对应 queryKey）
- [x] 验收扫描：`rg "fetch\\(" components hooks` 减少或为零

## 缓存策略规范

| 模块 | staleTime | gcTime | 说明 |
|------|-----------|--------|------|
| 菜单 | 5 分钟 | 10 分钟 | 菜单变更不频繁 |
| 桌台 | 30 秒 | 2 分钟 | 需要较新状态 |
| 订单 | 0（实时） | 1 分钟 | 订单需要实时 |
| 报表 | 1 分钟 | 5 分钟 | 统计数据可缓存 |

## 任务清单（Tasks）

### Task 1: POS 结账使用 query/mutation（POS-01）
**预计时间**: 2小时  
**依赖**: Phase 1 完成

**AI 提示词**:
```
ultrathink

你是一位资深的 React/Next.js 工程师，专注于 TanStack Query 数据管理。请完成以下任务：

## 背景
当前 `components/features/pos/PosInterface.tsx` 组件直接使用 `fetch` 调用结账 API，导致：
- 缓存不一致
- loading/error 状态管理分散
- 代码复用性差

## 任务
1. 确认 `lib/queries/use-orders.ts` 中已存在 `useCheckout` mutation（如不存在则创建）
2. 在 `PosInterface.tsx` 中：
   - 用 `useCheckout` mutation 替换直接 `fetch` 调用
   - 使用 mutation 的 `isPending`/`isError` 状态管理 UI
   - 统一错误提示（使用 `useToast`）
   - `onSuccess` 后 `invalidateQueries`（`orders`、`tables` 相关 queryKey）
3. 配置订单相关缓存策略：
   ```typescript
   // 订单需要实时，staleTime = 0
   useQuery({
     queryKey: ['orders', tableId],
     queryFn: () => api.orders.getByTable(tableId),
     staleTime: 0,
     gcTime: 60 * 1000, // 1 分钟
   })
   ```

## 技术要求
- 使用 TanStack Query v5 语法
- 使用 shadcn UI 组件（Button、Toast 等）
- 保持 UI 页面一致，不修改 UI 布局

## 涉及文件
- `lib/queries/use-orders.ts`
- `lib/api/client.ts`（确认 checkout API 客户端存在）
- `components/features/pos/PosInterface.tsx`

use context7 获取 TanStack Query v5 最新文档。
```

---

### Task 2: POS 组件拆分（POS-02）
**预计时间**: 3小时  
**依赖**: Task 1

**AI 提示词**:
```
ultrathink

你是一位资深的 React 组件架构师。请完成 POS 组件拆分任务：

## 背景
当前 `components/features/pos/PosInterface.tsx` 有 600+ 行代码，难以理解和维护。

## 任务
1. 将 `PosInterface.tsx` 拆分为以下子组件：
   - `PosHeader.tsx`: 顶部导航/操作区
   - `PosContent.tsx`: 主内容区（菜单选择）
   - `PosOrderPanel.tsx`: 订单侧边栏
   - `PosFooter.tsx`: 底部操作按钮（如有）

2. 拆分原则：
   - 子组件只通过 props 接收数据和回调
   - 状态提升到父组件或使用 context
   - 每个子组件 < 150 行

3. 创建 `components/features/pos/index.ts` 导出所有组件

4. 确保 `PosInterface.tsx` 最终行数 < 300

## 技术要求
- 使用 shadcn UI 组件
- 保持 UI 页面一致，不修改 UI 布局
- TypeScript 类型安全

## 涉及文件
- `components/features/pos/PosInterface.tsx`
- `components/features/pos/PosHeader.tsx`（新建）
- `components/features/pos/PosContent.tsx`（新建）
- `components/features/pos/PosOrderPanel.tsx`（新建）
- `components/features/pos/index.ts`
```

---

### Task 3: TableManagement 使用 queries（TBL-01）
**预计时间**: 1.5小时  
**依赖**: Phase 1 完成

**AI 提示词**:
```
你是一位资深的 React/Next.js 工程师。请完成 TableManagement 数据获取统一任务：

## 背景
当前 `components/features/tables/TableManagement.tsx` 直接使用 `fetch` 进行桌台的增删改查。

## 任务
1. 确认或创建以下 queries/mutations（在 `lib/queries/use-tables.ts`）：
   - `useTablesQuery()`: 获取所有桌台
   - `useCreateTable()`: 创建桌台
   - `useUpdateTable()`: 更新桌台
   - `useDeleteTable()`: 删除桌台

2. 配置桌台缓存策略：
   ```typescript
   useQuery({
     queryKey: ['tables'],
     queryFn: () => api.tables.list(),
     staleTime: 30 * 1000,  // 30 秒
     gcTime: 2 * 60 * 1000, // 2 分钟
   })
   ```

3. 在 TableManagement 组件中使用 queries/mutations
4. 确保 mutations 成功后 `invalidateQueries({ queryKey: ['tables'] })`

## 涉及文件
- `lib/queries/use-tables.ts`（可能需新建）
- `lib/api/client.ts`
- `components/features/tables/TableManagement.tsx`

use context7
```

---

### Task 4: TableTransferDialogs 使用 query/mutation（TBL-02 + TBL-03）
**预计时间**: 1.5小时  
**依赖**: Task 3

**AI 提示词**:
```
你是一位资深的 React/Next.js 工程师。请完成 TableTransferDialogs 数据获取统一任务：

## 背景
当前 `components/features/tables/TableTransferDialogs.tsx` 直接使用 `fetch` 获取订单信息和执行拆并台操作。

## 任务
1. 确认或创建以下 queries/mutations：
   - `useTableOrderQuery(tableId)`: 获取指定桌台的订单
   - `useTransferOrder()`: 执行订单转移/拆并台

2. 在 TableTransferDialogs 组件中使用
   - 转台成功后 `invalidateQueries`（`orders`、`tables` 对应 queryKey）

3. 更新 `hooks/useTableTransfer.ts`（TBL-03）：
   - 使用 `api.orders.transfer` 或 `useTransferOrder` 替换直接 `fetch`

## 涉及文件
- `lib/queries/use-tables.ts` 或 `lib/queries/use-orders.ts`
- `lib/api/client.ts`
- `components/features/tables/TableTransferDialogs.tsx`
- `hooks/useTableTransfer.ts`

use context7
```

---

### Task 5: MenuManagement 使用 queries（MENU-01）
**预计时间**: 1.5小时  
**依赖**: Phase 1 完成

**AI 提示词**:
```
你是一位资深的 React/Next.js 工程师。请完成 MenuManagement 数据获取统一任务：

## 背景
当前 `components/features/menu/MenuManagement.tsx` 直接使用 `fetch` 进行菜单项的增删改查。

## 任务
1. 确认或创建以下 queries/mutations（在 `lib/queries/use-menu.ts`）：
   - `useMenuQuery()`: 获取所有菜单项
   - `useCreateMenuItem()`: 创建菜单项
   - `useUpdateMenuItem()`: 更新菜单项
   - `useDeleteMenuItem()`: 删除菜单项（软删除）
   - `useRestoreMenuItem()`: 恢复已删除菜单项

2. 配置菜单缓存策略：
   ```typescript
   useQuery({
     queryKey: ['menu-items'],
     queryFn: () => api.menu.list(),
     staleTime: 5 * 60 * 1000,  // 5 分钟
     gcTime: 10 * 60 * 1000,    // 10 分钟
   })
   ```

3. 在 MenuManagement 组件中使用
4. mutations 成功后 `invalidateQueries`（`menu-items` 与 `menu-items-deleted`）

## 涉及文件
- `lib/queries/use-menu.ts`
- `lib/api/client.ts`
- `components/features/menu/MenuManagement.tsx`

use context7
```

---

### Task 6: Reports UI 使用 query（FIN-09）
**预计时间**: 1.5小时  
**依赖**: Phase 1 完成

**AI 提示词**:
```
你是一位资深的 React/Next.js 工程师。请完成 Reports UI 数据获取统一任务：

## 背景
当前 `components/reports-view.tsx` 直接使用 `fetch` 获取报表数据。

## 任务
1. 确认或创建以下 queries（在 `lib/queries/use-reports.ts`）：
   - `useReportsQuery(params)`: 获取报表数据
   - `useExportReport()`: 导出报表

2. 配置报表缓存策略：
   ```typescript
   useQuery({
     queryKey: ['reports', dateRange],
     queryFn: () => api.reports.get(dateRange),
     staleTime: 60 * 1000,      // 1 分钟
     gcTime: 5 * 60 * 1000,     // 5 分钟
   })
   ```

3. 在 reports-view 组件中使用

## 涉及文件
- `lib/queries/use-reports.ts`
- `lib/api/client.ts`
- `components/reports-view.tsx`

use context7
```

---

### Task 7: Restaurant Settings 引入 api + query（SET-01）
**预计时间**: 1小时  
**依赖**: Phase 1 完成

**AI 提示词**:
```
你是一位资深的 React/Next.js 工程师。请完成 Restaurant Settings 数据获取统一任务：

## 任务
1. 在 `lib/api/client.ts` 中增加：
   - `api.restaurantSettings.get()`: 获取设置
   - `api.restaurantSettings.update(data)`: 更新设置

2. 创建或更新 `lib/queries/use-restaurant-settings.ts`

3. 在 settings-view 组件中使用
4. update mutation 成功后 `invalidateQueries({ queryKey: ['restaurant-settings'] })`

## 涉及文件
- `lib/api/client.ts`
- `lib/queries/use-restaurant-settings.ts`
- `components/settings-view.tsx`

use context7
```

---

### Task 8: 验收扫描 - 确认无直接 fetch
**预计时间**: 15分钟  
**依赖**: Task 1-7

**AI 提示词**:
```
你是一位 DevOps 工程师。请完成 Phase 2 验收扫描：

## 任务
1. 执行扫描命令：
   ```bash
   # 扫描 components 和 hooks 中剩余的直接 fetch 调用
   rg "fetch\(" components hooks --type ts --type tsx
   
   # 对比 Phase 1 基线
   diff doc/agents/features/phase1_fetch_baseline.txt <(rg "fetch\(" components hooks --type ts --type tsx -c)
   ```

2. 确认以下 queries 有正确的缓存配置：
   - 菜单: staleTime 5 分钟
   - 桌台: staleTime 30 秒
   - 订单: staleTime 0
   - 报表: staleTime 1 分钟

3. 确认 PosInterface.tsx 行数 < 300
4. 抽查各 useMutation 是否包含 `invalidateQueries`（orders/tables/menu/settings）

5. 记录结果到 `doc/agents/features/phase2_verification.md`
```

---

## Links
- 架构评审 Claude v3: [architecture_review_claude_v3.md](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/architecture_review_claude_v3.md)
- TanStack Query 文档: https://tanstack.com/query/latest
- Phase 1 计划: [phase1_implementation_PLAN.md](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/agents/features/phase1_implementation_PLAN.md)
