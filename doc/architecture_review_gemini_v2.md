# easyFactu 架构审视与优化方案 v2.0

> **综合评审**: 基于 Codex, Claude, Gemini 三方评审的精华汇总
> **目标读者**: 新入职工程师 / 架构维护者
> **核心原则**: **易读 (Understandable)**, **可维护 (Maintainable)**, **可扩展 (Extensible)**

---

## 1. 核心摘要 (TL;DR)

我们当前的代码库是一个典型的 Next.js 应用，功能丰富但结构逐渐复杂。为了让新人更容易上手，同时也为了未来的功能扩展，我们需要对架构进行一次**结构化整理**。

**关键问题：**
1.  **逻辑分散**: 业务规则散落在 UI 组件 (`pos-interface.tsx`) 和 API 路由 (`route.ts`) 中，找代码像寻宝。
2.  **重复建设**: 存在多个版本的组件和工具函数 (如 `components/` vs `components/features/`)，修改一处容易漏掉另一处。
3.  **缺乏分层**: 很多 API 直接在控制器里写 700 行 SQL 和逻辑，难以测试和复用。

**三大改进目标：**
*   ✅ **单一事实来源 (Single Source of Truth)**: 消除重复代码，每个功能只有一个标准实现。
*   ✅ **逻辑与视图分离 (Separation of Concerns)**: UI 只负责“画界面”，Service 层负责“做决定”，Repository 层负责“存数据”。
*   ✅ **类型安全与一致性**: 统一金额计算、错误处理和环境变量。

---

## 2. 架构设计图 (The Big Picture)

为了让大家更容易理解代码去哪儿写，我们采用简化的**分层架构**。请遵循“单向依赖”原则：UI 调用 Service，Service 调用 Repository。

```mermaid
graph TD
    User((用户)) --> UI[UI 层 (Components/Hooks)]
    
    subgraph "前端 (Client/Server Components)"
        UI
        UI --调用--> Actions[API Client / Server Actions]
    end

    subgraph "后端逻辑 (Server Side)"
        Actions --调用--> Service[Service 层 (业务逻辑)]
        Service --使用--> Domain[Domain 层 (纯规则/计算)]
        Service --调用--> Repo[Repository 层 (数据存取)]
    end

    Repo --读写--> DB[(Supabase / DB)]

    %% 解释
    classDef ui fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef logic fill:#fff9c4,stroke:#fbc02d,stroke-width:2px;
    classDef data fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    
    class UI,Actions ui;
    class Service,Domain logic;
    class Repo,DB data;
```

### 各层职责说明 (Where do I put code?)

| 层级 | 文件夹路径 | 职责 | 举例 | 能依赖谁？ |
| :--- | :--- | :--- | :--- | :--- |
| **UI 层** | `components/**`, `app/**` | 展示界面，处理点击，调用 Hooks。不写复杂 `if-else`。 | 点击按钮触发 `checkout()` | Service, Hooks |
| **Service 层** | `lib/services/**` | **业务的大脑**。编排流程，管理事务，做决定。 | `CheckoutService.process()` (检查库存->计算金额->创建订单) | Repository, Domain |
| **Domain 层** | `lib/domain/**` | **纯净的规则**。不碰数据库，不碰 UI，只做计算。 | `Money.add()`, `Order.canCheckout()` | 无 (最底层) |
| **Repository 层** | `lib/repositories/**` | **数据的管家**。只管 CRUD (增删改查)，不懂业务。 | `OrderRepo.findById()`, `UserRepo.save()` | DB Schema |

---

## 3. 标准目录结构 (Directory Structure)

我们将整理现有的混乱结构，建立清晰的“家”。

```text
/
├── app/                  # Next.js 路由入口 (只做简单的参数透传)
│   ├── api/              # API Routes (Controller 层)
│   │   └── orders/       # 仅负责: 验证 Request -> 调 Service -> 返回 JSON
│   └── (pages)/          # 页面组件
├── components/           # UI 组件
│   ├── features/         # 业务组件 (按模块分: pos, menu, tables) ✅ 推荐
│   ├── ui/               # 基础 UI (Button, Input) - shadcn/ui
│   └── shared/           # 通用业务组件 (Sidebar, Header)
├── lib/                  # 核心逻辑库
│   ├── api/              # 前端 API Client (fetch 封装)
│   ├── domain/           # [NEW] 领域模型 (Money, Order Status)
│   ├── services/         # [NEW] 业务服务 (CheckoutService)
│   ├── repositories/     # [NEW] 数据访问 (TableRepository)
│   └── utils/            # 通用工具 (formatDate, cn)
├── hooks/                # React Hooks
│   ├── ui/               # 界面交互 (useToast)
│   └── data/             # 数据获取 (useOrderQuery)
├── db/
│   └── schema.ts         # 数据库定义
└── types/                # TS 类型定义
```

