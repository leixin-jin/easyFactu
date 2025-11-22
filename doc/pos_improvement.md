# POS 点单-下单-结账优化方案

本文在 `doc/pos_analysis.md` 现状梳理基础上，给出「点单 → 下单 → 结账」流程的优化方向和落地方案，重点围绕：

- 前端组件划分与状态管理
- 金额与价格的后端权威性
- 下单与结账的交互体验
- 并发与数据一致性
- 代码复用与结构整理
- 性能与扩展性（中长期）

---

## 1. 目标与约束

**业务目标**

- 保证收银金额安全、可追溯，避免前端篡改或浮点误差导致的对账问题。
- 提升服务员使用 POS 时的清晰度：什么已下单、什么未下单、结账覆盖范围一目了然。
- 支持多终端（多手机 / 多收银机）对同一桌台协作时的数据一致性。
- 为后续报表、历史订单查询等功能预留结构空间。

**技术约束**

- 维持当前 Next.js + App Router + Drizzle ORM 技术栈，不强行引入重量级状态管理库。
- 以渐进式改造为主：优先局部抽象和组件拆分，避免一次性大规模重构。
- 兼容当前数据库结构（字段含义不做破坏性变更，必要时逐步迁移）。

---

## 2. 前端：POS 组件拆分与状态管理优化

### 2.1 问题概述

- `components/pos-interface.tsx` 体积过大（上千行），集中了：
  - 菜单展示与筛选
  - 购物车（当前批次）管理
  - 已落库订单批次展示
  - AA 选择逻辑
  - 结账弹窗 UI + 表单状态 + 校验
  - 桌台选择与桌台列表加载
  - 打印小票触发逻辑
- 状态使用大量分散的 `useState`，涉及金额/折扣/AA/收款等多组关联字段，容易产生“只改了一部分状态”的 bug。

### 2.2 改造思路

**（1）按功能区块拆分组件**

将 POS 页面拆成若干子组件，`POSInterface` 只负责 orchestrate：

- `PosMenuPane`
  - 负责左侧菜品列表、搜索、分类筛选；提供 `onAddToCart(item)` 回调。
- `PosCartPane`
  - 负责当前批次（cart）的展示、增减数量、移除等。
- `PosOrderBatchList`
  - 展示已落库的批次（`batches`），只读视图。
- `PosOrderSummary`
  - 展示汇总的“菜品 × 数量”，并在 AA 模式下支持点击选择 AA 份额。
- `PosCheckoutDialog`
  - 只负责结账弹窗 UI 与输入（折扣、支付方式、收款金额、AA 模式），通过 props 接收金额计算结果和操作回调。
- `PosTableSelector`
  - 负责右侧桌台列表（或仅负责 POS 内桌台下拉选择），复用桌台列表 hook。

拆分后，各组件只关心自己的一小块状态，便于维护和测试。

**（2）抽离自定义 hooks 管理数据与副作用**

从 `POSInterface` 抽出几个 hooks：

- `useRestaurantTables()`
  - 封装当前 `/api/restaurant-tables` 加载、错误处理、mock 回退逻辑。
  - 在 `POSInterface` 和 `TableManagement` 中复用，避免重复实现。
- `usePosOrder(selectedTableId)`
  - 职责：
    - 加载指定桌台的当前 open 订单和批次：`GET /api/orders?tableId=...`
    - 对接「下单」接口：`POST /api/orders`
    - 对接「修改已下单菜品」接口：`PATCH /api/orders/[id]`
    - 对接「清空订单」接口：`POST /api/orders/clear`
  - 暴露：
    - `order`, `batches`, `loading`, `error`
    - `submitBatch(items, paymentMethod)`
    - `decrementItem(itemId)`
    - `removeItem(itemId)`
    - `clearOrder()`
- `useCheckout(order, batches, cart)`
  - 职责：
    - 维护结账相关 UI 状态：`checkoutDialog`、`discount`、`paymentMethod`、`receivedAmount`、`aaMode`、`aaItems` 等。
    - 负责金额计算（`checkoutSubtotal`, `checkoutTotal`, `changeAmount`）以及打开/关闭弹窗逻辑。
    - 对接结账接口 `POST /api/orders/checkout` 并处理错误码。

**（3）用 `useReducer` 管理复杂状态组合**

对于结账相关状态，可以考虑用 `useReducer` 替代多组 `useState`：

- state 示例：

```ts
interface CheckoutState {
  dialogOpen: boolean;
  discountPercent: number;
  paymentMethod: string;
  receivedAmount: number;
  aaMode: boolean;
  aaItems: AAItemSelection[];
}
```

