# EasyFactu 代码优化方案

> 基于现有代码库的深度分析，从多角色视角提出的系统性优化建议  
> 目标：代码更简洁、更易维护、更易扩展

---

## 一、框架师视角（Architecture）

### 1.1 状态管理统一化

**现状问题：**
- 各组件独立管理状态，如 `usePosOrder`、`useCheckout`、`useMenuData`、`useRestaurantTables` 各自为政
- 缺乏全局状态共享机制，导致数据获取重复
- 复杂组件（如 `pos-interface.tsx`）内部状态过多（15+ useState）

**优化方案：**
```
lib/
├── stores/                    # 新增状态管理层
│   ├── useOrderStore.ts       # 订单全局状态（基于 Zustand 或 Context）
│   ├── useTableStore.ts       # 桌台状态
│   └── useMenuStore.ts        # 菜单数据缓存
├── queries/                   # 新增数据获取层
│   ├── use-orders.ts          # TanStack Query 封装
│   ├── use-tables.ts
│   └── use-menu.ts
```

**建议引入：**
- `@tanstack/react-query`：统一管理服务端状态、缓存、重试
- `zustand` 或 `jotai`：轻量级客户端状态管理（替代大量 useState）

### 1.2 API 层抽象

**现状问题：**
- API 路由缺乏统一的错误处理和响应格式
- 前端直接 fetch，错误处理代码重复
- 类型定义与 API 响应不一致

**优化方案：**
```typescript
// lib/api/client.ts - 统一 API 客户端
export const api = {
  orders: {
    get: (tableId: string) => fetcher<OrderResponse>(`/api/orders?tableId=${tableId}`),
    create: (data: CreateOrderInput) => fetcher<OrderResponse>('/api/orders', { method: 'POST', body: data }),
    checkout: (data: CheckoutInput) => fetcher<CheckoutResponse>('/api/orders/checkout', { method: 'POST', body: data }),
  },
  tables: {
    list: () => fetcher<TableListResponse>('/api/restaurant-tables'),
    // ...
  },
}

// lib/api/server.ts - 统一 API 响应格式
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function apiError(code: string, message: string, status = 400, detail?: unknown) {
  return NextResponse.json({ success: false, error: { code, message, detail } }, { status })
}
```

### 1.3 类型系统整合

**现状问题：**
- 类型分散在 `types/pos.ts`、`lib/order-utils.ts`、`hooks/*.ts`
- 数据库 schema 类型与前端类型转换不一致
- 部分 API 使用 `unknown` 类型绕过类型检查

**优化方案：**
```
types/
├── index.ts           # 统一导出
├── database.ts        # 从 db/schema.ts 自动推导
├── api.ts             # API 请求/响应类型
├── ui.ts              # UI 组件 Props 类型
└── shared.ts          # 前后端共享类型
```

### 1.4 目录结构重组建议

```
app/
├── (dashboard)/              # 路由分组
│   ├── layout.tsx
│   ├── pos/
│   ├── tables/
│   └── ...
├── api/
│   └── [...] 
components/
├── features/                 # 按功能模块组织
│   ├── pos/
│   │   ├── PosInterface.tsx
│   │   ├── PosMenuPane.tsx
│   │   ├── PosOrderSidebar.tsx
│   │   ├── PosCheckoutDialog.tsx
│   │   └── hooks/
│   │       ├── usePosOrder.ts
│   │       └── useCheckout.ts
│   ├── tables/
│   ├── menu/
│   └── finance/
├── shared/                   # 跨功能共享组件
│   ├── TableSelect.tsx
│   ├── PriceDisplay.tsx
│   └── ErrorBoundary.tsx
└── ui/                       # 基础 UI 组件（保持不变）
```

---

## 二、程序员视角（Developer Experience）

### 2.1 大文件拆分

**现状问题：**

| 文件 | 行数 | 问题 |
|------|------|------|
| `pos-interface.tsx` | 600+ | 包含 POSInterface + PosReceiptPreview + 大量业务逻辑 |
| `finance-management.tsx` | 800+ | 包含6个Dialog + mock数据 + 全部业务逻辑 |
| `table-management.tsx` | 550+ | 视图切换 + CRUD + 筛选逻辑混杂 |
| `menu-management.tsx` | 600+ | 表单验证 + CRUD + 分类逻辑 |
| `api/orders/checkout/route.ts` | 450+ | full模式和aa模式逻辑混杂 |