---

## 4. 改进详单与行动指南

### 4.1 🔪 消除重复与大泥球 (Refactoring)
*   **现象**: `components/PosMenuPane.tsx` 和 `components/features/pos/PosMenuPane.tsx` 几乎一样。
*   **行动**:
    1.  **认准 `components/features/`**: 业务组件一律放在这里。
    2.  **清理旧代码**: 逐步删除根目录下散落的组件，或改为 `export ... from '@/components/features/...'` 以保持兼容。
    3.  **拆分上帝组件**: `pos-interface.tsx` (600+行) 太大了。按区域拆分成 `<PosHeader />`, `<PosCart />`, `<PosGrid />`。

### 4.2 🧠 抽取 Service 层 (Extract Service)
*   **现象**: `app/api/orders/checkout/route.ts` 有 700 行代码，里面全是业务逻辑。
*   **行动**:
    1.  创建 `lib/services/checkout.service.ts`。
    2.  将路由里的逻辑（验证、计算、事务）移动到 Service 类中。
    3.  API Route 变成“瘦子”，只负责调用 Service。

    ```typescript
    // ❌ Bad (API Route 里的逻辑)
    export async function POST(req) {
      if (order.status !== 'OPEN') return error('....');
      // ... 500 lines of logic ...
      await db.insert(...);
      return json(...);
    }

    // ✅ Good (API Route)
    export async function POST(req) {
      const data = await req.json();
      const result = await checkoutService.process(data); // 逻辑都在这
      return NextResponse.json(result);
    }
    ```

### 4.3 💰 统一金额与类型 (Strict Types)
*   **现象**: 到处都在手写 `parseFloat`, `Number()`, 容易出现 `0.1 + 0.2 = 0.3000004`。
*   **行动**:
    1.  所有金额计算使用 `lib/domain/money.ts` (基于整数或 Decimal 库)。
    2.  API 输入输出使用 Zod 严格校验，不信任 `any`。
    3.  环境变量使用 `lib/env.ts` 统一管理，防止 `process.env.DB_URL` 拼写错误。

### 4.4 🛡️ 错误处理标准化 (Error Handling)
*   **现象**: 每个 API 都在复制粘贴 `try { ... } catch (e) { ... }`。
*   **行动**:
    1.  使用 `withErrorHandler` 中间件包裹 API 逻辑。
    2.  统一返回格式 `{ error: string, code: string, detail?: any }`。

---

## 5. 实施路线图 (Roadmap for You)

作为一个新人或开发者，你可以按照这个节奏来优化代码：

### 🏁 阶段 1: 整理房间 (Day 1-2)
*   [ ] **合并组件**: 确认 `components/features` 为正统，删除根目录重复组件。
*   [ ] **配置环境变量**: 建立 `lib/env.ts`，确保应用启动时检查配置。
*   [ ] **统一 API 调用**: 前端别直接用 `fetch`，统一走 `lib/api/client.ts`。

### 🚀 阶段 2: 核心重构 (Week 1)
*   [ ] **重构结账 API**: 按照 Service 模式重写 `checkout/route.ts`。
*   [ ] **抽取 Money 逻辑**: 建立 `lib/domain/money.ts`，替换所有金额计算。
*   [ ] **增加中间件**: 实现 `withErrorHandler`，清理 API 样板代码。

### 🏰 阶段 3: 稳固根基 (Month 1)
*   [ ] **补全测试**: 给 Service 层添加单元测试 (Vitest)。
*   [ ] **完善 Log**: 引入结构化日志，发生错误时能看到 Request ID。

---

## 6. 开发小贴士 (Tips)

*   **不要在组件里写 SQL**: 永远不要。组件只负责显示。
*   **不要信任前端传来的金额**: 永远在后端重新计算总价。
*   **遇到不知道放哪的代码**:
    *   是纯计算？ -> `lib/domain`
    *   涉及数据库？ -> `lib/repositories`
    *   涉及完整业务流程？ -> `lib/services`
    *   是通用工具 (如日期格式化)？ -> `lib/utils`
