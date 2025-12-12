# Phase 3: 质量提升（功能模板 · 任务驱动）

- ID: phase3-quality
- Owner: Development Team
- Status: proposed

## Summary
配置测试框架，编写核心业务逻辑单元测试和 API 路由集成测试，建立代码质量保障体系。

## Scope
- In: 
  - 配置 Vitest 测试框架
  - 配置 React Testing Library
  - 配置 MSW (Mock Service Worker) 用于 API Mock
  - 核心业务逻辑单元测试
  - API 路由集成测试
- Out: 
  - 不修改现有 UI 页面布局和样式
  - 不修改业务逻辑
  - E2E 测试（Playwright/Cypress）不在本阶段范围
  - 不变更数据库 schema

## UX Notes
- 本阶段为质量保障建设，用户无感知
- 测试确保现有功能稳定性
- 为后续迭代提供回归测试基础

## API / DB
- API: 不变更，仅编写测试
- DB: 不变更

## Workflow
1. 测试框架配置 → 2. MSW 配置 → 3. 工具函数测试 → 4. Hooks 测试 → 5. API 路由测试 → 6. CI 集成 → 7. 验收

## Acceptance Criteria
- [ ] Vitest 测试框架配置完成
- [ ] `pnpm test` 命令可正常运行
- [ ] 核心工具函数测试覆盖率 > 80%
- [ ] 至少 3 个核心 hooks 有单元测试
- [ ] 至少 3 个 API 路由有集成测试
- [ ] 测试通过率 100%
- [ ] `pnpm lint` 无错误
- [ ] `pnpm build` 构建成功

## 任务清单（Tasks）

### Task 1: Vitest 测试框架配置
**预计时间**: 1小时
**依赖**: Phase 2 完成

**AI 提示词**:
```
你是一位资深的前端测试工程师，专注于测试框架配置和最佳实践。

任务：配置 Vitest 测试框架。

具体要求：
1. 安装依赖：
   ```bash
   pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
   ```
2. 创建 `vitest.config.ts`：
   - 配置 React 插件
   - 配置 jsdom 环境
   - 配置路径别名（与 tsconfig 一致）
   - 配置覆盖率报告
3. 创建 `vitest.setup.ts`：
   - 引入 @testing-library/jest-dom
   - 配置全局测试工具
4. 更新 `package.json` 添加脚本：
   ```json
   {
     "scripts": {
       "test": "vitest",
       "test:ui": "vitest --ui",
       "test:coverage": "vitest --coverage",
       "test:watch": "vitest --watch"
     }
   }
   ```
5. 更新 `tsconfig.json` 添加测试类型

use context7 查阅 Vitest 与 Next.js App Router 集成最佳实践。

运行 `pnpm test` 确保配置正确。
```

---

### Task 2: MSW (Mock Service Worker) 配置
**预计时间**: 1小时
**依赖**: Task 1

**AI 提示词**:
```
你是一位资深的前端测试工程师，专注于 API Mock 和测试隔离。

任务：配置 MSW 用于测试环境的 API Mock。

具体要求：
1. 安装依赖：
   ```bash
   pnpm add -D msw
   ```
2. 创建 `__tests__/mocks/` 目录
3. 创建 `__tests__/mocks/handlers.ts`：
   - 定义 API Mock handlers
   ```typescript
   import { http, HttpResponse } from 'msw'
   
   export const handlers = [
     http.get('/api/restaurant-tables', () => {
       return HttpResponse.json([
         { id: '1', number: 'A-01', status: 'idle', capacity: 4 },
         { id: '2', number: 'A-02', status: 'occupied', capacity: 4 },
       ])
     }),
     http.get('/api/menu-items', () => {
       return HttpResponse.json({
         items: [
           { id: '1', name: 'Test Item', category: 'Main', price: 10 },
         ],
         categories: [{ id: 'all', name: '全部' }],
       })
     }),
     http.post('/api/orders', async ({ request }) => {
       const body = await request.json()
       return HttpResponse.json({ 
         order: { id: 'test-order-1', ...body },
         batches: [],
       }, { status: 201 })
     }),
   ]
   ```
4. 创建 `__tests__/mocks/server.ts`：
   - 配置测试用 MSW server
5. 更新 `vitest.setup.ts` 集成 MSW

use context7 查阅 MSW v2 与 Vitest 集成最佳实践。

运行 `pnpm test` 确保配置正确。
```

---

### Task 3: 工具函数单元测试
**预计时间**: 1.5小时
**依赖**: Task 1

