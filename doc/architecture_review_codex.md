# easyFactu 架构审视（Codex）

0. 系统理解概括
- 这是一个基于 Next.js App Router 的餐饮 POS 系统，核心流程覆盖桌台管理、点单、结账/AA、小票、日结与报表；数据通过 Supabase Postgres + Drizzle ORM 持久化。
- UI 主要通过 `app/*` 页面组合 `components/features/*` 模块；数据侧以 TanStack Query（`lib/queries/*`）+ 统一 API client（`lib/api/*`）调用 `app/api/*` route handlers。
- 业务计算分散在 `lib/*`（如 `lib/order-utils.ts`、`lib/daily-closure/calculate.ts`、`lib/reports/*`）与部分 API route 内；部分组件仍直接 `fetch`，与 `lib/api` 并存。
- 存在明显的重复模块与并行版本：例如 `components/pos-interface.tsx` 与 `components/features/pos/PosInterface.tsx`，`hooks/use-toast.ts` 与 `components/ui/use-toast.ts`，以及多个功能组件在根目录和 `features/` 中同时存在。

A. 快速结论（TL;DR）
1) 先收敛“重复/分叉”的组件与 hooks，建立单一来源（SSOT）与导出边界（P0）。收益：维护成本显著下降、降低逻辑分叉风险。
2) 引入服务层/仓储层，将 API route 的业务逻辑与 DB 访问剥离（P0）。收益：可测试性和可扩展性大幅提升，便于新增功能或替换数据源。
3) 统一 API 错误与响应契约，消除 `error/message` 混用（P1）。收益：前端错误处理一致、减少隐式约定。
4) 抽取并复用核心业务计算（结账/AA/日结/报表）为纯函数（P1）。收益：逻辑复用、回归测试更可靠。
5) 用“轻量可观测性”替换散落的 `console.error`（P1）。收益：排障效率提升，定位线上问题更快。
6) 建立基础架构文档与 ADR，约束依赖方向（P2）。收益：避免架构回退，支撑多人协作。

B. 架构与模块化建议

B1. 当前架构概览（基于代码推断）
```
app/* pages
  └─ components/* + components/features/*
       └─ hooks/* (UI 状态与业务混合)
            └─ lib/queries/* -> lib/api/* -> app/api/*
                 └─ lib/db.ts -> db/schema.ts
                 └─ lib/* (order-utils, reports, daily-closure)
```

B2. 主要问题
- 重复模块并存且部分逻辑已分叉：`components/*` 与 `components/features/*` 同名功能并行存在（如 `components/PosMenuPane.tsx` 与 `components/features/pos/PosMenuPane.tsx`）。
- API route 过度承载业务逻辑，且混用 HTTP 响应对象：`app/api/orders/route.ts`、`app/api/orders/[id]/route.ts`、`app/api/orders/checkout/route.ts` 在事务中直接返回 `NextResponse`。
- 错误响应不统一：例如 `app/api/restaurant-tables/route.ts` 使用 `{ message }`，多数路由使用 `{ error, code, detail }`。
- 类型与序列化分散：`types/api.ts` 与 `app/api/menu-items/utils.ts` 中存在重复类型与映射；金额/日期序列化逻辑多处重复。
- 部分组件仍直接 `fetch`，绕过 `lib/api` 与查询缓存：如 `components/features/tables/TableManagement.tsx` 与 `components/menu-management.tsx`。

B3. 建议的目标架构（MVP Refactor → 理想方案）
```
UI (app/*, components/*)
  └─ hooks/ui/*  (只处理 UI 状态)
  └─ hooks/data/* -> lib/queries/* -> lib/api/*

app/api/*
  └─ services/* (use-cases)
       └─ repositories/* (db access)
           └─ db/schema.ts

lib/domain/* (纯计算与规则)
lib/contracts/* (zod 输入/输出约束)
```

B4. 依赖规则（明确禁止项）
- UI 仅能依赖 `components/shared`、`hooks/*`、`lib/queries`、`lib/api`、`types/*`、`lib/domain`。
- `app/api/*` 仅能依赖 `services/*`、`repositories/*`、`lib/domain`、`lib/contracts`、`lib/db`。
- `lib/domain/*` 不允许依赖 Next.js/React/数据库/HTTP。
- 禁止 `components/*` 直接引用 `app/api/*` 或 `db/schema.ts`。

C. 代码层面改进清单（可落地）

