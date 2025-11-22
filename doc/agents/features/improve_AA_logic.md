# 改进 POS 订单金额与 AA 逻辑（不删除 order_items · 保留总金额）

- ID: improve-aa-order-amount
- Owner: TBD
- Status: proposed

## Summary
在不改变 POS UI 页面布局与大小的前提下，重构订单金额与 AA 结算逻辑，使：
- `orders` 表始终存储整单总金额（包括已 AA 的金额），便于报表与对账；
- AA 结算不再物理删除 `order_items` 记录，而是通过「已付金额/数量」来表达剩余未结部分，保持订单明细完整可追溯。

## Scope
- In:
  - 后端 API：`app/api/orders/checkout/route.ts`、`app/api/orders/route.ts`、`app/api/orders/[id]/route.ts`、`app/api/orders/clear/route.ts`
  - 数据库 Schema 与迁移：`db/schema.ts`、`drizzle/0000_workable_gamora.sql`、`drizzle/0001_youthful_starhawk.sql` 之后的新迁移
  - 金额与订单状态逻辑：如何定义「总金额」「已付金额」「未结金额」
  - 保持现有 POS 界面布局和尺寸不变，仅调整数据计算与 API 返回
- Out:
  - 不调整 POS UI 的视觉尺寸、对话框宽高与布局结构（结账弹窗、左中右三栏等保持一致）
  - 不引入新的前端路由或独立报表页面（报表层改动可在后续独立 feature 中实现）
  - 不重构除 POS 模块之外的其他业务（如员工管理、财务模块）

## UX Notes
- POS 操作员的体验保持不变：
  - 「下单」「减菜」「清空」「结账」「AA」按钮位置与大小不变；
  - 结账弹窗仍为当前的 3 栏布局，宽度约为视口 80%，高度保持不变；
  - AA 选择仍在中间「订单汇总」区域点击菜品来选择要 AA 的数量；
  - 结账成功后的提示、打印行为与跳转（`/tables`）保持现状。
- 行为调整（对用户的可见效果）：
  - 订单明细层面（后端 + API）保留全部菜品记录，即使已通过 AA 结算；
  - POS 列表中「当前桌台剩余金额」仍展示 **未结金额**，避免混淆；
  - 后续如在报表中展示订单详情，可基于完整的 `order_items` 与交易记录进行分析。

> 参考：`doc/pos_analysis.md` 对现状逻辑的分析，以及 `doc/guides/nextjs.instructions.md`、`doc/guides/nextjs-tailwind.instructions.md` 中关于 API 与数据层的最佳实践。

## API / DB

### 1. 当前问题回顾
- `orders` 表字段（见 `drizzle/0000_workable_gamora.sql`）：
  - `subtotal` / `discount` / `total`：目前既被用作「当前未结金额」又被用于「最终结算金额」，语义混杂；
  - AA 结算时会把 `orders.subtotal/total` 改写为剩余未结金额；
  - 再次整单结算时，`orders.total` 只保留最后一次结算金额，无法直接看出整单累计金额。
- AA 逻辑（`app/api/orders/checkout/route.ts`）：
  - 根据 AA 选择对 `order_items` 做删减，未结部分通过剩余的 `order_items` 来表达；
  - 已 AA 的部分从 `order_items` 中消失，只能通过 `transactions` 查询金额，缺少完整明细。

### 2. 目标数据模型（推荐方案）

#### 2.1 订单金额语义重定义
为避免字段复用导致含义模糊，建议采用「总金额 + 已付金额 + 未结金额」三层语义：

- `orders.total_amount`（新字段，或重命名/替代现有 `total`）：
  - 定义：**整单累计金额**，即所有有效 `order_items` 的金额总和；
  - 特性：只会随着「加菜/下单」增加，不因 AA 或结算减少；
  - 用途：报表统计、订单详情展示、对账。
- `orders.paid_amount`（新字段）：
  - 定义：**已支付的累计金额**，包括所有 AA 支付和最终整单支付；
  - 特性：每次成功结算（AA / 整单）时累加；
  - 用途：区别「已付」与「未付」，计算剩余金额。
- `orders.outstanding_amount`（可选字段，或运行时计算）：
  - 定义：**未结金额 = total_amount - paid_amount**；
  - 可实现方式：
    - 仅在查询时通过表达式计算，不落库；
    - 或新增字段，每次结算/增菜时同步更新（便于索引和快速查询）。
