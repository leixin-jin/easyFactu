# Phase 4: 领域化与测试（Domain Layer & Testing）

- ID: phase4-domain-testing
- Owner: 待分配
- Status: proposed

## Summary
将核心业务计算逻辑抽取到独立的领域层（Domain Layer），确保业务规则的纯函数化和可测试性。同时补充单元测试和集成测试，为持续重构建立安全网。

## Scope
- In: 
  - 结账/AA 计算逻辑抽取到 domain 层
  - Order 值对象/实体抽取
  - Money 值对象
  - 核心工具函数单测
  - 结账计算单测
  - Checkout Service 集成测试
  - Reports/Daily Closure 单测
- Out: 
  - 不新增功能特性
  - 不修改 UI 组件
  - E2E 测试（可后续补充）

## UX Notes
本阶段为纯技术改进，用户界面无可见变化。

## API / DB
- API: 无变更
- DB: 无数据库变更

## 测试规范

### 测试文件位置
按项目规范，测试文件放在 `__tests__/` 目录，镜像源文件结构：
```
lib/
  domain/
    checkout.ts
__tests__/
  lib/
    domain/
      checkout.test.ts
    money.test.ts
```

### 测试命令
```bash
pnpm test                    # 运行所有测试
pnpm test --coverage         # 生成覆盖率报告
pnpm test __tests__/lib/     # 运行特定目录测试
```

## Workflow
1. 领域层 Facade 创建 → 2. 核心工具函数测试 → 3. Service 集成测试 → 4. 验收

## Acceptance Criteria
- [ ] `lib/domain/checkout.ts` 存在且包含纯业务计算函数
- [ ] `lib/domain/Order.ts` 存在且包含订单值对象/实体
- [ ] `lib/domain/Money.ts` 存在且包含 Money 值对象
- [x] 业务计算只在 domain 层，`hooks/useCheckout.ts` 仅负责 UI 状态管理（已由 `lib/checkout/calculate.ts` 实现）
- [ ] `lib/money.ts` 测试覆盖率 > 60%
- [ ] `lib/order-utils.ts` 测试覆盖率 > 60%
- [x] 结账计算核心分支覆盖（已由 `lib/checkout/__tests__/calculate.test.ts` 实现，132行测试）
- [ ] Checkout Service 主流程测试通过
- [ ] Reports/Daily Closure 聚合逻辑测试覆盖

## 任务清单（Tasks）

### Task 1: 创建结账领域 Facade（ORD-05）
**预计时间**: 1小时  
**依赖**: 无（`lib/checkout/calculate.ts` 已包含完整计算逻辑）

**AI 提示词**:
```
你是一位资深的领域驱动设计（DDD）工程师。请创建结账领域 Facade：

## 背景
`lib/checkout/calculate.ts` 已包含完整的结账计算函数（`calculateCheckoutTotal`、`calculateAASplit`），且已有完整单测覆盖。

需要创建 `lib/domain/` 目录作为领域层入口点。

## 任务
1. 创建 `lib/domain/checkout.ts` 作为结账领域 Facade：
   - 从 `@/lib/checkout/calculate` 重新导出所有函数和类型
   - 添加 JSDoc 文档说明领域层职责

2. 示例实现：
   ```typescript
   /**
    * 结账领域层
    *
    * 包含结账相关的纯业务计算函数，无副作用。
    * - 不依赖 React/Next.js
    * - 不依赖数据库
    * - 不依赖 HTTP/网络
    */
   export {
     calculateCheckoutTotal,
     calculateAASplit,
     type CheckoutItem,
     type CheckoutResult,
     type AAAllocationItem,
     type AASplitResult,
   } from '@/lib/checkout/calculate'
   ```

## 领域层原则
- ❌ 不依赖 React
- ❌ 不依赖数据库
- ❌ 不依赖 HTTP/网络
- ✅ 纯函数
- ✅ 可独立单元测试

## 涉及文件
- `lib/domain/checkout.ts`（新建）
- `lib/checkout/calculate.ts`（已存在，无需修改）

use context7
```


---

### Task 2: 创建 Order 领域模型
**预计时间**: 2小时  
**依赖**: Task 1

