# POS 前端与 API 结算逻辑分析

本文基于以下文件进行分析：

- 前端页面：`components/pos-interface.tsx`
- 相关接口：
  - `app/api/menu-items/route.ts`
  - `app/api/restaurant-tables/route.ts`
  - `app/api/orders/route.ts`
  - `app/api/orders/[id]/route.ts`
  - `app/api/orders/checkout/route.ts`
  - `app/api/orders/clear/route.ts`

---

## 一、整体业务流概览（回答问题 1）

从前端到后端，大致流程可以分为「加载数据 → 下单 → 修改菜品 → 结算（整单 / AA）→ 清台」几个阶段。

### 1. 前端主要状态与数据流

`components/pos-interface.tsx` 中维护了几类关键状态：

- `tables`：当前餐厅桌台列表，从 `/api/restaurant-tables` 获取。
- `selectedTable`：当前选中的桌台 ID。
- `currentOrder`：后端返回的当前桌台「open」状态订单的汇总信息。
- `batches`：已落库的订单批次（每次点击「下单」形成一批）。
- `cart`：当前还未落库的临时购物车（当前批次）。
- 结账相关：
  - `checkoutDialog`：结账对话框开关。
  - `discount`：当前结账折扣百分比（只作用于这次结账）。
  - `paymentMethod`：支付方式。
  - `aaMode`：是否 AA 结算模式。
  - `aaItems`：AA 选择的菜品及数量。
  - `receivedAmount`：本次结账的实收金额。

金额计算分两层：

- 「已有批次 + 当前草稿」的整单金额：
  - `existingSubtotal`：所有 `batches` 中 `order_items` 的金额合计。
  - `draftSubtotal`：当前 `cart` 中的金额合计。
  - `subtotal = existingSubtotal + draftSubtotal`。
  - `discountAmount = subtotal * (discount / 100)`。
  - `total = subtotal - discountAmount`。
- 结账弹窗右侧的「本次结账金额」：
  - 若 `aaMode === true`：用 `aaItems` 计算 `aaSubtotal`，只结算 AA 部分。
  - 若 `aaMode === false`：使用整单 `subtotal`。
  - 记为 `checkoutSubtotal`、`checkoutTotal` 等，用于传给后端校验。

### 2. 初始化与加载

1. 前端使用 `useMenuData` 调用 `/api/menu-items`，获取可售菜品和分类。
2. 首次渲染时调用 `loadTables()`：
   - 调用 `/api/restaurant-tables`，返回每个桌台的状态与当前金额（如果有 open 订单）。
   - 若失败则使用 `mockTables` 作为降级。
3. 当选择某个桌台（或 URL 查询参数中带有 `tableId` / `tableNumber`）时，调用：
   - `GET /api/orders?tableId=...`
   - 返回该桌台当前状态为 `open` 的订单 `order` 以及对应的 `batches`（按批次聚合的 `order_items`）。

### 3. 下单（新增批次）

当点击「下单」按钮（`handleSubmitBatch`）：

- 前置检查：必须选择桌台且 `cart` 中有菜。
- 调用 `POST /api/orders`，请求体：

  ```ts
  {
    tableId,
    paymentMethod,
    items: cart.map(item => ({
      menuItemId: item.id,
      quantity: item.quantity,
      price: item.price,
      notes: item.notes ?? undefined,
    })),
  }
  ```

- 后端逻辑（`app/api/orders/route.ts`）：
  1. 校验请求体。
  2. 确认桌台存在，将桌台状态更新为 `occupied`。
  3. 查找该桌台是否存在状态为 `open` 的订单：
     - 如果没有：新建一条 `orders` 记录（status=`open`），`subtotal`/`total` 以本次批次金额为初值。
     - 如果已有：在原有 `subtotal` 基础上累加本次批次金额，并重新计算 `total`（`total = subtotal - discount`）。
  4. 为本次批次生成 `batchNo`，插入多条 `order_items`。
  5. 查询整个订单的所有 `order_items` 按批次聚合，返回 `order` 与 `batches`。

前端收到响应后：

- 更新 `currentOrder`、`batches`。
- 清空 `cart`。

### 4. 修改已下单菜品（加减 / 删除）

结账之前，用户可以在已下单的批次中减少某个菜品数量或直接删除：