- 保留现有字段兼容：
  - 若要减少迁移风险，可保持 `subtotal` / `discount` / `total` 字段，但在 POS 逻辑中统一语义：
    - `total_amount` 可替代现有 `total`，或在迁移期间保持两者同步；
    - `discount` 由「本次结算折扣」转为「累积折扣金额」（可选）。

#### 2.2 order_items 不再被删除的设计
为保留完整历史明细，同时保持 UI 中「未结数量」的行为，可以引入「已付数量」模型：

- 在 `order_items` 上新增字段：
  - `paid_quantity integer DEFAULT 0 NOT NULL`（示例字段名）
  - 语义：
    - `quantity`：下单总数量（原始数量，不再被 AA/结算修改）；
    - `paid_quantity`：已经通过任意结算（AA 或整单）支付的数量；
    - 未结数量 = `quantity - paid_quantity`。
  - 约束：
    - `0 <= paid_quantity <= quantity`；
    - 当 `paid_quantity = quantity` 时，该行已全部结清，但记录保留。

#### 2.3 Drizzle / SQL 迁移设计（示意）
在新的迁移文件中（例如 `drizzle/0002_improve_aa_logic.sql`）：

- 为 `orders` 增加金额字段：

```sql
ALTER TABLE "orders"
  ADD COLUMN "total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
  ADD COLUMN "paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL;

-- 视情况决定是否继续使用 "subtotal"/"total"/"discount"：
-- 可在迁移中先保持旧字段，以便兼容现有查询，后续再逐步迁移。
```

- 为 `order_items` 增加已付数量字段：

```sql
ALTER TABLE "order_items"
  ADD COLUMN "paid_quantity" integer DEFAULT 0 NOT NULL;
```

- 对应更新 `db/schema.ts`：
  - 在 `orders` 模型中添加 `totalAmount` / `paidAmount`；
  - 在 `orderItems` 模型中添加 `paidQuantity`；
  - 确保所有金额字段在 TypeScript 层统一为 `number` 类型（解析 numeric）。

> 后续可根据业务需求决定是否在迁移中对历史数据做一次性回填（例如：将现有 `total` 复制到 `total_amount`，将历史已付款订单的 `paid_amount` 设为 `total_amount`）。

### 3. API 调整方案（保持 UI 外观不变）

#### 3.1 下单接口 `POST /api/orders`
- 现状：每次下单时更新 `orders.subtotal/total`，并插入若干 `order_items`。
- 调整方案：
  - 新增逻辑：计算本次批次金额 `batchAmount`，同时：
    - `orders.total_amount += batchAmount`；
    - 若订单是新建的，则 `paid_amount = 0`。
  - 仍保留批次编号 `batch_no`，不影响前端 UI。
  - 若继续使用 `orders.total` 字段：
    - 可在 POS 模块中约定：`orders.total` 与 `total_amount` 保持相同（或仅作为冗余字段）。

#### 3.2 修改已下单菜品 `PATCH /api/orders/[id]`
- 现状：根据 `type = decrement/remove` 修改或删除 `order_items`，同步更新 `orders.subtotal/total`。
- 调整方案（与「不删除 order_items」原则兼容）：
  - 优先保持现有「减菜」行为不变（仍允许在结算前减少消费）：
    - 在 **未结算的部分**，可以安全减少 `quantity`；
    - 但需要确保不会减少已经支付的数量，即：
      - `newQuantity >= paid_quantity`；
      - 如果请求减到小于 `paid_quantity`，应返回错误。
  - 为了简单起见，可以在本次 feature 中约定：
    - AA 结算后，该订单的 `order_items` 不再允许通过 `PATCH` 减少数量；
    - 或仅允许在「未付数量范围内」减菜。
  - 对 `orders.total_amount` 的影响：
    - 减菜属于减少实际消费，应同时减少 `total_amount`；
    - 若订单已部分支付，需要根据业务明确是否允许「回退/冲减」历史交易，这通常复杂，建议在本 feature 中：
      - 限制「减菜」仅对尚未结算的订单（`paid_amount = 0`）生效；
      - 或将「退菜」作为独立业务处理（本 feature 范围外）。

#### 3.3 结算接口 `POST /api/orders/checkout`（核心改造）

##### AA 模式（`mode = "aa"`）
- 现状：
  - 按 `aaItems` 从 `order_items` 中扣减数量甚至删除行；
  - 用剩余 `order_items` 代表未结部分；
  - 更新 `orders.subtotal/total` 为剩余金额；
  - 插入一条 `transactions`（`category = "POS checkout - AA"`）。