**拆分建议：**

```typescript
// pos-interface.tsx 拆分为：
// 1. PosInterface.tsx (主容器，~150行)
// 2. PosReceiptPreview.tsx (小票预览)
// 3. hooks/usePosCheckout.ts (结账流程逻辑)
// 4. hooks/usePosCart.ts (购物车状态)
// 5. constants/error-messages.ts (错误码映射)

// finance-management.tsx 拆分为：
// components/finance/
// ├── FinanceOverview.tsx
// ├── TransactionList.tsx
// ├── ShiftManagement.tsx
// ├── InvoiceDialog.tsx
// ├── RefundDialog.tsx
// └── ExpenseDialog.tsx

// api/orders/checkout/route.ts 拆分为：
// lib/checkout/
// ├── full-checkout.ts
// ├── aa-checkout.ts
// └── validators.ts
```

### 2.2 重复代码提取

**Toast 提示封装：**
```typescript
// hooks/useApiToast.ts
export function useApiToast() {
  const { toast } = useToast()
  
  return {
    success: (title: string, description?: string) => 
      toast({ title, description }),
    error: (title: string, description?: string) => 
      toast({ title, description, variant: "destructive" }),
    fromApiError: (error: unknown, fallbackTitle = "操作失败") => {
      const message = error instanceof Error ? error.message : "请稍后重试"
      toast({ title: fallbackTitle, description: message, variant: "destructive" })
    }
  }
}
```

**表单处理封装：**
```typescript
// hooks/useFormState.ts
export function useFormState<T>(initialState: T) {
  const [form, setForm] = useState(initialState)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  
  const updateField = <K extends keyof T>(field: K, value: T[K]) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }
  
  const reset = () => {
    setForm(initialState)
    setErrors({})
  }
  
  return { form, errors, submitting, updateField, setErrors, setSubmitting, reset }
}
```

### 2.3 Mock 数据管理

**现状问题：**
- Mock 数据散落在各组件内部
- 无法区分开发/生产环境

**优化方案：**
```typescript
// lib/mocks/index.ts
export const mocks = {
  tables: [...],
  menuItems: [...],
  transactions: [...],
}

// 环境检测
export const useMockData = process.env.NODE_ENV === 'development' && 
  process.env.NEXT_PUBLIC_USE_MOCKS === 'true'
```

### 2.4 常量与配置提取

```typescript
// lib/constants/index.ts
export const TABLE_STATUS = {
  IDLE: 'idle',
  OCCUPIED: 'occupied',
} as const

export const ORDER_STATUS = {
  OPEN: 'open',
  PAID: 'paid',
  CANCELLED: 'cancelled',
} as const

export const PAYMENT_METHODS = [
  { value: 'cash', label: '现金' },
  { value: 'card', label: '刷卡' },
] as const

// 错误码映射
export const ERROR_MESSAGES: Record<string, string> = {
  SUBTOTAL_MISMATCH: "订单金额已在其他终端更新，请刷新后重新结账。",
  // ... 从 pos-interface.tsx 移出
}
```

---

## 三、用户视角（User Experience）

### 3.1 加载状态优化

**现状问题：**
- 加载时显示简单文字或空白
- 骨架屏使用不一致

**优化方案：**
```typescript
// components/shared/Skeleton.tsx
export function TableCardSkeleton() { /* 桌台卡片骨架 */ }
export function MenuItemSkeleton() { /* 菜品卡片骨架 */ }
export function OrderListSkeleton() { /* 订单列表骨架 */ }

// 使用 Suspense 边界
<Suspense fallback={<TableCardSkeleton />}>
  <TableList />
</Suspense>
```

### 3.2 错误处理统一

```typescript
// components/shared/ErrorBoundary.tsx
export function ApiErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <Card className="p-6 text-center">
      <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
      <h3 className="font-semibold mb-2">数据加载失败</h3>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <Button onClick={retry}>重试</Button>
    </Card>
  )
}
```

### 3.3 离线支持（PWA）

```typescript
// next.config.ts 添加 PWA 支持
// 使用 next-pwa 插件实现：
// - Service Worker 缓存策略
// - 离线页面
// - 本地数据持久化（IndexedDB）
```

### 3.4 国际化准备

```typescript
// 当前中文硬编码问题：
// "结账成功" -> t('checkout.success')
// "桌台管理" -> t('nav.tables')

// 建议引入 next-intl 或 react-i18next
// messages/
// ├── zh.json
// └── en.json
```