**AI 提示词**:
```
你是一位资深的 DDD 工程师。请创建 Order 领域模型：

## 背景
订单相关业务规则散落在多处，需要集中到领域层。

## 任务
1. 创建 `lib/domain/Order.ts`：
   ```typescript
   // 订单项值对象
   export interface OrderItem {
     id: number
     menuItemId: number
     name: string
     price: number
     quantity: number
   }
   
   // 订单实体
   export interface Order {
     id: number
     tableId: number
     status: 'pending' | 'served' | 'paid' | 'cancelled'
     items: OrderItem[]
     createdAt: Date
   }
   
   // 订单业务规则
   export function canCheckout(order: Order): boolean {
     return order.status === 'pending' || order.status === 'served'
   }
   
   export function canCancel(order: Order): boolean {
     return order.status !== 'paid' && order.status !== 'cancelled'
   }
   
   export function calculateOrderTotal(order: Order): number {
     return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
   }
   
   export function isEmpty(order: Order): boolean {
     return order.items.length === 0
   }
   ```

2. 在 `services/orders/*.ts` 中使用这些规则

## 涉及文件
- `lib/domain/Order.ts`（新建）
- `services/orders/*.ts`
```

---

### Task 3: 创建 Money 值对象
**预计时间**: 2小时  
**依赖**: 无

**AI 提示词**:
```
你是一位资深的 TypeScript/DDD 工程师。请创建 Money 值对象：

## 背景
金额计算是餐饮系统的核心，需要统一处理精度、格式化、运算。

## 任务
1. 创建 `lib/domain/Money.ts`：
   ```typescript
   // 以分为单位存储，避免浮点精度问题
   export interface Money {
     readonly cents: number
   }
   
   export function money(euros: number): Money {
     return { cents: Math.round(euros * 100) }
   }
   
   export function moneyFromCents(cents: number): Money {
     return { cents }
   }
   
   export function add(a: Money, b: Money): Money {
     return { cents: a.cents + b.cents }
   }
   
   export function subtract(a: Money, b: Money): Money {
     return { cents: a.cents - b.cents }
   }
   
   export function multiply(m: Money, factor: number): Money {
     return { cents: Math.round(m.cents * factor) }
   }
   
   export function divide(m: Money, divisor: number): Money {
     return { cents: Math.round(m.cents / divisor) }
   }
   
   export function toNumber(m: Money): number {
     return m.cents / 100
   }
   
   export function format(m: Money): string {
     return `€${toNumber(m).toFixed(2)}`
   }
   
   export function isZero(m: Money): boolean {
     return m.cents === 0
   }
   
   export function isPositive(m: Money): boolean {
     return m.cents > 0
   }
   
   export function equals(a: Money, b: Money): boolean {
     return a.cents === b.cents
   }
   ```

2. 考虑与现有 `lib/money.ts` 的关系：
   - 可以将 Money 对象作为增强选项
   - 或逐步替换现有函数

## 涉及文件
- `lib/domain/Money.ts`（新建）
- `lib/money.ts`（可选重构）
```

---

### Task 4: 核心工具函数单测（TEST-01）
**预计时间**: 2小时  
**依赖**: 无

**AI 提示词**:
```
你是一位资深的 JavaScript/TypeScript 测试工程师。请完成核心工具函数单测任务：

## 背景
项目使用 Vitest 作为测试框架。需要为核心工具函数补充单元测试。

## 任务
1. 创建 `__tests__/lib/money.test.ts`：
   - 测试金额格式化函数
   - 测试金额计算函数
   - 测试边界情况（0、负数、大数、小数精度）

2. 创建 `__tests__/lib/order-utils.test.ts`：
   - 测试订单相关工具函数
   - 测试边界情况

## 测试文件位置
按规范放在 `__tests__/` 目录，镜像源文件结构。

## 参考代码
```typescript
// __tests__/lib/money.test.ts
import { describe, it, expect } from 'vitest'
import { formatMoney, calculateTotal } from '@/lib/money'

describe('money', () => {
  describe('formatMoney', () => {
    it('应该格式化正数金额', () => {
      expect(formatMoney(1234.56)).toBe('€1,234.56')
    })
    
    it('应该处理零', () => {
      expect(formatMoney(0)).toBe('€0.00')
    })
  })
})
```

## 运行测试
```bash
pnpm test __tests__/lib/money.test.ts
pnpm test --coverage
```

## 涉及文件
- `lib/money.ts`
- `lib/order-utils.ts`
- `__tests__/lib/money.test.ts`（新建）
- `__tests__/lib/order-utils.test.ts`（新建）
```

---

> [!NOTE]
> **Task 5（结账计算单测）已完成**
> 
> `lib/checkout/__tests__/calculate.test.ts` 已包含 132 行完整测试，覆盖：
> - `calculateCheckoutTotal`: 基本计算、折扣（0%/100%/边界值）、空订单、零数量
> - `calculateAASplit`: AA 分摊、人数为 0、四舍五入

---


### Task 6: Money 值对象单测
**预计时间**: 1.5小时  
**依赖**: Task 3

**AI 提示词**:
```
你是一位资深的测试工程师。请为 Money 值对象创建测试：

## 任务
创建 `__tests__/lib/domain/Money.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { money, add, subtract, multiply, divide, format, equals } from '@/lib/domain/Money'

describe('Money', () => {
  describe('创建', () => {
    it('应该正确转换为分', () => {
      expect(money(12.34).cents).toBe(1234)
    })
    
    it('应该处理小数精度', () => {
      expect(money(10.999).cents).toBe(1100) // 四舍五入
    })
  })
  
  describe('运算', () => {
    it('add 应该正确相加', () => {
      expect(add(money(10), money(5)).cents).toBe(1500)
    })
    
    it('subtract 应该正确相减', () => {
      expect(subtract(money(10), money(3)).cents).toBe(700)
    })
    
    it('multiply 应该正确乘法', () => {
      expect(multiply(money(10), 3).cents).toBe(3000)
    })
    
    it('divide 应该正确除法并四舍五入', () => {
      expect(divide(money(10), 3).cents).toBe(333)
    })
  })
  
  describe('格式化', () => {
    it('format 应该返回欧元格式', () => {
      expect(format(money(12.34))).toBe('€12.34')
    })
  })
})
```

## 涉及文件
- `lib/domain/Money.ts`
- `__tests__/lib/domain/Money.test.ts`（新建）
```

---

### Task 7: Order 领域模型单测
**预计时间**: 1.5小时  
**依赖**: Task 2

**AI 提示词**:
```
你是一位资深的测试工程师。请为 Order 领域模型创建测试：

## 任务
创建 `__tests__/lib/domain/Order.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { canCheckout, canCancel, calculateOrderTotal, isEmpty } from '@/lib/domain/Order'

describe('Order', () => {
  const sampleOrder = {
    id: 1,
    tableId: 1,
    status: 'pending' as const,
    items: [
      { id: 1, menuItemId: 1, name: '菜品A', price: 10, quantity: 2 },
    ],
    createdAt: new Date(),
  }
  
  describe('canCheckout', () => {
    it('pending 订单可结账', () => {
      expect(canCheckout({ ...sampleOrder, status: 'pending' })).toBe(true)
    })
    
    it('served 订单可结账', () => {
      expect(canCheckout({ ...sampleOrder, status: 'served' })).toBe(true)
    })
    
    it('paid 订单不可结账', () => {
      expect(canCheckout({ ...sampleOrder, status: 'paid' })).toBe(false)
    })
  })
  
  describe('calculateOrderTotal', () => {
    it('应该正确计算总价', () => {
      expect(calculateOrderTotal(sampleOrder)).toBe(20)
    })
  })
})
```

## 涉及文件
- `lib/domain/Order.ts`
- `__tests__/lib/domain/Order.test.ts`（新建）
```

---

### Task 8: Checkout Service 集成测试（TEST-03）
**预计时间**: 3小时  
**依赖**: Task 1

**AI 提示词**:
```
ultrathink

你是一位资深的后端测试工程师。请完成 Checkout Service 集成测试任务：

## 任务
1. 创建 `__tests__/services/orders/checkout.test.ts`：
   - 测试成功结账流程
   - 测试订单已结账错误
   - 测试订单不存在错误
   - 测试事务回滚

2. 使用 mock 模拟 repository 层

## 测试场景
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processCheckout } from '@/services/orders/checkout'

// Mock repositories
vi.mock('@/repositories/orders', () => ({
  getOrderById: vi.fn(),
  updateOrderStatus: vi.fn(),
}))

describe('processCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  describe('成功场景', () => {
    it('应该成功完成整单结账', async () => {
      // 准备 mock 数据
      // 调用 processCheckout
      // 验证返回结果
    })
  })
  
  describe('错误场景', () => {
    it('订单已结账时应该抛出错误', async () => {
      // 期望抛出 ConflictError
    })
  })
})
```

## 涉及文件
- `services/orders/checkout.ts`
- `__tests__/services/orders/checkout.test.ts`（新建）
```

---

### Task 9: Reports/Daily Closure 单测（TEST-04）
**预计时间**: 2.5小时  
**依赖**: Phase 3 FIN-01~FIN-06

**AI 提示词**:
```
你是一位资深的测试工程师。请完成 Reports/Daily Closure 单测任务：

## 任务
1. 创建 `__tests__/services/reports/service.test.ts`
2. 创建 `__tests__/services/daily-closures/service.test.ts`

## 测试场景
```typescript
describe('reports aggregation', () => {
  it('应该按日期范围聚合销售数据', () => {})
  it('应该按菜品分类统计', () => {})
  it('应该计算正确的总计', () => {})
  it('应该处理空数据', () => {})
})

describe('daily closure calculation', () => {
  it('应该计算当期收入', () => {})
  it('应该计算各支付方式金额', () => {})
  it('应该统计交易笔数', () => {})
})
```

## 涉及文件
- `services/reports/service.ts`
- `services/daily-closures/service.ts`
- `__tests__/services/reports/service.test.ts`（新建）
- `__tests__/services/daily-closures/service.test.ts`（新建）
```

---

### Task 10: 验收扫描 - 确认测试覆盖
**预计时间**: 20分钟  
**依赖**: Task 4, 6, 7, 8, 9

**AI 提示词**:
```
你是一位 DevOps 工程师。请完成 Phase 4 验收扫描：

## 任务
1. 运行测试覆盖率：
   ```bash
   pnpm test --coverage
   ```

2. 检查领域层纯净性：
   ```bash
   # 确保 domain 层不依赖 React/Next/DB/Drizzle
   rg "(import.*from ['\"](@/lib/db|react|next|drizzle))" lib/domain --type ts
   ```

3. 检查 hooks 中无业务计算：
   ```bash
   rg "calculateCheckoutTotal|calculateAASplit" hooks/useCheckout.ts
   ```

4. 记录结果到 `doc/agents/features/phase4_verification.md`

## 验收清单
- [ ] `lib/domain/checkout.ts` 无 React/Next/DB 依赖
- [ ] `lib/domain/Order.ts` 无外部依赖
- [ ] `lib/domain/Money.ts` 无外部依赖
- [ ] `hooks/useCheckout.ts` 无直接调用计算函数
- [ ] `lib/money.ts` 覆盖率 > 60%
- [ ] 结账计算核心分支覆盖（已由 `lib/checkout/__tests__/calculate.test.ts` 实现）
- [ ] Service 集成测试主流程通过
```

---

## Links
- 架构评审 Claude v3: [architecture_review_claude_v3.md](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/architecture_review_claude_v3.md)
- Phase 1 计划: [phase1_implementation_PLAN.md](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/agents/features/phase1_implementation_PLAN.md)
- Phase 2 计划: [phase2_implementation_PLAN.md](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/agents/features/phase2_implementation_PLAN.md)
- Phase 3 计划: [phase3_implementation_PLAN.md](file:///Users/zhuyuxia/Documents/GitHub/easyFactu/doc/agents/features/phase3_implementation_PLAN.md)
- Vitest 文档: https://vitest.dev/guide/