- 改造后逻辑：
  1. 从 `order_items` 查询整单全部行，计算：
     - `dbTotalAmount = sum(price * quantity)`（用于校验和/回填 `total_amount`）；
     - `unpaidQuantity = quantity - paid_quantity`。
  2. 根据 `aaItems` 对应的 `menuItemId + quantity`：
     - 校验每种菜品的 AA 数量不超过其未付数量总和；
     - 不再删除 `order_items` 行，而是更新其 `paid_quantity`：
       - 优先在未结批次中分配 AA 数量；
       - 对每行：`paid_quantity += allocatedQty`。
  3. 计算本次 AA 的「服务器侧应付金额」：
     - `aaDbSubtotal = sum(price * allocatedQty)`；
     - 按 `discountPercent` 计算 `aaDiscountAmount` 与 `aaCalculatedTotal`；
     - 校验前端传入的 `clientSubtotal` / `clientTotal`。
  4. 更新订单金额字段：
     - `total_amount`：
       - 若初次结算，可校准为 `dbTotalAmount`；
       - 后续结算保持不减，只在新增菜品时增加。
     - `paid_amount`：`paid_amount += aaCalculatedTotal`。
  5. 订单状态与桌台金额：
     - 若 `paid_amount < total_amount`：
       - `status = "open"`；
       - 未结金额 = `total_amount - paid_amount`；
       - `restaurant_tables.amount = 未结金额`。
     - 若 `paid_amount` 足以覆盖 `total_amount`（考虑少量浮点 epsilon）：
       - `status = "paid"`；
       - `restaurant_tables` 置为 `idle`，金额归 0。
  6. 写入一条 `transactions`：
     - `amount = aaCalculatedTotal`；
     - `category = "POS checkout - AA"`；
     - `order_id = order.id`。
  7. API 返回给前端的 `batches`：
     - 为保持 UI 行为一致，可在返回时只展示「未结数量 > 0」的明细：
       - 例如在构建批次映射时使用 `effectiveQuantity = quantity - paid_quantity`；
       - 若 `effectiveQuantity <= 0`，该行不出现在 `batches` 中；
       - 这样既不删除 DB 中的行，又维持当前 UI 中的「只显示未结部分」。

##### 整单模式（`mode = "full"`）
- 现状：
  - 使用当前 `order_items` 全部行计算金额；
  - 更新 `orders.subtotal/total` 为本次结算金额；
  - 插入一条 `transactions`（`category = "POS checkout"`）；
  - 清空桌台状态。
- 改造后逻辑：
  1. 读取订单的 `total_amount` 与 `paid_amount`：
     - 若 `total_amount` 尚未校准，可根据当前所有 `order_items`（含已付）重新计算一次并写入；
  2. 本次整单结算应付金额 = `total_amount - paid_amount`（考虑折扣逻辑）：
     - 若存在额外折扣（例如整单折扣），可以在本次结算整体应用；
     - 校验前端传入的 `clientSubtotal/clientTotal` 与服务器计算一致。
  3. 更新：
     - `paid_amount = total_amount`（或包含折扣后的实际已收总额）；
     - `status = "paid"`；
     - `closed_at = now`。
  4. 对 `order_items` 的处理：
     - 在「不删除」原则下，可以将全部行的 `paid_quantity` 直接置为 `quantity`；
     - 但物理行仍保留，保证明细完整。
  5. 插入 `transactions`：
     - `amount = 本次整单结算金额（未结部分）`；
     - `category = "POS checkout"`。
  6. 桌台状态：
     - `restaurant_tables.status = "idle"`；
     - `amount = 0`。
  7. 返回给前端的 `batches`：
     - 为保持当前行为，整单结算后仍可返回空 `batches`（前端会清空当前订单视图）。

#### 3.4 清空订单 `POST /api/orders/clear`
- 现状：
  - 删除所有 `order_items`，订单标记为 `cancelled`，桌台置空。
- 改造建议：
  - 若「清空」被视为取消订单/误操作，其行为可以保留（删除明细）；
  - 若希望保留错误下单记录，可改为：
    - 不删除 `order_items`，而是在 `orders` 上增加状态标识与原因字段（本 feature 默认不改，以保持行为简单）。

## Workflow
1. 设计确认：对订单金额语义和 AA 逻辑调整达成共识（本文档作为基础）。
2. Schema/Migration：
   - 更新 `db/schema.ts`，为 `orders` 与 `order_items` 增加新字段；
   - 生成并审查新的 Drizzle 迁移脚本；
   - 在非生产环境验证迁移与回滚。