- action 示例：`"OPEN_FULL" | "OPEN_AA" | "SET_DISCOUNT" | "SET_RECEIVED" | "TOGGLE_AA_ITEM" | "RESET" ...`

这样可以把“打开结账弹窗时的初始化 / reset”集中处理，减少遗漏。

### 2.3 实施步骤

1. 新建 `hooks/useRestaurantTables.ts` 并迁移 POS + 桌台管理中重复的加载逻辑。
2. 新建 `hooks/usePosOrder.ts`、`hooks/useCheckout.ts`，先在 POS 中接入（保持 API 行为不变）。
3. 按功能区块逐步拆分 `POSInterface` 子组件，每一步保证 UI 效果不变。
4. 当 hooks 与组件结构稳定后，再考虑为关键逻辑加轻量单元测试（如金额计算）。

---

## 3. 后端：金额与价格的后端权威性

### 3.1 问题概述

- 现在下单接口 `POST /api/orders` 直接使用前端传入的 `price` 计算金额并写入数据库：
  - 存在前端被篡改价格的风险。
  - 菜单价调整后，如果前端缓存旧数据，可能出现前后端价格不一致。

### 3.2 改造原则

- **所有最终金额以服务端为准**：
  - 前端只负责展示和交互，不负责决定订单实际金额。
  - 所有 `subtotal` / `total` / `totalAmount` / `paidAmount` 都由后端使用当下的价格和折扣规则计算。

### 3.3 具体方案

**（1）下单接口仅传 `menuItemId + quantity`**

- 修改 `orderCreateSchema`：

```ts
const orderItemInputSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().max(500).optional().nullable(),
});
```

- 后端在事务中按 `menuItemId` 查询 `menuItems.price`：
  - 若菜单中找不到对应菜品，直接报错（避免下单已下架菜）。
  - 按查询到的价格计算 `itemsSubtotal`，并写入 `order_items.price`。

**（2）结账接口不信任前端金额，只用于前端提示**

- 保持当前的「前后端金额校验」模式，但明确：
  - `clientSubtotal`、`clientTotal` 只用于检测 UI 是否 stale；
  - 真正的应付金额仍以服务端重新计算为准。
- 遇到 `SUBTOTAL_MISMATCH` / `TOTAL_MISMATCH` 时：
  - 向前端返回服务端金额；
  - 前端提示「单据已在其他终端更新，请刷新后按最新金额结账」。

**（3）统一金额工具函数**

- 把当前在多个 route 中重复的 `parseNumeric` + `toFixed(2)` 抽到 `lib/money.ts`：
  - `parseMoney(value: unknown): number`
  - `formatMoney(value: number): string`（统一四舍五入规则）
- 所有涉及金额读写的 API 统一通过该工具处理，避免不同接口间出现微小差异。

---

## 4. 交互体验：下单与结账的行为约束

### 4.1 问题概述

- 现在在 `handleCheckout` 中，如果 `cart` 仍有未提交的菜品，会在背景里自动 `POST /api/orders` 一次再结账：
  - 对操作员来说是“隐式行为”，可能不知道这些菜是否真的入账。

### 4.2 交互优化方案

**方案 A：强约束模式（推荐）**

- 规则：
  - 若 `cart` 非空，则不允许打开结账弹窗。
  - 点击「结账」按钮时，若有草稿：
    - toast 提示：「当前还有未提交的菜品，请先点击『下单』后再结账」。
  - 保证所有进入结账流程的菜品都是数据库中已有的 `order_items`。

**方案 B：显式确认模式**

- 保留「自动下单 + 结账」能力，但增加明确提示与确认：
  - 当 `cart` 非空时，点击结账：
    - 弹出确认对话框，列出将要自动下单的菜品明细；
    - 用户确认后才发送一次 `POST /api/orders`，再打开结账弹窗。

> 建议先实现方案 A（逻辑简单、行为清晰），后续如果业务强需求再拓展到方案 B。

### 4.3 错误码友好提示

- 当前后端已返回丰富 `code`：
  - `SUBTOTAL_MISMATCH` / `TOTAL_MISMATCH`
  - `AA_QUANTITY_EXCEEDS_ORDER`
  - `INSUFFICIENT_RECEIVED_AMOUNT`
  - `ITEM_FULLY_PAID` 等。
- 前端建议引入一个小的映射表，统一处理这些错误码：
  - 如 `errorCodeToMessage[code]`，提供更贴近业务的中文描述，并视情况建议用户刷新或重试。

---

## 5. 并发与数据一致性

### 5.1 问题概述

- 现在「同一桌台只允许一个 open 订单」是通过业务逻辑保证的：
  - 查询是否有 `orders.status = 'open'`，没有则创建。
  - 高并发情况下，如果没有数据库级别约束，存在理论上的“双 open 订单”风险。