C1. 总览表（问题 → 建议 → 优先级 → 预估工作量 → 影响范围）
| 问题 | 建议 | 优先级 | 工作量 | 影响范围 |
| --- | --- | --- | --- | --- |
| 重复组件/版本分叉（如 `components/pos-interface.tsx` vs `components/features/pos/PosInterface.tsx`） | 合并为单一实现，旧路径改为 re-export 或迁移到 `components/legacy/` | P0 | M | UI 入口、组件导入路径 |
| 重复 hooks（`hooks/use-toast.ts` vs `components/ui/use-toast.ts`） | 保留一个来源，其他路径 re-export/删除 | P0 | S | 通用 hooks |
| API response 结构不一致（`error`/`message` 混用） | 引入统一 `jsonError/jsonOk` helper | P1 | M | 所有 `app/api/*` |
| API route 内耦合业务逻辑与 DB | 抽离到 `services/*` + `repositories/*` | P0 | L | 订单、日结、报表、桌台 |
| 前端直连 `fetch` 与 query client 并存 | 统一使用 `lib/api` + `lib/queries` | P1 | M | 菜单、桌台管理 |
| 重复业务计算/未复用（`hooks/useCheckout.ts` vs `lib/checkout/calculate.ts`） | 抽取纯函数统一计算入口 | P1 | S | POS 结账、AA 逻辑 |
| 类型/序列化散落 | 建立 `lib/serializers/*` 与共享 `types` | P2 | M | API + UI 数据映射 |
| 可观测性弱（散落 `console.error`） | 加 `lib/logger` & requestId | P2 | M | API/关键路径 |
| Mock fallback 长期存在 | 用 env flag 控制，生产禁用 | P2 | S | `hooks/useRestaurantTables.ts` |

C2. 按主题分组细化（问题 → 建议 → 示例 → 影响范围）

1) 目录结构与模块边界
- 问题：重复模块并存，路径不一致导致长期漂移（`components/PosMenuPane.tsx`、`components/features/pos/PosMenuPane.tsx` 等）。
- 建议（MVP）：保留 `components/features/*` 作为唯一来源，旧路径改为 re-export 或移至 `components/legacy/` 并逐步删除。
- 示例：
```ts
// components/PosMenuPane.tsx
export { PosMenuPane } from "@/components/features/pos/PosMenuPane"
```
- 影响范围：`components/*` 与 `app/*` 的导入路径。

2) 错误处理与响应一致性
- 问题：API 路由响应结构不统一（`app/api/restaurant-tables/route.ts` 使用 `{ message }`）。
- 建议（MVP）：统一响应 helper，并在 `types/api.ts` 定义稳定的 error shape。
- 示例：
```ts
// lib/http/response.ts
export function jsonError(status: number, code: string, error: string, detail?: unknown) {
  return NextResponse.json({ error, code, detail }, { status })
}
```
- 影响范围：所有 `app/api/*` 路由。

3) 服务层/仓储层
- 问题：route handler 内承载事务与业务规则，且在事务中返回 `NextResponse`（`app/api/orders/route.ts`、`app/api/orders/[id]/route.ts`）。
- 建议（MVP）：抽离 `services/orders.ts`；`route.ts` 只做输入校验 + 调用 service + 响应。
- 示例：
```ts
// services/orders.ts
export async function createOrderBatch(input, deps) { /* tx + domain */ }
```
- 影响范围：订单、桌台、日结、报表模块。

4) 数据获取一致性
- 问题：部分组件使用直接 `fetch`，绕过 `lib/api` 与 `lib/queries`（`components/features/tables/TableManagement.tsx`）。
- 建议（MVP）：统一走 `lib/api`，在 UI 层只使用 query hooks。
- 示例：
```ts
const createMutation = useCreateTable()
await createMutation.mutateAsync({ number, area, capacity })
```
- 影响范围：`components/features/tables/*`、`components/menu-management.tsx`。

5) 业务计算复用
- 问题：结账计算在 `hooks/useCheckout.ts` 中重复实现，`lib/checkout/calculate.ts` 未被复用。
- 建议：将计算统一在 `lib/checkout/*`，hook 只负责状态管理与调用。
- 示例：
```ts
const { subtotal, total } = calculateCheckoutTotal(items, discountPercent)
```
- 影响范围：POS 结账/AA。