- 前端调用的是 `updatePersistedItem`：
  - `PATCH /api/orders/:id`，其中 `:id` 为 `order_items.id`。
  - body: `{ type: "decrement" | "remove" }`。

- 后端逻辑（`app/api/orders/[id]/route.ts`）：
  1. 找到该 `order_items` 记录及其所属订单。
  2. 根据 type：
     - `decrement`：数量减 1，若结果为 0，则删除该行；否则更新数量。
     - `remove`：直接删除该行。
  3. 按实际减少金额更新 `orders.subtotal`/`orders.total`。
  4. 重新查询该订单的所有 `order_items`，按批次聚合返回。

### 5. 结算（整单 / AA）

结账相关核心函数是 `handleCheckout`：

1. 打开结账弹窗：
   - 点击「结账」→ `handleOpenCheckout`，整单模式（`aaMode=false`）。
   - 点击「AA」→ `handleAA`，AA 模式（`aaMode=true`，清空 `aaItems`，弹出同一结账对话框）。
2. 选择 AA 菜品时，用户在中间「订单汇总」区域点击菜品，会触发 AA 选择逻辑：
   - 通过 `aaItems` 记录每个菜品本次要 AA 的数量。
3. 点击弹窗右下角的「确认结账」时：
   - 前端先校验本地计算的 `checkoutSubtotal`、`checkoutTotal`、`receivedAmount`。
   - 若 `cart` 中还有未落库的草稿，则自动再次调用 `POST /api/orders` 把草稿落库，保证后端以订单视角完整计算。
   - 根据 `aaMode` 构造请求体，调用 `POST /api/orders/checkout`：

     ```ts
     {
       tableId,
       orderId,
       mode: aaMode ? "aa" : "full",
       paymentMethod,
       discountPercent: discount,
       clientSubtotal: checkoutSubtotal,
       clientTotal: checkoutTotal,
       receivedAmount: effectiveReceived,
       changeAmount: effectiveReceived - checkoutTotal,
       aaItems: aaMode ? [...] : undefined,
     }
     ```

4. 后端根据 `mode` 分支处理：
   - `mode = "full"`：整单结算。
   - `mode = "aa"`：AA 结算（部分结算 / 完全结算）。

处理成功后，前端会：

- 如果是 AA：用返回的 `order`、`batches` 更新当前订单。
- 如果是整单：清空 `currentOrder`、`batches`（此时订单在 DB 中是 `paid` 状态，不再作为 open 订单展示）。
- 清理本次结账相关的本地状态（折扣、AA 选择、实收金额等）。
- 调用 `loadTables()` 刷新桌台状态，并触发打印（`window.print()`）和 Toast 提示。

### 6. 清空订单（取消）

点击「清空」按钮（`handleClearOrder`）：

- 前端调用 `POST /api/orders/clear`，body：`{ tableId }`。
- 后端逻辑（`app/api/orders/clear/route.ts`）：
  - 找到该桌台的 `open` 订单。
  - 删除所有该订单关联的 `order_items`。
  - 将订单状态设为 `cancelled`，金额归零，`closedAt` 补上。
  - 将桌台状态改为 `idle`。
- 返回的 `order: null, batches: []` 用于前端清空当前视图。

---

## 二、整单结算 vs AA 结算对 `order_items` 的影响（回答问题 2）

你提到：

> 整单「结算」和「AA」结算对数据库的 `order_items` 逻辑不一样，整单结算不会删除 `order_items` 的菜品，而 AA 会删除。

这确实是当前实现刻意设计的差异。

### 1. 整单结算（mode = "full"）

对应 `app/api/orders/checkout/route.ts` 中的非 AA 分支。

- 后端会：
  1. 查询该订单当前所有的 `order_items`（不做增删改）。
  2. 用这些行计算 `dbSubtotal`。
  3. 根据 `discountPercent` 计算 `discountAmount` 和 `calculatedTotal`。
  4. 校验前端传来的 `clientSubtotal`、`clientTotal` 是否与服务器计算一致。
  5. 校验 `receivedAmount` 是否够付。
  6. 更新 `orders`：
     - `status = "paid"`
     - `subtotal = dbSubtotal`
     - `discount = discountAmount`
     - `total = calculatedTotal`
     - `closedAt = now`
  7. 写一条 `transactions` 收入记录（类型：`POS checkout`）。
  8. 把桌台状态重置为 `idle`。

