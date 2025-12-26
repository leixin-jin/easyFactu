# Phase 3: 服务层抽离（Service Layer Extraction）

- ID: phase3-service-layer
- Owner: 待分配
- Status: proposed

## Summary
将 API 路由中的业务逻辑抽取到独立的 Service 层，使 API 路由仅负责参数校验和调用 Service，提升代码可测试性和可复用性。DB 访问统一走 repositories，使用 server-only 防止客户端误用。

## Scope
- In: 
  - 订单相关 Service 抽离（Checkout、Create、Update、Transfer、Clear）
  - 日结相关 Service 抽离
  - 报表 Service 抽离
  - 菜单 API Service 抽离
  - 桌台 API Service 抽离
  - 交易 Service 抽离
  - Serializer 层完善（orders、transactions、reports、daily-closures、checkout-history）
  - Contracts 扩展并在 API 路由落地（finance/settings/checkout-history 等）
- Out: 
  - 不修改 UI 组件
  - 不新增功能特性
  - 领域层抽取在 Phase 4

## UX Notes
本阶段为纯后端重构，用户界面无可见变化。

## API / DB
- API: API 端点保持不变，仅重构内部实现
- DB: 无数据库变更

## 架构规范

### 层级依赖规则
```
app/api/* (HTTP 处理)
    ↓ 调用
services/* (业务编排 + 事务)
    ↓ 调用
repositories/* (DB 访问)
    ↓ 使用
lib/domain/* (业务规则)
```

### server-only 防护
所有 `services/*` 和 `repositories/*` 必须添加 `import 'server-only'`，防止客户端组件误导入。

### DB 访问统一
- 禁止在 `app/api/*` 直接操作 db
- 所有 DB 访问必须经过 `repositories/*`

## Workflow
1. 订单 Service 抽离 → 2. 日结 Service 抽离 → 3. 报表 Service 抽离 → 4. Serializer 完善 → 5. 菜单/桌台 Service 抽离 → 6. 交易 Service 抽离 → 7. Contracts 落地 → 8. 验收

## Acceptance Criteria
- [x] `app/api/orders/checkout/route.ts` 只剩校验 + Service 调用（约50行）
- [x] 所有订单相关 route 无业务逻辑和直接 DB 操作
- [x] 所有日结相关 route 无业务逻辑
- [x] 所有报表相关 route 无业务逻辑
- [x] 所有菜单相关 route 无业务逻辑
- [x] 所有桌台相关 route 无业务逻辑
- [x] 业务逻辑集中在 `services/*`
- [x] DB 操作集中在 `repositories/*`
- [x] `lib/serializers/*` 包含 orders、transactions、reports、daily-closures、checkout-history 的 DTO 映射
- [x] `app/api/*` 参数校验统一使用 `lib/contracts/*`（避免 route 内零散 Zod schema）

## 任务清单（Tasks）

### Task 1: Checkout Service 抽离（ORD-01）
**预计时间**: 4小时  
**依赖**: Phase 1, Phase 2 完成