3. API 实现：
   - 按上述方案修改 `app/api/orders/route.ts`、`app/api/orders/[id]/route.ts`、`app/api/orders/checkout/route.ts`、`app/api/orders/clear/route.ts`；
   - 确保所有金额计算都使用新的字段语义。
4. UI 适配：
   - 保持 `components/pos-interface.tsx` 的布局与尺寸不变，仅在必要时调整金额字段的读取方式；
   - 确保结账弹窗、AA 选择等交互与现状一致。
5. 联调与验证：
   - 通过 POS 页面完整走通「下单 → AA 多次 → 整单结算」流程；
   - 验证 `orders.total_amount` 与 `paid_amount` 的变化符合预期；
   - 验证 `transactions` 与桌台金额 `restaurant_tables.amount`。
6. 文档与知识更新：
   - 更新 `doc/pos_analysis.md` 中的逻辑描述；
   - 在 PR 中说明新的字段语义与对报表的影响。
7. 验收：
   - 通过业务方对典型场景（单次结算、多次 AA 结算、部分 AA + 整单结算）的验收用例。

## Acceptance Criteria
- [ ] `orders.total_amount` 始终代表整单累计金额，不随 AA 或结算减少。
- [ ] `orders.paid_amount` 能正确累计所有 AA 与整单结算金额，`total_amount - paid_amount` 为未结金额。
- [ ] AA 结算不再物理删除 `order_items` 行，订单明细完整可追溯。
- [ ] `POST /api/orders/checkout` 的 AA/整单分支在前端回调与 UI 表现上与当前逻辑一致（包括结账弹窗结构、页面尺寸）。
- [ ] POS 桌台列表和 POS 页面中显示的「剩余金额」与实际未结金额一致。
- [ ] 迁移脚本在本地和测试环境通过，且对现有数据兼容。
- [ ] 日志中对关键金额操作（尤其是 AA 分摊与结算）有足够信息便于排查问题。

## 任务清单（Tasks）

### Task 1: 设计订单金额与 AA 新模型（total_amount / paid_amount / paid_quantity）
**预计时间**: 1.0小时  
**依赖**: 无  

**AI 提示词**:  
你是一位资深的全栈工程师，熟悉 Next.js（App Router）、Drizzle ORM 和餐饮 POS 结算场景。请基于 `orders` 与 `order_items` 现有结构（参考 `db/schema.ts` 与 `drizzle/0000_workable_gamora.sql`、`0001_youthful_starhawk.sql`），设计一种支持「整单总金额 + 累计已付金额 + 未结金额 + 不删除 order_items」的数据模型。  
要求：  
- 保留 POS 现有前端布局和页面大小（`components/pos-interface.tsx` 不调整 UI 尺寸）；  
- 使用字段 `total_amount`、`paid_amount`、`paid_quantity`（或合理同义命名）表达新语义；  
- 说明这些字段与现有 `subtotal` / `discount` / `total` 的关系及迁移策略；  
- 给出对 `orders/checkout` AA 与整单分支的金额流转示意。  
必要时可参考 `doc/guides/nextjs.instructions.md`（use context7 关键字）获取 Next.js 与 API 设计最佳实践。

### Task 2: 更新 DB Schema 与 Drizzle 迁移
**预计时间**: 1.5小时  
**依赖**: Task 1  

**AI 提示词**:  
你是一位熟悉 Drizzle ORM 与 PostgreSQL 的后端工程师。基于 Task 1 中确定的模型，在项目 `/Users/zhuyuxia/Documents/GitHub/easyFactu` 中：  
- 更新 `db/schema.ts`，为 `orders` 增加 `totalAmount`、`paidAmount` 字段，为 `orderItems` 增加 `paidQuantity` 字段；  
- 新增 Drizzle 迁移（不直接修改已有迁移内容），实现等价 SQL 变更；  
- 确保生成的 SQL 与现有 `drizzle/0000_workable_gamora.sql`、`0001_youthful_starhawk.sql` 保持兼容；  
- 在任务描述中注明执行命令：`pnpm drizzle:generate && pnpm drizzle:push`；  
- 保持金额类型为 `numeric(12, 2)`，并在 TypeScript 层统一解析为 `number`。  
请用 ultrathink 模式分步推演字段命名、默认值、非空约束与回填策略。

### Task 3: 重构 AA 结算逻辑（不删除 order_items）
**预计时间**: 2.0小时  
**依赖**: Task 2  

