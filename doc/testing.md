# 测试指南

## 测试框架

本项目使用以下测试工具：

- **Vitest**: 快速的 JavaScript/TypeScript 测试框架，与 Vite 深度集成
- **@testing-library/react**: React 组件和 hooks 测试工具
- **MSW (Mock Service Worker)**: API Mock 工具，用于测试隔离

## 运行测试

```bash
# 运行所有测试
pnpm test

# 监听模式（开发时推荐）
pnpm test:watch

# 单次运行
pnpm test:run

# 生成覆盖率报告
pnpm test:coverage

# 打开 UI 界面
pnpm test:ui
```

## 测试文件约定

- 测试文件命名：`*.test.ts` 或 `*.test.tsx`
- 测试文件位置：与源文件同目录的 `__tests__/` 文件夹
  - `lib/__tests__/` - 工具函数测试
  - `hooks/__tests__/` - React hooks 测试
  - `app/api/__tests__/` - API 路由测试

## 编写测试

### 工具函数测试

```typescript
import { describe, it, expect } from "vitest"
import { parseMoney } from "../money"

describe("parseMoney", () => {
  it("should parse numeric string correctly", () => {
    expect(parseMoney("10.50")).toBe(10.5)
  })

  it("should handle null/undefined", () => {
    expect(parseMoney(null)).toBe(0)
    expect(parseMoney(undefined)).toBe(0)
  })
})
```

### React Hooks 测试

```typescript
import { renderHook, act } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { useCheckout } from "../useCheckout"

describe("useCheckout", () => {
  it("should initialize with correct default state", () => {
    const { result } = renderHook(() => useCheckout({ batches: [], cart: [] }))
    expect(result.current.state.dialogOpen).toBe(false)
  })

  it("should open checkout dialog", () => {
    const { result } = renderHook(() => useCheckout({ batches: [], cart: [] }))
    act(() => {
      result.current.actions.openFullCheckout()
    })
    expect(result.current.state.dialogOpen).toBe(true)
  })
})
```

### API 路由测试

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}))

import { GET } from "../route"
import { getDb } from "@/lib/db"

describe("/api/example", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDb).mockReturnValue(mockDb)
  })

  it("should return data", async () => {
    const request = new NextRequest("http://localhost/api/example")
    const response = await GET(request)
    expect(response.status).toBe(200)
  })
})
```

## Mock 数据

MSW handlers 定义在 `__tests__/mocks/handlers.ts`，用于组件测试中 mock API 响应。

```typescript
import { http, HttpResponse } from "msw"

export const handlers = [
  http.get("/api/example", () => {
    return HttpResponse.json({ data: "mock" })
  }),
]
```

## 测试覆盖率

核心模块覆盖率要求：
- `lib/money.ts` > 80%
- `lib/order-utils.ts` > 80%
- `lib/checkout/calculate.ts` > 80%
- `hooks/useCheckout.ts` > 60%

运行 `pnpm test:coverage` 查看详细报告。