**AI 提示词**:
```
你是一位资深的测试工程师，专注于单元测试和代码覆盖率。

任务：为核心工具函数编写单元测试。

具体要求：
1. 创建 `lib/__tests__/` 目录
2. 为 `lib/money.ts` 编写测试：
   - `lib/__tests__/money.test.ts`
   - 测试 `parseMoney` 函数的各种输入情况
   - 测试 `toMoneyString` 函数的格式化
   - 边界情况：null, undefined, NaN, 负数
3. 为 `lib/order-utils.ts` 编写测试：
   - `lib/__tests__/order-utils.test.ts`
   - 测试 `buildOrderBatches` 函数
   - 测试不同的 `omitFullyPaid` 选项
   - 测试空数组、单批次、多批次情况
4. 为 `lib/utils.ts` 编写测试（如果有可测试函数）

测试示例结构：
```typescript
import { describe, it, expect } from 'vitest'
import { parseMoney, toMoneyString } from '../money'

describe('parseMoney', () => {
  it('should parse numeric string correctly', () => {
    expect(parseMoney('10.50')).toBe(10.5)
  })
  
  it('should handle null/undefined', () => {
    expect(parseMoney(null)).toBe(0)
    expect(parseMoney(undefined)).toBe(0)
  })
})
```

运行 `pnpm test` 确保所有测试通过。
```

---

### Task 4: 结账计算逻辑测试
**预计时间**: 1.5小时
**依赖**: Task 1

**AI 提示词**:
```
你是一位资深的测试工程师，专注于业务逻辑测试。

任务：为结账计算相关逻辑编写单元测试。

具体要求：
1. 如果 Phase 1 已提取纯函数 `calculateCheckoutTotal`，为其编写测试
2. 否则，创建 `lib/checkout/` 目录并提取计算逻辑：
   - `lib/checkout/calculate.ts`
   ```typescript
   export function calculateCheckoutTotal(
     items: { price: number; quantity: number }[],
     discountPercent: number
   ): { subtotal: number; discount: number; total: number }
   ```
3. 创建 `lib/checkout/__tests__/calculate.test.ts`：
   ```typescript
   describe('calculateCheckoutTotal', () => {
     it('should calculate subtotal correctly', () => {
       const items = [
         { price: 10, quantity: 2 },
         { price: 15, quantity: 1 },
       ]
       const result = calculateCheckoutTotal(items, 0)
       expect(result.subtotal).toBe(35)
       expect(result.total).toBe(35)
     })
     
     it('should apply discount correctly', () => {
       const items = [{ price: 100, quantity: 1 }]
       const result = calculateCheckoutTotal(items, 10)
       expect(result.discount).toBe(10)
       expect(result.total).toBe(90)
     })
     
     it('should handle empty items', () => {
       const result = calculateCheckoutTotal([], 0)
       expect(result.total).toBe(0)
     })
   })
   ```
4. 测试 AA 结账的金额分配逻辑（如果有独立函数）

运行 `pnpm test` 确保所有测试通过。
```

---

### Task 5: React Hooks 测试
**预计时间**: 2小时
**依赖**: Task 1, Task 2

**AI 提示词**:
```
你是一位资深的 React 测试工程师，专注于 hooks 测试和组件测试。

ultrathink

任务：为核心 React hooks 编写单元测试。

具体要求：
1. 创建 `hooks/__tests__/` 目录
2. 为 `hooks/useCheckout.ts` 编写测试：
   - `hooks/__tests__/useCheckout.test.ts`
   - 使用 `@testing-library/react` 的 `renderHook`
   - 测试初始状态
   - 测试 `openFullCheckout` / `openAACheckout` actions
   - 测试折扣计算
   - 测试 AA 项目选择逻辑
3. 为 `hooks/useMenuData.ts` 编写测试（使用 MSW mock）：
   - 测试数据加载状态
   - 测试错误处理
   - 测试 refresh 功能

测试示例：
```typescript
import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useCheckout } from '../useCheckout'

describe('useCheckout', () => {
  const mockBatches = [
    {
      batchNo: 1,
      items: [
        { id: '1', menuItemId: 'm1', name: 'Item 1', quantity: 2, price: 10, notes: null, nameEn: '', createdAt: '' },
      ],
    },
  ]
  
  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useCheckout({ batches: [], cart: [] }))
    expect(result.current.state.dialogOpen).toBe(false)
    expect(result.current.state.aaMode).toBe(false)
  })
  
  it('should calculate subtotal correctly', () => {
    const { result } = renderHook(() => useCheckout({ batches: mockBatches, cart: [] }))
    expect(result.current.subtotal).toBe(20)
  })
})
```

use context7 查阅 @testing-library/react renderHook 最佳实践。

运行 `pnpm test` 确保所有测试通过。
```

---

### Task 6: API 路由集成测试
**预计时间**: 2小时
**依赖**: Task 1

