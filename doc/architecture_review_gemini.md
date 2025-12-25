# easyFactu 系统架构评审与优化方案

> **评审者**: Antigravity (Google Deepmind Advanced Agentic Coding Team)
> **日期**: 2025-12-26
> **版本**: v1.0

---

## 📌 A. 快速结论 (TL;DR)

经过对代码库的深度扫描与核心模块分析，以下是针对 **可维护性** 与 **可扩展性** 的 5 个关键改进建议（按优先级排序）：

| 优先级 | 改进点 | 预计收益 |
| :--- | :--- | :--- |
| **P0** | **重构“核心上帝接口” (`checkout/route.ts`)**<br>将 740+ 行的 API 路由逻辑抽取为独立的 `CheckoutService`，实现业务与 HTTP 传输层解耦。 | **核心风险降低**：消除单点故障风险<br>**可测试性**：从 ~0% 提升至 >80% 单元测试覆盖 |
| **P1** | **POS 界面组件拆分与状态下沉**<br>`pos-interface.tsx` (623行) 承担了过多的视图编排与业务状态管理，需拆分为 `PosLayout`, `PosHeader`, `PosContent` 等子组件。 | **维护成本**：UI 修改不再牵一发而动全身<br>**开发效率**：组件复用率提升 |
| **P1** | **统一金额计算与领域模型**<br>目前金额计算散落在 API、Hooks 和 Utils 中（如 `parseMoney`, `parseNumeric`），需建立统一的 `Money` 值对象与 `Order` 领域模型。 | **数据一致性**：彻底杜绝精度丢失与计算偏差<br>**可读性**：业务意图更清晰 |
| **P2** | **建立 API 错误处理中间件**<br>目前每个 API 路由都在重复 `try-catch` 和 `Zod` 错误映射逻辑，需抽取统一的 `withErrorHandler`。 | **代码量减少**：减少约 20% 的样板代码<br>**一致性**：统一错误响应格式 |
| **P2** | **引入后端集成测试框架**<br>当前仅有少量前端测试，后端业务逻辑处于“裸奔”状态。建立基于 Vitest + Test DB 的服务层集成测试。 | **发布信心**：敢于重构，敢于快速增加新功能 |

---

## 🏗 B. 架构与模块化建议

### B.1 当前架构概览 (Current State)

目前项目采用的是 **Next.js App Router 混合架构**，实质上是 "Smart UI + Fat API Handlers + Anemic Domain" 模式。

```mermaid
graph TD
    User-->UI[UI Components (Smart Components)]
    UI-->Hooks[Custom Hooks (Business Logic)]
    UI-->API[Next.js API Routes (Fat Handlers)]
    API-->DB[Drizzle ORM / Supabase]
    
    subgraph Frontend
    UI
    Hooks
    end
    
    subgraph Backend
    API
    end
```

**主要问题：**
1.  **UI 层过重**：`pos-interface.tsx` 直接通过 `fetch` 调用 API，且包含大量状态转换逻辑，导致难以独立测试 UI 表现。
2.  **API Handler 过重**：`app/api/orders/checkout/route.ts` 是典型的 "Transaction Script"（事务脚本），混合了参数校验、数据库查询、业务计算（AA 分账）、事务控制和 HTTP 响应构建。
3.  **领域逻辑贫血**：`types/` 仅包含接口定义，`db/schema.ts` 仅定义表结构。真正的业务规则（如“AA 结账时金额必须匹配”）散落在 API Handler 的 `if-else` 迷宫中。

### B.2 目标架构 (Target State)

建议向 **分层架构 (Layered Architecture)** 演进，特别是引入 **Service Layer (服务层)** 和 **Domain Layer (领域层)**。

```ascii
[ Presentation Layer ]  <-  负责 HTTP 解析、参数验证、JSON 响应
       │   (app/api/...)
       ▼
[ Application Layer ]   <-  负责用例编排、事务控制、调用领域对象
       │   (lib/services/...)
       ▼
[   Domain Layer    ]   <-  负责纯粹业务规则、状态流转、不依赖数据库
       │   (lib/domain/...)
       ▼
[ Infrastructure Layer] <-  负责数据持久化、外部 API 调用
           (lib/db/..., lib/repositories/...)
```

**依赖规则：**
*   **Domain Layer** 不依赖任何其他层。
*   **Application Layer** 依赖 Domain 和 Infrastructure 的接口。
*   **Presentation Layer** 仅依赖 Application Layer。

---

## 🛠 C. 代码层面改进清单

### C.1 目录结构重构

当前 `lib/` 目录职责不清。建议重新组织：

| 现状 | 建议路径 | 说明 |
| :--- | :--- | :--- |
| N/A | `lib/services/checkout.service.ts` | **新增**：处理结账核心业务逻辑 |
| N/A | `lib/domain/money.ts` | **新增**：封装金额计算逻辑 |
| `hooks/` | `hooks/ui/` vs `hooks/data/` | 区分 UI 交互 Hooks 与 数据获取 (React Query) Hooks |
| `lib/order-utils.ts` | `lib/domain/order/order-calculator.ts` | 将工具函数升级为领域逻辑 |

### C.2 核心模块重构示例