**AI 提示词**:  
你是一位资深后端工程师，请在不改变 POS 前端 UI 布局和尺寸的前提下，重构 `app/api/orders/checkout/route.ts` 中的 AA 结算分支：  
- 禁止物理删除 `order_items` 行，改为使用 `paidQuantity` 字段表达已付数量；  
- 按照 `aaItems` 分配到各行的未付数量，更新对应的 `paidQuantity`；  
- 使用 `orders.totalAmount` 与 `orders.paidAmount` 计算本次 AA 的应付金额，并校验与前端传入金额一致；  
- 更新 `orders.paidAmount`，根据是否结清决定 `orders.status`、`restaurant_tables.amount` 与状态；  
- 在返回的 `batches` 中仅展示「未结数量 > 0」的明细，以保持现有 UI 行为；  
- 保持 AA 分支的校验与错误码风格一致。  
在实现前，请先阅读 `doc/pos_analysis.md` 和 `doc/guides/nextjs.instructions.md`，必要时 use context7 查阅 Next.js API best practices。

### Task 4: 重构整单结算逻辑（full 模式）
**预计时间**: 1.5小时  
**依赖**: Task 3  

**AI 提示词**:  
你是一位资深后端工程师，请修改 `app/api/orders/checkout/route.ts` 的整单结算（full 模式）分支，使其与新的金额模型保持一致：  
- 使用 `orders.totalAmount - orders.paidAmount` 作为本次整单结算的未结金额基础；  
- 校准 `totalAmount`（如有必要）以匹配所有 `order_items` 的金额总和；  
- 将所有 `order_items` 的 `paidQuantity` 设置为 `quantity`，但不删除任何行；  
- 更新 `orders.paidAmount`，使其达到与 `totalAmount`（或折扣后总额）一致；  
- 正确更新 `orders.status`、`closedAt`、`restaurant_tables` 状态与金额；  
- 保证前端 `components/pos-interface.tsx` 中结账弹窗行为与页面尺寸保持不变（如需调整 API 返回字段，请在前端最小粒度上适配）。  
请用 ultrathink 模式详细推演边界场景（如订单已部分 AA、浮点误差等）。

### Task 5: 调整下单与减菜接口金额更新
**预计时间**: 1.5小时  
**依赖**: Task 2  

**AI 提示词**:  
你是一位全栈工程师，请更新 `app/api/orders/route.ts` 和 `app/api/orders/[id]/route.ts` 的逻辑，使其与新的金额模型一致：  
- 下单 `POST /api/orders`：  
  - 为新订单初始化 `totalAmount` 和 `paidAmount`；  
  - 追加批次时增加 `totalAmount`，不减少 `paidAmount`；  
  - 保持现有批次逻辑与 UI 展示不变。  
- 减菜/删除菜品 `PATCH /api/orders/[id]`：  
  - 优先限制对已结算部分的修改（`newQuantity` 不得小于 `paidQuantity`）；  
  - 若业务允许仅在 `paidAmount = 0` 时减菜，请在代码中加入相应约束与错误提示；  
  - 正确更新 `totalAmount`（减少实际消费金额）及 `restaurant_tables.amount`（未结金额）；  
  - 不删除已付部分的明细行。  
在实现过程中，请保持前端 UI 尺寸与布局不变，并确保 `GET /api/orders` 返回的数据仍可被 `components/pos-interface.tsx` 正常消费。

### Task 6: 联调与验证、文档更新
**预计时间**: 1.0小时  
**依赖**: Task 3, Task 4, Task 5  

**AI 提示词**:  
你是一位负责交付质量的全栈工程师，请在完成金额与 AA 逻辑改造后：  
- 在本地运行 POS 页面，从「下单 → 多次 AA → 最终整单结算」完整走通流程；  
- 验证 `orders.totalAmount` / `paidAmount` 与 `restaurant_tables.amount` 的变化是否符合预期；  
- 确认 `transactions` 记录中每次 AA 与整单结算金额正确；  
- 确保 `components/pos-interface.tsx` 的页面大小、布局和交互未发生肉眼可见变化；  
- 更新 `doc/pos_analysis.md`，添加新逻辑与字段说明；  
- 在 PR 描述中引用本 feature 文档，并简要说明迁移与回滚策略。  
必要时可 use context7 查阅 Next.js 与数据库迁移的最佳实践。

## Links
- POS 现有逻辑分析：`../../pos_analysis.md`
- Next.js 最佳实践：`../../guides/nextjs.instructions.md`
- Next.js + Tailwind 说明：`../../guides/nextjs-tailwind.instructions.md`