- **关键点**：整单结算时，**不会对 `order_items` 做任何删除或数量修改**，所有菜品行都保留在数据库中，只是订单状态由 `open` → `paid`。
  - 之后 `GET /api/orders?tableId=...` 只会查 `status = "open"` 的订单，所以前端看不到这些已结账的行，但数据在 DB 中是保留的，可以用于历史查询、报表等。

### 2. AA 结算（mode = "aa"）

同一接口 `app/api/orders/checkout/route.ts` 中的 AA 分支逻辑复杂得多：

1. 先查询当前订单所有 `order_items`（`rows`）。
2. 根据 `aaItems`（前端传来的菜品 ID + 数量）：
   - 先按 `menuItemId` 聚合，算出每个菜品要 AA 的总数量。
   - 校验每个菜品 AA 数量不能超过当前订单中该菜品的总购买数量。
3. 把 AA 数量分配到具体的 `order_items` 行（通过 `allocationByRowId`）：
   - 按批次和创建时间顺序，从旧到新消耗数量。
   - 计算服务器侧的 `aaDbSubtotal`。
4. 根据折扣率计算 `aaDiscountAmount` / `aaCalculatedTotal`，再和前端传入的 `clientSubtotal` / `clientTotal` 做校验。
5. 校验实收金额。
6. **修改 `order_items`**：
   - 对于每一行：
     - 若 AA 数量等于该行数量：删除该 `order_items` 行。
     - 若 AA 数量小于该行数量：更新该行的 `quantity` 为剩余数量。
7. 再查一次剩余的 `order_items`（`remainingRows`）：
   - `remainingSubtotal =` 未 AA 的部分金额。
8. 分两种情况更新 `orders`：
   - **全部 AA 结清（没有剩余行）**：
     - 订单状态改为 `paid`。
     - `subtotal/discount/total` 都以本次 AA 的金额为准。
     - 桌台状态改为 `idle`，人数、金额清零。
   - **部分 AA，订单继续保留**：
     - 订单状态仍为 `open`。
     - `subtotal = remainingSubtotal`。
     - `discount = "0"`。
     - `total = remainingSubtotal`（即未结部分的金额）。
     - 桌台状态为 `occupied`，`amount = remainingSubtotal`。
9. 插入一条 `transactions` 收入记录：
   - 类型：`POS checkout - AA`。
   - `amount = aaCalculatedTotal`（本次 AA 收入）。

**关键点**：

- AA 结算时，`order_items` 被视为「未结清部分」的实时快照：
  - 已 AA 的数量会从对应的 `order_items` 中扣除甚至删除。
  - 只保留尚未结清的数量，从而保证：
    - 下次再看这个订单时，只看到还没结账的部分。
    - `orders.subtotal/total` 也只代表「剩余未结金额」而不是整单历史金额。

这就是你观察到的现象：

- **整单结算**：保留所有 `order_items`（用于历史），只改 `orders` 状态与金额。
- **AA 结算**：**会删 / 改 `order_items`**，让 `order_items` 始终代表「还没结清的部分」。

---

## 三、AA 之后再整单结算，`orders` 金额只显示最后一次（回答问题 3）

你提到的问题：

> 当一张发票 AA 过后后，再整单结算，数据库表 `orders` 的价格只显示最后的价格，应该显示全部金额包括已 AA 的。

这与上面 AA 逻辑中的「重置订单金额为剩余未结部分」直接相关。

### 1. 当前实现下的金额演变过程

假设一个订单的实际流程是：

1. 初始下单总金额：100 元（全部落在 `order_items` 里）。
2. 第一次 AA 结算：AA 出去了 60 元。

在 AA 结算时：

- 相关的 `order_items` 行被删除 / 数量减少，只保留剩下 40 元对应的行。
- `orders` 被更新为：
  - 如果还有剩余菜品：
    - `status = "open"`
    - `subtotal = 40`
    - `discount = 0`
    - `total = 40`
  - 同时插入一条 `transactions` 记录：
    - `amount = 60`
    - `category = "POS checkout - AA"`

此时，从 `orders` 这条记录上看，它只反映「**当前仍未结算的 40 元**」，并不包含已经通过 AA 收入的 60 元。