**AI 提示词**:
```
ultrathink

你是一位资深的 Next.js 后端架构师。请完成 Checkout Service 抽离任务：

## 背景
当前 `app/api/orders/checkout/route.ts` 有 742 行代码，包含参数校验、数据库查询、业务计算、事务控制、HTTP 响应。

## 任务
1. 创建 `services/orders/checkout.ts`：
   - 添加 `import 'server-only'`
   - 使用 `lib/contracts/orders.ts` 的 `CheckoutInput` 类型
   - 实现 `processCheckout(input: CheckoutInput): Promise<CheckoutResult>`
   - 通过 `repositories/*` 访问数据库
   - 使用 `lib/http/errors.ts` 的错误类型

2. 确保 `repositories/orders.ts`：
   - 添加 `import 'server-only'`
   - 实现 `getOrderById(orderId, tx?)`
   - 实现 `updateOrderStatus(orderId, status, tx?)`

3. 确保 `repositories/transactions.ts`：
   - 添加 `import 'server-only'`
   - 实现 `createTransaction(data, tx?)`

4. 简化 `app/api/orders/checkout/route.ts`：
   - 仅保留 Zod 校验 + Service 调用
   - 使用 `lib/http/response.ts` 的 `withHandler`
   - 使用 `lib/contracts/orders.ts` 的 schema

## 架构规范
- DB 访问只能通过 repositories
- 禁止在 service 中直接操作 db（除了事务控制 db.transaction）
- 使用 NotFoundError/ConflictError 等类型化错误

## 涉及文件
- `app/api/orders/checkout/route.ts`
- `services/orders/checkout.ts`
- `repositories/orders.ts`
- `repositories/transactions.ts`
- `lib/contracts/orders.ts`

use context7
```

---

### Task 2: Order Create Service 抽离（ORD-02）
**预计时间**: 2小时  
**依赖**: Task 1

**AI 提示词**:
```
你是一位资深的 Next.js 后端架构师。请完成 Order Create Service 抽离任务：

## 任务
1. 创建 `services/orders/create.ts`：
   - 添加 `import 'server-only'`
   - 使用 `lib/contracts/orders.ts` 的 `CreateOrderInput`
   - 通过 `repositories/orders.ts` 访问数据库

2. 在 `repositories/orders.ts` 添加：
   - `createOrder(data, tx?)`
   - `addOrderItems(orderId, items, tx?)`

3. 简化 `app/api/orders/route.ts` 的 POST 方法

## 涉及文件
- `app/api/orders/route.ts`
- `services/orders/create.ts`
- `repositories/orders.ts`
- `lib/contracts/orders.ts`
```

---

### Task 3: Order Item Update Service 抽离（ORD-03）
**预计时间**: 2小时  
**依赖**: Task 1

**AI 提示词**:
```
你是一位资深的 Next.js 后端架构师。请完成 Order Item Update Service 抽离任务：

## 任务
1. 创建 `services/orders/update-item.ts`
2. 创建 `repositories/order-items.ts`：
   - 添加 `import 'server-only'`
   - `getOrderItem(id, tx?)`
   - `updateOrderItem(id, data, tx?)`
   - `deleteOrderItem(id, tx?)`

3. 简化 `app/api/orders/[id]/route.ts`

## 涉及文件
- `app/api/orders/[id]/route.ts`
- `services/orders/update-item.ts`
- `repositories/order-items.ts`
```

---

### Task 4: Order Transfer/Clear Service 抽离（ORD-04）
**预计时间**: 2小时  
**依赖**: Task 1

**AI 提示词**:
```
你是一位资深的 Next.js 后端架构师。请完成 Order Transfer/Clear Service 抽离任务：

## 任务
1. 创建 `services/orders/transfer.ts`
2. 创建 `services/orders/clear.ts`
3. 简化对应的 API 路由

## 涉及文件
- `app/api/orders/transfer/route.ts`
- `app/api/orders/clear/route.ts`
- `services/orders/transfer.ts`
- `services/orders/clear.ts`
```

---

### Task 5: Daily Closure Service 抽离（FIN-01, FIN-02）
**预计时间**: 3小时  
**依赖**: Phase 1 完成

**AI 提示词**:
```
ultrathink

你是一位资深的 Next.js 后端架构师。请完成 Daily Closure Service 抽离任务：

## 任务
1. 创建 `services/daily-closures/get-current.ts`（FIN-01）
2. 创建 `services/daily-closures/confirm.ts`（FIN-02）
3. 创建 `repositories/daily-closures.ts`
4. 简化对应的 API 路由

## 涉及文件
- `app/api/daily-closure/route.ts`
- `app/api/daily-closures/confirm/route.ts`
- `services/daily-closures/get-current.ts`
- `services/daily-closures/confirm.ts`
- `repositories/daily-closures.ts`
```

---

### Task 6: Daily Closure Adjustments & Export Service 抽离（FIN-03, FIN-04）
**预计时间**: 2小时  
**依赖**: Task 5

**AI 提示词**:
```
你是一位资深的 Next.js 后端架构师。请完成 Daily Closure 附加功能 Service 抽离：

## 任务
1. 创建 `services/daily-closures/adjustments.ts`（FIN-03）
2. 创建 `services/daily-closures/export.ts`（FIN-04）
3. 简化对应的 API 路由

## 涉及文件
- `app/api/daily-closures/[id]/adjustments/route.ts`
- `app/api/daily-closures/[id]/export/route.ts`
- `services/daily-closures/adjustments.ts`
- `services/daily-closures/export.ts`
```

---

### Task 7: Reports Service 抽离（FIN-05, FIN-06）
**预计时间**: 2.5小时  
**依赖**: Phase 1 完成

**AI 提示词**:
```
你是一位资深的 Next.js 后端架构师。请完成 Reports Service 抽离任务：

## 任务
1. 创建 `services/reports/get.ts`（FIN-05）
2. 创建 `services/reports/export.ts`（FIN-06）
3. 简化对应的 API 路由

## 涉及文件
- `app/api/reports/route.ts`
- `app/api/reports/export/route.ts`
- `services/reports/get.ts`
- `services/reports/export.ts`
```

---

### Task 8: Transactions Service 抽离（FIN-07）
**预计时间**: 2小时  
**依赖**: Task 1

**AI 提示词**:
```
你是一位资深的 Next.js 后端架构师。请完成 Transactions Service 抽离任务：

## 任务
1. 创建 `services/transactions/get.ts`
2. 创建 `services/transactions/reverse.ts`
3. 简化对应的 API 路由

## 涉及文件
- `app/api/transactions/[id]/route.ts`
- `app/api/transactions/[id]/reverse/route.ts`
- `services/transactions/get.ts`
- `services/transactions/reverse.ts`
```

---

### Task 9: Checkout History Service 抽离（FIN-08）
**预计时间**: 1.5小时  
**依赖**: Task 1

**AI 提示词**:
```
你是一位资深的 Next.js 后端架构师。请完成 Checkout History Service 抽离任务：

## 任务
1. 创建 `services/checkout-history/get.ts`
2. 简化 `app/api/checkout-history/route.ts`

## 涉及文件
- `app/api/checkout-history/route.ts`
- `services/checkout-history/get.ts`
```

---

### Task 10: Serializer 层完善（BASE-04 扩展）
**预计时间**: 2小时  
**依赖**: Task 1-9

**AI 提示词**:
```
你是一位资深的 TypeScript 架构师。请完善 Serializer 层：

## 背景
Phase 1 只规划了 `lib/serializers/menu.ts`，需要补充其他模块的 DTO 映射。

## 任务
1. 创建 `lib/serializers/orders.ts`：
   - `serializeOrder(dbOrder): OrderDTO`
   - `serializeOrderItem(dbItem): OrderItemDTO`
   - `serializeCheckoutResult(result): CheckoutResultDTO`

2. 创建 `lib/serializers/transactions.ts`：
   - `serializeTransaction(dbTx): TransactionDTO`

3. 创建 `lib/serializers/reports.ts`：
   - `serializeReport(data): ReportDTO`

4. 创建 `lib/serializers/daily-closures.ts`：
   - `serializeDailyClosure(data): DailyClosureDTO`
   - `serializeDailyClosureAdjustment(data): DailyClosureAdjustmentDTO`

5. 创建 `lib/serializers/checkout-history.ts`：
   - `serializeCheckoutHistoryItem(data): CheckoutHistoryItemDTO`

6. 创建 `lib/serializers/index.ts`：统一导出

7. 更新各 API 路由使用 serializer

## 原则
- DB 字段名 -> API 字段名的映射只在 serializers 中出现
- snake_case（DB）-> camelCase（API）
- 隐藏敏感字段

## 涉及文件
- `lib/serializers/orders.ts`（新建）
- `lib/serializers/transactions.ts`（新建）
- `lib/serializers/reports.ts`（新建）
- `lib/serializers/daily-closures.ts`（新建）
- `lib/serializers/checkout-history.ts`（新建）
- `lib/serializers/index.ts`
```

---

### Task 11: Menu API Service 抽离（MENU-02, MENU-03）
**预计时间**: 2小时  
**依赖**: Phase 2 MENU-01, Task 10

**AI 提示词**:
```
你是一位资深的 Next.js 后端架构师。请完成 Menu API Service 抽离任务：

## 任务
1. 创建 `services/menu/` 目录下的服务
2. 使用 `repositories/menu.ts`
3. 使用 `lib/serializers/menu.ts`
4. 简化对应的 API 路由

## 涉及文件
- `app/api/menu-items/route.ts`
- `app/api/menu-items/[id]/route.ts`
- `app/api/menu-items/[id]/restore/route.ts`
- `services/menu/*`
- `repositories/menu.ts`
- `lib/serializers/menu.ts`
```

---

### Task 12: Table API Service 抽离（TBL-04）
**预计时间**: 2小时  
**依赖**: Phase 2 TBL-01

**AI 提示词**:
```
你是一位资深的 Next.js 后端架构师。请完成 Table API Service 抽离任务：

## 任务
1. 创建 `services/tables/` 目录下的服务
2. 使用 `repositories/tables.ts`
3. 简化对应的 API 路由

## 涉及文件
- `app/api/restaurant-tables/route.ts`
- `app/api/restaurant-tables/[id]/route.ts`
- `services/tables/*`
- `repositories/tables.ts`
```

---

### Task 13: Contracts 扩展 + 路由落地
**预计时间**: 2小时  
**依赖**: Phase 1 Task 4

**AI 提示词**:
```
你是一位资深的 TypeScript 架构师。请扩展 contracts 并在 API 路由落地：

## 任务
1. 扩展 `lib/contracts/*`：
   - `lib/contracts/reports.ts`（日期范围、granularity）
   - `lib/contracts/daily-closures.ts`（confirm/adjustment/export 参数）
   - `lib/contracts/transactions.ts`（id/反结算请求）
   - `lib/contracts/checkout-history.ts`（分页/筛选）
   - `lib/contracts/settings.ts`（餐厅设置更新）

2. API 路由使用 contracts schema 替换内联 `z.object(...)`：
   - `app/api/reports/*`
   - `app/api/daily-closure*`
   - `app/api/transactions/*`
   - `app/api/checkout-history/route.ts`
   - `app/api/restaurant-settings/route.ts`（如存在）

3. 确保 contracts 类型在 services 中复用（输入/输出保持一致）

## 原则
- contracts 是唯一校验来源
- route 只做 parse + 调 service
```

---

### Task 14: 验收扫描 - 确认架构规范
**预计时间**: 20分钟  
**依赖**: Task 1-13

**AI 提示词**:
```
你是一位 DevOps 工程师。请完成 Phase 3 验收扫描：

## 任务
1. 扫描 API 路由中的直接 DB 操作：
   ```bash
   rg "from ['\"]@/lib/db" app/api --type ts
   rg "db\.(select|insert|update|delete)" app/api --type ts
   ```

2. 扫描 server-only 防护：
   ```bash
   rg "import 'server-only'" services repositories --type ts
   ```

3. 抽查 contracts 落地：
   ```bash
   rg "from ['\"]@/lib/contracts" app/api --type ts
   ```

4. 统计各 route 文件行数：
   ```bash
   wc -l app/api/orders/checkout/route.ts
   ```

4. 记录结果到 `doc/agents/features/phase3_verification.md`

## 验收清单
- [ ] 所有 services/*.ts 有 `import 'server-only'`
- [ ] 所有 repositories/*.ts 有 `import 'server-only'`
- [ ] app/api/* 无直接 db 操作
- [ ] checkout/route.ts 行数 < 100
- [ ] lib/serializers/* 包含 orders、transactions、reports、daily-closures、checkout-history
- [ ] app/api/* 参数校验集中在 lib/contracts/*
```

---

## Links
- 架构评审 Claude v3: [architecture_review_claude_v3.md](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/architecture_review_claude_v3.md)
- Phase 1 计划: [phase1_implementation_PLAN.md](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/agents/features/phase1_implementation_PLAN.md)
- Phase 2 计划: [phase2_implementation_PLAN.md](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/agents/features/phase2_implementation_PLAN.md)