---

## 四、测试工程师视角（Quality Assurance）

### 4.1 测试框架配置

```json
// package.json 新增
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "msw": "^2.0.0"
  }
}
```

### 4.2 可测试性改进

**业务逻辑提取：**
```typescript
// lib/checkout/calculate.ts - 纯函数，易于单元测试
export function calculateCheckoutTotal(
  items: { price: number; quantity: number }[],
  discountPercent: number
): { subtotal: number; discount: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discount = subtotal * (discountPercent / 100)
  return { subtotal, discount, total: subtotal - discount }
}

// 测试文件
describe('calculateCheckoutTotal', () => {
  it('should calculate correct total with discount', () => {
    const result = calculateCheckoutTotal([{ price: 10, quantity: 2 }], 10)
    expect(result).toEqual({ subtotal: 20, discount: 2, total: 18 })
  })
})
```

### 4.3 API Mock（MSW）

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/restaurant-tables', () => {
    return HttpResponse.json([
      { id: '1', number: 'A-01', status: 'idle' },
    ])
  }),
  http.post('/api/orders', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ order: { id: '123', ...body } })
  }),
]
```

---

## 五、运维视角（DevOps & Observability）

### 5.1 日志与监控

```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, meta?: object) => console.log(JSON.stringify({ level: 'info', message, ...meta })),
  error: (message: string, error: unknown, meta?: object) => {
    console.error(JSON.stringify({ 
      level: 'error', 
      message, 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...meta 
    }))
  },
}

// API 路由中使用
logger.error('Checkout failed', err, { tableId, orderId })
```

### 5.2 性能监控

```typescript
// 引入 @vercel/analytics（已安装但未充分使用）
// 添加自定义事件追踪：
import { track } from '@vercel/analytics'

track('checkout_completed', {
  mode: 'full',
  total: 156.80,
  items_count: 5,
})
```

---

## 六、优先级与实施路线图

### Phase 1：基础重构（1-2周）

| 优先级 | 任务 | 复杂度 | 影响面 |
|--------|------|--------|--------|
| P0 | 大文件拆分（pos-interface, finance） | 中 | 高 |
| P0 | 错误码常量提取 | 低 | 中 |
| P1 | Toast 提示统一封装 | 低 | 中 |
| P1 | Mock 数据集中管理 | 低 | 低 |

### Phase 2：架构优化（2-3周）

| 优先级 | 任务 | 复杂度 | 影响面 |
|--------|------|--------|--------|
| P0 | 引入 TanStack Query | 高 | 高 |
| P1 | API 客户端统一封装 | 中 | 高 |
| P1 | 类型系统整合 | 中 | 中 |
| P2 | 目录结构重组 | 高 | 高 |

### Phase 3：质量提升（2周）

| 优先级 | 任务 | 复杂度 | 影响面 |
|--------|------|--------|--------|
| P0 | 测试框架配置 | 低 | 低 |
| P1 | 核心业务逻辑单元测试 | 中 | 中 |
| P2 | API 路由集成测试 | 中 | 中 |

### Phase 4：体验增强（可选）

| 优先级 | 任务 | 复杂度 | 影响面 |
|--------|------|--------|--------|
| P2 | 骨架屏优化 | 低 | 中 |
| P3 | PWA 离线支持 | 高 | 中 |
| P3 | 国际化支持 | 高 | 高 |

---

## 七、风险评估

| 风险项 | 可能性 | 影响 | 缓解措施 |
|--------|--------|------|----------|
| 重构引入 bug | 中 | 高 | 增量重构 + 回归测试 |
| 新依赖兼容性 | 低 | 中 | 锁定版本 + 充分测试 |
| 开发进度延迟 | 中 | 中 | 按优先级分阶段实施 |
| 团队学习成本 | 中 | 低 | 编写文档 + 代码评审 |

---

## 八、总结

本优化方案聚焦于三个核心目标：

1. **简洁性**：通过大文件拆分、重复代码提取、常量统一管理，减少代码冗余
2. **可维护性**：通过架构分层、类型统一、测试覆盖，提升代码质量
3. **可扩展性**：通过模块化设计、状态管理优化、API 抽象，为未来功能扩展奠定基础

建议优先实施 Phase 1 和 Phase 2 的 P0/P1 任务，在不影响现有功能的前提下逐步改进代码质量。