#### 1. 抽取 Service 层 (针对 `checkout/route.ts`)

**Before (Current Controller):**
```typescript
// app/api/orders/checkout/route.ts
export async function POST(req: NextRequest) {
  // 1. Parse Body
  // 2. DB Transaction Start
  // 3. Check Order Status
  // 4. Calculate AA Logic (几百行代码)
  // 5. Insert Transaction
  // 6. Return Response
}
```

**After (Proposed):**

```typescript
// lib/services/checkout.service.ts
import { OrderRepository } from "@/lib/repositories/order.repository";

export class CheckoutService {
  async processCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    return await db.transaction(async (tx) => {
      // 纯粹的业务编排
      const order = await orderRepo.findById(input.orderId, tx);
      order.validateCanCheckout(); // 领域方法
      
      const calculator = new CheckoutCalculator(order);
      const paymentPlan = calculator.calculatePlan(input.mode, input.aaItems);
      
      await orderRepo.markAsPaid(order.id, paymentPlan, tx);
      await transactionRepo.create(paymentPlan, tx);
      
      return { success: true };
    });
  }
}

// app/api/orders/checkout/route.ts
export async function POST(req: NextRequest) {
  const input = parseResult.data; // 仅负责校验
  const service = new CheckoutService();
  const result = await service.processCheckout(input);
  return NextResponse.json(result);
}
```

### C.3 错误处理与日志

**现状**：各处手动 `try-catch`，简单的 `console.error`。
**建议**：
1.  **自定义异常类**：`class BusinessError extends Error { code: string; status: number }`
2.  **全局错误拦截**：在 `app/api` 下使用高阶函数封装。
3.  **结构化日志**：引入 `pino` 或类似库，确保日志包含 `traceId` 和 `userId`。

### C.4 类型系统

**现状**：存在 `any` 断言（如 `order as { totalAmount?: unknown }`），因为 Drizzle 的 Schema 类型推断在复杂 Join 下不够直观。
**建议**：
1.  **明确 DTO (Data Transfer Objects)**：为 API 请求/响应定义明确 Zod Schema 和 TS 类型，不直接复用 DB Schema 类型。
2.  **修复 DB 类型**：在 Repository 层处理 DB 类型到 Domain 类型的转换，隔离 DB 细节。

---

## 🧪 D. 可测试性与质量保障

### D.1 测试策略金字塔

当前测试严重缺失。建议采取以下策略补全：

1.  **Unit Tests (60%)**:
    *   **重点对象**：`lib/domain` 下的所有文件（如 `Money`, `OrderCalculator`）。
    *   **特点**：运行速度极快，无 IO，无需 Mock 数据库。
    
2.  **Integration Tests (30%)**:
    *   **重点对象**：`lib/services` (如 `CheckoutService`)。
    *   **方法**：使用独立的 Test Database (Docker 容器)，在事务中运行测试并回滚，保证真实数据库交互正确性。
    
3.  **E2E Tests (10%)**:
    *   **重点对象**：关键路径（点单 -> 结账流程）。
    *   **工具**：Playwright。

### D.2 CI/CD 门禁

并在 `.github/workflows` 中配置：
*   **Lint**: `eslint .`
*   **Typecheck**: `tsc --noEmit`
*   **Test**: `vitest run`
*   **Coverage**: 核心业务模块覆盖率不低于 80%。

---

## 🗓 E. 演进路线图 (Roadmap)

### 阶段 1: 止血与防守 (0-2 天)
*   **任务**:
    1.  建立 `lib/domain/money.ts` 并替换分散的金额计算。
    2.  为 `checkout/route.ts` 编写其当前行为的 **集成测试** (Snapshot Test)，确保重构不破坏现有逻辑。
    3.  建立 `lib/services` 目录结构。
*   **收益**: 防止错误扩散，为重构建立安全网。

### 阶段 2: 核心重构 (1-2 周)
*   **任务**:
    1.  按 MVP 方案重构 `checkout/route.ts` -> `CheckoutService`。
    2.  整理 `pos-interface.tsx`，将数据获取逻辑抽离为 Custom Hooks (`usePosController`)。
*   **收益**: 解决最大的维护痛点，提升代码可读性。

### 阶段 3: 架构规范化 (1-2 月)
*   **任务**:
    1.  全面推广 Repository 模式。
    2.  完善 API 错误处理中间件。
    3.  补全 CI/CD 流程。
*   **收益**: 系统具备承载复杂业务扩展的能力。

---

## ⚠️ F. 风险与权衡

| 决策点 | 建议 | 理由 |
| :--- | :--- | :--- |
| **重构 vs 重写** | **渐进式重构** | 业务正在运行，全新重写风险不可控。建议采用“绞杀者模式”，逐步替换模块。 |
| **ORM vs SQL** | **继续使用 Drizzle** | Drizzle 性能与类型支持良好，没必要更换。但需注意避免在 Controller 层直接构建复杂 Query。 |
| **Server Actions** | **暂缓引入** | 虽然 Next.js 推崇 Server Actions，但在现有 API Routes 架构未理顺前引入会增加复杂度。建议先理顺 Service 层，未来可轻松桥接到 Server Actions。 |