**AI 提示词**:
```
你是一位资深的后端测试工程师，专注于 API 测试和集成测试。

ultrathink

任务：为核心 API 路由编写集成测试。

具体要求：
1. 创建 `app/api/__tests__/` 目录
2. 为 `/api/menu-items` 编写测试：
   - `app/api/__tests__/menu-items.test.ts`
   - 测试 GET 请求返回格式
   - 测试 POST 请求验证
3. 为 `/api/restaurant-tables` 编写测试：
   - 测试 GET 请求
   - 测试 POST 请求创建桌台
   - 测试 DELETE 请求
4. 为 `/api/orders` 编写测试：
   - 测试 GET 请求（带 tableId 参数）
   - 测试 POST 请求创建订单
   - 测试请求参数验证

测试示例：
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../menu-items/route'

// Mock database
vi.mock('@/lib/db', () => ({
  getDb: () => ({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: '1', name: 'Test', category: 'Main', price: '10.00' },
        ]),
      }),
    }),
  }),
}))

describe('/api/menu-items', () => {
  describe('GET', () => {
    it('should return menu items with categories', async () => {
      const request = new NextRequest('http://localhost/api/menu-items')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('items')
      expect(data).toHaveProperty('categories')
    })
  })
  
  describe('POST', () => {
    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost/api/menu-items', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }), // missing required fields
      })
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })
  })
})
```

注意：API 测试需要 mock 数据库连接。

运行 `pnpm test` 确保所有测试通过。
```

---

### Task 7: 测试覆盖率报告配置
**预计时间**: 1小时
**依赖**: Task 3, Task 4, Task 5, Task 6

**AI 提示词**:
```
你是一位资深的测试工程师，专注于测试覆盖率和质量指标。

任务：配置测试覆盖率报告并设置质量门槛。

具体要求：
1. 安装依赖：
   ```bash
   pnpm add -D @vitest/coverage-v8
   ```
2. 更新 `vitest.config.ts` 配置覆盖率：
   ```typescript
   export default defineConfig({
     test: {
       coverage: {
         provider: 'v8',
         reporter: ['text', 'json', 'html'],
         include: ['lib/**/*.ts', 'hooks/**/*.ts'],
         exclude: ['**/*.test.ts', '**/__tests__/**'],
         thresholds: {
           lines: 60,
           functions: 60,
           branches: 50,
           statements: 60,
         },
       },
     },
   })
   ```
3. 更新 `package.json` 脚本：
   ```json
   {
     "scripts": {
       "test:coverage": "vitest run --coverage"
     }
   }
   ```
4. 创建 `.gitignore` 条目：
   - 添加 `coverage/` 目录
5. 运行覆盖率报告并确认核心模块覆盖率达标：
   - `lib/money.ts` > 80%
   - `lib/order-utils.ts` > 80%
   - `hooks/useCheckout.ts` > 60%

运行 `pnpm test:coverage` 生成报告。
```

---

### Task 8: 测试文档与 CI 建议
**预计时间**: 1小时
**依赖**: Task 1-7

**AI 提示词**:
```
你是一位资深的 DevOps 工程师和技术文档编写者。

任务：编写测试文档并提供 CI 集成建议。

具体要求：
1. 创建 `doc/testing.md`：
   - 测试框架说明（Vitest, Testing Library, MSW）
   - 运行测试命令说明
   - 编写测试指南
   - 测试文件命名和位置约定
   - Mock 数据使用说明
2. 更新 `AGENTS.md` 添加测试相关内容：
   - 测试命令列表
   - 测试覆盖率要求
3. 创建 `.github/workflows/test.yml`（CI 建议）：
   ```yaml
   name: Test
   on: [push, pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: pnpm/action-setup@v2
         - uses: actions/setup-node@v4
           with:
             node-version: '20'
             cache: 'pnpm'
         - run: pnpm install
         - run: pnpm lint
         - run: pnpm test:coverage
         - run: pnpm build
   ```
4. 在 `doc/agents/` 下创建 `phase3_completion_report.md`，记录：
   - 完成的任务列表
   - 测试覆盖率统计
   - 引入的测试依赖
   - 后续测试计划建议（E2E 测试等）

保持文档简洁清晰，便于团队成员理解测试体系。
```

## Links
- 优化方案：`doc/opus_improve_plan.md`
- Phase 1 计划：`doc/agents/phase1_improvement.md`
- Phase 2 计划：`doc/agents/phase2_improvement.md`
- 编码规范：`doc/guides/nextjs.instructions.md`
- Vitest 官方文档：https://vitest.dev/
- Testing Library 文档：https://testing-library.com/docs/react-testing-library/intro/
- MSW 文档：https://mswjs.io/docs/