3. 之后再次对剩余的 40 元做整单结算（即第二次结算）：

- 前端会以 `mode = "full"` 调用 `/api/orders/checkout`。
- 后端 full 分支会：
  - 用当前剩余的 `order_items` 重新计算 `dbSubtotal`，此时只会得到 40 元。
  - 根据折扣、实收金额等校验后，更新 `orders`：
    - `subtotal = 40`
    - `discount = ...`
    - `total = 40`（假设没有折扣）
  - 再写一条 `transactions` 收入记录（类型 `POS checkout`，金额 40）。

因此：

- **在当前设计中**，`orders.total` 最终确实只会显示「最后一次结算的金额（40）」。
- 这条 `orders` 记录并不代表「整张发票的累计金额」，而更接近于「最后一次结算时的订单金额快照」。
- 真正准确的收入数据是分散在多条 `transactions` 记录中：
  - 第一次 AA：`transactions.amount = 60`。
  - 第二次整单结算：`transactions.amount = 40`。
  - 两者合计 100 才是整单的总收入。

### 2. 你期望的「订单金额」含义

你期望的是：

> 一张发票 AA 之后再整单结算，`orders` 表中的价格应该体现「整张发票累计金额 = 已 AA 的金额 + 最后一次整单金额」。

也就是说：

- 希望 `orders.total` 既能反映整单所有结算的总金额，而不仅仅是最后一次结算时的金额。
- 当前实现把「未结部分」与「历史已结部分」的金额拆到 `orders` 与多条 `transactions` 中，这在会计 /流水统计上是合理的，但在「订单视角」上就有你看到的差异。

### 3. 原因总结

综合来看，出现这个现象的根本原因有两点：

1. **AA 结算会把 `orders.subtotal/total` 改写为「剩余未结金额」**，而不是保持「发票原始总金额」。
2. **整单结算（full 模式）只根据当前还在 `order_items` 里的菜品重算金额**，没有把之前 AA 已经收费的部分叠加回去。

因此：

- 从 `orders` 表单独看，只能看到「当前 / 最终一次结算的金额」，看不到「历史 AA 部分」。
- 想要知道整张发票的真正总金额，需要把同一 `orderId` 下所有 `transactions.amount` 累加起来。

### 4. 若要实现你期望的行为（思路参考）

虽然你当前只要求分析，但这里补充一些思路，方便后续改造时参考（不涉及实际改代码）：

- 方案 A：在 `orders` 新增字段，例如：
  - `originalTotal` / `originalSubtotal`：记录发票初始总金额，不随 AA 变化。
  - 或 `paidTotal`：记录累计已结金额（AA + 整单），每次结算时累加，避免被覆盖。
- 方案 B：在 `orders/checkout` 中：
  - AA 分支不要把 `orders.total` 改成剩余金额，只更新一个「剩余待结金额」字段。
  - full 分支在结算时，把之前的已结金额（可从 `transactions` 汇总或 `orders` 额外字段）加上这次的金额，再写回 `orders.total`。
- 方案 C：在报表 / 前端展示层面：
  - 保持现有 DB 结构不变，但在查询时通过 `transactions` 聚合每个 `orderId` 的所有收入金额，以此展示「发票总金额」。

---

## 四、小结

1. **整体逻辑**：前端维护「桌台 + 当前订单 + 批次 + 草稿购物车」的状态，通过 `/api/orders` 系列接口完成下单、修改菜品、结算（整单 / AA）和清空订单，最终状态以 `orders`、`order_items`、`restaurant_tables`、`transactions` 四张表为核心。
2. **整单 vs AA 对 `order_items` 的差异**：
   - 整单结算：只更新 `orders` 和 `transactions`，不动 `order_items`，保留全量菜品记录。
   - AA 结算：会根据 AA 数量删除 / 减少对应的 `order_items`，让 `order_items` 始终表示「未结部分」。
3. **AA 后再整单结算金额问题**：
   - 当前实现中，`orders.total` 最终只体现最后一次结算的金额（例如剩余 40），而 AA 已收的部分只体现在 `transactions` 中。
   - 若希望 `orders` 上能直接看到整张发票的累计金额，需要对字段设计或结算逻辑做调整，或在统计查询时基于 `transactions` 聚合。