### 5.2 数据库 / 业务层方案

**（1）数据库约束（推荐）**

- 在订单表上增加唯一约束（伪代码）：

```sql
-- 仅示意，具体写法视数据库方言而定
CREATE UNIQUE INDEX uniq_open_order_per_table
ON orders (table_id)
WHERE status = 'open';
```

- 当极端并发下出现两个事务都尝试创建 open 订单时，后提交者会因唯一约束失败而回滚。

**（2）事务与锁**

- 在创建/追加订单的逻辑中，视需要使用更严格的锁策略（如 `FOR UPDATE`），确保查询 + 写入属于同一事务的原子操作。

### 5.3 字段语义的统一

为避免后续开发混乱，建议明确字段语义并在代码中保持一致使用：

- `orders.subtotal`：整单原价小计（不含折扣）。
- `orders.discount`：整单折扣金额。
- `orders.totalAmount`：整单总金额（通常等于 `subtotal - discount`，或包含服务费等）。
- `orders.paidAmount`：已收金额总计（支持多次收款 / 多次 AA）。
- `restaurant_tables.amount`：当前桌台尚未结清金额（用于桌台列表上展示）。

并在订单相关的所有 API 内严格按照以上含义进行读写。

---

## 6. 代码复用与结构整理

### 6.1 后端：批次聚合与金额工具复用

- 目前在以下接口中都存在类似的「按批次聚合 `order_items` → `batches`」逻辑：
  - `POST /api/orders`
  - `GET /api/orders`
  - `PATCH /api/orders/[id]`
  - `POST /api/orders/checkout`
- 建议：
  - 新建 `lib/order-utils.ts`：
    - `buildOrderBatches(rows: OrderItemWithMenuItem[]): OrderBatchView[]`
    - 统一转换逻辑，避免字段遗漏或排序不一致。
  - 将 `parseNumeric` 和 `toFixed(2)` 相关处理迁移到前述的 `lib/money.ts` 中。

### 6.2 前端：桌台加载逻辑复用

- `POSInterface` 和 `TableManagement` 都实现了一套调用 `/api/restaurant-tables` 的逻辑（包含 mock 回退）。
- 建议：
  - 使用前述 `useRestaurantTables()` hook，在两处同时复用。
  - 桌台排序与分组逻辑（按区域 + 自然排序）同样抽象到 hook 或 util 中，避免两边实现不一致。

---

## 7. 性能与扩展方向（中长期）

### 7.1 大订单场景下的接口优化

- 当前 `GET /api/orders` / 结账接口会一次性加载整单的所有 `order_items`，在订单行数很多时可能成为瓶颈。
- 短期：
  - 保持现状，POS 实际日常场景中订单行数一般有限。
- 中长期：
  - 为历史订单查看接口单独设计分页/筛选 API；
  - POS 实时界面仍可以拉取整单，但在报表、查询模块中避免一次性加载全部行。

### 7.2 实时同步（可选）

- 当前所有状态更新依赖用户操作触发 `fetch`，对于多终端协作来说存在延迟。
- 后续可考虑：
  - 接入 Supabase Realtime / WebSocket，在桌台状态、订单新增/结算时推送更新；
  - 前端订阅对应 table 的 channel，自动刷新桌台金额、订单状态。

---

## 8. 推进节奏建议（里程碑）

**里程碑 1：后端安全与金额一致性**

- 调整 `POST /api/orders` 价格来源，金额由后端计算。
- 抽取金额工具 `lib/money.ts`，统一金额处理。
- 根据需要为 `orders` 增加“单桌只允许一个 open 订单”的唯一约束。

**里程碑 2：POS 前端拆分与交互优化**

- 抽出 `useRestaurantTables` / `usePosOrder` / `useCheckout` 三个 hooks。
- 拆分 `POSInterface` 成多个子组件，保证界面行为不变。
- 调整结账交互（推荐方案 A：有草稿不允许结账），并根据错误码展示友好提示。

**里程碑 3：AA & 多次收款体验增强**

- 优化 AA 选择 UI（更清晰展示已选数量 / 剩余数量）。
- 在订单详情或报表视图中呈现累计收款信息（含多次 AA）。

**里程碑 4（可选）：性能与实时性**

- 为报表/历史订单接口设计分页、筛选。
- 接入实时订阅机制，让桌台状态与未结金额在多终端间自动同步。

---

通过以上步骤，可以在不推倒重来的前提下，逐步把当前「点单-下单-结账」流程从**可用**提升到**更安全、更清晰、更易扩展**的状态，同时为后续门店扩张、多终端协作和经营分析打好基础。 