6) 类型/序列化
- 问题：`types/api.ts` 与 `app/api/menu-items/utils.ts` 定义重复类型与映射。
- 建议：集中到 `lib/serializers`，保证 DB → API 的唯一映射点。
- 示例：
```ts
export function toMenuItemDto(row: MenuItem): MenuItemResponse { ... }
```
- 影响范围：菜单、订单、日结/报表。

7) 配置管理
- 问题：环境变量直接散落使用（`lib/db.ts`）。
- 建议：集中 `lib/env.ts` 进行校验（zod），并导出强类型配置。
- 示例：
```ts
const env = z.object({ DATABASE_URL: z.string().url() }).parse(process.env)
```
- 影响范围：`lib/db.ts`、Supabase client。

8) 可观测性
- 问题：路由仅 `console.error`，缺少上下文与 requestId。
- 建议：增加 `lib/logger`，在 middleware 注入 `x-request-id`。
- 影响范围：`app/api/*`、`middleware.ts`。

D. 可测试性与质量保障

D1. 测试分层策略
- 单元测试：`lib/domain/*`（钱/税/AA 计算）、`lib/order-utils.ts`、`lib/reports/*`。
- 集成测试：`app/api/*` route handlers（模拟 tx + repository），覆盖结账、转台、日结。
- 端到端（可选）：POS 主流程（下单→结账→日结）。

D2. 关键可测点（优先）
- 订单结账校验：`app/api/orders/checkout/route.ts`
- 订单项修改与金额回算：`app/api/orders/[id]/route.ts`
- 日结生成与区间推进：`app/api/daily-closures/confirm/route.ts`
- 报表聚合：`lib/reports/aggregate.ts`

D3. Mock / DI 策略
- 对 `services/*` 使用 repository 接口注入（替换 `getDb()`），便于模拟事务与失败场景。
- UI 使用 MSW（`__tests__/mocks/*`）模拟 API。

D4. CI 建议
- `pnpm lint` / `pnpm test:run` / `pnpm test:coverage` / `pnpm build`
- 覆盖率阈值建议：核心模块（`lib/money.ts`、`lib/order-utils.ts`、`hooks/useCheckout.ts`）保持 >60%（现有规则可延续）。

E. 演进路线图（分阶段）

E1. 0–2 天：低风险高收益
- 任务：
  - 清理重复组件与 hooks（re-export 或迁移至 `components/legacy/`）
  - 统一 API error helper，修复 `error/message` 混用
  - 用 env flag 控制 mock fallback
- 收益：减少维护噪音、明确依赖边界
- 风险：导入路径变更导致编译错误
- 回滚：保留旧路径 re-export

E2. 1–2 周：结构性重构（保持外部行为）
- 任务：
  - 新增 `services/*` 与 `repositories/*`，迁移订单、日结、菜单、桌台逻辑
  - 抽离 domain 计算函数并单测覆盖
  - 统一 API response 契约与类型映射
- 收益：可测试性/可扩展性显著提升
- 风险：事务边界改动导致行为差异
- 回滚：保留原 route handler 逻辑分支（feature flag）

E3. 1–2 月：架构演进/模块拆分
- 任务：
  - 按业务域拆分模块（orders/tables/menu/finance）并建立边界规范
  - 增加轻量观测能力（日志 + requestId + 关键指标）
  - 设计可插拔支付方式/打印渠道接口
- 收益：支持多终端/多店扩展、降低长期复杂度
- 风险：代码量增长，重构成本上升
- 回滚：保持单体部署，但通过模块边界控制复杂度

F. 风险与权衡
- API 响应结构统一可能影响已有前端逻辑：建议先兼容旧字段，再逐步收敛。
- 服务层抽离会引入更多文件与抽象：短期复杂度上升，但长期维护收益明显。
- 并发控制（如 `SELECT FOR UPDATE`）可能牺牲性能：需结合实际并发与数据库负载权衡。

G. 已确认约束与选择
- 客户端仅 Web 端，不需要兼容其他客户端的 API 响应结构。
- 不需要多门店/多租户：暂不引入 tenant 维度与隔离逻辑。
- 结账与日结并发接近无：可保持必要事务保护，但无需复杂并发控制与高阶锁优化。
- API 响应结构选择方案 A：成功响应保持业务数据直出，失败统一 `{ error, code, detail }`。
- 打印仅需支持 80mm 热敏打印机：保留现有 `window.print` 方案并整理打印模板，后续可加适配器对接 ESC/POS。
